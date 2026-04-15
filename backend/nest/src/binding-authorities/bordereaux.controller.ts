import {
    Controller,
    Post,
    Body,
    Req,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

/**
 * BordereauxController — POST /api/bordereaux/import
 *
 * Accepts normalised rows from the BordereauImportModal wizard and performs
 * find-or-create persistence for: policies → policy_sections → policy_section_coverages
 * and inserts policy_transactions audit records.
 *
 * REQ-BA-BE-F-008
 */
@Controller('bordereaux')
@UseGuards(JwtAuthGuard)
export class BordereauxController {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    @Post('import')
    @HttpCode(HttpStatus.OK)
    async importBordereaux(@Req() req: any, @Body() body: any) {
        const orgCode: string = req.user?.orgCode ?? null
        const createdBy: string | null = req.user?.name ?? req.user?.username ?? null

        const type: string = typeof body.type === 'string' ? body.type : 'Transactional'
        const rows: any[] = Array.isArray(body.rows) ? body.rows : []

        let createdPolicies = 0
        let createdSections = 0
        let createdCoverages = 0
        let createdTransactions = 0

        for (const r of rows) {
            const p = r?.policy ?? {}
            const pref = String(p.reference ?? p.policyReference ?? '').trim()
            if (!pref) continue

            // ── 1) Policy: find-or-create by reference, scoped to org ──
            let policyId: number | null = null
            const foundPolicy = await this.dataSource.query(
                `SELECT id FROM policies WHERE LOWER(reference) = LOWER($1) AND created_by_org_code = $2 LIMIT 1`,
                [pref, orgCode],
            )
            if (foundPolicy.length) {
                policyId = foundPolicy[0].id
            } else {
                const inserted = await this.dataSource.query(
                    `INSERT INTO policies (reference, insured, inception_date, expiry_date, created_by_org_code, created_by, status)
                     VALUES ($1, $2, $3, $4, $5, $6, 'Active')
                     RETURNING id`,
                    [pref, p.insuredName ?? null, p.inceptionDate ?? null, p.expiryDate ?? null, orgCode, createdBy],
                )
                policyId = inserted[0]?.id ?? null
                if (policyId) createdPolicies++
            }
            if (!policyId) continue

            // ── 2) Section: find-or-create ──
            const s = r?.section ?? {}
            const sref = String(s.reference ?? '').trim()
            let sectionId: number | null = null
            if (sref) {
                const foundSection = await this.dataSource.query(
                    `SELECT id FROM policy_sections WHERE policy_id = $1 AND LOWER(reference) = LOWER($2) LIMIT 1`,
                    [policyId, sref],
                )
                if (foundSection.length) {
                    sectionId = foundSection[0].id
                } else {
                    const insSection = await this.dataSource.query(
                        `INSERT INTO policy_sections (policy_id, reference, class_of_business, inception_date, effective_date, expiry_date, premium_currency, gross_premium)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                         RETURNING id`,
                        [
                            policyId,
                            sref,
                            s.classOfBusiness ?? null,
                            s.inceptionDate ?? null,
                            s.effectiveDate ?? s.inceptionDate ?? null,
                            s.expiryDate ?? null,
                            s.premiumCurrency ?? null,
                            s.grossPremium ? parseFloat(s.grossPremium) || null : null,
                        ],
                    )
                    sectionId = insSection[0]?.id ?? null
                    if (sectionId) createdSections++
                }
            }

            // ── 3) Coverage: find-or-create ──
            const c = r?.coverage ?? {}
            const cref = String(c.reference ?? '').trim()
            if (sectionId && cref) {
                const foundCoverage = await this.dataSource.query(
                    `SELECT id FROM policy_section_coverages WHERE section_id = $1 AND LOWER(reference) = LOWER($2) LIMIT 1`,
                    [sectionId, cref],
                )
                if (!foundCoverage.length) {
                    await this.dataSource.query(
                        `INSERT INTO policy_section_coverages
                           (policy_id, section_id, reference, limit_currency, limit_amount, premium_currency, gross_premium)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [
                            policyId,
                            sectionId,
                            cref,
                            c.limitCurrency ?? null,
                            c.limitAmount ? parseFloat(c.limitAmount) || null : null,
                            s.premiumCurrency ?? null,
                            s.grossPremium ? parseFloat(s.grossPremium) || null : null,
                        ],
                    )
                    createdCoverages++
                }
            }

            // ── 4) Policy Transaction ──
            const t = r?.policyTransaction ?? {}
            const txType = String(t.transactionType ?? '').trim()
            if (txType) {
                await this.dataSource.query(
                    `INSERT INTO policy_transactions (policy_id, transaction_type, effective_date, created_by, payload)
                     VALUES ($1, $2, $3, $4, '{}'::jsonb)`,
                    [policyId, txType, t.effectiveDate ?? null, createdBy],
                )
                createdTransactions++
            }
        }

        return {
            success: true,
            type,
            received: rows.length,
            createdPolicies,
            createdSections,
            createdCoverages,
            createdTransactions,
        }
    }
}
