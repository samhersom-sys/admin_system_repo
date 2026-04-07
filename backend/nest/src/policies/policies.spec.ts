/**
 * policies.spec.ts — PoliciesService unit tests
 * Domain: POL-BE-NE
 * Requirements: backend/nest/src/policies/policies.requirements.md
 * Standard: AI Guidelines §06-Testing-Standards.md §6.2
 *
 * Tests are written per §03 Three-Artifact Rule:
 *   requirements.md → this file → implementation changes.
 *
 * Multi-tenancy: every query is scoped by org_code — verified throughout.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { PoliciesService } from './policies.service'
import { Policy } from '../entities/policy.entity'
import { AuditService } from '../audit/audit.service'

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function makePolicy(overrides: Partial<Policy> = {}): Policy {
    const p = new Policy()
    p.id = 1
    p.reference = 'POL-TST-20260101-001'
    p.insured = 'Test Insured Ltd'
    p.insuredId = 'party-1'
    p.quoteId = null
    p.submissionId = null
    p.status = 'Active'
    p.businessType = 'Insurance'
    p.contractType = 'Open Market'
    p.inceptionDate = '2026-01-01'
    p.expiryDate = '2027-01-01'
    p.grossWrittenPremium = null
    p.renewalDate = null
    p.createdBy = 'test-user'
    p.createdByOrgCode = 'TST'
    p.payload = {}
    Object.assign(p, overrides)
    return p
}

function buildQueryBuilderMock(returnValue: any) {
    const qb: any = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(returnValue),
        getMany: jest.fn().mockResolvedValue([]),
    }
    return qb
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('PoliciesService', () => {
    let service: PoliciesService
    let mockPolicyRepo: Record<string, jest.Mock>
    let mockDataSource: Record<string, jest.Mock>
    let mockAuditService: Record<string, jest.Mock>

    beforeEach(async () => {
        mockPolicyRepo = {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
        }

        mockDataSource = {
            query: jest.fn(),
        }

        mockAuditService = {
            writeEvent: jest.fn(),
            getHistory: jest.fn(),
            detectConcurrentUsers: jest.fn(),
        }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PoliciesService,
                { provide: getRepositoryToken(Policy), useValue: mockPolicyRepo },
                { provide: DataSource, useValue: mockDataSource },
                { provide: AuditService, useValue: mockAuditService },
            ],
        }).compile()

        service = module.get<PoliciesService>(PoliciesService)
    })

    afterEach(() => jest.clearAllMocks())

    // -------------------------------------------------------------------------
    // REQ-POL-BE-F-001 — findAll
    // -------------------------------------------------------------------------
    describe('findAll', () => {
        it('T-POL-BE-R01a: returns policies for the caller orgCode ordered by createdDate desc', async () => {
            const policies = [makePolicy({ id: 2 }), makePolicy({ id: 1 })]
            mockPolicyRepo.find.mockResolvedValue(policies)

            const result = await service.findAll('TST')
            expect(result).toEqual(policies)
            expect(mockPolicyRepo.find).toHaveBeenCalledWith({
                where: { createdByOrgCode: 'TST' },
                order: { createdDate: 'DESC' },
            })
        })

        it('T-POL-BE-R01b: returns empty array when org has no policies', async () => {
            mockPolicyRepo.find.mockResolvedValue([])
            const result = await service.findAll('EMPTY')
            expect(result).toEqual([])
        })
    })

    // -------------------------------------------------------------------------
    // REQ-POL-BE-F-002 — findOne
    // -------------------------------------------------------------------------
    describe('findOne', () => {
        it('T-POL-BE-R02a: returns the policy when found and orgCode matches', async () => {
            const policy = makePolicy()
            mockPolicyRepo.findOne.mockResolvedValue(policy)

            const result = await service.findOne(1, 'TST')
            expect(result).toBe(policy)
        })

        it('T-POL-BE-R02b: throws NotFoundException when policy does not exist', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(null)

            await expect(service.findOne(99, 'TST'))
                .rejects.toThrow(NotFoundException)
        })

        it('T-POL-BE-R02c: throws ForbiddenException when orgCode does not match', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(makePolicy({ createdByOrgCode: 'OTHER' }))

            await expect(service.findOne(1, 'TST'))
                .rejects.toThrow(ForbiddenException)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-POL-BE-F-003 — create
    // -------------------------------------------------------------------------
    describe('create', () => {
        it('T-POL-BE-R03a: creates policy with Active status and generated reference', async () => {
            const qb = buildQueryBuilderMock(null)
            qb.getRawOne = jest.fn().mockResolvedValue(null)
            mockPolicyRepo.createQueryBuilder.mockReturnValue(qb)

            const newPolicy = makePolicy()
            mockPolicyRepo.create.mockReturnValue(newPolicy)
            mockPolicyRepo.save.mockResolvedValue(newPolicy)

            const result = await service.create('TST', { insured: 'Test Ltd' }, 'user')
            expect(result.status).toBe('Active')
            expect(mockPolicyRepo.save).toHaveBeenCalledTimes(1)
        })

        it('T-POL-BE-R03b: generates sequential reference with correct prefix format', async () => {
            const qb = buildQueryBuilderMock(null)
            qb.getRawOne = jest.fn().mockResolvedValue({ reference: 'POL-TST-20260101-001' })
            mockPolicyRepo.createQueryBuilder.mockReturnValue(qb)

            const captured: Partial<Policy>[] = []
            mockPolicyRepo.create.mockImplementation((data: Partial<Policy>) => {
                captured.push(data)
                return makePolicy(data as Partial<Policy>)
            })
            mockPolicyRepo.save.mockResolvedValue(makePolicy())

            await service.create('TST', { insured: 'Test Ltd' }, 'user')
            // Second reference in sequence: 002
            expect(captured[0].reference).toMatch(/POL-TST-\d{8}-002/)
        })

        it('T-POL-BE-R03c: maps quote_id and submission_id from body snake_case', async () => {
            const qb = buildQueryBuilderMock(null)
            qb.getRawOne = jest.fn().mockResolvedValue(null)
            mockPolicyRepo.createQueryBuilder.mockReturnValue(qb)

            const captured: Partial<Policy>[] = []
            mockPolicyRepo.create.mockImplementation((data: Partial<Policy>) => {
                captured.push(data)
                return makePolicy(data as Partial<Policy>)
            })
            mockPolicyRepo.save.mockResolvedValue(makePolicy())

            await service.create('TST', { insured: 'Test Ltd', quote_id: 42 }, 'user')
            expect(captured[0].quoteId).toBe(42)
        })

        it('T-POL-BE-R03d: sets createdBy from createdBy parameter', async () => {
            const qb = buildQueryBuilderMock(null)
            qb.getRawOne = jest.fn().mockResolvedValue(null)
            mockPolicyRepo.createQueryBuilder.mockReturnValue(qb)

            const captured: Partial<Policy>[] = []
            mockPolicyRepo.create.mockImplementation((data: Partial<Policy>) => {
                captured.push(data)
                return makePolicy(data as Partial<Policy>)
            })
            mockPolicyRepo.save.mockResolvedValue(makePolicy())

            await service.create('TST', { insured: 'Acme Ltd' }, 'jane')
            expect(captured[0].createdBy).toBe('jane')
        })
    })

    // -------------------------------------------------------------------------
    // REQ-POL-BE-F-004 — update
    // -------------------------------------------------------------------------
    describe('update', () => {
        it('T-POL-BE-R04a: updates allowed fields and calls save', async () => {
            const policy = makePolicy()
            mockPolicyRepo.findOne.mockResolvedValue(policy)
            mockPolicyRepo.save.mockResolvedValue({ ...policy, insured: 'New Name' })

            const result = await service.update(1, 'TST', { insured: 'New Name' } as any, 'user')
            expect(mockPolicyRepo.save).toHaveBeenCalled()
            expect(result.insured).toBe('New Name')
        })

        it('T-POL-BE-R04b: throws NotFoundException when policy does not exist', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(null)

            await expect(service.update(99, 'TST', {}, 'user'))
                .rejects.toThrow(NotFoundException)
        })

        it('T-POL-BE-R04c: throws ForbiddenException when orgCode does not match', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(makePolicy({ createdByOrgCode: 'OTHER' }))

            await expect(service.update(1, 'TST', {}, 'user'))
                .rejects.toThrow(ForbiddenException)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-POL-BE-F-005 — getSections
    // -------------------------------------------------------------------------
    describe('getSections', () => {
        it('T-POL-BE-R05a: returns sections array for a valid policy', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(makePolicy())
            const sections = [{ id: 1, policy_id: 1, reference: 'S01' }]
            mockDataSource.query.mockResolvedValue(sections)

            const result = await service.getSections(1, 'TST')
            expect(result).toEqual(sections)
            expect(mockDataSource.query).toHaveBeenCalledWith(
                expect.stringContaining('policy_sections'),
                [1],
            )
        })

        it('T-POL-BE-R05b: throws NotFoundException when policy not found', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(null)
            await expect(service.getSections(99, 'TST'))
                .rejects.toThrow(NotFoundException)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-POL-BE-F-006 — getSectionDetail
    // -------------------------------------------------------------------------
    describe('getSectionDetail', () => {
        it('T-POL-BE-R06a: returns the section when found', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(makePolicy())
            const section = { id: 1, policy_id: 1 }
            mockDataSource.query.mockResolvedValue([section])

            const result = await service.getSectionDetail(1, 1, 'TST')
            expect(result).toEqual(section)
        })

        it('T-POL-BE-R06b: throws NotFoundException when section does not exist', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(makePolicy())
            mockDataSource.query.mockResolvedValue([])

            await expect(service.getSectionDetail(1, 99, 'TST'))
                .rejects.toThrow(NotFoundException)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-POL-BE-F-007 — getInvoices
    // -------------------------------------------------------------------------
    describe('getInvoices', () => {
        it('T-POL-BE-R07a: returns invoices for a valid policy', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(makePolicy())
            const invoices = [{ id: 1, policy_id: 1, amount: 10000 }]
            mockDataSource.query.mockResolvedValue(invoices)

            const result = await service.getInvoices(1, 'TST')
            expect(result).toEqual(invoices)
            expect(mockDataSource.query).toHaveBeenCalledWith(
                expect.stringContaining('policy_invoices'),
                [1],
            )
        })

        it('T-POL-BE-R07b: throws NotFoundException when policy not found', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(null)
            await expect(service.getInvoices(99, 'TST'))
                .rejects.toThrow(NotFoundException)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-POL-BE-F-008 — getTransactions
    // -------------------------------------------------------------------------
    describe('getTransactions', () => {
        it('T-POL-BE-R08a: returns transactions for a valid policy', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(makePolicy())
            const txns = [{ id: 1, policy_id: 1, transaction_type: 'Premium' }]
            mockDataSource.query.mockResolvedValue(txns)

            const result = await service.getTransactions(1, 'TST')
            expect(result).toEqual(txns)
            expect(mockDataSource.query).toHaveBeenCalledWith(
                expect.stringContaining('policy_transactions'),
                [1],
            )
        })

        it('T-POL-BE-R08b: throws NotFoundException when policy not found', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(null)
            await expect(service.getTransactions(99, 'TST'))
                .rejects.toThrow(NotFoundException)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-POL-BE-F-009 — getAudit
    // -------------------------------------------------------------------------
    describe('getAudit', () => {
        it('T-POL-BE-R09a: delegates to AuditService.getHistory with entity type Policy', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(makePolicy())
            const audit = [{ id: 1, action: 'Policy Opened' }]
            mockAuditService.getHistory.mockResolvedValue(audit)

            const result = await service.getAudit(1, 'TST')
            expect(result).toEqual(audit)
            expect(mockAuditService.getHistory).toHaveBeenCalledWith('Policy', 1)
        })

        it('T-POL-BE-R09b: throws NotFoundException when policy not found', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(null)
            await expect(service.getAudit(99, 'TST'))
                .rejects.toThrow(NotFoundException)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-POL-BE-F-010 — postAudit
    // -------------------------------------------------------------------------
    describe('postAudit', () => {
        it('T-POL-BE-R10a: writes audit event and returns success with audit history', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(makePolicy())
            mockAuditService.writeEvent.mockResolvedValue({ otherUsersOpen: [] })
            mockAuditService.getHistory.mockResolvedValue([{ id: 1, action: 'Policy Opened' }])

            const result = await service.postAudit(
                1,
                'TST',
                { name: 'Jane', orgCode: 'TST' },
                { event_type: 'Policy Opened' },
            ) as any

            expect(result.success).toBe(true)
            expect(mockAuditService.writeEvent).toHaveBeenCalledWith(
                expect.objectContaining({ entityType: 'Policy', entityId: 1, action: 'Policy Opened' }),
                expect.any(Object),
            )
        })

        it('T-POL-BE-R10b: throws BadRequestException when event_type is missing', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(makePolicy())

            await expect(
                service.postAudit(1, 'TST', { name: 'Jane' }, { event_type: '' }),
            ).rejects.toThrow(BadRequestException)
        })

        it('T-POL-BE-R10c: throws NotFoundException when policy not found', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(null)
            await expect(
                service.postAudit(99, 'TST', { name: 'Jane' }, { event_type: 'Policy Opened' }),
            ).rejects.toThrow(NotFoundException)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-POL-BE-F-011 — getEndorsements
    // -------------------------------------------------------------------------
    describe('getEndorsements', () => {
        it('T-POL-BE-R11a: returns endorsements for a valid policy', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(makePolicy())
            const endorsements = [{ id: 1, policy_id: 1, endorsement_type: 'Mid Term Adjustment' }]
            mockDataSource.query.mockResolvedValue(endorsements)

            const result = await service.getEndorsements(1, 'TST')
            expect(result).toEqual(endorsements)
            expect(mockDataSource.query).toHaveBeenCalledWith(
                expect.stringContaining('policy_endorsements'),
                [1],
            )
        })

        it('T-POL-BE-R11b: throws NotFoundException when policy not found', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(null)
            await expect(service.getEndorsements(99, 'TST'))
                .rejects.toThrow(NotFoundException)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-POL-BE-F-012 — createEndorsement
    // -------------------------------------------------------------------------
    describe('createEndorsement', () => {
        it('T-POL-BE-R12a: creates endorsement with Open status and returns it', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(makePolicy())
            const created = { id: 5, policy_id: 1, status: 'Open', endorsement_type: 'Mid Term Adjustment' }
            mockDataSource.query.mockResolvedValue([created])

            const result = await service.createEndorsement(
                1,
                'TST',
                { endorsement_type: 'Mid Term Adjustment', effective_date: '2026-06-01' },
                'user',
            )
            expect(result).toEqual(created)
            expect(mockDataSource.query).toHaveBeenCalledWith(
                expect.stringContaining('policy_endorsements'),
                expect.arrayContaining([1, 'Mid Term Adjustment', '2026-06-01']),
            )
        })

        it('T-POL-BE-R12b: throws BadRequestException when endorsement_type is missing', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(makePolicy())

            await expect(
                service.createEndorsement(1, 'TST', { effective_date: '2026-06-01' } as any, 'user'),
            ).rejects.toThrow(BadRequestException)
        })

        it('T-POL-BE-R12c: throws BadRequestException when effective_date is missing', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(makePolicy())

            await expect(
                service.createEndorsement(1, 'TST', { endorsement_type: 'Mid Term Adjustment' } as any, 'user'),
            ).rejects.toThrow(BadRequestException)
        })

        it('T-POL-BE-R12d: throws NotFoundException when policy not found', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(null)

            await expect(
                service.createEndorsement(99, 'TST', { endorsement_type: 'MTA', effective_date: '2026-06-01' }, 'user'),
            ).rejects.toThrow(NotFoundException)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-POL-BE-F-013 — issueEndorsement
    // -------------------------------------------------------------------------
    describe('issueEndorsement', () => {
        it('T-POL-BE-R13a: issues endorsement and returns updated record', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(makePolicy())
            const issued = { id: 5, policy_id: 1, status: 'Issued' }
            mockDataSource.query.mockResolvedValue([issued])

            const result = await service.issueEndorsement(1, 5, 'TST', 'user')
            expect(result).toEqual(issued)
            expect(mockDataSource.query).toHaveBeenCalledWith(
                expect.stringContaining('Issued'),
                expect.arrayContaining(['user', 5, 1]),
            )
        })

        it('T-POL-BE-R13b: throws NotFoundException when endorsement not found', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(makePolicy())
            mockDataSource.query.mockResolvedValue([])

            await expect(service.issueEndorsement(1, 99, 'TST', 'user'))
                .rejects.toThrow(NotFoundException)
        })

        it('T-POL-BE-R13c: throws NotFoundException when policy not found', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(null)
            await expect(service.issueEndorsement(99, 5, 'TST', 'user'))
                .rejects.toThrow(NotFoundException)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-POL-BE-F-014 — getCoverages
    // -------------------------------------------------------------------------
    describe('getCoverages', () => {
        it('T-POL-BE-R14a: returns coverages for a valid policy + section', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(makePolicy())
            const coverages = [{ id: 1, policy_id: 1, section_id: 2, coverage: 'All Risks' }]
            mockDataSource.query.mockResolvedValue(coverages)

            const result = await service.getCoverages(1, 2, 'TST')
            expect(result).toEqual(coverages)
            expect(mockDataSource.query).toHaveBeenCalledWith(
                expect.stringContaining('policy_section_coverages'),
                [1, 2],
            )
        })

        it('T-POL-BE-R14b: throws NotFoundException when policy not found', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(null)
            await expect(service.getCoverages(99, 1, 'TST'))
                .rejects.toThrow(NotFoundException)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-POL-BE-F-015 — getLocations
    // -------------------------------------------------------------------------
    describe('getLocations', () => {
        it('T-POL-BE-R15a: returns location rows for a valid policy', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(makePolicy())
            const locations = [{ CoverageType: 'Building', SumInsured: 500000 }]
            mockDataSource.query.mockResolvedValue(locations)

            const result = await service.getLocations(1, 'TST')
            expect(result).toEqual(locations)
            expect(mockDataSource.query).toHaveBeenCalledWith(
                expect.stringContaining('policy_location_rows'),
                [1],
            )
        })

        it('T-POL-BE-R15b: throws NotFoundException when policy not found', async () => {
            mockPolicyRepo.findOne.mockResolvedValue(null)
            await expect(service.getLocations(99, 'TST'))
                .rejects.toThrow(NotFoundException)
        })
    })
})
