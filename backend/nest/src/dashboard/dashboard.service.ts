import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'

@Injectable()
export class DashboardService {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    // REQ-DASH-STUB-F-001 through F-006, F-007, F-009 â€” static stubs
    getQuotes() { return [] }
    getPolicies() { return [] }
    getPoliciesGwpMonthly() { return { series: [] } }
    getPoliciesGwpCumulative() { return { series: [] } }
    getPoliciesGwpSummary() { return { orgTotal: 0, userTotal: 0 } }
    getBindingAuthorities() { return [] }
    getNotifications() { return [] }
    getTasks() { return [] }

    // REQ-DASH-STUB-F-008 â€” real submissions + empty stubs for other types
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
             ORDER BY s."createdDate" DESC
             LIMIT 25`,
            [orgCode],
        )

        const quoteRows = await this.dataSource.query(
            `SELECT
                 q.id,
                 q.reference,
                 COALESCE(p.name, q.insured) AS "insuredName",
                 q.status,
                 COALESCE(q.last_opened_date::timestamptz, q.created_date) AS "lastOpenedDate"
             FROM quotes q
             LEFT JOIN party p ON p.id = NULLIF(q.insured_id, '')::integer
             WHERE q.created_by_org_code = $1
             ORDER BY q.created_date DESC
             LIMIT 25`,
            [orgCode],
        ).catch(() => [])

        return {
            submissions: submissionRows,
            quotes: quoteRows,
            policies: [],
            bindingAuthorities: [],
        }
    }
}
