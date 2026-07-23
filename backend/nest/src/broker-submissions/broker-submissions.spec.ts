/**
 * broker-submissions.spec.ts — BrokerSubmissionsService unit tests
 *
 * Domain: PSS-BRK-BE
 * Requirements: backend/nest/src/broker-submissions/broker-submissions.requirements.md
 * Standard: AI Guidelines §06-Testing-Standards.md, §03-Three-Artifact-Rule.md
 *
 * Coverage (Layer 2 — NestJS service unit tests):
 *   REQ-PSS-BRK-BE-F-001  create — returns saved record
 *   REQ-PSS-BRK-BE-F-002  create — rejects if insuredName missing
 *   REQ-PSS-BRK-BE-F-003  create — rejects if inceptionDate missing
 *   REQ-PSS-BRK-BE-F-004  create — rejects if source is not an approved type value
 *   REQ-PSS-BRK-BE-F-005  create — always sets workflowStatus to 'Created'
 *   REQ-PSS-BRK-BE-F-006  create — records orgCode from JWT context, ignores body value
 *   REQ-PSS-BRK-BE-F-007  findOne — returns submission for matching org
 *   REQ-PSS-BRK-BE-F-008  findOne — returns NotFoundException for wrong org (does not reveal existence)
 *   REQ-PSS-BRK-BE-F-009  findAll — returns submissions scoped to caller's org
 *   REQ-PSS-BRK-BE-F-010  findAll — accepts source filter
 *   REQ-PSS-BRK-BE-F-011  findAll — accepts status filter
 *   REQ-PSS-BRK-BE-F-012  findAll — returns empty array (no error) when no matches
 *   REQ-PSS-BRK-BE-F-013  update — updates editable fields for same-org caller
 *   REQ-PSS-BRK-BE-F-014  update — rejects if source is not an approved type value
 *   REQ-PSS-BRK-BE-F-015  update — records updatedAt timestamp
 *   REQ-PSS-BRK-BE-S-001  Access guard: non-broker org receives ForbiddenException
 *   REQ-PSS-BRK-BE-S-002  orgCode is read from JWT context, not from request body
 *   REQ-PSS-BRK-BE-S-003  Tenant isolation: cross-org access returns NotFoundException
 *   REQ-PSS-BRK-BE-S-005  Audit trail: create is recorded
 *   REQ-PSS-BRK-BE-S-006  Audit trail: update is recorded
 *   REQ-PSS-BRK-BE-S-007  Platform admin can call list and get-single (read-only oversight, no tenant filter)
 *   REQ-PSS-BRK-BE-S-008  Platform admin cannot create or update (ForbiddenException)
 *   REQ-PSS-BRK-BE-C-002  Source values validated against lookup table, not hardcoded list
 *
 * Note: REQ-PSS-BRK-BE-C-001 (no cross-domain code dependency) is enforced by the
 * architectural scan test in frontend/src/__tests__/codebase-scan.test.js.
 * REQ-PSS-BRK-BE-S-004 (unauthenticated requests return 401) is enforced by the global
 * auth guard tested in auth.spec.ts.
 *
 * Tests written BEFORE implementation per Three-Artifact Rule.
 * All tests will fail until the service is created.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm'
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { BrokerSubmissionsService } from './broker-submissions.service'
import { BrokerSubmission } from '../entities/broker-submission.entity'
import { Organisation } from '../entities/organisation.entity'
import { LookupBrokerSubmissionSource } from '../entities/lookup-broker-submission-source.entity'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeOrg(overrides: Partial<Organisation> = {}): Organisation {
    const o = new Organisation()
    o.id = 1
    o.orgCode = 'BROKER1'
    o.orgType = 'broker'
    Object.assign(o, overrides)
    return o
}

function makeInsurerOrg(): Organisation {
    return makeOrg({ orgCode: 'INS1', orgType: 'insurer' })
}

function makeSource(code: 'manual' | 'platform_shared'): LookupBrokerSubmissionSource {
    const s = new LookupBrokerSubmissionSource()
    s.id = code === 'manual' ? 1 : 2
    s.code = code
    s.name = code === 'manual' ? 'Manual' : 'Platform Shared'
    s.isActive = true
    return s
}

function makeSub(overrides: Partial<BrokerSubmission> = {}): BrokerSubmission {
    const s = new BrokerSubmission()
    s.id = 1
    s.orgCode = 'BROKER1'
    s.insuredName = 'Acme Ltd'
    s.inceptionDate = '2026-06-01'
    s.workflowStatus = 'Created'
    s.createdBy = 99
    s.createdAt = new Date('2026-05-15T10:00:00Z')
    s.updatedAt = new Date('2026-05-15T10:00:00Z')
    Object.assign(s, overrides)
    return s
}

const BROKER_CONTEXT = { orgCode: 'BROKER1', orgType: 'broker', userId: 99 }
const INSURER_CONTEXT = { orgCode: 'INS1', orgType: 'insurer', userId: 10 }
const ADMIN_CONTEXT = { orgCode: 'DEMO', userId: 1, role: 'internal_admin' }

// ---------------------------------------------------------------------------
// Suite setup
// ---------------------------------------------------------------------------

describe('BrokerSubmissionsService', () => {
    let service: BrokerSubmissionsService
    let mockSubRepo: Record<string, jest.Mock>
    let mockOrgRepo: Record<string, jest.Mock>
    let mockSourceRepo: Record<string, jest.Mock>
    let mockDataSource: Record<string, jest.Mock>

    beforeEach(async () => {
        mockSubRepo = {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
        }

        mockOrgRepo = {
            findOne: jest.fn(),
        }

        mockSourceRepo = {
            findOne: jest.fn(),
        }

        mockDataSource = {
            query: jest.fn(),
        }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BrokerSubmissionsService,
                { provide: getRepositoryToken(BrokerSubmission), useValue: mockSubRepo },
                { provide: getRepositoryToken(Organisation), useValue: mockOrgRepo },
                { provide: getRepositoryToken(LookupBrokerSubmissionSource), useValue: mockSourceRepo },
                { provide: getDataSourceToken(), useValue: mockDataSource },
            ],
        }).compile()

        service = module.get<BrokerSubmissionsService>(BrokerSubmissionsService)
    })

    afterEach(() => jest.clearAllMocks())

    // -----------------------------------------------------------------------
    // REQ-PSS-BRK-BE-S-001 — Non-broker org receives ForbiddenException
    // -----------------------------------------------------------------------

    describe('REQ-PSS-BRK-BE-S-001 — Org type access guard', () => {
        it('T-PSS-BRK-BE-S001a: create throws ForbiddenException when called by an insurer org', async () => {
            mockOrgRepo.findOne.mockResolvedValue(makeInsurerOrg())
            await expect(
                service.create({ insuredName: 'Test', inceptionDate: '2026-01-01', source: 'manual' }, INSURER_CONTEXT),
            ).rejects.toThrow(ForbiddenException)
        })

        it('T-PSS-BRK-BE-S001b: findAll throws ForbiddenException when called by an insurer org', async () => {
            mockOrgRepo.findOne.mockResolvedValue(makeInsurerOrg())
            await expect(service.findAll({}, INSURER_CONTEXT)).rejects.toThrow(ForbiddenException)
        })

        it('T-PSS-BRK-BE-S001c: findOne throws ForbiddenException when called by an insurer org', async () => {
            mockOrgRepo.findOne.mockResolvedValue(makeInsurerOrg())
            await expect(service.findOne(1, INSURER_CONTEXT)).rejects.toThrow(ForbiddenException)
        })

        it('T-PSS-BRK-BE-S001d: update throws ForbiddenException when called by an insurer org', async () => {
            mockOrgRepo.findOne.mockResolvedValue(makeInsurerOrg())
            await expect(service.update(1, { insuredName: 'New Name' }, INSURER_CONTEXT)).rejects.toThrow(ForbiddenException)
        })
    })

    // -----------------------------------------------------------------------
    // REQ-PSS-BRK-BE-S-002 — orgCode from JWT context, not request body
    // -----------------------------------------------------------------------

    describe('REQ-PSS-BRK-BE-S-002 — orgCode source', () => {
        it('T-PSS-BRK-BE-S002: create uses orgCode from the caller context, not from any value in the input', async () => {
            mockOrgRepo.findOne.mockResolvedValue(makeOrg())
            mockSourceRepo.findOne.mockResolvedValue(makeSource('manual'))
            const saved = makeSub({ orgCode: 'BROKER1' })
            mockSubRepo.create.mockReturnValue(saved)
            mockSubRepo.save.mockResolvedValue(saved)
            mockDataSource.query.mockResolvedValue([])

            // Input contains a different orgCode — it must be ignored
            await service.create(
                { insuredName: 'Test Co', inceptionDate: '2026-01-01', source: 'manual', orgCode: 'ATTACKER' } as never,
                BROKER_CONTEXT,
            )

            const createCall = mockSubRepo.create.mock.calls[0][0] as Record<string, unknown>
            expect(createCall.orgCode).toBe('BROKER1')
            expect(createCall.orgCode).not.toBe('ATTACKER')
        })
    })

    // -----------------------------------------------------------------------
    // REQ-PSS-BRK-BE-F-001 — create returns the saved record
    // REQ-PSS-BRK-BE-F-005 — create always sets status to "Created"
    // REQ-PSS-BRK-BE-F-006 — create records orgCode from context
    // -----------------------------------------------------------------------

    describe('REQ-PSS-BRK-BE-F-001/005/006 — create', () => {
        beforeEach(() => {
            mockOrgRepo.findOne.mockResolvedValue(makeOrg())
            mockSourceRepo.findOne.mockResolvedValue(makeSource('manual'))
            mockDataSource.query.mockResolvedValue([])
        })

        it('T-PSS-BRK-BE-F001: create returns the persisted submission record', async () => {
            const saved = makeSub({ id: 5 })
            mockSubRepo.create.mockReturnValue(saved)
            mockSubRepo.save.mockResolvedValue(saved)
            const result = await service.create(
                { insuredName: 'Acme Ltd', inceptionDate: '2026-06-01', source: 'manual' },
                BROKER_CONTEXT,
            )
            expect(result.id).toBe(5)
        })

        it('T-PSS-BRK-BE-F005: create always sets workflowStatus to "Created" regardless of any value in input', async () => {
            const saved = makeSub({ workflowStatus: 'Created' })
            mockSubRepo.create.mockReturnValue(saved)
            mockSubRepo.save.mockResolvedValue(saved)
            await service.create(
                { insuredName: 'Test', inceptionDate: '2026-01-01', source: 'manual', workflowStatus: 'In Review' } as never,
                BROKER_CONTEXT,
            )
            const createCall = mockSubRepo.create.mock.calls[0][0] as Record<string, unknown>
            expect(createCall.workflowStatus).toBe('Created')
        })

        it('T-PSS-BRK-BE-F006: create records the orgCode from the caller JWT context', async () => {
            const saved = makeSub()
            mockSubRepo.create.mockReturnValue(saved)
            mockSubRepo.save.mockResolvedValue(saved)
            await service.create({ insuredName: 'Test', inceptionDate: '2026-01-01', source: 'manual' }, BROKER_CONTEXT)
            const createCall = mockSubRepo.create.mock.calls[0][0] as Record<string, unknown>
            expect(createCall.orgCode).toBe('BROKER1')
        })
    })

    // -----------------------------------------------------------------------
    // REQ-PSS-BRK-BE-F-002 — create rejects if insuredName missing
    // REQ-PSS-BRK-BE-F-003 — create rejects if inceptionDate missing
    // REQ-PSS-BRK-BE-F-004 — create rejects if source is unlisted
    // REQ-PSS-BRK-BE-C-002 — source validated against lookup table
    // -----------------------------------------------------------------------

    describe('REQ-PSS-BRK-BE-F-002/003/004 — create validation', () => {
        beforeEach(() => {
            mockOrgRepo.findOne.mockResolvedValue(makeOrg())
        })

        it('T-PSS-BRK-BE-F002: create throws BadRequestException when insuredName is absent', async () => {
            await expect(
                service.create({ inceptionDate: '2026-01-01', source: 'manual' } as never, BROKER_CONTEXT),
            ).rejects.toThrow(BadRequestException)
        })

        it('T-PSS-BRK-BE-F003: create throws BadRequestException when inceptionDate is absent', async () => {
            await expect(
                service.create({ insuredName: 'Test Co', source: 'manual' } as never, BROKER_CONTEXT),
            ).rejects.toThrow(BadRequestException)
        })

        it('T-PSS-BRK-BE-F004: create throws BadRequestException when source is not a known lookup value', async () => {
            // Lookup table returns null — the value is not in the approved list
            mockSourceRepo.findOne.mockResolvedValue(null)
            await expect(
                service.create({ insuredName: 'Test', inceptionDate: '2026-01-01', source: 'email' as never }, BROKER_CONTEXT),
            ).rejects.toThrow(BadRequestException)
        })

        it('T-PSS-BRK-BE-C002: source validation queries the lookup_broker_submission_sources table, not a hardcoded list', async () => {
            mockSourceRepo.findOne.mockResolvedValue(null)
            try {
                await service.create({ insuredName: 'T', inceptionDate: '2026-01-01', source: 'manual' }, BROKER_CONTEXT)
            } catch {
                // Validation throws — what matters is that the lookup repo was queried
            }
            expect(mockSourceRepo.findOne).toHaveBeenCalled()
        })
    })

    // -----------------------------------------------------------------------
    // REQ-PSS-BRK-BE-F-007 — findOne returns submission for matching org
    // REQ-PSS-BRK-BE-F-008 / S-003 — wrong org or not-found returns NotFoundException
    // -----------------------------------------------------------------------

    describe('REQ-PSS-BRK-BE-F-007/008 / S-003 — findOne', () => {
        beforeEach(() => {
            mockOrgRepo.findOne.mockResolvedValue(makeOrg())
        })

        it('T-PSS-BRK-BE-F007: findOne returns the submission when it belongs to the caller\'s org', async () => {
            mockSubRepo.findOne.mockResolvedValue(makeSub({ id: 3, orgCode: 'BROKER1' }))
            const result = await service.findOne(3, BROKER_CONTEXT)
            expect(result.id).toBe(3)
        })

        it('T-PSS-BRK-BE-F008: findOne throws NotFoundException when the submission does not exist', async () => {
            mockSubRepo.findOne.mockResolvedValue(null)
            await expect(service.findOne(999, BROKER_CONTEXT)).rejects.toThrow(NotFoundException)
        })

        it('T-PSS-BRK-BE-S003: findOne throws NotFoundException (not ForbiddenException) when the submission belongs to a different org, so the caller cannot infer the submission exists', async () => {
            // The repo returns null because the query includes the orgCode filter
            mockSubRepo.findOne.mockResolvedValue(null)
            const otherContext = { orgCode: 'OTHER_BROKER', orgType: 'broker', userId: 5 }
            mockOrgRepo.findOne.mockResolvedValue(makeOrg({ orgCode: 'OTHER_BROKER' }))
            await expect(service.findOne(1, otherContext)).rejects.toThrow(NotFoundException)
        })
    })

    // -----------------------------------------------------------------------
    // REQ-PSS-BRK-BE-F-009 / 010 / 011 / 012 — findAll
    // -----------------------------------------------------------------------

    describe('REQ-PSS-BRK-BE-F-009/010/011/012 — findAll', () => {
        beforeEach(() => {
            mockOrgRepo.findOne.mockResolvedValue(makeOrg())
        })

        it('T-PSS-BRK-BE-F009: findAll returns only submissions belonging to the caller\'s org', async () => {
            const subs = [makeSub({ id: 1, orgCode: 'BROKER1' }), makeSub({ id: 2, orgCode: 'BROKER1' })]
            mockSubRepo.find.mockResolvedValue(subs)
            const result = await service.findAll({}, BROKER_CONTEXT)
            expect(result).toHaveLength(2)
            // Verify orgCode filter was passed to the repo
            const findCall = mockSubRepo.find.mock.calls[0][0] as { where?: Record<string, unknown> }
            expect(findCall.where).toMatchObject({ orgCode: 'BROKER1' })
        })

        it('T-PSS-BRK-BE-F010: findAll passes source filter to the repository query', async () => {
            mockSubRepo.find.mockResolvedValue([])
            await service.findAll({ source: 'manual' }, BROKER_CONTEXT)
            const findCall = mockSubRepo.find.mock.calls[0][0] as { where?: Record<string, unknown> }
            expect(findCall.where).toMatchObject({ source: 'manual' })
        })

        it('T-PSS-BRK-BE-F011: findAll passes status filter to the repository query', async () => {
            mockSubRepo.find.mockResolvedValue([])
            await service.findAll({ status: 'Created' }, BROKER_CONTEXT)
            const findCall = mockSubRepo.find.mock.calls[0][0] as { where?: Record<string, unknown> }
            expect(findCall.where).toMatchObject({ workflowStatus: 'Created' })
        })

        it('T-PSS-BRK-BE-F012: findAll returns an empty array (not an error) when there are no matching submissions', async () => {
            mockSubRepo.find.mockResolvedValue([])
            const result = await service.findAll({ source: 'platform_shared' }, BROKER_CONTEXT)
            expect(result).toEqual([])
        })
    })

    // -----------------------------------------------------------------------
    // REQ-PSS-BRK-BE-F-013 / 014 / 015 — update
    // -----------------------------------------------------------------------

    describe('REQ-PSS-BRK-BE-F-013/014/015 — update', () => {
        beforeEach(() => {
            mockOrgRepo.findOne.mockResolvedValue(makeOrg())
        })

        it('T-PSS-BRK-BE-F013: update applies the changed fields and returns the updated record', async () => {
            const existing = makeSub({ id: 4, estimatedPremium: 10000 })
            const updated = makeSub({ id: 4, estimatedPremium: 25000 })
            mockSubRepo.findOne.mockResolvedValue(existing)
            mockSubRepo.save.mockResolvedValue(updated)
            mockDataSource.query.mockResolvedValue([])
            const result = await service.update(4, { estimatedPremium: 25000 }, BROKER_CONTEXT)
            expect(result.estimatedPremium).toBe(25000)
        })

        it('T-PSS-BRK-BE-F014: update throws BadRequestException when the new source value is not in the lookup table', async () => {
            mockSubRepo.findOne.mockResolvedValue(makeSub())
            mockSourceRepo.findOne.mockResolvedValue(null)
            await expect(
                service.update(1, { source: 'fax' as never }, BROKER_CONTEXT),
            ).rejects.toThrow(BadRequestException)
        })

        it('T-PSS-BRK-BE-F015: update records a new updatedAt timestamp', async () => {
            const existing = makeSub({ id: 4 })
            const updated = makeSub({ id: 4, updatedAt: new Date('2026-05-16T12:00:00Z') })
            mockSubRepo.findOne.mockResolvedValue(existing)
            mockSubRepo.save.mockResolvedValue(updated)
            mockDataSource.query.mockResolvedValue([])
            const result = await service.update(4, { insuredName: 'New Name' }, BROKER_CONTEXT)
            expect(result.updatedAt).not.toEqual(existing.updatedAt)
        })
    })

    // -----------------------------------------------------------------------
    // REQ-PSS-BRK-BE-S-005/006 — Audit trail
    // -----------------------------------------------------------------------

    describe('REQ-PSS-BRK-BE-S-005/006 — Audit trail', () => {
        beforeEach(() => {
            mockOrgRepo.findOne.mockResolvedValue(makeOrg())
            mockSourceRepo.findOne.mockResolvedValue(makeSource('manual'))
        })

        it('T-PSS-BRK-BE-S005: create writes an audit record after saving the submission', async () => {
            const saved = makeSub()
            mockSubRepo.create.mockReturnValue(saved)
            mockSubRepo.save.mockResolvedValue(saved)
            mockDataSource.query.mockResolvedValue([])
            await service.create({ insuredName: 'Test', inceptionDate: '2026-01-01', source: 'manual' }, BROKER_CONTEXT)
            // The audit trail is written via DataSource.query — it must have been called
            expect(mockDataSource.query).toHaveBeenCalled()
        })

        it('T-PSS-BRK-BE-S006: update writes an audit record after saving the changed submission', async () => {
            const existing = makeSub()
            const updated = makeSub({ insuredName: 'Updated Co' })
            mockSubRepo.findOne.mockResolvedValue(existing)
            mockSubRepo.save.mockResolvedValue(updated)
            mockDataSource.query.mockResolvedValue([])
            await service.update(1, { insuredName: 'Updated Co' }, BROKER_CONTEXT)
            expect(mockDataSource.query).toHaveBeenCalled()
        })
    })

    // -----------------------------------------------------------------------
    // REQ-PSS-BRK-BE-S-007 — Platform admin has read-only access to all orgs
    // REQ-PSS-BRK-BE-S-008 — Platform admin cannot create or modify submissions
    // -----------------------------------------------------------------------

    describe('REQ-PSS-BRK-BE-S-007 — Platform admin read-only oversight', () => {
        it('T-PSS-BRK-BE-S007a: findAll with admin context does not query the organisations table', async () => {
            mockSubRepo.find.mockResolvedValue([])
            await service.findAll({}, ADMIN_CONTEXT)
            expect(mockOrgRepo.findOne).not.toHaveBeenCalled()
        })

        it('T-PSS-BRK-BE-S007b: findAll with admin context does not apply an orgCode filter — returns all submissions', async () => {
            const subs = [
                makeSub({ id: 1, orgCode: 'BROKER1' }),
                makeSub({ id: 2, orgCode: 'BROKER2' }),
            ]
            mockSubRepo.find.mockResolvedValue(subs)
            const result = await service.findAll({}, ADMIN_CONTEXT)
            expect(result).toHaveLength(2)
            const findCall = mockSubRepo.find.mock.calls[0][0] as { where?: Record<string, unknown> }
            expect(findCall.where).not.toHaveProperty('orgCode')
        })

        it('T-PSS-BRK-BE-S007c: findOne with admin context does not query the organisations table', async () => {
            mockSubRepo.findOne.mockResolvedValue(makeSub({ id: 7, orgCode: 'BROKER1' }))
            await service.findOne(7, ADMIN_CONTEXT)
            expect(mockOrgRepo.findOne).not.toHaveBeenCalled()
        })

        it('T-PSS-BRK-BE-S007d: findOne with admin context does not apply an orgCode filter — returns submission from any org', async () => {
            mockSubRepo.findOne.mockResolvedValue(makeSub({ id: 7, orgCode: 'BROKER99' }))
            const result = await service.findOne(7, ADMIN_CONTEXT)
            expect(result.orgCode).toBe('BROKER99')
            const findCall = mockSubRepo.findOne.mock.calls[0][0] as { where?: Record<string, unknown> }
            expect(findCall.where).not.toHaveProperty('orgCode')
        })
    })

    describe('REQ-PSS-BRK-BE-S-008 — Platform admin cannot create or modify submissions', () => {
        it('T-PSS-BRK-BE-S008a: create throws ForbiddenException when called by a platform administrator', async () => {
            await expect(
                service.create({ insuredName: 'Test', inceptionDate: '2026-01-01', source: 'manual' }, ADMIN_CONTEXT),
            ).rejects.toThrow(ForbiddenException)
        })

        it('T-PSS-BRK-BE-S008b: create does NOT query the organisations table when rejecting a platform administrator (no unnecessary DB round-trip)', async () => {
            try {
                await service.create({ insuredName: 'Test', inceptionDate: '2026-01-01', source: 'manual' }, ADMIN_CONTEXT)
            } catch { /* expected */ }
            expect(mockOrgRepo.findOne).not.toHaveBeenCalled()
        })

        it('T-PSS-BRK-BE-S008c: update throws ForbiddenException when called by a platform administrator', async () => {
            await expect(
                service.update(1, { insuredName: 'New Name' }, ADMIN_CONTEXT),
            ).rejects.toThrow(ForbiddenException)
        })
    })
})
