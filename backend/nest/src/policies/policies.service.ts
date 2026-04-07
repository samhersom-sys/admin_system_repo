import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { Policy } from '../entities/policy.entity'
import { AuditService } from '../audit/audit.service'

/**
 * PoliciesService — all policies domain business logic.
 *
 * Requirements: backend/nest/src/policies/policies.requirements.md
 * REQ-POL-BE-F-001 to F-015
 *
 * Multi-tenancy: every query is scoped by org_code (Policy.createdByOrgCode).
 * Raw SQL is used for child tables (policy_sections, policy_endorsements, etc.)
 * that do not yet have TypeORM entity definitions.
 */
@Injectable()
export class PoliciesService {
    constructor(
        @InjectRepository(Policy)
        private readonly policyRepo: Repository<Policy>,
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly auditService: AuditService,
    ) { }

    // -----------------------------------------------------------------------
    // Reference generator: POL-{ORG}-{YYYYMMDD}-{NNN}
    // -----------------------------------------------------------------------
    private async generateReference(orgCode: string): Promise<string> {
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        const prefix = `POL-${orgCode.toUpperCase()}-${datePart}-`
        const row = await this.policyRepo
            .createQueryBuilder('p')
            .select('p.reference', 'reference')
            .where('p.reference LIKE :prefix', { prefix: `${prefix}%` })
            .orderBy('p.reference', 'DESC')
            .limit(1)
            .getRawOne<{ reference: string }>()
        let seq = 1
        if (row?.reference) {
            const lastSeq = parseInt(row.reference.slice(-3), 10)
            if (!isNaN(lastSeq)) seq = lastSeq + 1
        }
        return `${prefix}${String(seq).padStart(3, '0')}`
    }

    // -----------------------------------------------------------------------
    // REQ-POL-BE-F-001 — GET /api/policies
    // -----------------------------------------------------------------------
    async findAll(orgCode: string): Promise<Policy[]> {
        return this.policyRepo.find({
            where: { createdByOrgCode: orgCode },
            order: { createdDate: 'DESC' },
        })
    }

    // -----------------------------------------------------------------------
    // REQ-POL-BE-F-002 — GET /api/policies/:id
    // -----------------------------------------------------------------------
    async findOne(id: number, orgCode: string): Promise<Policy> {
        const policy = await this.policyRepo.findOne({ where: { id } })
        if (!policy) throw new NotFoundException(`Policy ${id} not found.`)
        if (policy.createdByOrgCode !== orgCode) {
            throw new ForbiddenException('Access denied.')
        }
        return policy
    }

    // -----------------------------------------------------------------------
    // REQ-POL-BE-F-003 — POST /api/policies
    // Called by quotes issue-policy action.
    // -----------------------------------------------------------------------
    async create(
        orgCode: string,
        body: Partial<Policy> & Record<string, unknown>,
        createdBy: string | null,
    ): Promise<Policy> {
        const reference = await this.generateReference(orgCode)
        const policy = this.policyRepo.create({
            reference,
            quoteId: body.quote_id as number | undefined ?? body.quoteId as number | undefined ?? null,
            submissionId: body.submission_id as number | undefined ?? body.submissionId as number | undefined ?? null,
            insured: body.insured as string | undefined ?? null,
            insuredId: body.insured_id ? String(body.insured_id) : null,
            inceptionDate: body.inception_date as string | undefined ?? null,
            expiryDate: body.expiry_date as string | undefined ?? null,
            status: 'Active',
            businessType: body.business_type as string | undefined ?? null,
            contractType: body.contract_type as string | undefined ?? null,
            createdBy,
            createdByOrgCode: orgCode,
            payload: (body.payload as Record<string, unknown>) ?? {},
        })
        return this.policyRepo.save(policy)
    }

    // -----------------------------------------------------------------------
    // REQ-POL-BE-F-004 — PUT /api/policies/:id
    // -----------------------------------------------------------------------
    async update(
        id: number,
        orgCode: string,
        body: Partial<Policy> & Record<string, unknown>,
        updatedBy: string | null,
    ): Promise<Policy> {
        const policy = await this.findOne(id, orgCode)
        const allowed: (keyof Policy)[] = [
            'insured', 'insuredId', 'inceptionDate', 'expiryDate',
            'status', 'businessType', 'contractType', 'grossWrittenPremium',
            'renewalDate', 'payload',
        ]
        for (const key of allowed) {
            if (key in body) {
                (policy as any)[key] = (body as any)[key]
            }
        }
        return this.policyRepo.save(policy)
    }

    // -----------------------------------------------------------------------
    // REQ-POL-BE-F-005 — GET /api/policies/:id/sections
    // -----------------------------------------------------------------------
    async getSections(id: number, orgCode: string): Promise<unknown[]> {
        await this.findOne(id, orgCode) // access check
        return this.dataSource.query(
            `SELECT * FROM policy_sections WHERE policy_id = $1 ORDER BY id`,
            [id],
        )
    }

    // -----------------------------------------------------------------------
    // REQ-POL-BE-F-006 — GET /api/policies/:id/sections/:sectionId
    // -----------------------------------------------------------------------
    async getSectionDetail(
        id: number,
        sectionId: number,
        orgCode: string,
    ): Promise<unknown> {
        await this.findOne(id, orgCode)
        const rows = await this.dataSource.query(
            `SELECT * FROM policy_sections WHERE id = $1 AND policy_id = $2`,
            [sectionId, id],
        )
        if (!rows.length) throw new NotFoundException(`Policy section ${sectionId} not found.`)
        return rows[0]
    }

    // -----------------------------------------------------------------------
    // REQ-POL-BE-F-007 — GET /api/policies/:id/invoices
    // -----------------------------------------------------------------------
    async getInvoices(id: number, orgCode: string): Promise<unknown[]> {
        await this.findOne(id, orgCode)
        return this.dataSource.query(
            `SELECT * FROM policy_invoices WHERE policy_id = $1 ORDER BY id`,
            [id],
        )
    }

    // -----------------------------------------------------------------------
    // REQ-POL-BE-F-008 — GET /api/policies/:id/transactions
    // -----------------------------------------------------------------------
    async getTransactions(id: number, orgCode: string): Promise<unknown[]> {
        await this.findOne(id, orgCode)
        return this.dataSource.query(
            `SELECT * FROM policy_transactions WHERE policy_id = $1 ORDER BY id`,
            [id],
        )
    }

    // -----------------------------------------------------------------------
    // REQ-POL-BE-F-009 — GET /api/policies/:id/audit
    // -----------------------------------------------------------------------
    async getAudit(id: number, orgCode: string): Promise<unknown[]> {
        await this.findOne(id, orgCode)
        return this.auditService.getHistory('Policy', id)
    }

    // -----------------------------------------------------------------------
    // REQ-POL-BE-F-010 — POST /api/policies/:id/audit
    // -----------------------------------------------------------------------
    async postAudit(
        id: number,
        orgCode: string,
        user: { name?: string; username?: string; orgCode?: string },
        body: { event_type: string; description?: string },
    ): Promise<unknown> {
        await this.findOne(id, orgCode)
        if (!body?.event_type || typeof body.event_type !== 'string') {
            throw new BadRequestException('event_type is required.')
        }

        const writeResult = await this.auditService.writeEvent(
            {
                entityType: 'Policy',
                entityId: id,
                action: body.event_type,
                details: body.description ? { description: body.description } : {},
            },
            {
                ...user,
                username: user.username ?? user.name,
            },
        )
        const audit = await this.auditService.getHistory('Policy', id)
        return { success: true, audit, otherUsersOpen: writeResult.otherUsersOpen ?? [] }
    }

    // -----------------------------------------------------------------------
    // REQ-POL-BE-F-011 — GET /api/policies/:id/endorsements
    // -----------------------------------------------------------------------
    async getEndorsements(id: number, orgCode: string): Promise<unknown[]> {
        await this.findOne(id, orgCode)
        return this.dataSource.query(
            `SELECT * FROM policy_endorsements WHERE policy_id = $1 ORDER BY id`,
            [id],
        )
    }

    // -----------------------------------------------------------------------
    // REQ-POL-BE-F-012 — POST /api/policies/:id/endorsements
    // -----------------------------------------------------------------------
    async createEndorsement(
        id: number,
        orgCode: string,
        body: Record<string, unknown>,
        createdBy: string | null,
    ): Promise<unknown> {
        await this.findOne(id, orgCode)
        const { endorsement_type, effective_date, description } = body as {
            endorsement_type: string
            effective_date: string
            description?: string
        }
        if (!endorsement_type) throw new BadRequestException('endorsement_type is required.')
        if (!effective_date) throw new BadRequestException('effective_date is required.')

        const rows = await this.dataSource.query(
            `INSERT INTO policy_endorsements (policy_id, endorsement_type, effective_date, description, status, created_by)
             VALUES ($1, $2, $3, $4, 'Open', $5)
             RETURNING *`,
            [id, endorsement_type, effective_date, description ?? null, createdBy],
        )
        return rows[0]
    }

    // -----------------------------------------------------------------------
    // REQ-POL-BE-F-013 — PUT /api/policies/:id/endorsements/:endorsementId/issue
    // -----------------------------------------------------------------------
    async issueEndorsement(
        id: number,
        endorsementId: number,
        orgCode: string,
        updatedBy: string | null,
    ): Promise<unknown> {
        await this.findOne(id, orgCode)
        const rows = await this.dataSource.query(
            `UPDATE policy_endorsements SET status = 'Issued', updated_by = $1, updated_at = NOW()
             WHERE id = $2 AND policy_id = $3
             RETURNING *`,
            [updatedBy, endorsementId, id],
        )
        if (!rows.length) throw new NotFoundException(`Endorsement ${endorsementId} not found.`)
        return rows[0]
    }

    // -----------------------------------------------------------------------
    // REQ-POL-BE-F-014 — GET /api/policies/:id/sections/:sectionId/coverages
    // -----------------------------------------------------------------------
    async getCoverages(
        id: number,
        sectionId: number,
        orgCode: string,
    ): Promise<unknown[]> {
        await this.findOne(id, orgCode)
        return this.dataSource.query(
            `SELECT * FROM policy_section_coverages WHERE policy_id = $1 AND section_id = $2 ORDER BY id`,
            [id, sectionId],
        )
    }

    // -----------------------------------------------------------------------
    // REQ-POL-BE-F-015 — GET /api/policies/:id/locations
    // -----------------------------------------------------------------------
    async getLocations(id: number, orgCode: string): Promise<unknown[]> {
        await this.findOne(id, orgCode)
        return this.dataSource.query(
            `SELECT * FROM policy_location_rows WHERE policy_id = $1 ORDER BY id`,
            [id],
        )
    }
}
