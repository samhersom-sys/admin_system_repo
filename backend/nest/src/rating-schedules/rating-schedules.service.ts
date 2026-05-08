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
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) { }

    // -------------------------------------------------------------------------
    // GET /api/rating-schedules
    // -------------------------------------------------------------------------
    async findAll(): Promise<any[]> {
        return this.dataSource.query(
            `SELECT rs.id, rs.name, rs.description, rs.effective_date, rs.expiry_date,
                    rs.currency, rs.is_active, rs.placement_methods, rs.version,
                    rs.created_at, rs.created_by,
                    json_agg(
                      json_build_object('id', ba.id, 'reference', ba.reference)
                    ) FILTER (WHERE ba.id IS NOT NULL) AS binding_authorities
               FROM rating_schedules rs
               LEFT JOIN rating_schedule_binding_authorities rsba ON rsba.rating_schedule_id = rs.id
               LEFT JOIN binding_authorities ba ON ba.id = rsba.binding_authority_id
              GROUP BY rs.id
              ORDER BY rs.name ASC`,
        )
    }

    // -------------------------------------------------------------------------
    // GET /api/rating-schedules/:id
    // -------------------------------------------------------------------------
    async findOne(id: number): Promise<any> {
        const rows = await this.dataSource.query(
            `SELECT rs.id, rs.name, rs.description, rs.effective_date, rs.expiry_date,
                    rs.currency, rs.is_active, rs.placement_methods, rs.version,
                    rs.created_at, rs.created_by,
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
    async create(body: Record<string, unknown>, createdBy?: string): Promise<any> {
        if (!body['name']) throw new BadRequestException('name is required')

        const rows = await this.dataSource.query(
            `INSERT INTO rating_schedules
               (name, description, effective_date, expiry_date, currency,
                placement_methods, is_active, created_by, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
             RETURNING id`,
            [
                body['name'],
                body['description'] ?? null,
                body['effective_date'] ?? null,
                body['expiry_date'] ?? null,
                body['currency'] ?? 'GBP',
                body['placement_methods'] ?? ['binding_authority'],
                body['is_active'] !== false,
                createdBy ?? null,
            ],
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

        await this.dataSource.query(
            `UPDATE rating_schedules
             SET name               = COALESCE($1, name),
                 description        = COALESCE($2, description),
                 effective_date     = COALESCE($3, effective_date),
                 expiry_date        = COALESCE($4, expiry_date),
                 is_active          = COALESCE($5, is_active),
                 placement_methods  = COALESCE($6, placement_methods),
                 updated_at         = NOW()
             WHERE id = $7`,
            [
                body['name'] ?? null,
                body['description'] ?? null,
                body['effective_date'] ?? null,
                body['expiry_date'] ?? null,
                body['is_active'] ?? null,
                body['placement_methods'] ?? null,
                id,
            ],
        )

        // Re-link BAs if provided
        const baIds = body['binding_authority_ids'] as number[] | undefined
        if (baIds !== undefined) {
            await this.dataSource.query(
                `DELETE FROM rating_schedule_binding_authorities WHERE rating_schedule_id = $1`,
                [id],
            )
            if (baIds.length > 0) await this.linkBindingAuthorities(id, baIds)
        }

        return this.findOne(id)
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
        return this.dataSource.query(
            `SELECT id, name, version, parent_schedule_id,
                    created_at, created_by, last_modified_date
               FROM rating_schedules
              WHERE id = $1 OR parent_schedule_id = $1
              ORDER BY version DESC`,
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

        const rows = await this.dataSource.query(
            `INSERT INTO rating_rules
               (rating_schedule_id, rule_name, description, field_name, field_source,
                operator, field_value, rate_percentage, rate_type,
                coverage_type_id, coverage_sub_type_id,
                rule_group, group_number, logical_operator, sequence_in_group,
                priority, is_active, created_by, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
             RETURNING *`,
            [
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
            ],
        )
        return rows[0]
    }

    // -------------------------------------------------------------------------
    // PUT /api/rating-rules/:id
    // -------------------------------------------------------------------------
    async updateRule(id: number, body: Record<string, unknown>): Promise<any> {
        const rows = await this.dataSource.query(
            `UPDATE rating_rules
                SET rule_name         = COALESCE($1, rule_name),
                    description       = COALESCE($2, description),
                    field_name        = COALESCE($3, field_name),
                    field_source      = COALESCE($4, field_source),
                    operator          = COALESCE($5, operator),
                    field_value       = COALESCE($6, field_value),
                    rate_percentage   = COALESCE($7, rate_percentage),
                    rate_type         = COALESCE($8, rate_type),
                    coverage_type_id  = COALESCE($9, coverage_type_id),
                    coverage_sub_type_id = COALESCE($10, coverage_sub_type_id),
                    rule_group        = COALESCE($11, rule_group),
                    group_number      = COALESCE($12, group_number),
                    logical_operator  = COALESCE($13, logical_operator),
                    sequence_in_group = COALESCE($14, sequence_in_group),
                    priority          = COALESCE($15, priority),
                    is_active         = COALESCE($16, is_active),
                    updated_at        = NOW()
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
                    l.country, l.state, l.city,
                    l.address1, l.address2, l.zip_code
               FROM location_coverages lc
               INNER JOIN locations l ON l.id = lc.location_id
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
}
