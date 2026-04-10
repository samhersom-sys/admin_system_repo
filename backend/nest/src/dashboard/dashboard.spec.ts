/**
 * dashboard.spec.ts — DashboardService unit tests
 * Domain: DASH-BE-NE
 * Standard: AI Guidelines §06-Testing-Standards.md §6.2
 *
 * Coverage:
 *   R01 — sync stub methods (no DB interaction)
 *   R02 — getRecentRecords (queries org-scoped dashboard entities)
 */

import { Test, TestingModule } from '@nestjs/testing'
import { DataSource } from 'typeorm'
import { DashboardService } from './dashboard.service'

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('DashboardService', () => {
  let service: DashboardService
  let mockDataSource: Record<string, jest.Mock>

  beforeEach(async () => {
    mockDataSource = {
      query: jest.fn().mockResolvedValue([]),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile()

    service = module.get<DashboardService>(DashboardService)
  })

  afterEach(() => jest.clearAllMocks())

  // -------------------------------------------------------------------------
  // REQ-DASH-BE-NE-R01 — sync stub methods
  // -------------------------------------------------------------------------
  describe('stub methods', () => {
    it('T-DASH-BE-NE-R01a: getQuotes returns an empty array', () => {
      expect(service.getQuotes()).toEqual([])
    })

    it('T-DASH-BE-NE-R01b: getPolicies returns an empty array', () => {
      expect(service.getPolicies()).toEqual([])
    })

    it('T-DASH-BE-NE-R01c: getPoliciesGwpMonthly returns series stub shape', async () => {
      const result = await service.getPoliciesGwpMonthly('DEMO')
      expect(result).toHaveProperty('series')
    })

    it('T-DASH-BE-NE-R01d: getPoliciesGwpCumulative returns series stub shape', async () => {
      const result = await service.getPoliciesGwpCumulative('DEMO')
      expect(result).toHaveProperty('series')
    })

    it('T-DASH-BE-NE-R01e: getPoliciesGwpSummary returns orgTotal and userTotal', async () => {
      const result = await service.getPoliciesGwpSummary('DEMO', 'admin')
      expect(result).toHaveProperty('orgTotal')
      expect(result).toHaveProperty('userTotal')
    })

    it('T-DASH-BE-NE-R01f: getBindingAuthorities returns an empty array', () => {
      expect(service.getBindingAuthorities()).toEqual([])
    })

    it('T-DASH-BE-NE-R01g: getNotifications returns an empty array', () => {
      expect(service.getNotifications()).toEqual([])
    })

    it('T-DASH-BE-NE-R01h: getTasks returns an empty array', () => {
      expect(service.getTasks()).toEqual([])
    })
  })

  // -------------------------------------------------------------------------
  // REQ-DASH-BE-NE-R02 — getRecentRecords
  // -------------------------------------------------------------------------
  describe('getRecentRecords', () => {
    it('T-DASH-BE-NE-R02a: queries audit history first, then returns submissions, quotes, policies and binding authorities scoped to orgCode', async () => {
      const auditRows = [
        { entity_type: 'Submission', entity_id: 1, last_opened: '2026-04-10T12:00:00Z' },
        { entity_type: 'Quote', entity_id: 2, last_opened: '2026-04-10T11:00:00Z' },
        { entity_type: 'Policy', entity_id: 3, last_opened: '2026-04-10T10:00:00Z' },
        { entity_type: 'BindingAuthority', entity_id: 4, last_opened: '2026-04-10T09:00:00Z' },
      ]
      const submissions = [{ id: 1, reference: 'SUB-TST-001' }]
      const quotes = [{ id: 2, reference: 'QUO-TST-001' }]
      const policies = [{ id: 3, reference: 'POL-TST-001' }]
      const bindingAuthorities = [{ id: 4, reference: 'BA-TST-001' }]
      mockDataSource.query
        .mockResolvedValueOnce(auditRows)   // audit query
        .mockResolvedValueOnce(submissions) // submissions query
        .mockResolvedValueOnce(quotes)      // quotes query
        .mockResolvedValueOnce(policies)    // policies query
        .mockResolvedValueOnce(bindingAuthorities) // binding authorities query

      const result = await service.getRecentRecords('TST')
      expect(result.submissions[0]).toMatchObject({ id: 1, reference: 'SUB-TST-001', lastOpenedDate: '2026-04-10T12:00:00Z' })
      expect(result.quotes[0]).toMatchObject({ id: 2, reference: 'QUO-TST-001', lastOpenedDate: '2026-04-10T11:00:00Z' })
      expect(result.policies[0]).toMatchObject({ id: 3, reference: 'POL-TST-001', lastOpenedDate: '2026-04-10T10:00:00Z' })
      expect(result.bindingAuthorities[0]).toMatchObject({ id: 4, reference: 'BA-TST-001', lastOpenedDate: '2026-04-10T09:00:00Z' })
    })

    it('T-DASH-BE-NE-R02b: falls back to createdDate ordering when no audit history exists', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([]) // audit query
        .mockResolvedValueOnce([]) // submissions fallback
        .mockResolvedValueOnce([]) // quotes fallback
        .mockResolvedValueOnce([]) // policies fallback
        .mockResolvedValueOnce([]) // binding authorities fallback

      const result = await service.getRecentRecords('TST')
      expect(result.policies).toEqual([])
      expect(result.bindingAuthorities).toEqual([])
    })

    it('T-DASH-BE-NE-R02c: passes orgCode to submissions query', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      await service.getRecentRecords('MYORG')
      const firstCall = mockDataSource.query.mock.calls[0]
      const secondCall = mockDataSource.query.mock.calls[1]
      expect(firstCall[0]).toContain('FROM public.audit_event')
      expect(secondCall[1]).toEqual(['MYORG'])
    })

    it('T-DASH-BE-NE-R02d: returns empty quotes array when quotes query fails', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([]) // audit query
        .mockResolvedValueOnce([]) // submissions OK
        .mockRejectedValueOnce(new Error('DB error')) // quotes fail — caught by .catch(() => [])
        .mockResolvedValueOnce([]) // policies OK
        .mockResolvedValueOnce([]) // binding authorities OK

      const result = await service.getRecentRecords('TST')
      expect(result.quotes).toEqual([])
    })

    it('T-DASH-BE-NE-R02da: returns empty submissions array when submissions query fails', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([]) // audit query
        .mockRejectedValueOnce(new Error('DB error')) // submissions fail — caught by .catch(() => [])
        .mockResolvedValueOnce([]) // quotes OK
        .mockResolvedValueOnce([]) // policies OK
        .mockResolvedValueOnce([]) // binding authorities OK

      const result = await service.getRecentRecords('TST')
      expect(result.submissions).toEqual([])
    })

    it('T-DASH-BE-NE-R02e: reads recent activity from audit_event before entity fallbacks', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      await service.getRecentRecords('TST')
      const [auditSql] = mockDataSource.query.mock.calls[0]
      expect(auditSql).toContain('FROM public.audit_event')
    })
  })
})
