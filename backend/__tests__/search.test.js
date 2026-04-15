/**
 * TESTS — Backend Search Route
 * Second artifact. Requirements: backend/routes/search.requirements.md
 * Test ID format: T-BE-SEARCH-R[NN]
 *
 * Run: npm run test:backend
 *
 * Requires:
 *   - The Cleaned backend running on port 5000
 *   - policyforge_cleaned database with submission, party tables and audit_event table
 */

'use strict'

const { agent, runQuery, closePool, getAuthToken } = require('./helpers')

let token
let orgCode = 'TESTORG'

// Seeded test records — IDs stored here after beforeAll inserts them
let testSubmissionId
let testQuoteId
let testPolicyId
let testBindingAuthorityId
let testClaimId

beforeAll(async () => {
    token = await getAuthToken()

    // Look up the orgCode of the admin user so our test data matches
    const userRows = await runQuery(`SELECT org_code FROM users WHERE email = 'admin@policyforge.com' LIMIT 1`)
    if (userRows.length > 0) orgCode = userRows[0].org_code

    // Seed a submission in the correct org
    const subRows = await runQuery(
        `INSERT INTO submission (reference, insured, status, "createdByOrgCode", "createdDate", "createdBy")
         VALUES ('SEARCH-TEST-SUB-001', 'SearchTestInsured Ltd', 'Created', $1, NOW(), 'test')
         RETURNING id`,
        [orgCode]
    )
    testSubmissionId = subRows[0].id

    const quoteRows = await runQuery(
        `INSERT INTO quotes (reference, insured, status, created_date, created_by, created_by_org_code)
         VALUES ('SEARCH-TEST-QUO-001', 'Search Quote Insured Ltd', 'Draft', NOW(), 'test', $1)
         RETURNING id`,
        [orgCode]
    )
    testQuoteId = quoteRows[0].id

    const policyRows = await runQuery(
        `INSERT INTO policies (reference, insured, status, created_date, created_by, created_by_org_code)
         VALUES ('SEARCH-TEST-POL-001', 'Search Policy Insured Ltd', 'Active', NOW(), 'test', $1)
         RETURNING id`,
        [orgCode]
    )
    testPolicyId = policyRows[0].id

    const bindingAuthorityRows = await runQuery(
        `INSERT INTO binding_authorities (reference, submission_id, status, year_of_account, created_at, created_by, created_by_org_code)
         VALUES ('SEARCH-TEST-BA-001', $1, 'Active', 2026, NOW(), 'test', $2)
         RETURNING id`,
        [testSubmissionId, orgCode]
    )
    testBindingAuthorityId = bindingAuthorityRows[0].id

    const claimRows = await runQuery(
        `INSERT INTO claims (policy_id, claim_number, reference, status)
         VALUES ($1, 'CLM-SEARCH-001', 'SEARCH-TEST-CLM-001', 'Open')
         RETURNING id`,
        [testPolicyId]
    )
    testClaimId = claimRows[0].id
})

afterAll(async () => {
    if (testSubmissionId) {
        await runQuery(`DELETE FROM submission WHERE id = $1`, [testSubmissionId])
        await runQuery(`DELETE FROM public.audit_event WHERE entity_type = 'Submission' AND entity_id = $1`, [testSubmissionId])
    }
    if (testQuoteId) {
        await runQuery(`DELETE FROM quotes WHERE id = $1`, [testQuoteId])
        await runQuery(`DELETE FROM public.audit_event WHERE entity_type = 'Quote' AND entity_id = $1`, [testQuoteId])
    }
    if (testClaimId) {
        await runQuery(`DELETE FROM claims WHERE id = $1`, [testClaimId])
        await runQuery(`DELETE FROM public.audit_event WHERE entity_type = 'Claim' AND entity_id = $1`, [testClaimId])
    }
    if (testBindingAuthorityId) {
        await runQuery(`DELETE FROM binding_authorities WHERE id = $1`, [testBindingAuthorityId])
        await runQuery(`DELETE FROM public.audit_event WHERE entity_type = 'Binding Authority' AND entity_id = $1`, [testBindingAuthorityId])
    }
    if (testPolicyId) {
        await runQuery(`DELETE FROM policies WHERE id = $1`, [testPolicyId])
        await runQuery(`DELETE FROM public.audit_event WHERE entity_type = 'Policy' AND entity_id = $1`, [testPolicyId])
    }
    await closePool()
})

// ---------------------------------------------------------------------------
// T-BE-SEARCH-R01 — Authentication
// REQ-SEARCH-BE-F-001
// ---------------------------------------------------------------------------

describe('T-BE-SEARCH-R01: GET /api/search — authentication', () => {
    it('T-BE-SEARCH-R01a: returns 401 when Authorization header is absent', async () => {
        const res = await agent.get('/api/search')
        expect(res.status).toBe(401)
    })

    it('T-BE-SEARCH-R01b: returns 403 when token is invalid', async () => {
        // Invalid token (present but malformed) → 403 Forbidden, not 401.
        // 401 = no credentials; 403 = credentials present but invalid/expired.
        // See auth test T-BE-AUTH-R06c which documents this design decision.
        const res = await agent
            .get('/api/search')
            .set('Authorization', 'Bearer invalid.token')
        expect(res.status).toBe(403)
    })
})

// ---------------------------------------------------------------------------
// T-BE-SEARCH-R02 — Org scoping (no cross-tenant leak)
// REQ-SEARCH-BE-F-002
// ---------------------------------------------------------------------------

describe('T-BE-SEARCH-R02: GET /api/search — org scoping', () => {
    it('T-BE-SEARCH-R02a: does not return submissions from a different orgCode', async () => {
        // Insert a submission under a different org
        const foreignRows = await runQuery(
            `INSERT INTO submission (reference, insured, status, "createdByOrgCode", "createdDate", "createdBy")
             VALUES ('SEARCH-FOREIGN-001', 'ForeignOrg Ltd', 'Created', 'FOREIGNORG', NOW(), 'test')
             RETURNING id`
        )
        const foreignId = foreignRows[0].id

        try {
            const res = await agent
                .get('/api/search')
                .set('Authorization', `Bearer ${token}`)
                .query({ reference: 'SEARCH-FOREIGN-001' })
            expect(res.status).toBe(200)
            expect(res.body.submissions.every(s => s.reference !== 'SEARCH-FOREIGN-001')).toBe(true)
        } finally {
            await runQuery(`DELETE FROM submission WHERE id = $1`, [foreignId])
        }
    })
})

// ---------------------------------------------------------------------------
// T-BE-SEARCH-R03 / R04 / R05 — Default mode
// REQ-SEARCH-BE-F-003, F-004, F-005
// ---------------------------------------------------------------------------

describe('T-BE-SEARCH-R03-R05: GET /api/search — default mode (no filters)', () => {
    it('T-BE-SEARCH-R03a: returns 200 with correct top-level keys when no filters provided', async () => {
        const res = await agent
            .get('/api/search')
            .set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('submissions')
        expect(res.body).toHaveProperty('quotes')
        expect(res.body).toHaveProperty('policies')
        expect(res.body).toHaveProperty('bindingAuthorities')
        expect(res.body).toHaveProperty('parties')
        expect(res.body).toHaveProperty('claims')
    })

    it('T-BE-SEARCH-R03b: returns at most 15 records per type in default mode', async () => {
        const res = await agent
            .get('/api/search')
            .set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(200)
        expect(res.body.submissions.length).toBeLessThanOrEqual(15)
        expect(res.body.quotes.length).toBeLessThanOrEqual(15)
        expect(res.body.policies.length).toBeLessThanOrEqual(15)
    })

    it('T-BE-SEARCH-R04a: falls back to createdDate ordering when user has no audit events', async () => {
        // Delete any audit events for the test user so we hit the fallback path
        const userRows = await runQuery(`SELECT id FROM users WHERE email = 'admin@policyforge.com' LIMIT 1`)
        const userId = userRows[0]?.id

        if (userId) {
            await runQuery(`DELETE FROM public.audit_event WHERE user_id = $1`, [userId])
        }

        const res = await agent
            .get('/api/search')
            .set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(200)
        // Should still return results (from createdDate fallback), not an error
        expect(Array.isArray(res.body.submissions)).toBe(true)
    })

    it('T-BE-SEARCH-R05a: each record in the default response has a lastOpenedDate field', async () => {
        // Seed an audit event for our test submission so at least one record has lastOpenedDate
        await runQuery(
            `INSERT INTO public.audit_event (entity_type, entity_id, action, details, created_by, user_id, user_name)
             VALUES ('Submission', $1, 'Submission Opened', '{}', 'admin', NULL, 'admin')`,
            [testSubmissionId]
        )

        const res = await agent
            .get('/api/search')
            .set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(200)
        // Every item in every array must have a lastOpenedDate key (may be null for fallback items)
        const allRecords = [
            ...res.body.submissions,
            ...res.body.quotes,
            ...res.body.policies,
            ...res.body.bindingAuthorities,
            ...res.body.parties,
            ...res.body.claims,
        ]
        allRecords.forEach(r => expect('lastOpenedDate' in r).toBe(true))
    })
})

// ---------------------------------------------------------------------------
// T-BE-SEARCH-R06 / R07 / R08 — Filter mode
// REQ-SEARCH-BE-F-006, F-007, F-008
// ---------------------------------------------------------------------------

describe('T-BE-SEARCH-R06-R08: GET /api/search — filter mode', () => {
    it('T-BE-SEARCH-R08a: returns submission matching reference filter (case-insensitive)', async () => {
        const res = await agent
            .get('/api/search')
            .set('Authorization', `Bearer ${token}`)
            .query({ reference: 'search-test-sub' }) // lowercase — tests ILIKE
        expect(res.status).toBe(200)
        expect(res.body.submissions.some(s => s.reference === 'SEARCH-TEST-SUB-001')).toBe(true)
    })

    it('T-BE-SEARCH-R08b: returns submission matching insured filter (partial, case-insensitive)', async () => {
        const res = await agent
            .get('/api/search')
            .set('Authorization', `Bearer ${token}`)
            .query({ insured: 'searchtestinsured' })
        expect(res.status).toBe(200)
        expect(res.body.submissions.some(s => s.reference === 'SEARCH-TEST-SUB-001')).toBe(true)
    })

    it('T-BE-SEARCH-R07a: returns 400 when type param is not a valid entity type', async () => {
        const res = await agent
            .get('/api/search')
            .set('Authorization', `Bearer ${token}`)
            .query({ type: 'InvalidType' })
        expect(res.status).toBe(400)
    })

    it('T-BE-SEARCH-R07b: when type=Submission only submissions key is populated', async () => {
        const res = await agent
            .get('/api/search')
            .set('Authorization', `Bearer ${token}`)
            .query({ type: 'Submission', reference: 'SEARCH-TEST-SUB' })
        expect(res.status).toBe(200)
        expect(Array.isArray(res.body.submissions)).toBe(true)
        // Other arrays must be empty when type filter is set
        expect(res.body.quotes).toEqual([])
        expect(res.body.policies).toEqual([])
        expect(res.body.bindingAuthorities).toEqual([])
        expect(res.body.parties).toEqual([])
        expect(res.body.claims).toEqual([])
    })
})

// ---------------------------------------------------------------------------
// T-BE-SEARCH-R09 — Date filter validation
// REQ-SEARCH-BE-F-009
// ---------------------------------------------------------------------------

describe('T-BE-SEARCH-R09: GET /api/search — date filter validation', () => {
    it('T-BE-SEARCH-R09a: returns 400 when inceptionFrom is not a valid date', async () => {
        const res = await agent
            .get('/api/search')
            .set('Authorization', `Bearer ${token}`)
            .query({ inceptionFrom: 'not-a-date' })
        expect(res.status).toBe(400)
    })
})

// ---------------------------------------------------------------------------
// T-BE-SEARCH-R11 / R12 — Response shape
// REQ-SEARCH-BE-F-011, F-012
// ---------------------------------------------------------------------------

describe('T-BE-SEARCH-R11-R12: GET /api/search — response shape', () => {
    it('T-BE-SEARCH-R11a: response always has all six entity keys', async () => {
        const res = await agent
            .get('/api/search')
            .set('Authorization', `Bearer ${token}`)
            .query({ reference: '__no_match_possible_xyzzy__' })
        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('submissions')
        expect(res.body).toHaveProperty('quotes')
        expect(res.body).toHaveProperty('policies')
        expect(res.body).toHaveProperty('bindingAuthorities')
        expect(res.body).toHaveProperty('parties')
        expect(res.body).toHaveProperty('claims')
    })

    it('T-BE-SEARCH-R12a: returns 200 when there are zero results', async () => {
        const res = await agent
            .get('/api/search')
            .set('Authorization', `Bearer ${token}`)
            .query({ reference: '__no_match_possible_xyzzy__' })
        expect(res.status).toBe(200)
    })
})

// ---------------------------------------------------------------------------
// T-BE-SEARCH-R14 — Quote search uses the live quotes table contract
// REQ-SEARCH-BE-F-014
// ---------------------------------------------------------------------------

describe('T-BE-SEARCH-R14: GET /api/search — quote search contract', () => {
    it('T-BE-SEARCH-R14a: returns Quote matches from the current quotes table with aliased fields', async () => {
        const res = await agent
            .get('/api/search')
            .set('Authorization', `Bearer ${token}`)
            .query({ type: 'Quote', reference: 'SEARCH-TEST-QUO-001' })

        expect(res.status).toBe(200)
        expect(res.body.submissions).toEqual([])
        expect(res.body.quotes).toHaveLength(1)
        expect(res.body.quotes[0]).toMatchObject({
            id: testQuoteId,
            reference: 'SEARCH-TEST-QUO-001',
            insured: 'Search Quote Insured Ltd',
            status: 'Draft',
        })
        expect(res.body.quotes[0]).toHaveProperty('createdDate')
        expect(res.body.quotes[0]).toHaveProperty('createdBy')
        expect(res.body.quotes[0]).toHaveProperty('yearOfAccount', null)
        expect(res.body.quotes[0]).not.toHaveProperty('created_date')
        expect(res.body.quotes[0]).not.toHaveProperty('created_by')
    })
})

describe('T-BE-SEARCH-R15: GET /api/search — policy search contract', () => {
    it('T-BE-SEARCH-R15a: returns Policy matches from the current policies table with aliased fields', async () => {
        const res = await agent
            .get('/api/search')
            .set('Authorization', `Bearer ${token}`)
            .query({ type: 'Policy', reference: 'SEARCH-TEST-POL-001' })

        expect(res.status).toBe(200)
        expect(res.body.policies).toHaveLength(1)
        expect(res.body.policies[0]).toMatchObject({
            id: testPolicyId,
            reference: 'SEARCH-TEST-POL-001',
            insured: 'Search Policy Insured Ltd',
            status: 'Active',
        })
        expect(res.body.policies[0]).toHaveProperty('createdDate')
        expect(res.body.policies[0]).toHaveProperty('createdBy')
        expect(res.body.policies[0]).toHaveProperty('yearOfAccount', null)
        expect(res.body.policies[0]).not.toHaveProperty('created_date')
        expect(res.body.policies[0]).not.toHaveProperty('created_by')
    })
})

describe('T-BE-SEARCH-R16: GET /api/search — binding authority search contract', () => {
    it('T-BE-SEARCH-R16a: returns Binding Authority matches from the current binding_authorities table with aliased fields', async () => {
        const res = await agent
            .get('/api/search')
            .set('Authorization', `Bearer ${token}`)
            .query({ type: 'Binding Authority', reference: 'SEARCH-TEST-BA-001' })

        expect(res.status).toBe(200)
        expect(res.body.bindingAuthorities).toHaveLength(1)
        expect(res.body.bindingAuthorities[0]).toMatchObject({
            id: testBindingAuthorityId,
            reference: 'SEARCH-TEST-BA-001',
            status: 'Active',
            insured: 'SearchTestInsured Ltd',
            yearOfAccount: 2026,
        })
        expect(res.body.bindingAuthorities[0]).toHaveProperty('createdDate')
        expect(res.body.bindingAuthorities[0]).toHaveProperty('createdBy', 'test')
        expect(res.body.bindingAuthorities[0]).not.toHaveProperty('created_at')
    })
})

describe('T-BE-SEARCH-R17: GET /api/search — claim search contract', () => {
    it('T-BE-SEARCH-R17a: returns Claim matches from the current claims table scoped through policies with aliased fields', async () => {
        const res = await agent
            .get('/api/search')
            .set('Authorization', `Bearer ${token}`)
            .query({ type: 'Claim', reference: 'SEARCH-TEST-CLM-001' })

        expect(res.status).toBe(200)
        expect(res.body.claims).toHaveLength(1)
        expect(res.body.claims[0]).toMatchObject({
            id: testClaimId,
            reference: 'SEARCH-TEST-CLM-001',
            status: 'Open',
        })
        expect(res.body.claims[0]).toHaveProperty('createdDate')
        expect(res.body.claims[0]).toHaveProperty('createdBy', null)
        expect(res.body.claims[0]).not.toHaveProperty('created_at')
    })
})
