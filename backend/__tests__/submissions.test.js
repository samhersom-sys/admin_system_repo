/**
 * LAYER 2 — Submissions Route Tests
 *
 * Tests for /api/submissions (R01–R06).
 * Requires the backend to be running on port 5000 and the `submission` table to exist.
 *
 * Requirements: backend/routes/submissions.requirements.md
 *
 * Run: npm run test:backend
 */

const { agent, getAuthToken, closePool, runQuery } = require('./helpers')

afterAll(() => closePool())

// ---------------------------------------------------------------------------
// Tests — T-BE-submissions
// ---------------------------------------------------------------------------

describe('Layer 2: /api/submissions', () => {
    let token
    let createdId
    let currentUserId

    beforeAll(async () => {
        token = await getAuthToken()
        const userRows = await runQuery(`SELECT id FROM users WHERE email = 'admin@policyforge.com' LIMIT 1`)
        currentUserId = userRows[0]?.id
    })

    // -------------------------------------------------------------------------
    // R01 — GET /api/submissions
    // -------------------------------------------------------------------------

    describe('GET /api/submissions (R01)', () => {
        test('T-BE-submissions-R01a — returns 200 with an array', async () => {
            const res = await agent
                .get('/api/submissions')
                .set('Authorization', `Bearer ${token}`)
            expect(res.status).toBe(200)
            expect(Array.isArray(res.body)).toBe(true)
        })

        test('T-BE-submissions-R01b — returns 401 without token', async () => {
            const res = await agent.get('/api/submissions')
            expect(res.status).toBe(401)
        })

        test('T-BE-submissions-R01c — supports ?status= filter', async () => {
            const res = await agent
                .get('/api/submissions?status=Created')
                .set('Authorization', `Bearer ${token}`)
            expect(res.status).toBe(200)
            expect(Array.isArray(res.body)).toBe(true)
            res.body.forEach((s) => expect(s.status).toBe('Created'))
        })
    })

    // -------------------------------------------------------------------------
    // R02 — POST /api/submissions
    // -------------------------------------------------------------------------

    describe('POST /api/submissions (R02)', () => {
        test('T-BE-submissions-R02a — creates a submission and returns 201', async () => {
            const res = await agent
                .post('/api/submissions')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    insured: `IntegrationInsured-${Date.now()}`,
                    inceptionDate: '2026-06-01',
                    expiryDate: '2027-06-01',
                    contractType: 'Open Market',
                })
            expect(res.status).toBe(201)
            expect(res.body.id).toBeDefined()
            expect(res.body.status).toBe('Created')
            expect(res.body.reference).toMatch(/^SUB-/)
            createdId = res.body.id
        })

        test('T-BE-submissions-R02b — generates a SUB- reference server-side', async () => {
            const res = await agent
                .post('/api/submissions')
                .set('Authorization', `Bearer ${token}`)
                .send({ insured: `RefTest-${Date.now()}`, inceptionDate: '2026-06-01' })
            expect(res.status).toBe(201)
            expect(res.body.reference).toMatch(/^SUB-[A-Z]+-\d{8}-\d{3}$/)
        })

        test('T-BE-submissions-R02c — defaults expiry to inception + 1 year when not supplied', async () => {
            const res = await agent
                .post('/api/submissions')
                .set('Authorization', `Bearer ${token}`)
                .send({ insured: `ExpiryDefault-${Date.now()}`, inceptionDate: '2026-06-01' })
            expect(res.status).toBe(201)
            expect(res.body.expiryDate).toMatch(/^2027-06-01/)
        })

        test('T-BE-submissions-R02d — returns 400 when insured is missing', async () => {
            const res = await agent
                .post('/api/submissions')
                .set('Authorization', `Bearer ${token}`)
                .send({ inceptionDate: '2026-06-01' })
            expect(res.status).toBe(400)
        })

        test('T-BE-submissions-R02e — returns 401 without token', async () => {
            const res = await agent
                .post('/api/submissions')
                .send({ insured: 'Unauthorized', inceptionDate: '2026-06-01' })
            expect(res.status).toBe(401)
        })

        test('T-BE-submissions-R02f — ignores caller-supplied createdByOrgCode (JWT is authoritative)', async () => {
            const res = await agent
                .post('/api/submissions')
                .set('Authorization', `Bearer ${token}`)
                .send({ insured: `OrgCodeTest-${Date.now()}`, inceptionDate: '2026-06-01', createdByOrgCode: 'HACKER' })
            expect(res.status).toBe(201)
            expect(res.body.createdByOrgCode).not.toBe('HACKER')
        })
    })

    // -------------------------------------------------------------------------
    // R03 — GET /api/submissions/:id
    // -------------------------------------------------------------------------

    describe('GET /api/submissions/:id (R03)', () => {
        test('T-BE-submissions-R03a — returns the submission by id', async () => {
            expect(createdId).toBeDefined()
            const res = await agent
                .get(`/api/submissions/${createdId}`)
                .set('Authorization', `Bearer ${token}`)
            expect(res.status).toBe(200)
            expect(res.body.id).toBe(createdId)
        })

        test('T-BE-submissions-R03b — returns 404 for unknown id', async () => {
            const res = await agent
                .get('/api/submissions/999999999')
                .set('Authorization', `Bearer ${token}`)
            expect(res.status).toBe(404)
        })

        test('T-BE-submissions-R03c — returns 401 without token', async () => {
            const res = await agent.get(`/api/submissions/${createdId}`)
            expect(res.status).toBe(401)
        })
    })

    // -------------------------------------------------------------------------
    // R04 — PUT /api/submissions/:id
    // -------------------------------------------------------------------------

    describe('PUT /api/submissions/:id (R04)', () => {
        test('T-BE-submissions-R04a — updates editable fields and returns the updated record', async () => {
            expect(createdId).toBeDefined()
            const newInsured = `UpdatedInsured-${Date.now()}`
            await agent
                .post(`/api/submissions/${createdId}/edit-lock`)
                .set('Authorization', `Bearer ${token}`)

            const res = await agent
                .put(`/api/submissions/${createdId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ insured: newInsured })
            expect(res.status).toBe(200)
            expect(res.body.insured).toBe(newInsured)
        })

        test('T-BE-submissions-R04b — returns 404 for unknown id', async () => {
            const res = await agent
                .put('/api/submissions/999999999')
                .set('Authorization', `Bearer ${token}`)
                .send({ insured: 'Ghost' })
            expect(res.status).toBe(404)
        })

        test('T-BE-submissions-R04c — returns 401 without token', async () => {
            const res = await agent
                .put(`/api/submissions/${createdId}`)
                .send({ insured: 'Unauthed' })
            expect(res.status).toBe(401)
        })

        test('T-BE-submissions-R04d — returns 409 when another user holds the active edit lock', async () => {
            const createRes = await agent
                .post('/api/submissions')
                .set('Authorization', `Bearer ${token}`)
                .send({ insured: `Locked-${Date.now()}`, inceptionDate: '2026-06-01' })
            expect(createRes.status).toBe(201)

            await runQuery(
                `INSERT INTO submission_edit_lock (submission_id, org_code, locked_by_user_id, locked_by_user_name, locked_by_user_email, acquired_at, expires_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + interval '10 minutes', NOW())
                 ON CONFLICT (submission_id) DO UPDATE
                    SET locked_by_user_id = EXCLUDED.locked_by_user_id,
                        locked_by_user_name = EXCLUDED.locked_by_user_name,
                        locked_by_user_email = EXCLUDED.locked_by_user_email,
                        expires_at = EXCLUDED.expires_at,
                        updated_at = NOW()`,
                [createRes.body.id, createRes.body.createdByOrgCode, 999999, 'Alex Underwriter', 'alex@example.com']
            )

            const res = await agent
                .put(`/api/submissions/${createRes.body.id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ insured: 'Blocked Update' })

            expect(res.status).toBe(409)
            expect(res.body.message).toMatch(/locked for editing by Alex Underwriter/i)
        })
    })

    describe('POST/DELETE /api/submissions/:id/edit-lock (R10)', () => {
        test('T-BE-submissions-R10a — acquires the submission edit lock for the current user', async () => {
            const createRes = await agent
                .post('/api/submissions')
                .set('Authorization', `Bearer ${token}`)
                .send({ insured: `EditLock-${Date.now()}`, inceptionDate: '2026-06-01' })
            expect(createRes.status).toBe(201)

            const res = await agent
                .post(`/api/submissions/${createRes.body.id}/edit-lock`)
                .set('Authorization', `Bearer ${token}`)

            expect(res.status).toBe(200)
            expect(res.body.submissionId).toBe(createRes.body.id)
            expect(res.body.lockedByUserId).toBe(currentUserId)
            expect(res.body.isHeldByCurrentUser).toBe(true)
            expect(res.body.expiresAt).toBeDefined()
        })

        test('T-BE-submissions-R10b — returns 409 naming the other lock holder when lock is already held', async () => {
            const createRes = await agent
                .post('/api/submissions')
                .set('Authorization', `Bearer ${token}`)
                .send({ insured: `EditLockConflict-${Date.now()}`, inceptionDate: '2026-06-01' })
            expect(createRes.status).toBe(201)

            await runQuery(
                `INSERT INTO submission_edit_lock (submission_id, org_code, locked_by_user_id, locked_by_user_name, locked_by_user_email, acquired_at, expires_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + interval '10 minutes', NOW())`,
                [createRes.body.id, createRes.body.createdByOrgCode, 888888, 'Pat Reviewer', 'pat@example.com']
            )

            const res = await agent
                .post(`/api/submissions/${createRes.body.id}/edit-lock`)
                .set('Authorization', `Bearer ${token}`)

            expect(res.status).toBe(409)
            expect(res.body.lockedByUserName).toBe('Pat Reviewer')
            expect(res.body.message).toMatch(/locked for editing by Pat Reviewer/i)
        })

        test('T-BE-submissions-R10c — releases the current user edit lock', async () => {
            const createRes = await agent
                .post('/api/submissions')
                .set('Authorization', `Bearer ${token}`)
                .send({ insured: `EditUnlock-${Date.now()}`, inceptionDate: '2026-06-01' })
            expect(createRes.status).toBe(201)

            const lockRes = await agent
                .post(`/api/submissions/${createRes.body.id}/edit-lock`)
                .set('Authorization', `Bearer ${token}`)
            expect(lockRes.status).toBe(200)

            const deleteRes = await agent
                .delete(`/api/submissions/${createRes.body.id}/edit-lock`)
                .set('Authorization', `Bearer ${token}`)
            expect(deleteRes.status).toBe(204)

            const rows = await runQuery(
                'SELECT * FROM submission_edit_lock WHERE submission_id = $1 AND locked_by_user_id = $2',
                [createRes.body.id, currentUserId]
            )
            expect(rows).toHaveLength(0)
        })
    })

    // -------------------------------------------------------------------------
    // R05 — POST /api/submissions/:id/submit
    // -------------------------------------------------------------------------

    describe('POST /api/submissions/:id/submit (R05)', () => {
        test('T-BE-submissions-R05a — transitions status to In Review', async () => {
            // Create a fresh submission to submit (avoids state conflicts with other tests)
            const createRes = await agent
                .post('/api/submissions')
                .set('Authorization', `Bearer ${token}`)
                .send({ insured: `SubmitTest-${Date.now()}`, inceptionDate: '2026-06-01' })
            expect(createRes.status).toBe(201)
            const submitId = createRes.body.id

            const lockRes = await agent
                .post(`/api/submissions/${submitId}/edit-lock`)
                .set('Authorization', `Bearer ${token}`)
            expect(lockRes.status).toBe(200)

            const res = await agent
                .post(`/api/submissions/${submitId}/submit`)
                .set('Authorization', `Bearer ${token}`)
            expect(res.status).toBe(200)
            expect(res.body.status).toBe('In Review')
        })

        test('T-BE-submissions-R05d — returns 409 when another user holds the active edit lock', async () => {
            const createRes = await agent
                .post('/api/submissions')
                .set('Authorization', `Bearer ${token}`)
                .send({ insured: `SubmitLocked-${Date.now()}`, inceptionDate: '2026-06-01' })
            expect(createRes.status).toBe(201)

            await runQuery(
                `INSERT INTO submission_edit_lock (submission_id, org_code, locked_by_user_id, locked_by_user_name, locked_by_user_email, acquired_at, expires_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + interval '10 minutes', NOW())
                 ON CONFLICT (submission_id) DO UPDATE
                    SET locked_by_user_id = EXCLUDED.locked_by_user_id,
                        locked_by_user_name = EXCLUDED.locked_by_user_name,
                        locked_by_user_email = EXCLUDED.locked_by_user_email,
                        expires_at = EXCLUDED.expires_at,
                        updated_at = NOW()`,
                [createRes.body.id, createRes.body.createdByOrgCode, 777777, 'Morgan Reviewer', 'morgan@example.com']
            )

            const res = await agent
                .post(`/api/submissions/${createRes.body.id}/submit`)
                .set('Authorization', `Bearer ${token}`)

            expect(res.status).toBe(409)
            expect(res.body.message).toMatch(/locked for editing by Morgan Reviewer/i)
        })

        test('T-BE-submissions-R05b — returns 404 for unknown id', async () => {
            const res = await agent
                .post('/api/submissions/999999999/submit')
                .set('Authorization', `Bearer ${token}`)
            expect(res.status).toBe(404)
        })

        test('T-BE-submissions-R05c — returns 401 without token', async () => {
            const res = await agent.post(`/api/submissions/${createdId}/submit`)
            expect(res.status).toBe(401)
        })
    })

    // -------------------------------------------------------------------------
    // R06 — POST /api/submissions/:id/decline
    // -------------------------------------------------------------------------

    describe('POST /api/submissions/:id/decline (R06)', () => {
        test('T-BE-submissions-R06a — transitions status to Declined', async () => {
            // Create a fresh submission to decline
            const createRes = await agent
                .post('/api/submissions')
                .set('Authorization', `Bearer ${token}`)
                .send({ insured: `DeclineTest-${Date.now()}`, inceptionDate: '2026-06-01' })
            expect(createRes.status).toBe(201)
            const declineId = createRes.body.id

            const lockRes = await agent
                .post(`/api/submissions/${declineId}/edit-lock`)
                .set('Authorization', `Bearer ${token}`)
            expect(lockRes.status).toBe(200)

            const res = await agent
                .post(`/api/submissions/${declineId}/decline`)
                .set('Authorization', `Bearer ${token}`)
                .send({ reasonCode: 'capacity', reasonText: 'Integration test decline' })
            expect(res.status).toBe(200)
            expect(res.body.status).toBe('Declined')
        })

        test('T-BE-submissions-R06b — returns 400 when reasonCode is missing', async () => {
            const res = await agent
                .post(`/api/submissions/${createdId}/decline`)
                .set('Authorization', `Bearer ${token}`)
                .send({ reasonText: 'No reason code supplied' })
            expect(res.status).toBe(400)
        })

        test('T-BE-submissions-R06c — returns 404 for unknown id', async () => {
            const res = await agent
                .post('/api/submissions/999999999/decline')
                .set('Authorization', `Bearer ${token}`)
                .send({ reasonCode: 'capacity' })
            expect(res.status).toBe(404)
        })

        test('T-BE-submissions-R06d — returns 401 without token', async () => {
            const res = await agent
                .post(`/api/submissions/${createdId}/decline`)
                .send({ reasonCode: 'capacity' })
            expect(res.status).toBe(401)
        })

        test('T-BE-submissions-R06e — returns 409 when another user holds the active edit lock', async () => {
            const createRes = await agent
                .post('/api/submissions')
                .set('Authorization', `Bearer ${token}`)
                .send({ insured: `DeclineLocked-${Date.now()}`, inceptionDate: '2026-06-01' })
            expect(createRes.status).toBe(201)

            await runQuery(
                `INSERT INTO submission_edit_lock (submission_id, org_code, locked_by_user_id, locked_by_user_name, locked_by_user_email, acquired_at, expires_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + interval '10 minutes', NOW())
                 ON CONFLICT (submission_id) DO UPDATE
                    SET locked_by_user_id = EXCLUDED.locked_by_user_id,
                        locked_by_user_name = EXCLUDED.locked_by_user_name,
                        locked_by_user_email = EXCLUDED.locked_by_user_email,
                        expires_at = EXCLUDED.expires_at,
                        updated_at = NOW()`,
                [createRes.body.id, createRes.body.createdByOrgCode, 666666, 'Taylor Claims', 'taylor@example.com']
            )

            const res = await agent
                .post(`/api/submissions/${createRes.body.id}/decline`)
                .set('Authorization', `Bearer ${token}`)
                .send({ reasonCode: 'capacity', reasonText: 'Blocked decline' })

            expect(res.status).toBe(409)
            expect(res.body.message).toMatch(/locked for editing by Taylor Claims/i)
        })
    })

    // -------------------------------------------------------------------------
    // R09 — Related submissions join table endpoints
    // -------------------------------------------------------------------------

    describe('GET/POST/DELETE /api/submissions/:id/related (R09)', () => {
        test('T-BE-submissions-R09a — GET returns 200 with an array of related submissions', async () => {
            const parentRes = await agent
                .post('/api/submissions')
                .set('Authorization', `Bearer ${token}`)
                .send({ insured: `RelatedParent-${Date.now()}`, inceptionDate: '2026-06-01' })
            expect(parentRes.status).toBe(201)

            const childRes = await agent
                .post('/api/submissions')
                .set('Authorization', `Bearer ${token}`)
                .send({ insured: `RelatedChild-${Date.now()}`, inceptionDate: '2026-07-01' })
            expect(childRes.status).toBe(201)

            const linkRes = await agent
                .post(`/api/submissions/${parentRes.body.id}/related`)
                .set('Authorization', `Bearer ${token}`)
                .send({ relatedSubmissionId: childRes.body.id })
            expect(linkRes.status).toBe(201)

            const res = await agent
                .get(`/api/submissions/${parentRes.body.id}/related`)
                .set('Authorization', `Bearer ${token}`)

            expect(res.status).toBe(200)
            expect(Array.isArray(res.body)).toBe(true)
            expect(res.body.some((row) => row.id === childRes.body.id)).toBe(true)
        })

        test('T-BE-submissions-R09b — POST links a related submission and returns 201', async () => {
            const parentRes = await agent
                .post('/api/submissions')
                .set('Authorization', `Bearer ${token}`)
                .send({ insured: `LinkParent-${Date.now()}`, inceptionDate: '2026-06-01' })
            expect(parentRes.status).toBe(201)

            const childRes = await agent
                .post('/api/submissions')
                .set('Authorization', `Bearer ${token}`)
                .send({ insured: `LinkChild-${Date.now()}`, inceptionDate: '2026-07-01' })
            expect(childRes.status).toBe(201)

            const res = await agent
                .post(`/api/submissions/${parentRes.body.id}/related`)
                .set('Authorization', `Bearer ${token}`)
                .send({ relatedSubmissionId: childRes.body.id })

            expect(res.status).toBe(201)
            expect(res.body.id).toBe(childRes.body.id)
        })

        test('T-BE-submissions-R09c — DELETE removes a related submission link and returns 204', async () => {
            const parentRes = await agent
                .post('/api/submissions')
                .set('Authorization', `Bearer ${token}`)
                .send({ insured: `DeleteParent-${Date.now()}`, inceptionDate: '2026-06-01' })
            expect(parentRes.status).toBe(201)

            const childRes = await agent
                .post('/api/submissions')
                .set('Authorization', `Bearer ${token}`)
                .send({ insured: `DeleteChild-${Date.now()}`, inceptionDate: '2026-07-01' })
            expect(childRes.status).toBe(201)

            const linkRes = await agent
                .post(`/api/submissions/${parentRes.body.id}/related`)
                .set('Authorization', `Bearer ${token}`)
                .send({ relatedSubmissionId: childRes.body.id })
            expect(linkRes.status).toBe(201)

            const deleteRes = await agent
                .delete(`/api/submissions/${parentRes.body.id}/related/${childRes.body.id}`)
                .set('Authorization', `Bearer ${token}`)

            expect(deleteRes.status).toBe(204)

            const fetchRes = await agent
                .get(`/api/submissions/${parentRes.body.id}/related`)
                .set('Authorization', `Bearer ${token}`)

            expect(fetchRes.status).toBe(200)
            expect(fetchRes.body.some((row) => row.id === childRes.body.id)).toBe(false)
        })

        test('T-BE-submissions-R09d — POST returns 400 when relatedSubmissionId is missing', async () => {
            const parentRes = await agent
                .post('/api/submissions')
                .set('Authorization', `Bearer ${token}`)
                .send({ insured: `MissingBodyParent-${Date.now()}`, inceptionDate: '2026-06-01' })
            expect(parentRes.status).toBe(201)

            const res = await agent
                .post(`/api/submissions/${parentRes.body.id}/related`)
                .set('Authorization', `Bearer ${token}`)
                .send({})

            expect(res.status).toBe(400)
        })

        test('T-BE-submissions-R09e — GET returns 403 when the parent submission belongs to a different org', async () => {
            const rows = await runQuery(
                `INSERT INTO submission (reference, insured, status, "createdByOrgCode", "createdDate", "createdBy")
                 VALUES ($1, $2, $3, $4, NOW(), $5)
                 RETURNING id`,
                [`SUB-OTHER-${Date.now()}-001`, `OtherOrg-${Date.now()}`, 'Created', 'OTHERORG', 'Other User']
            )

            const res = await agent
                .get(`/api/submissions/${rows[0].id}/related`)
                .set('Authorization', `Bearer ${token}`)

            expect(res.status).toBe(403)
        })
    })

    // -------------------------------------------------------------------------
    // R35 — GET /api/submissions?date_basis=...&date_from=...&date_to=...
    // -------------------------------------------------------------------------

    describe('GET /api/submissions — date range filtering (R35)', () => {
        test('T-BE-submissions-R35a — filters by Created Date range', async () => {
            const res = await agent
                .get('/api/submissions?date_basis=Created%20Date&date_from=2020-01-01&date_to=2099-12-31')
                .set('Authorization', `Bearer ${token}`)
            expect(res.status).toBe(200)
            expect(Array.isArray(res.body)).toBe(true)
        })

        test('T-BE-submissions-R35b — returns empty array for date range with no records', async () => {
            const res = await agent
                .get('/api/submissions?date_basis=Created%20Date&date_from=1900-01-01&date_to=1900-01-02')
                .set('Authorization', `Bearer ${token}`)
            expect(res.status).toBe(200)
            expect(res.body).toEqual([])
        })

        test('T-BE-submissions-R35c — ignores invalid date_basis and returns all records', async () => {
            const allRes = await agent
                .get('/api/submissions')
                .set('Authorization', `Bearer ${token}`)
            const filteredRes = await agent
                .get('/api/submissions?date_basis=Invalid%20Column&date_from=2020-01-01&date_to=2099-12-31')
                .set('Authorization', `Bearer ${token}`)
            expect(filteredRes.status).toBe(200)
            expect(filteredRes.body.length).toBe(allRes.body.length)
        })
    })
})
