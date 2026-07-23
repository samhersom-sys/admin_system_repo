/**
 * earnings-config.spec.ts — EarningsConfigService unit tests
 * Domain: SETTINGS-EARN
 * Requirements: frontend/src/settings/EarningsConfigPage.requirements.md
 * Standard: AI Guidelines §06-Testing-Standards.md §6.2
 *
 * Tests: REQ-SETTINGS-EARN-R03 through R09
 */

import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { EarningsConfigService } from './earnings-config.service'
import {
    EarningPattern,
    EarningPatternPoint,
    EarningPatternRule,
} from '../entities/earning-pattern.entity'

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

function makePattern(overrides: Partial<EarningPattern> = {}): EarningPattern {
    return {
        id: 1,
        orgCode: 'TST',
        name: 'Standard Straight Line',
        patternType: 'straight_line',
        earnBy: 'day',
        description: null,
        isActive: true,
        createdBy: 'admin',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        ...overrides,
    } as EarningPattern
}

function makePoint(overrides: Partial<EarningPatternPoint> = {}): EarningPatternPoint {
    return {
        id: 1,
        patternId: 10,
        pctThroughPolicy: '33.33',
        pctEarnedIncrement: '20.00',
        sortOrder: 0,
        createdAt: new Date('2026-01-01'),
        ...overrides,
    } as EarningPatternPoint
}

function makeRule(overrides: Partial<EarningPatternRule> = {}): EarningPatternRule {
    return {
        id: 1,
        orgCode: 'TST',
        patternId: 1,
        priority: 0,
        productId: null,
        classOfBusiness: null,
        contractType: null,
        includeIncepted: true,
        isActive: true,
        createdBy: 'admin',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        ...overrides,
    } as EarningPatternRule
}

// ---------------------------------------------------------------------------
// Repo mock factories
// ---------------------------------------------------------------------------

function makePatternRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
    return {
        find: jest.fn().mockResolvedValue([makePattern()]),
        findOne: jest.fn().mockResolvedValue(makePattern()),
        create: jest.fn().mockImplementation((dto: any) => ({ ...makePattern(), ...dto })),
        save: jest.fn().mockImplementation(async (e: any) => e),
        ...overrides,
    }
}

function makePointRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
    return {
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((dto: any) => ({ ...makePoint(), ...dto })),
        save: jest.fn().mockImplementation(async (e: any) => e),
        remove: jest.fn().mockResolvedValue(undefined),
        ...overrides,
    }
}

function makeRuleRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
    const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ max: null }),
    }
    return {
        find: jest.fn().mockResolvedValue([makeRule()]),
        findOne: jest.fn().mockResolvedValue(makeRule()),
        create: jest.fn().mockImplementation((dto: any) => ({ ...makeRule(), ...dto })),
        save: jest.fn().mockImplementation(async (e: any) => e),
        createQueryBuilder: jest.fn().mockReturnValue(qb),
        ...overrides,
    }
}

// ---------------------------------------------------------------------------
// Helper to build the service under test
// ---------------------------------------------------------------------------

async function buildService(
    patternRepo: any = makePatternRepo(),
    pointRepo: any = makePointRepo(),
    ruleRepo: any = makeRuleRepo(),
): Promise<EarningsConfigService> {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            EarningsConfigService,
            { provide: getRepositoryToken(EarningPattern), useValue: patternRepo },
            { provide: getRepositoryToken(EarningPatternPoint), useValue: pointRepo },
            { provide: getRepositoryToken(EarningPatternRule), useValue: ruleRepo },
        ],
    }).compile()
    return module.get(EarningsConfigService)
}

// ===========================================================================
// PATTERNS
// ===========================================================================

describe('T-EARN-R03: getPatterns returns active patterns for org', () => {
    it('returns patterns from repo ordered by name', async () => {
        const pattern = makePattern({ name: 'My Pattern' })
        const repo = makePatternRepo({ find: jest.fn().mockResolvedValue([pattern]) })
        const svc = await buildService(repo)

        const result = await svc.getPatterns('TST')

        expect(repo.find).toHaveBeenCalledWith({
            where: { orgCode: 'TST', isActive: true },
            order: { name: 'ASC' },
        })
        expect(result).toEqual([pattern])
    })
})

describe('T-EARN-R04a: createPattern validates required fields', () => {
    it('throws BadRequestException when name is empty', async () => {
        const svc = await buildService()
        await expect(
            svc.createPattern('TST', 'admin', { name: '', patternType: 'upfront' }),
        ).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException for unknown patternType', async () => {
        const svc = await buildService()
        await expect(
            svc.createPattern('TST', 'admin', { name: 'X', patternType: 'invalid' as any }),
        ).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException for unknown earnBy', async () => {
        const svc = await buildService()
        await expect(
            svc.createPattern('TST', 'admin', { name: 'X', patternType: 'upfront', earnBy: 'monthly' as any }),
        ).rejects.toThrow(BadRequestException)
    })
})

describe('T-EARN-R04b: createPattern saves and returns new pattern', () => {
    it('creates pattern with defaults', async () => {
        const saved = makePattern({ name: 'New', patternType: 'upfront', earnBy: 'day' })
        const repo = makePatternRepo({
            create: jest.fn().mockReturnValue(saved),
            save: jest.fn().mockResolvedValue(saved),
        })
        const svc = await buildService(repo)

        const result = await svc.createPattern('TST', 'admin', { name: 'New', patternType: 'upfront' })

        expect(repo.save).toHaveBeenCalled()
        expect(result.name).toBe('New')
        expect(result.earnBy).toBe('day')
    })
})

describe('T-EARN-R06: deactivatePattern sets isActive=false', () => {
    it('deactivates an existing active pattern', async () => {
        const pattern = makePattern({ isActive: true })
        const repo = makePatternRepo({
            findOne: jest.fn().mockResolvedValue(pattern),
            save: jest.fn().mockImplementation(async (e: any) => e),
        })
        const svc = await buildService(repo)

        await svc.deactivatePattern(1, 'TST')

        expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }))
    })

    it('throws NotFoundException for unknown pattern', async () => {
        const repo = makePatternRepo({ findOne: jest.fn().mockResolvedValue(null) })
        const svc = await buildService(repo)
        await expect(svc.deactivatePattern(999, 'TST')).rejects.toThrow(NotFoundException)
    })

    it('is a no-op if already inactive', async () => {
        const pattern = makePattern({ isActive: false })
        const repo = makePatternRepo({ findOne: jest.fn().mockResolvedValue(pattern) })
        const svc = await buildService(repo)

        await svc.deactivatePattern(1, 'TST')

        expect(repo.save).not.toHaveBeenCalled()
    })
})

// ===========================================================================
// INTERPOLATION POINTS
// ===========================================================================

describe('T-EARN-R05a: createPoint rejects invalid values', () => {
    it('throws when pctThroughPolicy is 0', async () => {
        const interpolated = makePattern({ patternType: 'interpolated' })
        const patternRepo = makePatternRepo({ findOne: jest.fn().mockResolvedValue(interpolated) })
        const pointRepo = makePointRepo({ find: jest.fn().mockResolvedValue([]) })
        const svc = await buildService(patternRepo, pointRepo)

        await expect(
            svc.createPoint(1, 'TST', { pctThroughPolicy: 0, pctEarnedIncrement: 20 }),
        ).rejects.toThrow(BadRequestException)
    })

    it('throws when pctEarnedIncrement is 0', async () => {
        const interpolated = makePattern({ patternType: 'interpolated' })
        const patternRepo = makePatternRepo({ findOne: jest.fn().mockResolvedValue(interpolated) })
        const pointRepo = makePointRepo({ find: jest.fn().mockResolvedValue([]) })
        const svc = await buildService(patternRepo, pointRepo)

        await expect(
            svc.createPoint(1, 'TST', { pctThroughPolicy: 50, pctEarnedIncrement: 0 }),
        ).rejects.toThrow(BadRequestException)
    })

    it('throws when adding point would exceed 100% total', async () => {
        const interpolated = makePattern({ patternType: 'interpolated' })
        const patternRepo = makePatternRepo({ findOne: jest.fn().mockResolvedValue(interpolated) })
        // existing total = 90
        const pointRepo = makePointRepo({
            find: jest.fn().mockResolvedValue([makePoint({ pctEarnedIncrement: '90.0000' })]),
            findOne: jest.fn().mockResolvedValue(null),
        })
        const svc = await buildService(patternRepo, pointRepo)

        await expect(
            svc.createPoint(1, 'TST', { pctThroughPolicy: 80, pctEarnedIncrement: 20 }),
        ).rejects.toThrow(BadRequestException)
    })

    it('throws for non-interpolated patterns', async () => {
        const straight = makePattern({ patternType: 'straight_line' })
        const patternRepo = makePatternRepo({ findOne: jest.fn().mockResolvedValue(straight) })
        const svc = await buildService(patternRepo)

        await expect(
            svc.createPoint(1, 'TST', { pctThroughPolicy: 50, pctEarnedIncrement: 50 }),
        ).rejects.toThrow(BadRequestException)
    })
})

describe('T-EARN-R05b: createPoint saves valid point', () => {
    it('saves a valid point and returns it', async () => {
        const interpolated = makePattern({ patternType: 'interpolated' })
        const patternRepo = makePatternRepo({ findOne: jest.fn().mockResolvedValue(interpolated) })
        const saved = makePoint({ pctThroughPolicy: '50.0000', pctEarnedIncrement: '50.0000' })
        const pointRepo = makePointRepo({
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockReturnValue(saved),
            save: jest.fn().mockResolvedValue(saved),
        })
        const svc = await buildService(patternRepo, pointRepo)

        const result = await svc.createPoint(1, 'TST', { pctThroughPolicy: 50, pctEarnedIncrement: 50 })

        expect(pointRepo.save).toHaveBeenCalled()
        expect(result.pctEarnedIncrement).toBe('50.0000')
    })
})

// ===========================================================================
// RULES
// ===========================================================================

describe('T-EARN-R07: getRules returns active rules ordered by priority', () => {
    it('returns rules sorted by priority', async () => {
        const rules = [makeRule({ priority: 0 }), makeRule({ id: 2, priority: 1 })]
        const ruleRepo = makeRuleRepo({ find: jest.fn().mockResolvedValue(rules) })
        const svc = await buildService(undefined, undefined, ruleRepo)

        const result = await svc.getRules('TST')

        expect(ruleRepo.find).toHaveBeenCalledWith({
            where: { orgCode: 'TST', isActive: true },
            order: { priority: 'ASC' },
        })
        expect(result).toHaveLength(2)
    })
})

describe('T-EARN-R08: createRule saves rule with defaults', () => {
    it('assigns next priority automatically when not provided', async () => {
        const qb = {
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getRawOne: jest.fn().mockResolvedValue({ max: '2' }),
        }
        const ruleRepo = makeRuleRepo({ createQueryBuilder: jest.fn().mockReturnValue(qb) })
        const svc = await buildService(undefined, undefined, ruleRepo)

        await svc.createRule('TST', 'admin', { patternId: 1 })

        expect(ruleRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({ priority: 3, includeIncepted: true }),
        )
    })

    it('throws NotFoundException when pattern does not exist for org', async () => {
        const patternRepo = makePatternRepo({ findOne: jest.fn().mockResolvedValue(null) })
        const svc = await buildService(patternRepo)

        await expect(
            svc.createRule('TST', 'admin', { patternId: 999 }),
        ).rejects.toThrow(NotFoundException)
    })
})

describe('T-EARN-R09: deactivateRule sets isActive=false', () => {
    it('deactivates an existing rule', async () => {
        const rule = makeRule({ isActive: true })
        const ruleRepo = makeRuleRepo({
            findOne: jest.fn().mockResolvedValue(rule),
            save: jest.fn().mockImplementation(async (e: any) => e),
        })
        const svc = await buildService(undefined, undefined, ruleRepo)

        await svc.deactivateRule(1, 'TST')

        expect(ruleRepo.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }))
    })

    it('throws NotFoundException for unknown rule', async () => {
        const ruleRepo = makeRuleRepo({ findOne: jest.fn().mockResolvedValue(null) })
        const svc = await buildService(undefined, undefined, ruleRepo)
        await expect(svc.deactivateRule(999, 'TST')).rejects.toThrow(NotFoundException)
    })
})
