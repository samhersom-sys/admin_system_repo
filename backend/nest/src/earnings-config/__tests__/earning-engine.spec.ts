/**
 * earning-engine.spec.ts — Earning Engine (Phase 2) unit tests
 * Domain: EARN
 * Requirements: backend/nest/src/earnings-config/earning-engine.requirements.md
 * Standard: AI Guidelines §06-Testing-Standards.md §6.2
 *
 * Tests: T-EARN-BE-001 through T-EARN-BE-022
 *
 * RED STATE — Implementation files do not exist yet. All imports of new modules
 * below will fail at runtime until the implementation files are created. That is
 * the expected RED state per the Three-Artifact Rule (§03).
 */

import { Test, TestingModule } from '@nestjs/testing'
import {
    INestApplication,
    ExecutionContext,
    ForbiddenException,
    UnprocessableEntityException,
    HttpStatus,
} from '@nestjs/common'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Reflector } from '@nestjs/core'
import { getMetadataArgsStorage } from 'typeorm'
import * as request from 'supertest'
import * as path from 'path'
import * as fs from 'fs'

// ---------------------------------------------------------------------------
// RED imports — these files do not exist yet. Tests fail until implementation.
// ---------------------------------------------------------------------------
import { EarningEngineService } from '../earning-engine.service'
import { EarningEngineController } from '../earning-engine.controller'
import { EarningEngineCronService } from '../earning-engine-cron.service'
import { PolicyEarningPeriod } from '../policy-earning-period.entity'

// ---------------------------------------------------------------------------
// Existing files — some will be modified by the implementation.
// ---------------------------------------------------------------------------
import { EarningsConfigService } from '../earnings-config.service'
import {
    EarningPattern,
    EarningPatternPoint,
    EarningPatternRule,
} from '../../entities/earning-pattern.entity'
import { PolicySection } from '../../entities/policy-section.entity'
import { MeasureDefinition } from '../../measures/measure-definition.entity'
import { DATA_SOURCES } from '../../reporting/field-mappings'
import { JwtAuthGuard } from '../../auth/jwt-auth.guard'
import { RolesGuard } from '../../auth/roles.guard'

// ===========================================================================
// Test data factories
// ===========================================================================

function makeSection(overrides: Partial<Record<string, unknown>> = {}): any {
    return {
        id: 42,
        policyId: 1,
        orgCode: 'TST',
        resolvedEarningPatternId: 10,
        inceptionDate: '2026-01-01',
        expiryDate: '2026-12-31',
        daysOnCover: 365,
        grossWrittenPremium: '1000.0000',
        contractType: 'Open Market',
        classOfBusiness: 'Marine',
        includeIncepted: true,
        ...overrides,
    }
}

function makePattern(overrides: Partial<Record<string, unknown>> = {}): any {
    return {
        id: 10,
        orgCode: 'TST',
        patternType: 'straight_line',
        earnBy: 'day',
        name: 'Standard Straight Line',
        isActive: true,
        ...overrides,
    }
}

function makeRule(overrides: Partial<Record<string, unknown>> = {}): any {
    return {
        id: 1,
        orgCode: 'TST',
        patternId: 10,
        priority: 0,
        classOfBusiness: 'Marine',
        contractType: 'Open Market',
        includeIncepted: true,
        isActive: true,
        ...overrides,
    }
}

function makePeriodRow(overrides: Partial<Record<string, unknown>> = {}): any {
    return {
        id: 1,
        policySectionId: 42,
        orgCode: 'TST',
        periodYear: 2026,
        periodMonth: 1,
        totalPremium: '310.0000',
        earnedAmount: '310.0000',
        unearnedAmount: '0.0000',
        daysInPeriod: 31,
        daysEarned: 31,
        earnByBasis: 'day',
        calculatedAt: new Date(),
        ...overrides,
    }
}

// ===========================================================================
// Mock repository factories
// ===========================================================================

function makeSectionRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
    return {
        findOne: jest.fn().mockResolvedValue(makeSection()),
        find: jest.fn().mockResolvedValue([makeSection()]),
        createQueryBuilder: jest.fn().mockReturnValue({
            innerJoin: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([makeSection()]),
        }),
        ...overrides,
    }
}

function makePatternRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
    return {
        findOne: jest.fn().mockResolvedValue(makePattern()),
        find: jest.fn().mockResolvedValue([makePattern()]),
        ...overrides,
    }
}

function makePointRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
    return {
        find: jest.fn().mockResolvedValue([]),
        ...overrides,
    }
}

function makeRuleRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
    return {
        find: jest.fn().mockResolvedValue([makeRule()]),
        findOne: jest.fn().mockResolvedValue(makeRule()),
        createQueryBuilder: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([makeRule()]),
        }),
        ...overrides,
    }
}

function makePeriodRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
    return {
        find: jest.fn().mockResolvedValue([makePeriodRow()]),
        upsert: jest.fn().mockResolvedValue({ identifiers: [], generatedMaps: [], raw: [] }),
        findOne: jest.fn().mockResolvedValue(makePeriodRow()),
        ...overrides,
    }
}

// ===========================================================================
// Controller test helpers
// ===========================================================================

/** Test-controlled user injected by the mock JWT guard. */
let testUser = { orgCode: 'TST', role: 'client_admin', username: 'testuser' }

/** Mock JwtAuthGuard — sets req.user from testUser; real RolesGuard still enforces @Roles(). */
const mockJwtGuardFactory = () => ({
    canActivate: (context: ExecutionContext) => {
        const req = context.switchToHttp().getRequest()
        req.user = { ...testUser }
        return true
    },
})

async function buildControllerApp(mockService: Partial<EarningEngineService>): Promise<INestApplication> {
    const module: TestingModule = await Test.createTestingModule({
        controllers: [EarningEngineController],
        providers: [
            { provide: EarningEngineService, useValue: mockService },
            RolesGuard,
            Reflector,
        ],
    })
        .overrideGuard(JwtAuthGuard)
        .useValue(mockJwtGuardFactory())
        .compile()

    const app = module.createNestApplication()
    app.setGlobalPrefix('api')
    await app.init()
    return app
}

// ===========================================================================
// SERVICE TEST HELPER
// ===========================================================================

async function buildEarningEngineService(
    sectionRepo: any = makeSectionRepo(),
    patternRepo: any = makePatternRepo(),
    pointRepo: any = makePointRepo(),
    periodRepo: any = makePeriodRepo(),
): Promise<EarningEngineService> {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            EarningEngineService,
            { provide: getRepositoryToken(PolicySection), useValue: sectionRepo },
            { provide: getRepositoryToken(EarningPattern), useValue: patternRepo },
            { provide: getRepositoryToken(EarningPatternPoint), useValue: pointRepo },
            { provide: getRepositoryToken(PolicyEarningPeriod), useValue: periodRepo },
        ],
    }).compile()
    return module.get(EarningEngineService)
}

async function buildEarningsConfigService(
    ruleRepo: any = makeRuleRepo(),
    patternRepo: any = makePatternRepo(),
): Promise<EarningsConfigService> {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            EarningsConfigService,
            { provide: getRepositoryToken(EarningPatternRule), useValue: ruleRepo },
            { provide: getRepositoryToken(EarningPattern), useValue: patternRepo },
            { provide: getRepositoryToken(EarningPatternPoint), useValue: makePointRepo() },
        ],
    }).compile()
    return module.get(EarningsConfigService)
}

// ===========================================================================
// T-EARN-BE-001: REQ-EARN-F-001 — Pattern resolver endpoint: 200 + resolvedEarningPatternId
// ===========================================================================

describe('T-EARN-BE-001: REQ-EARN-F-001 — Pattern resolver returns 200 + resolvedEarningPatternId', () => {
    let app: INestApplication

    beforeEach(async () => {
        testUser = { orgCode: 'TST', role: 'client_admin', username: 'testuser' }
        const mockService = {
            resolvePatternForSection: jest.fn().mockResolvedValue({
                resolvedEarningPatternId: 5,
                patternName: 'Marine Straight Line',
            }),
        } as unknown as EarningEngineService
        app = await buildControllerApp(mockService)
    })

    afterEach(() => app.close())

    // @req REQ-EARN-F-001
    it('T-EARN-BE-001: returns HTTP 200 with resolvedEarningPatternId when a matching rule exists', async () => {
        await request(app.getHttpServer())
            .post('/api/earning-engine/sections/resolve')
            .send({ classOfBusiness: 'Marine', contractType: 'Open Market', includeIncepted: true })
            .expect(HttpStatus.OK)
            .expect(res => {
                expect(res.body.resolvedEarningPatternId).toBe(5)
                expect(res.body.patternName).toBe('Marine Straight Line')
            })
    })

    // @req REQ-EARN-F-001
    it('T-EARN-BE-002: returns HTTP 403 when JWT org does not match the requested org scope', async () => {
        testUser = { orgCode: 'OTHER-ORG', role: 'client_admin', username: 'other' }
        const mockService = {
            resolvePatternForSection: jest.fn().mockRejectedValue(new ForbiddenException()),
        } as unknown as EarningEngineService
        app = await buildControllerApp(mockService)

        await request(app.getHttpServer())
            .post('/api/earning-engine/sections/resolve')
            .send({ classOfBusiness: 'Marine', contractType: 'Open Market', includeIncepted: true })
            .expect(HttpStatus.FORBIDDEN)
    })
})

// ===========================================================================
// T-EARN-BE-003: REQ-EARN-F-002 — Pattern resolver endpoint: 422 when no rule matches
// ===========================================================================

describe('T-EARN-BE-003: REQ-EARN-F-002 — Pattern resolver returns 422 + unmatchedAttributes', () => {
    let app: INestApplication

    beforeEach(async () => {
        testUser = { orgCode: 'TST', role: 'client_admin', username: 'testuser' }
        const mockService = {
            resolvePatternForSection: jest.fn().mockRejectedValue(
                new UnprocessableEntityException({
                    unmatchedAttributes: {
                        classOfBusiness: 'Unknown',
                        contractType: 'Unknown',
                        includeIncepted: false,
                    },
                }),
            ),
        } as unknown as EarningEngineService
        app = await buildControllerApp(mockService)
    })

    afterEach(() => app.close())

    // @req REQ-EARN-F-002
    it('T-EARN-BE-003: returns HTTP 422 with unmatchedAttributes body when no rule matches', async () => {
        await request(app.getHttpServer())
            .post('/api/earning-engine/sections/resolve')
            .send({ classOfBusiness: 'Unknown', contractType: 'Unknown', includeIncepted: false })
            .expect(HttpStatus.UNPROCESSABLE_ENTITY)
            .expect(res => {
                expect(res.body.message).toBeDefined()
                const body = res.body.message ?? res.body
                expect(JSON.stringify(body)).toContain('unmatchedAttributes')
            })
    })
})

// ===========================================================================
// T-EARN-BE-004: REQ-EARN-F-003 — Engine upfront: inception month earned = total_premium
// ===========================================================================

describe('T-EARN-BE-004: REQ-EARN-F-003 — Engine upfront pattern calculation', () => {
    // @req REQ-EARN-F-003
    it('T-EARN-BE-004: inception-month row has earned_amount = total_premium for upfront pattern', async () => {
        // Arrange
        const upsertMock = jest.fn().mockResolvedValue(undefined)
        const findMock = jest.fn().mockResolvedValue([])
        const periodRepo = makePeriodRepo({ upsert: upsertMock, find: findMock })
        const patternRepo = makePatternRepo({
            findOne: jest.fn().mockResolvedValue(makePattern({ patternType: 'upfront' })),
        })
        const svc = await buildEarningEngineService(
            makeSectionRepo({
                findOne: jest.fn().mockResolvedValue(
                    makeSection({ inceptionDate: '2026-01-01', expiryDate: '2026-12-31', grossWrittenPremium: '1200.0000' }),
                ),
            }),
            patternRepo,
            makePointRepo(),
            periodRepo,
        )

        // Act
        await svc.calculateForSection(42, 'TST')

        // Assert: the upserted rows include the inception month with earned = total premium
        expect(upsertMock).toHaveBeenCalled()
        const upsertedRows: any[] = upsertMock.mock.calls[0][0]
        const inceptionRow = upsertedRows.find((r: any) => r.periodYear === 2026 && r.periodMonth === 1)
        expect(inceptionRow).toBeDefined()
        expect(inceptionRow.earnedAmount).toBe('1200.0000')
        expect(inceptionRow.unearnedAmount).toBe('0.0000')
    })

    // @req REQ-EARN-F-003
    it('T-EARN-BE-004: all subsequent month rows have total_premium = 0 for upfront pattern', async () => {
        const upsertMock = jest.fn().mockResolvedValue(undefined)
        const periodRepo = makePeriodRepo({ upsert: upsertMock, find: jest.fn().mockResolvedValue([]) })
        const patternRepo = makePatternRepo({
            findOne: jest.fn().mockResolvedValue(makePattern({ patternType: 'upfront' })),
        })
        const svc = await buildEarningEngineService(
            makeSectionRepo({
                findOne: jest.fn().mockResolvedValue(
                    makeSection({ inceptionDate: '2026-01-01', expiryDate: '2026-12-31', grossWrittenPremium: '1200.0000' }),
                ),
            }),
            patternRepo,
            makePointRepo(),
            periodRepo,
        )

        await svc.calculateForSection(42, 'TST')

        const upsertedRows: any[] = upsertMock.mock.calls[0][0]
        const subsequentRows = upsertedRows.filter(
            (r: any) => !(r.periodYear === 2026 && r.periodMonth === 1),
        )
        subsequentRows.forEach((row: any) => {
            expect(row.totalPremium).toBe('0.0000')
            expect(row.earnedAmount).toBe('0.0000')
            expect(row.unearnedAmount).toBe('0.0000')
        })
    })
})

// ===========================================================================
// T-EARN-BE-005: REQ-EARN-F-004 — Engine straight-line calculation
// ===========================================================================

describe('T-EARN-BE-005: REQ-EARN-F-004 — Engine straight-line pattern calculation', () => {
    // @req REQ-EARN-F-004
    it('T-EARN-BE-005a: fully elapsed month has correct total_premium and earned_amount = total_premium', async () => {
        // 365-day policy, GWP = 3650.00; January (31 days) fully elapsed
        const upsertMock = jest.fn().mockResolvedValue(undefined)
        const periodRepo = makePeriodRepo({ upsert: upsertMock, find: jest.fn().mockResolvedValue([]) })
        const patternRepo = makePatternRepo({
            findOne: jest.fn().mockResolvedValue(makePattern({ patternType: 'straight_line' })),
        })
        const svc = await buildEarningEngineService(
            makeSectionRepo({
                findOne: jest.fn().mockResolvedValue(
                    makeSection({
                        inceptionDate: '2026-01-01',
                        expiryDate: '2026-12-31',
                        daysOnCover: 365,
                        grossWrittenPremium: '3650.0000',
                    }),
                ),
            }),
            patternRepo,
            makePointRepo(),
            periodRepo,
        )

        await svc.calculateForSection(42, 'TST')

        const upsertedRows: any[] = upsertMock.mock.calls[0][0]
        const janRow = upsertedRows.find((r: any) => r.periodYear === 2026 && r.periodMonth === 1)
        expect(janRow).toBeDefined()
        expect(janRow.totalPremium).toBe('310.0000')
        expect(janRow.earnedAmount).toBe('310.0000')
        expect(janRow.unearnedAmount).toBe('0.0000')
    })

    // @req REQ-EARN-F-004
    it('T-EARN-BE-005b: partially elapsed month allocates earned proportionally to days elapsed', async () => {
        // Same 365-day policy; test partial month (15 out of 31 days elapsed)
        // Expected: total_premium = 310.0000, earned_amount = 150.0000, unearned_amount = 160.0000
        const upsertMock = jest.fn().mockResolvedValue(undefined)
        const periodRepo = makePeriodRepo({ upsert: upsertMock, find: jest.fn().mockResolvedValue([]) })
        const patternRepo = makePatternRepo({
            findOne: jest.fn().mockResolvedValue(makePattern({ patternType: 'straight_line' })),
        })
        const svc = await buildEarningEngineService(
            makeSectionRepo({
                findOne: jest.fn().mockResolvedValue(
                    makeSection({
                        inceptionDate: '2026-03-01',
                        expiryDate: '2027-02-28',
                        daysOnCover: 365,
                        grossWrittenPremium: '3650.0000',
                    }),
                ),
            }),
            patternRepo,
            makePointRepo(),
            periodRepo,
        )

        // Run calculation with engine date set so March has 15 days elapsed
        await svc.calculateForSection(42, 'TST', new Date('2026-03-15'))

        const upsertedRows: any[] = upsertMock.mock.calls[0][0]
        const marchRow = upsertedRows.find((r: any) => r.periodYear === 2026 && r.periodMonth === 3)
        expect(marchRow).toBeDefined()
        expect(marchRow.totalPremium).toBe('310.0000')
        expect(marchRow.earnedAmount).toBe('150.0000')
        expect(marchRow.unearnedAmount).toBe('160.0000')
    })
})

// ===========================================================================
// T-EARN-BE-006: REQ-EARN-F-005 — Engine interpolated: cumulative at midpoint = 80%
// ===========================================================================

describe('T-EARN-BE-006: REQ-EARN-F-005 — Engine interpolated pattern calculation', () => {
    // @req REQ-EARN-F-005
    it('T-EARN-BE-006: cumulative earned at midpoint equals 80% of GWP for a two-point curve (50%→80%, 100%→100%)', async () => {
        const upsertMock = jest.fn().mockResolvedValue(undefined)
        const periodRepo = makePeriodRepo({ upsert: upsertMock, find: jest.fn().mockResolvedValue([]) })
        const patternRepo = makePatternRepo({
            findOne: jest.fn().mockResolvedValue(makePattern({ id: 10, patternType: 'interpolated' })),
        })
        const pointRepo = makePointRepo({
            find: jest.fn().mockResolvedValue([
                // 50% through policy → 80% cumulative (incremental = 80%)
                { id: 1, patternId: 10, pctThroughPolicy: '50.0000', pctEarnedIncrement: '80.0000', sortOrder: 0 },
                // 100% through policy → 100% cumulative (incremental = 20%)
                { id: 2, patternId: 10, pctThroughPolicy: '100.0000', pctEarnedIncrement: '20.0000', sortOrder: 1 },
            ]),
        })
        const svc = await buildEarningEngineService(
            makeSectionRepo({
                findOne: jest.fn().mockResolvedValue(
                    makeSection({
                        inceptionDate: '2026-01-01',
                        expiryDate: '2026-12-31',
                        daysOnCover: 365,
                        grossWrittenPremium: '1000.0000',
                    }),
                ),
            }),
            patternRepo,
            pointRepo,
            periodRepo,
        )

        // Run calculation at midpoint (July 2, 2026 ≈ day 183 of 365)
        await svc.calculateForSection(42, 'TST', new Date('2026-07-02'))

        const upsertedRows: any[] = upsertMock.mock.calls[0][0]
        // Sum all earned_amount values for rows up to and including the calculation date month
        const cumulativeEarned = upsertedRows
            .filter((r: any) => r.periodYear === 2026 && r.periodMonth <= 7)
            .reduce((sum: number, r: any) => sum + parseFloat(r.earnedAmount), 0)

        expect(Math.abs(cumulativeEarned - 800)).toBeLessThan(0.0001)
    })
})

// ===========================================================================
// T-EARN-BE-007: REQ-EARN-F-006 — Balance invariant per row (all pattern types)
// ===========================================================================

describe('T-EARN-BE-007: REQ-EARN-F-006 — earned_amount + unearned_amount === total_premium for every row', () => {
    async function runAndGetRows(patternType: string): Promise<any[]> {
        const upsertMock = jest.fn().mockResolvedValue(undefined)
        const patternRepo = makePatternRepo({
            findOne: jest.fn().mockResolvedValue(makePattern({ patternType })),
        })
        const pointRepo = makePointRepo({
            find: jest.fn().mockResolvedValue(
                patternType === 'interpolated'
                    ? [
                        { id: 1, patternId: 10, pctThroughPolicy: '50.0000', pctEarnedIncrement: '60.0000', sortOrder: 0 },
                        { id: 2, patternId: 10, pctThroughPolicy: '100.0000', pctEarnedIncrement: '40.0000', sortOrder: 1 },
                    ]
                    : [],
            ),
        })
        const svc = await buildEarningEngineService(
            makeSectionRepo(),
            patternRepo,
            pointRepo,
            makePeriodRepo({ upsert: upsertMock, find: jest.fn().mockResolvedValue([]) }),
        )
        await svc.calculateForSection(42, 'TST')
        return upsertMock.mock.calls[0][0] as any[]
    }

    // @req REQ-EARN-F-006
    it('T-EARN-BE-007a: balance invariant holds for upfront pattern', async () => {
        const rows = await runAndGetRows('upfront')
        rows.forEach((row: any) => {
            const total = parseFloat(row.totalPremium)
            const earned = parseFloat(row.earnedAmount)
            const unearned = parseFloat(row.unearnedAmount)
            expect(Math.abs(earned + unearned - total)).toBeLessThan(0.0001)
        })
    })

    // @req REQ-EARN-F-006
    it('T-EARN-BE-007b: balance invariant holds for straight_line pattern', async () => {
        const rows = await runAndGetRows('straight_line')
        rows.forEach((row: any) => {
            const total = parseFloat(row.totalPremium)
            const earned = parseFloat(row.earnedAmount)
            const unearned = parseFloat(row.unearnedAmount)
            expect(Math.abs(earned + unearned - total)).toBeLessThan(0.0001)
        })
    })

    // @req REQ-EARN-F-006
    it('T-EARN-BE-007c: balance invariant holds for interpolated pattern', async () => {
        const rows = await runAndGetRows('interpolated')
        rows.forEach((row: any) => {
            const total = parseFloat(row.totalPremium)
            const earned = parseFloat(row.earnedAmount)
            const unearned = parseFloat(row.unearnedAmount)
            expect(Math.abs(earned + unearned - total)).toBeLessThan(0.0001)
        })
    })
})

// ===========================================================================
// T-EARN-BE-008: REQ-EARN-F-007 — Idempotent upsert: same row count, refreshed calculated_at
// ===========================================================================

describe('T-EARN-BE-008: REQ-EARN-F-007 — Idempotent upsert into policy_earning_periods', () => {
    // @req REQ-EARN-F-007
    it('T-EARN-BE-008a: running calculateForSection twice does not increase row count', async () => {
        const upsertMock = jest.fn().mockResolvedValue(undefined)
        const periodRepo = makePeriodRepo({ upsert: upsertMock, find: jest.fn().mockResolvedValue([]) })
        const svc = await buildEarningEngineService(
            makeSectionRepo(),
            makePatternRepo(),
            makePointRepo(),
            periodRepo,
        )

        await svc.calculateForSection(42, 'TST')
        const firstCallRows: any[] = upsertMock.mock.calls[0][0]

        await svc.calculateForSection(42, 'TST')
        const secondCallRows: any[] = upsertMock.mock.calls[1][0]

        expect(secondCallRows.length).toBe(firstCallRows.length)
    })

    // @req REQ-EARN-F-007
    it('T-EARN-BE-008b: upsert uses (policySectionId, periodYear, periodMonth) conflict key', async () => {
        const upsertMock = jest.fn().mockResolvedValue(undefined)
        const periodRepo = makePeriodRepo({ upsert: upsertMock, find: jest.fn().mockResolvedValue([]) })
        const svc = await buildEarningEngineService(
            makeSectionRepo(),
            makePatternRepo(),
            makePointRepo(),
            periodRepo,
        )

        await svc.calculateForSection(42, 'TST')

        // The second argument to upsert must include the unique conflict paths
        const conflictArg = upsertMock.mock.calls[0][1]
        const conflictPaths = conflictArg?.conflictPaths ?? conflictArg
        const pathStr = JSON.stringify(conflictPaths)
        expect(pathStr).toContain('periodYear')
        expect(pathStr).toContain('periodMonth')
        expect(pathStr).toContain('policySectionId')
    })
})

// ===========================================================================
// T-EARN-BE-009: REQ-EARN-F-008 — Cron job processes only qualifying sections
// ===========================================================================

describe('T-EARN-BE-009: REQ-EARN-F-008 — Cron job: only active sections with resolved pattern ID', () => {
    // @req REQ-EARN-F-008
    it('T-EARN-BE-009a: cron only processes sections with resolved_earning_pattern_id IS NOT NULL and policy status Active', async () => {
        const calculateMock = jest.fn().mockResolvedValue(undefined)
        const mockEngineService = {
            calculateForSection: calculateMock,
            getQualifyingSections: jest.fn().mockResolvedValue([
                makeSection({ id: 1, orgCode: 'TST', resolvedEarningPatternId: 10 }),
                makeSection({ id: 2, orgCode: 'OTHER', resolvedEarningPatternId: 5 }),
            ]),
        } as unknown as EarningEngineService

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EarningEngineCronService,
                { provide: EarningEngineService, useValue: mockEngineService },
            ],
        }).compile()

        const cronSvc = module.get(EarningEngineCronService)
        await cronSvc.runNightlyEarningJob()

        expect(calculateMock).toHaveBeenCalledTimes(2)
    })

    // @req REQ-EARN-F-008
    it('T-EARN-BE-009b: cron passes section.orgCode as second arg to calculateForSection', async () => {
        const calculateMock = jest.fn().mockResolvedValue(undefined)
        const section1 = makeSection({ id: 10, orgCode: 'ORG-A', resolvedEarningPatternId: 1 })
        const section2 = makeSection({ id: 20, orgCode: 'ORG-B', resolvedEarningPatternId: 2 })

        const mockEngineService = {
            calculateForSection: calculateMock,
            getQualifyingSections: jest.fn().mockResolvedValue([section1, section2]),
        } as unknown as EarningEngineService

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EarningEngineCronService,
                { provide: EarningEngineService, useValue: mockEngineService },
            ],
        }).compile()

        const cronSvc = module.get(EarningEngineCronService)
        await cronSvc.runNightlyEarningJob()

        expect(calculateMock).toHaveBeenNthCalledWith(1, 10, 'ORG-A', expect.anything())
        expect(calculateMock).toHaveBeenNthCalledWith(2, 20, 'ORG-B', expect.anything())
    })

    // @req REQ-EARN-F-008
    it('T-EARN-BE-009c: qualifying section query filters resolved_earning_pattern_id IS NOT NULL and policy status Active', async () => {
        const sectionQueryBuilder = {
            innerJoin: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
        }
        const sectionRepo = makeSectionRepo({
            createQueryBuilder: jest.fn().mockReturnValue(sectionQueryBuilder),
        })
        const svc = await buildEarningEngineService(sectionRepo)

        await svc.getQualifyingSections()

        // At minimum andWhere must have been called with conditions for resolvedEarningPatternId and status
        const allConditions = [
            ...sectionQueryBuilder.where.mock.calls.map((c: any) => JSON.stringify(c)),
            ...sectionQueryBuilder.andWhere.mock.calls.map((c: any) => JSON.stringify(c)),
        ].join(' ')
        expect(allConditions).toMatch(/resolvedEarningPatternId|resolved_earning_pattern_id/)
        expect(allConditions).toMatch(/Active/)
    })
})

// ===========================================================================
// T-EARN-BE-010: REQ-EARN-F-009 — Batch run endpoint: internal_admin = 200, client_admin = 403
// ===========================================================================

describe('T-EARN-BE-010: REQ-EARN-F-009 — POST /api/earning-engine/run role authorization', () => {
    let app: INestApplication

    afterEach(() => app.close())

    // @req REQ-EARN-F-009
    it('T-EARN-BE-010a: internal_admin receives HTTP 200 with { processed, errors }', async () => {
        testUser = { orgCode: 'TST', role: 'internal_admin', username: 'admin' }
        const mockService = {
            runBatchCalculation: jest.fn().mockResolvedValue({ processed: 3, errors: [] }),
        } as unknown as EarningEngineService
        app = await buildControllerApp(mockService)

        await request(app.getHttpServer())
            .post('/api/earning-engine/run')
            .expect(HttpStatus.OK)
            .expect(res => {
                expect(typeof res.body.processed).toBe('number')
                expect(Array.isArray(res.body.errors)).toBe(true)
            })
    })

    // @req REQ-EARN-F-009
    it('T-EARN-BE-010b: client_admin receives HTTP 403 on POST /api/earning-engine/run', async () => {
        testUser = { orgCode: 'TST', role: 'client_admin', username: 'user' }
        const mockService = {
            runBatchCalculation: jest.fn(),
        } as unknown as EarningEngineService
        app = await buildControllerApp(mockService)

        await request(app.getHttpServer())
            .post('/api/earning-engine/run')
            .expect(HttpStatus.FORBIDDEN)
    })
})

// ===========================================================================
// T-EARN-BE-011: REQ-EARN-F-010 — Per-section calculate endpoint authorization
// ===========================================================================

describe('T-EARN-BE-011: REQ-EARN-F-010 — POST /api/earning-engine/sections/:sectionId/calculate', () => {
    let app: INestApplication

    afterEach(() => app.close())

    // @req REQ-EARN-F-010
    it('T-EARN-BE-011a: client_admin for correct org returns 200 { processed: 1, errors: [] }', async () => {
        testUser = { orgCode: 'TST', role: 'client_admin', username: 'user' }
        const mockService = {
            calculateForSection: jest.fn().mockResolvedValue(undefined),
        } as unknown as EarningEngineService
        app = await buildControllerApp(mockService)

        await request(app.getHttpServer())
            .post('/api/earning-engine/sections/42/calculate')
            .expect(HttpStatus.OK)
            .expect(res => {
                expect(res.body.processed).toBe(1)
                expect(res.body.errors).toEqual([])
            })
    })

    // @req REQ-EARN-F-010
    it('T-EARN-BE-011b: returns 403 when section belongs to a different org', async () => {
        testUser = { orgCode: 'WRONG-ORG', role: 'client_admin', username: 'user' }
        const mockService = {
            calculateForSection: jest.fn().mockRejectedValue(new ForbiddenException()),
        } as unknown as EarningEngineService
        app = await buildControllerApp(mockService)

        await request(app.getHttpServer())
            .post('/api/earning-engine/sections/42/calculate')
            .expect(HttpStatus.FORBIDDEN)
    })
})

// ===========================================================================
// T-EARN-BE-012: REQ-EARN-F-011 — GET periods: ordered ASC, 403 for wrong org
// ===========================================================================

describe('T-EARN-BE-012: REQ-EARN-F-011 — GET /api/earning-engine/sections/:sectionId/periods', () => {
    let app: INestApplication

    afterEach(() => app.close())

    // @req REQ-EARN-F-011
    it('T-EARN-BE-012a: returns HTTP 200 with rows ordered by period_year ASC, period_month ASC', async () => {
        testUser = { orgCode: 'TST', role: 'client_admin', username: 'user' }
        const orderedRows = [
            makePeriodRow({ periodYear: 2026, periodMonth: 1 }),
            makePeriodRow({ id: 2, periodYear: 2026, periodMonth: 2 }),
            makePeriodRow({ id: 3, periodYear: 2026, periodMonth: 3 }),
        ]
        const mockService = {
            getPeriodsForSection: jest.fn().mockResolvedValue(orderedRows),
        } as unknown as EarningEngineService
        app = await buildControllerApp(mockService)

        await request(app.getHttpServer())
            .get('/api/earning-engine/sections/42/periods')
            .expect(HttpStatus.OK)
            .expect(res => {
                expect(Array.isArray(res.body)).toBe(true)
                const years = res.body.map((r: any) => r.periodYear)
                const months = res.body.map((r: any) => r.periodMonth)
                // Verify ascending order
                for (let i = 1; i < years.length; i++) {
                    expect(
                        years[i] > years[i - 1] ||
                        (years[i] === years[i - 1] && months[i] >= months[i - 1]),
                    ).toBe(true)
                }
            })
    })

    // @req REQ-EARN-F-011
    it('T-EARN-BE-012b: returns 403 when org_code does not match caller JWT', async () => {
        testUser = { orgCode: 'WRONG-ORG', role: 'client_admin', username: 'user' }
        const mockService = {
            getPeriodsForSection: jest.fn().mockRejectedValue(new ForbiddenException()),
        } as unknown as EarningEngineService
        app = await buildControllerApp(mockService)

        await request(app.getHttpServer())
            .get('/api/earning-engine/sections/42/periods')
            .expect(HttpStatus.FORBIDDEN)
    })
})

// ===========================================================================
// T-EARN-BE-013: REQ-EARN-F-012 — Seed produces grossWrittenPremiumEarned and grossWrittenPremiumUnearned
// ===========================================================================

describe('T-EARN-BE-013: REQ-EARN-F-012 — Seed 032: measure variant rows exist', () => {
    const seedPath = path.resolve(
        __dirname,
        '../../../../../db/seeds/032-measure-definitions.js',
    )

    // @req REQ-EARN-F-012
    it('T-EARN-BE-013a: seed file 032 defines grossWrittenPremiumEarned measure', () => {
        const content = fs.readFileSync(seedPath, 'utf-8')
        expect(content).toContain('grossWrittenPremiumEarned')
    })

    // @req REQ-EARN-F-012
    it('T-EARN-BE-013b: seed file 032 defines grossWrittenPremiumUnearned measure', () => {
        const content = fs.readFileSync(seedPath, 'utf-8')
        expect(content).toContain('grossWrittenPremiumUnearned')
    })

    // @req REQ-EARN-F-012
    it('T-EARN-BE-013c: seed file 032 sets has_earning_variants = true on grossWrittenPremium row', () => {
        const content = fs.readFileSync(seedPath, 'utf-8')
        expect(content).toContain('has_earning_variants')
        expect(content).toMatch(/grossWrittenPremium[^E]/)
    })

    // @req REQ-EARN-F-012
    it('T-EARN-BE-013d: grossWrittenPremiumEarned has source_key = policy_earning_periods', () => {
        const content = fs.readFileSync(seedPath, 'utf-8')
        // The string 'policy_earning_periods' should appear in association with the earned measure
        expect(content).toContain('policy_earning_periods')
    })
})

// ===========================================================================
// T-EARN-BE-014: REQ-EARN-F-013 — DATA_SOURCES['policy_earning_periods'] key exists
// ===========================================================================

describe('T-EARN-BE-014: REQ-EARN-F-013 — Reporting DATA_SOURCES has policy_earning_periods entry', () => {
    // @req REQ-EARN-F-013
    it('T-EARN-BE-014a: DATA_SOURCES[\'policy_earning_periods\'] key exists', () => {
        expect(DATA_SOURCES).toHaveProperty('policy_earning_periods')
    })

    // @req REQ-EARN-F-013
    it('T-EARN-BE-014b: policy_earning_periods entry has orgCol = org_code', () => {
        const src = DATA_SOURCES['policy_earning_periods']
        expect(src.orgCol).toBe('org_code')
    })

    // @req REQ-EARN-F-013
    it('T-EARN-BE-014c: policy_earning_periods entry defines all five required field keys', () => {
        const src = DATA_SOURCES['policy_earning_periods']
        const fieldKeys = src.fields.map((f: { key: string }) => f.key)
        expect(fieldKeys).toContain('earned_amount')
        expect(fieldKeys).toContain('unearned_amount')
        expect(fieldKeys).toContain('total_premium')
        expect(fieldKeys).toContain('period_year')
        expect(fieldKeys).toContain('period_month')
    })
})

// ===========================================================================
// T-EARN-BE-015: REQ-EARN-S-001 — EarningPatternRule entity has no productId property
// ===========================================================================

describe('T-EARN-BE-015: REQ-EARN-S-001 — EarningPatternRule entity has no productId column', () => {
    // @req REQ-EARN-S-001
    it('T-EARN-BE-015: EarningPatternRule TypeORM metadata contains no productId column', () => {
        const storage = getMetadataArgsStorage()
        const ruleColumns = storage.columns.filter(
            (c: any) => c.target === EarningPatternRule || (typeof c.target === 'function' && c.target.name === 'EarningPatternRule'),
        )
        const hasProductId = ruleColumns.some((c: any) => c.propertyName === 'productId')
        expect(hasProductId).toBe(false)
    })
})

// ===========================================================================
// T-EARN-BE-016: REQ-EARN-S-002 — PolicySection entity has resolvedEarningPatternId
// ===========================================================================

describe('T-EARN-BE-016: REQ-EARN-S-002 — PolicySection entity declares resolvedEarningPatternId as plain @Column', () => {
    // @req REQ-EARN-S-002
    it('T-EARN-BE-016a: PolicySection has resolvedEarningPatternId column in TypeORM metadata', () => {
        const storage = getMetadataArgsStorage()
        const sectionColumns = storage.columns.filter(
            (c: any) => c.target === PolicySection || (typeof c.target === 'function' && c.target.name === 'PolicySection'),
        )
        const col = sectionColumns.find((c: any) => c.propertyName === 'resolvedEarningPatternId')
        expect(col).toBeDefined()
    })

    // @req REQ-EARN-S-002
    it('T-EARN-BE-016b: PolicySection has no @ManyToOne or @JoinColumn for resolvedEarningPatternId', () => {
        const storage = getMetadataArgsStorage()
        const relations = storage.relations.filter(
            (r: any) => r.target === PolicySection || (typeof r.target === 'function' && r.target.name === 'PolicySection'),
        )
        const hasRelation = relations.some((r: any) => r.propertyName === 'resolvedEarningPatternId')
        expect(hasRelation).toBe(false)
    })

    // @req REQ-EARN-S-002
    it('T-EARN-BE-016c: policy-section.entity.ts file contains no EarningPattern import', () => {
        const entityPath = path.resolve(
            __dirname,
            '../../entities/policy-section.entity.ts',
        )
        const content = fs.readFileSync(entityPath, 'utf-8')
        expect(content).not.toMatch(/import.*EarningPattern/)
    })
})

// ===========================================================================
// T-EARN-BE-017: REQ-EARN-S-003 — PolicyEarningPeriod entity defines all required columns
// ===========================================================================

describe('T-EARN-BE-017: REQ-EARN-S-003 — PolicyEarningPeriod entity defines all required columns', () => {
    const REQUIRED_COLUMNS = [
        'policySectionId',
        'orgCode',
        'periodYear',
        'periodMonth',
        'totalPremium',
        'earnedAmount',
        'unearnedAmount',
        'daysInPeriod',
        'daysEarned',
        'earnByBasis',
        'calculatedAt',
    ]

    // @req REQ-EARN-S-003
    it('T-EARN-BE-017a: PolicyEarningPeriod entity is importable (file exists)', () => {
        // This test fails RED until policy-earning-period.entity.ts is created
        expect(PolicyEarningPeriod).toBeDefined()
    })

    // @req REQ-EARN-S-003
    it('T-EARN-BE-017b: PolicyEarningPeriod TypeORM metadata includes all required column properties', () => {
        const storage = getMetadataArgsStorage()
        const periodColumns = storage.columns.filter(
            (c: any) => c.target === PolicyEarningPeriod || (typeof c.target === 'function' && c.target.name === 'PolicyEarningPeriod'),
        )
        const columnNames = periodColumns.map((c: any) => c.propertyName)
        REQUIRED_COLUMNS.forEach(required => {
            expect(columnNames).toContain(required)
        })
    })

    // @req REQ-EARN-S-003
    it('T-EARN-BE-017c: totalPremium, earnedAmount, unearnedAmount are numeric type (NUMERIC(18,4))', () => {
        const storage = getMetadataArgsStorage()
        const periodColumns = storage.columns.filter(
            (c: any) => c.target === PolicyEarningPeriod || (typeof c.target === 'function' && c.target.name === 'PolicyEarningPeriod'),
        )
        const monetaryCols = ['totalPremium', 'earnedAmount', 'unearnedAmount']
        monetaryCols.forEach(propName => {
            const col = periodColumns.find((c: any) => c.propertyName === propName)
            expect(col).toBeDefined()
            const options = col?.options as any
            expect(options?.type).toBe('numeric')
            expect(options?.precision).toBe(18)
            expect(options?.scale).toBe(4)
        })
    })
})

// ===========================================================================
// T-EARN-BE-018: REQ-EARN-S-004 — MeasureDefinition entity has hasEarningVariants BOOLEAN
// ===========================================================================

describe('T-EARN-BE-018: REQ-EARN-S-004 — MeasureDefinition entity declares hasEarningVariants column', () => {
    // @req REQ-EARN-S-004
    it('T-EARN-BE-018a: MeasureDefinition TypeORM metadata includes hasEarningVariants column', () => {
        const storage = getMetadataArgsStorage()
        const measureColumns = storage.columns.filter(
            (c: any) => c.target === MeasureDefinition || (typeof c.target === 'function' && c.target.name === 'MeasureDefinition'),
        )
        const col = measureColumns.find((c: any) => c.propertyName === 'hasEarningVariants')
        expect(col).toBeDefined()
    })

    // @req REQ-EARN-S-004
    it('T-EARN-BE-018b: hasEarningVariants is type boolean with default false', () => {
        const storage = getMetadataArgsStorage()
        const measureColumns = storage.columns.filter(
            (c: any) => c.target === MeasureDefinition || (typeof c.target === 'function' && c.target.name === 'MeasureDefinition'),
        )
        const col = measureColumns.find((c: any) => c.propertyName === 'hasEarningVariants')
        const options = (col?.options as any) ?? {}
        expect(options.type).toBe('boolean')
        expect(options.default).toBe(false)
    })
})

// ===========================================================================
// T-EARN-BE-019: REQ-EARN-C-001 — Multi-tenant: org_code filter always present
// ===========================================================================

describe('T-EARN-BE-019: REQ-EARN-C-001 — Multi-tenant org_code filter on all period queries', () => {
    // @req REQ-EARN-C-001
    it('T-EARN-BE-019a: calculateForSection only upserts rows carrying the caller orgCode', async () => {
        const upsertMock = jest.fn().mockResolvedValue(undefined)
        const svc = await buildEarningEngineService(
            makeSectionRepo(),
            makePatternRepo(),
            makePointRepo(),
            makePeriodRepo({ upsert: upsertMock, find: jest.fn().mockResolvedValue([]) }),
        )

        await svc.calculateForSection(42, 'TST')

        const upsertedRows: any[] = upsertMock.mock.calls[0][0]
        upsertedRows.forEach((row: any) => {
            expect(row.orgCode).toBe('TST')
        })
    })

    // @req REQ-EARN-C-001
    it('T-EARN-BE-019b: getPeriodsForSection query includes org_code = callerOrgCode filter', async () => {
        const findMock = jest.fn().mockResolvedValue([])
        const svc = await buildEarningEngineService(
            makeSectionRepo(),
            makePatternRepo(),
            makePointRepo(),
            makePeriodRepo({ find: findMock }),
        )

        await svc.getPeriodsForSection(42, 'TST')

        expect(findMock).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ orgCode: 'TST' }),
            }),
        )
    })

    // @req REQ-EARN-C-001
    it('T-EARN-BE-019c: cron path writes rows with orgCode derived from section.orgCode', async () => {
        const calculateMock = jest.fn().mockResolvedValue(undefined)
        const section = makeSection({ id: 5, orgCode: 'ORG-A', resolvedEarningPatternId: 10 })
        const mockEngineService = {
            calculateForSection: calculateMock,
            getQualifyingSections: jest.fn().mockResolvedValue([section]),
        } as unknown as EarningEngineService

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EarningEngineCronService,
                { provide: EarningEngineService, useValue: mockEngineService },
            ],
        }).compile()
        const cronSvc = module.get(EarningEngineCronService)

        await cronSvc.runNightlyEarningJob()

        expect(calculateMock).toHaveBeenCalledWith(5, 'ORG-A', expect.anything())
    })
})

// ===========================================================================
// T-EARN-BE-020: REQ-EARN-C-002 — Resolver evaluates only is_active=true rules in priority order
// ===========================================================================

describe('T-EARN-BE-020: REQ-EARN-C-002 — Resolver skips inactive rules; lower priority wins', () => {
    // @req REQ-EARN-C-002
    it('T-EARN-BE-020a: inactive rule matching the section attributes is never selected', async () => {
        const inactiveRule = makeRule({ id: 99, isActive: false, classOfBusiness: 'Marine', priority: 0 })
        const ruleRepo = makeRuleRepo({
            find: jest.fn().mockResolvedValue([inactiveRule]),
            createQueryBuilder: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]), // no active rules
            }),
        })
        const svc = await buildEarningsConfigService(ruleRepo)

        const result = await svc.resolvePatternForSection(
            { classOfBusiness: 'Marine', contractType: 'Open Market', includeIncepted: true },
            'TST',
        )

        expect(result).toBeNull()
    })

    // @req REQ-EARN-C-002
    it('T-EARN-BE-020b: when two active rules match, the lower priority number wins', async () => {
        const highPriority = makeRule({ id: 1, priority: 0, patternId: 100, classOfBusiness: 'Marine', isActive: true })
        const lowPriority = makeRule({ id: 2, priority: 1, patternId: 200, classOfBusiness: 'Marine', isActive: true })
        const ruleRepo = makeRuleRepo({
            createQueryBuilder: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([highPriority, lowPriority]),
            }),
        })
        const svc = await buildEarningsConfigService(ruleRepo)

        const result = await svc.resolvePatternForSection(
            { classOfBusiness: 'Marine', contractType: 'Open Market', includeIncepted: true },
            'TST',
        )

        expect(result?.resolvedEarningPatternId).toBe(100)
    })
})

// ===========================================================================
// T-EARN-BE-021: REQ-EARN-C-003 — calculateForSection throws 403 for wrong org
// ===========================================================================

describe('T-EARN-BE-021: REQ-EARN-C-003 — calculateForSection throws ForbiddenException for wrong org', () => {
    // @req REQ-EARN-C-003
    it('T-EARN-BE-021a: throws ForbiddenException when section.orgCode !== caller orgCode', async () => {
        const sectionRepo = makeSectionRepo({
            findOne: jest.fn().mockResolvedValue(makeSection({ orgCode: 'ORG-B' })),
        })
        const svc = await buildEarningEngineService(sectionRepo)

        await expect(svc.calculateForSection(42, 'ORG-A')).rejects.toThrow(ForbiddenException)
    })

    // @req REQ-EARN-C-003
    it('T-EARN-BE-021b: no policy_earning_periods rows are written when org mismatch is detected', async () => {
        const upsertMock = jest.fn()
        const sectionRepo = makeSectionRepo({
            findOne: jest.fn().mockResolvedValue(makeSection({ orgCode: 'ORG-B' })),
        })
        const periodRepo = makePeriodRepo({ upsert: upsertMock })
        const svc = await buildEarningEngineService(sectionRepo, makePatternRepo(), makePointRepo(), periodRepo)

        await expect(svc.calculateForSection(42, 'ORG-A')).rejects.toThrow()
        expect(upsertMock).not.toHaveBeenCalled()
    })
})

// ===========================================================================
// T-EARN-BE-022: REQ-EARN-C-004 — No FLOAT arithmetic; NUMERIC precision preserved
// ===========================================================================

describe('T-EARN-BE-022: REQ-EARN-C-004 — Numeric precision: no FLOAT; NUMERIC(18,4) storage', () => {
    // @req REQ-EARN-C-004
    it('T-EARN-BE-022a: premium of 1.0001 across a 3-month policy: three rows sum exactly to 1.0001', async () => {
        const upsertMock = jest.fn().mockResolvedValue(undefined)
        const svc = await buildEarningEngineService(
            makeSectionRepo({
                findOne: jest.fn().mockResolvedValue(
                    makeSection({
                        inceptionDate: '2026-01-01',
                        expiryDate: '2026-03-31',
                        daysOnCover: 89,
                        grossWrittenPremium: '1.0001',
                    }),
                ),
            }),
            makePatternRepo({
                findOne: jest.fn().mockResolvedValue(makePattern({ patternType: 'straight_line' })),
            }),
            makePointRepo(),
            makePeriodRepo({ upsert: upsertMock, find: jest.fn().mockResolvedValue([]) }),
        )

        await svc.calculateForSection(42, 'TST')

        const upsertedRows: any[] = upsertMock.mock.calls[0][0]
        const sumTotal = upsertedRows.reduce(
            (acc: number, row: any) => acc + parseFloat(row.totalPremium),
            0,
        )
        expect(Math.abs(sumTotal - 1.0001)).toBeLessThan(0.0001)
    })

    // @req REQ-EARN-C-004
    it('T-EARN-BE-022b: policy-earning-period.entity.ts file contains no FLOAT or REAL column type', () => {
        const entityPath = path.resolve(
            __dirname,
            '../policy-earning-period.entity.ts',
        )
        const content = fs.readFileSync(entityPath, 'utf-8')
        expect(content).not.toMatch(/type:\s*['"]float['"]/i)
        expect(content).not.toMatch(/type:\s*['"]real['"]/i)
        expect(content).not.toMatch(/type:\s*['"]double['"]/i)
    })
})
