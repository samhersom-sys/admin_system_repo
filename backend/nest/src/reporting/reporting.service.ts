import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { ReportTemplate } from '../entities/report-template.entity'
import { ReportExecutionHistory } from '../entities/report-execution-history.entity'
import { DATA_SOURCES, getFieldMappings } from './field-mappings'

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
    ) { }

    // -------------------------------------------------------------------------
    // R01 — GET /api/report-templates
    // Returns core templates (visible to all orgs) + custom templates for this org.
    // -------------------------------------------------------------------------
    async findAll(orgCode: string): Promise<Record<string, unknown>[]> {
        const templates = await this.templateRepo
            .createQueryBuilder('t')
            .where('t.type = :core', { core: 'core' })
            .orWhere('(t.type = :custom AND t.orgCode = :orgCode)', { custom: 'custom', orgCode })
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
        if (t.type === 'custom' && t.orgCode !== orgCode) {
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
            type: 'custom',
            dataSource: body.data_source ?? null,
            dateBasis: body.date_basis ?? null,
            dateFrom: body.date_from ?? null,
            dateTo: body.date_to ?? null,
            sortBy: body.sort_by ?? null,
            sortOrder: body.sort_order ?? null,
            fields: Array.isArray(body.fields) ? body.fields : [],
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
        const t = await this.templateRepo.findOne({ where: { id, type: 'custom', orgCode } })
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
        const t = await this.templateRepo.findOne({ where: { id, type: 'custom', orgCode } })
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
    // -------------------------------------------------------------------------
    getFieldMappings(domain: string): Array<{ key: string; label: string }> {
        return getFieldMappings(domain)
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
}
