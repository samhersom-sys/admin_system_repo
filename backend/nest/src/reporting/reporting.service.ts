import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { ReportTemplate } from '../entities/report-template.entity'
import { ReportExecutionHistory } from '../entities/report-execution-history.entity'
import { DATA_SOURCES, type SourceConfig } from './field-mappings'
import { MeasuresService } from '../measures/measures.service'

type DashboardWidgetRequest = {
    type: 'metric' | 'chart' | 'table' | 'text'
    source?: string | null
    metric?: string | null
    attribute?: string | null
    yAxisAttribute?: string | null
    legendAttribute?: string | null
    measures?: string[]
    attributes?: string[]
    aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max'
    note?: string | null
}

type DashboardFilterRequest = {
    analysisBasis?: string | null
    dateBasis?: string | null
    reportingDate?: string | null
    customAttributes?: Array<{ field: string; operator: string; value: string }>
}

type ResolvedFieldRef = {
    source: string
    key: string
    label: string
    col: string
    type?: 'text' | 'lookup' | 'date' | 'number' | 'count' | 'ratio'
    filterExpr?: string
    ratioNumerator?: string
    ratioDenominator?: string
}

// ---------------------------------------------------------------------------
// DTO mappers
// ---------------------------------------------------------------------------

function toTemplateDto(t: ReportTemplate): Record<string, unknown> {
    return {
        id: t.id,
        name: t.name,
        description: t.description ?? null,
        type: t.type,
        data_source: t.dataSource ?? null,
        date_basis: t.dateBasis ?? null,
        date_from: t.dateFrom ?? null,
        date_to: t.dateTo ?? null,
        sort_by: t.sortBy ?? null,
        sort_order: t.sortOrder ?? null,
        fields: t.fields ?? [],
        filters: t.filters ?? [],
        created_by: t.createdBy ?? null,
        created_at: t.createdAt?.toISOString() ?? null,
        updated_at: t.updatedAt?.toISOString() ?? null,
    }
}

function toHistoryDto(h: ReportExecutionHistory): Record<string, unknown> {
    return {
        id: h.id,
        run_at: h.runAt?.toISOString() ?? null,
        run_by: h.runBy ?? null,
        row_count: h.rowCount ?? null,
        status: h.status,
    }
}

function parseCompositeField(value: string): { source: string; key: string } | null {
    const [source, key] = value.split('::')
    if (!source || !key) return null
    return { source, key }
}

function unique<T>(values: T[]): T[] {
    return Array.from(new Set(values))
}

function titleFromKey(value: string): string {
    return value
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatDate(date: Date): string {
    return date.toISOString().slice(0, 10)
}

function formatDuration(totalSeconds: number): string {
    const safeSeconds = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0
    const hours = Math.floor(safeSeconds / 3600)
    const minutes = Math.floor((safeSeconds % 3600) / 60)
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}

function computeAnalysisWindow(analysisBasis: string | null | undefined, reportingDate: string | null | undefined): { start?: string; end?: string } {
    if (!reportingDate) return {}
    const endDate = new Date(`${reportingDate}T00:00:00Z`)
    if (Number.isNaN(endDate.getTime())) return {}

    const startDate = new Date(endDate)
    switch ((analysisBasis ?? 'cumulative').toLowerCase()) {
        case 'day':
            break
        case 'week': {
            const day = startDate.getUTCDay()
            const delta = day === 0 ? 6 : day - 1
            startDate.setUTCDate(startDate.getUTCDate() - delta)
            break
        }
        case 'month':
        case 'mtd':
            startDate.setUTCDate(1)
            break
        case 'qtd': {
            const month = startDate.getUTCMonth()
            const quarterStartMonth = Math.floor(month / 3) * 3
            startDate.setUTCMonth(quarterStartMonth, 1)
            break
        }
        case 'ytd':
            startDate.setUTCMonth(0, 1)
            break
        case 'cumulative':
        default:
            return { end: formatDate(endDate) }
    }

    return { start: formatDate(startDate), end: formatDate(endDate) }
}

// ---------------------------------------------------------------------------
// ReportingService
// ---------------------------------------------------------------------------

@Injectable()
export class ReportingService {
    constructor(
        @InjectRepository(ReportTemplate)
        private readonly templateRepo: Repository<ReportTemplate>,
        @InjectRepository(ReportExecutionHistory)
        private readonly historyRepo: Repository<ReportExecutionHistory>,
        private readonly dataSource: DataSource,
        private readonly measuresService: MeasuresService,
    ) { }

    // -------------------------------------------------------------------------
    // R01 — GET /api/report-templates
    // Returns core templates (visible to all orgs) + custom + dashboard templates for this org.
    // -------------------------------------------------------------------------
    async findAll(orgCode: string): Promise<Record<string, unknown>[]> {
        const templates = await this.templateRepo
            .createQueryBuilder('t')
            .where('t.type = :core', { core: 'core' })
            .orWhere('(t.type IN (:...userTypes) AND t.orgCode = :orgCode)', { userTypes: ['custom', 'dashboard'], orgCode })
            .orderBy('t.name', 'ASC')
            .getMany()
        return templates.map(toTemplateDto)
    }

    // -------------------------------------------------------------------------
    // R02 — GET /api/report-templates/:id
    // -------------------------------------------------------------------------
    async findOne(orgCode: string, id: number): Promise<Record<string, unknown>> {
        const t = await this.templateRepo.findOne({ where: { id } })
        if (!t) throw new NotFoundException('Report template not found')
        // Org-scope check for all user-owned types (custom, dashboard)
        if ((t.type === 'custom' || t.type === 'dashboard') && t.orgCode !== orgCode) {
            throw new NotFoundException('Report template not found')
        }
        return toTemplateDto(t)
    }

    // -------------------------------------------------------------------------
    // R03 — POST /api/report-templates
    // -------------------------------------------------------------------------
    async create(orgCode: string, body: Record<string, any>, userName?: string): Promise<Record<string, unknown>> {
        if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
            throw new BadRequestException('name is required')
        }
        const entity = this.templateRepo.create({
            orgCode,
            name: body.name.trim(),
            description: body.description ?? null,
            // Preserve 'dashboard' type sent by the frontend; everything else is 'custom'
            type: body.type === 'dashboard' ? 'dashboard' : 'custom',
            dataSource: body.data_source ?? null,
            dateBasis: body.date_basis ?? null,
            dateFrom: body.date_from ?? null,
            dateTo: body.date_to ?? null,
            sortBy: body.sort_by ?? null,
            sortOrder: body.sort_order ?? 'asc',
            // Accept any JSON value (dashboards store DashboardConfig, reports store SelectedField[])
            fields: body.fields !== undefined && body.fields !== null ? body.fields : null,
            filters: Array.isArray(body.filters) ? body.filters : [],
            createdBy: userName ?? null,
        })
        const saved = await this.templateRepo.save(entity)
        return toTemplateDto(saved)
    }

    // -------------------------------------------------------------------------
    // R04 — PUT /api/report-templates/:id
    // -------------------------------------------------------------------------
    async update(orgCode: string, id: number, body: Record<string, any>): Promise<Record<string, unknown>> {
        // Allow updating both 'custom' reports and 'dashboard' records
        const t = await this.templateRepo.findOne({
            where: [{ id, type: 'custom', orgCode }, { id, type: 'dashboard', orgCode }],
        })
        if (!t) throw new NotFoundException('Report template not found')
        if (body.name !== undefined) t.name = body.name
        if (body.description !== undefined) t.description = body.description
        if (body.data_source !== undefined) t.dataSource = body.data_source
        if (body.date_basis !== undefined) t.dateBasis = body.date_basis
        if (body.date_from !== undefined) t.dateFrom = body.date_from
        if (body.date_to !== undefined) t.dateTo = body.date_to
        if (body.sort_by !== undefined) t.sortBy = body.sort_by
        if (body.sort_order !== undefined) t.sortOrder = body.sort_order
        if (body.fields !== undefined) t.fields = body.fields
        if (body.filters !== undefined) t.filters = body.filters
        const saved = await this.templateRepo.save(t)
        return toTemplateDto(saved)
    }

    // -------------------------------------------------------------------------
    // R05 — DELETE /api/report-templates/:id
    // -------------------------------------------------------------------------
    async remove(orgCode: string, id: number): Promise<void> {
        const t = await this.templateRepo.findOne({
            where: [{ id, type: 'custom', orgCode }, { id, type: 'dashboard', orgCode }],
        })
        if (!t) throw new NotFoundException('Report template not found')
        await this.templateRepo.remove(t)
    }

    // -------------------------------------------------------------------------
    // R06 — POST /api/report-templates/:id/run
    //
    // Executes the template as a safe parameterized SQL query.
    // Field names are validated against the FIELD_MAPPINGS allow-list before
    // being used as SQL column identifiers — no user input reaches the query
    // as an unparameterized identifier.
    // -------------------------------------------------------------------------
    async run(
        orgCode: string,
        id: number,
        userName?: string,
    ): Promise<{ data: Record<string, unknown>[] }> {
        const t = await this.templateRepo.findOne({ where: { id } })
        if (!t) throw new NotFoundException('Report template not found')
        if (t.type === 'custom' && t.orgCode !== orgCode) {
            throw new NotFoundException('Report template not found')
        }

        const sourceConfig = DATA_SOURCES[t.dataSource ?? '']
        if (!sourceConfig) {
            // No runnable data source configured — return empty result set.
            await this.recordHistory(id, userName, 0, 'success')
            return { data: [] }
        }

        // Build an allow-list of field keys → SQL column expressions
        const allowedCols = new Map(sourceConfig.fields.map((f) => [f.key, f.col]))

        // Determine selected columns (default to all if none specified)
        const requestedFields = (t.fields ?? []).filter((k) => allowedCols.has(k))
        const selectExprs =
            requestedFields.length > 0
                ? requestedFields.map((k) => `${allowedCols.get(k)} AS "${k}"`).join(', ')
                : sourceConfig.fields.map((f) => `${f.col} AS "${f.key}"`).join(', ')

        // Build parameterized WHERE clauses
        const params: unknown[] = [orgCode]
        const wheres: string[] = [`${sourceConfig.orgCol} = $1`]
        let pIdx = 2

        if (t.dateBasis && allowedCols.has(t.dateBasis)) {
            if (t.dateFrom) {
                wheres.push(`${allowedCols.get(t.dateBasis)} >= $${pIdx}`)
                params.push(t.dateFrom)
                pIdx++
            }
            if (t.dateTo) {
                wheres.push(`${allowedCols.get(t.dateBasis)} <= $${pIdx}`)
                params.push(t.dateTo)
                pIdx++
            }
        }

        for (const filter of t.filters ?? []) {
            if (!allowedCols.has(filter.field)) continue
            const colExpr = allowedCols.get(filter.field)!
            if (filter.operator === 'eq' || filter.operator === '=') {
                wheres.push(`${colExpr} = $${pIdx}`)
                params.push(filter.value)
                pIdx++
            } else if (filter.operator === 'contains') {
                wheres.push(`${colExpr} ILIKE $${pIdx}`)
                params.push(`%${filter.value}%`)
                pIdx++
            }
        }

        // Sort (only allowed field keys)
        let orderClause = ''
        if (t.sortBy && allowedCols.has(t.sortBy)) {
            const dir = t.sortOrder?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'
            orderClause = ` ORDER BY ${allowedCols.get(t.sortBy)} ${dir}`
        }

        const sql = `SELECT ${selectExprs} FROM ${sourceConfig.table} WHERE ${wheres.join(' AND ')}${orderClause}`

        let rows: Record<string, unknown>[] = []
        try {
            rows = await this.dataSource.query(sql, params)
            await this.recordHistory(id, userName, rows.length, 'success')
        } catch {
            await this.recordHistory(id, userName, 0, 'error')
            throw new BadRequestException('Report execution failed')
        }

        return { data: rows }
    }

    // -------------------------------------------------------------------------
    // R07 — GET /api/report-templates/:id/history
    // -------------------------------------------------------------------------
    async getHistory(orgCode: string, id: number): Promise<Record<string, unknown>[]> {
        const t = await this.templateRepo.findOne({ where: { id } })
        if (!t) throw new NotFoundException('Report template not found')
        if (t.type === 'custom' && t.orgCode !== orgCode) {
            throw new NotFoundException('Report template not found')
        }
        const history = await this.historyRepo.find({
            where: { templateId: id },
            order: { runAt: 'DESC' },
        })
        return history.map(toHistoryDto)
    }

    // -------------------------------------------------------------------------
    // R08 — GET /api/report-field-mappings/:domain  (semantic layer)
    // Returns dimension fields from field-mappings.ts PLUS measures from measure_definitions
    // for the authenticated org — so the widget builder sees the full field catalog.
    // -------------------------------------------------------------------------
    async getFieldMappings(domain: string, orgCode: string): Promise<Array<{ key: string; label: string; type?: string; lookupValues?: string[] }>> {
        const baseSource = DATA_SOURCES[domain]
        if (!baseSource) return []
        const augmented = await this.measuresService.getAugmentedSourceConfig(domain, orgCode)
        return augmented.fields.map(({ key, label, type, lookupValues }) => ({
            key,
            label,
            ...(type ? { type } : {}),
            ...(lookupValues ? { lookupValues } : {}),
        }))
    }

    // -------------------------------------------------------------------------
    // R09 — GET /api/date-basis  (static lookup)
    // -------------------------------------------------------------------------
    getDateBasisOptions(): string[] {
        return ['Created Date', 'Inception Date', 'Expiry Date', 'Bound Date', 'Cancellation Date']
    }

    // -------------------------------------------------------------------------
    // R10 — GET /api/login-activity  (core report datasource)
    // -------------------------------------------------------------------------
    async getLoginActivity(
        orgCode: string | null | undefined,
        role: string,
    ): Promise<Array<Record<string, unknown>>> {
        const isAdmin = role === 'internal_admin'

        let sql: string
        let params: unknown[]

        if (isAdmin) {
            sql = `
                SELECT
                    user_name  AS "user",
                    org_code   AS "orgCode",
                    logged_in_at AS "loggedInAt"
                FROM login_history
                ORDER BY logged_in_at DESC
            `
            params = []
        } else {
            sql = `
                SELECT
                    user_name  AS "user",
                    org_code   AS "orgCode",
                    logged_in_at AS "loggedInAt"
                FROM login_history
                WHERE org_code = $1
                ORDER BY logged_in_at DESC
            `
            params = [orgCode ?? null]
        }

        const rows: Array<{ user: string; orgCode: string | null; loggedInAt: Date | string | null }> =
            await this.dataSource.query(sql, params)

        return rows.map((row) => {
            const loggedInAt = row.loggedInAt
                ? row.loggedInAt instanceof Date
                    ? row.loggedInAt.toISOString()
                    : String(row.loggedInAt)
                : null

            return {
                user: row.user,
                orgCode: row.orgCode ?? null,
                loggedInAt,
            }
        })
    }

    async getDashboardWidgetData(
        orgCode: string,
        widget: DashboardWidgetRequest | undefined,
        filters?: DashboardFilterRequest,
        _userId?: number,
        _username?: string,
    ): Promise<Record<string, unknown>> {
        if (!widget || !widget.type) {
            throw new BadRequestException('widget is required')
        }

        if (widget.type === 'text') {
            return { type: 'text' }
        }

        const sources = this.resolveWidgetSources(widget)

        if (widget.type === 'metric') {
            const resolvedSource = sources[0]
            const aug = await this.measuresService.getAugmentedDataSources(sources, orgCode)
            const sourceConfig = aug[resolvedSource]
            if (!sourceConfig) {
                throw new BadRequestException('Unsupported widget data source')
            }
            return this.runMetricWidget(orgCode, sourceConfig, widget, filters, aug)
        }
        if (widget.type === 'chart') {
            const aug = await this.measuresService.getAugmentedDataSources(sources, orgCode)
            return this.runChartWidget(orgCode, sources, widget, filters, aug)
        }
        if (widget.type === 'table') {
            const aug = await this.measuresService.getAugmentedDataSources(sources, orgCode)
            return this.runTableWidget(orgCode, sources, widget, filters, aug)
        }

        throw new BadRequestException('Unsupported widget type')
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------
    private async recordHistory(
        templateId: number,
        runBy: string | undefined,
        rowCount: number,
        status: 'success' | 'error',
    ): Promise<void> {
        const h = this.historyRepo.create({ templateId, runBy: runBy ?? null, rowCount, status })
        await this.historyRepo.save(h)
    }

    private resolveSourceKey(source: string | null | undefined): string | null {
        if (!source) {
            return null
        }
        if (DATA_SOURCES[source]) {
            return source
        }
        const match = Object.keys(DATA_SOURCES).find((key) => key.toLowerCase() === source.toLowerCase())
        return match ?? null
    }

    private resolveWidgetSources(widget: DashboardWidgetRequest): string[] {
        const values = [
            widget.metric,
            widget.attribute,
            widget.yAxisAttribute,
            widget.legendAttribute,
            ...(widget.measures ?? []),
            ...(widget.attributes ?? []),
        ].filter(Boolean) as string[]

        const parsedSources = values.map((value) => this.resolveSourceKey(parseCompositeField(value)?.source ?? null))
        const unsupportedSource = parsedSources.find((source) => !source)
        if (unsupportedSource === null) {
            throw new BadRequestException('Unsupported widget data source')
        }
        const sources = unique(parsedSources.filter(Boolean) as string[])
        if (sources.length === 0) {
            const resolvedWidgetSource = this.resolveSourceKey(widget.source)
            if (resolvedWidgetSource) {
                return [resolvedWidgetSource]
            }
            throw new BadRequestException('Widget has no live data fields configured')
        }
        return sources
    }

    private tryResolveFieldRef(
        source: string,
        compositeKey: string | null | undefined,
        allowEquivalentKey = false,
        aug: Record<string, SourceConfig> = {},
    ): ResolvedFieldRef | null {
        if (!compositeKey) {
            throw new BadRequestException('Widget field is required')
        }
        const parsed = parseCompositeField(compositeKey)
        if (!parsed) {
            throw new BadRequestException('Widget field is required')
        }
        const parsedSource = this.resolveSourceKey(parsed.source)
        if (!parsedSource) {
            throw new BadRequestException('Unsupported widget data source')
        }
        const sourceConfig = aug[source] ?? DATA_SOURCES[source]
        if (!sourceConfig) {
            throw new BadRequestException('Unsupported widget data source')
        }
        if (!allowEquivalentKey && parsedSource !== source) {
            throw new BadRequestException('Widget field source does not match widget source')
        }
        const fieldDef = sourceConfig.fields.find((field) => field.key === parsed.key)
        if (!fieldDef) {
            return null
        }
        return {
            source,
            key: fieldDef.key,
            label: fieldDef.label,
            col: fieldDef.col,
            type: fieldDef.type,
            filterExpr: fieldDef.filterExpr,
            ratioNumerator: fieldDef.ratioNumerator,
            ratioDenominator: fieldDef.ratioDenominator,
        }
    }

    private resolveFieldRef(source: string, compositeKey: string | null | undefined, aug: Record<string, SourceConfig> = {}): ResolvedFieldRef {
        const field = this.tryResolveFieldRef(source, compositeKey, false, aug)
        if (!field) {
            throw new BadRequestException(`Unsupported widget field: ${compositeKey}`)
        }
        return field
    }

    private resolveEquivalentFieldRef(source: string, compositeKey: string | null | undefined, aug: Record<string, SourceConfig> = {}): ResolvedFieldRef | null {
        return this.tryResolveFieldRef(source, compositeKey, true, aug)
    }

    private buildWidgetWhereClause(
        orgCode: string,
        source: string,
        filters?: DashboardFilterRequest,
        allowEquivalentKeys = false,
        aug: Record<string, SourceConfig> = {},
    ): { clause: string; params: unknown[] } {
        const sourceConfig = aug[source] ?? DATA_SOURCES[source]
        const params: unknown[] = [orgCode]
        const wheres: string[] = [`${sourceConfig.orgCol} = $1`]

        if (filters?.dateBasis && filters.reportingDate) {
            const dateField = allowEquivalentKeys
                ? this.resolveEquivalentFieldRef(source, filters.dateBasis, aug)
                : this.resolveFieldRef(source, filters.dateBasis, aug)
            if (dateField) {
                const window = computeAnalysisWindow(filters.analysisBasis, filters.reportingDate)
                if (window.start) {
                    params.push(window.start)
                    wheres.push(`CAST(${dateField.col} AS date) >= $${params.length}`)
                }
                if (window.end) {
                    params.push(window.end)
                    wheres.push(`CAST(${dateField.col} AS date) <= $${params.length}`)
                }
            }
        }

        for (const customFilter of filters?.customAttributes ?? []) {
            const field = allowEquivalentKeys
                ? this.resolveEquivalentFieldRef(source, customFilter.field, aug)
                : this.resolveFieldRef(source, customFilter.field, aug)
            if (!field) {
                continue
            }
            const operator = (customFilter.operator ?? 'equals').toLowerCase()
            if (operator === 'equals') {
                params.push(customFilter.value)
                wheres.push(`${field.col} = $${params.length}`)
                continue
            }
            if (operator === 'not_equals') {
                params.push(customFilter.value)
                wheres.push(`${field.col} <> $${params.length}`)
                continue
            }
            if (operator === 'contains') {
                params.push(`%${customFilter.value}%`)
                wheres.push(`CAST(${field.col} AS text) ILIKE $${params.length}`)
                continue
            }
            if (operator === 'greater_than') {
                params.push(customFilter.value)
                wheres.push(`${field.col} > $${params.length}`)
                continue
            }
            if (operator === 'less_than') {
                params.push(customFilter.value)
                wheres.push(`${field.col} < $${params.length}`)
                continue
            }
            throw new BadRequestException(`Unsupported filter operator: ${customFilter.operator}`)
        }

        return { clause: wheres.join(' AND '), params }
    }

    private buildMeasureAlias(field: ResolvedFieldRef | null, aggregation: DashboardWidgetRequest['aggregation']): string {
        const normalizedAggregation = aggregation ?? 'count'
        if (!field) {
            return 'value_count'
        }
        return `value_${normalizedAggregation}_${field.key}`
    }

    private normalizeMeasureAlias(alias: string): string {
        if (alias === 'value_count') return 'count'
        return alias.replace(/^value_[^_]+_?/, '') || 'count'
    }

    private buildAggregateExpression(field: ResolvedFieldRef | null, aggregation: DashboardWidgetRequest['aggregation']): string {
        if (field?.type === 'count') {
            // Semantic count measure — REQ-RPT-BE-F-049
            return field.filterExpr
                ? `SUM(CASE WHEN ${field.filterExpr} THEN 1 ELSE 0 END)`
                : 'COUNT(*)'
        }
        if (field?.type === 'ratio') {
            // Semantic ratio measure — REQ-RPT-BE-F-057
            return `NULLIF(SUM(CASE WHEN ${field.ratioNumerator} THEN 1 ELSE 0 END)::numeric, 0) / NULLIF(SUM(CASE WHEN ${field.ratioDenominator} THEN 1 ELSE 0 END)::numeric, 0)`
        }
        const normalizedAggregation = aggregation ?? 'count'
        if (normalizedAggregation === 'count' || !field) {
            return 'COUNT(*)'
        }
        if (field.type !== 'number') {
            throw new BadRequestException(`Aggregation ${normalizedAggregation} requires a numeric field`)
        }
        if (normalizedAggregation === 'sum') return `COALESCE(SUM(${field.col}), 0)`
        if (normalizedAggregation === 'avg') return `COALESCE(AVG(${field.col}), 0)`
        if (normalizedAggregation === 'min') return `COALESCE(MIN(${field.col}), 0)`
        if (normalizedAggregation === 'max') return `COALESCE(MAX(${field.col}), 0)`
        return 'COUNT(*)'
    }

    private async runMetricWidget(
        orgCode: string,
        sourceConfig: SourceConfig,
        widget: DashboardWidgetRequest,
        filters?: DashboardFilterRequest,
        aug: Record<string, SourceConfig> = {},
    ): Promise<Record<string, unknown>> {
        const source = this.resolveWidgetSources(widget)[0]
        const metricField = widget.metric ? this.resolveFieldRef(source, widget.metric, aug) : null
        const aggregateExpr = this.buildAggregateExpression(metricField, widget.aggregation)
        const where = this.buildWidgetWhereClause(orgCode, source, filters, false, aug)
        const sql = `SELECT ${aggregateExpr} AS value FROM ${sourceConfig.table} WHERE ${where.clause}`
        const rows = await this.dataSource.query(sql, where.params)
        return {
            type: 'metric',
            value: Number(rows[0]?.value ?? 0),
            label: metricField?.label ?? 'Count',
        }
    }

    private async runChartWidget(
        orgCode: string,
        sources: string[],
        widget: DashboardWidgetRequest,
        filters?: DashboardFilterRequest,
        aug: Record<string, SourceConfig> = {},
    ): Promise<Record<string, unknown>> {
        const rawMeasures = Array.from(new Set([...(widget.measures ?? []), widget.yAxisAttribute].filter(Boolean))) as string[]
        const mergedRows = new Map<string, { label: string; series?: string; values: Record<string, number> }>()

        for (const source of sources) {
            const sourceConfig = aug[source] ?? DATA_SOURCES[source]
            const attribute = this.resolveEquivalentFieldRef(source, widget.attribute, aug)
            if (!attribute) {
                continue
            }
            const legend = widget.legendAttribute ? this.resolveEquivalentFieldRef(source, widget.legendAttribute, aug) : null
            const sourceMeasures = rawMeasures
                .filter((measure) => this.resolveSourceKey(parseCompositeField(measure)?.source ?? null) === source)
                .map((measure) => this.resolveFieldRef(source, measure, aug))

            if (sourceMeasures.length === 0 && (widget.aggregation ?? 'count') !== 'count') {
                continue
            }

            const measureSelects = (sourceMeasures.length > 0 ? sourceMeasures : [null]).map((measure) => {
                const alias = this.buildMeasureAlias(measure, widget.aggregation)
                return `${this.buildAggregateExpression(measure, widget.aggregation)} AS "${alias}"`
            })

            const where = this.buildWidgetWhereClause(orgCode, source, filters, sources.length > 1, aug)
            const legendSelect = legend ? `, COALESCE(CAST(${legend.col} AS text), 'Unspecified') AS series` : ''
            const legendGroup = legend ? `, ${legend.col}` : ''
            const sql = `SELECT COALESCE(CAST(${attribute.col} AS text), 'N/A') AS label${legendSelect}, ${measureSelects.join(', ')} FROM ${sourceConfig.table} WHERE ${where.clause} GROUP BY ${attribute.col}${legendGroup} ORDER BY label ASC`
            const rows = await this.dataSource.query(sql, where.params)

            for (const row of rows) {
                const label = String(row.label ?? 'N/A')
                const series = row.series ? String(row.series) : undefined
                const key = `${label}::${series ?? ''}`
                const existing = mergedRows.get(key) ?? { label, ...(series ? { series } : {}), values: {} }
                for (const [fieldKey, value] of Object.entries(row)) {
                    if (!fieldKey.startsWith('value_')) continue
                    const normalizedKey = this.normalizeMeasureAlias(fieldKey)
                    existing.values[normalizedKey] = (existing.values[normalizedKey] ?? 0) + Number(value ?? 0)
                }
                mergedRows.set(key, existing)
            }
        }

        return {
            type: 'chart',
            rows: Array.from(mergedRows.values()).sort((left, right) => left.label.localeCompare(right.label)),
        }
    }

    private async runTableWidget(
        orgCode: string,
        sources: string[],
        widget: DashboardWidgetRequest,
        filters?: DashboardFilterRequest,
        aug: Record<string, SourceConfig> = {},
    ): Promise<Record<string, unknown>> {
        const attributes = Array.from(new Set(widget.attributes ?? []))
        if (attributes.length === 0) {
            throw new BadRequestException('Table widgets require attributes')
        }

        const groupedAttributes = new Map<string, string[]>()
        for (const attribute of attributes) {
            const parsed = parseCompositeField(attribute)
            if (!parsed) {
                throw new BadRequestException(`Unsupported widget field: ${attribute}`)
            }
            const parsedSource = this.resolveSourceKey(parsed.source)
            if (!parsedSource) {
                throw new BadRequestException('Unsupported widget data source')
            }
            const bucket = groupedAttributes.get(parsedSource) ?? []
            bucket.push(attribute)
            groupedAttributes.set(parsedSource, bucket)
        }

        if (groupedAttributes.size === 1) {
            const source = sources[0]
            const sourceConfig = aug[source] ?? DATA_SOURCES[source]
            const columns = attributes.map((attribute) => this.resolveFieldRef(source, attribute, aug))
            const where = this.buildWidgetWhereClause(orgCode, source, filters, false, aug)
            const sql = `SELECT ${columns.map((column) => `${column.col} AS "${column.key}"`).join(', ')} FROM ${sourceConfig.table} WHERE ${where.clause} LIMIT 100`
            const rows = await this.dataSource.query(sql, where.params)
            return {
                type: 'table',
                rows,
            }
        }

        const requestedKeys = unique(attributes.map((attribute) => parseCompositeField(attribute)?.key).filter(Boolean) as string[])
        const rows: Record<string, unknown>[] = []

        for (const source of sources) {
            const sourceConfig = aug[source] ?? DATA_SOURCES[source]
            const sourceAttributes = groupedAttributes.get(source) ?? []
            if (sourceAttributes.length === 0) continue
            const columns = sourceAttributes.map((attribute) => this.resolveFieldRef(source, attribute, aug))
            const where = this.buildWidgetWhereClause(orgCode, source, filters, true, aug)
            const sql = `SELECT ${columns.map((column) => `${column.col} AS "${column.key}"`).join(', ')} FROM ${sourceConfig.table} WHERE ${where.clause} LIMIT 100`
            const sourceRows = await this.dataSource.query(sql, where.params)
            for (const sourceRow of sourceRows) {
                const combinedRow: Record<string, unknown> = { source: titleFromKey(source) }
                for (const key of requestedKeys) {
                    combinedRow[key] = ''
                }
                for (const column of columns) {
                    combinedRow[column.key] = sourceRow[column.key] ?? ''
                }
                rows.push(combinedRow)
            }
        }

        return {
            type: 'table',
            rows,
        }
    }
}
