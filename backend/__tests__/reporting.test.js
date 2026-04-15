/**
 * LAYER 2 — Reporting Route Tests
 *
 * REQ: backend/routes/reporting.requirements.md
 * Tests all CRUD endpoints for report templates, run, history, and field mappings.
 *
 * Run: npm run test:backend
 */

const { agent, getAuthToken, closePool, runQuery } = require('./helpers')

afterAll(() => closePool())

describe('Reporting Routes', () => {
    let token
    let createdId = null

    beforeAll(async () => {
        token = await getAuthToken()
    })

    // Clean up any template created during the test run
    afterAll(async () => {
        if (createdId) {
            try { await runQuery('DELETE FROM report_templates WHERE id = $1', [createdId]) } catch (_) { /* ignore */ }
        }
    })

    // -----------------------------------------------------------------------
    // REQ-RPT-BE-F-001 — List templates
    // -----------------------------------------------------------------------

    test('GET /api/report-templates → 200 with array', async () => {
        const res = await agent
            .get('/api/report-templates')
            .set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
    })

    // -----------------------------------------------------------------------
    // REQ-RPT-BE-F-003 — Create template
    // -----------------------------------------------------------------------

    test('POST /api/report-templates → 400 when name is missing', async () => {
        const res = await agent
            .post('/api/report-templates')
            .set('Authorization', `Bearer ${token}`)
            .send({ description: 'No name' })
        expect(res.status).toBe(400)
        expect(res.body.message).toMatch(/name/i)
    })

    test('POST /api/report-templates → 201 with valid body', async () => {
        const res = await agent
            .post('/api/report-templates')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: '__test_report__',
                description: 'Integration test template',
                data_source: 'submissions',
                fields: ['reference', 'insured', 'status'],
                filters: [],
            })
        expect(res.status).toBe(201)
        expect(res.body.id).toBeDefined()
        expect(res.body.name).toBe('__test_report__')
        expect(res.body.type).toBe('custom')
        createdId = res.body.id
    })

    // -----------------------------------------------------------------------
    // REQ-RPT-BE-F-002 — Get single template
    // -----------------------------------------------------------------------

    test('GET /api/report-templates/:id → 200 for existing template', async () => {
        if (!createdId) return
        const res = await agent
            .get(`/api/report-templates/${createdId}`)
            .set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(200)
        expect(res.body.id).toBe(createdId)
        expect(res.body.name).toBe('__test_report__')
    })

    test('GET /api/report-templates/999999 → 404', async () => {
        const res = await agent
            .get('/api/report-templates/999999')
            .set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(404)
    })

    // -----------------------------------------------------------------------
    // REQ-RPT-BE-F-004 — Update template
    // -----------------------------------------------------------------------

    test('PUT /api/report-templates/:id → 200 with updated name', async () => {
        if (!createdId) return
        const res = await agent
            .put(`/api/report-templates/${createdId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: '__test_report_updated__' })
        expect(res.status).toBe(200)
        expect(res.body.name).toBe('__test_report_updated__')
    })

    test('PUT /api/report-templates/999999 → 404', async () => {
        const res = await agent
            .put('/api/report-templates/999999')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'nope' })
        expect(res.status).toBe(404)
    })

    // -----------------------------------------------------------------------
    // REQ-RPT-BE-F-006 — Run report
    // -----------------------------------------------------------------------

    test('POST /api/report-templates/:id/run → 200 with data array', async () => {
        if (!createdId) return
        const res = await agent
            .post(`/api/report-templates/${createdId}/run`)
            .set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('data')
        expect(Array.isArray(res.body.data)).toBe(true)
    })

    // -----------------------------------------------------------------------
    // REQ-RPT-BE-F-007 — Execution history
    // -----------------------------------------------------------------------

    test('GET /api/report-templates/:id/history → 200 with array', async () => {
        if (!createdId) return
        const res = await agent
            .get(`/api/report-templates/${createdId}/history`)
            .set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        // Should have at least 1 entry from the run test above
        if (res.body.length > 0) {
            expect(res.body[0]).toHaveProperty('status')
            expect(res.body[0]).toHaveProperty('run_at')
        }
    })

    // -----------------------------------------------------------------------
    // REQ-RPT-BE-F-005 — Delete template
    // -----------------------------------------------------------------------

    test('DELETE /api/report-templates/:id → 204', async () => {
        if (!createdId) return
        const res = await agent
            .delete(`/api/report-templates/${createdId}`)
            .set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(204)
        createdId = null // Already cleaned up
    })

    test('DELETE /api/report-templates/999999 → 404', async () => {
        const res = await agent
            .delete('/api/report-templates/999999')
            .set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(404)
    })

    // -----------------------------------------------------------------------
    // REQ-RPT-BE-F-008 — Field mappings (no auth required)
    // -----------------------------------------------------------------------

    test('GET /api/report-field-mappings/submissions → 200 with field array', async () => {
        const res = await agent.get('/api/report-field-mappings/submissions')
        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body.length).toBeGreaterThan(0)
        expect(res.body[0]).toHaveProperty('key')
        expect(res.body[0]).toHaveProperty('label')
    })

    test('GET /api/report-field-mappings/unknown → 200 with empty array', async () => {
        const res = await agent.get('/api/report-field-mappings/unknown')
        expect(res.status).toBe(200)
        expect(res.body).toEqual([])
    })
})
