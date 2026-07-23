import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { DATA_SOURCES } from '../reporting/field-mappings'
import { MeasuresService } from '../measures/measures.service'

export interface KpiSummary {
    submissions: { org: number; user: number }
    quotes: { org: number; user: number }
    policies: { org: number; user: number }
    bindingAuthorities: { org: number }
    gwp: { org: number; user: number }
}

/**
 * Column used to scope counts to the requesting user within each source table.
 * This is an internal implementation detail of HomeService — not part of the
 * semantic layer, because user-scope is a home-specific concern rather than
 * a measure definition concern.
 */
const USER_COL: Record<string, string> = {
    submissions: '"createdBy"',
    quotes: 'created_by',
    policies: 'created_by',
}

@Injectable()
export class HomeService {
    constructor(
        @InjectDataSource() private readonly dataSource: DataSource,
        private readonly measuresService: MeasuresService,
    ) { }

    /**
     * REQ-HOME-F-019 / REQ-HOME-F-020
     *
     * Returns org-scoped and user-scoped KPI counts for the homepage.
     *
     * Count predicates for the policies domain are resolved from DATA_SOURCES in
     * field-mappings.ts (the measure semantic layer), not hardcoded here.
     * This means any change to the countActive filterExpr in field-mappings.ts
     * is automatically applied to the home screen KPI counts.
     */
    async getKpiSummary(orgCode: string, username: string): Promise<KpiSummary> {
        const subSrc = DATA_SOURCES.submissions
        const qtSrc = DATA_SOURCES.quotes
        const polSrc = DATA_SOURCES.policies
        const baSrc = DATA_SOURCES.bindingAuthorities

        // REQ-HOME-F-019 — resolve countActive measure from DB (measure_definitions is the source of truth)
        // REQ-HOME-F-019b — if measure_definitions table is missing (schema lag), fall back to COUNT(*)
        let countActiveMeasure = null
        try {
            countActiveMeasure = await this.measuresService.findBySourceAndKey('policies', 'countActive', orgCode)
        } catch {
            // measure_definitions table not yet created — migration pending; fall back to COUNT(*)
        }
        const activeFilter = countActiveMeasure
            ? this.measuresService.getEffectiveFilterExpr(countActiveMeasure)
            : null
        const activeSqlOrg = activeFilter
            ? `SUM(CASE WHEN ${activeFilter} THEN 1 ELSE 0 END)`
            : 'COUNT(*)'
        const activeSqlUser = activeFilter
            ? `SUM(CASE WHEN ${activeFilter} AND ${USER_COL.policies} = $2 THEN 1 ELSE 0 END)`
            : `SUM(CASE WHEN ${USER_COL.policies} = $2 THEN 1 ELSE 0 END)`

        const [subRow, qtRow, polRow, baRow] = await Promise.all([
            this.dataSource.query(
                `SELECT
                    COUNT(*) AS org_count,
                    SUM(CASE WHEN ${USER_COL.submissions} = $2 THEN 1 ELSE 0 END) AS user_count
                 FROM ${subSrc.table}
                 WHERE ${subSrc.orgCol} = $1`,
                [orgCode, username],
            ).then(rows => rows[0]),

            this.dataSource.query(
                `SELECT
                    COUNT(*) AS org_count,
                    SUM(CASE WHEN ${USER_COL.quotes} = $2 THEN 1 ELSE 0 END) AS user_count
                 FROM ${qtSrc.table}
                 WHERE ${qtSrc.orgCol} = $1`,
                [orgCode, username],
            ).then(rows => rows[0]),

            this.dataSource.query(
                `SELECT
                    ${activeSqlOrg} AS org_count,
                    ${activeSqlUser} AS user_count,
                    COALESCE(SUM(gross_written_premium), 0) AS gwp_org,
                    COALESCE(SUM(CASE WHEN ${USER_COL.policies} = $2 THEN gross_written_premium ELSE 0 END), 0) AS gwp_user
                 FROM ${polSrc.table}
                 WHERE ${polSrc.orgCol} = $1`,
                [orgCode, username],
            ).then(rows => rows[0]),

            this.dataSource.query(
                `SELECT COUNT(*) AS org_count
                 FROM ${baSrc.table}
                 WHERE ${baSrc.orgCol} = $1`,
                [orgCode],
            ).then(rows => rows[0]),
        ])

        return {
            submissions: { org: Number(subRow?.org_count ?? 0), user: Number(subRow?.user_count ?? 0) },
            quotes: { org: Number(qtRow?.org_count ?? 0), user: Number(qtRow?.user_count ?? 0) },
            policies: { org: Number(polRow?.org_count ?? 0), user: Number(polRow?.user_count ?? 0) },
            bindingAuthorities: { org: Number(baRow?.org_count ?? 0) },
            gwp: { org: Number(polRow?.gwp_org ?? 0), user: Number(polRow?.gwp_user ?? 0) },
        }
    }
}
