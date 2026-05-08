import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { logError } from '../shared/log-error'

// Valid canonical entity types (REQ-AUDIT-BE-F-002)
const VALID_ENTITY_TYPES = new Set([
    'Submission', 'Quote', 'Policy', 'Binding Authority', 'Party', 'Claim',
    // Allow test entity type in non-production environments
    ...(process.env['NODE_ENV'] !== 'production' ? ['TestEntity'] : []),
])

@Injectable()
export class AuditService {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) { }

    // ---------------------------------------------------------------------------
    // POST /api/audit/event  â€” REQ-AUDIT-BE-F-001 through F-007
    // ---------------------------------------------------------------------------
    async writeEvent(body: any, user: any): Promise<any> {
        const { entityType, entityId, action, details } = body ?? {}
        const orgCode = user?.orgCode ?? null
        const userName = user?.username || user?.email || user?.name || 'System'

        if (!entityType || typeof entityType !== 'string') {
            await logError(this.dataSource, orgCode, userName, 'POST /api/audit/event', 'ERR_AUDIT_ENTITY_TYPE_REQUIRED', 'entityType is required and must be a string', { body })
            throw new BadRequestException('entityType is required and must be a string')
        }
        if (entityId === undefined || entityId === null || !Number.isInteger(Number(entityId)) || isNaN(Number(entityId))) {
            await logError(this.dataSource, orgCode, userName, 'POST /api/audit/event', 'ERR_AUDIT_ENTITY_ID_INVALID', 'entityId is required and must be an integer', { body })
            throw new BadRequestException('entityId is required and must be an integer')
        }
        if (!action || typeof action !== 'string') {
            await logError(this.dataSource, orgCode, userName, 'POST /api/audit/event', 'ERR_AUDIT_ACTION_REQUIRED', 'action is required and must be a string', { body })
            throw new BadRequestException('action is required and must be a string')
        }

        // REQ-AUDIT-BE-F-002 â€” validate entity type
        if (!VALID_ENTITY_TYPES.has(entityType)) {
            await logError(this.dataSource, orgCode, userName, 'POST /api/audit/event', 'ERR_AUDIT_ENTITY_TYPE_INVALID', 'entityType must be one of the allowed values', { entityType })
            throw new BadRequestException(`entityType must be one of: ${[...VALID_ENTITY_TYPES].join(', ')}`)
        }

        const entityIdInt = Number(entityId)

        // REQ-AUDIT-BE-F-004 â€” user identity always from JWT
        const userId = user.id ?? null

        // REQ-AUDIT-BE-F-005 â€” duplicate-event guard (same entity+action+user within 10 seconds)
        const dupeCheck = await this.dataSource.query<any[]>(
            `SELECT id FROM public.audit_event
             WHERE entity_type = $1 AND entity_id = $2 AND action = $3 AND user_name = $4
               AND created_at > NOW() - INTERVAL '10 seconds'
             LIMIT 1`,
            [entityType, entityIdInt, action, userName],
        )
        if (dupeCheck.length > 0) {
            return { skipped: true }
        }

        // REQ-AUDIT-BE-F-003 â€” store details, defaulting to {}
        const storedDetails = (details && typeof details === 'object') ? details : {}

        // REQ-AUDIT-BE-F-006 â€” insert and return new row
        const rows = await this.dataSource.query<any[]>(
            `INSERT INTO public.audit_event
                (entity_type, entity_id, action, details, created_by, user_id, user_name)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING
                id,
                entity_type  AS "entityType",
                entity_id    AS "entityId",
                action,
                details,
                created_by   AS "createdBy",
                user_id      AS "userId",
                user_name    AS "userName",
                created_at   AS "createdAt"`,
            [entityType, entityIdInt, action, JSON.stringify(storedDetails), userName, userId, userName],
        )

        // REQ-AUDIT-BE-F-014 — include concurrent open users when action contains "Opened"
        const result = rows[0]
        if (action.includes('Opened')) {
            const otherUsersOpen = await this.detectConcurrentUsers(entityType, entityIdInt, userName)
            return { ...result, otherUsersOpen }
        }
        return result
    }

    // ---------------------------------------------------------------------------
    // GET /api/audit/:type/:id  â€” REQ-AUDIT-BE-F-008 through F-012
    // ---------------------------------------------------------------------------
    async getHistory(type: string, id: string | number): Promise<any[]> {
        const entityId = Number(id)
        if (!Number.isInteger(entityId) || isNaN(entityId)) {
            await logError(this.dataSource, null, null, 'GET /api/audit/:type/:id', 'ERR_AUDIT_ID_INVALID', 'id must be a valid integer', { type, id })
            throw new BadRequestException('id must be a valid integer')
        }

        // REQ-AUDIT-BE-F-009 â€” ordered oldest first
        const rows = await this.dataSource.query<any[]>(
            `SELECT action, user_name, user_id, created_at, details
             FROM public.audit_event
             WHERE entity_type = $1 AND entity_id = $2
             ORDER BY created_at ASC, id ASC`,
            [type, entityId],
        )

        // REQ-AUDIT-BE-F-010 â€” shape each event
        return rows.map((r: any) => ({
            action: r.action,
            user: r.user_name,
            userId: r.user_id,
            date: r.created_at,
            changes: r.details?.changes ?? undefined,
            details: r.details?.description ?? undefined,
        }))
    }

    // ---------------------------------------------------------------------------
    // REQ-AUDIT-BE-F-013 — detectConcurrentUsers
    // Returns names of users (excluding currentUserName) who have a net positive
    // "Opened" count for the given entity (i.e. net Opened - Closed > 0).
    // ---------------------------------------------------------------------------
    async detectConcurrentUsers(
        entityType: string,
        entityId: number,
        currentUserName: string,
    ): Promise<string[]> {
        const openedAction = `${entityType} Opened`
        const closedAction = `${entityType} Closed`

        const rows = await this.dataSource.query<any[]>(
            `SELECT user_name, action FROM public.audit_event
             WHERE entity_type = $1 AND entity_id = $2 AND action IN ($3, $4)
             ORDER BY created_at ASC`,
            [entityType, entityId, openedAction, closedAction],
        )

        // Compute net opens per user (Opened increments, Closed decrements)
        const netOpens = new Map<string, number>()
        for (const row of rows) {
            const name: string = row.user_name
            const current = netOpens.get(name) ?? 0
            if (row.action === openedAction) {
                netOpens.set(name, current + 1)
            } else if (row.action === closedAction) {
                netOpens.set(name, current - 1)
            }
        }

        // Return users with net > 0, excluding the current user
        const result: string[] = []
        for (const [name, net] of netOpens) {
            if (net > 0 && name !== currentUserName) {
                result.push(name)
            }
        }
        return result
    }
}
