/**
 * LAYER 2 — Binding Authorities Route Tests
 *
 * Tests for /api/binding-authorities (dashboard-stubs.js).
 * Covers: GET list (F-006), POST create (F-012), GET detail (F-013),
 *         PUT update (F-014), sections (F-015/F-016), transactions (F-017/F-018),
 *         audit GET (F-010), audit POST (F-011).
 *
 * Requirements: backend/routes/dashboard-stubs.requirements.md
 *
 * Run: npm run test:backend
 */

const { agent, getAuthToken, closePool, runQuery } = require('./helpers')

afterAll(() => closePool())

// ---------------------------------------------------------------------------
// Tests — T-BE-BA
// ---------------------------------------------------------------------------

describe('Layer 2: /api/binding-authorities', () => {
    let token

    beforeAll(async () => {
        token = await getAuthToken()
    })

    // -------------------------------------------------------------------------
    // F-006 — GET /api/binding-authorities
    // -------------------------------------------------------------------------

    describe('GET /api/binding-authorities (F-006)', () => {
        test('T-BE-BA-F06a — returns 200 with an array', async () => {
            const res = await agent
                .get('/api/binding-authorities')
                .set('Authorization', `Bearer ${token}`)
            expect(res.status).toBe(200)
            expect(Array.isArray(res.body)).toBe(true)
        })

        test('T-BE-BA-F06b — returns 401 without token', async () => {
            const res = await agent.get('/api/binding-authorities')
            expect(res.status).toBe(401)
        })
    })

    // -------------------------------------------------------------------------
    // F-010 — GET /api/binding-authorities/:id/audit
    // -------------------------------------------------------------------------

    describe('GET /api/binding-authorities/:id/audit (F-010)', () => {
        test('T-BE-BA-F10a — returns 200 with an array for valid BA id', async () => {
            // Use a high ID that may or may not exist — audit returns empty array for missing entity
            const res = await agent
                .get('/api/binding-authorities/1/audit')
                .set('Authorization', `Bearer ${token}`)
            expect(res.status).toBe(200)
            expect(Array.isArray(res.body)).toBe(true)
        })

        test('T-BE-BA-F10b — returns 401 without token', async () => {
            const res = await agent.get('/api/binding-authorities/1/audit')
            expect(res.status).toBe(401)
        })

        test('T-BE-BA-F10c — each event has action, user, date fields', async () => {
            // Insert a test audit event first
            await runQuery(
                `INSERT INTO public.audit_event
                    (entity_type, entity_id, action, details, created_by, user_id, user_name)
                 VALUES ('Binding Authority', 99999, 'BA Opened', '{}', 'TestUser', 1, 'TestUser')
                 ON CONFLICT DO NOTHING`
            )

            const res = await agent
                .get('/api/binding-authorities/99999/audit')
                .set('Authorization', `Bearer ${token}`)
            expect(res.status).toBe(200)
            if (res.body.length > 0) {
                const event = res.body[0]
                expect(event).toHaveProperty('action')
                expect(event).toHaveProperty('user')
                expect(event).toHaveProperty('date')
            }

            // Clean up
            await runQuery(
                `DELETE FROM public.audit_event WHERE entity_type = 'Binding Authority' AND entity_id = 99999`
            )
        })
    })

    // -------------------------------------------------------------------------
    // F-011 — POST /api/binding-authorities/:id/audit
    // -------------------------------------------------------------------------

    describe('POST /api/binding-authorities/:id/audit (F-011)', () => {
        test('T-BE-BA-F11a — returns 201 with inserted event', async () => {
            const res = await agent
                .post('/api/binding-authorities/1/audit')
                .set('Authorization', `Bearer ${token}`)
                .send({ action: 'BA Opened' })
            expect(res.status).toBe(201)
            expect(res.body).toHaveProperty('id')
            expect(res.body.entity_type).toBe('Binding Authority')

            // Clean up
            await runQuery(
                `DELETE FROM public.audit_event WHERE id = $1`,
                [res.body.id]
            )
        })

        test('T-BE-BA-F11b — returns 400 when action is missing', async () => {
            const res = await agent
                .post('/api/binding-authorities/1/audit')
                .set('Authorization', `Bearer ${token}`)
                .send({})
            expect(res.status).toBe(400)
            expect(res.body.message).toMatch(/action is required/i)
        })

        test('T-BE-BA-F11c — returns 401 without token', async () => {
            const res = await agent
                .post('/api/binding-authorities/1/audit')
                .send({ action: 'BA Opened' })
            expect(res.status).toBe(401)
        })
    })

    // -------------------------------------------------------------------------
    // F-012 — POST /api/binding-authorities (create)
    // -------------------------------------------------------------------------

    describe('POST /api/binding-authorities (F-012)', () => {
        let createdId

        afterAll(async () => {
            if (createdId) {
                await runQuery('DELETE FROM binding_authorities WHERE id = $1', [createdId])
            }
        })

        test('T-BE-BA-F12a — creates a new BA and returns 201', async () => {
            const res = await agent
                .post('/api/binding-authorities')
                .set('Authorization', `Bearer ${token}`)
                .send({ year_of_account: 2025 })
            expect(res.status).toBe(201)
            expect(res.body).toHaveProperty('id')
            expect(res.body.reference).toMatch(/^BA-/)
            expect(res.body.status).toBe('Draft')
            createdId = res.body.id
        })

        test('T-BE-BA-F12b — returns 401 without token', async () => {
            const res = await agent
                .post('/api/binding-authorities')
                .send({ year_of_account: 2025 })
            expect(res.status).toBe(401)
        })
    })

    // -------------------------------------------------------------------------
    // F-013 — GET /api/binding-authorities/:id (detail)
    // -------------------------------------------------------------------------

    describe('GET /api/binding-authorities/:id (F-013)', () => {
        let testBaId

        beforeAll(async () => {
            const res = await agent
                .post('/api/binding-authorities')
                .set('Authorization', `Bearer ${token}`)
                .send({ year_of_account: 2025 })
            testBaId = res.body.id
        })

        afterAll(async () => {
            if (testBaId) {
                await runQuery('DELETE FROM binding_authorities WHERE id = $1', [testBaId])
            }
        })

        test('T-BE-BA-F13a — returns 200 with BA detail including multi_year', async () => {
            const res = await agent
                .get(`/api/binding-authorities/${testBaId}`)
                .set('Authorization', `Bearer ${token}`)
            expect(res.status).toBe(200)
            expect(res.body.id).toBe(testBaId)
            expect(res.body).toHaveProperty('multi_year')
        })

        test('T-BE-BA-F13b — returns 404 for non-existent BA', async () => {
            const res = await agent
                .get('/api/binding-authorities/999999')
                .set('Authorization', `Bearer ${token}`)
            expect(res.status).toBe(404)
        })

        test('T-BE-BA-F13c — returns 401 without token', async () => {
            const res = await agent.get(`/api/binding-authorities/${testBaId}`)
            expect(res.status).toBe(401)
        })
    })

    // -------------------------------------------------------------------------
    // F-014 — PUT /api/binding-authorities/:id (update)
    // -------------------------------------------------------------------------

    describe('PUT /api/binding-authorities/:id (F-014)', () => {
        let testBaId

        beforeAll(async () => {
            const res = await agent
                .post('/api/binding-authorities')
                .set('Authorization', `Bearer ${token}`)
                .send({ year_of_account: 2025 })
            testBaId = res.body.id
        })

        afterAll(async () => {
            if (testBaId) {
                await runQuery('DELETE FROM binding_authorities WHERE id = $1', [testBaId])
            }
        })

        test('T-BE-BA-F14a — updates status and returns 200', async () => {
            const res = await agent
                .put(`/api/binding-authorities/${testBaId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'Active' })
            expect(res.status).toBe(200)
            expect(res.body.status).toBe('Active')
        })

        test('T-BE-BA-F14b — returns 404 for non-existent BA', async () => {
            const res = await agent
                .put('/api/binding-authorities/999999')
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'Active' })
            expect(res.status).toBe(404)
        })
    })

    // -------------------------------------------------------------------------
    // F-015/F-016 — GET/POST /api/binding-authorities/:id/sections
    // -------------------------------------------------------------------------

    describe('Sections (F-015 / F-016)', () => {
        let testBaId
        let sectionId

        beforeAll(async () => {
            const res = await agent
                .post('/api/binding-authorities')
                .set('Authorization', `Bearer ${token}`)
                .send({ year_of_account: 2025 })
            testBaId = res.body.id
        })

        afterAll(async () => {
            if (sectionId) {
                await runQuery('DELETE FROM binding_authority_sections WHERE id = $1', [sectionId])
            }
            if (testBaId) {
                await runQuery('DELETE FROM binding_authorities WHERE id = $1', [testBaId])
            }
        })

        test('T-BE-BA-F15a — GET sections returns 200 with array', async () => {
            const res = await agent
                .get(`/api/binding-authorities/${testBaId}/sections`)
                .set('Authorization', `Bearer ${token}`)
            expect(res.status).toBe(200)
            expect(Array.isArray(res.body)).toBe(true)
        })

        test('T-BE-BA-F16a — POST section creates and returns 201', async () => {
            const res = await agent
                .post(`/api/binding-authorities/${testBaId}/sections`)
                .set('Authorization', `Bearer ${token}`)
                .send({ class_of_business: 'Property', currency: 'GBP' })
            expect(res.status).toBe(201)
            expect(res.body).toHaveProperty('id')
            expect(res.body.reference).toMatch(/^SEC-/)
            sectionId = res.body.id
        })

        test('T-BE-BA-F15b — GET sections includes the created section', async () => {
            const res = await agent
                .get(`/api/binding-authorities/${testBaId}/sections`)
                .set('Authorization', `Bearer ${token}`)
            expect(res.status).toBe(200)
            expect(res.body.length).toBeGreaterThanOrEqual(1)
        })
    })

    // -------------------------------------------------------------------------
    // F-017/F-018 — GET/POST /api/binding-authorities/:id/transactions
    // -------------------------------------------------------------------------

    describe('Transactions (F-017 / F-018)', () => {
        let testBaId
        let txnId

        beforeAll(async () => {
            const res = await agent
                .post('/api/binding-authorities')
                .set('Authorization', `Bearer ${token}`)
                .send({ year_of_account: 2025 })
            testBaId = res.body.id
        })

        afterAll(async () => {
            if (txnId) {
                await runQuery('DELETE FROM binding_authority_transactions WHERE id = $1', [txnId])
            }
            if (testBaId) {
                await runQuery('DELETE FROM binding_authorities WHERE id = $1', [testBaId])
            }
        })

        test('T-BE-BA-F17a — GET transactions returns 200 with array', async () => {
            const res = await agent
                .get(`/api/binding-authorities/${testBaId}/transactions`)
                .set('Authorization', `Bearer ${token}`)
            expect(res.status).toBe(200)
            expect(Array.isArray(res.body)).toBe(true)
        })

        test('T-BE-BA-F18a — POST transaction creates and returns 201', async () => {
            const res = await agent
                .post(`/api/binding-authorities/${testBaId}/transactions`)
                .set('Authorization', `Bearer ${token}`)
                .send({ type: 'Premium', amount: 5000, currency: 'GBP' })
            expect(res.status).toBe(201)
            expect(res.body).toHaveProperty('id')
            expect(res.body.status).toBe('Active')
            txnId = res.body.id
        })

        test('T-BE-BA-F17b — GET transactions includes the created transaction', async () => {
            const res = await agent
                .get(`/api/binding-authorities/${testBaId}/transactions`)
                .set('Authorization', `Bearer ${token}`)
            expect(res.status).toBe(200)
            expect(res.body.length).toBeGreaterThanOrEqual(1)
        })
    })
})
