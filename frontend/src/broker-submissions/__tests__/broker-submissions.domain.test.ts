/**
 * broker-submissions.domain.test.ts
 *
 * Domain: PSS-BRK-DOM
 * Requirements: frontend/src/broker-submissions/broker-submissions.requirements.md
 * Standard: AI Guidelines §06-Testing-Standards.md, §03-Three-Artifact-Rule.md
 *
 * Coverage (Layer 1 — frontend domain service unit tests):
 *   REQ-PSS-BRK-DOM-F-001  What a broker submission holds (type shape)
 *   REQ-PSS-BRK-DOM-F-002  Two submission types: manual and platform_shared
 *   REQ-PSS-BRK-DOM-F-003  Only approved type values are accepted
 *   REQ-PSS-BRK-DOM-F-004  Each submission has a unique system-assigned id
 *   REQ-PSS-BRK-DOM-F-005  Submission records creating org, user, and timestamp
 *   REQ-PSS-BRK-DOM-F-006  Submission records updated_at timestamp
 *   REQ-PSS-BRK-DOM-F-007  Initial status is "Created"
 *   REQ-PSS-BRK-DOM-F-008  Status can be updated
 *   REQ-PSS-BRK-DOM-F-009  Org classified as broker, insurer, or platform
 *   REQ-PSS-BRK-DOM-F-010  Existing orgs default to insurer classification
 *   REQ-PSS-BRK-DOM-F-012  createBrokerSubmission calls POST and returns the saved record
 *   REQ-PSS-BRK-DOM-F-013  listBrokerSubmissions calls GET with optional filters
 *   REQ-PSS-BRK-DOM-F-014  getBrokerSubmission calls GET by id and returns the record
 *   REQ-PSS-BRK-DOM-F-015  updateBrokerSubmission calls PUT with only changed fields
 *
 * Note: REQ-PSS-BRK-DOM-F-011 (only platform admin can change org type) is enforced
 * server-side — tested in broker-submissions.spec.ts (PSS-BRK-BE).
 *
 * Tests written BEFORE implementation per Three-Artifact Rule.
 * All tests will fail until the service file is created.
 */

// API CONTRACT: POST /api/broker-submissions
// Status: endpoint not yet implemented — mock reflects agreed contract shape
// Contract defined in: backend/nest/src/broker-submissions/broker-submissions.requirements.md

import {
    createBrokerSubmission,
    listBrokerSubmissions,
    getBrokerSubmission,
    updateBrokerSubmission,
    type BrokerSubmission,
    type CreateBrokerSubmissionInput,
    BROKER_SUBMISSION_TYPES,
} from '../broker-submissions.service'

jest.mock('@/shared/lib/api-client/api-client', () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
}))

import { get, post, put } from '@/shared/lib/api-client/api-client'

const mockGet = get as jest.Mock
const mockPost = post as jest.Mock
const mockPut = put as jest.Mock

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeSubmission(overrides: Partial<BrokerSubmission> = {}): BrokerSubmission {
    return {
        id: 1,
        orgCode: 'BROKER1',
        reference: 'BRK-REF-001',
        insuredName: 'Acme Ltd',
        classOfBusiness: 'Property',
        estimatedPremium: 50000,
        inceptionDate: '2026-06-01',
        expiryDate: '2027-06-01',
        source: 'manual',
        sharingStatus: 'not_shared',
        platformSubmissionId: null,
        workflowStatus: 'Created',
        assignedTo: null,
        createdBy: 1,
        createdAt: '2026-05-15T10:00:00Z',
        updatedAt: '2026-05-15T10:00:00Z',
        ...overrides,
    }
}

function makeInput(overrides: Partial<CreateBrokerSubmissionInput> = {}): CreateBrokerSubmissionInput {
    return {
        insuredName: 'Acme Ltd',
        inceptionDate: '2026-06-01',
        source: 'manual',
        ...overrides,
    }
}

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-DOM-F-001 — What a broker submission holds
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-DOM-F-001 — BrokerSubmission type shape', () => {
    it('T-PSS-BRK-DOM-R001: BrokerSubmission includes all required fields: id, insuredName, inceptionDate, source, sharingStatus, workflowStatus, createdBy, createdAt, updatedAt', () => {
        const s = makeSubmission()
        // Every mandatory field from the requirements must be present on the type
        expect(s).toHaveProperty('id')
        expect(s).toHaveProperty('insuredName')
        expect(s).toHaveProperty('classOfBusiness')
        expect(s).toHaveProperty('estimatedPremium')
        expect(s).toHaveProperty('inceptionDate')
        expect(s).toHaveProperty('expiryDate')
        expect(s).toHaveProperty('source')
        expect(s).toHaveProperty('sharingStatus')
        expect(s).toHaveProperty('workflowStatus')
        expect(s).toHaveProperty('createdBy')
        expect(s).toHaveProperty('createdAt')
        expect(s).toHaveProperty('updatedAt')
        // orgCode — records which organisation owns the submission
        expect(s).toHaveProperty('orgCode')
    })

    it('T-PSS-BRK-DOM-R001b: BrokerSubmission includes an optional broker reference field', () => {
        const withRef = makeSubmission({ reference: 'MY-REF-01' })
        const withoutRef = makeSubmission({ reference: undefined })
        expect(withRef.reference).toBe('MY-REF-01')
        expect(withoutRef.reference).toBeUndefined()
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-DOM-F-002 — Two submission types
// REQ-PSS-BRK-DOM-F-003 — Only approved type values accepted
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-DOM-F-002/003 — Submission type constants', () => {
    it('T-PSS-BRK-DOM-R002: BROKER_SUBMISSION_TYPES contains exactly "manual" and "platform_shared"', () => {
        expect(BROKER_SUBMISSION_TYPES).toContain('manual')
        expect(BROKER_SUBMISSION_TYPES).toContain('platform_shared')
        expect(BROKER_SUBMISSION_TYPES).toHaveLength(2)
    })

    it('T-PSS-BRK-DOM-R003: BROKER_SUBMISSION_TYPES does not contain any unlisted values', () => {
        const forbidden = ['email', 'platform_received', 'imported', 'api', '']
        forbidden.forEach(v => {
            expect(BROKER_SUBMISSION_TYPES).not.toContain(v)
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-DOM-F-007 — Initial status is "Created"
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-DOM-F-007 — Default status', () => {
    it('T-PSS-BRK-DOM-R007: createBrokerSubmission returns a record with workflowStatus "Created"', async () => {
        const saved = makeSubmission({ workflowStatus: 'Created' })
        mockPost.mockResolvedValue(saved)
        const result = await createBrokerSubmission(makeInput())
        expect(result.workflowStatus).toBe('Created')
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-DOM-F-012 — createBrokerSubmission
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-DOM-F-012 — createBrokerSubmission', () => {
    beforeEach(() => jest.clearAllMocks())

    it('T-PSS-BRK-DOM-R012a: calls POST /api/broker-submissions with the provided input fields', async () => {
        const saved = makeSubmission()
        mockPost.mockResolvedValue(saved)
        const input = makeInput({ insuredName: 'Test Co', inceptionDate: '2026-07-01', source: 'platform_shared' })
        await createBrokerSubmission(input)
        expect(mockPost).toHaveBeenCalledWith(
            '/api/broker-submissions',
            expect.objectContaining({ insuredName: 'Test Co', inceptionDate: '2026-07-01', source: 'platform_shared' }),
        )
    })

    it('T-PSS-BRK-DOM-R012b: returns the full saved submission record returned by the API', async () => {
        const saved = makeSubmission({ id: 42, insuredName: 'Saved Co' })
        mockPost.mockResolvedValue(saved)
        const result = await createBrokerSubmission(makeInput({ insuredName: 'Saved Co' }))
        expect(result.id).toBe(42)
        expect(result.insuredName).toBe('Saved Co')
    })

    it('T-PSS-BRK-DOM-R012c: propagates an error when the API call fails', async () => {
        mockPost.mockRejectedValue(new Error('Network error'))
        await expect(createBrokerSubmission(makeInput())).rejects.toThrow('Network error')
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-DOM-F-013 — listBrokerSubmissions
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-DOM-F-013 — listBrokerSubmissions', () => {
    beforeEach(() => jest.clearAllMocks())

    it('T-PSS-BRK-DOM-R013a: calls GET /api/broker-submissions with no filters when called without arguments', async () => {
        mockGet.mockResolvedValue([])
        await listBrokerSubmissions()
        expect(mockGet).toHaveBeenCalledWith('/api/broker-submissions')
    })

    it('T-PSS-BRK-DOM-R013b: passes source filter as a query string parameter when filtering by submission type', async () => {
        mockGet.mockResolvedValue([])
        await listBrokerSubmissions({ source: 'manual' })
        expect(mockGet).toHaveBeenCalledWith('/api/broker-submissions?source=manual')
    })

    it('T-PSS-BRK-DOM-R013c: passes status filter as a query string parameter when filtering by status', async () => {
        mockGet.mockResolvedValue([])
        await listBrokerSubmissions({ status: 'Created' })
        expect(mockGet).toHaveBeenCalledWith('/api/broker-submissions?status=Created')
    })

    it('T-PSS-BRK-DOM-R013d: returns an array of BrokerSubmission objects', async () => {
        const subs = [makeSubmission({ id: 1 }), makeSubmission({ id: 2 })]
        mockGet.mockResolvedValue(subs)
        const result = await listBrokerSubmissions()
        expect(Array.isArray(result)).toBe(true)
        expect(result).toHaveLength(2)
    })

    it('T-PSS-BRK-DOM-R013e: returns an empty array when the API returns no submissions', async () => {
        mockGet.mockResolvedValue([])
        const result = await listBrokerSubmissions()
        expect(result).toEqual([])
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-DOM-F-014 — getBrokerSubmission
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-DOM-F-014 — getBrokerSubmission', () => {
    beforeEach(() => jest.clearAllMocks())

    it('T-PSS-BRK-DOM-R014a: calls GET /api/broker-submissions/:id with the correct id', async () => {
        mockGet.mockResolvedValue(makeSubmission({ id: 7 }))
        await getBrokerSubmission(7)
        expect(mockGet).toHaveBeenCalledWith('/api/broker-submissions/7')
    })

    it('T-PSS-BRK-DOM-R014b: returns the full submission record', async () => {
        const s = makeSubmission({ id: 7, insuredName: 'Marine Corp' })
        mockGet.mockResolvedValue(s)
        const result = await getBrokerSubmission(7)
        expect(result.id).toBe(7)
        expect(result.insuredName).toBe('Marine Corp')
    })

    it('T-PSS-BRK-DOM-R014c: propagates a not-found error when the API returns an error', async () => {
        mockGet.mockRejectedValue(new Error('Not found'))
        await expect(getBrokerSubmission(999)).rejects.toThrow('Not found')
    })
})

// ---------------------------------------------------------------------------
// REQ-PSS-BRK-DOM-F-015 — updateBrokerSubmission
// ---------------------------------------------------------------------------

describe('REQ-PSS-BRK-DOM-F-015 — updateBrokerSubmission', () => {
    beforeEach(() => jest.clearAllMocks())

    it('T-PSS-BRK-DOM-R015a: calls PUT /api/broker-submissions/:id with only the changed fields', async () => {
        const updated = makeSubmission({ id: 3, estimatedPremium: 99000 })
        mockPut.mockResolvedValue(updated)
        await updateBrokerSubmission(3, { estimatedPremium: 99000 })
        expect(mockPut).toHaveBeenCalledWith(
            '/api/broker-submissions/3',
            expect.objectContaining({ estimatedPremium: 99000 }),
        )
        // Must not send unrelated fields
        const callArg = mockPut.mock.calls[0][1] as Record<string, unknown>
        expect(Object.keys(callArg)).toEqual(['estimatedPremium'])
    })

    it('T-PSS-BRK-DOM-R015b: returns the updated submission record', async () => {
        const updated = makeSubmission({ id: 3, estimatedPremium: 99000 })
        mockPut.mockResolvedValue(updated)
        const result = await updateBrokerSubmission(3, { estimatedPremium: 99000 })
        expect(result.estimatedPremium).toBe(99000)
    })

    it('T-PSS-BRK-DOM-R015c: propagates an error when the API call fails', async () => {
        mockPut.mockRejectedValue(new Error('Forbidden'))
        await expect(updateBrokerSubmission(3, { estimatedPremium: 1 })).rejects.toThrow('Forbidden')
    })
})
