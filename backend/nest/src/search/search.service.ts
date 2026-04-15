import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'

const VALID_TYPES = new Set(['Submission', 'Quote', 'Policy', 'Binding Authority', 'Party', 'Claim'])
const DATE_PARAMS = ['inceptionFrom', 'inceptionTo', 'expiryFrom', 'expiryTo', 'lastOpenedFrom', 'lastOpenedTo', 'createdFrom', 'createdTo']

const QUOTE_SEARCH_SELECT = `
    SELECT
        id,
        reference,
        insured,
        status,
    NULL::text AS "yearOfAccount",
        inception_date AS "inceptionDate",
        expiry_date AS "expiryDate",
        created_date AS "createdDate",
        created_by AS "createdBy"
`

const POLICY_SEARCH_SELECT = `
    SELECT
        id,
        reference,
        insured,
        status,
        NULL::text AS "yearOfAccount",
        inception_date AS "inceptionDate",
        expiry_date AS "expiryDate",
        created_date AS "createdDate",
        created_by AS "createdBy"
`

const BINDING_AUTHORITY_SEARCH_SELECT = `
    SELECT
        ba.id,
        ba.reference,
        ba.status,
        s.insured,
        ba.year_of_account AS "yearOfAccount",
        ba.inception_date AS "inceptionDate",
        ba.expiry_date AS "expiryDate",
        ba.created_at AS "createdDate",
        ba.created_by AS "createdBy"
`

const CLAIM_SEARCH_SELECT = `
    SELECT
        c.id,
        c.reference,
        c.status,
        c.created_at AS "createdDate",
        NULL::text AS "createdBy"
`

function isValidDate(str: string | undefined): boolean {
    if (!str) return true
    return !isNaN(Date.parse(str))
}

@Injectable()
export class SearchService {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) { }

    // ---------------------------------------------------------------------------
    // GET /api/search
    // ---------------------------------------------------------------------------
    async search(q: Record<string, string>, userId: number | null, userName: string | null, orgCode: string): Promise<any> {
        // REQ-SEARCH-BE-F-007 â€” validate type(s)
        const requestedTypes: string[] = q['types']
            ? q['types'].split(',').filter(t => VALID_TYPES.has(t))
            : (q['type'] && VALID_TYPES.has(q['type']) ? [q['type']] : [])

        if (q['types'] && requestedTypes.length === 0) {
            throw new BadRequestException(`Invalid types. Each must be one of: ${[...VALID_TYPES].join(', ')}`)
        }
        if (q['type'] && !q['types'] && !VALID_TYPES.has(q['type'])) {
            throw new BadRequestException(`Invalid type. Must be one of: ${[...VALID_TYPES].join(', ')}`)
        }

        // REQ-SEARCH-BE-F-009 â€” validate date params
        for (const dp of DATE_PARAMS) {
            if (q[dp] && !isValidDate(q[dp])) {
                throw new BadRequestException(`Invalid date value for ${dp}: "${q[dp]}"`)
            }
        }

        const hasFilters = Boolean(
            requestedTypes.length > 0 || q['reference'] || q['status'] || q['insured'] || q['broker'] ||
            q['yearOfAccount'] || q['inceptionFrom'] || q['inceptionTo'] || q['expiryFrom'] || q['expiryTo'] ||
            q['lastOpenedFrom'] || q['lastOpenedTo'] || q['createdFrom'] || q['createdTo'] || q['createdBy'],
        )

        if (!hasFilters) {
            return this.defaultMode(orgCode, userId, userName)
        } else {
            return this.filterMode(q, orgCode, requestedTypes)
        }
    }

    // ---------------------------------------------------------------------------
    // Default mode â€” most recently opened by this user, or most recently created
    // ---------------------------------------------------------------------------
    private async defaultMode(orgCode: string, userId: number | null, userName: string | null): Promise<any> {
        let auditRows: any[] = []
        if (userId || userName) {
            const auditSql = userId
                ? `SELECT ae.entity_type, ae.entity_id, MAX(ae.created_at) AS last_opened
                   FROM public.audit_event ae
                   WHERE (ae.action ILIKE '%Opened%' OR ae.action ILIKE '%Updated%')
                     AND (ae.user_id = $1 OR (ae.user_id IS NULL AND ae.user_name = $2))
                   GROUP BY ae.entity_type, ae.entity_id
                   ORDER BY last_opened DESC
                   LIMIT 90`
                : `SELECT ae.entity_type, ae.entity_id, MAX(ae.created_at) AS last_opened
                   FROM public.audit_event ae
                   WHERE (ae.action ILIKE '%Opened%' OR ae.action ILIKE '%Updated%')
                     AND ae.user_name = $1
                   GROUP BY ae.entity_type, ae.entity_id
                   ORDER BY last_opened DESC
                   LIMIT 90`
            const auditParams = userId ? [userId, userName] : [userName]
            auditRows = await this.dataSource.query(auditSql, auditParams)
        }

        // Group audit rows by type
        const auditByType: Record<string, Array<{ id: any; lastOpenedDate: any }>> = {}
        for (const row of auditRows) {
            if (!auditByType[row.entity_type]) auditByType[row.entity_type] = []
            auditByType[row.entity_type].push({ id: row.entity_id, lastOpenedDate: row.last_opened })
        }

        const result: any = { submissions: [], quotes: [], policies: [], bindingAuthorities: [], parties: [], claims: [] }

        // Submissions
        const subAudit = (auditByType['Submission'] || []).slice(0, 15)
        if (subAudit.length > 0) {
            const ids = subAudit.map(a => a.id)
            const rows = await this.dataSource.query(
                `SELECT id, reference, insured, status, "inceptionDate", "expiryDate", "createdDate", "createdBy"
                 FROM submission WHERE id = ANY($1) AND "createdByOrgCode" = $2`,
                [ids, orgCode],
            )
            const lastOpenedMap = Object.fromEntries(subAudit.map(a => [a.id, a.lastOpenedDate]))
            result.submissions = rows.map((r: any) => ({ ...r, lastOpenedDate: lastOpenedMap[r.id] ?? null }))
        } else {
            const rows = await this.dataSource.query(
                `SELECT id, reference, insured, status, "inceptionDate", "expiryDate", "createdDate", "createdBy"
                 FROM submission WHERE "createdByOrgCode" = $1 ORDER BY "createdDate" DESC LIMIT 15`,
                [orgCode],
            )
            result.submissions = rows.map((r: any) => ({ ...r, lastOpenedDate: null }))
        }

        // Parties
        const partyAudit = (auditByType['Party'] || []).slice(0, 15)
        if (partyAudit.length > 0) {
            const ids = partyAudit.map(a => a.id)
            const rows = await this.dataSource.query(
                `SELECT id, name, role FROM party WHERE id = ANY($1) AND "orgCode" = $2`,
                [ids, orgCode],
            )
            const lastOpenedMap = Object.fromEntries(partyAudit.map(a => [a.id, a.lastOpenedDate]))
            result.parties = rows.map((r: any) => ({ ...r, lastOpenedDate: lastOpenedMap[r.id] ?? null }))
        } else {
            const rows = await this.dataSource.query(
                `SELECT id, name, role FROM party WHERE "orgCode" = $1 ORDER BY "createdDate" DESC LIMIT 15`,
                [orgCode],
            )
            result.parties = rows.map((r: any) => ({ ...r, lastOpenedDate: null }))
        }

        result.quotes = await this.fetchWithAuditOrFallback(
            auditByType['Quote'],
            (ids) => this.dataSource.query(
                `${QUOTE_SEARCH_SELECT}
                 FROM quotes
                 WHERE id = ANY($1) AND created_by_org_code = $2 AND deleted_at IS NULL`,
                [ids, orgCode],
            ),
            () => this.dataSource.query(
                `${QUOTE_SEARCH_SELECT}
                 FROM quotes
                 WHERE created_by_org_code = $1 AND deleted_at IS NULL
                 ORDER BY created_date DESC
                 LIMIT 15`,
                [orgCode],
            ),
        )

        result.policies = await this.fetchWithAuditOrFallback(
            auditByType['Policy'],
            (ids) => this.dataSource.query(
                `${POLICY_SEARCH_SELECT}
                 FROM policies
                 WHERE id = ANY($1) AND created_by_org_code = $2`,
                [ids, orgCode],
            ),
            () => this.dataSource.query(
                `${POLICY_SEARCH_SELECT}
                 FROM policies
                 WHERE created_by_org_code = $1
                 ORDER BY created_date DESC
                 LIMIT 15`,
                [orgCode],
            ),
        )

        result.bindingAuthorities = await this.fetchWithAuditOrFallback(
            auditByType['Binding Authority'],
            (ids) => this.dataSource.query(
                `${BINDING_AUTHORITY_SEARCH_SELECT}
                 FROM binding_authorities ba
                 LEFT JOIN submission s ON s.id = ba.submission_id
                 WHERE ba.id = ANY($1) AND ba.created_by_org_code = $2`,
                [ids, orgCode],
            ),
            () => this.dataSource.query(
                `${BINDING_AUTHORITY_SEARCH_SELECT}
                 FROM binding_authorities ba
                 LEFT JOIN submission s ON s.id = ba.submission_id
                 WHERE ba.created_by_org_code = $1
                 ORDER BY ba.created_at DESC
                 LIMIT 15`,
                [orgCode],
            ),
        )

        result.claims = await this.fetchWithAuditOrFallback(
            auditByType['Claim'],
            (ids) => this.dataSource.query(
                `${CLAIM_SEARCH_SELECT}
                 FROM claims c
                 INNER JOIN policies p ON p.id = c.policy_id
                 WHERE c.id = ANY($1) AND p.created_by_org_code = $2`,
                [ids, orgCode],
            ),
            () => this.dataSource.query(
                `${CLAIM_SEARCH_SELECT}
                 FROM claims c
                 INNER JOIN policies p ON p.id = c.policy_id
                 WHERE p.created_by_org_code = $1
                 ORDER BY c.created_at DESC
                 LIMIT 15`,
                [orgCode],
            ),
        )

        return result
    }

    private async fetchWithAuditOrFallback(
        auditEntries: Array<{ id: any; lastOpenedDate: any }> | undefined,
        fetchByIds: (ids: any[]) => Promise<any[]>,
        fetchFallback: () => Promise<any[]>,
    ): Promise<any[]> {
        const entries = (auditEntries || []).slice(0, 15)
        try {
            if (entries.length > 0) {
                const ids = entries.map(a => a.id)
                const lastOpenedMap = Object.fromEntries(entries.map(a => [a.id, a.lastOpenedDate]))
                const rows = await fetchByIds(ids)
                return rows.map((r: any) => ({ ...r, lastOpenedDate: lastOpenedMap[r.id] ?? null }))
            } else {
                const rows = await fetchFallback()
                return rows.map((r: any) => ({ ...r, lastOpenedDate: null }))
            }
        } catch {
            return []
        }
    }

    // ---------------------------------------------------------------------------
    // Filter mode â€” ILIKE queries on all (or selected) entity tables
    // ---------------------------------------------------------------------------
    private async filterMode(q: Record<string, string>, orgCode: string, requestedTypes: string[]): Promise<any> {
        const result: any = { submissions: [], quotes: [], policies: [], bindingAuthorities: [], parties: [], claims: [] }

        const runForType = async (type: string, queryFn: () => Promise<any[]>) => {
            if (requestedTypes.length > 0 && !requestedTypes.includes(type)) return []
            try { return await queryFn() } catch { return [] }
        }

        const buildClause = (baseParams: any[], fields: Record<string, boolean | string>) => {
            const columnName = (fieldKey: string, fallback: string): string | null => {
                const configured = fields[fieldKey]
                if (!configured) return null
                return configured === true ? fallback : configured
            }

            const clauses: string[] = []
            const params = [...baseParams]

            const referenceColumn = columnName('reference', 'reference')
            const statusColumn = columnName('status', 'status')
            const insuredColumn = columnName('insured', 'insured')
            const brokerColumn = columnName('broker', '"placingBroker"')
            const yearOfAccountColumn = columnName('yearOfAccount', '"yearOfAccount"')
            const inceptionDateColumn = columnName('inceptionDate', '"inceptionDate"')
            const expiryDateColumn = columnName('expiryDate', '"expiryDate"')
            const createdDateColumn = columnName('createdDate', '"createdDate"')
            const createdByColumn = columnName('createdBy', '"createdBy"')

            if (referenceColumn && q['reference']) { params.push(`%${q['reference']}%`); clauses.push(`LOWER(${referenceColumn}) LIKE LOWER($${params.length})`) }
            if (statusColumn && q['status']) { params.push(`%${q['status']}%`); clauses.push(`LOWER(${statusColumn}) LIKE LOWER($${params.length})`) }
            if (insuredColumn && q['insured']) { params.push(`%${q['insured']}%`); clauses.push(`LOWER(${insuredColumn}) LIKE LOWER($${params.length})`) }
            if (brokerColumn && q['broker']) { params.push(`%${q['broker']}%`); clauses.push(`LOWER(${brokerColumn}) LIKE LOWER($${params.length})`) }
            if (yearOfAccountColumn && q['yearOfAccount']) { params.push(q['yearOfAccount']); clauses.push(`${yearOfAccountColumn} = $${params.length}`) }
            if (inceptionDateColumn) {
                if (q['inceptionFrom']) { params.push(q['inceptionFrom']); clauses.push(`${inceptionDateColumn} >= $${params.length}`) }
                if (q['inceptionTo']) { params.push(q['inceptionTo']); clauses.push(`${inceptionDateColumn} <= $${params.length}`) }
            }
            if (expiryDateColumn) {
                if (q['expiryFrom']) { params.push(q['expiryFrom']); clauses.push(`${expiryDateColumn} >= $${params.length}`) }
                if (q['expiryTo']) { params.push(q['expiryTo']); clauses.push(`${expiryDateColumn} <= $${params.length}`) }
            }
            if (createdDateColumn) {
                if (q['createdFrom']) { params.push(q['createdFrom']); clauses.push(`${createdDateColumn} >= $${params.length}`) }
                if (q['createdTo']) { params.push(q['createdTo']); clauses.push(`${createdDateColumn} <= $${params.length}`) }
            }
            if (createdByColumn && q['createdBy']) { params.push(`%${q['createdBy']}%`); clauses.push(`LOWER(${createdByColumn}) LIKE LOWER($${params.length})`) }

            return { where: clauses.length ? ` AND ${clauses.join(' AND ')}` : '', params }
        }

        const filterByLastOpened = (rows: any[]): any[] => {
            if (!q['lastOpenedFrom'] && !q['lastOpenedTo']) return rows
            return rows.filter(r => {
                if (!r.lastOpenedDate) return false
                const d = new Date(r.lastOpenedDate)
                if (q['lastOpenedFrom'] && d < new Date(q['lastOpenedFrom'])) return false
                if (q['lastOpenedTo'] && d > new Date(q['lastOpenedTo'] + 'T23:59:59Z')) return false
                return true
            })
        }

        const allFields = { reference: true, status: true, insured: true, broker: true, yearOfAccount: true, inceptionDate: true, expiryDate: true, createdDate: true, createdBy: true }

        result.submissions = await runForType('Submission', async () => {
            const { where, params } = buildClause([orgCode], allFields)
            const rows = await this.dataSource.query(
                `SELECT id, reference, insured, status, "inceptionDate", "expiryDate", "createdDate", "createdBy"
                 FROM submission WHERE "createdByOrgCode" = $1${where} ORDER BY "createdDate" DESC LIMIT 200`,
                params,
            )
            return filterByLastOpened(await this.attachLastOpened(rows, 'Submission'))
        })

        result.parties = await runForType('Party', async () => {
            const params: any[] = [orgCode]
            const clauses: string[] = []

            if (q['insured'] && q['broker']) {
                params.push(`%${q['insured']}%`); const insIdx = params.length
                params.push(`%${q['broker']}%`); const brkIdx = params.length
                clauses.push(`((LOWER(name) LIKE LOWER($${insIdx}) AND role != 'Broker') OR (LOWER(name) LIKE LOWER($${brkIdx}) AND role = 'Broker'))`)
            } else if (q['insured']) {
                params.push(`%${q['insured']}%`)
                clauses.push(`(LOWER(name) LIKE LOWER($${params.length}) AND role != 'Broker')`)
            } else if (q['broker']) {
                params.push(`%${q['broker']}%`)
                clauses.push(`(LOWER(name) LIKE LOWER($${params.length}) AND role = 'Broker')`)
            }
            if (q['reference']) { params.push(`%${q['reference']}%`); clauses.push(`LOWER(name) LIKE LOWER($${params.length})`) }
            if (q['createdFrom']) { params.push(q['createdFrom']); clauses.push(`"createdDate" >= $${params.length}`) }
            if (q['createdTo']) { params.push(q['createdTo']); clauses.push(`"createdDate" <= $${params.length}`) }
            if (q['createdBy']) { params.push(`%${q['createdBy']}%`); clauses.push(`LOWER("createdBy") LIKE LOWER($${params.length})`) }

            const where = clauses.length ? ` AND ${clauses.join(' AND ')}` : ''
            const rows = await this.dataSource.query(
                `SELECT id, name, role, "createdDate", "createdBy" FROM party WHERE "orgCode" = $1${where} ORDER BY "createdDate" DESC LIMIT 200`,
                params,
            )
            return filterByLastOpened(await this.attachLastOpened(rows, 'Party'))
        })

        result.quotes = await runForType('Quote', async () => {
            const { where, params } = buildClause([orgCode], {
                reference: true,
                status: true,
                insured: true,
                inceptionDate: 'inception_date',
                expiryDate: 'expiry_date',
                createdDate: 'created_date',
                createdBy: 'created_by',
            })
            const rows = await this.dataSource.query(
                `${QUOTE_SEARCH_SELECT}
                 FROM quotes
                 WHERE created_by_org_code = $1 AND deleted_at IS NULL${where}
                 ORDER BY created_date DESC
                 LIMIT 200`,
                params,
            ).catch(() => [])
            return filterByLastOpened(await this.attachLastOpened(rows, 'Quote'))
        })

        result.policies = await runForType('Policy', async () => {
            const { where, params } = buildClause([orgCode], {
                reference: true,
                status: true,
                insured: true,
                broker: 'placing_broker',
                inceptionDate: 'inception_date',
                expiryDate: 'expiry_date',
                createdDate: 'created_date',
                createdBy: 'created_by',
            })
            const rows = await this.dataSource.query(
                `${POLICY_SEARCH_SELECT}
                 FROM policies
                 WHERE created_by_org_code = $1${where}
                 ORDER BY created_date DESC
                 LIMIT 200`,
                params,
            ).catch(() => [])
            return filterByLastOpened(await this.attachLastOpened(rows, 'Policy'))
        })

        result.bindingAuthorities = await runForType('Binding Authority', async () => {
            const { where, params } = buildClause([orgCode], {
                reference: 'ba.reference',
                status: 'ba.status',
                yearOfAccount: 'ba.year_of_account',
                inceptionDate: 'ba.inception_date',
                expiryDate: 'ba.expiry_date',
                createdDate: 'ba.created_at',
                createdBy: 'ba.created_by',
            })
            const rows = await this.dataSource.query(
                `${BINDING_AUTHORITY_SEARCH_SELECT}
                 FROM binding_authorities ba
                 LEFT JOIN submission s ON s.id = ba.submission_id
                 WHERE ba.created_by_org_code = $1${where}
                 ORDER BY ba.created_at DESC
                 LIMIT 200`,
                params,
            ).catch(() => [])
            return filterByLastOpened(await this.attachLastOpened(rows, 'Binding Authority'))
        })

        result.claims = await runForType('Claim', async () => {
            const { where, params } = buildClause([orgCode], {
                reference: 'c.reference',
                status: 'c.status',
                createdDate: 'c.created_at',
            })
            const rows = await this.dataSource.query(
                `${CLAIM_SEARCH_SELECT}
                 FROM claims c
                 INNER JOIN policies p ON p.id = c.policy_id
                 WHERE p.created_by_org_code = $1${where}
                 ORDER BY c.created_at DESC
                 LIMIT 200`,
                params,
            ).catch(() => [])
            return filterByLastOpened(await this.attachLastOpened(rows, 'Claim'))
        })

        return result
    }

    // Attach lastOpenedDate from audit_event to a batch of entity rows
    // REQ-SEARCH-BE-F-010
    private async attachLastOpened(rows: any[], entityType: string): Promise<any[]> {
        if (!rows.length) return rows
        const ids = rows.map(r => r.id)
        try {
            const auditRows = await this.dataSource.query(
                `SELECT entity_id, MAX(created_at) AS last_opened
                 FROM public.audit_event
                 WHERE entity_type = $1 AND entity_id = ANY($2)
                   AND (action ILIKE '%Opened%' OR action ILIKE '%Updated%')
                 GROUP BY entity_id`,
                [entityType, ids],
            )
            const map = Object.fromEntries(auditRows.map((a: any) => [a.entity_id, a.last_opened]))
            return rows.map(r => ({ ...r, lastOpenedDate: (map as any)[r.id] ?? null }))
        } catch {
            return rows.map(r => ({ ...r, lastOpenedDate: null }))
        }
    }
}
