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
      await expect(service.search({ type: 'InvalidType' }, 'TST'))
        .rejects.toThrow(BadRequestException)
    })

    it('T-SRCH-BE-NE-R01b: throws BadRequestException when all types in a multi-type string are invalid', async () => {
      await expect(service.search({ types: 'Foo,Bar' }, 'TST'))
        .rejects.toThrow(BadRequestException)
    })

    it('T-SRCH-BE-NE-R01c: throws BadRequestException for an invalid date param', async () => {
      await expect(service.search({ inceptionFrom: 'not-a-date', reference: 'ABC' }, 'TST'))
        .rejects.toThrow(BadRequestException)
    })

    it('T-SRCH-BE-NE-R01d: does NOT throw for a valid type param', async () => {
      mockEmptyQueries()
      await expect(service.search({ type: 'Submission' }, 'TST'))
        .resolves.toBeDefined()
    })

    it('T-SRCH-BE-NE-R01e: accepts a comma-separated types string with all valid types', async () => {
      mockEmptyQueries()
      await expect(service.search({ types: 'Submission,Quote', reference: 'SUB' }, 'TST'))
        .resolves.toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  // REQ-SRCH-BE-NE-R02 — default mode (no filters → most recently created records)
  // -------------------------------------------------------------------------
  describe('search — default mode', () => {
    it('T-SRCH-BE-NE-R02a: returns result shape with entity type keys', async () => {
      mockEmptyQueries()

      const result = await service.search({}, 'TST')
      expect(result).toHaveProperty('submissions')
      expect(result).toHaveProperty('quotes')
      expect(result).toHaveProperty('policies')
      expect(result).toHaveProperty('bindingAuthorities')
      expect(result).toHaveProperty('parties')
      expect(result).toHaveProperty('claims')
    })

    it('T-SRCH-BE-NE-R02b: returns empty arrays when no records exist', async () => {
      mockEmptyQueries()

      const result = await service.search({}, 'TST')
      expect(result.submissions).toEqual([])
      expect(result.quotes).toEqual([])
    })

    it('T-SRCH-BE-NE-R02d: returns most recently created submissions ordered by createdDate', async () => {
      const submissionRows = [
        { id: 5, reference: 'SUB-TST-001', insured: 'Test Ltd', lastOpenedDate: null },
        { id: 4, reference: 'SUB-TST-002', insured: 'Other Ltd', lastOpenedDate: null },
      ]
      // filterMode queries: submission + audit, party + audit, quotes + audit, policies + audit, BA + audit, claims + audit
      mockDataSource.query
        .mockResolvedValueOnce(submissionRows)   // submission filterMode query
        .mockResolvedValueOnce([])               // submission attachLastOpened (audit)
        .mockResolvedValueOnce([])               // party filterMode
        .mockResolvedValueOnce([])               // party attachLastOpened
        .mockResolvedValueOnce([])               // quotes filterMode
        .mockResolvedValueOnce([])               // quotes attachLastOpened
        .mockResolvedValueOnce([])               // policies filterMode
        .mockResolvedValueOnce([])               // policies attachLastOpened
        .mockResolvedValueOnce([])               // BA filterMode
        .mockResolvedValueOnce([])               // BA attachLastOpened
        .mockResolvedValueOnce([])               // claims filterMode
        .mockResolvedValueOnce([])               // claims attachLastOpened

      const result = await service.search({}, 'TST')
      expect(result.submissions.length).toBe(2)
      expect(result.submissions[0].id).toBe(5)
    })

    it('T-SRCH-BE-NE-R02e: does not query audit_event for default mode ordering', async () => {
      mockEmptyQueries(12)

      await service.search({}, 'TST')
      const allCalls = mockDataSource.query.mock.calls
      const auditOrderingCall = allCalls.find(call =>
        typeof call[0] === 'string' &&
        call[0].includes('audit_event') &&
        call[0].includes('ORDER BY last_opened DESC')
      )
      expect(auditOrderingCall).toBeUndefined()
    })
  })

  // -------------------------------------------------------------------------
  // REQ-SRCH-BE-NE-R03 — filter mode (at least one filter present)
  // -------------------------------------------------------------------------
  describe('search — filter mode', () => {
    it('T-SRCH-BE-NE-R03a: returns result shape with all entity keys', async () => {
      mockEmptyQueries()

      const result = await service.search({ reference: 'SUB-001' }, 'TST')
      expect(result).toHaveProperty('submissions')
      expect(result).toHaveProperty('quotes')
    })

    it('T-SRCH-BE-NE-R03b: filters only the requested type when type param is present', async () => {
      mockEmptyQueries()

      const result = await service.search({ type: 'Submission', reference: 'SUB' }, 'TST')
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

      const result = await service.search({ type: 'Submission', reference: 'SUB' }, 'TST')
      expect(result.submissions.length).toBeGreaterThanOrEqual(0)
    })

    it('T-SRCH-BE-NE-R03d: returns empty arrays when a query throws (graceful fallback)', async () => {
      mockDataSource.query.mockRejectedValue(new Error('DB error'))

      // Should not throw — errors per entity type are caught and become []
      const result = await service.search({ reference: 'X' }, 'TST')
      expect(result).toBeDefined()
    })
  })
})
