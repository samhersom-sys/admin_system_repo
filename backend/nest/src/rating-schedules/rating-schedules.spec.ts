import { Test, TestingModule } from '@nestjs/testing'
import { getDataSourceToken } from '@nestjs/typeorm'
import { NotFoundException } from '@nestjs/common'
import { RatingSchedulesService } from './rating-schedules.service'

/**
 * Unit tests for RatingSchedulesService
 * REQ-SET-BE-F-005 — Rating Schedules + Rules API
 *
 * Tests use a mocked DataSource. Tables: rating_schedules, rating_rules
 */
describe('RatingSchedulesService', () => {
    let service: RatingSchedulesService
    let mockQuery: jest.Mock

    const mockSchedule = {
        id: 1,
        name: 'Standard Property Schedule',
        description: 'Default property rates',
        effective_date: '2024-01-01',
        expiry_date: '2024-12-31',
        currency: 'GBP',
        is_active: true,
        created_at: new Date('2024-01-01'),
    }

    const mockRule = {
        id: 10,
        rating_schedule_id: 1,
        rule_name: 'Base Rate',
        description: null,
        field_name: 'sum_insured',
        field_source: 'submission',
        operator: '>',
        field_value: '0',
        rate_percentage: '0.15000',
        rate_type: 'PERCENTAGE',
        priority: 100,
        is_active: true,
    }

    beforeEach(async () => {
        mockQuery = jest.fn()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RatingSchedulesService,
                {
                    provide: getDataSourceToken(),
                    useValue: { query: mockQuery },
                },
            ],
        }).compile()

        service = module.get<RatingSchedulesService>(RatingSchedulesService)
    })

    afterEach(() => jest.clearAllMocks())

    // =========================================================================
    // T-RATING-BE-R01: findAll — returns list of schedules
    // =========================================================================
    describe('findAll', () => {
        it('T-RATING-BE-R01a: returns all rating schedules ordered by name', async () => {
            mockQuery.mockResolvedValueOnce([mockSchedule])

            const result = await service.findAll()

            expect(mockQuery).toHaveBeenCalledTimes(1)
            expect(mockQuery.mock.calls[0][0]).toContain('FROM rating_schedules')
            expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY name ASC')
            expect(result).toEqual([mockSchedule])
        })

        it('T-RATING-BE-R01b: returns empty array when no schedules exist', async () => {
            mockQuery.mockResolvedValueOnce([])

            const result = await service.findAll()

            expect(result).toEqual([])
        })
    })

    // =========================================================================
    // T-RATING-BE-R02: findOne — returns single schedule by id
    // =========================================================================
    describe('findOne', () => {
        it('T-RATING-BE-R02a: returns the schedule when found', async () => {
            mockQuery.mockResolvedValueOnce([mockSchedule])

            const result = await service.findOne(1)

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('WHERE id = $1'),
                [1],
            )
            expect(result).toEqual(mockSchedule)
        })

        it('T-RATING-BE-R02b: throws NotFoundException when schedule not found', async () => {
            mockQuery.mockResolvedValue([])

            await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
            await expect(service.findOne(999)).rejects.toThrow('999')
        })
    })

    // =========================================================================
    // T-RATING-BE-R03: getRules — returns rules for a schedule
    // =========================================================================
    describe('getRules', () => {
        it('T-RATING-BE-R03a: returns all rules for the given schedule id', async () => {
            mockQuery.mockResolvedValueOnce([mockRule])

            const result = await service.getRules(1)

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('WHERE rating_schedule_id = $1'),
                [1],
            )
            expect(result).toEqual([mockRule])
        })

        it('T-RATING-BE-R03b: returns empty array when no rules exist for schedule', async () => {
            mockQuery.mockResolvedValueOnce([])

            const result = await service.getRules(42)

            expect(result).toEqual([])
        })
    })

    // =========================================================================
    // T-RATING-BE-R04: update — updates schedule fields
    // =========================================================================
    describe('update', () => {
        it('T-RATING-BE-R04a: updates the schedule and returns updated record', async () => {
            const updatedSchedule = { ...mockSchedule, name: 'Revised Schedule' }
            // findOne (existence check), then UPDATE, then findOne (return value)
            mockQuery
                .mockResolvedValueOnce([mockSchedule])    // existence check inside update
                .mockResolvedValueOnce(undefined)          // UPDATE statement
                .mockResolvedValueOnce([updatedSchedule]) // re-fetch after update

            const result = await service.update(1, { name: 'Revised Schedule' })

            expect(mockQuery).toHaveBeenCalledTimes(3)
            expect(mockQuery.mock.calls[1][0]).toContain('UPDATE rating_schedules')
            expect(result).toEqual(updatedSchedule)
        })

        it('T-RATING-BE-R04b: throws NotFoundException when schedule id not found', async () => {
            mockQuery.mockResolvedValueOnce([]) // findOne returns empty

            await expect(service.update(999, { name: 'X' })).rejects.toThrow(NotFoundException)
        })
    })
})
