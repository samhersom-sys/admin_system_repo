import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm'
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { MeasuresService } from './measures.service'
import { MeasureDefinition } from './measure-definition.entity'
import { compileFilterCondition } from './filter-condition.compiler'

// ---------------------------------------------------------------------------
// Minimal mock helpers
// ---------------------------------------------------------------------------

function makeMeasure(overrides: Partial<MeasureDefinition> = {}): MeasureDefinition {
    return {
        id: 1,
        key: 'countActive',
        label: 'Count of Active Policies',
        sourceKey: 'policies',
        measureType: 'count',
        scope: 'both',
        createdByType: 'internal',
        orgCode: null,
        filterExpr: "status = 'Active'",
        filterCondition: null,
        ratioNumerator: null,
        ratioDenominator: null,
        isActive: true,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        ...overrides,
    } as MeasureDefinition
}

const mockRepo = () => ({
    createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
    }),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
})

const mockDataSource = () => ({
    query: jest.fn().mockResolvedValue([]),
})

// ---------------------------------------------------------------------------
// Filter condition compiler — unit tests
// ---------------------------------------------------------------------------

describe('compileFilterCondition', () => {
    test('T-MEAS-COMPILER-001: compiles a simple leaf condition', () => {
        const result = compileFilterCondition(
            { field: 'status', operator: '=', value: 'Active' },
            'policies',
        )
        expect(result).toBe("status = 'Active'")
    })

    test('T-MEAS-COMPILER-002: compiles an AND compound condition', () => {
        const result = compileFilterCondition(
            {
                logic: 'AND',
                conditions: [
                    { field: 'status', operator: '=', value: 'Active' },
                    { field: 'newOrRenewal', operator: '=', value: 'New' },
                ],
            },
            'policies',
        )
        expect(result).toBe("(status = 'Active' AND new_or_renewal = 'New')")
    })

    test('T-MEAS-COMPILER-003: compiles an OR compound condition', () => {
        const result = compileFilterCondition(
            {
                logic: 'OR',
                conditions: [
                    { field: 'status', operator: '=', value: 'Active' },
                    { field: 'status', operator: '=', value: 'Renewed' },
                ],
            },
            'policies',
        )
        expect(result).toBe("(status = 'Active' OR status = 'Renewed')")
    })

    test('T-MEAS-COMPILER-004: compiles IS NULL operator (no value needed)', () => {
        const result = compileFilterCondition(
            { field: 'status', operator: 'IS NULL' },
            'policies',
        )
        expect(result).toBe('status IS NULL')
    })

    test('T-MEAS-COMPILER-005: rejects unknown field — prevents injection via field name', () => {
        expect(() =>
            compileFilterCondition(
                { field: 'nonExistentField', operator: '=', value: 'x' },
                'policies',
            )
        ).toThrow(BadRequestException)
    })

    test('T-MEAS-COMPILER-006: rejects disallowed operator', () => {
        expect(() =>
            compileFilterCondition(
                { field: 'status', operator: 'LIKE' as any, value: '%Active%' },
                'policies',
            )
        ).toThrow(BadRequestException)
    })

    test('T-MEAS-COMPILER-007: rejects value not in lookupValues for lookup field', () => {
        expect(() =>
            compileFilterCondition(
                { field: 'status', operator: '=', value: 'HACKED_VALUE; DROP TABLE--' },
                'policies',
            )
        ).toThrow(BadRequestException)
    })

    test('T-MEAS-COMPILER-008: nested AND/OR compound condition compiles correctly', () => {
        const result = compileFilterCondition(
            {
                logic: 'AND',
                conditions: [
                    { field: 'status', operator: '=', value: 'Active' },
                    {
                        logic: 'OR',
                        conditions: [
                            { field: 'newOrRenewal', operator: '=', value: 'New' },
                            { field: 'newOrRenewal', operator: '=', value: 'Renewal' },
                        ],
                    },
                ],
            },
            'policies',
        )
        expect(result).toBe("(status = 'Active' AND (new_or_renewal = 'New' OR new_or_renewal = 'Renewal'))")
    })
})

// ---------------------------------------------------------------------------
// MeasuresService — unit tests
// ---------------------------------------------------------------------------

describe('MeasuresService', () => {
    let service: MeasuresService
    let repo: ReturnType<typeof mockRepo>
    let ds: ReturnType<typeof mockDataSource>

    beforeEach(async () => {
        repo = mockRepo()
        ds = mockDataSource()
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MeasuresService,
                { provide: getRepositoryToken(MeasureDefinition), useValue: repo },
                { provide: getDataSourceToken(), useValue: ds },
            ],
        }).compile()
        service = module.get(MeasuresService)
    })

    test('T-MEAS-SVC-001: getEffectiveFilterExpr returns filter_expr for internal measures', () => {
        const m = makeMeasure({ createdByType: 'internal', filterExpr: "status = 'Active'" })
        expect(service.getEffectiveFilterExpr(m)).toBe("status = 'Active'")
    })

    test('T-MEAS-SVC-002: getEffectiveFilterExpr compiles filter_condition for tenant measures', () => {
        const m = makeMeasure({
            createdByType: 'tenant',
            orgCode: 'ORG-001',
            filterExpr: null,
            filterCondition: { field: 'status', operator: '=', value: 'Active' },
        })
        expect(service.getEffectiveFilterExpr(m)).toBe("status = 'Active'")
    })

    test('T-MEAS-SVC-003: getEffectiveFilterExpr returns null for unfiltered count-all', () => {
        const m = makeMeasure({ filterExpr: null, filterCondition: null })
        expect(service.getEffectiveFilterExpr(m)).toBeNull()
    })

    test('T-MEAS-SVC-004: toFieldDef maps measureType=count correctly', () => {
        const m = makeMeasure()
        const fd = service.toFieldDef(m)
        expect(fd.type).toBe('count')
        expect(fd.filterExpr).toBe("status = 'Active'")
        expect(fd.key).toBe('countActive')
    })

    test('T-MEAS-SVC-005: toFieldDef maps measureType=ratio correctly', () => {
        const m = makeMeasure({
            measureType: 'ratio',
            filterExpr: null,
            ratioNumerator: "status = 'Renewed'",
            ratioDenominator: "renewable = 'Renewable'",
        })
        const fd = service.toFieldDef(m)
        expect(fd.type).toBe('ratio')
        expect(fd.ratioNumerator).toBe("status = 'Renewed'")
        expect(fd.ratioDenominator).toBe("renewable = 'Renewable'")
    })

    test('T-MEAS-SVC-006: findOne throws NotFoundException for measure owned by another org', async () => {
        repo.findOne.mockResolvedValue(makeMeasure({ createdByType: 'tenant', orgCode: 'ORG-999' }))
        await expect(service.findOne(1, 'ORG-001')).rejects.toThrow(NotFoundException)
    })

    test('T-MEAS-SVC-007: create rejects unknown sourceKey', async () => {
        await expect(
            service.create('ORG-001', 'user1', {
                key: 'myMeasure',
                label: 'My Measure',
                sourceKey: 'nonExistentSource',
                measureType: 'count',
            })
        ).rejects.toThrow(BadRequestException)
    })

    test('T-MEAS-SVC-008: update throws ForbiddenException for internal measure', async () => {
        repo.findOne.mockResolvedValue(makeMeasure({ createdByType: 'internal', orgCode: null }))
        await expect(service.update(1, 'ORG-001', 'user1', { label: 'New Label' })).rejects.toThrow(ForbiddenException)
    })

    test('T-MEAS-SVC-009: deactivate throws ForbiddenException for internal measure', async () => {
        repo.findOne.mockResolvedValue(makeMeasure({ createdByType: 'internal', orgCode: null }))
        await expect(service.deactivate(1, 'ORG-001', 'user1')).rejects.toThrow(ForbiddenException)
    })

    test('T-MEAS-SVC-010: getAugmentedSourceConfig prepends measure fields to base fields', async () => {
        const qb = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([makeMeasure()]),
        }
        repo.createQueryBuilder.mockReturnValue(qb)
        const result = await service.getAugmentedSourceConfig('policies', 'ORG-001')
        // Measure fields prepended — first field should be the DB measure
        expect(result.fields[0].key).toBe('countActive')
        // Dimension fields still present
        expect(result.fields.some(f => f.key === 'reference')).toBe(true)
    })
})
