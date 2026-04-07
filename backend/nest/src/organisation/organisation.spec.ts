/**
 * organisation.spec.ts — OrganisationService unit tests
 * Domain: SETTINGS-BE → Organisation & Hierarchy
 * Requirements: docs/Project Documentation/reconstruction-gap-analysis.md §4.7
 * Standard: AI Guidelines §06-Testing-Standards.md §6.2
 *
 * Tests cover REQ-SET-BE-F-006:
 *   T-ORG-BE-R01 — findByCode (GET /organisation-entities?code=:code)
 *   T-ORG-BE-R02 — create    (POST /organisation-entities)
 *   T-ORG-BE-R03 — update    (PUT  /organisation-entities/:id)
 *   T-ORG-BE-R04 — getHierarchyConfig  (GET  /organisation-entities/:id/hierarchy-config)
 *   T-ORG-BE-R05 — saveHierarchyConfig (POST /organisation-entities/:id/hierarchy-config)
 *   T-ORG-BE-R06 — getHierarchyLinks   (GET  /organisation-entities/:id/hierarchy-links)
 *   T-ORG-BE-R07 — saveHierarchyLinks  (POST /organisation-entities/:id/hierarchy-links)
 *   T-ORG-BE-R08 — getGlobalHierarchyLevels (GET /organisation-hierarchy)
 *   T-ORG-BE-R09 — getUsers            (GET /users)
 */

import { Test, TestingModule } from '@nestjs/testing'
import { getDataSourceToken } from '@nestjs/typeorm'
import { NotFoundException } from '@nestjs/common'
import { OrganisationService } from './organisation.service'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockEntity = {
    id: 1,
    entityName: 'Head Office',
    entityCode: 'HO',
    description: 'Main headquarters',
    isActive: true,
}

const mockLevel = {
    id: 1,
    organisationEntityId: 1,
    hierarchyLevelId: 2,
    description: 'Regional level',
    isActive: true,
    levelName: 'Region',
    levelOrder: 2,
}

const mockLink = {
    id: 1,
    organisationEntityId: 1,
    parentConfigId: 1,
    childConfigId: 2,
    description: 'Group → Region',
    isActive: true,
    parentLevelId: 1,
    childLevelId: 2,
    parentLevelName: 'Group',
    childLevelName: 'Region',
}

const mockGlobalLevel = { id: 1, levelName: 'Group', levelOrder: 1 }

const mockUser = { id: 1, username: 'jsmith', email: 'j@example.com' }

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('OrganisationService', () => {
    let service: OrganisationService
    let mockQuery: jest.Mock

    beforeEach(async () => {
        mockQuery = jest.fn()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrganisationService,
                { provide: getDataSourceToken(), useValue: { query: mockQuery } },
            ],
        }).compile()

        service = module.get<OrganisationService>(OrganisationService)
    })

    afterEach(() => jest.clearAllMocks())

    // =========================================================================
    // T-ORG-BE-R01: findByCode
    // =========================================================================

    describe('T-ORG-BE-R01: findByCode', () => {
        it('T-ORG-BE-R01a — returns matching entities for a given code', async () => {
            mockQuery.mockResolvedValue([mockEntity])
            const result = await service.findByCode('HO')
            expect(result).toEqual([mockEntity])
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('organisation_entities'), ['HO'])
        })

        it('T-ORG-BE-R01b — returns empty array when no match', async () => {
            mockQuery.mockResolvedValue([])
            const result = await service.findByCode('UNKNOWN')
            expect(result).toEqual([])
        })
    })

    // =========================================================================
    // T-ORG-BE-R02: create
    // =========================================================================

    describe('T-ORG-BE-R02: create', () => {
        it('T-ORG-BE-R02a — inserts entity and returns created record', async () => {
            mockQuery.mockResolvedValue([mockEntity])
            const result = await service.create({
                entityName: 'Head Office',
                entityCode: 'HO',
                hierarchyLevelId: 1,
                description: 'Main headquarters',
            })
            expect(result).toEqual(mockEntity)
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO organisation_entities'),
                expect.arrayContaining(['Head Office', 'HO']),
            )
        })

        it('T-ORG-BE-R02b — defaults isActive to true when not provided', async () => {
            mockQuery.mockResolvedValue([{ ...mockEntity }])
            await service.create({ entityName: 'New Org', entityCode: 'NO' })
            const callArgs = mockQuery.mock.calls[0][1] as any[]
            expect(callArgs[callArgs.length - 1]).toBe(true) // isActive = true
        })
    })

    // =========================================================================
    // T-ORG-BE-R03: update
    // =========================================================================

    describe('T-ORG-BE-R03: update', () => {
        it('T-ORG-BE-R03a — updates entity and returns updated record', async () => {
            const updated = { ...mockEntity, entityName: 'Global HQ' }
            mockQuery.mockResolvedValue([updated])
            const result = await service.update(1, { entityName: 'Global HQ', entityCode: 'HO' })
            expect(result).toEqual(updated)
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE organisation_entities'),
                expect.arrayContaining(['Global HQ']),
            )
        })

        it('T-ORG-BE-R03b — throws NotFoundException when entity not found', async () => {
            mockQuery.mockResolvedValue([])
            await expect(service.update(999, { entityName: 'X', entityCode: 'X' })).rejects.toThrow(NotFoundException)
        })
    })

    // =========================================================================
    // T-ORG-BE-R04: getHierarchyConfig
    // =========================================================================

    describe('T-ORG-BE-R04: getHierarchyConfig', () => {
        it('T-ORG-BE-R04a — returns hierarchy config levels for an entity', async () => {
            mockQuery.mockResolvedValue([mockLevel])
            const result = await service.getHierarchyConfig(1)
            expect(result).toEqual([mockLevel])
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('organisation_hierarchy_config'),
                [1],
            )
        })

        it('T-ORG-BE-R04b — returns empty array when no config exists', async () => {
            mockQuery.mockResolvedValue([])
            const result = await service.getHierarchyConfig(99)
            expect(result).toEqual([])
        })
    })

    // =========================================================================
    // T-ORG-BE-R05: saveHierarchyConfig
    // =========================================================================

    describe('T-ORG-BE-R05: saveHierarchyConfig', () => {
        it('T-ORG-BE-R05a — deletes then inserts levels, returning inserted rows', async () => {
            mockQuery
                .mockResolvedValueOnce([]) // DELETE
                .mockResolvedValueOnce([{ id: 1, organisationEntityId: 1, hierarchyLevelId: 2, description: null }])
            const levels = [{ levelId: 2, description: null }]
            const result = await service.saveHierarchyConfig(1, levels)
            expect(result).toHaveLength(1)
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM organisation_hierarchy_config'),
                [1],
            )
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO organisation_hierarchy_config'),
                [1, 2, null],
            )
        })

        it('T-ORG-BE-R05b — returns empty array when levels is empty', async () => {
            mockQuery.mockResolvedValueOnce([]) // DELETE
            const result = await service.saveHierarchyConfig(1, [])
            expect(result).toEqual([])
        })
    })

    // =========================================================================
    // T-ORG-BE-R06: getHierarchyLinks
    // =========================================================================

    describe('T-ORG-BE-R06: getHierarchyLinks', () => {
        it('T-ORG-BE-R06a — returns hierarchy links for an entity', async () => {
            mockQuery.mockResolvedValue([mockLink])
            const result = await service.getHierarchyLinks(1)
            expect(result).toEqual([mockLink])
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('organisation_hierarchy_links'),
                [1],
            )
        })

        it('T-ORG-BE-R06b — returns empty array when no links exist', async () => {
            mockQuery.mockResolvedValue([])
            const result = await service.getHierarchyLinks(99)
            expect(result).toEqual([])
        })
    })

    // =========================================================================
    // T-ORG-BE-R07: saveHierarchyLinks
    // =========================================================================

    describe('T-ORG-BE-R07: saveHierarchyLinks', () => {
        it('T-ORG-BE-R07a — deletes then inserts links, returning inserted rows', async () => {
            mockQuery
                .mockResolvedValueOnce([]) // DELETE
                .mockResolvedValueOnce([{ id: 1, organisationEntityId: 1, parentConfigId: 1, childConfigId: 2, description: null }])
            const links = [{ parentConfigId: 1, childConfigId: 2, description: null }]
            const result = await service.saveHierarchyLinks(1, links)
            expect(result).toHaveLength(1)
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM organisation_hierarchy_links'),
                [1],
            )
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO organisation_hierarchy_links'),
                [1, 1, 2, null],
            )
        })

        it('T-ORG-BE-R07b — returns empty array when links is empty', async () => {
            mockQuery.mockResolvedValueOnce([]) // DELETE
            const result = await service.saveHierarchyLinks(1, [])
            expect(result).toEqual([])
        })
    })

    // =========================================================================
    // T-ORG-BE-R08: getGlobalHierarchyLevels
    // =========================================================================

    describe('T-ORG-BE-R08: getGlobalHierarchyLevels', () => {
        it('T-ORG-BE-R08a — returns all hierarchy levels ordered by level_order', async () => {
            mockQuery.mockResolvedValue([mockGlobalLevel])
            const result = await service.getGlobalHierarchyLevels()
            expect(result).toEqual([mockGlobalLevel])
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('organisation_hierarchy'),
            )
        })

        it('T-ORG-BE-R08b — returns empty array when no levels defined', async () => {
            mockQuery.mockResolvedValue([])
            const result = await service.getGlobalHierarchyLevels()
            expect(result).toEqual([])
        })
    })

    // =========================================================================
    // T-ORG-BE-R09: getUsers
    // =========================================================================

    describe('T-ORG-BE-R09: getUsers', () => {
        it('T-ORG-BE-R09a — returns active users (id, username, email)', async () => {
            mockQuery.mockResolvedValue([mockUser])
            const result = await service.getUsers()
            expect(result).toEqual([mockUser])
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('SELECT id, username, email'),
            )
        })

        it('T-ORG-BE-R09b — returns empty array when no users exist', async () => {
            mockQuery.mockResolvedValue([])
            const result = await service.getUsers()
            expect(result).toEqual([])
        })
    })
})
