import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'

@Injectable()
export class DashboardService {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) { }

    // REQ-DASH-STUB-F-001, F-002, F-006, F-007, F-009 — static stubs
    getQuotes() { return [] }
    getPolicies() { return [] }
    getBindingAuthorities() { return [] }
    getNotifications() { return [] }
    getTasks() { return [] }

    // REQ-DASH-STUB-F-003 — Monthly GWP grouped by year-of-account
    async getPoliciesGwpMonthly(orgCode: string): Promise<{ series: any[] }> {
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

    // REQ-DASH-STUB-F-004 — Cumulative GWP grouped by year-of-account
    async getPoliciesGwpCumulative(orgCode: string): Promise<{ series: any[] }> {
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

    // REQ-DASH-STUB-F-005 — GWP totals (org + current user)
    async getPoliciesGwpSummary(orgCode: string, username: string): Promise<{ orgTotal: number; userTotal: number }> {
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

    // REQ-DASH-STUB-F-008 — org-scoped recent records across dashboard entity types
    async getRecentRecords(orgCode: string): Promise<any> {
        const auditRows = await this.dataSource.query(
            `SELECT ae.entity_type, ae.entity_id, MAX(ae.created_at) AS last_opened
             FROM public.audit_event ae
             WHERE ae.entity_type IN ('Submission', 'Quote', 'Policy', 'BindingAuthority')
               AND (ae.action ILIKE '%Opened%' OR ae.action ILIKE '%Updated%')
             GROUP BY ae.entity_type, ae.entity_id
             ORDER BY last_opened DESC
             LIMIT 120`,
        ).catch(() => [])

        const auditByType: Record<string, Array<{ id: number; lastOpenedDate: string }>> = {}
        for (const row of auditRows) {
            if (!auditByType[row.entity_type]) auditByType[row.entity_type] = []
            auditByType[row.entity_type].push({ id: Number(row.entity_id), lastOpenedDate: row.last_opened })
        }

        const submissionRows = await this.fetchWithAuditOrFallback(
            auditByType['Submission'],
            (ids) => this.dataSource.query(
                `SELECT
                     s.id,
                     s.reference,
                     s."submissionType"     AS "submissionType",
                     COALESCE(p.name, s.insured) AS "insuredName",
                     s."placingBroker"      AS "broker",
                     s.status,
                     s."createdDate"::timestamp AS "createdDate"
                 FROM submission s
                 LEFT JOIN party p ON p.id = NULLIF(s."insuredId", '')::integer
                 WHERE s.id = ANY($1)
                   AND s."createdByOrgCode" = $2`,
                [ids, orgCode],
            ),
            () => this.dataSource.query(
            `SELECT
                 s.id,
                 s.reference,
                 s."submissionType"     AS "submissionType",
                 COALESCE(p.name, s.insured) AS "insuredName",
                 s."placingBroker"      AS "broker",
                 s.status,
                 s."createdDate"::timestamp AS "createdDate"
             FROM submission s
             LEFT JOIN party p ON p.id = NULLIF(s."insuredId", '')::integer
             WHERE s."createdByOrgCode" = $1
             ORDER BY s."createdDate" DESC
             LIMIT 25`,
            [orgCode],
            ),
        ).catch(() => [])

        const quoteRows = await this.fetchWithAuditOrFallback(
            auditByType['Quote'],
            (ids) => this.dataSource.query(
                `SELECT
                     q.id,
                     q.reference,
                     COALESCE(p.name, q.insured) AS "insuredName",
                     q.status,
                     q.business_type AS "submissionType",
                     q.created_date AS "createdDate"
                 FROM quotes q
                 LEFT JOIN party p ON p.id = NULLIF(q.insured_id, '')::integer
                 WHERE q.id = ANY($1)
                   AND q.created_by_org_code = $2
                   AND q.deleted_at IS NULL`,
                [ids, orgCode],
            ),
            () => this.dataSource.query(
            `SELECT
                 q.id,
                 q.reference,
                 COALESCE(p.name, q.insured) AS "insuredName",
                 q.status,
                 q.business_type AS "submissionType",
                 q.created_date AS "createdDate"
             FROM quotes q
             LEFT JOIN party p ON p.id = NULLIF(q.insured_id, '')::integer
             WHERE q.created_by_org_code = $1
               AND q.deleted_at IS NULL
             ORDER BY q.created_date DESC
             LIMIT 25`,
            [orgCode],
            ),
        ).catch(() => [])

        const policyRows = await this.fetchWithAuditOrFallback(
            auditByType['Policy'],
            (ids) => this.dataSource.query(
                `SELECT
                     policy.id,
                     policy.reference,
                     COALESCE(p.name, policy.insured) AS "insuredName",
                     policy.status,
                     policy.created_date AS "createdDate"
                 FROM policies policy
                 LEFT JOIN party p ON p.id = NULLIF(policy.insured_id, '')::integer
                 WHERE policy.id = ANY($1)
                   AND policy.created_by_org_code = $2
                   AND policy.deleted_at IS NULL`,
                [ids, orgCode],
            ),
            () => this.dataSource.query(
            `SELECT
                 policy.id,
                 policy.reference,
                 COALESCE(p.name, policy.insured) AS "insuredName",
                 policy.status,
                 policy.created_date AS "createdDate"
             FROM policies policy
             LEFT JOIN party p ON p.id = NULLIF(policy.insured_id, '')::integer
             WHERE policy.created_by_org_code = $1
               AND policy.deleted_at IS NULL
             ORDER BY policy.created_date DESC
             LIMIT 25`,
            [orgCode],
            ),
        ).catch(() => [])

        const bindingAuthorityRows = await this.fetchWithAuditOrFallback(
            auditByType['BindingAuthority'],
            (ids) => this.dataSource.query(
                `SELECT
                     ba.id,
                     ba.reference,
                     ba.status,
                     ba.created_at AS "createdDate"
                 FROM binding_authorities ba
                 WHERE ba.id = ANY($1)
                   AND ba.created_by_org_code = $2
                   AND ba.deleted_at IS NULL`,
                [ids, orgCode],
            ),
            () => this.dataSource.query(
            `SELECT
                 ba.id,
                 ba.reference,
                 ba.status,
                 ba.created_at AS "createdDate"
             FROM binding_authorities ba
             WHERE ba.created_by_org_code = $1
               AND ba.deleted_at IS NULL
             ORDER BY ba.created_at DESC
             LIMIT 25`,
            [orgCode],
            ),
        ).catch(() => [])

        return {
            submissions: submissionRows,
            quotes: quoteRows,
            policies: policyRows,
            bindingAuthorities: bindingAuthorityRows,
        }
    }

    private async fetchWithAuditOrFallback(
        auditEntries: Array<{ id: number; lastOpenedDate: string }> | undefined,
        fetchByIds: (ids: number[]) => Promise<any[]>,
        fetchFallback: () => Promise<any[]>,
    ): Promise<any[]> {
        const entries = Array.isArray(auditEntries) ? auditEntries.slice(0, 25) : []

        if (entries.length > 0) {
            const ids = entries.map((entry) => entry.id)
            const rows = await fetchByIds(ids)
            const rowMap = new Map(rows.map((row) => [Number(row.id), row]))

            return entries
                .map((entry) => {
                    const row = rowMap.get(entry.id)
                    if (!row) return null
                    return { ...row, lastOpenedDate: entry.lastOpenedDate }
                })
                .filter(Boolean)
        }

        const fallbackRows = await fetchFallback()
        return fallbackRows.map((row) => ({ ...row, lastOpenedDate: row.createdDate ?? null }))
    }
}
