/**
 * Parties domain � unit tests
 *
 * Requirements: parties.requirements.md
 */

import { get, post, put, del } from '@/shared/lib/api-client/api-client'
import {
    listParties,
    createParty,
    getParty,
    updateParty,
    getPartyEntities,
    createPartyEntity,
    updatePartyEntity,
    deletePartyEntity,
    getPartyAudit,
    postPartyAudit,
    getPartySubmissions,
    getPartyQuotes,
} from './parties.service'

// ---------------------------------------------------------------------------
// Mocks
//
// API CONTRACT ALIGNMENT (verified — backend endpoint live):
//   GET    /api/parties                           → Party[]
//   POST   /api/parties                           → Party
//   GET    /api/parties/:id                        → Party
//   PUT    /api/parties/:id                        → Party
//   GET    /api/parties/:id/entities               → EntityRow[]
//   POST   /api/parties/:id/entities               → EntityRow
//   PUT    /api/parties/:id/entities/:entityId     → EntityRow
//   DELETE /api/parties/:id/entities/:entityId     → 204
//   GET    /api/parties/:id/audit                  → AuditEvent[]
//   POST   /api/parties/:id/audit                  → AuditEvent
//   GET    /api/parties/:id/submissions            → RelatedRecord[]
//   GET    /api/parties/:id/quotes                 → RelatedRecord[]
//   No .data wrapper — all responses return value directly at root level
// ---------------------------------------------------------------------------

jest.mock('@/shared/lib/api-client/api-client', () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    del: jest.fn(),
}))

const mockGet = get as jest.Mock
const mockPost = post as jest.Mock
const mockPut = put as jest.Mock
const mockDel = del as jest.Mock

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

// ---------------------------------------------------------------------------
// F-020 — getParty
// ---------------------------------------------------------------------------
describe('getParty', () => {
    it('T-parties-DOMAIN-R011a: fetches a single party by ID', async () => {
        const party = { id: 7, name: 'Acme Insurance Ltd', type: 'Insurer', orgCode: 'DEMO' }
        mockGet.mockResolvedValueOnce(party)
        const result = await getParty(7)
        expect(result).toEqual(party)
        expect(mockGet).toHaveBeenCalledWith('/api/parties/7')
    })

    it('T-parties-DOMAIN-R011b: accepts string ID', async () => {
        mockGet.mockResolvedValueOnce({ id: 7 })
        await getParty('7')
        expect(mockGet).toHaveBeenCalledWith('/api/parties/7')
    })

    it('T-parties-DOMAIN-R012: throws when party not found', async () => {
        mockGet.mockRejectedValueOnce(new Error('Not Found'))
        await expect(getParty(999)).rejects.toThrow('Not Found')
    })
})

// ---------------------------------------------------------------------------
// F-032 — updateParty
// ---------------------------------------------------------------------------
describe('updateParty', () => {
    it('T-parties-DOMAIN-R032a: sends PUT with patch payload and returns updated party', async () => {
        const patch = { name: 'Updated Name', email: 'new@acme.co.uk' }
        const updated = { id: 1, ...patch, type: 'Insurer', orgCode: 'DEMO' }
        mockPut.mockResolvedValueOnce(updated)
        const result = await updateParty('1', patch)
        expect(result).toEqual(updated)
        expect(mockPut).toHaveBeenCalledWith('/api/parties/1', patch)
    })

    it('T-parties-DOMAIN-R032b: throws on validation error', async () => {
        mockPut.mockRejectedValueOnce(new Error('Validation failed'))
        await expect(updateParty(1, { name: '' })).rejects.toThrow('Validation failed')
    })
})

// ---------------------------------------------------------------------------
// F-033 — getPartyEntities
// ---------------------------------------------------------------------------
describe('getPartyEntities', () => {
    it('T-parties-DOMAIN-R033a: fetches entities for a party', async () => {
        const entities = [
            { id: 10, party_id: 1, name: 'London Branch', entity_type: 'Syndicate' },
        ]
        mockGet.mockResolvedValueOnce(entities)
        const result = await getPartyEntities(1)
        expect(result).toEqual(entities)
        expect(mockGet).toHaveBeenCalledWith('/api/parties/1/entities')
    })

    it('T-parties-DOMAIN-R033b: returns empty array when no entities', async () => {
        mockGet.mockResolvedValueOnce([])
        const result = await getPartyEntities(1)
        expect(result).toEqual([])
    })
})

// ---------------------------------------------------------------------------
// F-034 — createPartyEntity
// ---------------------------------------------------------------------------
describe('createPartyEntity', () => {
    it('T-parties-DOMAIN-R034: posts entity and returns created record', async () => {
        const input = { name: 'New Entity', entity_type: 'Syndicate' }
        const created = { id: 99, party_id: 1, ...input }
        mockPost.mockResolvedValueOnce(created)
        const result = await createPartyEntity('1', input)
        expect(result).toEqual(created)
        expect(mockPost).toHaveBeenCalledWith('/api/parties/1/entities', input)
    })
})

// ---------------------------------------------------------------------------
// F-035 — updatePartyEntity
// ---------------------------------------------------------------------------
describe('updatePartyEntity', () => {
    it('T-parties-DOMAIN-R035: sends PUT to entity endpoint and returns updated entity', async () => {
        const patch = { name: 'Renamed Entity' }
        const updated = { id: 10, party_id: 1, name: 'Renamed Entity', entity_type: 'Syndicate' }
        mockPut.mockResolvedValueOnce(updated)
        const result = await updatePartyEntity(1, 10, patch)
        expect(result).toEqual(updated)
        expect(mockPut).toHaveBeenCalledWith('/api/parties/1/entities/10', patch)
    })
})

// ---------------------------------------------------------------------------
// F-036 — deletePartyEntity
// ---------------------------------------------------------------------------
describe('deletePartyEntity', () => {
    it('T-parties-DOMAIN-R036a: sends DELETE to entity endpoint', async () => {
        mockDel.mockResolvedValueOnce(undefined)
        await deletePartyEntity('1', 10)
        expect(mockDel).toHaveBeenCalledWith('/api/parties/1/entities/10')
    })

    it('T-parties-DOMAIN-R036b: throws when entity not found', async () => {
        mockDel.mockRejectedValueOnce(new Error('Not Found'))
        await expect(deletePartyEntity(1, 999)).rejects.toThrow('Not Found')
    })
})

// ---------------------------------------------------------------------------
// F-037 — getPartyAudit
// ---------------------------------------------------------------------------
describe('getPartyAudit', () => {
    it('T-parties-DOMAIN-R037: fetches audit trail for a party', async () => {
        const audit = [
            { id: 100, action: 'Party Created', user: 'Jane', date: '2026-01-15T09:00:00Z', details: null, changes: null },
        ]
        mockGet.mockResolvedValueOnce(audit)
        const result = await getPartyAudit(1)
        expect(result).toEqual(audit)
        expect(mockGet).toHaveBeenCalledWith('/api/parties/1/audit')
    })
})

// ---------------------------------------------------------------------------
// F-038 — postPartyAudit
// ---------------------------------------------------------------------------
describe('postPartyAudit', () => {
    it('T-parties-DOMAIN-R038: posts audit event to correct endpoint', async () => {
        const event = { action: 'Party Opened', entityType: 'Party', entityId: 1, performedBy: 'Jane' }
        mockPost.mockResolvedValueOnce(undefined)
        await postPartyAudit(1, event)
        expect(mockPost).toHaveBeenCalledWith('/api/parties/1/audit', event)
    })
})

// ---------------------------------------------------------------------------
// F-039 — getPartySubmissions
// ---------------------------------------------------------------------------
describe('getPartySubmissions', () => {
    it('T-parties-DOMAIN-R039: fetches related submissions', async () => {
        const subs = [{ id: 201, reference: 'SUB-001', status: 'Draft' }]
        mockGet.mockResolvedValueOnce(subs)
        const result = await getPartySubmissions(1)
        expect(result).toEqual(subs)
        expect(mockGet).toHaveBeenCalledWith('/api/parties/1/submissions')
    })
})

// ---------------------------------------------------------------------------
// F-040 — getPartyQuotes
// ---------------------------------------------------------------------------
describe('getPartyQuotes', () => {
    it('T-parties-DOMAIN-R040: fetches related quotes', async () => {
        const quotes = [{ id: 301, reference: 'QUO-001', status: 'Quoted' }]
        mockGet.mockResolvedValueOnce(quotes)
        const result = await getPartyQuotes(1)
        expect(result).toEqual(quotes)
        expect(mockGet).toHaveBeenCalledWith('/api/parties/1/quotes')
    })
})
