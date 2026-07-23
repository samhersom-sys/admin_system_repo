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

  // -------------------------------------------------------------------------
  // REQ-LOC-BE-NE-F-011 — addLocation
  // -------------------------------------------------------------------------
  describe('addLocation', () => {
    it('T-LOC-BE-NE-R11a: inserts location row and returns it', async () => {
      const quoteRow = { id: 1, created_by_org_code: 'TST', status: 'Created' }
      const locationRow = { id: 5, quote_id: 1, country: 'UK', address1: '10 Test St' }
      mockDataSource.query
        .mockResolvedValueOnce([quoteRow]) // findQuote
        .mockResolvedValueOnce([locationRow]) // INSERT RETURNING

      const result = await service.addLocation(1, 'TST', { country: 'UK', address1: '10 Test St' })
      expect(result).toEqual(locationRow)
      const sql = mockDataSource.query.mock.calls[1][0] as string
      expect(sql).toContain('INSERT INTO locations')
    })

    it('T-LOC-BE-NE-R11b: throws BadRequestException when quote status is Bound', async () => {
      const quoteRow = { id: 1, created_by_org_code: 'TST', status: 'Bound' }
      mockDataSource.query.mockResolvedValueOnce([quoteRow])
      await expect(service.addLocation(1, 'TST', {})).rejects.toThrow(BadRequestException)
    })

    it('T-LOC-BE-NE-R11c: throws NotFoundException when quote not found', async () => {
      mockDataSource.query.mockResolvedValueOnce([])
      await expect(service.addLocation(99, 'TST', {})).rejects.toThrow(NotFoundException)
    })

    it('T-LOC-BE-NE-R11d: throws ForbiddenException when org does not own quote', async () => {
      mockDataSource.query.mockResolvedValueOnce([{ id: 1, created_by_org_code: 'OTHER', status: 'Created' }])
      await expect(service.addLocation(1, 'TST', {})).rejects.toThrow(ForbiddenException)
    })
  })

  // -------------------------------------------------------------------------
  // REQ-LOC-BE-NE-F-012 — updateLocation
  // -------------------------------------------------------------------------
  describe('updateLocation', () => {
    it('T-LOC-BE-NE-R12a: updates and returns location row', async () => {
      const quoteRow = { id: 1, created_by_org_code: 'TST', status: 'Quoted' }
      const updatedRow = { id: 5, quote_id: 1, city: 'London' }
      mockDataSource.query
        .mockResolvedValueOnce([quoteRow]) // findQuote
        .mockResolvedValueOnce([updatedRow]) // UPDATE RETURNING

      const result = await service.updateLocation(1, 5, 'TST', { city: 'London' })
      expect(result).toEqual(updatedRow)
      const sql = mockDataSource.query.mock.calls[1][0] as string
      expect(sql).toContain('UPDATE locations')
    })

    it('T-LOC-BE-NE-R12b: throws NotFoundException when location not found', async () => {
      const quoteRow = { id: 1, created_by_org_code: 'TST', status: 'Created' }
      mockDataSource.query
        .mockResolvedValueOnce([quoteRow])
        .mockResolvedValueOnce([]) // location not found

      await expect(service.updateLocation(1, 99, 'TST', {})).rejects.toThrow(NotFoundException)
    })

    it('T-LOC-BE-NE-R12c: throws BadRequestException when quote is Issued', async () => {
      mockDataSource.query.mockResolvedValueOnce([{ id: 1, created_by_org_code: 'TST', status: 'Issued' }])
      await expect(service.updateLocation(1, 5, 'TST', {})).rejects.toThrow(BadRequestException)
    })
  })

  // -------------------------------------------------------------------------
  // REQ-LOC-BE-NE-F-013 — deleteLocation
  // -------------------------------------------------------------------------
  describe('deleteLocation', () => {
    it('T-LOC-BE-NE-R13a: deletes coverages then location, returns message', async () => {
      const quoteRow = { id: 1, created_by_org_code: 'TST', status: 'Created' }
      const locationRow = { id: 5, quote_id: 1 }
      mockDataSource.query
        .mockResolvedValueOnce([quoteRow])       // findQuote
        .mockResolvedValueOnce([locationRow])    // findLocation
        .mockResolvedValueOnce([])               // DELETE coverages
        .mockResolvedValueOnce([])               // DELETE location

      const result = await service.deleteLocation(1, 5, 'TST')
      expect(result).toEqual({ message: 'Location deleted' })
      const delCovSql = mockDataSource.query.mock.calls[2][0] as string
      expect(delCovSql).toContain('DELETE FROM location_coverages')
    })

    it('T-LOC-BE-NE-R13b: throws NotFoundException when location does not exist', async () => {
      const quoteRow = { id: 1, created_by_org_code: 'TST', status: 'Created' }
      mockDataSource.query
        .mockResolvedValueOnce([quoteRow])
        .mockResolvedValueOnce([]) // location not found

      await expect(service.deleteLocation(1, 99, 'TST')).rejects.toThrow(NotFoundException)
    })
  })

  // -------------------------------------------------------------------------
  // REQ-LOC-BE-NE-F-014 — addCoverage
  // -------------------------------------------------------------------------
  describe('addCoverage', () => {
    it('T-LOC-BE-NE-R14a: inserts coverage row and returns it', async () => {
      const quoteRow = { id: 1, created_by_org_code: 'TST', status: 'Created' }
      const coverageRow = { id: 20, location_id: 5, coverage_type: 'Property Damage' }
      mockDataSource.query
        .mockResolvedValueOnce([quoteRow])   // assertQuoteEditable
        .mockResolvedValueOnce([coverageRow]) // INSERT RETURNING

      const result = await service.addCoverage(1, 5, 'TST', { coverage_type: 'Property Damage' })
      expect(result).toEqual(coverageRow)
      const sql = mockDataSource.query.mock.calls[1][0] as string
      expect(sql).toContain('INSERT INTO location_coverages')
    })

    it('T-LOC-BE-NE-R14b: throws BadRequestException when quote status is Bound', async () => {
      mockDataSource.query.mockResolvedValueOnce([{ id: 1, created_by_org_code: 'TST', status: 'Bound' }])
      await expect(service.addCoverage(1, 5, 'TST', {})).rejects.toThrow(BadRequestException)
    })
  })

  // -------------------------------------------------------------------------
  // REQ-LOC-BE-NE-F-015 — updateCoverage
  // -------------------------------------------------------------------------
  describe('updateCoverage', () => {
    it('T-LOC-BE-NE-R15a: updates and returns coverage row', async () => {
      const quoteRow = { id: 1, created_by_org_code: 'TST', status: 'Quoted' }
      const updatedRow = { id: 20, sum_insured: '500000' }
      mockDataSource.query
        .mockResolvedValueOnce([quoteRow])
        .mockResolvedValueOnce([updatedRow])

      const result = await service.updateCoverage(1, 5, 20, 'TST', { sum_insured: '500000' })
      expect(result).toEqual(updatedRow)
      const sql = mockDataSource.query.mock.calls[1][0] as string
      expect(sql).toContain('UPDATE location_coverages')
    })

    it('T-LOC-BE-NE-R15b: throws NotFoundException when coverage row not found', async () => {
      const quoteRow = { id: 1, created_by_org_code: 'TST', status: 'Created' }
      mockDataSource.query
        .mockResolvedValueOnce([quoteRow])
        .mockResolvedValueOnce([]) // not found

      await expect(service.updateCoverage(1, 5, 99, 'TST', {})).rejects.toThrow(NotFoundException)
    })
  })

  // -------------------------------------------------------------------------
  // REQ-LOC-BE-NE-F-016 — deleteCoverage
  // -------------------------------------------------------------------------
  describe('deleteCoverage', () => {
    it('T-LOC-BE-NE-R16a: deletes coverage row and returns message', async () => {
      const quoteRow = { id: 1, created_by_org_code: 'TST', status: 'Created' }
      mockDataSource.query
        .mockResolvedValueOnce([quoteRow])
        .mockResolvedValueOnce([{ id: 20 }]) // DELETE RETURNING

      const result = await service.deleteCoverage(1, 5, 20, 'TST')
      expect(result).toEqual({ message: 'Coverage row deleted' })
    })

    it('T-LOC-BE-NE-R16b: throws NotFoundException when coverage row not found', async () => {
      const quoteRow = { id: 1, created_by_org_code: 'TST', status: 'Created' }
      mockDataSource.query
        .mockResolvedValueOnce([quoteRow])
        .mockResolvedValueOnce([]) // DELETE RETURNING empty

      await expect(service.deleteCoverage(1, 5, 99, 'TST')).rejects.toThrow(NotFoundException)
    })
  })

  // -------------------------------------------------------------------------
  // REQ-LOC-BE-NE-F-017 — saveVersion
  // -------------------------------------------------------------------------
  describe('saveVersion', () => {
    it('T-LOC-BE-NE-R17a: reads current rows and inserts JSONB snapshot', async () => {
      const quoteRow = { id: 1, created_by_org_code: 'TST', status: 'Quoted' }
      const locationRows = [{ id: 1, quote_id: 1, country: 'UK', address1: '1 Test St' }]
      mockDataSource.query
        .mockResolvedValueOnce([quoteRow])                // findQuote (access check)
        .mockResolvedValueOnce(locationRows)              // read quote_location_rows
        .mockResolvedValueOnce([{ max_version: '2' }])   // count versions
        .mockResolvedValueOnce([])                        // deactivate previous
        .mockResolvedValueOnce([{ id: 10, version_number: 3, created_at: new Date() }]) // INSERT

      const result = await service.saveVersion(1, 'TST', 'alice')
      expect(result).toHaveProperty('version_number', 3)
      const snapshotSql = mockDataSource.query.mock.calls[4][0] as string
      expect(snapshotSql).toContain('INSERT INTO locations_schedule_versions')
    })

    it('T-LOC-BE-NE-R17b: throws ForbiddenException for wrong org', async () => {
      mockDataSource.query.mockResolvedValueOnce([{ id: 1, created_by_org_code: 'OTHER', status: 'Created' }])
      await expect(service.saveVersion(1, 'TST', 'alice')).rejects.toThrow(ForbiddenException)
    })
  })
})
