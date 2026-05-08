import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource, IsNull } from 'typeorm'
import { MeasureDefinition, FilterCondition } from './measure-definition.entity'
import { compileFilterCondition } from './filter-condition.compiler'
import { DATA_SOURCES, type FieldDef, type SourceConfig } from '../reporting/field-mappings'

export type MeasureDto = {
    id: number
    key: string
    label: string
    sourceKey: string
    measureType: 'count' | 'sum' | 'ratio'
    scope: 'org' | 'user' | 'both'
    createdByType: 'internal' | 'tenant'
    orgCode: string | null
    filterExpr: string | null
    filterCondition: FilterCondition | null
    ratioNumerator: string | null
    ratioDenominator: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
}

export type CreateMeasureDto = {
    key: string
    label: string
    sourceKey: string
    measureType: 'count' | 'sum' | 'ratio'
    scope?: 'org' | 'user' | 'both'
    filterCondition?: FilterCondition
    ratioNumerator?: string
    ratioDenominator?: string
}

export type UpdateMeasureDto = Partial<Pick<CreateMeasureDto, 'label' | 'scope' | 'filterCondition'>>

function toDto(m: MeasureDefinition): MeasureDto {
    return {
        id: m.id,
        key: m.key,
        label: m.label,
        sourceKey: m.sourceKey,
        measureType: m.measureType,
        scope: m.scope,
        createdByType: m.createdByType,
        orgCode: m.orgCode,
        filterExpr: m.filterExpr,
        filterCondition: m.filterCondition,
        ratioNumerator: m.ratioNumerator,
        ratioDenominator: m.ratioDenominator,
        isActive: m.isActive,
        createdAt: m.createdAt?.toISOString(),
        updatedAt: m.updatedAt?.toISOString(),
    }
}

@Injectable()
export class MeasuresService {
    constructor(
        @InjectRepository(MeasureDefinition)
        private readonly repo: Repository<MeasureDefinition>,
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) { }

    // -------------------------------------------------------------------------
    // Public CRUD API
    // -------------------------------------------------------------------------

    /** Returns all active internal measures + active tenant measures for this org */
    async findAll(orgCode: string): Promise<MeasureDto[]> {
        const rows = await this.repo
            .createQueryBuilder('m')
            .where('m.is_active = true')
            .andWhere('(m.org_code IS NULL OR m.org_code = :orgCode)', { orgCode })
            .orderBy('m.source_key', 'ASC')
            .addOrderBy('m.key', 'ASC')
            .getMany()
        return rows.map(toDto)
    }

    async findOne(id: number, orgCode: string): Promise<MeasureDto> {
        const m = await this.repo.findOne({ where: { id } })
        if (!m) throw new NotFoundException('Measure not found')
        // Tenant measures are scoped; internal measures visible to all
        if (m.createdByType === 'tenant' && m.orgCode !== orgCode) {
            throw new NotFoundException('Measure not found')
        }
        return toDto(m)
    }

    /**
     * Tenant admins may only create 'tenant' type measures.
     * The filter definition must be a FilterCondition JSONB — never raw SQL.
     */
    async create(orgCode: string, username: string, dto: CreateMeasureDto): Promise<MeasureDto> {
        this.validateSourceKey(dto.sourceKey)

        // Validate filter_condition if provided
        if (dto.filterCondition) {
            // Compile to check validity — result discarded; DB stores the JSONB
            compileFilterCondition(dto.filterCondition, dto.sourceKey)
        }

        const entity = this.repo.create({
            key: dto.key,
            label: dto.label,
            sourceKey: dto.sourceKey,
            measureType: dto.measureType,
            scope: dto.scope ?? 'org',
            createdByType: 'tenant',
            orgCode,
            filterExpr: null,           // tenant measures NEVER use raw filter_expr
            filterCondition: dto.filterCondition ?? null,
            ratioNumerator: null,        // ratio only for internal measures
            ratioDenominator: null,
            isActive: true,
        })

        const saved = await this.repo.save(entity)
        return toDto(saved)
    }

    async update(id: number, orgCode: string, username: string, dto: UpdateMeasureDto): Promise<MeasureDto> {
        const m = await this.repo.findOne({ where: { id } })
        if (!m) throw new NotFoundException('Measure not found')
        if (m.orgCode !== orgCode) throw new ForbiddenException('Cannot modify measures owned by another org')
        if (m.createdByType === 'internal') throw new ForbiddenException('Internal measures cannot be modified via the API')

        const changes: { field: string; oldValue: string | null; newValue: string | null }[] = []

        if (dto.label !== undefined && dto.label !== m.label) {
            changes.push({ field: 'label', oldValue: m.label, newValue: dto.label })
            m.label = dto.label
        }
        if (dto.scope !== undefined && dto.scope !== m.scope) {
            changes.push({ field: 'scope', oldValue: m.scope, newValue: dto.scope })
            m.scope = dto.scope
        }
        if (dto.filterCondition !== undefined) {
            compileFilterCondition(dto.filterCondition, m.sourceKey)
            const oldJson = m.filterCondition ? JSON.stringify(m.filterCondition) : null
            const newJson = JSON.stringify(dto.filterCondition)
            if (oldJson !== newJson) {
                changes.push({ field: 'filter_condition', oldValue: oldJson, newValue: newJson })
                m.filterCondition = dto.filterCondition
            }
        }

        if (changes.length === 0) return toDto(m)

        const saved = await this.repo.save(m)
        await this.writeHistory(saved.id, changes, username)
        return toDto(saved)
    }

    async deactivate(id: number, orgCode: string, username: string): Promise<void> {
        const m = await this.repo.findOne({ where: { id } })
        if (!m) throw new NotFoundException('Measure not found')
        if (m.orgCode !== orgCode) throw new ForbiddenException('Cannot modify measures owned by another org')
        if (m.createdByType === 'internal') throw new ForbiddenException('Internal measures cannot be deactivated via the API')

        if (!m.isActive) return  // already inactive — idempotent

        m.isActive = false
        await this.repo.save(m)
        await this.writeHistory(m.id, [{ field: 'is_active', oldValue: 'true', newValue: 'false' }], username)
    }

    // -------------------------------------------------------------------------
    // Internal helpers consumed by reporting.service.ts and home.service.ts
    // -------------------------------------------------------------------------

    /**
     * Returns the effective SQL filter expression for a measure definition.
     * For internal measures: returns filter_expr directly.
     * For tenant measures: compiles filter_condition JSONB to SQL.
     * Returns null for unfiltered count-all or sum measures.
     */
    getEffectiveFilterExpr(m: MeasureDefinition): string | null {
        if (m.createdByType === 'internal') return m.filterExpr
        if (!m.filterCondition) return null
        return compileFilterCondition(m.filterCondition, m.sourceKey)
    }

    /**
     * Converts a MeasureDefinition row into a FieldDef-compatible object
     * for use in reporting.service.ts resolveFieldRef logic.
     */
    toFieldDef(m: MeasureDefinition): FieldDef {
        const filterExpr = this.getEffectiveFilterExpr(m)
        return {
            key: m.key,
            label: m.label,
            col: '*',
            type: m.measureType === 'ratio' ? 'ratio' : 'count',
            filterExpr: filterExpr ?? undefined,
            ratioNumerator: m.ratioNumerator ?? undefined,
            ratioDenominator: m.ratioDenominator ?? undefined,
        }
    }

    /**
     * Returns a copy of the DATA_SOURCES SourceConfig for a given source key,
     * with all effective measures for this org prepended to the fields array.
     *
     * Used by reporting.service.ts to build augmented source configs per request.
     */
    async getAugmentedSourceConfig(sourceKey: string, orgCode: string): Promise<SourceConfig> {
        const base = DATA_SOURCES[sourceKey]
        if (!base) throw new BadRequestException(`Unknown data source: ${sourceKey}`)

        const measures = await this.repo
            .createQueryBuilder('m')
            .where('m.source_key = :sourceKey', { sourceKey })
            .andWhere('m.is_active = true')
            .andWhere('(m.org_code IS NULL OR m.org_code = :orgCode)', { orgCode })
            .getMany()

        const measureFields: FieldDef[] = measures.map(m => this.toFieldDef(m))

        return {
            table: base.table,
            orgCol: base.orgCol,
            // Measures come first so they shadow any dimension field with the same key
            fields: [...measureFields, ...base.fields],
        }
    }

    /**
     * Returns augmented SourceConfig for all provided source keys in one call.
     */
    async getAugmentedDataSources(sourceKeys: string[], orgCode: string): Promise<Record<string, SourceConfig>> {
        const result: Record<string, SourceConfig> = {}
        for (const key of sourceKeys) {
            if (DATA_SOURCES[key]) {
                result[key] = await this.getAugmentedSourceConfig(key, orgCode)
            }
        }
        return result
    }

    /**
     * Find a single active measure by sourceKey + key for this org (or internal).
     * Used by home.service.ts to load a specific measure at query time.
     */
    async findBySourceAndKey(sourceKey: string, key: string, orgCode: string): Promise<MeasureDefinition | null> {
        // Prefer org-specific measure over internal if both exist
        const orgMeasure = await this.repo.findOne({
            where: { sourceKey, key, orgCode, isActive: true },
        })
        if (orgMeasure) return orgMeasure

        return this.repo.findOne({
            where: { sourceKey, key, orgCode: IsNull(), isActive: true },
        })
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private validateSourceKey(sourceKey: string): void {
        if (!DATA_SOURCES[sourceKey]) {
            throw new BadRequestException(`Unknown data source: "${sourceKey}"`)
        }
    }

    private async writeHistory(
        measureId: number,
        changes: { field: string; oldValue: string | null; newValue: string | null }[],
        changedBy: string,
    ): Promise<void> {
        if (changes.length === 0) return
        const values = changes
            .map((_, i) => `($1, $${i * 3 + 2}, $${i * 3 + 3}, $${i * 3 + 4}, NOW(), $${changes.length * 3 + 2})`)
            .join(', ')
        const params: unknown[] = [measureId]
        for (const c of changes) {
            params.push(c.field, c.oldValue ?? null, c.newValue ?? null)
        }
        params.push(changedBy)
        await this.dataSource.query(
            `INSERT INTO measure_definition_history (measure_definition_id, field_changed, old_value, new_value, changed_at, changed_by) VALUES ${values}`,
            params,
        )
    }
}
