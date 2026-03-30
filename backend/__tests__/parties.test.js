/**
 * LAYER 2 — Parties Route Tests
 *
 * Tests for /api/parties (GET list, POST create).
 * Requires the backend to be running on port 5000 and the `party` table to exist.
 *
 * Requirements: backend/routes/parties.requirements.md
 *
 * Run: npm run test:backend
 */

const { agent, getAuthToken, closePool, runQuery } = require('./helpers')

afterAll(() => closePool())

// ---------------------------------------------------------------------------
// Tests — T-BE-parties
// ---------------------------------------------------------------------------

describe('Layer 2: /api/parties', () => {
    let token

    beforeAll(async () => {
        token = await getAuthToken()
    })

    // -------------------------------------------------------------------------
    // R01 — GET /api/parties
    // -------------------------------------------------------------------------

    describe('GET /api/parties (R01)', () => {
        test('T-BE-parties-R01a — returns 200 with an array', async () => {
            const res = await agent
                .get('/api/parties')
                .set('Authorization', `Bearer ${token}`)
            expect(res.status).toBe(200)
            expect(Array.isArray(res.body)).toBe(true)
        })

        test('T-BE-parties-R01b — returns 401 without token', async () => {
            const res = await agent.get('/api/parties')
            expect(res.status).toBe(401)
        })

        test('T-BE-parties-R01c — supports ?type= filter', async () => {
            const res = await agent
                .get('/api/parties?type=Insured')
                .set('Authorization', `Bearer ${token}`)
            expect(res.status).toBe(200)
            expect(Array.isArray(res.body)).toBe(true)
            // All returned records should have type = 'Insured'
            res.body.forEach((p) => expect(p.type).toBe('Insured'))
        })

        test('T-BE-parties-R01d — supports ?search= filter (case-insensitive)', async () => {
            // First create a known party to search for
            const unique = `TestParty-${Date.now()}`
            const createRes = await agent
                .post('/api/parties')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: unique, type: 'Insured' })
            expect(createRes.status).toBe(201)

            const res = await agent
                .get(`/api/parties?search=${unique.toLowerCase()}`)
                .set('Authorization', `Bearer ${token}`)
            expect(res.status).toBe(200)
            expect(res.body.some((p) => p.name === unique)).toBe(true)
        })
    })

    // -------------------------------------------------------------------------
    // R02 — POST /api/parties
    // -------------------------------------------------------------------------

    describe('POST /api/parties (R02)', () => {
        test('T-BE-parties-R02a — creates a party and returns 201', async () => {
            const name = `IntegrationParty-${Date.now()}`
            const res = await agent
                .post('/api/parties')
                .set('Authorization', `Bearer ${token}`)
                .send({ name, type: 'Insured' })
            expect(res.status).toBe(201)
            expect(res.body.id).toBeDefined()
            expect(res.body.name).toBe(name)
            expect(res.body.type).toBe('Insured')
        })

        test('T-BE-parties-R02b — returns 400 when name is missing', async () => {
            const res = await agent
                .post('/api/parties')
                .set('Authorization', `Bearer ${token}`)
                .send({ type: 'Insured' })
            expect(res.status).toBe(400)
        })

        test('T-BE-parties-R02c — returns 400 when type is missing', async () => {
            const res = await agent
                .post('/api/parties')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'SomeName' })
            expect(res.status).toBe(400)
        })

        test('T-BE-parties-R02d — returns 401 without token', async () => {
            const res = await agent
                .post('/api/parties')
                .send({ name: 'Unauthorized', type: 'Insured' })
            expect(res.status).toBe(401)
        })
    })
})
