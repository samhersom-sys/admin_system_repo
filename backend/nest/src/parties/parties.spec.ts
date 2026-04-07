/**
 * parties.spec.ts — PartiesService unit tests
 * Domain: PAR-BE
 * Requirements: frontend/src/parties/parties.requirements.md + docs/Project Documentation/reconstruction-gap-analysis.md §4.4
 * Standard: AI Guidelines §06-Testing-Standards.md §6.2
 *
 * Tests are written per §03 Three-Artifact Rule:
 *   requirements.md → this file → implementation changes.
 *
 * Tests for findOne, update, entity CRUD, audit delegation, and related
 * submissions/quotes (REQ-PAR-BE-F-010 to F-015) are written ahead of
 * implementation and will FAIL until PartiesService adds these methods.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { PartiesService } from './parties.service'
import { Party } from '../entities/party.entity'
import { AuditService } from '../audit/audit.service'

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function makeParty(overrides: Partial<Party> = {}): Party {
    const p = new Party()
    p.id = 1
    p.name = 'Acme Insured Ltd'
    p.role = 'Insured'
    p.orgCode = 'TST'
    p.reference = 'PAR-TST-001'
    p.email = 'acme@example.com'
    p.phone = '01234567890'
    p.addressLine1 = '1 Test Street'
    p.addressLine2 = null
    p.addressLine3 = null
    p.city = 'London'
    p.state = null
    p.postcode = 'EC1A 1BB'
    p.country = 'GB'
    p.region = null
    p.wageRoll = null
    p.numberEmployees = null
    p.annualRevenue = null
    p.sicStandard = null
    p.sicCode = null
    p.sicDescription = null
    p.createdBy = 'alice'
    p.createdDate = new Date('2026-01-01T00:00:00Z')
    Object.assign(p, overrides)
    return p
}

function makeEntityRow(overrides: Record<string, any> = {}) {
    return {
        id: 1,
        party_id: 1,
        name: 'Syndicate 1234',
        entity_type: 'Syndicate',
        entity_code: '1234',
        reference: 'REF-001',
        notes: null,
        active: true,
        ...overrides,
    }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('PartiesService', () => {
    let service: PartiesService
    let mockPartyRepo: Record<string, jest.Mock>
    let mockDataSource: Record<string, jest.Mock>
    let mockAuditService: Record<string, jest.Mock>

    beforeEach(async () => {
        mockPartyRepo = {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
        }

        mockDataSource = {
            query: jest.fn(),
        }

        mockAuditService = {
            writeEvent: jest.fn(),
            getHistory: jest.fn(),
        }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PartiesService,
                { provide: getRepositoryToken(Party), useValue: mockPartyRepo },
                { provide: DataSource, useValue: mockDataSource },
                { provide: AuditService, useValue: mockAuditService },
            ],
        }).compile()

        service = module.get<PartiesService>(PartiesService)
    })

    afterEach(() => jest.clearAllMocks())

    // -------------------------------------------------------------------------
    // Existing tests — findAll and create (REQ-PAR-DOM-F-004 to F-010)
    // -------------------------------------------------------------------------
    describe('findAll', () => {
        it('T-PAR-BE-R01: returns mapped party DTOs for the caller orgCode', async () => {
            const party = makeParty()
            const qb: any = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([party]),
            }
            mockPartyRepo.createQueryBuilder = jest.fn().mockReturnValue(qb)

            const result = await service.findAll('TST')
            expect(result).toHaveLength(1)
            expect(result[0]).toMatchObject({ id: 1, name: 'Acme Insured Ltd', type: 'Insured', orgCode: 'TST' })
        })

        it('T-PAR-BE-R02: filters by type when provided', async () => {
            const qb: any = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            }
            mockPartyRepo.createQueryBuilder = jest.fn().mockReturnValue(qb)

            await service.findAll('TST', 'Broker')
            expect(qb.andWhere).toHaveBeenCalledWith(expect.any(String), { role: 'Broker' })
        })
    })

    describe('create', () => {
        it('T-PAR-BE-R03: throws BadRequestException when name is missing', async () => {
            await expect(service.create('TST', { type: 'Insured' })).rejects.toThrow(BadRequestException)
        })

        it('T-PAR-BE-R04: creates and returns a party DTO', async () => {
            const party = makeParty()
            mockPartyRepo.create = jest.fn().mockReturnValue(party)
            mockPartyRepo.save = jest.fn().mockResolvedValue(party)

            const result = await service.create('TST', { name: 'Acme Ltd', type: 'Insured' })
            expect(result).toMatchObject({ id: 1, name: 'Acme Insured Ltd', type: 'Insured' })
        })
    })

    // -------------------------------------------------------------------------
    // REQ-PAR-BE-F-010 — GET /api/parties/:id
    // Tests will FAIL until PartiesService adds findOne(orgCode, id).
    // -------------------------------------------------------------------------
    describe('findOne', () => {
        it('T-PAR-BE-NE-R10a: returns the party DTO when id and orgCode match', async () => {
            const party = makeParty()
            mockPartyRepo.findOne = jest.fn().mockResolvedValue(party)

            const result = await service.findOne('TST', 1)
            expect(result).toMatchObject({
                id: 1,
                name: 'Acme Insured Ltd',
                type: 'Insured',
                orgCode: 'TST',
                email: 'acme@example.com',
                addressLine1: '1 Test Street',
                country: 'GB',
            })
        })

        it('T-PAR-BE-NE-R10b: throws NotFoundException when party does not exist or belongs to another org', async () => {
            mockPartyRepo.findOne = jest.fn().mockResolvedValue(null)

            await expect(service.findOne('TST', 999)).rejects.toThrow(NotFoundException)
        })

        it('T-PAR-BE-NE-R10c: scopes the lookup to the caller orgCode (does not return other orgs\' parties)', async () => {
            mockPartyRepo.findOne = jest.fn().mockResolvedValue(null)

            await service.findOne('TST', 1).catch(() => { })

            expect(mockPartyRepo.findOne).toHaveBeenCalledWith(
                expect.objectContaining({ where: expect.objectContaining({ orgCode: 'TST' }) }),
            )
        })
    })

    // -------------------------------------------------------------------------
    // REQ-PAR-BE-F-011 — PUT /api/parties/:id
    // Tests will FAIL until PartiesService adds update(orgCode, id, body).
    // -------------------------------------------------------------------------
    describe('update', () => {
        it('T-PAR-BE-NE-R11a: updates and returns the party DTO with changed fields', async () => {
            const existing = makeParty()
            const updated = makeParty({ email: 'new@example.com' })
            mockPartyRepo.findOne = jest.fn().mockResolvedValue(existing)
            mockPartyRepo.save = jest.fn().mockResolvedValue(updated)

            const result = await service.update('TST', 1, { email: 'new@example.com' })
            expect(result).toMatchObject({ email: 'new@example.com' })
        })

        it('T-PAR-BE-NE-R11b: throws NotFoundException when party does not exist', async () => {
            mockPartyRepo.findOne = jest.fn().mockResolvedValue(null)

            await expect(service.update('TST', 999, { email: 'x@x.com' })).rejects.toThrow(NotFoundException)
        })

        it('T-PAR-BE-NE-R11c: ignores orgCode in the request body — always uses JWT orgCode', async () => {
            const existing = makeParty()
            const savedParty = makeParty()
            mockPartyRepo.findOne = jest.fn().mockResolvedValue(existing)
            mockPartyRepo.save = jest.fn().mockResolvedValue(savedParty)

            await service.update('TST', 1, { orgCode: 'HACKER', name: 'Renamed' })

            // The saved party must retain the original orgCode
            const savedArg: Party = mockPartyRepo.save.mock.calls[0][0]
            expect(savedArg.orgCode).toBe('TST')
        })
    })

    // -------------------------------------------------------------------------
    // REQ-PAR-BE-F-012a — GET /api/parties/:id/entities
    // Tests will FAIL until PartiesService adds findEntities(partyId).
    // -------------------------------------------------------------------------
    describe('findEntities', () => {
        it('T-PAR-BE-NE-R12a: returns active entity rows ordered by name ASC', async () => {
            const rows = [
                makeEntityRow({ id: 1, name: 'Alpha Syndicate' }),
                makeEntityRow({ id: 2, name: 'Beta Syndicate' }),
            ]
            mockDataSource.query = jest.fn().mockResolvedValue(rows)

            const result = await service.findEntities(1)
            expect(result).toHaveLength(2)
            expect(result[0]).toMatchObject({ id: 1, name: 'Alpha Syndicate', entity_type: 'Syndicate' })
        })

        it('T-PAR-BE-NE-R12a-empty: returns empty array when no active entities exist', async () => {
            mockDataSource.query = jest.fn().mockResolvedValue([])

            const result = await service.findEntities(1)
            expect(result).toEqual([])
        })
    })

    // -------------------------------------------------------------------------
    // REQ-PAR-BE-F-012b — POST /api/parties/:id/entities
    // Tests will FAIL until PartiesService adds createEntity(partyId, body).
    // -------------------------------------------------------------------------
    describe('createEntity', () => {
        it('T-PAR-BE-NE-R12b: creates entity with defaults and returns created row (HTTP 201 via controller)', async () => {
            const created = makeEntityRow()
            mockDataSource.query = jest.fn().mockResolvedValue([created])

            const result = await service.createEntity(1, { name: 'Syndicate 1234' })
            expect(result).toMatchObject({ id: 1, name: 'Syndicate 1234', entity_type: 'Syndicate' })
        })

        it('T-PAR-BE-NE-R12bc: throws BadRequestException when name is absent or blank', async () => {
            await expect(service.createEntity(1, {})).rejects.toThrow(BadRequestException)
            await expect(service.createEntity(1, { name: '' })).rejects.toThrow(BadRequestException)
        })

        it('T-PAR-BE-NE-R12b-type: uses provided entity_type when supplied, defaults to Syndicate when absent', async () => {
            mockDataSource.query = jest.fn().mockResolvedValue([makeEntityRow({ entity_type: 'Lloyd\'s Insurer' })])

            await service.createEntity(1, { name: 'Some Entity', entity_type: 'Lloyd\'s Insurer' })

            // The SQL INSERT must have been called with the provided entity_type
            const [, params] = mockDataSource.query.mock.calls[0]
            const typeParam = params.find((p: any) => p === "Lloyd's Insurer")
            expect(typeParam).toBeDefined()
        })
    })

    // -------------------------------------------------------------------------
    // REQ-PAR-BE-F-012c — PUT /api/parties/:id/entities/:entityId
    // Tests will FAIL until PartiesService adds updateEntity(partyId, entityId, body).
    // -------------------------------------------------------------------------
    describe('updateEntity', () => {
        it('T-PAR-BE-NE-R12c: updates entity fields and returns updated row', async () => {
            const updated = makeEntityRow({ name: 'Updated Name', entity_code: '9999' })
            mockDataSource.query = jest.fn()
                .mockResolvedValueOnce([makeEntityRow()])   // existence check
                .mockResolvedValueOnce([updated])           // UPDATE RETURNING

            const result = await service.updateEntity(1, 1, { name: 'Updated Name', entity_code: '9999' })
            expect(result).toMatchObject({ name: 'Updated Name', entity_code: '9999' })
        })

        it('T-PAR-BE-NE-R12c-not-found: throws NotFoundException when entity does not belong to the party', async () => {
            mockDataSource.query = jest.fn().mockResolvedValue([])  // existence check returns nothing

            await expect(service.updateEntity(1, 999, { name: 'X' })).rejects.toThrow(NotFoundException)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-PAR-BE-F-012d — DELETE /api/parties/:id/entities/:entityId
    // Tests will FAIL until PartiesService adds deleteEntity(partyId, entityId).
    // -------------------------------------------------------------------------
    describe('deleteEntity', () => {
        it('T-PAR-BE-NE-R12d: soft-deletes the entity by setting active=false', async () => {
            mockDataSource.query = jest.fn()
                .mockResolvedValueOnce([makeEntityRow()])   // existence check
                .mockResolvedValueOnce([])                  // UPDATE active=false

            await service.deleteEntity(1, 1)

            // The second query must set active = false
            const updateCall = mockDataSource.query.mock.calls[1]
            expect(updateCall[0]).toMatch(/active\s*=\s*(false|\$\d)/i)
        })

        it('T-PAR-BE-NE-R12d-not-found: throws NotFoundException when entity does not belong to the party', async () => {
            mockDataSource.query = jest.fn().mockResolvedValue([])  // entity not found

            await expect(service.deleteEntity(1, 999)).rejects.toThrow(NotFoundException)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-PAR-BE-F-013a — GET /api/parties/:id/audit
    // Tests will FAIL until PartiesService adds getAudit(partyId).
    // -------------------------------------------------------------------------
    describe('getAudit', () => {
        it('T-PAR-BE-NE-R13a: delegates to AuditService.getHistory with entity type "Party"', async () => {
            mockAuditService.getHistory = jest.fn().mockResolvedValue([])

            await service.getAudit(42)

            expect(mockAuditService.getHistory).toHaveBeenCalledWith('Party', '42')
        })

        it('T-PAR-BE-NE-R13a-returns: returns the result from AuditService.getHistory', async () => {
            const events = [{ action: 'Party Opened', user: 'alice', createdAt: '2026-01-01' }]
            mockAuditService.getHistory = jest.fn().mockResolvedValue(events)

            const result = await service.getAudit(1)
            expect(result).toEqual(events)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-PAR-BE-F-013b — POST /api/parties/:id/audit
    // Tests will FAIL until PartiesService adds writeAudit(partyId, body, user).
    // -------------------------------------------------------------------------
    describe('writeAudit', () => {
        it('T-PAR-BE-NE-R13b: delegates to AuditService.writeEvent with entity type "Party" and the supplied id', async () => {
            const mockUser = { id: 1, username: 'alice', email: 'alice@example.com' }
            mockAuditService.writeEvent = jest.fn().mockResolvedValue({ id: 1 })

            await service.writeAudit(5, { action: 'Party Opened', details: {} }, mockUser)

            expect(mockAuditService.writeEvent).toHaveBeenCalledWith(
                expect.objectContaining({ entityType: 'Party', entityId: 5, action: 'Party Opened' }),
                mockUser,
            )
        })
    })

    // -------------------------------------------------------------------------
    // REQ-PAR-BE-F-014 — GET /api/parties/:id/submissions
    // Tests will FAIL until PartiesService adds findRelatedSubmissions(partyId, orgCode).
    // -------------------------------------------------------------------------
    describe('findRelatedSubmissions', () => {
        it('T-PAR-BE-NE-R14: returns submissions where insured or placing_broker matches party name', async () => {
            const party = makeParty()
            mockPartyRepo.findOne = jest.fn().mockResolvedValue(party)
            const subRows = [{ id: 10, reference: 'SUB-001', insured: 'Acme Insured Ltd', status: 'Open', inception_date: '2026-01-01' }]
            mockDataSource.query = jest.fn().mockResolvedValue(subRows)

            const result = await service.findRelatedSubmissions(1, 'TST')
            expect(result).toHaveLength(1)
            expect(result[0]).toMatchObject({ reference: 'SUB-001' })
        })

        it('T-PAR-BE-NE-R14-not-found: throws NotFoundException when party does not exist', async () => {
            mockPartyRepo.findOne = jest.fn().mockResolvedValue(null)

            await expect(service.findRelatedSubmissions(999, 'TST')).rejects.toThrow(NotFoundException)
        })

        it('T-PAR-BE-NE-R14-scoped: scopes the submission query to the caller orgCode', async () => {
            const party = makeParty()
            mockPartyRepo.findOne = jest.fn().mockResolvedValue(party)
            mockDataSource.query = jest.fn().mockResolvedValue([])

            await service.findRelatedSubmissions(1, 'TST')

            const [, params] = mockDataSource.query.mock.calls[0]
            expect(params).toContain('TST')
        })
    })

    // -------------------------------------------------------------------------
    // REQ-PAR-BE-F-015 — GET /api/parties/:id/quotes
    // Tests will FAIL until PartiesService adds findRelatedQuotes(partyId, orgCode).
    // -------------------------------------------------------------------------
    describe('findRelatedQuotes', () => {
        it('T-PAR-BE-NE-R15: returns quotes where insured or placing_broker matches party name', async () => {
            const party = makeParty()
            mockPartyRepo.findOne = jest.fn().mockResolvedValue(party)
            const quoteRows = [{ id: 20, reference: 'QUO-001', insured: 'Acme Insured Ltd', status: 'Draft', inception_date: '2026-01-01' }]
            mockDataSource.query = jest.fn().mockResolvedValue(quoteRows)

            const result = await service.findRelatedQuotes(1, 'TST')
            expect(result).toHaveLength(1)
            expect(result[0]).toMatchObject({ reference: 'QUO-001' })
        })

        it('T-PAR-BE-NE-R15-not-found: throws NotFoundException when party does not exist', async () => {
            mockPartyRepo.findOne = jest.fn().mockResolvedValue(null)

            await expect(service.findRelatedQuotes(999, 'TST')).rejects.toThrow(NotFoundException)
        })

        it('T-PAR-BE-NE-R15-scoped: scopes the quotes query to the caller orgCode', async () => {
            const party = makeParty()
            mockPartyRepo.findOne = jest.fn().mockResolvedValue(party)
            mockDataSource.query = jest.fn().mockResolvedValue([])

            await service.findRelatedQuotes(1, 'TST')

            const [, params] = mockDataSource.query.mock.calls[0]
            expect(params).toContain('TST')
        })
    })
})
