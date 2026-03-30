import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { Submission } from '../entities/submission.entity'
import { Quote } from '../entities/quote.entity'

const EDIT_LOCK_TTL_SECONDS = 90

interface SubmissionEditLockRow {
  submission_id: number
  locked_by_user_id: number
  locked_by_user_name: string
  locked_by_user_email: string | null
  acquired_at: string
  expires_at: string
}

export interface SubmissionEditLockResponse {
  submissionId: number
  lockedByUserId: number
  lockedByUserName: string
  lockedByUserEmail: string | null
  acquiredAt: string
  expiresAt: string
  isHeldByCurrentUser: boolean
}

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
    @InjectRepository(Quote)
    private readonly quoteRepo: Repository<Quote>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) { }

  private currentUserName(user: { username?: string; email?: string | null }): string {
    return user.username || user.email || 'Unknown user'
  }

  private mapEditLock(
    row: SubmissionEditLockRow,
    currentUserId: number,
  ): SubmissionEditLockResponse {
    return {
      submissionId: row.submission_id,
      lockedByUserId: row.locked_by_user_id,
      lockedByUserName: row.locked_by_user_name,
      lockedByUserEmail: row.locked_by_user_email,
      acquiredAt: row.acquired_at,
      expiresAt: row.expires_at,
      isHeldByCurrentUser: row.locked_by_user_id === currentUserId,
    }
  }

  private async getAccessibleSubmission(orgCode: string, id: number): Promise<Submission> {
    const existing = await this.submissionRepo.findOne({ where: { id } })

    if (!existing) {
      throw new NotFoundException('Submission not found')
    }
    if (existing.createdByOrgCode !== orgCode) {
      throw new ForbiddenException('Access denied')
    }

    return existing
  }

  private async getActiveEditLock(
    submissionId: number,
    currentUserId: number,
  ): Promise<SubmissionEditLockResponse | null> {
    const rows = await this.dataSource.query<SubmissionEditLockRow[]>(
      `SELECT submission_id, locked_by_user_id, locked_by_user_name, locked_by_user_email,
              acquired_at::text, expires_at::text
         FROM submission_edit_lock
        WHERE submission_id = $1
          AND expires_at > NOW()`,
      [submissionId],
    )

    if (!rows.length) return null
    return this.mapEditLock(rows[0], currentUserId)
  }

  private throwEditLockConflict(lock: SubmissionEditLockResponse): never {
    throw new ConflictException({
      message: `This page has been locked for editing by ${lock.lockedByUserName}.`,
      code: 'SUBMISSION_EDIT_LOCKED',
      submissionId: lock.submissionId,
      lockedByUserId: lock.lockedByUserId,
      lockedByUserName: lock.lockedByUserName,
      lockedByUserEmail: lock.lockedByUserEmail,
      expiresAt: lock.expiresAt,
      isHeldByCurrentUser: false,
    })
  }

  private async assertCurrentUserHoldsEditLock(
    submissionId: number,
    user: { id: number },
  ): Promise<void> {
    const activeLock = await this.getActiveEditLock(submissionId, user.id)

    if (!activeLock) {
      throw new ConflictException({
        message: 'This page is no longer locked for your session. Refresh and try again.',
        code: 'SUBMISSION_EDIT_LOCK_REQUIRED',
        submissionId,
      })
    }

    if (!activeLock.isHeldByCurrentUser) {
      this.throwEditLockConflict(activeLock)
    }
  }

  // ---------------------------------------------------------------------------
  // R01 — List submissions scoped to org
  // ---------------------------------------------------------------------------
  async findAll(orgCode: string, status?: string): Promise<Record<string, unknown>[]> {
    // LEFT JOIN with party to derive createdByOrgType — use DataSource builder
    // to preserve the exact mixed-case column shape the frontend expects.
    const qb = this.dataSource
      .createQueryBuilder()
      .select('s.*')
      .addSelect('p.role', 'createdByOrgType')
      .from('submission', 's')
      .leftJoin('party', 'p', 'p.id = s.party_created_id')
      .where('s."createdByOrgCode" = :orgCode', { orgCode })
      .orderBy('s."createdDate"', 'DESC')

    if (status) {
      qb.andWhere('s.status = :status', { status })
    }

    const rows = await qb.getRawMany<Record<string, unknown>>()
    const withLockState = rows.map((r) => ({ ...r, hasQuote: false, hasPolicy: false }))

    if (withLockState.length > 0) {
      const ids = withLockState.map((r) => r['id'] as number)
      // ANY($1::int[]) cannot be expressed without raw SQL in QueryBuilder
      const quotedRows = await this.dataSource.query<{ submission_id: number }[]>(
        `SELECT DISTINCT submission_id FROM quotes WHERE submission_id = ANY($1::int[])`,
        [ids],
      )
      const quotedSet = new Set(quotedRows.map((r) => r.submission_id))
      withLockState.forEach((r) => {
        r['hasQuote'] = quotedSet.has(r['id'] as number)
      })
    }

    return withLockState
  }

  // ---------------------------------------------------------------------------
  // R02 — Create submission
  // ---------------------------------------------------------------------------
  async create(orgCode: string, body: Record<string, any>): Promise<Submission> {
    const {
      submissionType,
      insured,
      insuredId,
      placingBroker,
      placingBrokerName,
      placingBrokerId,
      contractType,
      inceptionDate,
      expiryDate,
      renewalDate,
      createdDate,
      createdBy,
    } = body

    if (!insured) {
      throw new BadRequestException('insured (insured name) is required')
    }

    // R02a: Generate reference server-side — SUB-{ORG}-{YYYYMMDD}-{NNN}
    const today = new Date()
    const datePart = today.toISOString().slice(0, 10).replace(/-/g, '')
    const orgUpper = orgCode.toUpperCase()
    const refPrefix = `SUB-${orgUpper}-${datePart}-`
    const countResult = await this.submissionRepo
      .createQueryBuilder('s')
      .select('COUNT(*)', 'cnt')
      .where('s.reference LIKE :prefix', { prefix: `${refPrefix}%` })
      .getRawOne<{ cnt: string }>()
    const seq = Number(countResult?.cnt ?? 0) + 1
    const generatedReference = `${refPrefix}${String(seq).padStart(3, '0')}`

    // R02b: Default expiry to inception + 1 year when not supplied
    let resolvedExpiry = expiryDate ?? null
    if (!resolvedExpiry && inceptionDate) {
      const d = new Date(inceptionDate)
      d.setFullYear(d.getFullYear() + 1)
      resolvedExpiry = d.toISOString().slice(0, 10)
    }

    const submission = this.submissionRepo.create({
      reference: generatedReference,
      submissionType: submissionType ?? 'Submission',
      insured,
      insuredId: insuredId ?? null,
      placingBroker: placingBroker ?? null,
      placingBrokerName: placingBrokerName ?? null,
      brokerId: placingBrokerId ?? null,
      contractType: contractType ?? null,
      inceptionDate: inceptionDate ?? null,
      expiryDate: resolvedExpiry,
      renewalDate: renewalDate ?? null,
      status: 'Created',
      createdDate: createdDate ?? new Date().toISOString(),
      createdBy: createdBy ?? null,
      createdByOrgCode: orgCode,
    })

    return this.submissionRepo.save(submission)
  }

  // ---------------------------------------------------------------------------
  // R03 — Get single submission
  // ---------------------------------------------------------------------------
  async findOne(orgCode: string, id: number): Promise<Record<string, unknown>> {
    const rows = await this.dataSource
      .createQueryBuilder()
      .select('s.*')
      .addSelect('p.role', 'createdByOrgType')
      .from('submission', 's')
      .leftJoin('party', 'p', 'p.id = s.party_created_id')
      .where('s.id = :id', { id })
      .getRawMany<Record<string, unknown>>()

    if (!rows || rows.length === 0) {
      throw new NotFoundException('Submission not found')
    }

    const submission = rows[0]

    if (submission['createdByOrgCode'] !== orgCode) {
      throw new ForbiddenException('Access denied')
    }

    submission['hasQuote'] = false
    submission['hasPolicy'] = false
    return submission
  }

  async acquireEditLock(
    orgCode: string,
    id: number,
    user: { id: number; username?: string; email?: string | null },
  ): Promise<SubmissionEditLockResponse> {
    await this.getAccessibleSubmission(orgCode, id)

    const rows = await this.dataSource.query<SubmissionEditLockRow[]>(
      `INSERT INTO submission_edit_lock (
          submission_id,
          org_code,
          locked_by_user_id,
          locked_by_user_name,
          locked_by_user_email,
          acquired_at,
          expires_at,
          updated_at
       )
       VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          NOW(),
          NOW() + ($6 || ' seconds')::interval,
          NOW()
       )
       ON CONFLICT (submission_id) DO UPDATE
          SET org_code = EXCLUDED.org_code,
              locked_by_user_id = EXCLUDED.locked_by_user_id,
              locked_by_user_name = EXCLUDED.locked_by_user_name,
              locked_by_user_email = EXCLUDED.locked_by_user_email,
              expires_at = NOW() + ($6 || ' seconds')::interval,
              updated_at = NOW()
        WHERE submission_edit_lock.locked_by_user_id = EXCLUDED.locked_by_user_id
           OR submission_edit_lock.expires_at <= NOW()
       RETURNING submission_id, locked_by_user_id, locked_by_user_name, locked_by_user_email,
                 acquired_at::text, expires_at::text`,
      [id, orgCode, user.id, this.currentUserName(user), user.email ?? null, EDIT_LOCK_TTL_SECONDS],
    )

    if (rows.length > 0) {
      return this.mapEditLock(rows[0], user.id)
    }

    const activeLock = await this.getActiveEditLock(id, user.id)
    if (activeLock) {
      this.throwEditLockConflict(activeLock)
    }

    throw new ConflictException({
      message: 'This page could not be locked for editing. Refresh and try again.',
      code: 'SUBMISSION_EDIT_LOCK_UNAVAILABLE',
      submissionId: id,
    })
  }

  async releaseEditLock(
    orgCode: string,
    id: number,
    user: { id: number },
  ): Promise<void> {
    await this.getAccessibleSubmission(orgCode, id)
    await this.dataSource.query(
      `DELETE FROM submission_edit_lock
        WHERE submission_id = $1
          AND locked_by_user_id = $2`,
      [id, user.id],
    )
  }

  // ---------------------------------------------------------------------------
  // R04 — Update editable fields (contractType is immutable)
  // ---------------------------------------------------------------------------
  async update(
    orgCode: string,
    id: number,
    body: Record<string, any>,
    user: { id: number },
  ): Promise<Submission> {
    const existing = await this.getAccessibleSubmission(orgCode, id)
    await this.assertCurrentUserHoldsEditLock(id, user)

    const { insured, insuredId, inceptionDate, expiryDate, renewalDate, placingBroker, placingBrokerId, placingBrokerName } = body

    // Mirrors original COALESCE: only update a field when a non-null value is supplied
    if (insured != null) existing.insured = insured
    if (insuredId != null) existing.insuredId = insuredId
    if (inceptionDate != null) existing.inceptionDate = inceptionDate
    if (expiryDate != null) existing.expiryDate = expiryDate
    if (renewalDate != null) existing.renewalDate = renewalDate
    if (placingBroker != null) existing.placingBroker = placingBroker
    if (placingBrokerId != null) existing.brokerId = placingBrokerId
    if (placingBrokerName != null) existing.placingBrokerName = placingBrokerName

    return this.submissionRepo.save(existing)
  }

  // ---------------------------------------------------------------------------
  // R05 — Submit (status → 'In Review')
  // ---------------------------------------------------------------------------
  async submit(orgCode: string, id: number, user: { id: number }): Promise<Submission> {
    const existing = await this.getAccessibleSubmission(orgCode, id)
    await this.assertCurrentUserHoldsEditLock(id, user)

    existing.status = 'In Review'
    return this.submissionRepo.save(existing)
  }

  // ---------------------------------------------------------------------------
  // R06 — Decline (status → 'Declined')
  // ---------------------------------------------------------------------------
  async decline(
    orgCode: string,
    id: number,
    reasonCode: string,
    reasonText: string,
    user: { id: number; email: string; username: string },
  ): Promise<Submission> {
    if (!reasonCode) {
      throw new BadRequestException('reasonCode is required')
    }

    const existing = await this.getAccessibleSubmission(orgCode, id)
    await this.assertCurrentUserHoldsEditLock(id, user)

    existing.status = 'Declined'
    const saved = await this.submissionRepo.save(existing)

    // Best-effort audit entry — failure does not affect the decline outcome
    try {
      await this.dataSource.query(
        `INSERT INTO public.audit_event (entity_type, entity_id, action, details, created_by, user_id, user_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'Submission',
          id,
          'Submission Declined',
          JSON.stringify({ reasonCode, reasonText: reasonText ?? '' }),
          user.email ?? '',
          user.id ?? null,
          user.username ?? user.email ?? '',
        ],
      )
    } catch {
      // silently ignore audit failures
    }

    return saved
  }

  // ---------------------------------------------------------------------------
  // R07 — GET /api/submissions/:id/related
  // Returns submissions linked to this one via submission_related.
  // ---------------------------------------------------------------------------
  async findRelated(orgCode: string, id: number): Promise<Record<string, unknown>[]> {
    await this.getAccessibleSubmission(orgCode, id)
    return this.dataSource.query<Record<string, unknown>[]>(
      `SELECT s.id, s.reference, s.insured, s."placingBroker", s.status,
              s."inceptionDate"
         FROM submission_related sr
         JOIN submission s ON s.id = sr.related_id
        WHERE sr.submission_id = $1
        UNION
       SELECT s.id, s.reference, s.insured, s."placingBroker", s.status,
              s."inceptionDate"
         FROM submission_related sr
         JOIN submission s ON s.id = sr.submission_id
        WHERE sr.related_id = $1
        ORDER BY reference ASC`,
      [id],
    )
  }

  // ---------------------------------------------------------------------------
  // R08 — POST /api/submissions/:id/related
  // Links two submissions together via submission_related.
  // ---------------------------------------------------------------------------
  async linkRelated(
    orgCode: string,
    id: number,
    relatedSubmissionId: number,
  ): Promise<Record<string, unknown>> {
    await this.getAccessibleSubmission(orgCode, id)
    if (id === relatedSubmissionId) {
      throw new BadRequestException('A submission cannot be linked to itself')
    }
    // Normalise order so (min,max) is always stored the same way
    const [a, b] = id < relatedSubmissionId ? [id, relatedSubmissionId] : [relatedSubmissionId, id]
    await this.dataSource.query(
      `INSERT INTO submission_related (submission_id, related_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [a, b],
    )
    const rows = await this.dataSource.query<Record<string, unknown>[]>(
      `SELECT id, reference, insured, "placingBroker", status, "inceptionDate"
         FROM submission WHERE id = $1`,
      [relatedSubmissionId],
    )
    if (!rows.length) throw new NotFoundException('Related submission not found')
    return rows[0]
  }

  // ---------------------------------------------------------------------------
  // R09 — DELETE /api/submissions/:id/related/:relatedId
  // Removes the link between two submissions.
  // ---------------------------------------------------------------------------
  async removeRelated(orgCode: string, id: number, relatedId: number): Promise<void> {
    await this.getAccessibleSubmission(orgCode, id)
    const [a, b] = id < relatedId ? [id, relatedId] : [relatedId, id]
    await this.dataSource.query(
      `DELETE FROM submission_related WHERE submission_id = $1 AND related_id = $2`,
      [a, b],
    )
  }

  // ---------------------------------------------------------------------------
  // R10 — GET /api/submissions/:id/binding-authorities
  // Returns binding authority contracts linked to this submission.
  // ---------------------------------------------------------------------------
  async findBindingAuthorities(orgCode: string, id: number): Promise<Record<string, unknown>[]> {
    await this.getAccessibleSubmission(orgCode, id)
    return this.dataSource.query<Record<string, unknown>[]>(
      `SELECT ba.id,
              ba.reference,
              ba.status,
              ba.year_of_account   AS "yearOfAccount",
              ba.inception_date    AS "inceptionDate",
              ba.expiry_date       AS "expiryDate",
              ba.created_at        AS "createdDate",
              ba.created_by        AS "createdBy"
         FROM binding_authority ba
        WHERE ba.submission_id = $1
        ORDER BY ba.reference ASC`,
      [id],
    )
  }
}
