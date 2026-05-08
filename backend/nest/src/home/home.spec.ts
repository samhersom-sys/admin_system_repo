/**
 * home.spec.ts — HomeService unit tests
 * Domain: HOME-BE
 * Standard: AI Guidelines §06-Testing-Standards.md §6.2
 *
 * Coverage:
 *   T-HOME-BE-R019a — policies SQL uses countActive filterExpr from measure_definitions DB (via MeasuresService)
 *   T-HOME-BE-R019b — getKpiSummary returns KpiSummary shape
 *   T-HOME-BE-R019c — all 4 tables are queried in parallel (Promise.all)
 *   T-HOME-BE-R019d — zero-safe: null DB values coerce to 0
 */

import { Test, TestingModule } from '@nestjs/testing'
import { DataSource } from 'typeorm'
import { HomeService } from './home.service'
import { MeasuresService } from '../measures/measures.service'

const ACTIVE_FILTER = "status = 'Active'"

function makeMockMeasure() {
    return {
        id: 1,
        key: 'countActive',
        sourceKey: 'policies',
        createdByType: 'internal',
        filterExpr: ACTIVE_FILTER,
        filterCondition: null,
    } as any
}

describe('HomeService', () => {
    let service: HomeService
    let mockDataSource: { query: jest.Mock }
    let mockMeasuresService: { findBySourceAndKey: jest.Mock; getEffectiveFilterExpr: jest.Mock }

    beforeEach(async () => {
        mockDataSource = { query: jest.fn() }
        mockMeasuresService = {
            findBySourceAndKey: jest.fn().mockResolvedValue(makeMockMeasure()),
            getEffectiveFilterExpr: jest.fn().mockReturnValue(ACTIVE_FILTER),
        }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HomeService,
                { provide: DataSource, useValue: mockDataSource },
                { provide: MeasuresService, useValue: mockMeasuresService },
            ],
        }).compile()

        service = module.get<HomeService>(HomeService)
    })

    afterEach(() => jest.clearAllMocks())

    it('T-HOME-BE-R019a — policies SQL uses countActive filterExpr from measure_definitions DB (single source of truth)', async () => {
        mockDataSource.query.mockResolvedValue([{ org_count: '0', user_count: '0', gwp_org: '0', gwp_user: '0' }])

        await service.getKpiSummary('DEMO', 'admin')

        // MeasuresService must be called to retrieve the countActive measure
        expect(mockMeasuresService.findBySourceAndKey).toHaveBeenCalledWith('policies', 'countActive', 'DEMO')
        expect(mockMeasuresService.getEffectiveFilterExpr).toHaveBeenCalled()

        // Find the policies query (the one with gwp_org in the SQL)
        const polCall = mockDataSource.query.mock.calls.find(([sql]: [string]) =>
            sql.includes('gwp_org'),
        )
        expect(polCall).toBeDefined()
        // The policies SQL must contain the filterExpr verbatim — not a hardcoded alternative
        expect(polCall![0]).toContain(ACTIVE_FILTER)
    })

    it('T-HOME-BE-R019b — getKpiSummary returns correctly shaped KpiSummary object', async () => {
        mockDataSource.query
            .mockResolvedValueOnce([{ org_count: '12', user_count: '3' }])      // submissions
            .mockResolvedValueOnce([{ org_count: '5', user_count: '1' }])       // quotes
            .mockResolvedValueOnce([{ org_count: '48', user_count: '8', gwp_org: '450000', gwp_user: '90000' }]) // policies
            .mockResolvedValueOnce([{ org_count: '7' }])                        // BAs

        const result = await service.getKpiSummary('DEMO', 'admin')

        expect(result).toEqual({
            submissions: { org: 12, user: 3 },
            quotes: { org: 5, user: 1 },
            policies: { org: 48, user: 8 },
            bindingAuthorities: { org: 7 },
            gwp: { org: 450000, user: 90000 },
        })
    })

    it('T-HOME-BE-R019c — queues exactly 4 DB queries regardless of data volume', async () => {
        mockDataSource.query.mockResolvedValue([{ org_count: '0', user_count: '0', gwp_org: '0', gwp_user: '0' }])
        await service.getKpiSummary('DEMO', 'admin')
        expect(mockDataSource.query).toHaveBeenCalledTimes(4)
    })

    it('T-HOME-BE-R019d — null DB values are coerced to 0 (zero-safe)', async () => {
        mockDataSource.query.mockResolvedValue([{ org_count: null, user_count: null, gwp_org: null, gwp_user: null }])
        const result = await service.getKpiSummary('DEMO', 'admin')
        expect(result.submissions.org).toBe(0)
        expect(result.policies.user).toBe(0)
        expect(result.gwp.org).toBe(0)
    })
})
