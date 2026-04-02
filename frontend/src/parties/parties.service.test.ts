/**
 * Parties domain � unit tests
 *
 * Requirements: parties.requirements.md
 */

// API CONTRACT ALIGNMENT (verified - backend endpoint live):
//   GET    /api/parties -> Party[]
//   POST   /api/parties -> Party
//   GET    /api/parties/:id -> Party
//   PUT    /api/parties/:id -> Party
//   GET    /api/parties/:id/entities -> EntityRow[]
//   POST   /api/parties/:id/entities -> EntityRow
//   PUT    /api/parties/:id/entities/:entityId -> EntityRow
//   DELETE /api/parties/:id/entities/:entityId -> 204
//   GET    /api/parties/:id/audit -> AuditEvent[]
//   POST   /api/parties/:id/audit -> AuditEvent
//   GET    /api/parties/:id/submissions -> RelatedRecord[]
//   GET    /api/parties/:id/quotes -> RelatedRecord[]
//   No .data wrapper - all responses return value directly at root level.

import { get, post } from '@/shared/lib/api-client/api-client'
import { listParties, createParty } from './parties.service'

jest.mock('@/shared/lib/api-client/api-client', () => ({
    get: jest.fn(),
    post: jest.fn(),
}))

const mockGet = get as jest.Mock
const mockPost = post as jest.Mock

beforeEach(() => {
    jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// R02 � listParties
// ---------------------------------------------------------------------------
describe('listParties', () => {
    it('T-parties-DOMAIN-R02a: returns a Party[] on success', async () => {
        const parties = [{ id: 1, name: 'Acme Ltd', type: 'Insured', orgCode: 'DEMO' }]
        mockGet.mockResolvedValueOnce(parties)
        const result = await listParties()
        expect(result).toEqual(parties)
        expect(mockGet).toHaveBeenCalledWith('/api/parties')
    })

    it('T-parties-DOMAIN-R02b: forwards type filter as query param', async () => {
        mockGet.mockResolvedValueOnce([])
        await listParties({ type: 'Insured' })
        expect(mockGet).toHaveBeenCalledWith('/api/parties?type=Insured')
    })

    it('T-parties-DOMAIN-R02c: forwards search filter as query param', async () => {
        mockGet.mockResolvedValueOnce([])
        await listParties({ search: 'acme' })
        expect(mockGet).toHaveBeenCalledWith('/api/parties?search=acme')
    })

    it('T-parties-DOMAIN-R02d: throws when API returns an error', async () => {
        mockGet.mockRejectedValueOnce(new Error('Network error'))
        await expect(listParties()).rejects.toThrow('Network error')
    })
})

// ---------------------------------------------------------------------------
// R03 � createParty
// ---------------------------------------------------------------------------
describe('createParty', () => {
    it('T-parties-DOMAIN-R03a: posts correct payload and returns created party', async () => {
        const input = { name: 'Acme Ltd', type: 'Insured', orgCode: 'DEMO', createdBy: 'Jane Smith' }
        const created = { id: 42, ...input }
        mockPost.mockResolvedValueOnce(created)
        const result = await createParty(input)
        expect(result).toEqual(created)
        expect(mockPost).toHaveBeenCalledWith('/api/parties', input)
    })

    it('T-parties-DOMAIN-R03b: throws on non-201 response', async () => {
        mockPost.mockRejectedValueOnce(new Error('Bad Request'))
        await expect(createParty({ name: '', type: 'Insured', orgCode: 'DEMO', createdBy: 'Jane' })).rejects.toThrow('Bad Request')
    })
})
