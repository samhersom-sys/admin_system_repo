import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { Claim } from '../entities/claim.entity'

@Injectable()
export class ClaimsService {
  constructor(
    @InjectRepository(Claim)
    private readonly claimRepo: Repository<Claim>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) { }

  // ---------------------------------------------------------------------------
  // R01 — List claims scoped to org (via policy join)
  // ---------------------------------------------------------------------------
  async findAll(orgCode: string): Promise<Record<string, unknown>[]> {
    return this.dataSource.query<Record<string, unknown>[]>(
      `SELECT c.id, c.claim_number AS "claimNumber", c.reference, c.status,
              c.loss_date AS "lossDate", c.reported_date AS "reportedDate",
              c.description, c.created_at AS "createdAt",
              p.reference AS "policyReference", p.insured
         FROM claims c
         JOIN policies p ON p.id = c.policy_id
        WHERE p.created_by_org_code = $1
          AND c.deleted_at IS NULL
        ORDER BY c.created_at DESC`,
      [orgCode],
    )
  }

  // ---------------------------------------------------------------------------
  // R02 — Create claim
  // ---------------------------------------------------------------------------
  async create(orgCode: string, body: Record<string, any>): Promise<Claim> {
    const { policyId, lossDate, reportedDate, description, lossType, claimantName, claimantContact } = body

    if (!policyId) {
      throw new BadRequestException('policyId is required')
    }

    // Verify the policy belongs to this org
    const policyRows = await this.dataSource.query<{ id: number }[]>(
      `SELECT id FROM policies WHERE id = $1 AND created_by_org_code = $2`,
      [policyId, orgCode],
    )
    if (!policyRows.length) {
      throw new NotFoundException('Policy not found or access denied')
    }

    // Generate reference: CLM-{ORG}-{YYYYMMDD}-{NNN}
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const refPrefix = `CLM-${orgCode.toUpperCase()}-${datePart}-`
    const countResult = await this.claimRepo
      .createQueryBuilder('c')
      .select('COUNT(*)', 'cnt')
      .where('c.reference LIKE :prefix', { prefix: `${refPrefix}%` })
      .getRawOne<{ cnt: string }>()
    const seq = Number(countResult?.cnt ?? 0) + 1
    const reference = `${refPrefix}${String(seq).padStart(3, '0')}`

    const claim = this.claimRepo.create({
      policyId,
      claimNumber: reference,
      reference,
      status: 'Open',
      lossDate: lossDate ?? null,
      reportedDate: reportedDate ?? null,
      description: description ?? null,
      payload: {
        lossType: lossType ?? null,
        claimantName: claimantName ?? null,
        claimantContact: claimantContact ?? null,
      },
    })

    return this.claimRepo.save(claim)
  }

  // ---------------------------------------------------------------------------
  // R03 — Get single claim (access-controlled via policy org scoping)
  // ---------------------------------------------------------------------------
  async findOne(orgCode: string, id: number): Promise<Record<string, unknown>> {
    const rows = await this.dataSource.query<Record<string, unknown>[]>(
      `SELECT c.id, c.claim_number AS "claimNumber", c.reference, c.status,
              c.loss_date AS "lossDate", c.reported_date AS "reportedDate",
              c.description, c.payload, c.created_at AS "createdAt",
              p.reference AS "policyReference", p.insured, p.id AS "policyId",
              p.created_by_org_code AS "policyOrgCode"
         FROM claims c
         JOIN policies p ON p.id = c.policy_id
        WHERE c.id = $1
          AND c.deleted_at IS NULL`,
      [id],
    )

    if (!rows.length) {
      throw new NotFoundException('Claim not found')
    }

    if (rows[0]['policyOrgCode'] !== orgCode) {
      throw new ForbiddenException('Access denied')
    }

    return rows[0]
  }

  // ---------------------------------------------------------------------------
  // R04 — Update claim editable fields
  // ---------------------------------------------------------------------------
  async update(orgCode: string, id: number, body: Record<string, any>): Promise<Claim> {
    const claim = await this.getAccessibleClaim(orgCode, id)
    const { status, description, lossDate, reportedDate } = body

    if (status != null) claim.status = status
    if (description != null) claim.description = description
    if (lossDate != null) claim.lossDate = lossDate
    if (reportedDate != null) claim.reportedDate = reportedDate

    return this.claimRepo.save(claim)
  }

  // ---------------------------------------------------------------------------
  // R05 — List claim transactions
  // ---------------------------------------------------------------------------
  async getTransactions(orgCode: string, claimId: number): Promise<Record<string, unknown>[]> {
    await this.getAccessibleClaim(orgCode, claimId)
    return this.dataSource.query<Record<string, unknown>[]>(
      `SELECT id, claim_id AS "claimId", type, amount, description, date,
              created_by AS "createdBy", created_at AS "createdAt"
         FROM claim_transactions
        WHERE claim_id = $1
        ORDER BY date DESC, created_at DESC`,
      [claimId],
    )
  }

  // ---------------------------------------------------------------------------
  // R06 — Add claim transaction
  // ---------------------------------------------------------------------------
  async addTransaction(
    orgCode: string,
    claimId: number,
    body: Record<string, any>,
  ): Promise<Record<string, unknown>> {
    await this.getAccessibleClaim(orgCode, claimId)

    const { type, amount, description, date, createdBy } = body
    if (!type) throw new BadRequestException('type is required')
    if (amount == null) throw new BadRequestException('amount is required')

    const rows = await this.dataSource.query<Record<string, unknown>[]>(
      `INSERT INTO claim_transactions (claim_id, type, amount, description, date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, claim_id AS "claimId", type, amount, description, date,
                 created_by AS "createdBy", created_at AS "createdAt"`,
      [claimId, type, amount, description ?? null, date ?? new Date().toISOString().slice(0, 10), createdBy ?? null],
    )
    return rows[0]
  }

  // ---------------------------------------------------------------------------
  // R07 — Audit history
  // ---------------------------------------------------------------------------
  async getAudit(orgCode: string, claimId: number): Promise<Record<string, unknown>[]> {
    await this.getAccessibleClaim(orgCode, claimId)
    return this.dataSource.query<Record<string, unknown>[]>(
      `SELECT id, entity_type AS "entityType", entity_id AS "entityId",
              action, details, created_by AS "createdBy", created_at AS "createdAt"
         FROM audit_event
        WHERE entity_type = 'Claim' AND entity_id = $1
        ORDER BY created_at DESC`,
      [claimId],
    )
  }

  async postAudit(
    orgCode: string,
    claimId: number,
    action: string,
    createdBy: string,
    userId: number | null,
  ): Promise<void> {
    await this.getAccessibleClaim(orgCode, claimId)
    await this.dataSource.query(
      `INSERT INTO audit_event (entity_type, entity_id, action, created_by, user_id)
       VALUES ('Claim', $1, $2, $3, $4)`,
      [claimId, action, createdBy, userId],
    )
  }

  // ---------------------------------------------------------------------------
  // Private helper
  // ---------------------------------------------------------------------------
  private async getAccessibleClaim(orgCode: string, id: number): Promise<Claim> {
    const claim = await this.claimRepo.findOne({ where: { id, deletedAt: null as any } })
    if (!claim) throw new NotFoundException('Claim not found')

    const policyRows = await this.dataSource.query<{ created_by_org_code: string }[]>(
      `SELECT created_by_org_code FROM policies WHERE id = $1`,
      [claim.policyId],
    )
    if (!policyRows.length || policyRows[0].created_by_org_code !== orgCode) {
      throw new ForbiddenException('Access denied')
    }
    return claim
  }
}
