import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'

/**
 * RatingSchedulesService
 * REQ-SET-BE-F-005 — Rating Rules API migration from backup rating-api.js
 *
 * Tables used: rating_schedules, rating_rules (migrations 054, 055)
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
            `SELECT id, name, description, effective_date, expiry_date, currency, is_active, created_at
             FROM rating_schedules
             ORDER BY name ASC`,
        )
    }

    // -------------------------------------------------------------------------
    // GET /api/rating-schedules/:id
    // -------------------------------------------------------------------------
    async findOne(id: number): Promise<any> {
        const rows = await this.dataSource.query(
            `SELECT id, name, description, effective_date, expiry_date, currency, is_active, created_at
             FROM rating_schedules
             WHERE id = $1`,
            [id],
        )
        if (!rows.length) throw new NotFoundException(`Rating schedule ${id} not found`)
        return rows[0]
    }

    // -------------------------------------------------------------------------
    // GET /api/rating-schedules/:id/rules
    // -------------------------------------------------------------------------
    async getRules(scheduleId: number): Promise<any[]> {
        return this.dataSource.query(
            `SELECT id, rating_schedule_id, rule_name, description, field_name, field_source,
                    operator, field_value, rate_percentage, rate_type, priority, is_active
             FROM rating_rules
             WHERE rating_schedule_id = $1
             ORDER BY priority ASC, id ASC`,
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
             SET name          = COALESCE($1, name),
                 description   = COALESCE($2, description),
                 effective_date = COALESCE($3, effective_date),
                 expiry_date   = COALESCE($4, expiry_date),
                 is_active     = COALESCE($5, is_active),
                 updated_at    = NOW()
             WHERE id = $6`,
            [
                body['name'] ?? null,
                body['description'] ?? null,
                body['effective_date'] ?? null,
                body['expiry_date'] ?? null,
                body['is_active'] ?? null,
                id,
            ],
        )
        return this.findOne(id)
    }
}
