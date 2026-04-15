import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource, IsNull } from 'typeorm'
import { Quote } from '../entities/quote.entity'
import { QuoteSection } from '../entities/quote-section.entity'
import { AuditService } from '../audit/audit.service'

@Injectable()
export class QuotesService {
    constructor(
        @InjectRepository(Quote)
        private readonly quoteRepo: Repository<Quote>,
        @InjectRepository(QuoteSection)
        private readonly sectionRepo: Repository<QuoteSection>,
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly auditService: AuditService,
    ) { }

    // ---------------------------------------------------------------------------
    // Error logger â€” writes to error_log table (Â§16-Error-Handling-Standards.md)
    // No error_log entity yet; raw SQL used per Â§15.20.3
    // ---------------------------------------------------------------------------
    private async logError(
        orgCode: string | null,
        userName: string | null,
        source: string,
        errorCode: string,
        description: string,
        context: Record<string, unknown> = {},
    ): Promise<void> {
        try {
            await this.dataSource.query(
                `INSERT INTO error_log (org_code, user_name, source, error_code, description, context)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [orgCode, userName, source, errorCode, description, JSON.stringify(context)],
            )
        } catch (logErr: any) {
            console.error('[logError] Failed to write error_log:', logErr.message)
        }
    }

    // ---------------------------------------------------------------------------
    // Reference generator: QUO-{ORG}-{YYYYMMDD}-{NNN}
    // ---------------------------------------------------------------------------
    private async generateReference(orgCode: string): Promise<string> {
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        const prefix = `QUO-${orgCode.toUpperCase()}-${datePart}-`
        const row = await this.quoteRepo
            .createQueryBuilder('q')
            .select('q.reference', 'reference')
            .where('q.reference LIKE :prefix', { prefix: `${prefix}%` })
            .orderBy('q.reference', 'DESC')
            .limit(1)
            .getRawOne<{ reference: string }>()
        let seq = 1
        if (row?.reference) {
            const lastSeq = parseInt(row.reference.slice(-3), 10)
            if (!isNaN(lastSeq)) seq = lastSeq + 1
        }
        return `${prefix}${String(seq).padStart(3, '0')}`
    }

    // ---------------------------------------------------------------------------
    // R01 — GET /api/quotes
    // date_basis: 'inception' | 'expiry' | 'created'
    // ---------------------------------------------------------------------------
    async findAll(
        orgCode: string,
        submissionId?: string,
        status?: string,
        dateBasis?: string,
        dateFrom?: string,
        dateTo?: string,
    ): Promise<Quote[]> {
        const qb = this.quoteRepo
            .createQueryBuilder('q')
            .where('q.createdByOrgCode = :orgCode', { orgCode })
            .orderBy('q.createdDate', 'DESC')

        if (submissionId) {
            qb.andWhere('q.submissionId = :submissionId', { submissionId: parseInt(submissionId, 10) })
        }
        if (status) {
            qb.andWhere('q.status = :status', { status })
        }

        if (dateBasis && (dateFrom || dateTo)) {
            const colMap: Record<string, string> = {
                inception: 'q.inceptionDate',
                expiry:    'q.expiryDate',
                created:   'q.createdDate',
            }
            const col = colMap[dateBasis] ?? 'q.createdDate'
            if (dateFrom) qb.andWhere(`${col} >= :dateFrom`, { dateFrom })
            if (dateTo)   qb.andWhere(`${col} <= :dateTo`,   { dateTo })
        }

        return qb.getMany()
    }

    // ---------------------------------------------------------------------------
    // R02 â€” POST /api/quotes
    // ---------------------------------------------------------------------------
    async create(orgCode: string, body: any, userOrgCode: string, userName: string | null): Promise<Quote> {
        const {
            insured,
            insured_id,
            submission_id,
            business_type,
            inception_date,
            expiry_date,
            inception_time,
            expiry_time,
            quote_currency,
            created_by,
        } = body

        if (!insured || !String(insured).trim()) {
            await this.logError(orgCode, userName, 'POST /api/quotes', 'ERR_QUOTE_CREATE_MISSING_INSURED', 'insured is required', {})
            throw new BadRequestException('insured is required')
        }

        let resolvedExpiry = expiry_date ?? null
        if (!resolvedExpiry && inception_date) {
            try {
                const d = new Date(inception_date)
                d.setDate(d.getDate() + 365)
                resolvedExpiry = d.toISOString().slice(0, 10)
            } catch (_) {
                // non-fatal â€” leave null
            }
        }

        try {
            const reference = await this.generateReference(orgCode)
            const quote = this.quoteRepo.create({
                reference,
                submissionId: submission_id ? parseInt(submission_id, 10) : null,
                insured: String(insured).trim(),
                insuredId: insured_id ?? null,
                status: 'Draft',
                businessType: business_type ?? null,
                inceptionDate: inception_date ?? null,
                expiryDate: resolvedExpiry,
                inceptionTime: inception_time ?? '00:00:00',
                expiryTime: expiry_time ?? '23:59:59',
                quoteCurrency: quote_currency ?? 'USD',
                createdBy: created_by ?? userName ?? null,
                createdByOrgCode: orgCode,
            })
            return this.quoteRepo.save(quote)
        } catch (err: any) {
            await this.logError(orgCode, userName, 'POST /api/quotes', 'ERR_QUOTE_CREATE_500', err.message, {})
            throw err
        }
    }

    // ---------------------------------------------------------------------------
    // R03 â€” GET /api/quotes/:id
    // ---------------------------------------------------------------------------
    async findOne(id: number, orgCode: string, userName: string | null): Promise<Quote> {
        const quote = await this.quoteRepo.findOne({ where: { id } })
        if (!quote) {
            await this.logError(orgCode, userName, 'GET /api/quotes/:id', 'ERR_QUOTE_NOT_FOUND', 'Quote not found', { id })
            throw new NotFoundException('Quote not found')
        }
        if (quote.createdByOrgCode !== orgCode) {
            await this.logError(orgCode, userName, 'GET /api/quotes/:id', 'ERR_QUOTE_FORBIDDEN', 'Forbidden', { id })
            throw new ForbiddenException('Forbidden')
        }
        return quote
    }

    // ---------------------------------------------------------------------------
    // R04 â€” PUT /api/quotes/:id
    // Mutable fields enumerated explicitly â€” safer than the original dynamic SQL.
    // ---------------------------------------------------------------------------
    async update(id: number, orgCode: string, body: any, userName: string | null): Promise<Quote> {
        const quote = await this.quoteRepo.findOne({ where: { id } })
        if (!quote) {
            await this.logError(orgCode, userName, 'PUT /api/quotes/:id', 'ERR_QUOTE_NOT_FOUND', 'Quote not found', { id })
            throw new NotFoundException('Quote not found')
        }
        if (quote.createdByOrgCode !== orgCode) {
            await this.logError(orgCode, userName, 'PUT /api/quotes/:id', 'ERR_QUOTE_FORBIDDEN', 'Forbidden', { id })
            throw new ForbiddenException('Forbidden')
        }
        if (['Bound', 'Declined'].includes(String(quote.status))) {
            await this.logError(orgCode, userName, 'PUT /api/quotes/:id', 'ERR_QUOTE_EDIT_LOCKED', 'Cannot edit a Bound or Declined quote', { id, status: quote.status })
            throw new BadRequestException('Cannot edit a Bound or Declined quote')
        }

        // Enumerated mutable fields â€” immutable fields (reference, created_*, id, status) are never applied
        const mutable: Partial<Quote> = {}
        if (body.insured !== undefined) mutable.insured = body.insured
        if (body.insured_id !== undefined) mutable.insuredId = body.insured_id
        if (body.submission_id !== undefined) mutable.submissionId = body.submission_id
        if (body.business_type !== undefined) mutable.businessType = body.business_type
        if (body.inception_date !== undefined) mutable.inceptionDate = body.inception_date || null
        if (body.expiry_date !== undefined) mutable.expiryDate = body.expiry_date || null
        if (body.inception_time !== undefined) mutable.inceptionTime = body.inception_time || null
        if (body.expiry_time !== undefined) mutable.expiryTime = body.expiry_time || null
        if (body.quote_currency !== undefined) mutable.quoteCurrency = body.quote_currency
        if (body.payload !== undefined) mutable.payload = body.payload
        // Block 2 fields (migration 093) -- REQ-QUO-BE-NE-F-004 / OQ-QUO-BE-NE-002 resolved
        if (body.year_of_account !== undefined) mutable.yearOfAccount = body.year_of_account
        if (body.lta_applicable !== undefined) mutable.ltaApplicable = body.lta_applicable
        if (body.lta_start_date !== undefined) mutable.ltaStartDate = body.lta_start_date || null
        if (body.lta_start_time !== undefined) mutable.ltaStartTime = body.lta_start_time || null
        if (body.lta_expiry_date !== undefined) mutable.ltaExpiryDate = body.lta_expiry_date || null
        if (body.lta_expiry_time !== undefined) mutable.ltaExpiryTime = body.lta_expiry_time || null
        if (body.contract_type !== undefined) mutable.contractType = body.contract_type
        if (body.method_of_placement !== undefined) mutable.methodOfPlacement = body.method_of_placement
        if (body.unique_market_reference !== undefined) mutable.uniqueMarketReference = body.unique_market_reference
        if (body.renewable_indicator !== undefined) mutable.renewableIndicator = body.renewable_indicator
        if (body.renewal_date !== undefined) mutable.renewalDate = body.renewal_date || null
        if (body.renewal_status !== undefined) mutable.renewalStatus = body.renewal_status
        if (body.renewal_time !== undefined) mutable.renewalTime = body.renewal_time || null

        if (Object.keys(mutable).length === 0) return quote

        try {
            Object.assign(quote, mutable)
            return this.quoteRepo.save(quote)
        } catch (err: any) {
            await this.logError(orgCode, userName, 'PUT /api/quotes/:id', 'ERR_QUOTE_UPDATE_500', err.message, { id })
            throw err
        }
    }

    // ---------------------------------------------------------------------------
    // R05 â€” POST /api/quotes/:id/quote  (Draft â†’ Quoted)
    // ---------------------------------------------------------------------------
    async markQuoted(id: number, orgCode: string, userName: string | null): Promise<Quote> {
        const quote = await this.quoteRepo.findOne({ where: { id } })
        if (!quote) {
            await this.logError(orgCode, userName, 'POST /api/quotes/:id/quote', 'ERR_QUOTE_NOT_FOUND', 'Quote not found', { id })
            throw new NotFoundException('Quote not found')
        }
        if (quote.createdByOrgCode !== orgCode) {
            await this.logError(orgCode, userName, 'POST /api/quotes/:id/quote', 'ERR_QUOTE_FORBIDDEN', 'Forbidden', { id })
            throw new ForbiddenException('Forbidden')
        }
        if (quote.status !== 'Draft') {
            await this.logError(orgCode, userName, 'POST /api/quotes/:id/quote', 'ERR_QUOTE_INVALID_TRANSITION', 'Only a Draft quote may be marked as Quoted', { id, status: quote.status })
            throw new BadRequestException('Only a Draft quote may be marked as Quoted')
        }
        quote.status = 'Quoted'
        return this.quoteRepo.save(quote)
    }

    // ---------------------------------------------------------------------------
    // R06 â€” POST /api/quotes/:id/bind  (Quoted â†’ Bound)
    // ---------------------------------------------------------------------------
    async bind(id: number, orgCode: string, userName: string | null): Promise<Quote> {
        const quote = await this.quoteRepo.findOne({ where: { id } })
        if (!quote) {
            await this.logError(orgCode, userName, 'POST /api/quotes/:id/bind', 'ERR_QUOTE_NOT_FOUND', 'Quote not found', { id })
            throw new NotFoundException('Quote not found')
        }
        if (quote.createdByOrgCode !== orgCode) {
            await this.logError(orgCode, userName, 'POST /api/quotes/:id/bind', 'ERR_QUOTE_FORBIDDEN', 'Forbidden', { id })
            throw new ForbiddenException('Forbidden')
        }
        if (quote.status !== 'Quoted') {
            await this.logError(orgCode, userName, 'POST /api/quotes/:id/bind', 'ERR_QUOTE_INVALID_TRANSITION', 'Only a Quoted quote may be bound', { id, status: quote.status })
            throw new BadRequestException('Only a Quoted quote may be bound')
        }
        quote.status = 'Bound'
        return this.quoteRepo.save(quote)
    }

    // ---------------------------------------------------------------------------
    // R07 â€” POST /api/quotes/:id/decline
    // JSONB merge (payload || $2::jsonb) requires raw SQL â€” cannot be expressed
    // as a TypeORM QueryBuilder operation per Â§15.20.3
    // ---------------------------------------------------------------------------
    async decline(id: number, orgCode: string, body: any, userName: string | null): Promise<Quote> {
        const { reasonCode, reasonText } = body ?? {}

        if (!reasonCode) {
            await this.logError(orgCode, userName, 'POST /api/quotes/:id/decline', 'ERR_QUOTE_DECLINE_MISSING_REASON', 'reasonCode is required', { id })
            throw new BadRequestException('reasonCode is required')
        }

        const quote = await this.quoteRepo.findOne({ where: { id } })
        if (!quote) {
            await this.logError(orgCode, userName, 'POST /api/quotes/:id/decline', 'ERR_QUOTE_NOT_FOUND', 'Quote not found', { id })
            throw new NotFoundException('Quote not found')
        }
        if (quote.createdByOrgCode !== orgCode) {
            await this.logError(orgCode, userName, 'POST /api/quotes/:id/decline', 'ERR_QUOTE_FORBIDDEN', 'Forbidden', { id })
            throw new ForbiddenException('Forbidden')
        }
        if (quote.status === 'Bound') {
            await this.logError(orgCode, userName, 'POST /api/quotes/:id/decline', 'ERR_QUOTE_INVALID_TRANSITION', 'Cannot decline a Bound quote', { id, status: quote.status })
            throw new BadRequestException('Cannot decline a Bound quote')
        }

        try {
            // JSONB merge must use raw SQL â€” `payload || $2::jsonb` is Postgres-specific
            // JS merge (per OQ-QUO-BE-NE-005) -- no raw SQL JSONB merge needed
            const existingPayload = (typeof quote.payload === 'object' && quote.payload !== null) ? quote.payload : {}
            quote.status = 'Declined'
            quote.payload = { ...existingPayload, declineReasonCode: reasonCode, declineReasonText: reasonText ?? '' } as any
            return this.quoteRepo.save(quote)
        } catch (err: any) {
            await this.logError(orgCode, userName, 'POST /api/quotes/:id/decline', 'ERR_QUOTE_DECLINE_500', err.message, { id })
            throw err
        }
    }
    // ---------------------------------------------------------------------------
    // R09 — GET /api/quotes/:id/audit
    // Returns all audit events for the quote, ordered by time ascending.
    // ---------------------------------------------------------------------------
    async getAudit(id: number, orgCode: string, userName: string | null): Promise<any[]> {
        const quote = await this.quoteRepo.findOne({ where: { id } })
        if (!quote) {
            await this.logError(orgCode, userName, 'GET /api/quotes/:id/audit', 'ERR_QUOTE_NOT_FOUND', 'Quote not found', { id })
            throw new NotFoundException('Quote not found')
        }
        if (quote.createdByOrgCode !== orgCode) {
            await this.logError(orgCode, userName, 'GET /api/quotes/:id/audit', 'ERR_QUOTE_FORBIDDEN', 'Forbidden', { id })
            throw new ForbiddenException('Forbidden')
        }
        return this.auditService.getHistory('Quote', id)
    }    // ---------------------------------------------------------------------------
    // R12 -- GET /api/quotes/:id/sections
    // REQ-QUO-BE-NE-F-011
    // ---------------------------------------------------------------------------
    async listSections(id: number, orgCode: string, userName: string | null): Promise<QuoteSection[]> {
        const quote = await this.quoteRepo.findOne({ where: { id } })
        if (!quote) {
            await this.logError(orgCode, userName, 'GET /api/quotes/:id/sections', 'ERR_SECTIONS_FETCH_404', 'Quote not found', { id })
            throw new NotFoundException('Quote not found')
        }
        if (quote.createdByOrgCode !== orgCode) {
            await this.logError(orgCode, userName, 'GET /api/quotes/:id/sections', 'ERR_SECTIONS_FETCH_403', 'Forbidden', { id })
            throw new ForbiddenException('Forbidden')
        }
        return this.sectionRepo.find({
            where: { quoteId: id, deletedAt: IsNull() },
            order: { id: 'ASC' },
        })
    }

    // ---------------------------------------------------------------------------
    // R15 -- PUT /api/quotes/:id/sections/:sectionId
    // ---------------------------------------------------------------------------
    async updateSection(id: number, sectionId: number, orgCode: string, userName: string | null, body: any): Promise<QuoteSection> {
        const quote = await this.quoteRepo.findOne({ where: { id } })
        if (!quote) throw new NotFoundException('Quote not found')
        if (quote.createdByOrgCode !== orgCode) throw new ForbiddenException('Forbidden')
        const section = await this.sectionRepo.findOne({ where: { id: sectionId, quoteId: id, deletedAt: IsNull() } })
        if (!section) throw new NotFoundException('Section not found')
        try {
            if (body.class_of_business !== undefined) section.classOfBusiness = body.class_of_business
            if (body.inception_date !== undefined) section.inceptionDate = body.inception_date
            if (body.effective_date !== undefined) section.effectiveDate = body.effective_date
            if (body.expiry_date !== undefined) section.expiryDate = body.expiry_date
            if (body.inception_time !== undefined) section.inceptionTime = body.inception_time
            if (body.effective_time !== undefined) section.effectiveTime = body.effective_time
            if (body.expiry_time !== undefined) section.expiryTime = body.expiry_time
            // Auto-compute days_on_cover from inception_date and expiry_date when either changes
            {
                const inc = body.inception_date !== undefined ? body.inception_date : section.inceptionDate
                const exp = body.expiry_date !== undefined ? body.expiry_date : section.expiryDate
                if (inc && exp) {
                    const msPerDay = 86_400_000
                    const days = Math.round((new Date(exp).getTime() - new Date(inc).getTime()) / msPerDay) + 1
                    section.daysOnCover = days > 0 ? days : null
                } else {
                    section.daysOnCover = null
                }
            }
            if (body.tax_receivable !== undefined) section.taxReceivable = body.tax_receivable
            if (body.limit_currency !== undefined) section.limitCurrency = body.limit_currency
            if (body.limit_amount !== undefined) section.limitAmount = body.limit_amount
            if (body.limit_loss_qualifier !== undefined) section.limitLossQualifier = body.limit_loss_qualifier
            if (body.excess_currency !== undefined) section.excessCurrency = body.excess_currency
            if (body.excess_amount !== undefined) section.excessAmount = body.excess_amount
            if (body.excess_loss_qualifier !== undefined) section.excessLossQualifier = body.excess_loss_qualifier
            if (body.sum_insured_currency !== undefined) section.sumInsuredCurrency = body.sum_insured_currency
            if (body.sum_insured_amount !== undefined) section.sumInsured = body.sum_insured_amount
            if (body.premium_currency !== undefined) section.premiumCurrency = body.premium_currency
            if (body.gross_premium !== undefined) section.grossPremium = body.gross_premium
            // Added by migrations 102-104 — REQ-QUO-BE-NE-F-020c
            if (body.time_basis !== undefined) section.timeBasis = body.time_basis
            if (body.written_order_basis !== undefined) section.writtenOrderBasis = body.written_order_basis
            if (body.signed_order_basis !== undefined) section.signedOrderBasis = body.signed_order_basis
            if (body.written_line_total !== undefined) section.writtenLineTotal = body.written_line_total
            if (body.signed_line_total !== undefined) section.signedLineTotal = body.signed_line_total
            if (body.annual_gross_premium !== undefined) section.annualGrossPremium = body.annual_gross_premium
            if (body.annual_net_premium !== undefined) section.annualNetPremium = body.annual_net_premium
            if (body.delegated_authority_ref !== undefined) section.delegatedAuthorityRef = body.delegated_authority_ref
            if (body.delegated_authority_section_ref !== undefined) section.delegatedAuthoritySectionRef = body.delegated_authority_section_ref
            // Merge payload fields  (written_order, signed_order stored in payload)
            const existingPayload = (section.payload as Record<string, unknown>) ?? {}
            const payloadPatch: Record<string, unknown> = {}
            // Apply body.payload first, then override with explicit top-level fields so they take precedence
            if (body.payload !== undefined) Object.assign(payloadPatch, body.payload)
            if (body.written_order !== undefined) payloadPatch.written_order = body.written_order
            if (body.signed_order !== undefined) payloadPatch.signed_order = body.signed_order
            section.payload = { ...existingPayload, ...payloadPatch }
            return this.sectionRepo.save(section)
        } catch (err: any) {
            await this.logError(orgCode, userName, 'PUT /api/quotes/:id/sections/:sectionId', 'ERR_SECTION_UPDATE_500', err.message, { id, sectionId })
            throw err
        }
    }

    // ---------------------------------------------------------------------------
    // R13 -- POST /api/quotes/:id/sections
    // REQ-QUO-BE-NE-F-012
    // ---------------------------------------------------------------------------
    async createSection(id: number, orgCode: string, userName: string | null, body: any): Promise<QuoteSection> {
        const quote = await this.quoteRepo.findOne({ where: { id } })
        if (!quote) throw new NotFoundException('Quote not found')
        if (quote.createdByOrgCode !== orgCode) throw new ForbiddenException('Forbidden')
        if (['Bound', 'Declined'].includes(String(quote.status))) {
            throw new BadRequestException('Cannot add sections to a Bound or Declined quote')
        }
        try {
            // Auto-generate reference: {quoteRef}-S01, S02, ...
            const existingCount = await this.sectionRepo.count({
                where: { quoteId: id, deletedAt: IsNull() },
            })
            const seq = String(existingCount + 1).padStart(2, '0')
            const sectionRef = `${quote.reference}-S${seq}`
            const section = this.sectionRepo.create({
                quoteId: id,
                reference: sectionRef,
                classOfBusiness: body.class_of_business ?? null,
                inceptionDate: body.inception_date ?? null,
                expiryDate: body.expiry_date ?? null,
                limitCurrency: body.limit_currency ?? null,
                limitAmount: body.limit_amount ?? null,
                premiumCurrency: body.premium_currency ?? null,
                grossPremium: body.gross_premium ?? null,
            })
            return this.sectionRepo.save(section)
        } catch (err: any) {
            await this.logError(orgCode, userName, 'POST /api/quotes/:id/sections', 'ERR_SECTION_CREATE_500', err.message, { id })
            throw err
        }
    }

    // ---------------------------------------------------------------------------
    // R14 -- DELETE /api/quotes/:id/sections/:sectionId  (soft-delete)
    // REQ-QUO-BE-NE-F-013
    // ---------------------------------------------------------------------------
    async deleteSection(id: number, sectionId: number, orgCode: string, userName: string | null): Promise<{ message: string }> {
        const quote = await this.quoteRepo.findOne({ where: { id } })
        if (!quote) throw new NotFoundException('Quote not found')
        if (quote.createdByOrgCode !== orgCode) throw new ForbiddenException('Forbidden')
        const section = await this.sectionRepo.findOne({
            where: { id: sectionId, quoteId: id, deletedAt: IsNull() },
        })
        if (!section) throw new NotFoundException('Section not found')
        try {
            section.deletedAt = new Date()
            await this.sectionRepo.save(section)
            return { message: 'Section deleted' }
        } catch (err: any) {
            await this.logError(orgCode, userName, 'DELETE /api/quotes/:id/sections/:sectionId', 'ERR_SECTION_DELETE_500', err.message, { id, sectionId })
            throw err
        }
    }


    // ---------------------------------------------------------------------------
    // R11 -- POST /api/quotes/:id/copy
    // REQ-QUO-BE-NE-F-010 -- Creates a Draft copy of the source quote.
    // ---------------------------------------------------------------------------
    async copy(id: number, orgCode: string, userName: string | null): Promise<Quote> {
        const source = await this.quoteRepo.findOne({ where: { id } })
        if (!source) {
            await this.logError(orgCode, userName, 'POST /api/quotes/:id/copy', 'ERR_QUOTE_NOT_FOUND', 'Quote not found', { id })
            throw new NotFoundException('Quote not found')
        }
        if (source.createdByOrgCode !== orgCode) {
            await this.logError(orgCode, userName, 'POST /api/quotes/:id/copy', 'ERR_QUOTE_FORBIDDEN', 'Forbidden', { id })
            throw new ForbiddenException('Forbidden')
        }
        try {
            const reference = await this.generateReference(orgCode)
            const copied = this.quoteRepo.create({
                reference,
                submissionId: source.submissionId,
                insured: source.insured,
                insuredId: source.insuredId,
                status: 'Draft',
                businessType: source.businessType,
                inceptionDate: source.inceptionDate,
                expiryDate: source.expiryDate,
                inceptionTime: source.inceptionTime,
                expiryTime: source.expiryTime,
                quoteCurrency: source.quoteCurrency,
                createdBy: userName ?? source.createdBy,
                createdByOrgCode: orgCode,
                // Block 2 fields (migration 093)
                yearOfAccount: source.yearOfAccount,
                ltaApplicable: source.ltaApplicable,
                ltaStartDate: source.ltaStartDate,
                ltaStartTime: source.ltaStartTime,
                ltaExpiryDate: source.ltaExpiryDate,
                ltaExpiryTime: source.ltaExpiryTime,
                contractType: source.contractType,
                methodOfPlacement: source.methodOfPlacement,
                uniqueMarketReference: source.uniqueMarketReference,
                renewableIndicator: source.renewableIndicator,
                renewalDate: source.renewalDate,
                renewalStatus: source.renewalStatus,
            })
            return this.quoteRepo.save(copied)
        } catch (err: any) {
            await this.logError(orgCode, userName, 'POST /api/quotes/:id/copy', 'ERR_QUOTE_COPY_500', err.message, { id })
            throw err
        }
    }
    // ---------------------------------------------------------------------------
    // R15 — GET /api/quotes/:quoteId/sections/:sectionId/risk-codes
    // REQ-QUO-BE-NE-F-015
    // ---------------------------------------------------------------------------
    async listRiskCodes(quoteId: number, sectionId: number, orgCode: string): Promise<any[]> {
        const quote = await this.quoteRepo.findOne({ where: { id: quoteId } })
        if (!quote) throw new NotFoundException('Quote not found')
        if (quote.createdByOrgCode !== orgCode) throw new ForbiddenException('Forbidden')
        return this.dataSource.query(
            `SELECT id, code, description FROM quote_section_risk_codes WHERE quote_section_id = $1 ORDER BY id ASC`,
            [sectionId],
        )
    }

    // ---------------------------------------------------------------------------
    // R16 — POST /api/quotes/:quoteId/sections/:sectionId/risk-codes
    // REQ-QUO-BE-NE-F-016
    // ---------------------------------------------------------------------------
    async addRiskCode(
        quoteId: number,
        sectionId: number,
        orgCode: string,
        body: { code?: string; description?: string },
    ): Promise<any> {
        const quote = await this.quoteRepo.findOne({ where: { id: quoteId } })
        if (!quote) throw new NotFoundException('Quote not found')
        if (quote.createdByOrgCode !== orgCode) throw new ForbiddenException('Forbidden')
        if (!body.code) throw new BadRequestException('code is required')
        const rows = await this.dataSource.query(
            `INSERT INTO quote_section_risk_codes (quote_section_id, code, description)
             VALUES ($1, $2, $3)
             ON CONFLICT (quote_section_id, code) DO NOTHING
             RETURNING id, code, description`,
            [sectionId, body.code, body.description ?? null],
        )
        if (!rows.length) throw new BadRequestException('Risk code already exists for this section')
        return rows[0]
    }

    // ---------------------------------------------------------------------------
    // R17 — DELETE /api/quotes/:quoteId/sections/:sectionId/risk-codes/:code
    // REQ-QUO-BE-NE-F-017
    // ---------------------------------------------------------------------------
    async deleteRiskCode(
        quoteId: number,
        sectionId: number,
        orgCode: string,
        code: string,
    ): Promise<{ message: string }> {
        const quote = await this.quoteRepo.findOne({ where: { id: quoteId } })
        if (!quote) throw new NotFoundException('Quote not found')
        if (quote.createdByOrgCode !== orgCode) throw new ForbiddenException('Forbidden')
        const result = await this.dataSource.query(
            `DELETE FROM quote_section_risk_codes WHERE quote_section_id = $1 AND code = $2 RETURNING id`,
            [sectionId, code],
        )
        if (!result.length) throw new NotFoundException('Risk code not found')
        return { message: 'Risk code deleted' }
    }

    // ---------------------------------------------------------------------------
    // R10 — POST /api/quotes/:id/audit
    // Inserts a new audit event. User identity comes from JWT only.
    // ---------------------------------------------------------------------------
    async postAudit(id: number, orgCode: string, user: any, body: any): Promise<any> {
        const { action, details } = body ?? {}
        const userName = user.username || user.email || user.name || 'System'
        if (!action || typeof action !== 'string') {
            throw new BadRequestException('action is required')
        }
        const quote = await this.quoteRepo.findOne({ where: { id } })
        if (!quote) {
            await this.logError(orgCode, userName, 'POST /api/quotes/:id/audit', 'ERR_QUOTE_NOT_FOUND', 'Quote not found', { id })
            throw new NotFoundException('Quote not found')
        }
        if (quote.createdByOrgCode !== orgCode) {
            await this.logError(orgCode, userName, 'POST /api/quotes/:id/audit', 'ERR_QUOTE_FORBIDDEN', 'Forbidden', { id })
            throw new ForbiddenException('Forbidden')
        }
        const writeResult = await this.auditService.writeEvent(
            { entityType: 'Quote', entityId: id, action, details },
            user,
        )
        // Return the created audit event with snake_case HTTP fields (REQ-QUO-BE-NE-F-009)
        return {
            id: writeResult.id,
            action: writeResult.action,
            entity_type: writeResult.entityType,
            entity_id: writeResult.entityId,
            created_at: writeResult.createdAt,
            otherUsersOpen: writeResult.otherUsersOpen ?? [],
        }
    }

    // ---------------------------------------------------------------------------
    // REQ-QUO-BE-F-037 — POST /api/quotes/:id/issue-policy
    // Creates a Policy record from the Bound quote. Quote must be Bound.
    // ---------------------------------------------------------------------------
    async issuePolicy(
        quoteId: number,
        orgCode: string,
        createdBy: string | null,
    ): Promise<Record<string, unknown>> {
        const quote = await this.quoteRepo.findOne({ where: { id: quoteId } })
        if (!quote) throw new NotFoundException('Quote not found.')
        if (quote.createdByOrgCode !== orgCode) throw new ForbiddenException('Forbidden.')
        if (quote.status !== 'Bound') {
            throw new BadRequestException('Only Bound quotes can be issued as a policy.')
        }

        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        const prefix = `POL-${orgCode.toUpperCase()}-${datePart}-`
        const row = await this.dataSource.query(
            `SELECT reference FROM policies WHERE reference LIKE $1 ORDER BY reference DESC LIMIT 1`,
            [`${prefix}%`],
        )
        let seq = 1
        if (row.length && row[0].reference) {
            const lastSeq = parseInt(row[0].reference.slice(-3), 10)
            if (!isNaN(lastSeq)) seq = lastSeq + 1
        }
        const reference = `${prefix}${String(seq).padStart(3, '0')}`

        const inserted = await this.dataSource.query(
            `INSERT INTO policies (reference, quote_id, submission_id, insured, insured_id,
                inception_date, expiry_date, status, business_type, contract_type,
                created_by, created_by_org_code, payload)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'Active', $8, $9, $10, $11, $12)
             RETURNING *`,
            [
                reference,
                quoteId,
                quote.submissionId,
                quote.insured,
                quote.insuredId,
                quote.inceptionDate,
                quote.expiryDate,
                quote.businessType,
                quote.contractType,
                createdBy,
                orgCode,
                JSON.stringify(quote.payload ?? {}),
            ],
        )
        return inserted[0]
    }

    // ---------------------------------------------------------------------------
    // REQ-QUO-BE-F-038 — GET /api/quotes/:id/locations
    // Returns location rows associated with the quote (joined from sections).
    // ---------------------------------------------------------------------------
    async getLocations(quoteId: number, orgCode: string): Promise<unknown[]> {
        const quote = await this.quoteRepo.findOne({ where: { id: quoteId } })
        if (!quote) throw new NotFoundException('Quote not found.')
        if (quote.createdByOrgCode !== orgCode) throw new ForbiddenException('Forbidden.')
        return this.dataSource.query(
            `SELECT * FROM quote_location_rows WHERE quote_id = $1 ORDER BY id`,
            [quoteId],
        )
    }

    // ---------------------------------------------------------------------------
    // REQ-QUO-BE-F-041 — GET /api/quotes/:id/sections/:sectionId/coverages
    // ---------------------------------------------------------------------------
    async getCoverages(
        quoteId: number,
        sectionId: number,
        orgCode: string,
    ): Promise<unknown[]> {
        const quote = await this.quoteRepo.findOne({ where: { id: quoteId } })
        if (!quote) throw new NotFoundException('Quote not found.')
        if (quote.createdByOrgCode !== orgCode) throw new ForbiddenException('Forbidden.')
        return this.dataSource.query(
            `SELECT * FROM quote_section_coverages
             WHERE quote_id = $1 AND section_id = $2 AND deleted_at IS NULL
             ORDER BY id`,
            [quoteId, sectionId],
        )
    }

    // ---------------------------------------------------------------------------
    // REQ-QUO-BE-F-042 — POST /api/quotes/:id/sections/:sectionId/coverages
    // ---------------------------------------------------------------------------
    async createCoverage(
        quoteId: number,
        sectionId: number,
        orgCode: string,
        body: Record<string, unknown>,
        createdBy: string | null,
    ): Promise<unknown> {
        const quote = await this.quoteRepo.findOne({ where: { id: quoteId } })
        if (!quote) throw new NotFoundException('Quote not found.')
        if (quote.createdByOrgCode !== orgCode) throw new ForbiddenException('Forbidden.')

        const section = await this.sectionRepo.findOne({ where: { id: sectionId } })
        if (!section) throw new NotFoundException('Section not found.')

        // Count non-deleted coverages for this section to generate NNN
        const [{ count }] = await this.dataSource.query(
            `SELECT COUNT(*) AS count FROM quote_section_coverages
             WHERE section_id = $1 AND deleted_at IS NULL`,
            [sectionId],
        )
        const seq = parseInt(count, 10) + 1
        const reference = `${section.reference}-COV-${String(seq).padStart(3, '0')}`

        const rows = await this.dataSource.query(
            `INSERT INTO quote_section_coverages
                (quote_id, section_id, reference, coverage, class_of_business,
                 effective_date, expiry_date, days_on_cover,
                 limit_currency, limit_amount, limit_loss_qualifier,
                 excess_currency, excess_amount,
                 sum_insured_currency, sum_insured,
                 premium_currency, gross_premium, net_premium, tax_receivable,
                 payload, created_at)
             VALUES
                ($1, $2, $3, $4, $5,
                 $6, $7, $8,
                 $9, $10, $11,
                 $12, $13,
                 $14, $15,
                 $16, $17, $18, $19,
                 $20, NOW())
             RETURNING *`,
            [
                quoteId, sectionId, reference,
                body.coverage ?? null, body.class_of_business ?? null,
                body.effective_date ?? null, body.expiry_date ?? null,
                body.effective_date && body.expiry_date
                    ? Math.max(0, Math.ceil((new Date(body.expiry_date as string).getTime() - new Date(body.effective_date as string).getTime()) / 86400000))
                    : null,
                body.limit_currency ?? null, body.limit_amount ?? null, body.limit_loss_qualifier ?? null,
                body.excess_currency ?? null, body.excess_amount ?? null,
                body.sum_insured_currency ?? null, body.sum_insured ?? null,
                body.premium_currency ?? null, body.gross_premium ?? null,
                body.net_premium ?? null, body.tax_receivable ?? null,
                body.payload ?? {},
            ],
        )
        return rows[0]
    }

    // ---------------------------------------------------------------------------
    // REQ-QUO-BE-F-043 — PUT /api/quotes/:id/sections/:sectionId/coverages/:coverageId
    // ---------------------------------------------------------------------------
    async updateCoverage(
        quoteId: number,
        sectionId: number,
        coverageId: number,
        orgCode: string,
        body: Record<string, unknown>,
        updatedBy: string | null,
    ): Promise<unknown> {
        const quote = await this.quoteRepo.findOne({ where: { id: quoteId } })
        if (!quote) throw new NotFoundException('Quote not found.')
        if (quote.createdByOrgCode !== orgCode) throw new ForbiddenException('Forbidden.')

        const existing = await this.dataSource.query(
            `SELECT * FROM quote_section_coverages
             WHERE id = $1 AND section_id = $2 AND quote_id = $3 AND deleted_at IS NULL`,
            [coverageId, sectionId, quoteId],
        )
        if (!existing.length) throw new NotFoundException('Coverage not found.')

        const mutableFields = [
            'coverage', 'class_of_business', 'effective_date', 'expiry_date',
            'limit_currency', 'limit_amount', 'limit_loss_qualifier',
            'excess_currency', 'excess_amount',
            'sum_insured_currency', 'sum_insured',
            'premium_currency', 'gross_premium', 'net_premium', 'tax_receivable',
            'payload',
        ]

        const setClauses: string[] = []
        const values: unknown[] = []
        let idx = 1

        for (const field of mutableFields) {
            if (field in body) {
                setClauses.push(`${field} = $${idx}`)
                values.push((body as Record<string, unknown>)[field])
                idx++
            }
        }

        // Compute days_on_cover when both dates are present
        const effDate = (body.effective_date ?? existing[0].effective_date) as string | null
        const expDate = (body.expiry_date ?? existing[0].expiry_date) as string | null
        if (effDate && expDate) {
            const doc = Math.max(0, Math.ceil(
                (new Date(expDate).getTime() - new Date(effDate).getTime()) / 86400000,
            ))
            setClauses.push(`days_on_cover = $${idx}`)
            values.push(doc)
            idx++
        }

        if (!setClauses.length) return existing[0]

        values.push(coverageId)
        // TypeORM v0.3 returns [rawRows, rowCount] for UPDATE queries (unlike SELECT/INSERT which return rawRows directly)
        const [updatedRows] = await this.dataSource.query(
            `UPDATE quote_section_coverages SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
            values,
        )
        return updatedRows[0]
    }

    // ---------------------------------------------------------------------------
    // REQ-QUO-BE-F-044 — DELETE /api/quotes/:id/sections/:sectionId/coverages/:coverageId
    // ---------------------------------------------------------------------------
    async deleteCoverage(
        quoteId: number,
        sectionId: number,
        coverageId: number,
        orgCode: string,
        deletedBy: string | null,
    ): Promise<void> {
        const quote = await this.quoteRepo.findOne({ where: { id: quoteId } })
        if (!quote) throw new NotFoundException('Quote not found.')
        if (quote.createdByOrgCode !== orgCode) throw new ForbiddenException('Forbidden.')

        const rows = await this.dataSource.query(
            `UPDATE quote_section_coverages
             SET deleted_at = NOW()
             WHERE id = $1 AND section_id = $2 AND quote_id = $3 AND deleted_at IS NULL
             RETURNING id`,
            [coverageId, sectionId, quoteId],
        )
        if (!rows.length) throw new NotFoundException('Coverage not found.')
    }
}

