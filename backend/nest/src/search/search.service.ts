import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { logError } from '../shared/log-error'

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
    async search(q: Record<string, string>, orgCode: string): Promise<any> {
        // REQ-SEARCH-BE-F-007 â€” validate type(s)
        const requestedTypes: string[] = q['types']
            ? q['types'].split(',').filter(t => VALID_TYPES.has(t))
            : (q['type'] && VALID_TYPES.has(q['type']) ? [q['type']] : [])

        if (q['types'] && requestedTypes.length === 0) {
            await logError(this.dataSource, orgCode, null, 'GET /api/search', 'ERR_SEARCH_INVALID_TYPES', `Invalid types: ${q['types']}`, { query: q })
            throw new BadRequestException(`Invalid types. Each must be one of: ${[...VALID_TYPES].join(', ')}`)
        }
        if (q['type'] && !q['types'] && !VALID_TYPES.has(q['type'])) {
            await logError(this.dataSource, orgCode, null, 'GET /api/search', 'ERR_SEARCH_INVALID_TYPE', `Invalid type: ${q['type']}`, { query: q })
            throw new BadRequestException(`Invalid type. Must be one of: ${[...VALID_TYPES].join(', ')}`)
        }

        // REQ-SEARCH-BE-F-009 â€” validate date params
        for (const dp of DATE_PARAMS) {
            if (q[dp] && !isValidDate(q[dp])) {
                await logError(this.dataSource, orgCode, null, 'GET /api/search', 'ERR_SEARCH_INVALID_DATE', `Invalid date value for ${dp}`, { query: q, parameter: dp, value: q[dp] })
                throw new BadRequestException(`Invalid date value for ${dp}: "${q[dp]}"`)
            }
        }

        // Single query path - filterMode always used.
        // Results capped at LIMIT 2000 per type as a database safety guard.
        // Frontend pagination handles display volume.
        return this.filterMode(q, orgCode, requestedTypes)
    }

    async getCreatedByOptions(orgCode: string): Promise<string[]> {
        const rows = await this.dataSource.query(
            `SELECT DISTINCT
                COALESCE(NULLIF(full_name, ''), NULLIF(username, ''), NULLIF(email, '')) AS name
             FROM users
             WHERE org_code = $1
               AND COALESCE(is_active, true) = true
             ORDER BY name ASC`,
            [orgCode],
        ).catch(() => [])

        return rows
            .map((r: any) => String(r.name ?? '').trim())
            .filter((name: string) => name.length > 0)
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
            const coverholderColumn = columnName('coverholder', 'coverholder')
            const yearOfAccountColumn = columnName('yearOfAccount', '"yearOfAccount"')
            const inceptionDateColumn = columnName('inceptionDate', '"inceptionDate"')
            const expiryDateColumn = columnName('expiryDate', '"expiryDate"')
            const createdDateColumn = columnName('createdDate', '"createdDate"')
            const createdByColumn = columnName('createdBy', '"createdBy"')

            if (referenceColumn && q['reference']) { params.push(`%${q['reference']}%`); clauses.push(`LOWER(${referenceColumn}) LIKE LOWER($${params.length})`) }
            if (statusColumn && q['status']) { params.push(`%${q['status']}%`); clauses.push(`LOWER(${statusColumn}) LIKE LOWER($${params.length})`) }
            if (insuredColumn && q['insured']) { params.push(`%${q['insured']}%`); clauses.push(`LOWER(${insuredColumn}) LIKE LOWER($${params.length})`) }
            if (brokerColumn && q['broker']) { params.push(`%${q['broker']}%`); clauses.push(`LOWER(${brokerColumn}) LIKE LOWER($${params.length})`) }
            if (coverholderColumn && q['coverholder']) { params.push(`%${q['coverholder']}%`); clauses.push(`LOWER(${coverholderColumn}) LIKE LOWER($${params.length})`) }
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

        const allFields = { reference: true, status: true, insured: true, broker: true, coverholder: false, yearOfAccount: true, inceptionDate: true, expiryDate: true, createdDate: true, createdBy: true }

        result.submissions = await runForType('Submission', async () => {
            const { where, params } = buildClause([orgCode], allFields)
            const rows = await this.dataSource.query(
                `SELECT id, reference, insured, status, "inceptionDate", "expiryDate", "createdDate", "createdBy"
                 FROM submission WHERE "createdByOrgCode" = $1${where} ORDER BY "createdDate" DESC LIMIT 2000`,
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
                `SELECT id, name, role, "createdDate", "createdBy" FROM party WHERE "orgCode" = $1${where} ORDER BY "createdDate" DESC LIMIT 2000`,
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
                 LIMIT 2000`,
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
                 LIMIT 2000`,
                params,
            ).catch(() => [])
            return filterByLastOpened(await this.attachLastOpened(rows, 'Policy'))
        })

        result.bindingAuthorities = await runForType('Binding Authority', async () => {
            const { where, params } = buildClause([orgCode], {
                reference: 'ba.reference',
                status: 'ba.status',
                coverholder: "ba.payload->>'coverholder'",
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
                 LIMIT 2000`,
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
                 LIMIT 2000`,
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
