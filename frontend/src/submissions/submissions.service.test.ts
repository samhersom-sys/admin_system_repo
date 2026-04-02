/**
 * TESTS � domains/submissions (domain logic)
 * Second artifact. Requirements: submissions.requirements.md
 * Test ID format: T-submissions-DOMAIN-R[NN]
 */

// API CONTRACT ALIGNMENT:
//   POST /api/submissions -> Submission
//   GET  /api/submissions/:id -> Submission
//   GET  /api/submissions -> Submission[]
//   PUT  /api/submissions/:id -> Submission
//   No .data wrapper - all responses return value directly at root level.

// ---------------------------------------------------------------------------
// Mock api-client BEFORE importing the module under test
// (jest.mock is hoisted but explicit placement avoids TypeScript confusion)
// ---------------------------------------------------------------------------

jest.mock('@/shared/lib/api-client/api-client', () => ({
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
}))

import { post, get, put } from '@/shared/lib/api-client/api-client'
import {
    buildReference,
    defaultExpiryDate,
    createSubmission,
    getSubmission,
    listSubmissions,
    updateSubmission,
} from './submissions.service'
import type { CreateSubmissionInput } from './submissions.service'

// ---------------------------------------------------------------------------
// R03 � Reference number format
// ---------------------------------------------------------------------------

describe('T-submissions-DOMAIN-R03: buildReference', () => {
    it('produces the correct format for orgCode DEMO, sequence 1', () => {
        expect(buildReference('DEMO', '2026-03-10', 1)).toBe('SUB-DEMO-20260310-001')
    })

    it('produces the correct format for orgCode AIG, sequence 12', () => {
        expect(buildReference('AIG', '2026-01-05', 12)).toBe('SUB-AIG-20260105-012')
    })

    it('pads sequence to 3 digits minimum', () => {
        expect(buildReference('XYZ', '2026-06-01', 1)).toMatch(/-001$/)
        expect(buildReference('XYZ', '2026-06-01', 99)).toMatch(/-099$/)
        expect(buildReference('XYZ', '2026-06-01', 100)).toMatch(/-100$/)
    })

    it('uppercases the orgCode in the reference', () => {
        expect(buildReference('demo', '2026-03-10', 1)).toContain('SUB-DEMO-')
    })
})

// ---------------------------------------------------------------------------
// R04 � Expiry date default
// ---------------------------------------------------------------------------

describe('T-submissions-DOMAIN-R04: defaultExpiryDate', () => {
    it('returns inception + 1 year when no expiry supplied', () => {
        expect(defaultExpiryDate('2026-03-10', undefined)).toBe('2027-03-10')
    })

    it('handles Feb 28 in non-leap year', () => {
        expect(defaultExpiryDate('2026-02-28', undefined)).toBe('2027-02-28')
    })

    it('returns the explicit expiry unchanged when supplied', () => {
        expect(defaultExpiryDate('2026-03-10', '2026-12-31')).toBe('2026-12-31')
    })

    it('returns the explicit expiry even if it is before inception', () => {
        // The domain does not validate date ordering � that is the form's job
        expect(defaultExpiryDate('2026-03-10', '2025-01-01')).toBe('2025-01-01')
    })
})

// ---------------------------------------------------------------------------
// R05 � createSubmission API call
// (Integration: mocked api-client)
// ---------------------------------------------------------------------------

const mockPost = post as jest.MockedFunction<typeof post>
const mockGet = get as jest.MockedFunction<typeof get>
const mockPut = put as jest.MockedFunction<typeof put>

const baseInput: CreateSubmissionInput = {
    insuredId: 'party_001',
    insuredName: 'Acme Corp',
    inceptionDate: '2026-03-10',
    orgCode: 'DEMO',
    createdBy: 'Jane Smith',
    // reference intentionally omitted � backend generates it (�4.9)
}

describe('T-submissions-DOMAIN-R05: createSubmission', () => {
    beforeEach(() => jest.clearAllMocks())

    it('does not include reference in the API payload (backend generates it)', async () => {
        mockPost.mockResolvedValueOnce({ id: 1, status: 'Created' })
        await createSubmission(baseInput)
        const payload = mockPost.mock.calls[0][1] as Record<string, unknown>
        expect(payload).not.toHaveProperty('reference')
    })

    it('calls POST /api/submissions', async () => {
        mockPost.mockResolvedValueOnce({ id: 1, reference: 'SUB-DEMO-20260310-001', status: 'Created' })
        await createSubmission(baseInput)
        expect(mockPost).toHaveBeenCalledWith('/api/submissions', expect.any(Object))
    })

    it('does not include status in the payload (enforced server-side)', async () => {
        mockPost.mockResolvedValueOnce({ id: 1, status: 'Created' })
        await createSubmission(baseInput)
        const payload = mockPost.mock.calls[0][1] as Record<string, unknown>
        // Backend always forces status = 'Created'; frontend does not override it
        expect(payload).not.toHaveProperty('status')
    })

    it('sends null expiryDate when not supplied (backend applies the 1-year default)', async () => {
        mockPost.mockResolvedValueOnce({ id: 1, status: 'Created' })
        await createSubmission(baseInput)
        const payload = mockPost.mock.calls[0][1] as Record<string, unknown>
        // The frontend no longer pre-computes the default � the backend enforces it (�4.9)
        expect(payload.expiryDate).toBeNull()
    })

    it('uses the supplied expiryDate when provided', async () => {
        mockPost.mockResolvedValueOnce({ id: 1, status: 'Created' })
        await createSubmission({ ...baseInput, expiryDate: '2026-12-31' })
        const payload = mockPost.mock.calls[0][1] as Record<string, unknown>
        expect(payload.expiryDate).toBe('2026-12-31')
    })

    it('sets createdDate to a valid ISO timestamp', async () => {
        mockPost.mockResolvedValueOnce({ id: 1, status: 'Created' })
        await createSubmission(baseInput)
        const payload = mockPost.mock.calls[0][1] as Record<string, unknown>
        expect(typeof payload.createdDate).toBe('string')
        expect(() => new Date(payload.createdDate as string).toISOString()).not.toThrow()
    })

    it('returns the Submission from the API response', async () => {
        const mockSub = { id: 42, reference: 'SUB-DEMO-20260310-001', status: 'Created' }
        mockPost.mockResolvedValueOnce(mockSub)
        const result = await createSubmission(baseInput)
        expect(result).toEqual(mockSub)
    })
})

// ---------------------------------------------------------------------------
// R06 � getSubmission API call
// ---------------------------------------------------------------------------

describe('T-submissions-DOMAIN-R06: getSubmission', () => {
    beforeEach(() => jest.clearAllMocks())

    it('calls GET /api/submissions/:id', async () => {
        mockGet.mockResolvedValueOnce({ id: 5, reference: 'SUB-DEMO-20260310-001' })
        await getSubmission(5)
        expect(mockGet).toHaveBeenCalledWith('/api/submissions/5')
    })

    it('returns the Submission from the API response', async () => {
        const mockSub = { id: 5, reference: 'SUB-DEMO-20260310-001', status: 'In Review' }
        mockGet.mockResolvedValueOnce(mockSub)
        const result = await getSubmission(5)
        expect(result).toEqual(mockSub)
    })
})

// ---------------------------------------------------------------------------
// R07 � listSubmissions API call
// ---------------------------------------------------------------------------

describe('T-submissions-DOMAIN-R07: listSubmissions', () => {
    beforeEach(() => jest.clearAllMocks())

    it('calls GET /api/submissions with no filters', async () => {
        mockGet.mockResolvedValueOnce([])
        await listSubmissions()
        expect(mockGet).toHaveBeenCalledWith('/api/submissions')
    })

    it('appends status filter as query param', async () => {
        mockGet.mockResolvedValueOnce([])
        await listSubmissions({ status: 'Created' })
        expect(mockGet).toHaveBeenCalledWith('/api/submissions?status=Created')
    })

    it('returns Submission array', async () => {
        const mockList = [{ id: 1 }, { id: 2 }]
        mockGet.mockResolvedValueOnce(mockList)
        const result = await listSubmissions()
        expect(result).toEqual(mockList)
    })
})

// ---------------------------------------------------------------------------
// R08 � updateSubmission API call
// ---------------------------------------------------------------------------

describe('T-submissions-DOMAIN-R08: updateSubmission', () => {
    beforeEach(() => jest.clearAllMocks())

    it('calls PUT /api/submissions/:id with the patch', async () => {
        mockPut.mockResolvedValueOnce({ id: 3 })
        await updateSubmission(3, { inceptionDate: '2026-01-01' })
        expect(mockPut).toHaveBeenCalledWith('/api/submissions/3', { inceptionDate: '2026-01-01' })
    })

    it('strips status from the patch to prevent status changes via this function', async () => {
        mockPut.mockResolvedValueOnce({ id: 3 })
        await updateSubmission(3, { contractType: 'Lineslip', status: 'Bound' } as Parameters<typeof updateSubmission>[1])
        const payload = mockPut.mock.calls[0][1] as Record<string, unknown>
        expect(payload.status).toBeUndefined()
    })
})
