/**
 * LAYER 2 — Dashboard Stubs Route Tests
 *
 * Tests for /api/dashboards/widgets/data (F-019) and /api/date-basis (F-020).
 *
 * Requirements: backend/routes/dashboard-stubs.requirements.md
 *
 * Run: npm run test:backend
 */

const { agent, getAuthToken, closePool } = require('./helpers')

afterAll(() => closePool())

describe('Layer 2: Dashboard Widget Data & Date Basis', () => {
    let token

    beforeAll(async () => {
        token = await getAuthToken()
    })

    // -------------------------------------------------------------------------
    // F-019 — POST /api/dashboards/widgets/data
    // -------------------------------------------------------------------------

    describe('POST /api/dashboards/widgets/data (F-019)', () => {
        test('T-DASH-WIDGET-R19a — text widget returns { type: "text" }', async () => {
            const res = await agent
                .post('/api/dashboards/widgets/data')
                .set('Authorization', `Bearer ${token}`)
                .send({ widget: { type: 'text' } })
            expect(res.status).toBe(200)
            expect(res.body.type).toBe('text')
        })

        test('T-DASH-WIDGET-R19b — metric widget returns value and label', async () => {
            const res = await agent
                .post('/api/dashboards/widgets/data')
                .set('Authorization', `Bearer ${token}`)
                .send({ widget: { type: 'metric', source: 'submissions', aggregation: 'count', title: 'Total' } })
            expect(res.status).toBe(200)
            expect(res.body.type).toBe('metric')
            expect(typeof res.body.value).toBe('number')
            expect(res.body.label).toBe('Total')
        })

        test('T-DASH-WIDGET-R19c — chart widget returns rows array', async () => {
            const res = await agent
                .post('/api/dashboards/widgets/data')
                .set('Authorization', `Bearer ${token}`)
                .send({ widget: { type: 'chart', source: 'submissions', attribute: 'status' } })
            expect(res.status).toBe(200)
            expect(res.body.type).toBe('chart')
            expect(Array.isArray(res.body.rows)).toBe(true)
        })

        test('T-DASH-WIDGET-R19d — table widget returns rows array', async () => {
            const res = await agent
                .post('/api/dashboards/widgets/data')
                .set('Authorization', `Bearer ${token}`)
                .send({ widget: { type: 'table', source: 'submissions' } })
            expect(res.status).toBe(200)
            expect(res.body.type).toBe('table')
            expect(Array.isArray(res.body.rows)).toBe(true)
        })

        test('T-DASH-WIDGET-R19e — unknown source returns safe fallback', async () => {
            const res = await agent
                .post('/api/dashboards/widgets/data')
                .set('Authorization', `Bearer ${token}`)
                .send({ widget: { type: 'metric', source: 'nonexistent' } })
            expect(res.status).toBe(200)
            expect(res.body.value).toBe(0)
        })

        test('T-DASH-WIDGET-R19f — returns 400 when widget is missing', async () => {
            const res = await agent
                .post('/api/dashboards/widgets/data')
                .set('Authorization', `Bearer ${token}`)
                .send({})
            expect(res.status).toBe(400)
        })

        test('T-DASH-WIDGET-R19g — returns 401 without token', async () => {
            const res = await agent
                .post('/api/dashboards/widgets/data')
                .send({ widget: { type: 'text' } })
            expect(res.status).toBe(401)
        })
    })

    // -------------------------------------------------------------------------
    // F-020 — GET /api/date-basis
    // -------------------------------------------------------------------------

    describe('GET /api/date-basis (F-020)', () => {
        test('T-DASH-DATEBASIS-R20a — returns 200 with three date basis values', async () => {
            const res = await agent
                .get('/api/date-basis')
                .set('Authorization', `Bearer ${token}`)
            expect(res.status).toBe(200)
            expect(res.body).toEqual(['Created Date', 'Inception Date', 'Expiry Date'])
        })

        test('T-DASH-DATEBASIS-R20b — returns 401 without token', async () => {
            const res = await agent.get('/api/date-basis')
            expect(res.status).toBe(401)
        })
    })
})
