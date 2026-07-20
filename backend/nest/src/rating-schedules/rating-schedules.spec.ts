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
        effective_date: '2099-01-01',
        effective_time: '00:00',
        expiry_date: '2100-12-31',
        expiry_time: '23:59',
        currency: 'GBP',
        is_active: true,
        created_at: new Date('2099-01-01'),
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
            mockQuery
                .mockResolvedValueOnce([{ '?column?': 1 }])
                .mockResolvedValueOnce([mockSchedule])

            const result = await service.findAll()

            expect(mockQuery).toHaveBeenCalledTimes(2)
            expect(mockQuery.mock.calls[1][0]).toContain('FROM rating_schedules')
            expect(mockQuery.mock.calls[1][0]).toContain('ORDER BY rs.name ASC')
            expect(result).toEqual([mockSchedule])
        })

        it('T-RATING-BE-R01b: returns empty array when no schedules exist', async () => {
            mockQuery
                .mockResolvedValueOnce([{ '?column?': 1 }])
                .mockResolvedValueOnce([])

            const result = await service.findAll()

            expect(result).toEqual([])
        })

        it('T-RATING-BE-R01c: filters by org_code for non-admin users', async () => {
            mockQuery
                .mockResolvedValueOnce([{ '?column?': 1 }])
                .mockResolvedValueOnce([mockSchedule])

            await service.findAll('ORG1', 'user')

            expect(mockQuery.mock.calls[1][0]).toContain('WHERE rs.org_code = $1')
            expect(mockQuery.mock.calls[1][1]).toEqual(['ORG1'])
        })

        it('T-RATING-BE-R01d: returns all schedules for admin users regardless of orgCode', async () => {
            mockQuery
                .mockResolvedValueOnce([{ '?column?': 1 }])
                .mockResolvedValueOnce([mockSchedule])

            await service.findAll('ORG1', 'policy_forge_admin')

            expect(mockQuery.mock.calls[1][0]).not.toContain('WHERE rs.org_code')
            expect(mockQuery.mock.calls[1][1]).toEqual([])
        })

        it('T-RATING-BE-R01e: safely queries when org_code column is missing', async () => {
            mockQuery
                .mockResolvedValueOnce([]) // no org_code column
                .mockResolvedValueOnce([mockSchedule])

            await service.findAll('ORG1', 'user')

            expect(mockQuery.mock.calls[1][0]).not.toContain('WHERE rs.org_code = $1')
            expect(mockQuery.mock.calls[1][0]).toContain('NULL::text AS org_code')
            expect(mockQuery.mock.calls[1][1]).toEqual([])
        })
    })

    // =========================================================================
    // T-RATING-BE-R02: findOne — returns single schedule by id
    // =========================================================================
    describe('findOne', () => {
        it('T-RATING-BE-R02a: returns the schedule when found', async () => {
            mockQuery
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([mockSchedule])

            const result = await service.findOne(1)

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('WHERE rs.id = $1'),
                [1],
            )
            expect(result).toEqual(mockSchedule)
        })

        it('T-RATING-BE-R02b: throws NotFoundException when schedule not found', async () => {
            mockQuery
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])

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
        it('T-RATING-BE-R04a: clones the schedule and returns the new version', async () => {
            const updatedSchedule = { ...mockSchedule, id: 2, name: 'Revised Schedule', version: 2, parent_schedule_id: 1 }
            mockQuery
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([mockSchedule])    // existence check inside update
                .mockResolvedValueOnce([{ id: 2 }])       // INSERT cloned schedule
                .mockResolvedValueOnce(undefined)         // INSERT cloned rule
                .mockResolvedValueOnce([updatedSchedule]) // re-fetch cloned version

            const result = await service.update(1, {
                name: 'Revised Schedule',
                effective_date: '2099-01-02',
                effective_time: '00:00',
                expiry_time: '23:59',
                expiry_date: '2100-12-31',
                rules: [
                    {
                        group_number: 1,
                        sequence_in_group: 1,
                        logical_operator: null,
                        field_name: 'country',
                        operator: '=',
                        field_value: 'UK',
                        rate_percentage: 1.2,
                    },
                ],
            })

            expect(mockQuery.mock.calls.some(call => String(call[0]).includes('INSERT INTO rating_schedules'))).toBe(true)
            expect(mockQuery.mock.calls.some(call => String(call[0]).includes('INSERT INTO rating_rules'))).toBe(true)
            expect(result).toMatchObject({
                ...updatedSchedule,
                versionCreated: true,
                previousVersion: 1,
                currentVersion: 2,
            })
        })

        it('T-RATING-BE-R04b: throws NotFoundException when schedule id not found', async () => {
            mockQuery
                .mockResolvedValueOnce([]) // update-level org_code existence check
                .mockResolvedValueOnce([]) // findOne returns empty

            await expect(service.update(999, { name: 'X' })).rejects.toThrow(NotFoundException)
        })

        it('T-RATING-BE-R04c: increments version when rules payload changes', async () => {
            const updatedSchedule = { ...mockSchedule, id: 2, version: 2, parent_schedule_id: 1 }
            mockQuery
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([mockSchedule]) // findOne existence
                .mockResolvedValueOnce([{ id: 2 }]) // INSERT cloned schedule
                .mockResolvedValueOnce(undefined) // INSERT rule #1
                .mockResolvedValueOnce([updatedSchedule]) // final findOne

            const result = await service.update(1, {
                name: 'Standard Property Schedule',
                effective_date: '2099-01-02',
                effective_time: '00:00',
                expiry_date: '2100-12-31',
                expiry_time: '23:59',
                rules: [
                    {
                        group_number: 1,
                        sequence_in_group: 1,
                        logical_operator: null,
                        field_name: 'country',
                        operator: '=',
                        field_value: 'DE',
                        rate_percentage: 1.2,
                    },
                ],
            })

            expect(result.versionCreated).toBe(true)
            expect(result.currentVersion).toBe(2)
            expect(mockQuery.mock.calls.some(call => String(call[0]).includes('INSERT INTO rating_schedules'))).toBe(true)
        })

        it('T-RATING-BE-R04d: rejects effective_date earlier than previous version when rules change', async () => {
            const prior = { ...mockSchedule, effective_date: '2026-01-01', expiry_date: '2027-12-31', version: 3 }
            mockQuery
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([prior]) // findOne existence

            await expect(service.update(1, {
                effective_date: '2025-12-31',
                effective_time: '00:00',
                expiry_time: '23:59',
                expiry_date: '2027-12-31',
                rules: [
                    {
                        group_number: 1,
                        sequence_in_group: 1,
                        logical_operator: null,
                        field_name: 'country',
                        operator: '=',
                        field_value: 'DE',
                        rate_percentage: 1.2,
                    },
                ],
            })).rejects.toThrow('effective_date/effective_time must be greater than the previous version effective_date/effective_time')
        })
    })

    // =========================================================================
    // T-RATING-BE-R05: create — creates a new schedule
    // =========================================================================
    describe('create', () => {
        it('T-RATING-BE-R05a: inserts a schedule and returns it', async () => {
            mockQuery
                .mockResolvedValueOnce([{ '?column?': 1 }]) // has org_code column
                .mockResolvedValueOnce([{ id: 5 }]) // INSERT RETURNING id
                .mockResolvedValueOnce([{ ...mockSchedule, id: 5 }]) // findOne re-fetch

            const result = await service.create({ name: 'New Schedule' }, 'user@test.com', 'ORG1')

            expect(mockQuery).toHaveBeenCalledTimes(3)
            expect(mockQuery.mock.calls[1][0]).toContain('INSERT INTO rating_schedules')
            expect(mockQuery.mock.calls[1][0]).toContain('org_code')
            expect(result.id).toBe(5)
        })

        it('T-RATING-BE-R05a2: inserts without org_code when column does not exist', async () => {
            mockQuery
                .mockResolvedValueOnce([]) // no org_code column
                .mockResolvedValueOnce([{ id: 6 }]) // INSERT RETURNING id
                .mockResolvedValueOnce([{ ...mockSchedule, id: 6 }]) // findOne re-fetch

            const result = await service.create({ name: 'Legacy Schema Schedule' }, 'user@test.com', 'ORG1')

            expect(mockQuery.mock.calls[1][0]).toContain('INSERT INTO rating_schedules')
            expect(mockQuery.mock.calls[1][0]).not.toContain('org_code')
            expect(result.id).toBe(6)
        })

        it('T-RATING-BE-R05b: throws BadRequestException when name is missing', async () => {
            const { BadRequestException } = await import('@nestjs/common')
            await expect(service.create({}, 'user')).rejects.toThrow(BadRequestException)
        })
    })

    // =========================================================================
    // T-RATING-BE-R06: createRule — creates a rating rule
    // =========================================================================
    describe('createRule', () => {
        it('T-RATING-BE-R06a: inserts a rule and returns it', async () => {
            const newRule = { ...mockRule, id: 20 }
            mockQuery.mockResolvedValueOnce([newRule])

            const result = await service.createRule({
                rating_schedule_id: 1,
                field_name: 'sum_insured',
                operator: '>',
                rate_percentage: 0.1,
            }, 'user@test.com')

            expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO rating_rules')
            expect(result).toEqual(newRule)
        })

        it('T-RATING-BE-R06b: throws BadRequestException when field_name is missing', async () => {
            const { BadRequestException } = await import('@nestjs/common')
            await expect(service.createRule({ rating_schedule_id: 1, operator: '=', rate_percentage: 0.1 })).rejects.toThrow(BadRequestException)
        })
    })

    // =========================================================================
    // T-RATING-BE-R07: updateRule — updates a rating rule
    // =========================================================================
    describe('updateRule', () => {
        it('T-RATING-BE-R07a: updates a rule and returns the updated record', async () => {
            const updated = { ...mockRule, rate_percentage: '0.20000' }
            mockQuery.mockResolvedValueOnce([updated])

            const result = await service.updateRule(10, { rate_percentage: 0.2 })

            expect(mockQuery.mock.calls[0][0]).toContain('UPDATE rating_rules')
            expect(result).toEqual(updated)
        })

        it('T-RATING-BE-R07b: throws NotFoundException when rule not found', async () => {
            mockQuery.mockResolvedValueOnce([])
            await expect(service.updateRule(999, {})).rejects.toThrow(NotFoundException)
        })
    })

    // =========================================================================
    // T-RATING-BE-R08: deleteRule — deletes a rating rule
    // =========================================================================
    describe('deleteRule', () => {
        it('T-RATING-BE-R08a: deletes a rule and returns success', async () => {
            mockQuery.mockResolvedValueOnce(undefined)
            const result = await service.deleteRule(10)
            expect(mockQuery.mock.calls[0][0]).toContain('DELETE FROM rating_rules')
            expect(result).toEqual({ success: true })
        })
    })

    // =========================================================================
    // T-RATING-BE-R09: calculate — calculates premiums for a quote
    // =========================================================================
    describe('calculate', () => {
        it('T-RATING-BE-R09a: returns empty summary when no locations found', async () => {
            const schedule = { id: 1, name: 'Test', currency: 'GBP' }
            const quoteRow = { id: 100, placement_method: 'open_market' }
            mockQuery
                .mockResolvedValueOnce([quoteRow])   // quotes lookup in resolveScheduleForQuote
                .mockResolvedValueOnce([schedule])   // placement_methods schedule match
                .mockResolvedValueOnce([])           // rules
                .mockResolvedValueOnce([])           // locations (loadQuoteLocations)

            const result = await service.calculate({ quoteId: 100 }, 'System')

            expect(result.summary.locations).toBe(0)
            expect(result.summary.grossAnnualPremium).toBe(0)
            expect(result.items).toEqual([])
        })

        it('T-RATING-BE-R09b: throws BadRequestException when quoteId missing', async () => {
            const { BadRequestException } = await import('@nestjs/common')
            await expect(service.calculate({}, 'System')).rejects.toThrow(BadRequestException)
        })

        it('T-RATING-BE-R09c: throws NotFoundException when no schedule resolves', async () => {
            mockQuery
                .mockResolvedValueOnce([{ id: 100, placement_method: 'open_market' }])
                .mockResolvedValueOnce([])  // no schedule found

            await expect(service.calculate({ quoteId: 100 }, 'System')).rejects.toThrow(NotFoundException)
        })
    })
})
