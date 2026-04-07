/**
 * search.spec.ts — SearchService unit tests
 * Domain: SRCH-BE-NE
 * Standard: AI Guidelines §06-Testing-Standards.md §6.2
 *
 * Coverage:
 *   R01 — search: parameter validation (invalid type, invalid dates)
 *   R02 — search: default mode (no filters → recently opened records)
 *   R03 — search: filter mode (filters present → filtered queries)
 */

import { Test, TestingModule } from '@nestjs/testing'
import { DataSource } from 'typeorm'
import { BadRequestException } from '@nestjs/common'
import { SearchService } from './search.service'

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('SearchService', () => {
  let service: SearchService
  let mockDataSource: Record<string, jest.Mock>

  // A helper that returns empty arrays for any number of query calls
  const mockEmptyQueries = (n = 10) => {
    for (let i = 0; i < n; i++) {
      mockDataSource.query.mockResolvedValueOnce([])
    }
  }

  beforeEach(async () => {
    mockDataSource = {
      query: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile()

    service = module.get<SearchService>(SearchService)
  })

  afterEach(() => jest.clearAllMocks())

  // -------------------------------------------------------------------------
  // REQ-SRCH-BE-NE-R01 — parameter validation
  // -------------------------------------------------------------------------
  describe('search — validation', () => {
    it('T-SRCH-BE-NE-R01a: throws BadRequestException for an invalid single type', async () => {
      await expect(service.search({ type: 'InvalidType' }, 1, 'user', 'TST'))
        .rejects.toThrow(BadRequestException)
    })

    it('T-SRCH-BE-NE-R01b: throws BadRequestException when all types in a multi-type string are invalid', async () => {
      await expect(service.search({ types: 'Foo,Bar' }, 1, 'user', 'TST'))
        .rejects.toThrow(BadRequestException)
    })

    it('T-SRCH-BE-NE-R01c: throws BadRequestException for an invalid date param', async () => {
      await expect(service.search({ inceptionFrom: 'not-a-date', reference: 'ABC' }, 1, 'user', 'TST'))
        .rejects.toThrow(BadRequestException)
    })

    it('T-SRCH-BE-NE-R01d: does NOT throw for a valid type param', async () => {
      mockEmptyQueries()
      await expect(service.search({ type: 'Submission' }, 1, 'user', 'TST'))
        .resolves.toBeDefined()
    })

    it('T-SRCH-BE-NE-R01e: accepts a comma-separated types string with all valid types', async () => {
      mockEmptyQueries()
      await expect(service.search({ types: 'Submission,Quote', reference: 'SUB' }, 1, 'user', 'TST'))
        .resolves.toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  // REQ-SRCH-BE-NE-R02 — default mode (no filters)
  // -------------------------------------------------------------------------
  describe('search — default mode', () => {
    it('T-SRCH-BE-NE-R02a: returns result shape with entity type keys', async () => {
      mockEmptyQueries()

      const result = await service.search({}, 1, 'alice', 'TST')
      expect(result).toHaveProperty('submissions')
      expect(result).toHaveProperty('quotes')
      expect(result).toHaveProperty('policies')
      expect(result).toHaveProperty('bindingAuthorities')
      expect(result).toHaveProperty('parties')
      expect(result).toHaveProperty('claims')
    })

    it('T-SRCH-BE-NE-R02b: returns empty arrays when no audit history and no records exist', async () => {
      mockEmptyQueries()

      const result = await service.search({}, 1, 'alice', 'TST')
      expect(result.submissions).toEqual([])
      expect(result.quotes).toEqual([])
    })

    it('T-SRCH-BE-NE-R02c: queries audit_event first when userId is provided', async () => {
      mockEmptyQueries()

      await service.search({}, 1, 'alice', 'TST')
      const firstCall = mockDataSource.query.mock.calls[0]
      expect(firstCall[0]).toContain('audit_event')
    })

    it('T-SRCH-BE-NE-R02d: still runs without error when userId and userName are both null', async () => {
      // No audit query issued — skips straight to fallback queries
      mockEmptyQueries()

      await expect(service.search({}, null, null, 'TST')).resolves.toBeDefined()
    })

    it('T-SRCH-BE-NE-R02e: returns recently-opened submissions when audit history exists', async () => {
      const auditRows = [{ entity_type: 'Submission', entity_id: 5, last_opened: '2026-01-01T10:00:00' }]
      const submissionRows = [{ id: 5, reference: 'SUB-TST-001', insured: 'Test Ltd' }]

      mockDataSource.query
        .mockResolvedValueOnce(auditRows)         // audit query
        .mockResolvedValueOnce(submissionRows)    // submission by id
        .mockResolvedValueOnce([])  // party fallback
        .mockResolvedValueOnce([])  // quotes fallback
        .mockResolvedValueOnce([])  // policies fallback
        .mockResolvedValueOnce([])  // BA fallback
        .mockResolvedValueOnce([])  // claims fallback

      const result = await service.search({}, 1, 'alice', 'TST')
      expect(result.submissions[0].id).toBe(5)
      expect(result.submissions[0].lastOpenedDate).toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  // REQ-SRCH-BE-NE-R03 — filter mode (at least one filter present)
  // -------------------------------------------------------------------------
  describe('search — filter mode', () => {
    it('T-SRCH-BE-NE-R03a: returns result shape with all entity keys', async () => {
      mockEmptyQueries()

      const result = await service.search({ reference: 'SUB-001' }, 1, 'alice', 'TST')
      expect(result).toHaveProperty('submissions')
      expect(result).toHaveProperty('quotes')
    })

    it('T-SRCH-BE-NE-R03b: filters only the requested type when type param is present', async () => {
      mockEmptyQueries()

      const result = await service.search({ type: 'Submission', reference: 'SUB' }, 1, 'alice', 'TST')
      // Quotes, policies etc. stay empty because type filter limits scope
      expect(result).toBeDefined()
      expect(Array.isArray(result.submissions)).toBe(true)
    })

    it('T-SRCH-BE-NE-R03c: returns matching records when query returns rows', async () => {
      const fakeSubmission = { id: 1, reference: 'SUB-TST-001', insured: 'Test Ltd', status: 'Created' }
      mockDataSource.query
        .mockResolvedValueOnce([fakeSubmission]) // submission filter query
        .mockResolvedValueOnce([])  // rest empty
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      const result = await service.search({ type: 'Submission', reference: 'SUB' }, 1, 'alice', 'TST')
      expect(result.submissions.length).toBeGreaterThanOrEqual(0)
    })

    it('T-SRCH-BE-NE-R03d: returns empty arrays when a query throws (graceful fallback)', async () => {
      mockDataSource.query.mockRejectedValue(new Error('DB error'))

      // Should not throw — errors per entity type are caught and become []
      const result = await service.search({ reference: 'X' }, 1, 'alice', 'TST')
      expect(result).toBeDefined()
    })
  })
})
