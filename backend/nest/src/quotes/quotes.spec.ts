/**
 * quotes.spec.ts — QuotesService unit tests
 * Domain: QUO-BE-NE
 * Requirements: backend/nest/src/quotes/quotes.requirements.md
 * Standard: AI Guidelines §06-Testing-Standards.md §6.2
 *
 * Tests are written per §03 Three-Artifact Rule:
 *   requirements.md → this file → implementation changes.
 *
 * Tests for `copy` (REQ-QUO-BE-NE-F-010) are written ahead of implementation
 * and will FAIL until quotes.service.ts adds the `copy` method (step 9).
 *
 * Tests for sections (R11–R13) mock @InjectRepository(QuoteSection) (sectionRepo).
 */

import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { QuotesService } from './quotes.service'
import { Quote } from '../entities/quote.entity'
import { QuoteSection } from '../entities/quote-section.entity'
import { AuditService } from '../audit/audit.service'

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function makeQuote(overrides: Partial<Quote> = {}): Quote {
    const q = new Quote()
    q.id = 1
    q.reference = 'QUO-TST-20260325-001'
    q.insured = 'Test Insured Ltd'
    q.insuredId = null
    q.submissionId = null
    q.status = 'Draft'
    q.businessType = 'Insurance'
    q.inceptionDate = '2026-01-01'
    q.expiryDate = '2027-01-01'
    q.inceptionTime = '00:00:00'
    q.expiryTime = '23:59:59'
    q.quoteCurrency = 'USD'
    q.createdByOrgCode = 'TST'
    q.createdBy = 'test-user'
    q.payload = {}
    q.deletedAt = null
    q.lastOpenedDate = null
    Object.assign(q, overrides)
    return q
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

describe('QuotesService', () => {
    let service: QuotesService
    let mockQuoteRepo: Record<string, jest.Mock>
    let mockSectionRepo: Record<string, jest.Mock>
    let mockDataSource: Record<string, jest.Mock>
    let mockAuditService: Record<string, jest.Mock>

    beforeEach(async () => {
        mockQuoteRepo = {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
        }

        mockSectionRepo = {
            find: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
        }

        mockDataSource = {
            query: jest.fn(),
        }

        // AuditService mock — replaces direct DataSource.query audit calls
        // once Stage 3 injects AuditService into QuotesService.
        mockAuditService = {
            writeEvent: jest.fn(),
            getHistory: jest.fn(),
            detectConcurrentUsers: jest.fn(),
        }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                QuotesService,
                { provide: getRepositoryToken(Quote), useValue: mockQuoteRepo },
                { provide: getRepositoryToken(QuoteSection), useValue: mockSectionRepo },
                { provide: DataSource, useValue: mockDataSource },
                { provide: AuditService, useValue: mockAuditService },
            ],
        }).compile()

        service = module.get<QuotesService>(QuotesService)
    })

    afterEach(() => jest.clearAllMocks())

    // -------------------------------------------------------------------------
    // REQ-QUO-BE-NE-F-001 — findAll
    // -------------------------------------------------------------------------
    describe('findAll', () => {
        it('T-QUO-BE-NE-R01: returns quotes for the caller orgCode ordered by createdDate desc', async () => {
            const quotes = [makeQuote({ id: 2 }), makeQuote({ id: 1 })]
            const qb = buildQueryBuilderMock(null)
            qb.getMany = jest.fn().mockResolvedValue(quotes)
            mockQuoteRepo.createQueryBuilder.mockReturnValue(qb)

            const result = await service.findAll('TST')
            expect(result).toEqual(quotes)
            expect(qb.where).toHaveBeenCalledWith('q.createdByOrgCode = :orgCode', { orgCode: 'TST' })
            expect(qb.orderBy).toHaveBeenCalledWith('q.createdDate', 'DESC')
        })

        it('T-QUO-BE-NE-R01-date-a: applies dateFrom >= filter on correct column for inception basis', async () => {
            const qb = buildQueryBuilderMock(null)
            qb.getMany = jest.fn().mockResolvedValue([])
            mockQuoteRepo.createQueryBuilder.mockReturnValue(qb)

            await service.findAll('TST', undefined, undefined, 'inception', '2026-01-01', undefined)

            expect(qb.andWhere).toHaveBeenCalledWith(
                expect.stringContaining('q.inceptionDate'),
                expect.objectContaining({ dateFrom: '2026-01-01' }),
            )
        })

        it('T-QUO-BE-NE-R01-date-b: applies dateTo <= filter on expiry column for expiry basis', async () => {
            const qb = buildQueryBuilderMock(null)
            qb.getMany = jest.fn().mockResolvedValue([])
            mockQuoteRepo.createQueryBuilder.mockReturnValue(qb)

            await service.findAll('TST', undefined, undefined, 'expiry', undefined, '2026-12-31')

            expect(qb.andWhere).toHaveBeenCalledWith(
                expect.stringContaining('q.expiryDate'),
                expect.objectContaining({ dateTo: '2026-12-31' }),
            )
        })

        it('T-QUO-BE-NE-R01-date-c: filters on createdDate column for created basis', async () => {
            const qb = buildQueryBuilderMock(null)
            qb.getMany = jest.fn().mockResolvedValue([])
            mockQuoteRepo.createQueryBuilder.mockReturnValue(qb)

            await service.findAll('TST', undefined, undefined, 'created', '2026-03-01', '2026-03-31')

            const allCalls = qb.andWhere.mock.calls.map((c: unknown[]) => c[0])
            expect(allCalls.some((c: unknown) => typeof c === 'string' && c.includes('q.createdDate'))).toBe(true)
        })

        it('T-QUO-BE-NE-R01-date-d: unknown dateBasis falls back to createdDate column', async () => {
            const qb = buildQueryBuilderMock(null)
            qb.getMany = jest.fn().mockResolvedValue([])
            mockQuoteRepo.createQueryBuilder.mockReturnValue(qb)

            await service.findAll('TST', undefined, undefined, 'unknownBasis', '2026-01-01', undefined)

            const allCalls = qb.andWhere.mock.calls.map((c: unknown[]) => c[0])
            expect(allCalls.some((c: unknown) => typeof c === 'string' && c.includes('q.createdDate'))).toBe(true)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-QUO-BE-NE-F-002 — create
    // -------------------------------------------------------------------------
    describe('create', () => {
        it('T-QUO-BE-NE-R02a: throws BadRequestException when insured is blank', async () => {
            await expect(service.create('TST', { insured: '   ' }, 'TST', 'user'))
                .rejects.toThrow(BadRequestException)
            mockDataSource.query.mockResolvedValue([]) // error_log insert
        })

        it('T-QUO-BE-NE-R02b: creates quote with Draft status and correct defaults', async () => {
            const qb = buildQueryBuilderMock(null) // reference generator; no existing refs
            qb.getRawOne = jest.fn().mockResolvedValue(null)
            mockQuoteRepo.createQueryBuilder.mockReturnValue(qb)

            const newQuote = makeQuote()
            mockQuoteRepo.create.mockReturnValue(newQuote)
            mockQuoteRepo.save.mockResolvedValue(newQuote)
            mockDataSource.query.mockResolvedValue([]) // error_log (not called on success)

            const result = await service.create('TST', { insured: 'Test Ltd' }, 'TST', 'user')
            expect(result.status).toBe('Draft')
            expect(result.inceptionTime).toBe('00:00:00')
            expect(result.expiryTime).toBe('23:59:59')
            expect(result.quoteCurrency).toBe('USD')
            expect(mockQuoteRepo.save).toHaveBeenCalledTimes(1)
        })

        it('T-QUO-BE-NE-R02c: auto-computes expiry_date as inception + 365 days when not supplied', async () => {
            const qb = buildQueryBuilderMock(null)
            qb.getRawOne = jest.fn().mockResolvedValue(null)
            mockQuoteRepo.createQueryBuilder.mockReturnValue(qb)

            const capturedArg: Partial<Quote>[] = []
            mockQuoteRepo.create.mockImplementation((data: Partial<Quote>) => {
                capturedArg.push(data)
                return makeQuote(data as Partial<Quote>)
            })
            mockQuoteRepo.save.mockResolvedValue(makeQuote())

            await service.create('TST', { insured: 'Test Ltd', inception_date: '2026-01-01' }, 'TST', 'user')

            expect(capturedArg[0].expiryDate).toBe('2027-01-01')
        })
    })

    // -------------------------------------------------------------------------
    // REQ-QUO-BE-NE-F-003 — findOne
    // -------------------------------------------------------------------------
    describe('findOne', () => {
        it('T-QUO-BE-NE-R03a: returns the quote when found and orgCode matches', async () => {
            const quote = makeQuote()
            mockQuoteRepo.findOne.mockResolvedValue(quote)
            mockDataSource.query.mockResolvedValue([])

            const result = await service.findOne(1, 'TST', 'user')
            expect(result).toBe(quote)
        })

        it('T-QUO-BE-NE-R03b: throws NotFoundException when quote does not exist', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(null)
            mockDataSource.query.mockResolvedValue([])

            await expect(service.findOne(99, 'TST', 'user'))
                .rejects.toThrow(NotFoundException)
        })

        it('T-QUO-BE-NE-R03c: returns NotFoundException when no record matches id + orgCode (query-scoped per OQ-QUO-BE-NE-003; ForbiddenException removed)', async () => {
            // Simulates query-scoped lookup: another org's quote is absent from results
            mockQuoteRepo.findOne.mockResolvedValue(null)

            await expect(service.findOne(1, 'TST', 'user'))
                .rejects.toThrow(NotFoundException)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-QUO-BE-NE-F-004 — update
    // -------------------------------------------------------------------------
    describe('update', () => {
        it('T-QUO-BE-NE-R04a: throws NotFoundException when quote does not exist', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(null)
            mockDataSource.query.mockResolvedValue([])

            await expect(service.update(99, 'TST', { insured: 'X' }, 'user'))
                .rejects.toThrow(NotFoundException)
        })

        it('T-QUO-BE-NE-R04b: throws ForbiddenException when orgCode does not match', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote({ createdByOrgCode: 'OTHER' }))
            mockDataSource.query.mockResolvedValue([])

            await expect(service.update(1, 'TST', { insured: 'X' }, 'user'))
                .rejects.toThrow(ForbiddenException)
        })

        it('T-QUO-BE-NE-R04c: throws BadRequestException when quote is Bound or Declined', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote({ status: 'Bound' }))
            mockDataSource.query.mockResolvedValue([])

            await expect(service.update(1, 'TST', { insured: 'X' }, 'user'))
                .rejects.toThrow(BadRequestException)
        })

        it('T-QUO-BE-NE-R04d: applies only enumerated mutable fields and does not overwrite status', async () => {
            const quote = makeQuote({ status: 'Draft' })
            mockQuoteRepo.findOne.mockResolvedValue(quote)
            mockQuoteRepo.save.mockResolvedValue({ ...quote, insured: 'Updated Insured' })

            const result = await service.update(1, 'TST', { insured: 'Updated Insured', status: 'Bound' }, 'user')
            // status must not be mutated by update — only enumerated fields are applied
            expect(mockQuoteRepo.save).toHaveBeenCalledWith(expect.objectContaining({ insured: 'Updated Insured' }))
            // result.status should not have changed to 'Bound' via update
            const savedArg: Quote = mockQuoteRepo.save.mock.calls[0][0]
            expect(savedArg.status).toBe('Draft')
        })

        it('T-QUO-BE-NE-R04e: persists renewal_time when provided in update body (REQ-QUO-BE-NE-F-004, migration 105)', async () => {
            const quote = makeQuote({ status: 'Draft' })
            mockQuoteRepo.findOne.mockResolvedValue(quote)
            mockQuoteRepo.save.mockResolvedValue({ ...quote, renewalTime: '12:00:00' })

            await service.update(1, 'TST', { renewal_time: '12:00:00' }, 'user')
            const savedArg: Quote = mockQuoteRepo.save.mock.calls[0][0]
            expect((savedArg as any).renewalTime).toBe('12:00:00')
        })
    })

    // -------------------------------------------------------------------------
    // REQ-QUO-BE-NE-F-005 — markQuoted
    // -------------------------------------------------------------------------
    describe('markQuoted', () => {
        it('T-QUO-BE-NE-R05a: transitions Draft to Quoted', async () => {
            const quote = makeQuote({ status: 'Draft' })
            mockQuoteRepo.findOne.mockResolvedValue(quote)
            mockQuoteRepo.save.mockResolvedValue({ ...quote, status: 'Quoted' })
            mockDataSource.query.mockResolvedValue([])

            await service.markQuoted(1, 'TST', 'user')
            const savedArg: Quote = mockQuoteRepo.save.mock.calls[0][0]
            expect(savedArg.status).toBe('Quoted')
        })

        it('T-QUO-BE-NE-R05b: throws BadRequestException when current status is not Draft', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote({ status: 'Quoted' }))
            mockDataSource.query.mockResolvedValue([])

            await expect(service.markQuoted(1, 'TST', 'user'))
                .rejects.toThrow(BadRequestException)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-QUO-BE-NE-F-006 — bind
    // -------------------------------------------------------------------------
    describe('bind', () => {
        it('T-QUO-BE-NE-R06a: transitions Quoted to Bound', async () => {
            const quote = makeQuote({ status: 'Quoted' })
            mockQuoteRepo.findOne.mockResolvedValue(quote)
            mockQuoteRepo.save.mockResolvedValue({ ...quote, status: 'Bound' })
            mockDataSource.query.mockResolvedValue([])

            await service.bind(1, 'TST', 'user')
            const savedArg: Quote = mockQuoteRepo.save.mock.calls[0][0]
            expect(savedArg.status).toBe('Bound')
        })

        it('T-QUO-BE-NE-R06b: throws BadRequestException when current status is not Quoted', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote({ status: 'Draft' }))
            mockDataSource.query.mockResolvedValue([])

            await expect(service.bind(1, 'TST', 'user'))
                .rejects.toThrow(BadRequestException)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-QUO-BE-NE-F-007 — decline
    // -------------------------------------------------------------------------
    describe('decline', () => {
        it('T-QUO-BE-NE-R07a: throws BadRequestException when reasonCode is absent', async () => {
            mockDataSource.query.mockResolvedValue([])

            await expect(service.decline(1, 'TST', {}, 'user'))
                .rejects.toThrow(BadRequestException)
        })

        it('T-QUO-BE-NE-R07b: throws BadRequestException when quote status is Bound', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote({ status: 'Bound' }))
            mockDataSource.query.mockResolvedValue([])

            await expect(service.decline(1, 'TST', { reasonCode: 'PRICE' }, 'user'))
                .rejects.toThrow(BadRequestException)
        })

        it('T-QUO-BE-NE-R07c: sets status to Declined and merges reason into payload using JavaScript — no raw SQL JSONB merge (per OQ-QUO-BE-NE-005)', async () => {
            // Stage 3 replaces raw SQL UPDATE with: findOne → merge in JS → repository.save()
            // This test will FAIL until that refactoring is complete.
            const quote = makeQuote({ status: 'Draft', payload: { existingField: 'keep' } })
            mockQuoteRepo.findOne.mockResolvedValue(quote)
            mockQuoteRepo.save.mockResolvedValue({ ...quote, status: 'Declined' })
            mockDataSource.query.mockResolvedValue([]) // logError only

            await service.decline(1, 'TST', { reasonCode: 'PRICE', reasonText: 'Too expensive' }, 'user')

            const savedArg: Quote = mockQuoteRepo.save.mock.calls[0][0]
            expect(savedArg.status).toBe('Declined')
            expect((savedArg.payload as any).declineReasonCode).toBe('PRICE')
            expect((savedArg.payload as any).declineReasonText).toBe('Too expensive')
            expect((savedArg.payload as any).existingField).toBe('keep') // existing payload preserved
        })
    })

    // -------------------------------------------------------------------------
    // REQ-QUO-BE-NE-F-008 — getAudit (delegates to AuditService per OQ-QUO-BE-NE-006)
    // Tests will FAIL until Stage 3 injects AuditService and calls auditService.getHistory()
    // -------------------------------------------------------------------------
    describe('getAudit', () => {
        it('T-QUO-BE-NE-R08a: delegates to auditService.getHistory and returns mapped audit events', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            const auditEvents = [{ action: 'Quote Opened', user: 'user', userId: 1, date: '2026-01-01', details: null, changes: null }]
            mockAuditService.getHistory.mockResolvedValue(auditEvents)
            mockDataSource.query.mockResolvedValue([])

            const result = await service.getAudit(1, 'TST', 'user')
            expect(result).toHaveLength(1)
            expect(result[0]).toMatchObject({ action: 'Quote Opened', user: 'user' })
            expect(mockAuditService.getHistory).toHaveBeenCalledWith('Quote', 1)
        })

        it('T-QUO-BE-NE-R08b: throws NotFoundException when quote does not exist', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(null)

            await expect(service.getAudit(99, 'TST', 'user'))
                .rejects.toThrow(NotFoundException)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-QUO-BE-NE-F-009 and F-014 — postAudit (delegates to AuditService)
    // Tests will FAIL until Stage 3 injects AuditService and refactors postAudit
    // to call auditService.writeEvent() and auditService.getHistory().
    // -------------------------------------------------------------------------
    describe('postAudit', () => {
        it('T-QUO-BE-NE-R09a: delegates to AuditService and returns the created audit event', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            const writeResult = { id: 1, action: 'Quote Updated', entityType: 'Quote', entityId: 1, createdAt: '2026-01-01T00:00:00Z' }
            mockAuditService.writeEvent.mockResolvedValue(writeResult)

            const result = await service.postAudit(1, 'TST', { id: 42, username: 'user' }, { action: 'Quote Updated', details: {} })
            expect(result.id).toBe(1)
            expect(result.action).toBe('Quote Updated')
            expect(result.entity_type).toBe('Quote')
            expect(result.entity_id).toBe(1)
            expect(result.otherUsersOpen).toEqual([])
            expect(mockAuditService.writeEvent).toHaveBeenCalledWith(
                expect.objectContaining({ entityType: 'Quote', entityId: 1, action: 'Quote Updated' }),
                expect.objectContaining({ id: 42, username: 'user' }),
            )
        })

        it('T-QUO-BE-NE-R09b: throws BadRequestException when action is absent', async () => {
            await expect(service.postAudit(1, 'TST', { id: 42, username: 'user' }, { details: {} }))
                .rejects.toThrow(BadRequestException)
        })

        // REQ-QUO-BE-NE-F-014 — concurrent-user detection in postAudit response
        it('T-QUO-BE-NE-R14a: passes otherUsersOpen through from AuditService when action contains "Opened"', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            mockAuditService.writeEvent.mockResolvedValue({ id: 2, action: 'Quote Opened', entityType: 'Quote', entityId: 1, createdAt: '2026-01-01T00:00:00Z', otherUsersOpen: ['Alice', 'Bob'] })

            const result = await service.postAudit(1, 'TST', { id: 42, username: 'user' }, { action: 'Quote Opened' })
            expect(result.entity_type).toBe('Quote')
            expect(result.otherUsersOpen).toEqual(['Alice', 'Bob'])
        })
    })

    // -------------------------------------------------------------------------
    // REQ-QUO-BE-NE-F-010 — copy  (NOT YET IMPLEMENTED)
    // These tests will FAIL until quotes.service.ts adds the copy() method.
    // Written ahead of implementation per §03 Three-Artifact Rule.
    // -------------------------------------------------------------------------
    describe('copy', () => {
        it('T-QUO-BE-NE-R10a: creates a Draft copy with a new reference and duplicated header fields (copy available from any source status)', async () => {
            // Source is Quoted. Copy from Declined (without declinature reason) is verified in R10d.
            const original = makeQuote({
                status: 'Quoted',
                businessType: 'Reinsurance',
                inceptionDate: '2026-06-01',
                expiryDate: '2027-06-01',
            })
            mockQuoteRepo.findOne.mockResolvedValue(original)

            const qb = buildQueryBuilderMock(null)
            qb.getRawOne = jest.fn().mockResolvedValue(null)
            mockQuoteRepo.createQueryBuilder.mockReturnValue(qb)

            const copied = makeQuote({ id: 2, reference: 'QUO-TST-20260325-002', status: 'Draft' })
            mockQuoteRepo.create.mockReturnValue(copied)
            mockQuoteRepo.save.mockResolvedValue(copied)
            mockDataSource.query.mockResolvedValue([])

            // cast to any because copy() does not exist yet on QuotesService
            const result = await (service as any).copy(1, 'TST', 'user')
            expect(result.status).toBe('Draft')
            expect(result.id).toBe(2)
            expect(mockQuoteRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ businessType: 'Reinsurance' })
            )
        })

        it('T-QUO-BE-NE-R10b: throws NotFoundException when source quote does not exist', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(null)
            mockDataSource.query.mockResolvedValue([])

            await expect((service as any).copy(99, 'TST', 'user'))
                .rejects.toThrow(NotFoundException)
        })

        it('T-QUO-BE-NE-R10c: throws NotFoundException when no record found for id + orgCode (query-scoped; per OQ-QUO-BE-NE-003 pattern)', async () => {
            // Another org's record is not returned by the query-scoped lookup
            mockQuoteRepo.findOne.mockResolvedValue(null)
            mockDataSource.query.mockResolvedValue([])

            await expect((service as any).copy(1, 'TST', 'user'))
                .rejects.toThrow(NotFoundException)
        })

        // REQ-QUO-BE-NE-F-010 — copy from Declined must not carry declinature reason (OQ-QUO-BE-NE-007)
        it('T-QUO-BE-NE-R10d: copy from a Declined quote creates a Draft quote without declinature reason in payload', async () => {
            const original = makeQuote({
                status: 'Declined',
                payload: { declineReasonCode: 'PRICE', declineReasonText: 'Too expensive', placingBrokerId: 42 },
            })
            mockQuoteRepo.findOne.mockResolvedValue(original)

            const qb = buildQueryBuilderMock(null)
            qb.getRawOne = jest.fn().mockResolvedValue(null)
            mockQuoteRepo.createQueryBuilder.mockReturnValue(qb)

            const capturedCreate: any[] = []
            mockQuoteRepo.create.mockImplementation((data: any) => {
                capturedCreate.push(data)
                return makeQuote({ ...data, id: 2, status: 'Draft' })
            })
            mockQuoteRepo.save.mockResolvedValue(makeQuote({ id: 2, status: 'Draft' }))
            mockDataSource.query.mockResolvedValue([])

            await (service as any).copy(1, 'TST', 'user')

            expect(capturedCreate[0].status).toBe('Draft')
            expect(capturedCreate[0].payload?.declineReasonCode).toBeUndefined()
            expect(capturedCreate[0].payload?.declineReasonText).toBeUndefined()
        })
    })

    // -------------------------------------------------------------------------
    // REQ-QUO-BE-NE-F-011 — listSections
    // -------------------------------------------------------------------------
    describe('listSections', () => {
        it('T-QUO-BE-NE-R11a: returns sections for the quote ordered by id ascending', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            const sections = [{ id: 1, reference: 'QUO-TST-20260325-001-S01' }]
            mockSectionRepo.find.mockResolvedValue(sections)

            const result = await service.listSections(1, 'TST', 'user')
            expect(result).toEqual(sections)
            expect(mockSectionRepo.find).toHaveBeenCalledWith(
                expect.objectContaining({ where: expect.objectContaining({ quoteId: 1 }) }),
            )
        })

        it('T-QUO-BE-NE-R11b: throws NotFoundException when parent quote does not exist', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(null)

            await expect(service.listSections(99, 'TST', 'user'))
                .rejects.toThrow(NotFoundException)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-QUO-BE-NE-F-012 — createSection
    // -------------------------------------------------------------------------
    describe('createSection', () => {
        it('T-QUO-BE-NE-R12a: creates a section with auto-generated reference', async () => {
            const quote = makeQuote({ status: 'Draft', reference: 'QUO-TST-20260325-001' })
            mockQuoteRepo.findOne.mockResolvedValue(quote)
            mockSectionRepo.count.mockResolvedValue(0)
            const newSection = { id: 1, reference: 'QUO-TST-20260325-001-S01', quoteId: 1 }
            mockSectionRepo.create.mockReturnValue(newSection)
            mockSectionRepo.save.mockResolvedValue(newSection)

            const result = await service.createSection(1, 'TST', 'user', {})
            expect(result).toEqual(newSection)
            expect(mockSectionRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ reference: 'QUO-TST-20260325-001-S01', quoteId: 1 }),
            )
        })

        it('T-QUO-BE-NE-R12b: throws BadRequestException when quote status is Bound or Declined', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote({ status: 'Bound' }))

            await expect(service.createSection(1, 'TST', 'user', {}))
                .rejects.toThrow(BadRequestException)
        })

        it('T-QUO-BE-NE-R12c: throws NotFoundException when parent quote does not exist', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(null)

            await expect(service.createSection(99, 'TST', 'user', {}))
                .rejects.toThrow(NotFoundException)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-QUO-BE-NE-F-013 — deleteSection
    // -------------------------------------------------------------------------
    describe('deleteSection', () => {
        it('T-QUO-BE-NE-R13a: soft-deletes the section by setting deleted_at', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            const section = { id: 5, quoteId: 1, deletedAt: null }
            mockSectionRepo.findOne.mockResolvedValue(section)
            mockSectionRepo.save.mockResolvedValue({ ...section, deletedAt: new Date() })

            const result = await service.deleteSection(1, 5, 'TST', 'user')
            expect(result).toEqual({ message: 'Section deleted' })
            expect(mockSectionRepo.save).toHaveBeenCalled()
        })

        it('T-QUO-BE-NE-R13b: throws NotFoundException when section does not exist or is already deleted', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            mockSectionRepo.findOne.mockResolvedValue(null)

            await expect(service.deleteSection(1, 999, 'TST', 'user'))
                .rejects.toThrow(NotFoundException)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-QUO-BE-NE-F-013 — updateSection
    // -------------------------------------------------------------------------
    describe('updateSection', () => {
        it('T-QUO-BE-NE-R14a: updates scalar fields on the section', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            const section: any = { id: 1, quoteId: 1, classOfBusiness: 'Property', payload: {}, deletedAt: null }
            mockSectionRepo.findOne.mockResolvedValue(section)
            mockSectionRepo.save.mockImplementation((s: any) => Promise.resolve(s))

            await service.updateSection(1, 1, 'TST', 'user', { class_of_business: 'Marine' })
            expect(section.classOfBusiness).toBe('Marine')
            expect(mockSectionRepo.save).toHaveBeenCalled()
        })

        it('T-QUO-BE-NE-R14b: written_order in body takes precedence over written_order in body.payload', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            const section: any = { id: 1, quoteId: 1, payload: {}, deletedAt: null }
            mockSectionRepo.findOne.mockResolvedValue(section)
            mockSectionRepo.save.mockImplementation((s: any) => Promise.resolve(s))

            await service.updateSection(1, 1, 'TST', 'user', {
                written_order: 75,
                payload: { taxOverrides: [], written_order: 50 },
            })
            // body.written_order = 75 must win over body.payload.written_order = 50
            expect((section.payload as any).written_order).toBe(75)
        })

        it('T-QUO-BE-NE-R14c: preserves existing payload keys when merging new payload', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            const section: any = { id: 1, quoteId: 1, payload: { existingKey: 'value', written_order: 100 }, deletedAt: null }
            mockSectionRepo.findOne.mockResolvedValue(section)
            mockSectionRepo.save.mockImplementation((s: any) => Promise.resolve(s))

            await service.updateSection(1, 1, 'TST', 'user', {
                payload: { taxOverrides: [{ country: 'US' }] },
            })
            expect((section.payload as any).existingKey).toBe('value')
            expect((section.payload as any).taxOverrides).toEqual([{ country: 'US' }])
        })

        it('T-QUO-BE-NE-R14d: throws NotFoundException when section does not exist', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            mockSectionRepo.findOne.mockResolvedValue(null)

            await expect(service.updateSection(1, 999, 'TST', 'user', {}))
                .rejects.toThrow(NotFoundException)
        })

        it('T-QUO-BE-NE-R14e: throws ForbiddenException when caller orgCode does not match quote orgCode', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote({ createdByOrgCode: 'OTHER' }))

            await expect(service.updateSection(1, 1, 'TST', 'user', {}))
                .rejects.toThrow(ForbiddenException)
        })

        it('T-QUO-BE-NE-R14f: persists effective_date and tax_receivable to the section entity', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            const section: any = {
                id: 1, quoteId: 1, payload: {}, deletedAt: null,
                effectiveDate: null, taxReceivable: null,
                inceptionDate: '2026-06-01', expiryDate: '2027-06-01',
            }
            mockSectionRepo.findOne.mockResolvedValue(section)
            mockSectionRepo.save.mockImplementation((s: any) => Promise.resolve(s))

            await service.updateSection(1, 1, 'TST', 'user', {
                effective_date: '2026-07-01',
                tax_receivable: 1250,
            })
            expect(section.effectiveDate).toBe('2026-07-01')
            expect(section.taxReceivable).toBe(1250)
        })

        it('T-QUO-BE-NE-R14g: auto-computes days_on_cover from inceptionDate and expiryDate', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            const section: any = {
                id: 1, quoteId: 1, payload: {}, deletedAt: null,
                inceptionDate: '2026-06-01', expiryDate: '2027-06-01',
                daysOnCover: null,
            }
            mockSectionRepo.findOne.mockResolvedValue(section)
            mockSectionRepo.save.mockImplementation((s: any) => Promise.resolve(s))

            await service.updateSection(1, 1, 'TST', 'user', {})
            // 2026-06-01 to 2027-06-01 inclusive = 366 days (crosses leap-year boundary)
            expect(section.daysOnCover).toBe(
                Math.round(
                    (new Date('2027-06-01').getTime() - new Date('2026-06-01').getTime()) / 86400000
                ) + 1
            )
        })

        it('T-QUO-BE-NE-R14h: sets days_on_cover to null when inceptionDate is absent', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            const section: any = {
                id: 1, quoteId: 1, payload: {}, deletedAt: null,
                inceptionDate: null, expiryDate: '2027-06-01',
                daysOnCover: 365,
            }
            mockSectionRepo.findOne.mockResolvedValue(section)
            mockSectionRepo.save.mockImplementation((s: any) => Promise.resolve(s))

            await service.updateSection(1, 1, 'TST', 'user', {})
            expect(section.daysOnCover).toBeNull()
        })

        it('T-QUO-BE-NE-R14i: persists time_basis, written_order_basis, signed_order_basis to section entity', async () => {
            // REQ-QUO-BE-NE-F-020c: new order/time fields are patched individually
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            const section: any = {
                id: 1, quoteId: 1, payload: {}, deletedAt: null,
                inceptionDate: '2026-01-01', expiryDate: '2026-12-31',
                timeBasis: null, writtenOrderBasis: null, signedOrderBasis: null,
            }
            mockSectionRepo.findOne.mockResolvedValue(section)
            mockSectionRepo.save.mockImplementation((s: any) => Promise.resolve(s))

            await service.updateSection(1, 1, 'TST', 'user', {
                time_basis: 'Local Standard Time',
                written_order_basis: 'Percentage of Order',
                signed_order_basis: 'Percentage of Whole',
            })
            expect(section.timeBasis).toBe('Local Standard Time')
            expect(section.writtenOrderBasis).toBe('Percentage of Order')
            expect(section.signedOrderBasis).toBe('Percentage of Whole')
        })

        it('T-QUO-BE-NE-R14j: persists written_line_total, signed_line_total, annual_gross_premium, annual_net_premium', async () => {
            // REQ-QUO-BE-NE-F-020c: new financial fields are patched individually
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            const section: any = {
                id: 1, quoteId: 1, payload: {}, deletedAt: null,
                inceptionDate: '2026-01-01', expiryDate: '2026-12-31',
                writtenLineTotal: null, signedLineTotal: null,
                annualGrossPremium: null, annualNetPremium: null,
            }
            mockSectionRepo.findOne.mockResolvedValue(section)
            mockSectionRepo.save.mockImplementation((s: any) => Promise.resolve(s))

            await service.updateSection(1, 1, 'TST', 'user', {
                written_line_total: 500000,
                signed_line_total: 450000,
                annual_gross_premium: 50000,
                annual_net_premium: 45000,
            })
            expect(section.writtenLineTotal).toBe(500000)
            expect(section.signedLineTotal).toBe(450000)
            expect(section.annualGrossPremium).toBe(50000)
            expect(section.annualNetPremium).toBe(45000)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-QUO-BE-NE-F-015 — listRiskCodes
    // -------------------------------------------------------------------------
    describe('listRiskCodes', () => {
        it('T-QUO-BE-NE-R15a: returns risk codes for the section from DB', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            const codes = [{ id: 1, code: 'RC01', description: 'Fire' }]
            mockDataSource.query.mockResolvedValue(codes)

            const result = await service.listRiskCodes(1, 10, 'TST')
            expect(result).toEqual(codes)
            expect(mockDataSource.query).toHaveBeenCalledWith(
                expect.stringContaining('quote_section_risk_codes'),
                [10],
            )
        })

        it('T-QUO-BE-NE-R15b: throws NotFoundException when parent quote does not exist', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(null)

            await expect(service.listRiskCodes(99, 10, 'TST'))
                .rejects.toThrow(NotFoundException)
        })

        it('T-QUO-BE-NE-R15c: throws ForbiddenException when orgCode does not match quote', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote({ createdByOrgCode: 'OTHER' }))

            await expect(service.listRiskCodes(1, 10, 'TST'))
                .rejects.toThrow(ForbiddenException)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-QUO-BE-NE-F-016 — addRiskCode
    // -------------------------------------------------------------------------
    describe('addRiskCode', () => {
        it('T-QUO-BE-NE-R16a: inserts and returns new risk code row', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            const newRow = { id: 5, code: 'RC01', description: 'Fire' }
            mockDataSource.query.mockResolvedValue([newRow])

            const result = await service.addRiskCode(1, 10, 'TST', { code: 'RC01', description: 'Fire' })
            expect(result).toEqual(newRow)
        })

        it('T-QUO-BE-NE-R16b: throws BadRequestException when code is missing', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())

            await expect(service.addRiskCode(1, 10, 'TST', { description: 'Fire' }))
                .rejects.toThrow(BadRequestException)
        })

        it('T-QUO-BE-NE-R16c: throws NotFoundException when parent quote does not exist', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(null)

            await expect(service.addRiskCode(99, 10, 'TST', { code: 'RC01' }))
                .rejects.toThrow(NotFoundException)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-QUO-BE-NE-F-017 — deleteRiskCode
    // -------------------------------------------------------------------------
    describe('deleteRiskCode', () => {
        it('T-QUO-BE-NE-R17a: deletes risk code and returns { message }', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            mockDataSource.query.mockResolvedValue([{ id: 1 }])

            const result = await service.deleteRiskCode(1, 10, 'TST', 'RC01')
            expect(result).toEqual({ message: 'Risk code deleted' })
        })

        it('T-QUO-BE-NE-R17b: throws NotFoundException when risk code does not exist', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            mockDataSource.query.mockResolvedValue([])

            await expect(service.deleteRiskCode(1, 10, 'TST', 'MISSING'))
                .rejects.toThrow(NotFoundException)
        })

        it('T-QUO-BE-NE-R17c: throws NotFoundException when parent quote does not exist', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(null)

            await expect(service.deleteRiskCode(99, 10, 'TST', 'RC01'))
                .rejects.toThrow(NotFoundException)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-QUO-BE-F-037 — issuePolicy
    // -------------------------------------------------------------------------
    describe('issuePolicy', () => {
        it('T-QUO-BE-NE-R37a: throws NotFoundException when quote does not exist', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(null)

            await expect(service.issuePolicy(99, 'TST', 'user'))
                .rejects.toThrow(NotFoundException)
        })

        it('T-QUO-BE-NE-R37b: throws ForbiddenException when orgCode does not match', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote({ createdByOrgCode: 'OTHER' }))

            await expect(service.issuePolicy(1, 'TST', 'user'))
                .rejects.toThrow(ForbiddenException)
        })

        it('T-QUO-BE-NE-R37c: throws BadRequestException when quote is not Bound', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote({ status: 'Draft' }))

            await expect(service.issuePolicy(1, 'TST', 'user'))
                .rejects.toThrow(BadRequestException)
        })

        it('T-QUO-BE-NE-R37d: creates policy record and returns it for a Bound quote', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote({ status: 'Bound' }))
            // First query: sequence lookup (no existing policy with this prefix)
            mockDataSource.query.mockResolvedValueOnce([])
            // Second query: INSERT ... RETURNING *
            const policyRow = { id: 10, reference: 'POL-TST-20260101-001', status: 'Active' }
            mockDataSource.query.mockResolvedValueOnce([policyRow])

            const result = await service.issuePolicy(1, 'TST', 'test-user')
            expect(result['status']).toBe('Active')
            expect(result['id']).toBe(10)
        })

        it('T-QUO-BE-NE-R37e: increments sequence when previous policy reference exists', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote({ status: 'Bound' }))
            // Sequence lookup returns an existing policy (seq 003)
            mockDataSource.query.mockResolvedValueOnce([{ reference: 'POL-TST-20260101-003' }])
            const policyRow = { id: 11, reference: 'POL-TST-20260101-004', status: 'Active' }
            mockDataSource.query.mockResolvedValueOnce([policyRow])

            const result = await service.issuePolicy(1, 'TST', 'test-user')
            // INSERT was called with reference POL-TST-...-004
            const insertCall = mockDataSource.query.mock.calls[1]
            expect(insertCall[1][0]).toMatch(/-004$/)
            expect(result['reference']).toBe('POL-TST-20260101-004')
        })
    })

    // -------------------------------------------------------------------------
    // REQ-QUO-BE-F-038 — getLocations
    // -------------------------------------------------------------------------
    describe('getLocations', () => {
        it('T-QUO-BE-NE-R38a: throws NotFoundException when quote does not exist', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(null)

            await expect(service.getLocations(99, 'TST'))
                .rejects.toThrow(NotFoundException)
        })

        it('T-QUO-BE-NE-R38b: throws ForbiddenException when orgCode does not match', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote({ createdByOrgCode: 'OTHER' }))

            await expect(service.getLocations(1, 'TST'))
                .rejects.toThrow(ForbiddenException)
        })

        it('T-QUO-BE-NE-R38c: returns location rows ordered by id', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            const locations = [{ id: 1, quote_id: 1 }, { id: 2, quote_id: 1 }]
            mockDataSource.query.mockResolvedValue(locations)

            const result = await service.getLocations(1, 'TST')
            expect(result).toEqual(locations)
            expect(mockDataSource.query).toHaveBeenCalledWith(
                expect.stringContaining('FROM quote_location_rows'),
                [1],
            )
        })

        it('T-QUO-BE-NE-R38d: returns empty array when no locations exist', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            mockDataSource.query.mockResolvedValue([])

            const result = await service.getLocations(1, 'TST')
            expect(result).toEqual([])
        })
    })

    // -------------------------------------------------------------------------
    // REQ-QUO-BE-NE-F-041 — getCoverages
    // Written ahead of implementation per §03 Three-Artifact Rule.
    // These tests will FAIL until quotes.service.ts adds getCoverages().
    // -------------------------------------------------------------------------
    describe('getCoverages', () => {
        it('T-QUO-BE-NE-R41a: returns coverages for the section ordered by id', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            const coverages = [
                { id: 1, section_id: 1, quote_id: 1, coverage: 'Property Damage' },
            ]
            mockDataSource.query.mockResolvedValue(coverages)

            const result = await (service as any).getCoverages(1, 1, 'TST', 'user')
            expect(result).toEqual(coverages)
            expect(mockDataSource.query).toHaveBeenCalledWith(
                expect.stringContaining('FROM quote_section_coverages'),
                expect.arrayContaining([1]),
            )
        })

        it('T-QUO-BE-NE-R41b: throws NotFoundException when parent quote does not exist', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(null)

            await expect((service as any).getCoverages(99, 1, 'TST', 'user'))
                .rejects.toThrow(NotFoundException)
        })

        it('T-QUO-BE-NE-R41c: throws ForbiddenException when orgCode does not match', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote({ createdByOrgCode: 'OTHER' }))

            await expect((service as any).getCoverages(1, 1, 'TST', 'user'))
                .rejects.toThrow(ForbiddenException)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-QUO-BE-NE-F-042 — createCoverage
    // Written ahead of implementation per §03 Three-Artifact Rule.
    // These tests will FAIL until quotes.service.ts adds createCoverage().
    // -------------------------------------------------------------------------
    describe('createCoverage', () => {
        it('T-QUO-BE-NE-R42a: creates a coverage with auto-generated reference {sectionRef}-COV-001', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            mockSectionRepo.findOne.mockResolvedValue({
                id: 1,
                reference: 'QUO-TST-20260325-001-S01',
                quoteId: 1,
            })
            mockDataSource.query
                .mockResolvedValueOnce([{ count: '0' }])
                .mockResolvedValueOnce([{
                    id: 1,
                    section_id: 1,
                    quote_id: 1,
                    reference: 'QUO-TST-20260325-001-S01-COV-001',
                    coverage: 'Property Damage',
                }])

            const result = await (service as any).createCoverage(1, 1, 'TST', { coverage: 'Property Damage' }, 'user')
            expect(result.reference).toBe('QUO-TST-20260325-001-S01-COV-001')
            expect(result.coverage).toBe('Property Damage')
        })

        it('T-QUO-BE-NE-R42b: throws NotFoundException when parent quote does not exist', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(null)

            await expect((service as any).createCoverage(99, 1, 'TST', { coverage: 'X' }, 'user'))
                .rejects.toThrow(NotFoundException)
        })

        it('T-QUO-BE-NE-R42c: throws ForbiddenException when orgCode does not match', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote({ createdByOrgCode: 'OTHER' }))

            await expect((service as any).createCoverage(1, 1, 'TST', { coverage: 'X' }, 'user'))
                .rejects.toThrow(ForbiddenException)
        })

        it('T-QUO-BE-NE-R42d: increments reference sequence when coverages already exist', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            mockSectionRepo.findOne.mockResolvedValue({
                id: 1,
                reference: 'QUO-TST-20260325-001-S01',
                quoteId: 1,
            })
            mockDataSource.query
                .mockResolvedValueOnce([{ count: '2' }])
                .mockResolvedValueOnce([{
                    id: 3,
                    section_id: 1,
                    quote_id: 1,
                    reference: 'QUO-TST-20260325-001-S01-COV-003',
                    coverage: 'Third Coverage',
                }])

            const result = await (service as any).createCoverage(1, 1, 'TST', { coverage: 'Third Coverage' }, 'user')
            expect(result.reference).toBe('QUO-TST-20260325-001-S01-COV-003')
        })
    })

    // -------------------------------------------------------------------------
    // REQ-QUO-BE-NE-F-043 — updateCoverage
    // Written ahead of implementation per §03 Three-Artifact Rule.
    // These tests will FAIL until quotes.service.ts adds updateCoverage().
    // -------------------------------------------------------------------------
    describe('updateCoverage', () => {
        it('T-QUO-BE-NE-R43a: updates mutable fields and returns the updated coverage', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            mockDataSource.query
                .mockResolvedValueOnce([{ id: 1, section_id: 1, quote_id: 1, coverage: 'Old' }])
                // TypeORM v0.3 returns [rawRows, rowCount] for UPDATE queries
                .mockResolvedValueOnce([[{
                    id: 1, section_id: 1, quote_id: 1,
                    coverage: 'Updated', class_of_business: 'Marine',
                }], 1])

            const result = await (service as any).updateCoverage(
                1, 1, 1, 'TST',
                { coverage: 'Updated', class_of_business: 'Marine' },
                'user',
            )
            expect(result.coverage).toBe('Updated')
            expect(result.class_of_business).toBe('Marine')
        })

        it('T-QUO-BE-NE-R43b: computes days_on_cover = 90 for Jan 1 to Apr 1', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            mockDataSource.query
                .mockResolvedValueOnce([{ id: 1, section_id: 1, quote_id: 1 }])
                // TypeORM v0.3 returns [rawRows, rowCount] for UPDATE queries
                .mockResolvedValueOnce([[{
                    id: 1, section_id: 1, quote_id: 1,
                    effective_date: '2026-01-01',
                    expiry_date: '2026-04-01',
                    days_on_cover: 90,
                }], 1])

            const result = await (service as any).updateCoverage(
                1, 1, 1, 'TST',
                { effective_date: '2026-01-01', expiry_date: '2026-04-01' },
                'user',
            )
            expect(result.days_on_cover).toBe(90)
        })

        it('T-QUO-BE-NE-R43c: throws NotFoundException when coverage does not exist', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            mockDataSource.query.mockResolvedValueOnce([]) // SELECT returns empty

            await expect((service as any).updateCoverage(1, 1, 999, 'TST', { coverage: 'X' }, 'user'))
                .rejects.toThrow(NotFoundException)
        })

        it('T-QUO-BE-NE-R43d: throws ForbiddenException when orgCode does not match', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote({ createdByOrgCode: 'OTHER' }))

            await expect((service as any).updateCoverage(1, 1, 1, 'TST', { coverage: 'X' }, 'user'))
                .rejects.toThrow(ForbiddenException)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-QUO-BE-NE-F-044 — deleteCoverage
    // Written ahead of implementation per §03 Three-Artifact Rule.
    // These tests will FAIL until quotes.service.ts adds deleteCoverage().
    // -------------------------------------------------------------------------
    describe('deleteCoverage', () => {
        it('T-QUO-BE-NE-R44a: soft-deletes coverage by setting deleted_at', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            mockDataSource.query.mockResolvedValue([{ id: 1 }])

            await expect((service as any).deleteCoverage(1, 1, 1, 'TST', 'user'))
                .resolves.not.toThrow()
            expect(mockDataSource.query).toHaveBeenCalledWith(
                expect.stringContaining('deleted_at'),
                expect.arrayContaining([1]),
            )
        })

        it('T-QUO-BE-NE-R44b: throws NotFoundException when coverage does not exist (no rows updated)', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote())
            mockDataSource.query.mockResolvedValue([])

            await expect((service as any).deleteCoverage(1, 1, 999, 'TST', 'user'))
                .rejects.toThrow(NotFoundException)
        })

        it('T-QUO-BE-NE-R44c: throws ForbiddenException when orgCode does not match', async () => {
            mockQuoteRepo.findOne.mockResolvedValue(makeQuote({ createdByOrgCode: 'OTHER' }))

            await expect((service as any).deleteCoverage(1, 1, 1, 'TST', 'user'))
                .rejects.toThrow(ForbiddenException)
        })
    })
})
