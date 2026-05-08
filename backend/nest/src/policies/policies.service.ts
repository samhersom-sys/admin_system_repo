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
    // REQ-POL-BE-F-GWP-1 — GET /api/policies/gwp-monthly
    // Monthly GWP grouped by year-of-account for the requesting org.
    // -----------------------------------------------------------------------
    async getGwpMonthly(orgCode: string): Promise<{ series: any[] }> {
        const rows = await this.dataSource.query(
            `SELECT
                 EXTRACT(YEAR  FROM inception_date::date) AS yr,
                 EXTRACT(MONTH FROM inception_date::date) AS mo,
                 COALESCE(SUM(gross_written_premium), 0)  AS total
             FROM policies
             WHERE created_by_org_code = $1
               AND deleted_at IS NULL
               AND inception_date IS NOT NULL
               AND gross_written_premium IS NOT NULL
             GROUP BY yr, mo
             ORDER BY yr, mo`,
            [orgCode],
        )
        const byYear: Record<string, { label: string; months: string[]; values: number[] }> = {}
        for (const r of rows) {
            const yr = String(r.yr)
            if (!byYear[yr]) byYear[yr] = { label: yr, months: [], values: [] }
            byYear[yr].months.push(`${yr}-${String(r.mo).padStart(2, '0')}`)
            byYear[yr].values.push(Number(r.total))
        }
        return { series: Object.values(byYear) }
    }

    // -----------------------------------------------------------------------
    // REQ-POL-BE-F-GWP-2 — GET /api/policies/gwp-cumulative
    // Running cumulative GWP grouped by year-of-account.
    // -----------------------------------------------------------------------
    async getGwpCumulative(orgCode: string): Promise<{ series: any[] }> {
        const rows = await this.dataSource.query(
            `SELECT
                 EXTRACT(YEAR  FROM inception_date::date) AS yr,
                 EXTRACT(MONTH FROM inception_date::date) AS mo,
                 COALESCE(SUM(gross_written_premium), 0)  AS total
             FROM policies
             WHERE created_by_org_code = $1
               AND deleted_at IS NULL
               AND inception_date IS NOT NULL
               AND gross_written_premium IS NOT NULL
             GROUP BY yr, mo
             ORDER BY yr, mo`,
            [orgCode],
        )
        const byYear: Record<string, { label: string; months: string[]; values: number[] }> = {}
        for (const r of rows) {
            const yr = String(r.yr)
            if (!byYear[yr]) byYear[yr] = { label: yr, months: [], values: [] }
            const prev = byYear[yr].values.length > 0
                ? byYear[yr].values[byYear[yr].values.length - 1] : 0
            byYear[yr].months.push(`${yr}-${String(r.mo).padStart(2, '0')}`)
            byYear[yr].values.push(prev + Number(r.total))
        }
        return { series: Object.values(byYear) }
    }

    // -----------------------------------------------------------------------
    // REQ-POL-BE-F-GWP-3 — GET /api/policies/gwp-summary
    // Org-level and user-level GWP totals.
    // -----------------------------------------------------------------------
    async getGwpSummary(orgCode: string, username: string): Promise<{ orgTotal: number; userTotal: number }> {
        const orgRows = await this.dataSource.query(
            `SELECT COALESCE(SUM(gross_written_premium), 0) AS total
             FROM policies
             WHERE created_by_org_code = $1
               AND deleted_at IS NULL
               AND gross_written_premium IS NOT NULL`,
            [orgCode],
        )
        const userRows = await this.dataSource.query(
            `SELECT COALESCE(SUM(gross_written_premium), 0) AS total
             FROM policies
             WHERE created_by_org_code = $1
               AND created_by = $2
               AND deleted_at IS NULL
               AND gross_written_premium IS NOT NULL`,
            [orgCode, username],
        )
        return {
            orgTotal: Number(orgRows[0]?.total ?? 0),
            userTotal: Number(userRows[0]?.total ?? 0),
        }
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
    // REQ-POL-BE-F-005b — POST /api/policies/:id/sections
    // -----------------------------------------------------------------------
    async createSection(
        id: number,
        orgCode: string,
        body: Record<string, unknown>,
    ): Promise<unknown> {
        const policy = await this.findOne(id, orgCode)
        const existing = await this.dataSource.query(
            `SELECT COUNT(*)::int AS count FROM policy_sections WHERE policy_id = $1`,
            [id],
        )
        const nextSeq = Number(existing[0]?.count ?? 0) + 1
        const sectionRef = `${policy.reference ?? `POL-${id}`}-S${String(nextSeq).padStart(2, '0')}`

        const rows = await this.dataSource.query(
            `INSERT INTO policy_sections (
                policy_id,
                reference,
                class_of_business,
                inception_date,
                effective_date,
                expiry_date,
                limit_currency,
                limit_amount,
                premium_currency,
                gross_premium,
                net_premium,
                is_current,
                payload
            ) VALUES (
                $1,
                $2,
                $3,
                $4,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $9,
                TRUE,
                $10::jsonb
            ) RETURNING *`,
            [
                id,
                sectionRef,
                body.class_of_business ?? policy.businessType ?? null,
                body.inception_date ?? policy.inceptionDate ?? null,
                body.expiry_date ?? policy.expiryDate ?? null,
                body.limit_currency ?? null,
                body.limit_amount ?? null,
                body.premium_currency ?? null,
                body.gross_premium ?? null,
                JSON.stringify(body.payload ?? {}),
            ],
        )

        return rows[0]
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
    // REQ-POL-BE-F-008b — POST /api/policies/:id/transactions
    // Creates a policy_transactions header row then, for each section entry
    // in the request body, fetches the previous section snapshot, calculates
    // movement deltas, and persists a policy_section_transactions row.
    // Movement is only stored for "Contractual" transaction types; for all
    // others the delta columns are set to 0 (baseline / admin corrections).
    // -----------------------------------------------------------------------
    async createTransaction(
        id: number,
        orgCode: string,
        body: Record<string, unknown>,
        createdBy: string | null,
    ): Promise<unknown> {
        await this.findOne(id, orgCode)

        const {
            transaction_type = 'Initial Transaction',
            status = null,
            effective_date = null,
            description = null,
            payload = {},
            sections,
        } = body as {
            transaction_type?: string
            status?: string
            effective_date?: string | null
            description?: string | null
            payload?: Record<string, unknown>
            sections?: Array<Record<string, unknown>>
        }

        // 1. Insert the header transaction row
        const txRows = await this.dataSource.query(
            `INSERT INTO policy_transactions
               (policy_id, transaction_type, status, effective_date, description, payload, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [id, transaction_type, status, effective_date ?? null, description ?? null, JSON.stringify(payload), createdBy],
        )
        const tx = txRows[0]

        // 2. Insert section transaction rows with movement calculation
        if (Array.isArray(sections) && sections.length > 0) {
            // Only calculate real deltas for Contractual endorsements.
            const isContractual = transaction_type === 'Contractual'

            for (const s of sections) {
                const sectionId = s.section_id as number
                if (!sectionId) continue

                // Fetch the most recent prior section transaction for movement base
                const prevRows = await this.dataSource.query(
                    `SELECT * FROM policy_section_transactions
                     WHERE section_id = $1
                     ORDER BY created_at DESC
                     LIMIT 1`,
                    [sectionId],
                )
                const prev = prevRows[0] ?? null

                // Helper: round to 2dp
                const mvmt = (cur: unknown, prv: unknown): number =>
                    isContractual
                        ? Math.round(((Number(cur) || 0) - (Number(prv) || 0)) * 100) / 100
                        : 0

                const cur = {
                    limit_amount: s.limit_amount ?? null,
                    excess_amount: s.excess_amount ?? null,
                    sum_insured: s.sum_insured ?? null,
                    gross_premium: s.gross_premium ?? null,
                    net_premium: s.net_premium ?? null,
                    tax_receivable: s.tax_receivable ?? null,
                    deductions: s.deductions ?? null,
                    annual_gross_premium: s.annual_gross_premium ?? null,
                    annual_net_premium: s.annual_net_premium ?? null,
                }

                await this.dataSource.query(
                    `INSERT INTO policy_section_transactions
                       (policy_transaction_id, section_id, transaction_type, effective_date, created_by,
                        limit_amount, excess_amount, sum_insured, gross_premium, net_premium,
                        tax_receivable, deductions, annual_gross_premium, annual_net_premium,
                        prev_limit_amount, prev_excess_amount, prev_sum_insured, prev_gross_premium,
                        prev_net_premium, prev_tax_receivable, prev_deductions,
                        prev_annual_gross_premium, prev_annual_net_premium,
                        limit_amount_mvmt, excess_amount_mvmt, sum_insured_mvmt, gross_premium_mvmt,
                        net_premium_mvmt, tax_receivable_mvmt, deductions_mvmt,
                        annual_gross_premium_mvmt, annual_net_premium_mvmt)
                     VALUES
                       ($1,$2,$3,$4,$5,
                        $6,$7,$8,$9,$10,
                        $11,$12,$13,$14,
                        $15,$16,$17,$18,
                        $19,$20,$21,
                        $22,$23,
                        $24,$25,$26,$27,
                        $28,$29,$30,
                        $31,$32)`,
                    [
                        tx.id, sectionId, transaction_type, effective_date ?? null, createdBy,
                        cur.limit_amount, cur.excess_amount, cur.sum_insured, cur.gross_premium, cur.net_premium,
                        cur.tax_receivable, cur.deductions, cur.annual_gross_premium, cur.annual_net_premium,
                        prev?.limit_amount ?? null, prev?.excess_amount ?? null, prev?.sum_insured ?? null,
                        prev?.gross_premium ?? null, prev?.net_premium ?? null, prev?.tax_receivable ?? null,
                        prev?.deductions ?? null, prev?.annual_gross_premium ?? null, prev?.annual_net_premium ?? null,
                        mvmt(cur.limit_amount, prev?.limit_amount),
                        mvmt(cur.excess_amount, prev?.excess_amount),
                        mvmt(cur.sum_insured, prev?.sum_insured),
                        mvmt(cur.gross_premium, prev?.gross_premium),
                        mvmt(cur.net_premium, prev?.net_premium),
                        mvmt(cur.tax_receivable, prev?.tax_receivable),
                        mvmt(cur.deductions, prev?.deductions),
                        mvmt(cur.annual_gross_premium, prev?.annual_gross_premium),
                        mvmt(cur.annual_net_premium, prev?.annual_net_premium),
                    ],
                )
            }
        }

        return tx
    }

    // -----------------------------------------------------------------------
    // REQ-POL-BE-F-008c — GET /api/policies/:id/transactions/:txId/sections/:sectionId
    // Returns current values, previous snapshot, and persisted movement deltas
    // for a specific policy section transaction.
    // -----------------------------------------------------------------------
    async getSectionTransaction(
        id: number,
        txId: number,
        sectionId: number,
        orgCode: string,
    ): Promise<unknown> {
        await this.findOne(id, orgCode)
        const rows = await this.dataSource.query(
            `SELECT pst.*,
                    ps.reference  AS section_reference,
                    p.reference   AS policy_reference
             FROM policy_section_transactions pst
             JOIN policy_sections ps       ON ps.id  = pst.section_id
             JOIN policy_transactions pt   ON pt.id  = pst.policy_transaction_id
             JOIN policies p               ON p.id   = pt.policy_id
             WHERE pst.policy_transaction_id = $1
               AND pst.section_id            = $2
               AND p.id                      = $3`,
            [txId, sectionId, id],
        )
        if (!rows.length) throw new NotFoundException(`Section transaction not found.`)
        const d = rows[0]
        return {
            id: d.id,
            transaction_id: d.policy_transaction_id,
            section_id: d.section_id,
            section_reference: d.section_reference,
            policy_reference: d.policy_reference,
            transaction_type: d.transaction_type,
            effective_date: d.effective_date,
            current: {
                limit_amount: d.limit_amount,
                excess_amount: d.excess_amount,
                sum_insured: d.sum_insured,
                gross_premium: d.gross_premium,
                net_premium: d.net_premium,
                tax_receivable: d.tax_receivable,
                deductions: d.deductions,
                annual_gross_premium: d.annual_gross_premium,
                annual_net_premium: d.annual_net_premium,
            },
            previous: {
                limit_amount: d.prev_limit_amount,
                excess_amount: d.prev_excess_amount,
                sum_insured: d.prev_sum_insured,
                gross_premium: d.prev_gross_premium,
                net_premium: d.prev_net_premium,
                tax_receivable: d.prev_tax_receivable,
                deductions: d.prev_deductions,
                annual_gross_premium: d.prev_annual_gross_premium,
                annual_net_premium: d.prev_annual_net_premium,
            },
            movements: {
                limit_amount: d.limit_amount_mvmt,
                excess_amount: d.excess_amount_mvmt,
                sum_insured: d.sum_insured_mvmt,
                gross_premium: d.gross_premium_mvmt,
                net_premium: d.net_premium_mvmt,
                tax_receivable: d.tax_receivable_mvmt,
                deductions: d.deductions_mvmt,
                annual_gross_premium: d.annual_gross_premium_mvmt,
                annual_net_premium: d.annual_net_premium_mvmt,
            },
        }
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
            `SELECT
                id,
                policy_id,
                transaction_type,
                effective_date,
                description,
                status,
                payload,
                payload->>'sub_type' AS sub_type,
                created_by,
                created_at
             FROM policy_transactions
             WHERE policy_id = $1
               AND transaction_type IN ('Administrative', 'Contractual')
             ORDER BY effective_date ASC NULLS LAST, id ASC`,
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
        const { endorsement_type, endorsement_sub_type, effective_date, description } = body as {
            endorsement_type: string
            endorsement_sub_type?: string
            effective_date: string
            description?: string
        }
        if (!endorsement_type) throw new BadRequestException('endorsement_type is required.')
        if (!effective_date) throw new BadRequestException('effective_date is required.')

        // Backward-compatible mapping:
        // - legacy FE sent endorsement_type = 'Mid Term Adjustment' | 'Cancellation'
        // - new FE sends endorsement_type = 'Administrative' | 'Contractual'
        //   plus endorsement_sub_type = 'Mid Term Adjustment' | 'Cancellation'
        const isLegacySubtypeOnly = ['Mid Term Adjustment', 'Cancellation'].includes(endorsement_type)
        const transactionType = isLegacySubtypeOnly
            ? 'Contractual'
            : endorsement_type
        const subType = transactionType === 'Contractual'
            ? (isLegacySubtypeOnly ? endorsement_type : (endorsement_sub_type ?? 'Mid Term Adjustment'))
            : null

        const rows = await this.dataSource.query(
            `INSERT INTO policy_transactions
               (policy_id, transaction_type, status, effective_date, description, payload, created_by)
             VALUES ($1, $2, 'Draft', $3, $4, $5, $6)
             RETURNING *`,
            [
                id,
                transactionType,
                effective_date,
                description ?? null,
                JSON.stringify(subType ? { sub_type: subType } : {}),
                createdBy,
            ],
        )
        return {
            ...rows[0],
            sub_type: subType,
        }
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
        const policy = await this.findOne(id, orgCode)
        const rows = await this.dataSource.query(
            `UPDATE policy_transactions
             SET status = 'Endorsed', created_by = COALESCE($1, created_by)
             WHERE id = $2
               AND policy_id = $3
               AND transaction_type IN ('Administrative', 'Contractual')
             RETURNING *`,
            [updatedBy, endorsementId, id],
        )
        if (!rows.length) throw new NotFoundException(`Endorsement ${endorsementId} not found.`)

        const endorsement = rows[0]
        const subType = (endorsement.payload as Record<string, unknown> | null)?.sub_type
            ?? null

        let nextPolicy = policy
        if (subType === 'Cancellation') {
            const policyRows = await this.dataSource.query(
                `UPDATE policies
                 SET status = 'Cancelled', updated_by = $1, updated_at = NOW()
                 WHERE id = $2
                 RETURNING *`,
                [updatedBy, id],
            )
            nextPolicy = policyRows[0] ?? policy
        }

        return {
            policy: nextPolicy,
            endorsement: {
                ...endorsement,
                sub_type: subType,
            },
        }
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
