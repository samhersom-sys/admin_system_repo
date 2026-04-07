/**
 * locations.spec.ts — LocationsScheduleService unit tests
 * Domain: LOC-BE-NE
 * Standard: AI Guidelines §06-Testing-Standards.md §6.2
 *
 * Coverage:
 *   R01 — getImports (list versions for entity, with access control)
 *   R02 — importCsv (validates input, inserts versioned row)
 *   R03 — getVersions (all versions for an import)
 *   R04 — revertToVersion (deactivates current, inserts clone)
 *   R05 — getHistorical (all rows including inactive)
 */

import { Test, TestingModule } from '@nestjs/testing'
import { DataSource } from 'typeorm'
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { LocationsScheduleService } from './locations.service'

// ---------------------------------------------------------------------------
// Mock factory
// ---------------------------------------------------------------------------

function makeVersion(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    import_id: 10,
    versionNumber: 1,
    payload: { rows: [{ address1: '1 Test St' }] },
    createdBy: 'alice@test.com',
    createdAt: new Date().toISOString(),
    isActive: true,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('LocationsScheduleService', () => {
  let service: LocationsScheduleService
  let mockDataSource: Record<string, jest.Mock>

  beforeEach(async () => {
    mockDataSource = {
      query: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsScheduleService,
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile()

    service = module.get<LocationsScheduleService>(LocationsScheduleService)
  })

  afterEach(() => jest.clearAllMocks())

  // -------------------------------------------------------------------------
  // REQ-LOC-BE-NE-R01 — getImports
  // -------------------------------------------------------------------------
  describe('getImports', () => {
    it('T-LOC-BE-NE-R01a: throws BadRequestException when entityType is missing', async () => {
      await expect(service.getImports('', 1, 'TST')).rejects.toThrow(BadRequestException)
    })

    it('T-LOC-BE-NE-R01b: throws BadRequestException when entityId is missing', async () => {
      await expect(service.getImports('Quote', 0, 'TST')).rejects.toThrow(BadRequestException)
    })

    it('T-LOC-BE-NE-R01c: throws ForbiddenException when org has no access to entity', async () => {
      mockDataSource.query.mockResolvedValueOnce([]) // assertAccess: no rows
      await expect(service.getImports('Quote', 99, 'TST')).rejects.toThrow(ForbiddenException)
    })

    it('T-LOC-BE-NE-R01d: returns versions list for accessible Quote entity', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ id: 10 }]) // assertAccess: quote found
        .mockResolvedValueOnce([makeVersion()]) // versions query

      const result = await service.getImports('Quote', 10, 'TST')
      expect(result).toHaveLength(1)
    })

    it('T-LOC-BE-NE-R01e: normalises "policy" entityType to access policies table', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ id: 5 }]) // assertAccess with policies table
        .mockResolvedValueOnce([]) // no versions

      const result = await service.getImports('policy', 5, 'TST')
      expect(result).toEqual([])
      const accessSql = mockDataSource.query.mock.calls[0][0] as string
      expect(accessSql).toContain('policies')
    })
  })

  // -------------------------------------------------------------------------
  // REQ-LOC-BE-NE-R02 — importCsv
  // -------------------------------------------------------------------------
  describe('importCsv', () => {
    it('T-LOC-BE-NE-R02a: throws BadRequestException when entityType is blank', async () => {
      await expect(service.importCsv('', 1, 'TST', [{ a: 1 }], 'alice')).rejects.toThrow(BadRequestException)
    })

    it('T-LOC-BE-NE-R02b: throws BadRequestException when rows array is empty', async () => {
      mockDataSource.query.mockResolvedValueOnce([{ id: 10 }]) // assertAccess
      await expect(service.importCsv('Quote', 10, 'TST', [], 'alice')).rejects.toThrow(BadRequestException)
    })

    it('T-LOC-BE-NE-R02c: throws ForbiddenException when entity not accessible', async () => {
      mockDataSource.query.mockResolvedValueOnce([]) // assertAccess: no rows
      await expect(
        service.importCsv('Quote', 99, 'TST', [{ address1: '1 Test St' }], 'alice'),
      ).rejects.toThrow(ForbiddenException)
    })

    it('T-LOC-BE-NE-R02d: inserts version 1 when no prior versions exist', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ id: 10 }]) // assertAccess
        .mockResolvedValueOnce([{ max_version: '0' }]) // count
        .mockResolvedValueOnce([makeVersion({ versionNumber: 1 })]) // INSERT RETURNING

      const result = await service.importCsv('Quote', 10, 'TST', [{ address1: '1 Test St' }], 'alice')
      expect(result['versionNumber']).toBe(1)
    })

    it('T-LOC-BE-NE-R02e: increments version number from existing max', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ id: 10 }]) // assertAccess
        .mockResolvedValueOnce([{ max_version: '3' }]) // count: 3 existing
        .mockResolvedValueOnce([makeVersion({ versionNumber: 4 })]) // INSERT RETURNING

      const result = await service.importCsv('Quote', 10, 'TST', [{ address1: '2 New St' }], 'alice')
      const insertArgs = mockDataSource.query.mock.calls[2][1]
      expect(insertArgs[1]).toBe(4) // version_number arg
    })
  })

  // -------------------------------------------------------------------------
  // REQ-LOC-BE-NE-R03 — getVersions
  // -------------------------------------------------------------------------
  describe('getVersions', () => {
    it('T-LOC-BE-NE-R03a: returns all versions including inactive', async () => {
      const versions = [makeVersion({ isActive: true }), makeVersion({ id: 2, isActive: false, versionNumber: 1 })]
      mockDataSource.query.mockResolvedValue(versions)

      const result = await service.getVersions(10)
      expect(result).toHaveLength(2)
    })

    it('T-LOC-BE-NE-R03b: returns empty array when no versions exist', async () => {
      mockDataSource.query.mockResolvedValue([])
      const result = await service.getVersions(99)
      expect(result).toEqual([])
    })
  })

  // -------------------------------------------------------------------------
  // REQ-LOC-BE-NE-R04 — revertToVersion
  // -------------------------------------------------------------------------
  describe('revertToVersion', () => {
    it('T-LOC-BE-NE-R04a: throws NotFoundException when target version not found', async () => {
      mockDataSource.query.mockResolvedValueOnce([]) // no matching version
      await expect(service.revertToVersion(10, 99)).rejects.toThrow(NotFoundException)
    })

    it('T-LOC-BE-NE-R04b: deactivates existing rows and inserts new active clone', async () => {
      const targetVersion = { ...makeVersion(), payload: { rows: [] }, created_by: 'alice' }
      mockDataSource.query
        .mockResolvedValueOnce([targetVersion]) // find target version
        .mockResolvedValueOnce([]) // deactivate existing
        .mockResolvedValueOnce([{ max_version: '2' }]) // count for next version
        .mockResolvedValueOnce([makeVersion({ versionNumber: 3 })]) // INSERT RETURNING

      const result = await service.revertToVersion(10, 1)
      expect(result['versionNumber']).toBe(3)

      // Verify deactivate was called
      const deactivateSql = mockDataSource.query.mock.calls[1][0] as string
      expect(deactivateSql).toContain('is_active = FALSE')
    })
  })

  // -------------------------------------------------------------------------
  // REQ-LOC-BE-NE-R05 — getHistorical
  // -------------------------------------------------------------------------
  describe('getHistorical', () => {
    it('T-LOC-BE-NE-R05a: returns all historical rows ordered by version desc', async () => {
      const rows = [makeVersion({ versionNumber: 3 }), makeVersion({ id: 2, versionNumber: 2 })]
      mockDataSource.query.mockResolvedValue(rows)

      const result = await service.getHistorical(10)
      expect(result).toHaveLength(2)
      const sql = mockDataSource.query.mock.calls[0][0] as string
      expect(sql).toContain('ORDER BY version_number DESC')
    })

    it('T-LOC-BE-NE-R05b: returns empty array when no history exists', async () => {
      mockDataSource.query.mockResolvedValue([])
      const result = await service.getHistorical(99)
      expect(result).toEqual([])
    })
  })
})
