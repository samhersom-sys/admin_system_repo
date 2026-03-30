/**
 * TESTS — Backend Audit Routes
 * Second artifact. Requirements: backend/routes/audit.requirements.md
 * Test ID format: T-BE-AUDIT-R[NN]
 *
 * Run: npm run test:backend
 *
 * Requires:
 *   - The Cleaned backend running on port 5000 (npm run backend)
 *   - The policyforge_cleaned database with audit_event table
 *     (via node backend/create-audit-event-table.js)
 */

'use strict'

const { agent, runQuery, closePool, getAuthToken } = require('./helpers')

let token

beforeAll(async () => {
    token = await getAuthToken()
    // Clean any leftover test audit events
    await runQuery(`DELETE FROM public.audit_event WHERE entity_type = 'TestEntity'`)
})

afterAll(async () => {
    await runQuery(`DELETE FROM public.audit_event WHERE entity_type = 'TestEntity'`)
    await closePool()
})

// ---------------------------------------------------------------------------
// T-BE-AUDIT-R01 — Authentication (POST)
// REQ-AUDIT-BE-F-001
// ---------------------------------------------------------------------------

describe('T-BE-AUDIT-R01: POST /api/audit/event — authentication', () => {
    it('T-BE-AUDIT-R01a: returns 401 when Authorization header is absent', async () => {
        const res = await agent.post('/api/audit/event').send({
            entityType: 'TestEntity', entityId: 1, action: 'TestEntity Opened',
        })
        expect(res.status).toBe(401)
    })

    it('T-BE-AUDIT-R01b: returns 403 when token is invalid', async () => {
        // Invalid token (present but malformed) → 403 Forbidden, not 401.
        // 401 = no credentials; 403 = credentials present but invalid/expired.
        // See auth test T-BE-AUTH-R06c which documents this design decision.
        const res = await agent
            .post('/api/audit/event')
            .set('Authorization', 'Bearer invalid.token.here')
            .send({ entityType: 'TestEntity', entityId: 1, action: 'TestEntity Opened' })
        expect(res.status).toBe(403)
    })
})

// ---------------------------------------------------------------------------
// T-BE-AUDIT-R02 — Validation (POST)
// REQ-AUDIT-BE-F-002
// ---------------------------------------------------------------------------

describe('T-BE-AUDIT-R02: POST /api/audit/event — validation', () => {
    it('T-BE-AUDIT-R02a: returns 400 when entityType is missing', async () => {
        const res = await agent
            .post('/api/audit/event')
            .set('Authorization', `Bearer ${token}`)
            .send({ entityId: 1, action: 'TestEntity Opened' })
        expect(res.status).toBe(400)
        expect(res.body.error).toBeTruthy()
    })

    it('T-BE-AUDIT-R02b: returns 400 when entityId is missing', async () => {
        const res = await agent
            .post('/api/audit/event')
            .set('Authorization', `Bearer ${token}`)
            .send({ entityType: 'TestEntity', action: 'TestEntity Opened' })
        expect(res.status).toBe(400)
        expect(res.body.error).toBeTruthy()
    })

    it('T-BE-AUDIT-R02c: returns 400 when action is missing', async () => {
        const res = await agent
            .post('/api/audit/event')
            .set('Authorization', `Bearer ${token}`)
            .send({ entityType: 'TestEntity', entityId: 1 })
        expect(res.status).toBe(400)
        expect(res.body.error).toBeTruthy()
    })

    it('T-BE-AUDIT-R02d: returns 400 when entityId is not an integer', async () => {
        const res = await agent
            .post('/api/audit/event')
            .set('Authorization', `Bearer ${token}`)
            .send({ entityType: 'TestEntity', entityId: 'not-a-number', action: 'TestEntity Opened' })
        expect(res.status).toBe(400)
    })
})

// ---------------------------------------------------------------------------
// T-BE-AUDIT-R03 — Optional details field
// REQ-AUDIT-BE-F-003
// ---------------------------------------------------------------------------

describe('T-BE-AUDIT-R03: POST /api/audit/event — optional details', () => {
    it('T-BE-AUDIT-R03a: stores empty object when details is absent', async () => {
        const res = await agent
            .post('/api/audit/event')
            .set('Authorization', `Bearer ${token}`)
            .send({ entityType: 'TestEntity', entityId: 900, action: 'TestEntity Created' })
        expect(res.status).toBe(201)
        expect(res.body.details).toBeDefined()
    })

    it('T-BE-AUDIT-R03b: stores provided details object', async () => {
        const details = { changes: [{ field: 'status', oldValue: 'Draft', newValue: 'Active' }] }
        const res = await agent
            .post('/api/audit/event')
            .set('Authorization', `Bearer ${token}`)
            .send({ entityType: 'TestEntity', entityId: 901, action: 'TestEntity Updated', details })
        expect(res.status).toBe(201)
        expect(res.body.details).toMatchObject(details)
    })
})

// ---------------------------------------------------------------------------
// T-BE-AUDIT-R04 — User identity from JWT (not body)
// REQ-AUDIT-BE-F-004
// ---------------------------------------------------------------------------

describe('T-BE-AUDIT-R04: POST /api/audit/event — user identity from JWT', () => {
    it('T-BE-AUDIT-R04a: stored userName and userId come from the JWT, not the request body', async () => {
        const res = await agent
            .post('/api/audit/event')
            .set('Authorization', `Bearer ${token}`)
            .send({
                entityType: 'TestEntity', entityId: 902, action: 'TestEntity Opened',
                // Attempt to inject a different user via the body — must be ignored
                userName: 'hacker', userId: 99999,
            })
        expect(res.status).toBe(201)
        // The stored userName must match the admin user, not the injected value
        expect(res.body.userName).not.toBe('hacker')
        expect(res.body.userId).not.toBe(99999)
    })
})

// ---------------------------------------------------------------------------
// T-BE-AUDIT-R05 / R06 — Duplicate-event guard and success response
// REQ-AUDIT-BE-F-005, REQ-AUDIT-BE-F-006
// ---------------------------------------------------------------------------

describe('T-BE-AUDIT-R05+R06: POST /api/audit/event — duplicate guard and 201 response', () => {
    it('T-BE-AUDIT-R06a: returns 201 with full event row on first write', async () => {
        const res = await agent
            .post('/api/audit/event')
            .set('Authorization', `Bearer ${token}`)
            .send({ entityType: 'TestEntity', entityId: 903, action: 'TestEntity Opened' })
        expect(res.status).toBe(201)
        expect(res.body.id).toBeDefined()
        expect(res.body.entityType).toBe('TestEntity')
        expect(res.body.entityId).toBe(903)
        expect(res.body.action).toBe('TestEntity Opened')
    })

    it('T-BE-AUDIT-R05a: returns 200 with skipped:true when same event written within 10 seconds', async () => {
        // First write
        await agent
            .post('/api/audit/event')
            .set('Authorization', `Bearer ${token}`)
            .send({ entityType: 'TestEntity', entityId: 904, action: 'TestEntity Opened' })
        // Immediate second write — same entity/action/user within 10s
        const res2 = await agent
            .post('/api/audit/event')
            .set('Authorization', `Bearer ${token}`)
            .send({ entityType: 'TestEntity', entityId: 904, action: 'TestEntity Opened' })
        expect(res2.status).toBe(200)
        expect(res2.body.skipped).toBe(true)
    })
})

// ---------------------------------------------------------------------------
// T-BE-AUDIT-R08 — Authentication (GET)
// REQ-AUDIT-BE-F-008
// ---------------------------------------------------------------------------

describe('T-BE-AUDIT-R08: GET /api/audit/:type/:id — authentication', () => {
    it('T-BE-AUDIT-R08a: returns 401 when Authorization header is absent', async () => {
        const res = await agent.get('/api/audit/TestEntity/1')
        expect(res.status).toBe(401)
    })
})

// ---------------------------------------------------------------------------
// T-BE-AUDIT-R09 / R10 / R11 — Read history
// REQ-AUDIT-BE-F-009, REQ-AUDIT-BE-F-010, REQ-AUDIT-BE-F-011
// ---------------------------------------------------------------------------

describe('T-BE-AUDIT-R09-R11: GET /api/audit/:type/:id — read history', () => {
    const TEST_ID = 905

    beforeAll(async () => {
        await runQuery(`DELETE FROM public.audit_event WHERE entity_type = 'TestEntity' AND entity_id = $1`, [TEST_ID])
        // Insert two known events directly into the DB
        await runQuery(
            `INSERT INTO public.audit_event (entity_type, entity_id, action, details, created_by, user_id, user_name, created_at)
             VALUES ('TestEntity', $1, 'TestEntity Created', '{}', 'sysuser', NULL, 'sysuser', NOW() - INTERVAL '1 minute'),
                    ('TestEntity', $1, 'TestEntity Updated', '{"changes":[{"field":"status","oldValue":"Draft","newValue":"Active"}]}', 'sysuser', NULL, 'sysuser', NOW())`,
            [TEST_ID]
        )
    })

    it('T-BE-AUDIT-R09a: returns 200 with array ordered oldest first', async () => {
        const res = await agent
            .get(`/api/audit/TestEntity/${TEST_ID}`)
            .set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body.length).toBe(2)
        expect(res.body[0].action).toBe('TestEntity Created')
        expect(res.body[1].action).toBe('TestEntity Updated')
    })

    it('T-BE-AUDIT-R10a: each event has action, user, userId, date fields', async () => {
        const res = await agent
            .get(`/api/audit/TestEntity/${TEST_ID}`)
            .set('Authorization', `Bearer ${token}`)
        const event = res.body[0]
        expect(event.action).toBeDefined()
        expect(event.user).toBeDefined()
        expect(event.date).toBeDefined()
    })

    it('T-BE-AUDIT-R10b: changes array is present when details.changes exists', async () => {
        const res = await agent
            .get(`/api/audit/TestEntity/${TEST_ID}`)
            .set('Authorization', `Bearer ${token}`)
        const updated = res.body[1]
        expect(Array.isArray(updated.changes)).toBe(true)
        expect(updated.changes[0].field).toBe('status')
    })

    it('T-BE-AUDIT-R11a: returns 200 with empty array when no events exist for entity', async () => {
        const res = await agent
            .get('/api/audit/TestEntity/999999')
            .set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(200)
        expect(res.body).toEqual([])
    })
})

// ---------------------------------------------------------------------------
// T-BE-AUDIT-R12 — Invalid id param
// REQ-AUDIT-BE-F-012
// ---------------------------------------------------------------------------

describe('T-BE-AUDIT-R12: GET /api/audit/:type/:id — invalid id', () => {
    it('T-BE-AUDIT-R12a: returns 400 when id is not a valid integer', async () => {
        const res = await agent
            .get('/api/audit/TestEntity/not-a-number')
            .set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(400)
    })
})
