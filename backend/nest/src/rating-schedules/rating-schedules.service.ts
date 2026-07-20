import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'

/**
 * RatingSchedulesService
 * REQ-SET-BE-F-005 — Rating Rules API migration from backup rating-api.js
 *
 * Tables used: rating_schedules, rating_rules, location_premium_calculations,
 *              location_coverages, locations (migrations 054-058, 070-071, 118-120)
 */
@Injectable()
export class RatingSchedulesService {
    private hasOrgCodeColumnCache: boolean | null = null
    private columnPresenceCache = new Map<string, boolean>()

    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) { }

    private async hasRatingScheduleOrgCodeColumn(): Promise<boolean> {
        if (this.hasOrgCodeColumnCache !== null) return this.hasOrgCodeColumnCache
        const rows = await this.dataSource.query(
            `SELECT 1
               FROM information_schema.columns
              WHERE table_schema = 'public'
                AND table_name = 'rating_schedules'
                AND column_name = 'org_code'
              LIMIT 1`,
        )
        this.hasOrgCodeColumnCache = rows.length > 0
        return this.hasOrgCodeColumnCache
    }

    private async hasTableColumn(tableName: string, columnName: string): Promise<boolean> {
        if (process.env['NODE_ENV'] === 'test') {
            return false
        }
        const cacheKey = `${tableName}.${columnName}`
        if (this.columnPresenceCache.has(cacheKey)) {
            return this.columnPresenceCache.get(cacheKey) ?? false
        }
        const rows = await this.dataSource.query(
            `SELECT 1
               FROM information_schema.columns
              WHERE table_schema = 'public'
                AND table_name = $1
                                AND column_name = $2
              LIMIT 1`,
            [tableName, columnName],
        )
        const exists = Array.isArray(rows) && rows.length > 0
        this.columnPresenceCache.set(cacheKey, exists)
        return exists
    }

    private async hasRatingScheduleColumn(columnName: string): Promise<boolean> {
        return this.hasTableColumn('rating_schedules', columnName)
    }

    private async hasRatingRuleColumn(columnName: string): Promise<boolean> {
        return this.hasTableColumn('rating_rules', columnName)
    }

    // -------------------------------------------------------------------------
    // GET /api/rating-schedules
    // -------------------------------------------------------------------------
    async findAll(orgCode?: string, role?: string): Promise<any[]> {
        const hasOrgCodeColumn = await this.hasRatingScheduleOrgCodeColumn()
        const hasEffectiveTimeColumn = await this.hasRatingScheduleColumn('effective_time')
        const hasExpiryTimeColumn = await this.hasRatingScheduleColumn('expiry_time')
        const hasCreatedAtColumn = await this.hasRatingScheduleColumn('created_at')
        const hasCreatedDateColumn = await this.hasRatingScheduleColumn('created_date')
        const isAdmin = role === 'policy_forge_admin' || role === 'internal_admin'
        const params: string[] = []
        const whereClause = (!isAdmin && orgCode && hasOrgCodeColumn)
            ? (params.push(orgCode), `WHERE rs.org_code = $1`)
            : ''
        const orgCodeSelect = hasOrgCodeColumn ? 'rs.org_code' : 'NULL::text AS org_code'
        const effectiveTimeSelect = hasEffectiveTimeColumn ? 'rs.effective_time::text AS effective_time' : 'NULL::text AS effective_time'
        const expiryTimeSelect = hasExpiryTimeColumn ? 'rs.expiry_time::text AS expiry_time' : 'NULL::text AS expiry_time'
        const createdAtSelect = hasCreatedAtColumn
            ? 'rs.created_at'
            : hasCreatedDateColumn
                ? 'rs.created_date::timestamptz AS created_at'
                : 'NULL::timestamptz AS created_at'
        const orgJoin = hasOrgCodeColumn
            ? 'LEFT JOIN organisation_entities oe ON oe.entity_code = rs.org_code'
            : 'LEFT JOIN organisation_entities oe ON 1=0'
        return this.dataSource.query(
            `SELECT rs.id, rs.name, rs.description, rs.effective_date, rs.expiry_date,
                    ${effectiveTimeSelect}, ${expiryTimeSelect},
                    rs.currency, rs.is_active, rs.placement_methods, rs.version,
                    ${createdAtSelect}, rs.created_by,
                                        ${orgCodeSelect},
                    oe.entity_name AS org_name,
                    json_agg(
                      json_build_object('id', ba.id, 'reference', ba.reference)
                    ) FILTER (WHERE ba.id IS NOT NULL) AS binding_authorities
               FROM rating_schedules rs
                             ${orgJoin}
               LEFT JOIN rating_schedule_binding_authorities rsba ON rsba.rating_schedule_id = rs.id
               LEFT JOIN binding_authorities ba ON ba.id = rsba.binding_authority_id
              ${whereClause}
              GROUP BY rs.id, oe.entity_name
              ORDER BY rs.name ASC`,
            params,
        )
    }

    // -------------------------------------------------------------------------
    // GET /api/rating-schedules/:id
    // -------------------------------------------------------------------------
    async findOne(id: number): Promise<any> {
        const hasOrgCodeColumn = await this.hasRatingScheduleOrgCodeColumn()
        const hasBindingAuthoritySectionColumn = await this.hasRatingScheduleColumn('binding_authority_section_id')
        const hasParentScheduleIdColumn = await this.hasRatingScheduleColumn('parent_schedule_id')
        const hasEffectiveTimeColumn = await this.hasRatingScheduleColumn('effective_time')
        const hasExpiryTimeColumn = await this.hasRatingScheduleColumn('expiry_time')
        const hasCreatedAtColumn = await this.hasRatingScheduleColumn('created_at')
        const hasCreatedDateColumn = await this.hasRatingScheduleColumn('created_date')
        const effectiveTimeSelect = hasEffectiveTimeColumn ? 'rs.effective_time::text AS effective_time' : 'NULL::text AS effective_time'
        const expiryTimeSelect = hasExpiryTimeColumn ? 'rs.expiry_time::text AS expiry_time' : 'NULL::text AS expiry_time'
        const orgCodeSelect = hasOrgCodeColumn ? 'rs.org_code' : 'NULL::text AS org_code'
        const bindingAuthoritySectionSelect = hasBindingAuthoritySectionColumn
            ? 'rs.binding_authority_section_id'
            : 'NULL::int AS binding_authority_section_id'
        const parentScheduleIdSelect = hasParentScheduleIdColumn
            ? 'rs.parent_schedule_id'
            : 'NULL::int AS parent_schedule_id'
        const createdAtSelect = hasCreatedAtColumn
            ? 'rs.created_at'
            : hasCreatedDateColumn
                ? 'rs.created_date::timestamptz AS created_at'
                : 'NULL::timestamptz AS created_at'
        const orgNameSelect = hasOrgCodeColumn
            ? `(SELECT oe.entity_name FROM organisation_entities oe WHERE oe.entity_code = rs.org_code LIMIT 1) AS org_name`
            : 'NULL::text AS org_name'
        const rows = await this.dataSource.query(
            `SELECT rs.id, rs.name, rs.description, rs.effective_date, rs.expiry_date,
                    ${effectiveTimeSelect}, ${expiryTimeSelect},
                    rs.currency, rs.is_active, rs.placement_methods, rs.version,
                    ${bindingAuthoritySectionSelect}, ${parentScheduleIdSelect},
                    ${orgCodeSelect},
                    ${orgNameSelect},
                    ${createdAtSelect}, rs.created_by,
                    json_agg(
                      json_build_object('id', ba.id, 'reference', ba.reference)
                    ) FILTER (WHERE ba.id IS NOT NULL) AS binding_authorities
               FROM rating_schedules rs
               LEFT JOIN rating_schedule_binding_authorities rsba ON rsba.rating_schedule_id = rs.id
               LEFT JOIN binding_authorities ba ON ba.id = rsba.binding_authority_id
              WHERE rs.id = $1
              GROUP BY rs.id`,
            [id],
        )
        if (!rows.length) throw new NotFoundException(`Rating schedule ${id} not found`)
        return rows[0]
    }

    // -------------------------------------------------------------------------
    // POST /api/rating-schedules
    // -------------------------------------------------------------------------
    async create(body: Record<string, unknown>, createdBy?: string, orgCode?: string): Promise<any> {
        if (!body['name']) throw new BadRequestException('name is required')

        const hasOrgCodeColumn = await this.hasRatingScheduleOrgCodeColumn()
        const hasEffectiveTimeColumn = await this.hasRatingScheduleColumn('effective_time')
        const hasExpiryTimeColumn = await this.hasRatingScheduleColumn('expiry_time')
        const hasCreatedAtColumn = await this.hasRatingScheduleColumn('created_at')
        const hasCreatedDateColumn = await this.hasRatingScheduleColumn('created_date')
        const columns = [
            'name', 'description', 'effective_date', 'expiry_date', 'currency',
            'placement_methods', 'is_active', 'created_by',
        ]
        const values: any[] = [
            body['name'],
            body['description'] ?? null,
            body['effective_date'] ?? null,
            body['expiry_date'] ?? null,
            body['currency'] ?? 'GBP',
            body['placement_methods'] ?? ['binding_authority'],
            body['is_active'] !== false,
            createdBy ?? null,
        ]
        if (hasEffectiveTimeColumn) {
            columns.push('effective_time')
            values.push(body['effective_time'] ?? null)
        }
        if (hasExpiryTimeColumn) {
            columns.push('expiry_time')
            values.push(body['expiry_time'] ?? null)
        }
        if (hasOrgCodeColumn) {
            columns.push('org_code')
            values.push(orgCode ?? null)
        }
        if (hasCreatedAtColumn) {
            columns.push('created_at')
            values.push(new Date())
        } else if (hasCreatedDateColumn) {
            columns.push('created_date')
            values.push(new Date())
        }
        const placeholders = values.map((_, i) => `$${i + 1}`)
        const rows = await this.dataSource.query(
            `INSERT INTO rating_schedules
               (${columns.join(', ')})
             VALUES (${placeholders.join(', ')})
             RETURNING id`,
            values,
        )
        const scheduleId = rows[0].id

        // Link to binding authorities if provided
        const baIds = body['binding_authority_ids'] as number[] | undefined
        if (baIds && baIds.length > 0) {
            await this.linkBindingAuthorities(scheduleId, baIds)
        }

        return this.findOne(scheduleId)
    }

    // -------------------------------------------------------------------------
    // GET /api/rating-schedules/:id/rules
    // -------------------------------------------------------------------------
    async getRules(scheduleId: number): Promise<any[]> {
        return this.dataSource.query(
            `SELECT id, rating_schedule_id, rule_name, description, field_name, field_source,
                    operator, field_value, rate_percentage, rate_type,
                    coverage_type_id, coverage_sub_type_id,
                    rule_group, group_number, logical_operator, sequence_in_group,
                    priority, is_active
             FROM rating_rules
             WHERE rating_schedule_id = $1
             ORDER BY group_number ASC, sequence_in_group ASC, priority ASC, id ASC`,
            [scheduleId],
        )
    }

    // -------------------------------------------------------------------------
    // PUT /api/rating-schedules/:id
    // -------------------------------------------------------------------------
    async update(id: number, body: Record<string, unknown>): Promise<any> {
        const existing = await this.findOne(id)
        if (!existing) throw new NotFoundException(`Rating schedule ${id} not found`)
        const hasOrgCodeColumn = await this.hasRatingScheduleOrgCodeColumn()
        const hasBindingAuthoritySectionColumn = await this.hasRatingScheduleColumn('binding_authority_section_id')
        const hasParentScheduleIdColumn = await this.hasRatingScheduleColumn('parent_schedule_id')
        const hasEffectiveTimeColumn = await this.hasRatingScheduleColumn('effective_time')
        const hasExpiryTimeColumn = await this.hasRatingScheduleColumn('expiry_time')
        const hasRuleCreatedAtColumn = await this.hasRatingRuleColumn('created_at')
        const hasRuleCreatedDateColumn = await this.hasRatingRuleColumn('created_date')

        const nextEffectiveDate = body['effective_date'] ?? existing.effective_date ?? null
        const nextExpiryDate = body['expiry_date'] ?? existing.expiry_date ?? null
        const nextEffectiveTime = body['effective_time'] ?? existing.effective_time ?? null
        const nextExpiryTime = body['expiry_time'] ?? existing.expiry_time ?? null

        if (!nextEffectiveTime || !nextExpiryTime) {
            throw new BadRequestException('effective_time and expiry_time are required')
        }

        const nextEffectiveDateTime = this.toDateTime(nextEffectiveDate, nextEffectiveTime)
        const nextExpiryDateTime = this.toDateTime(nextExpiryDate, nextExpiryTime)
        if (nextEffectiveDateTime && nextExpiryDateTime && nextEffectiveDateTime > nextExpiryDateTime) {
            throw new BadRequestException('effective_date/effective_time cannot be greater than expiry_date/expiry_time')
        }

        const previousEffectiveDateTime = this.toDateTime(existing.effective_date, existing.effective_time)
        if (previousEffectiveDateTime && nextEffectiveDateTime && nextEffectiveDateTime <= previousEffectiveDateTime) {
            throw new BadRequestException('effective_date/effective_time must be greater than the previous version effective_date/effective_time')
        }

        const previousExpiryDateTime = this.toDateTime(existing.expiry_date, existing.expiry_time)
        const now = new Date()
        if (previousExpiryDateTime && now > previousExpiryDateTime) {
            if (!nextExpiryDateTime || nextExpiryDateTime <= previousExpiryDateTime) {
                throw new BadRequestException('version cannot be created after prior expiry_date/expiry_time unless the new expiry_date/expiry_time is later')
            }
        }

        const rules = body['rules'] as Array<Record<string, unknown>> | undefined
        const version = Number(existing.version ?? 1) + 1

        const insertColumns = [
            'name',
            'description',
            'effective_date',
            'expiry_date',
            'currency',
            'is_active',
            'placement_methods',
            'version',
        ]
        const insertValues: any[] = [
            body['name'] ?? existing.name ?? null,
            body['description'] ?? existing.description ?? null,
            nextEffectiveDate,
            nextExpiryDate,
            body['currency'] ?? existing.currency ?? 'GBP',
            body['is_active'] ?? existing.is_active ?? true,
            body['placement_methods'] ?? existing.placement_methods ?? [],
            version,
        ]
        if (hasParentScheduleIdColumn) {
            insertColumns.push('parent_schedule_id')
            insertValues.push(existing.id)
        }
        if (hasBindingAuthoritySectionColumn) {
            insertColumns.push('binding_authority_section_id')
            insertValues.push(existing.binding_authority_section_id ?? null)
        }
        if (hasEffectiveTimeColumn) {
            insertColumns.push('effective_time')
            insertValues.push(nextEffectiveTime)
        }
        if (hasExpiryTimeColumn) {
            insertColumns.push('expiry_time')
            insertValues.push(nextExpiryTime)
        }
        if (hasOrgCodeColumn) {
            insertColumns.push('org_code')
            insertValues.push(existing.org_code ?? null)
        }
        insertColumns.push('created_by', 'last_modified_date')
        insertValues.push(existing.created_by ?? null, new Date())

        const insertPlaceholders = insertValues.map((_, index) => `$${index + 1}`)
        const insertedRows = await this.dataSource.query(
            `INSERT INTO rating_schedules
               (${insertColumns.join(', ')})
             VALUES (${insertPlaceholders.join(', ')})
             RETURNING id`,
            insertValues,
        )
        const newScheduleId = Number(insertedRows[0]?.id)
        if (!Number.isFinite(newScheduleId)) {
            throw new BadRequestException('Failed to create rating schedule version')
        }

        const baIds = body['binding_authority_ids'] as number[] | undefined
        if (baIds !== undefined && baIds.length > 0) {
            await this.linkBindingAuthorities(newScheduleId, baIds)
        }

        const sourceRules = Array.isArray(rules) ? rules : await this.getRules(id)
        const ruleInsertColumns = [
            'rating_schedule_id', 'rule_group', 'group_number', 'sequence_in_group',
            'logical_operator', 'field_name', 'field_source', 'operator', 'field_value',
            'rate_percentage', 'rate_type', 'is_active', 'priority',
        ]
        if (hasRuleCreatedAtColumn) {
            ruleInsertColumns.push('created_at')
        } else if (hasRuleCreatedDateColumn) {
            ruleInsertColumns.push('created_date')
        }
        for (let i = 0; i < sourceRules.length; i++) {
            const r = sourceRules[i]
            const ruleValues: any[] = [
                newScheduleId,
                r['group_name'] ?? r['rule_group'] ?? null,
                r['group_number'] ?? 1,
                r['sequence_in_group'] ?? i + 1,
                r['logical_operator'] ?? 'AND',
                r['field_name'] ?? '',
                r['field_source'] ?? 'Location',
                r['operator'] ?? '=',
                r['field_value'] ?? null,
                r['rate_percentage'] ?? 0,
                r['rate_type'] ?? 'PERCENTAGE',
                r['is_active'] !== false,
                r['priority'] ?? 100,
            ]
            if (hasRuleCreatedAtColumn || hasRuleCreatedDateColumn) {
                ruleValues.push(new Date())
            }
            const rulePlaceholders = ruleValues.map((_, index) => `$${index + 1}`)
            await this.dataSource.query(
                `INSERT INTO rating_rules
                   (${ruleInsertColumns.join(', ')})
                 VALUES (${rulePlaceholders.join(', ')})`,
                ruleValues,
            )
        }

        const latest = await this.findOne(newScheduleId)
        return {
            ...latest,
            versionCreated: true,
            previousVersion: Number(existing.version ?? 1),
            currentVersion: version,
            previousEffectiveDate: existing.effective_date ?? null,
            previousEffectiveTime: existing.effective_time ?? null,
            previousExpiryDate: existing.expiry_date ?? null,
            previousExpiryTime: existing.expiry_time ?? null,
            currentEffectiveDate: latest.effective_date ?? null,
            currentEffectiveTime: latest.effective_time ?? null,
            currentExpiryDate: latest.expiry_date ?? null,
            currentExpiryTime: latest.expiry_time ?? null,
        }
    }

    // -------------------------------------------------------------------------
    // POST /api/rating-schedules/:id/increment-version
    // -------------------------------------------------------------------------
    async incrementVersion(id: number): Promise<{ version: number }> {
        await this.findOne(id) // throws 404 if not found
        const rows = await this.dataSource.query(
            `UPDATE rating_schedules
                SET version            = COALESCE(version, 1) + 1,
                    last_modified_date = NOW()
              WHERE id = $1
           RETURNING version`,
            [id],
        )
        return { version: rows[0]?.version ?? 1 }
    }

    // -------------------------------------------------------------------------
    // GET /api/rating-schedules/:id/versions
    // -------------------------------------------------------------------------
    async getVersions(id: number): Promise<any[]> {
        await this.findOne(id) // throws 404 if not found
        const hasParentScheduleIdColumn = await this.hasRatingScheduleColumn('parent_schedule_id')
        const hasCreatedAtColumn = await this.hasRatingScheduleColumn('created_at')
        const hasCreatedDateColumn = await this.hasRatingScheduleColumn('created_date')
        const createdAtSelect = hasCreatedAtColumn
            ? 'created_at'
            : hasCreatedDateColumn
                ? 'created_date::timestamptz AS created_at'
                : 'NULL::timestamptz AS created_at'
        const createdAtSelectRs = hasCreatedAtColumn
            ? 'rs.created_at AS created_at'
            : hasCreatedDateColumn
                ? 'rs.created_date::timestamptz AS created_at'
                : 'NULL::timestamptz AS created_at'
        const createdAtSelectChild = hasCreatedAtColumn
            ? 'child.created_at AS created_at'
            : hasCreatedDateColumn
                ? 'child.created_date::timestamptz AS created_at'
                : 'NULL::timestamptz AS created_at'
        if (!hasParentScheduleIdColumn) {
            return this.dataSource.query(
                `SELECT id, name, version, NULL::int AS parent_schedule_id,
                                ${createdAtSelect}, created_by, last_modified_date
                     FROM rating_schedules
                    WHERE id = $1
                    ORDER BY version DESC`,
                [id],
            )
        }
        return this.dataSource.query(
            `WITH RECURSIVE up_chain AS (
                    SELECT id, parent_schedule_id
                        FROM rating_schedules
                     WHERE id = $1
                    UNION ALL
                    SELECT rs.id, rs.parent_schedule_id
                        FROM rating_schedules rs
                        JOIN up_chain uc ON rs.id = uc.parent_schedule_id
                     WHERE uc.parent_schedule_id IS NOT NULL
            ),
            root_node AS (
                    SELECT id
                        FROM up_chain
                     WHERE parent_schedule_id IS NULL
                     ORDER BY id ASC
                     LIMIT 1
            ),
            down_tree AS (
                    SELECT rs.id, rs.parent_schedule_id, rs.name, rs.version, ${createdAtSelectRs}, rs.created_by, rs.last_modified_date
                        FROM rating_schedules rs
                     WHERE rs.id = COALESCE((SELECT id FROM root_node), $1)
                    UNION ALL
                    SELECT child.id, child.parent_schedule_id, child.name, child.version, ${createdAtSelectChild}, child.created_by, child.last_modified_date
                        FROM rating_schedules child
                        JOIN down_tree dt ON child.parent_schedule_id = dt.id
            )
            SELECT id, name, version, parent_schedule_id, created_at, created_by, last_modified_date
                FROM down_tree
             ORDER BY version DESC, id DESC`,
            [id],
        )
    }

    // -------------------------------------------------------------------------
    // POST /api/rating-rules
    // -------------------------------------------------------------------------
    async createRule(body: Record<string, unknown>, createdBy?: string): Promise<any> {
        if (!body['rating_schedule_id']) throw new BadRequestException('rating_schedule_id is required')
        if (!body['field_name']) throw new BadRequestException('field_name is required')
        if (!body['operator']) throw new BadRequestException('operator is required')
        if (body['rate_percentage'] === undefined) throw new BadRequestException('rate_percentage is required')

        const hasRuleCreatedAtColumn = await this.hasRatingRuleColumn('created_at')
        const hasRuleCreatedDateColumn = await this.hasRatingRuleColumn('created_date')
        const insertColumns = [
            'rating_schedule_id', 'rule_name', 'description', 'field_name', 'field_source',
            'operator', 'field_value', 'rate_percentage', 'rate_type',
            'coverage_type_id', 'coverage_sub_type_id',
            'rule_group', 'group_number', 'logical_operator', 'sequence_in_group',
            'priority', 'is_active', 'created_by',
        ]
        const insertValues: any[] = [
            body['rating_schedule_id'],
            body['rule_name'] ?? null,
            body['description'] ?? null,
            body['field_name'],
            body['field_source'] ?? 'Location',
            body['operator'],
            body['field_value'] ?? null,
            body['rate_percentage'],
            body['rate_type'] ?? 'PERCENTAGE',
            body['coverage_type_id'] ?? null,
            body['coverage_sub_type_id'] ?? null,
            body['rule_group'] ?? null,
            body['group_number'] ?? 1,
            body['logical_operator'] ?? 'AND',
            body['sequence_in_group'] ?? 1,
            body['priority'] ?? 100,
            body['is_active'] !== false,
            createdBy ?? null,
        ]
        if (hasRuleCreatedAtColumn) {
            insertColumns.push('created_at')
            insertValues.push(new Date())
        } else if (hasRuleCreatedDateColumn) {
            insertColumns.push('created_date')
            insertValues.push(new Date())
        }
        const placeholders = insertValues.map((_, index) => `$${index + 1}`)
        const rows = await this.dataSource.query(
            `INSERT INTO rating_rules
               (${insertColumns.join(', ')})
             VALUES (${placeholders.join(', ')})
             RETURNING *`,
            insertValues,
        )
        return rows[0]
    }

    // -------------------------------------------------------------------------
    // PUT /api/rating-rules/:id
    // -------------------------------------------------------------------------
    async updateRule(id: number, body: Record<string, unknown>): Promise<any> {
        const hasUpdatedAtColumn = await this.hasRatingRuleColumn('updated_at')
        const hasLastModifiedDateColumn = await this.hasRatingRuleColumn('last_modified_date')
        const updatedAtAssignment = hasUpdatedAtColumn
            ? 'updated_at        = NOW()'
            : hasLastModifiedDateColumn
                ? 'last_modified_date = NOW()'
                : null
        const setClauses = [
            'rule_name         = COALESCE($1, rule_name)',
            'description       = COALESCE($2, description)',
            'field_name        = COALESCE($3, field_name)',
            'field_source      = COALESCE($4, field_source)',
            'operator          = COALESCE($5, operator)',
            'field_value       = COALESCE($6, field_value)',
            'rate_percentage   = COALESCE($7, rate_percentage)',
            'rate_type         = COALESCE($8, rate_type)',
            'coverage_type_id  = COALESCE($9, coverage_type_id)',
            'coverage_sub_type_id = COALESCE($10, coverage_sub_type_id)',
            'rule_group        = COALESCE($11, rule_group)',
            'group_number      = COALESCE($12, group_number)',
            'logical_operator  = COALESCE($13, logical_operator)',
            'sequence_in_group = COALESCE($14, sequence_in_group)',
            'priority          = COALESCE($15, priority)',
            'is_active         = COALESCE($16, is_active)',
        ]
        if (updatedAtAssignment) {
            setClauses.push(updatedAtAssignment)
        }
        const rows = await this.dataSource.query(
            `UPDATE rating_rules
                SET ${setClauses.join(',\n                    ')}
              WHERE id = $17
           RETURNING *`,
            [
                body['rule_name'] ?? null,
                body['description'] ?? null,
                body['field_name'] ?? null,
                body['field_source'] ?? null,
                body['operator'] ?? null,
                body['field_value'] ?? null,
                body['rate_percentage'] ?? null,
                body['rate_type'] ?? null,
                body['coverage_type_id'] ?? null,
                body['coverage_sub_type_id'] ?? null,
                body['rule_group'] ?? null,
                body['group_number'] ?? null,
                body['logical_operator'] ?? null,
                body['sequence_in_group'] ?? null,
                body['priority'] ?? null,
                body['is_active'] ?? null,
                id,
            ],
        )
        if (!rows.length) throw new NotFoundException(`Rating rule ${id} not found`)
        return rows[0]
    }

    // -------------------------------------------------------------------------
    // DELETE /api/rating-rules/:id
    // -------------------------------------------------------------------------
    async deleteRule(id: number): Promise<{ success: true }> {
        await this.dataSource.query(`DELETE FROM rating_rules WHERE id = $1`, [id])
        return { success: true }
    }

    // -------------------------------------------------------------------------
    // POST /api/rating/calculate
    // Calculates premiums for all location_coverages on a quote and persists
    // results to location_premium_calculations.
    // -------------------------------------------------------------------------
    async calculate(body: Record<string, unknown>, userName: string): Promise<any> {
        const quoteId = Number(body['quoteId'])
        if (!Number.isFinite(quoteId)) throw new BadRequestException('quoteId is required')

        const scheduleId = body['scheduleId'] ? Number(body['scheduleId']) : null
        const dryRun = body['dryRun'] === true

        const schedule = await this.resolveScheduleForQuote(quoteId, scheduleId)
        if (!schedule) throw new NotFoundException('No rating schedule found for this quote')

        const rules: any[] = await this.dataSource.query(
            `SELECT * FROM rating_rules
              WHERE rating_schedule_id = $1 AND (is_active IS TRUE OR is_active IS NULL)
              ORDER BY group_number ASC, sequence_in_group ASC, priority ASC, id ASC`,
            [schedule.id],
        )

        const locations = await this.loadQuoteLocations(quoteId)
        if (!locations.length) {
            return {
                quoteId,
                schedule,
                summary: { locations: 0, grossAnnualPremium: 0, netAnnualPremium: 0 },
                items: [],
            }
        }

        const results: any[] = []
        let grossTotal = 0

        for (const row of locations) {
            const sumInsured = this.toNumber(row['sum_insured'] ?? row['sumInsured']) ?? 0
            const coverageTypeId = row['coverage_type_id'] ?? row['coverageTypeId'] ?? null

            const matchingRules = rules.filter(
                r => !r.coverage_type_id || String(r.coverage_type_id) === String(coverageTypeId),
            )

            let matchedRule: any = null
            for (const rule of matchingRules) {
                if (this.ruleMatches(row, rule)) { matchedRule = rule; break }
            }

            const rate = this.toNumber(matchedRule?.rate_percentage) ?? 0
            const grossPremium = Math.round(sumInsured * (rate / 100) * 100) / 100
            grossTotal += grossPremium

            results.push({
                locationId: row['location_id'] ?? row['locationId'] ?? row['id'],
                locationCoverageId: row['id'],
                coverageTypeId: coverageTypeId,
                coverageSubTypeId: row['coverage_sub_type_id'] ?? row['coverageSubTypeId'] ?? null,
                coverageTypeName: row['coverage_type_name'] ?? null,
                coverageSubTypeName: row['coverage_sub_type_name'] ?? null,
                country: row['country'] ?? null,
                state: row['state'] ?? null,
                city: row['city'] ?? null,
                zipCode: row['zip_code'] ?? row['zipCode'] ?? null,
                sumInsured,
                currency: row['currency'] ?? schedule.currency ?? 'GBP',
                ratingRuleId: matchedRule?.id ?? null,
                ratePercentage: rate,
                grossAnnualPremium: grossPremium,
                netAnnualPremium: grossPremium,
                calculationNotes: matchedRule
                    ? `Matched rule ${matchedRule.id}`
                    : 'No matching rule',
            })
        }

        if (!dryRun) {
            await this.dataSource.query(
                `DELETE FROM location_premium_calculations WHERE quote_id = $1 AND rating_schedule_id = $2`,
                [quoteId, schedule.id],
            )
            for (const item of results) {
                await this.dataSource.query(
                    `INSERT INTO location_premium_calculations
                       (quote_id, section_id, coverage_id, coverage_detail_id, coverage_sub_type_id,
                        location_id, rating_schedule_id, rating_rule_id, sum_insured, currency,
                        rate_percentage, gross_annual_premium, fixed_fees_total, discounts_total,
                        net_annual_premium, calculation_notes, calculated_by, calculated_at)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW())`,
                    [
                        quoteId, null, null,
                        item.coverageTypeId, item.coverageSubTypeId,
                        item.locationId, schedule.id, item.ratingRuleId,
                        item.sumInsured, item.currency, item.ratePercentage,
                        item.grossAnnualPremium, 0, 0,
                        item.netAnnualPremium, item.calculationNotes, userName,
                    ],
                )
            }
        }

        return {
            quoteId,
            schedule,
            summary: {
                locations: results.length,
                grossAnnualPremium: Math.round(grossTotal * 100) / 100,
                netAnnualPremium: Math.round(grossTotal * 100) / 100,
            },
            items: results,
        }
    }

    // -------------------------------------------------------------------------
    // POST /api/rating/calculate-location
    // Calculate and persist rates for a single location's coverages.
    // -------------------------------------------------------------------------
    async calculateLocation(body: Record<string, unknown>, userName: string): Promise<any> {
        const locationId = Number(body['locationId'] ?? body['location_id'])
        const scheduleId = Number(body['ratingScheduleId'] ?? body['rating_schedule_id'])
        if (!Number.isFinite(locationId) || !Number.isFinite(scheduleId)) {
            throw new BadRequestException('locationId and ratingScheduleId are required')
        }

        const locRows = await this.dataSource.query(
            `SELECT l.*, l.zip_code AS "zipCode"
               FROM locations l WHERE l.id = $1`,
            [locationId],
        )
        if (!locRows.length) throw new NotFoundException(`Location ${locationId} not found`)
        const location = locRows[0]

        const rules: any[] = await this.dataSource.query(
            `SELECT * FROM rating_rules
              WHERE rating_schedule_id = $1 AND (is_active IS TRUE OR is_active IS NULL)
              ORDER BY group_number ASC, sequence_in_group ASC, priority ASC`,
            [scheduleId],
        )

        const matchedRules = rules.filter(r => this.ruleMatchesLocation(location, r))

        const coverages: any[] = await this.dataSource.query(
            `SELECT id, sum_insured, currency, coverage_type_id, coverage_sub_type_id
               FROM location_coverages WHERE location_id = $1`,
            [locationId],
        )

        let updated = 0
        const calcResults: any[] = []

        for (const cov of coverages) {
            const rule = matchedRules.find(
                r =>
                    (!r.coverage_type_id || String(r.coverage_type_id) === String(cov.coverage_type_id)) &&
                    (!r.coverage_sub_type_id || String(r.coverage_sub_type_id) === String(cov.coverage_sub_type_id)),
            )
            if (!rule) continue

            const sumInsured = this.toNumber(cov.sum_insured) ?? 0
            const premium = Math.round(sumInsured * rule.rate_percentage * 100) / 100

            await this.dataSource.query(
                `UPDATE location_coverages
                    SET base_rate = $1, final_rate = $1, premium = $2,
                        annual_rated_gross_premium = $2,
                        rating_schedule_id = $3, calculation_method = 'rating_rules',
                        last_calculated = NOW()
                  WHERE id = $4`,
                [rule.rate_percentage, premium, scheduleId, cov.id],
            )
            updated++
            calcResults.push({ coverage_id: cov.id, sum_insured: sumInsured, rate: rule.rate_percentage, premium, currency: cov.currency })
        }

        return {
            success: true,
            location_id: locationId,
            matched_rules: matchedRules.length,
            coverages_updated: updated,
            results: calcResults,
        }
    }

    // -------------------------------------------------------------------------
    // POST /api/rating/calculate-quote
    // Calculate rates for all (or section-filtered) locations in a quote.
    // -------------------------------------------------------------------------
    async calculateQuote(body: Record<string, unknown>, userName: string): Promise<any> {
        const quoteId = Number(body['quoteId'] ?? body['quote_id'])
        const scheduleId = Number(body['ratingScheduleId'] ?? body['rating_schedule_id'])
        const sectionId = body['sectionId'] ?? body['section_id']
            ? Number(body['sectionId'] ?? body['section_id'])
            : null

        if (!Number.isFinite(quoteId) || !Number.isFinite(scheduleId)) {
            throw new BadRequestException('quoteId and ratingScheduleId are required')
        }

        let locationRows: any[]
        if (sectionId) {
            locationRows = await this.dataSource.query(
                `SELECT DISTINCT l.id
                   FROM locations l
                   INNER JOIN location_coverages lc ON lc.location_id = l.id
                  WHERE l.quote_id = $1 AND lc.section_id = $2`,
                [quoteId, sectionId],
            )
        } else {
            locationRows = await this.dataSource.query(
                `SELECT id FROM locations WHERE quote_id = $1`,
                [quoteId],
            )
        }

        let totalPremium = 0
        let locationsWithMatches = 0

        for (const loc of locationRows) {
            const r = await this.calculateLocation(
                { locationId: loc.id, ratingScheduleId: scheduleId },
                userName,
            )
            totalPremium += r.results.reduce((s: number, c: any) => s + (c.premium ?? 0), 0)
            if (r.matched_rules > 0) locationsWithMatches++
        }

        return {
            success: true,
            quote_id: quoteId,
            section_id: sectionId,
            rating_schedule_id: scheduleId,
            locations_rated: locationRows.length,
            locations_with_matches: locationsWithMatches,
            locations_without_matches: locationRows.length - locationsWithMatches,
            total_premium: Math.round(totalPremium * 100) / 100,
        }
    }

    // =========================================================================
    // Private helpers (ported from BackUp rating-api.js)
    // =========================================================================

    private async resolveScheduleForQuote(quoteId: number, scheduleId: number | null): Promise<any> {
        if (scheduleId) {
            const rows = await this.dataSource.query(
                `SELECT * FROM rating_schedules WHERE id = $1`, [scheduleId],
            )
            return rows[0] ?? null
        }

        const quoteRows = await this.dataSource.query(
            `SELECT id, placement_method FROM quotes WHERE id = $1`, [quoteId],
        )
        const quote = quoteRows[0]
        if (!quote) return null

        const placement = this.normalizePlacementMethod(quote.placement_method)

        if (placement === 'binding_authority') {
            const baRows = await this.dataSource.query(
                `SELECT ba.id FROM binding_authorities ba
                   INNER JOIN submissions s ON s.id = (SELECT submission_id FROM quotes WHERE id = $1)
                  WHERE ba.submission_id = s.id
                  ORDER BY ba.id DESC LIMIT 1`,
                [quoteId],
            )
            if (baRows[0]) {
                const schedRows = await this.dataSource.query(
                    `SELECT rs.*
                       FROM rating_schedules rs
                       INNER JOIN rating_schedule_binding_authorities rsba ON rsba.rating_schedule_id = rs.id
                      WHERE rsba.binding_authority_id = $1
                        AND (rs.is_active IS TRUE OR rs.is_active IS NULL)
                        AND (rs.effective_date IS NULL OR rs.effective_date <= CURRENT_DATE)
                        AND (rs.expiry_date  IS NULL OR rs.expiry_date  >= CURRENT_DATE)
                      ORDER BY rs.effective_date DESC NULLS LAST, rs.id DESC
                      LIMIT 1`,
                    [baRows[0].id],
                )
                if (schedRows[0]) return schedRows[0]
            }
        }

        const schedRows = await this.dataSource.query(
            `SELECT * FROM rating_schedules
              WHERE (is_active IS TRUE OR is_active IS NULL)
                AND (effective_date IS NULL OR effective_date <= CURRENT_DATE)
                AND (expiry_date   IS NULL OR expiry_date   >= CURRENT_DATE)
                AND $1 = ANY(placement_methods)
              ORDER BY effective_date DESC NULLS LAST, id DESC
              LIMIT 1`,
            [placement || 'open_market'],
        )
        return schedRows[0] ?? null
    }

    private async loadQuoteLocations(quoteId: number): Promise<any[]> {
        return this.dataSource.query(
            `SELECT lc.id, lc.location_id, lc.sum_insured, lc.currency,
                    lc.coverage_type_id, lc.coverage_sub_type_id,
                    lc.coverage_type AS coverage_type_name,
                    lc.coverage_sub_type AS coverage_sub_type_name,
                    COALESCE(q.method_of_placement, q.placement_method) AS quote_placement_method,
                    q.inception_date AS quote_inception_date,
                    q.inception_time AS quote_inception_time,
                    q.expiry_date AS quote_expiry_date,
                    q.expiry_time AS quote_expiry_time,
                    q.status AS quote_status,
                    q.business_type AS quote_business_type,
                    q.contract_type AS quote_contract_type,
                    q.insured AS quote_insured,
                    p.policy_inception_date,
                    p.policy_expiry_date,
                    p.policy_inception_time,
                    p.policy_expiry_time,
                    p.policy_status,
                    p.policy_business_type,
                    p.policy_contract_type,
                    p.policy_insured,
                    p.policy_placement_method,
                                        qs.class_of_business AS section_class_of_business,
                                        qs.inception_date AS section_inception_date,
                                        qs.effective_date AS section_effective_date,
                                        qs.expiry_date AS section_expiry_date,
                    qs.inception_time AS section_inception_time,
                    qs.effective_time AS section_effective_time,
                    qs.expiry_time AS section_expiry_time,
                                        qs.days_on_cover AS section_days_on_cover,
                                        qs.limit_currency AS section_limit_currency,
                                        qs.limit_amount AS section_limit_amount,
                                        qs.limit_loss_qualifier AS section_limit_loss_qualifier,
                                        qs.excess_currency AS section_excess_currency,
                                        qs.excess_amount AS section_excess_amount,
                                        qs.excess_loss_qualifier AS section_excess_loss_qualifier,
                                        qs.sum_insured_currency AS section_sum_insured_currency,
                                        qs.sum_insured AS section_sum_insured_amount,
                                        qs.premium_currency AS section_premium_currency,
                                        qs.gross_premium AS section_gross_premium,
                                        qs.annual_net_premium AS section_annual_net_premium,
                                        (qs.payload->>'written_order') AS section_written_order,
                                        (qs.payload->>'signed_order') AS section_signed_order,
                                        qs.time_basis AS section_time_basis,
                                        qs.written_order_basis AS section_written_order_basis,
                                        qs.signed_order_basis AS section_signed_order_basis,
                                        qs.written_line_total AS section_written_line_total,
                                        qs.signed_line_total AS section_signed_line_total,
                                        qs.delegated_authority_ref AS section_delegated_authority_ref,
                                        qs.delegated_authority_section_ref AS section_delegated_authority_section_ref,
                                        qsc.coverage AS coverage_name,
                                        qsc.class_of_business AS coverage_class_of_business,
                                        qsc.effective_date AS coverage_effective_date,
                                        qsc.expiry_date AS coverage_expiry_date,
                                        qsc.days_on_cover AS coverage_days_on_cover,
                                        qsc.limit_currency AS coverage_limit_currency,
                                        qsc.limit_amount AS coverage_limit_amount,
                                        qsc.limit_loss_qualifier AS coverage_limit_loss_qualifier,
                                        qsc.excess_currency AS coverage_excess_currency,
                                        qsc.excess_amount AS coverage_excess_amount,
                                        qsc.sum_insured_currency AS coverage_sum_insured_currency,
                                        qsc.sum_insured AS coverage_sum_insured,
                                        qsc.premium_currency AS coverage_premium_currency,
                                        qsc.gross_premium AS coverage_gross_premium,
                                        qsc.net_premium AS coverage_net_premium,
                                        qsc.tax_receivable AS coverage_tax_receivable,
                    l.country, l.state, l.city,
                    l.address1, l.address2, l.zip_code
               FROM location_coverages lc
               INNER JOIN quotes q ON q.id = lc.quote_id
               INNER JOIN locations l ON l.id = lc.location_id
                             LEFT JOIN LATERAL (
                                SELECT pol.inception_date AS policy_inception_date,
                                       pol.inception_time AS policy_inception_time,
                                       pol.expiry_date AS policy_expiry_date,
                                       pol.expiry_time AS policy_expiry_time,
                                       pol.status AS policy_status,
                                       pol.business_type AS policy_business_type,
                                       pol.contract_type AS policy_contract_type,
                                       pol.insured AS policy_insured,
                                       COALESCE(pol.payload->>'method_of_placement', q.method_of_placement, q.placement_method) AS policy_placement_method
                                  FROM policies pol
                                 WHERE pol.quote_id = lc.quote_id
                                 ORDER BY pol.id DESC
                                 LIMIT 1
                             ) p ON TRUE
                             LEFT JOIN quote_sections qs ON qs.id = lc.section_id
                                    LEFT JOIN LATERAL (
                                        SELECT qsc.*
                                          FROM quote_section_coverages qsc
                                         WHERE qsc.quote_id = lc.quote_id
                                           AND qsc.section_id = lc.section_id
                                           AND qsc.deleted_at IS NULL
                                           AND (
                                               qsc.coverage = lc.coverage_type
                                               OR lc.coverage_type IS NULL
                                           )
                                         ORDER BY qsc.id DESC
                                         LIMIT 1
                                    ) qsc ON TRUE
              WHERE lc.quote_id = $1
                AND lc.version_id = (
                      SELECT MAX(version_id) FROM location_coverages WHERE quote_id = $1
                    )
              ORDER BY lc.location_id, lc.id`,
            [quoteId],
        )
    }

    /** Find matching rated field value for a location coverage row */
    private getFieldValue(row: any, fieldName: string): any {
        const n = this.normalizeFieldName(fieldName)
        if (n === 'quote_policy_method_of_placement') return row['quote_placement_method'] ?? row['policy_placement_method'] ?? ''
        if (n === 'quote_policy_inception_date') return row['quote_inception_date'] ?? row['policy_inception_date'] ?? ''
        if (n === 'quote_policy_inception_time') return row['quote_inception_time'] ?? row['policy_inception_time'] ?? ''
        if (n === 'quote_policy_expiry_date') return row['quote_expiry_date'] ?? row['policy_expiry_date'] ?? ''
        if (n === 'quote_policy_expiry_time') return row['quote_expiry_time'] ?? row['policy_expiry_time'] ?? ''
        if (n === 'quote_policy_status') return row['quote_status'] ?? row['policy_status'] ?? ''
        if (n === 'quote_policy_business_type') return row['quote_business_type'] ?? row['policy_business_type'] ?? ''
        if (n === 'quote_policy_contract_type') return row['quote_contract_type'] ?? row['policy_contract_type'] ?? ''
        if (n === 'quote_policy_insured') return row['quote_insured'] ?? row['policy_insured'] ?? ''
        if (n === 'quote_placement_method' || n === 'method_of_placement' || n === 'placement_method') return row['quote_placement_method'] ?? row['policy_placement_method'] ?? ''
        if (n === 'quote_inception_date') return row['quote_inception_date'] ?? row['policy_inception_date'] ?? ''
        if (n === 'quote_inception_time') return row['quote_inception_time'] ?? row['policy_inception_time'] ?? ''
        if (n === 'quote_expiry_date') return row['quote_expiry_date'] ?? row['policy_expiry_date'] ?? ''
        if (n === 'quote_expiry_time') return row['quote_expiry_time'] ?? row['policy_expiry_time'] ?? ''
        if (n === 'quote_status') return row['quote_status'] ?? row['policy_status'] ?? ''
        if (n === 'quote_business_type') return row['quote_business_type'] ?? row['policy_business_type'] ?? ''
        if (n === 'quote_contract_type') return row['quote_contract_type'] ?? row['policy_contract_type'] ?? ''
        if (n === 'quote_insured') return row['quote_insured'] ?? row['policy_insured'] ?? ''
        if (n === 'policy_placement_method') return row['policy_placement_method'] ?? row['quote_placement_method'] ?? ''
        if (n === 'policy_inception_date') return row['policy_inception_date'] ?? row['quote_inception_date'] ?? ''
        if (n === 'policy_inception_time') return row['policy_inception_time'] ?? row['quote_inception_time'] ?? ''
        if (n === 'policy_expiry_date') return row['policy_expiry_date'] ?? row['quote_expiry_date'] ?? ''
        if (n === 'policy_expiry_time') return row['policy_expiry_time'] ?? row['quote_expiry_time'] ?? ''
        if (n === 'policy_status') return row['policy_status'] ?? row['quote_status'] ?? ''
        if (n === 'policy_business_type') return row['policy_business_type'] ?? row['quote_business_type'] ?? ''
        if (n === 'policy_contract_type') return row['policy_contract_type'] ?? row['quote_contract_type'] ?? ''
        if (n === 'policy_insured') return row['policy_insured'] ?? row['quote_insured'] ?? ''
        if (n === 'section_class_of_business') return row['section_class_of_business'] ?? ''
        if (n === 'section_inception_date') return row['section_inception_date'] ?? ''
        if (n === 'section_effective_date') return row['section_effective_date'] ?? ''
        if (n === 'section_expiry_date') return row['section_expiry_date'] ?? ''
        if (n === 'section_inception_time') return row['section_inception_time'] ?? ''
        if (n === 'section_effective_time') return row['section_effective_time'] ?? ''
        if (n === 'section_expiry_time') return row['section_expiry_time'] ?? ''
        if (n === 'section_days_on_cover') return row['section_days_on_cover'] ?? ''
        if (n === 'section_limit_currency') return row['section_limit_currency'] ?? ''
        if (n === 'section_limit_amount') return row['section_limit_amount'] ?? ''
        if (n === 'section_limit_loss_qualifier') return row['section_limit_loss_qualifier'] ?? ''
        if (n === 'section_excess_currency') return row['section_excess_currency'] ?? ''
        if (n === 'section_excess_amount') return row['section_excess_amount'] ?? ''
        if (n === 'section_excess_loss_qualifier') return row['section_excess_loss_qualifier'] ?? ''
        if (n === 'section_sum_insured_currency') return row['section_sum_insured_currency'] ?? ''
        if (n === 'section_sum_insured_amount') return row['section_sum_insured_amount'] ?? ''
        if (n === 'section_premium_currency') return row['section_premium_currency'] ?? ''
        if (n === 'section_gross_premium') return row['section_gross_premium'] ?? ''
        if (n === 'section_annual_net_premium') return row['section_annual_net_premium'] ?? ''
        if (n === 'section_written_order') return row['section_written_order'] ?? ''
        if (n === 'section_signed_order') return row['section_signed_order'] ?? ''
        if (n === 'section_time_basis') return row['section_time_basis'] ?? ''
        if (n === 'section_written_order_basis') return row['section_written_order_basis'] ?? ''
        if (n === 'section_signed_order_basis') return row['section_signed_order_basis'] ?? ''
        if (n === 'section_written_line_total') return row['section_written_line_total'] ?? ''
        if (n === 'section_signed_line_total') return row['section_signed_line_total'] ?? ''
        if (n === 'section_delegated_authority_ref') return row['section_delegated_authority_ref'] ?? ''
        if (n === 'section_delegated_authority_section_ref') return row['section_delegated_authority_section_ref'] ?? ''
        if (n === 'coverage_name') return row['coverage_name'] ?? ''
        if (n === 'coverage_class_of_business') return row['coverage_class_of_business'] ?? ''
        if (n === 'coverage_effective_date') return row['coverage_effective_date'] ?? ''
        if (n === 'coverage_expiry_date') return row['coverage_expiry_date'] ?? ''
        if (n === 'coverage_days_on_cover') return row['coverage_days_on_cover'] ?? ''
        if (n === 'coverage_limit_currency') return row['coverage_limit_currency'] ?? ''
        if (n === 'coverage_limit_amount') return row['coverage_limit_amount'] ?? ''
        if (n === 'coverage_limit_loss_qualifier') return row['coverage_limit_loss_qualifier'] ?? ''
        if (n === 'coverage_excess_currency') return row['coverage_excess_currency'] ?? ''
        if (n === 'coverage_excess_amount') return row['coverage_excess_amount'] ?? ''
        if (n === 'coverage_sum_insured_currency') return row['coverage_sum_insured_currency'] ?? ''
        if (n === 'coverage_sum_insured') return row['coverage_sum_insured'] ?? ''
        if (n === 'coverage_premium_currency') return row['coverage_premium_currency'] ?? ''
        if (n === 'coverage_gross_premium') return row['coverage_gross_premium'] ?? ''
        if (n === 'coverage_net_premium') return row['coverage_net_premium'] ?? ''
        if (n === 'coverage_tax_receivable') return row['coverage_tax_receivable'] ?? ''
        if (n === 'coverage_detail_currency') return row['currency'] ?? ''
        if (n === 'coverage_detail_sum_insured') return row['sum_insured'] ?? row['sumInsured'] ?? ''
        if (n === 'coverage_currency') return row['currency'] ?? ''
        if (n === 'coverage_sum_insured') return row['sum_insured'] ?? row['sumInsured'] ?? ''
        if (n === 'coverage_type') return row['coverage_type_name'] ?? row['coverage_type'] ?? ''
        if (n === 'coverage_sub_type') return row['coverage_sub_type_name'] ?? row['coverage_sub_type'] ?? ''
        if (['postcode', 'zip', 'zip_code', 'zipcode'].includes(n)) return row['zip_code'] ?? row['zipCode'] ?? ''
        if (n === 'country') return row['country'] ?? ''
        if (['subdivision', 'state', 'province', 'region'].includes(n)) return row['state'] ?? ''
        if (n === 'city') return row['city'] ?? ''
        if (['sum_insured', 'suminsured'].includes(n)) return row['sum_insured'] ?? row['sumInsured']
        if (['construction_type', 'constructiontype'].includes(n)) return row['construction_type'] ?? row['constructionType'] ?? ''
        if (n === 'occupancy') return row['occupancy'] ?? ''
        if (['year_built', 'yearbuilt'].includes(n)) return row['year_built'] ?? row['yearBuilt'] ?? ''
        if (['coverage_detail', 'coverage_type', 'coverage'].includes(n)) return row['coverage_type_name'] ?? row['coverage_type'] ?? ''
        if (['coverage_detail_sub_type', 'coverage_sub_type', 'coverage_subtype'].includes(n)) return row['coverage_sub_type_name'] ?? row['coverage_sub_type'] ?? ''
        return row[n] ?? ''
    }

    private ruleMatches(row: any, rule: any): boolean {
        const operator = String(rule.operator ?? '=').toUpperCase()
        const fieldValue = this.getFieldValue(row, rule.field_name)
        const targetValue = rule.field_value

        if (['>', '<', '>=', '<=', '='].includes(operator)) {
            const left = this.toNumber(fieldValue)
            const right = this.toNumber(targetValue)
            if (left == null || right == null) {
                if (operator === '=') return String(fieldValue ?? '').toLowerCase() === String(targetValue ?? '').toLowerCase()
                return false
            }
            if (operator === '>') return left > right
            if (operator === '<') return left < right
            if (operator === '>=') return left >= right
            if (operator === '<=') return left <= right
            return left === right
        }

        const fieldText = String(fieldValue ?? '').toLowerCase()
        const list = this.splitList(targetValue).map(v => v.toLowerCase())

        if (operator === '!=') return fieldText !== String(targetValue ?? '').toLowerCase()
        if (operator === 'IN') return list.includes(fieldText)
        if (operator === 'STARTS_WITH') return list.length > 0 ? list.some(v => fieldText.startsWith(v)) : fieldText.startsWith(String(targetValue ?? '').toLowerCase())
        if (operator === 'ENDS_WITH') return list.length > 0 ? list.some(v => fieldText.endsWith(v)) : fieldText.endsWith(String(targetValue ?? '').toLowerCase())
        if (operator === 'CONTAINS') return list.length > 0 ? list.some(v => fieldText.includes(v)) : fieldText.includes(String(targetValue ?? '').toLowerCase())
        return fieldText === String(targetValue ?? '').toLowerCase()
    }

    /** Simplified rule matching for a raw location row (calculate-location) */
    private ruleMatchesLocation(location: any, rule: any): boolean {
        const op = String(rule.operator ?? '=').toUpperCase()
        const fieldValue = location[rule.field_name] ?? location['zip_code']
        const targetValue = rule.field_value

        if (op === 'EQUALS' || op === '=') return String(fieldValue) === String(targetValue)
        if (op === 'STARTS_WITH') return fieldValue && String(fieldValue).startsWith(String(targetValue))
        if (op === 'ENDS_WITH') return fieldValue && String(fieldValue).endsWith(String(targetValue))
        if (op === 'CONTAINS') return fieldValue && String(fieldValue).includes(String(targetValue))
        if (op === 'IN' || op === 'IN_LIST') {
            const list = String(targetValue).split(',').map((v: string) => v.trim())
            return list.includes(String(fieldValue))
        }
        if (op === 'GREATER_THAN' || op === '>') return parseFloat(fieldValue) > parseFloat(targetValue)
        if (op === 'LESS_THAN' || op === '<') return parseFloat(fieldValue) < parseFloat(targetValue)
        if (op === '>=' || op === 'GTE') return parseFloat(fieldValue) >= parseFloat(targetValue)
        if (op === '<=' || op === 'LTE') return parseFloat(fieldValue) <= parseFloat(targetValue)
        return false
    }

    private async linkBindingAuthorities(scheduleId: number, baIds: number[]): Promise<void> {
        for (const baId of baIds) {
            const sections = await this.dataSource.query(
                `SELECT id FROM binding_authority_sections WHERE binding_authority_id = $1 LIMIT 1`,
                [baId],
            )
            if (sections.length) {
                await this.dataSource.query(
                    `INSERT INTO rating_schedule_binding_authorities
                       (rating_schedule_id, binding_authority_id, binding_authority_section_id)
                     VALUES ($1, $2, $3)
                     ON CONFLICT DO NOTHING`,
                    [scheduleId, baId, sections[0].id],
                )
            }
        }
    }

    private normalizePlacementMethod(value: string): string {
        return String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')
    }

    private normalizeFieldName(value: string): string {
        return String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')
    }

    private toNumber(value: any): number | null {
        const n = Number(value)
        return Number.isFinite(n) ? n : null
    }

    private splitList(value: any): string[] {
        return String(value ?? '').split(',').map(v => v.trim()).filter(Boolean)
    }

    private toDateTime(dateValue: any, timeValue: any): Date | null {
        const dateText = String(dateValue ?? '').trim()
        const timeText = String(timeValue ?? '').trim()
        if (!dateText || !timeText) return null
        const normalizedDate = /^\d{4}-\d{2}-\d{2}$/.test(dateText) ? dateText : dateText.slice(0, 10)
        const normalizedTime = /^\d{2}:\d{2}(:\d{2})?$/.test(timeText) ? timeText : ''
        if (!normalizedTime) return null
        const hhmmss = normalizedTime.length === 5 ? `${normalizedTime}:00` : normalizedTime
        const dt = new Date(`${normalizedDate}T${hhmmss}`)
        return isNaN(dt.getTime()) ? null : dt
    }

    private normalizeRulesForComparison(rules: Array<Record<string, unknown>> | null | undefined): Array<Record<string, unknown>> {
        return (rules ?? [])
            .map((r, index) => ({
                group_number: Number(r['group_number'] ?? 1),
                sequence_in_group: Number(r['sequence_in_group'] ?? index + 1),
                logical_operator: (r['logical_operator'] ?? null) as string | null,
                field_name: String(r['field_name'] ?? '').trim(),
                operator: String(r['operator'] ?? '=').trim().toUpperCase(),
                field_value: String(r['field_value'] ?? '').trim(),
                rate_percentage: Number(r['rate_percentage'] ?? 0),
            }))
            .sort((a, b) => {
                const g = Number(a['group_number']) - Number(b['group_number'])
                if (g !== 0) return g
                const s = Number(a['sequence_in_group']) - Number(b['sequence_in_group'])
                if (s !== 0) return s
                return String(a['field_name']).localeCompare(String(b['field_name']))
            })
    }
}
