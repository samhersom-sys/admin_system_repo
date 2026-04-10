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
        const submissionRows = await this.dataSource.query(
            `SELECT
                 s.id,
                 s.reference,
                 s."submissionType"     AS "submissionType",
                 COALESCE(p.name, s.insured) AS "insuredName",
                 s."placingBroker"      AS "broker",
                 s.status,
                 COALESCE(s.last_opened_date, s."createdDate"::timestamp) AS "lastOpenedDate"
             FROM submission s
             LEFT JOIN party p ON p.id = NULLIF(s."insuredId", '')::integer
             WHERE s."createdByOrgCode" = $1
             ORDER BY COALESCE(s.last_opened_date, s."createdDate"::timestamp) DESC
             LIMIT 25`,
            [orgCode],
        )

        const quoteRows = await this.dataSource.query(
            `SELECT
                 q.id,
                 q.reference,
                 COALESCE(p.name, q.insured) AS "insuredName",
                 q.status,
                 q.business_type AS "submissionType",
                 COALESCE(q.last_opened_date::timestamptz, q.created_date) AS "lastOpenedDate"
             FROM quotes q
             LEFT JOIN party p ON p.id = NULLIF(q.insured_id, '')::integer
             WHERE q.created_by_org_code = $1
               AND q.deleted_at IS NULL
             ORDER BY COALESCE(q.last_opened_date::timestamptz, q.created_date) DESC
             LIMIT 25`,
            [orgCode],
        ).catch(() => [])

        const policyRows = await this.dataSource.query(
            `SELECT
                 policy.id,
                 policy.reference,
                 COALESCE(p.name, policy.insured) AS "insuredName",
                 policy.status,
                 COALESCE(policy.last_opened_date::timestamptz, policy.created_date) AS "lastOpenedDate"
             FROM policies policy
             LEFT JOIN party p ON p.id = NULLIF(policy.insured_id, '')::integer
             WHERE policy.created_by_org_code = $1
               AND policy.deleted_at IS NULL
             ORDER BY COALESCE(policy.last_opened_date::timestamptz, policy.created_date) DESC
             LIMIT 25`,
            [orgCode],
        ).catch(() => [])

        const bindingAuthorityRows = await this.dataSource.query(
            `SELECT
                 ba.id,
                 ba.reference,
                 ba.status,
                 COALESCE(ba.last_opened_date::timestamptz, ba.created_at) AS "lastOpenedDate"
             FROM binding_authorities ba
             WHERE ba.created_by_org_code = $1
               AND ba.deleted_at IS NULL
             ORDER BY COALESCE(ba.last_opened_date::timestamptz, ba.created_at) DESC
             LIMIT 25`,
            [orgCode],
        ).catch(() => [])

        return {
            submissions: submissionRows,
            quotes: quoteRows,
            policies: policyRows,
            bindingAuthorities: bindingAuthorityRows,
        }
    }
}
