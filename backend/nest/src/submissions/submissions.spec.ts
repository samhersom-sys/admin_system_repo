/**
 * submissions.spec.ts — SubmissionsService unit tests
 * Domain: SUB-BE-NE
 * Requirements: backend/nest/src/submissions/submissions.requirements.md
 * Standard: AI Guidelines §06-Testing-Standards.md §6.2
 *
 * Tests are written per §03 Three-Artifact Rule:
 *   requirements.md → this file → implementation changes.
 *
 * Coverage:
 *   R01 — findAll (list submissions scoped to org)
 *   R02 — create (generate reference, default expiry)
 *   R03 — findOne (access-controlled retrieval)
 *   R04 — acquireEditLock
 *   R05 — releaseEditLock
 *   R06 — update (requires edit lock)
 *   R07 — submit (status → 'In Review')
 *   R08 — decline (status → 'Declined' + audit entry)
 *   R09 — findRelated
 *   R10 — linkRelated
 *   R11 — removeRelated
 *   R12 — findBindingAuthorities
 */

import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { SubmissionsService } from './submissions.service'
import { Submission } from '../entities/submission.entity'
import { Quote } from '../entities/quote.entity'

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function makeSubmission(overrides: Partial<Submission> = {}): Submission {
  const s = new Submission()
  s.id = 1
  s.reference = 'SUB-TST-20260101-001'
  s.submissionType = 'Submission'
  s.insured = 'Test Insured Ltd'
  s.insuredId = null
  s.placingBroker = null
  s.placingBrokerName = null
  s.brokerId = null
  s.contractType = null
  s.inceptionDate = '2026-01-01'
  s.expiryDate = '2027-01-01'
  s.renewalDate = null
  s.status = 'Created'
  s.createdDate = '2026-01-01'
  s.createdBy = 'test-user'
  s.createdByOrgCode = 'TST'
  s.invitedInsurers = null
  s.inviteResponses = null
  s.audit = null
  s.partyCreatedId = null
  s.statusId = null
  s.workflowStatusCode = null
  Object.assign(s, overrides)
  return s
}

/** Builds a QueryBuilder mock suitable for DataSource.createQueryBuilder() chains. */
function buildDataSourceQbMock(getRawManyResult: Record<string, unknown>[] = []) {
  const qb: Record<string, jest.Mock> = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(getRawManyResult),
  }
  // Allow chaining from the mock keys
  Object.keys(qb).forEach((key) => {
    if (key !== 'getRawMany') {
      qb[key] = jest.fn().mockReturnValue(qb)
    }
  })
  qb.getRawMany = jest.fn().mockResolvedValue(getRawManyResult)
  return qb
}

/** Builds a QueryBuilder mock for Repository.createQueryBuilder() (reference counter). */
function buildRepoQbMock(getRawOneResult: { cnt: string } | null) {
  const qb: Record<string, jest.Mock> = {} as Record<string, jest.Mock>
  const chain = jest.fn().mockReturnValue(qb)
  qb.select = chain
  qb.where = chain
  qb.getRawOne = jest.fn().mockResolvedValue(getRawOneResult)
  return qb
}

// Shared lock row used across edit-lock tests
const LOCK_ROW = {
  submission_id: 1,
  locked_by_user_id: 7,
  locked_by_user_name: 'alice',
  locked_by_user_email: 'alice@test.com',
  acquired_at: '2026-01-01T00:00:00',
  expires_at: '2026-01-01T00:01:30',
}

const OTHER_LOCK_ROW = {
  submission_id: 1,
  locked_by_user_id: 99,
  locked_by_user_name: 'bob',
  locked_by_user_email: null,
  acquired_at: '2026-01-01T00:00:00',
  expires_at: '2026-01-01T00:01:30',
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('SubmissionsService', () => {
  let service: SubmissionsService
  let mockSubmissionRepo: Record<string, jest.Mock>
  let mockQuoteRepo: Record<string, jest.Mock>
  let mockDataSource: Record<string, jest.Mock>

  beforeEach(async () => {
    mockSubmissionRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    }

    mockQuoteRepo = {
      findOne: jest.fn(),
    }

    mockDataSource = {
      query: jest.fn(),
      createQueryBuilder: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        { provide: getRepositoryToken(Submission), useValue: mockSubmissionRepo },
        { provide: getRepositoryToken(Quote), useValue: mockQuoteRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile()

    service = module.get<SubmissionsService>(SubmissionsService)
  })

  afterEach(() => jest.clearAllMocks())

  // -------------------------------------------------------------------------
  // REQ-SUB-BE-NE-R01 — findAll
  // -------------------------------------------------------------------------
  describe('findAll', () => {
    it('T-SUB-BE-NE-R01a: returns empty array when no submissions exist for org', async () => {
      const qb = buildDataSourceQbMock([])
      mockDataSource.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll('TST')
      expect(result).toEqual([])
      expect(qb.where).toHaveBeenCalledWith('s."createdByOrgCode" = :orgCode', { orgCode: 'TST' })
    })

    it('T-SUB-BE-NE-R01b: applies status filter when provided', async () => {
      const qb = buildDataSourceQbMock([])
      mockDataSource.createQueryBuilder.mockReturnValue(qb)

      await service.findAll('TST', 'Created')
      expect(qb.andWhere).toHaveBeenCalledWith('s.status = :status', { status: 'Created' })
    })

    it('T-SUB-BE-NE-R01c: does NOT apply andWhere when status is omitted', async () => {
      const qb = buildDataSourceQbMock([])
      mockDataSource.createQueryBuilder.mockReturnValue(qb)

      await service.findAll('TST')
      expect(qb.andWhere).not.toHaveBeenCalled()
    })

    it('T-SUB-BE-NE-R01d: augments rows with hasQuote=true when matching quote exists', async () => {
      const row: Record<string, unknown> = { id: 1, reference: 'SUB-TST-001' }
      const qb = buildDataSourceQbMock([row])
      mockDataSource.createQueryBuilder.mockReturnValue(qb)
      mockDataSource.query.mockResolvedValueOnce([{ submission_id: 1 }])

      const result = await service.findAll('TST')
      expect(result[0]['hasQuote']).toBe(true)
    })

    it('T-SUB-BE-NE-R01e: sets hasQuote=false when no matching quote exists', async () => {
      const row: Record<string, unknown> = { id: 2, reference: 'SUB-TST-002' }
      const qb = buildDataSourceQbMock([row])
      mockDataSource.createQueryBuilder.mockReturnValue(qb)
      mockDataSource.query.mockResolvedValueOnce([]) // no quoted rows

      const result = await service.findAll('TST')
      expect(result[0]['hasQuote']).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // REQ-SUB-BE-NE-R02 — create
  // -------------------------------------------------------------------------
  describe('create', () => {
    it('T-SUB-BE-NE-R02a: throws BadRequestException when insured is missing', async () => {
      await expect(service.create('TST', {})).rejects.toThrow(BadRequestException)
    })

    it('T-SUB-BE-NE-R02b: creates submission with status=Created', async () => {
      const repoQb = buildRepoQbMock({ cnt: '0' })
      mockSubmissionRepo.createQueryBuilder.mockReturnValue(repoQb)
      const newSub = makeSubmission()
      mockSubmissionRepo.create.mockReturnValue(newSub)
      mockSubmissionRepo.save.mockResolvedValue(newSub)

      const result = await service.create('TST', { insured: 'Test Ltd', inceptionDate: '2026-01-01' })
      expect(result.status).toBe('Created')
      expect(mockSubmissionRepo.save).toHaveBeenCalled()
    })

    it('T-SUB-BE-NE-R02c: sets createdByOrgCode to the caller org', async () => {
      const repoQb = buildRepoQbMock(null)
      mockSubmissionRepo.createQueryBuilder.mockReturnValue(repoQb)
      const newSub = makeSubmission({ createdByOrgCode: 'MYORG' })
      mockSubmissionRepo.create.mockReturnValue(newSub)
      mockSubmissionRepo.save.mockResolvedValue(newSub)

      await service.create('MYORG', { insured: 'X Ltd' })
      const createArg = mockSubmissionRepo.create.mock.calls[0][0]
      expect(createArg.createdByOrgCode).toBe('MYORG')
    })

    it('T-SUB-BE-NE-R02d: defaults expiryDate to inceptionDate + 1 year when omitted', async () => {
      const repoQb = buildRepoQbMock(null)
      mockSubmissionRepo.createQueryBuilder.mockReturnValue(repoQb)
      const newSub = makeSubmission()
      mockSubmissionRepo.create.mockReturnValue(newSub)
      mockSubmissionRepo.save.mockResolvedValue(newSub)

      await service.create('TST', { insured: 'X', inceptionDate: '2026-01-01' })
      const createArg = mockSubmissionRepo.create.mock.calls[0][0]
      expect(createArg.expiryDate).toBe('2027-01-01')
    })

    it('T-SUB-BE-NE-R02e: does not override expiryDate when explicitly supplied', async () => {
      const repoQb = buildRepoQbMock(null)
      mockSubmissionRepo.createQueryBuilder.mockReturnValue(repoQb)
      const newSub = makeSubmission({ expiryDate: '2028-06-30' })
      mockSubmissionRepo.create.mockReturnValue(newSub)
      mockSubmissionRepo.save.mockResolvedValue(newSub)

      await service.create('TST', { insured: 'X', inceptionDate: '2026-01-01', expiryDate: '2028-06-30' })
      const createArg = mockSubmissionRepo.create.mock.calls[0][0]
      expect(createArg.expiryDate).toBe('2028-06-30')
    })
  })

  // -------------------------------------------------------------------------
  // REQ-SUB-BE-NE-R03 — findOne
  // -------------------------------------------------------------------------
  describe('findOne', () => {
    it('T-SUB-BE-NE-R03a: throws NotFoundException when submission does not exist', async () => {
      const qb = buildDataSourceQbMock([])
      mockDataSource.createQueryBuilder.mockReturnValue(qb)

      await expect(service.findOne('TST', 99)).rejects.toThrow(NotFoundException)
    })

    it('T-SUB-BE-NE-R03b: throws ForbiddenException when orgCode does not match', async () => {
      const qb = buildDataSourceQbMock([{ id: 1, createdByOrgCode: 'OTHER' }])
      mockDataSource.createQueryBuilder.mockReturnValue(qb)

      await expect(service.findOne('TST', 1)).rejects.toThrow(ForbiddenException)
    })

    it('T-SUB-BE-NE-R03c: returns submission row decorated with hasQuote=false and hasPolicy=false', async () => {
      const qb = buildDataSourceQbMock([{ id: 1, createdByOrgCode: 'TST' }])
      mockDataSource.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findOne('TST', 1)
      expect(result['hasQuote']).toBe(false)
      expect(result['hasPolicy']).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // REQ-SUB-BE-NE-R04 — acquireEditLock
  // -------------------------------------------------------------------------
  describe('acquireEditLock', () => {
    const user = { id: 7, username: 'alice', email: 'alice@test.com' }

    it('T-SUB-BE-NE-R04a: throws NotFoundException when submission not found', async () => {
      mockSubmissionRepo.findOne.mockResolvedValue(null)

      await expect(service.acquireEditLock('TST', 99, user)).rejects.toThrow(NotFoundException)
    })

    it('T-SUB-BE-NE-R04b: returns lock response when UPSERT succeeds', async () => {
      mockSubmissionRepo.findOne.mockResolvedValue(makeSubmission())
      mockDataSource.query.mockResolvedValueOnce([LOCK_ROW])

      const result = await service.acquireEditLock('TST', 1, user)
      expect(result.isHeldByCurrentUser).toBe(true)
      expect(result.lockedByUserId).toBe(7)
      expect(result.submissionId).toBe(1)
    })

    it('T-SUB-BE-NE-R04c: throws ConflictException when lock is held by another user', async () => {
      mockSubmissionRepo.findOne.mockResolvedValue(makeSubmission())
      // UPSERT returns empty (lock held by someone else)
      mockDataSource.query.mockResolvedValueOnce([])
      // getActiveEditLock returns lock held by user 99
      mockDataSource.query.mockResolvedValueOnce([OTHER_LOCK_ROW])

      await expect(service.acquireEditLock('TST', 1, user)).rejects.toThrow(ConflictException)
    })

    it('T-SUB-BE-NE-R04d: throws ConflictException (UNAVAILABLE) when no active lock found after failed UPSERT', async () => {
      mockSubmissionRepo.findOne.mockResolvedValue(makeSubmission())
      // UPSERT returns empty
      mockDataSource.query.mockResolvedValueOnce([])
      // getActiveEditLock also returns empty — no active lock at all
      mockDataSource.query.mockResolvedValueOnce([])

      const err = await service.acquireEditLock('TST', 1, user).catch((e) => e)
      expect(err).toBeInstanceOf(ConflictException)
      expect(err.response?.code).toBe('SUBMISSION_EDIT_LOCK_UNAVAILABLE')
    })
  })

  // -------------------------------------------------------------------------
  // REQ-SUB-BE-NE-R05 — releaseEditLock
  // -------------------------------------------------------------------------
  describe('releaseEditLock', () => {
    it('T-SUB-BE-NE-R05a: deletes lock row with correct submission_id and user_id', async () => {
      mockSubmissionRepo.findOne.mockResolvedValue(makeSubmission())
      mockDataSource.query.mockResolvedValue([])

      await service.releaseEditLock('TST', 1, { id: 7 })
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM submission_edit_lock'),
        [1, 7],
      )
    })

    it('T-SUB-BE-NE-R05b: throws NotFoundException when submission not found', async () => {
      mockSubmissionRepo.findOne.mockResolvedValue(null)

      await expect(service.releaseEditLock('TST', 99, { id: 7 })).rejects.toThrow(NotFoundException)
    })
  })

  // -------------------------------------------------------------------------
  // REQ-SUB-BE-NE-R06 — update
  // -------------------------------------------------------------------------
  describe('update', () => {
    const user = { id: 7 }

    it('T-SUB-BE-NE-R06a: updates insured field and saves', async () => {
      const s = makeSubmission()
      mockSubmissionRepo.findOne.mockResolvedValue(s)
      mockDataSource.query.mockResolvedValue([LOCK_ROW])
      mockSubmissionRepo.save.mockResolvedValue({ ...s, insured: 'Updated Ltd' })

      const result = await service.update('TST', 1, { insured: 'Updated Ltd' }, user)
      expect(mockSubmissionRepo.save).toHaveBeenCalled()
      expect(result.insured).toBe('Updated Ltd')
    })

    it('T-SUB-BE-NE-R06b: skips null field values (COALESCE behaviour)', async () => {
      const s = makeSubmission({ insured: 'Original' })
      mockSubmissionRepo.findOne.mockResolvedValue(s)
      mockDataSource.query.mockResolvedValue([LOCK_ROW])
      mockSubmissionRepo.save.mockResolvedValue(s)

      await service.update('TST', 1, { insured: null }, user)
      // insured should remain unchanged — save is called with original value
      const savedArg = mockSubmissionRepo.save.mock.calls[0][0]
      expect(savedArg.insured).toBe('Original')
    })

    it('T-SUB-BE-NE-R06c: throws ConflictException when edit lock is not held', async () => {
      mockSubmissionRepo.findOne.mockResolvedValue(makeSubmission())
      mockDataSource.query.mockResolvedValue([]) // no active lock

      await expect(service.update('TST', 1, { insured: 'X' }, user)).rejects.toThrow(ConflictException)
    })

    it('T-SUB-BE-NE-R06d: throws NotFoundException when submission not found', async () => {
      mockSubmissionRepo.findOne.mockResolvedValue(null)

      await expect(service.update('TST', 99, { insured: 'X' }, user)).rejects.toThrow(NotFoundException)
    })
  })

  // -------------------------------------------------------------------------
  // REQ-SUB-BE-NE-R07 — submit
  // -------------------------------------------------------------------------
  describe('submit', () => {
    const user = { id: 7 }

    it('T-SUB-BE-NE-R07a: transitions status to In Review', async () => {
      const s = makeSubmission()
      mockSubmissionRepo.findOne.mockResolvedValue(s)
      mockDataSource.query.mockResolvedValue([LOCK_ROW])
      mockSubmissionRepo.save.mockResolvedValue({ ...s, status: 'In Review' })

      const result = await service.submit('TST', 1, user)
      expect(result.status).toBe('In Review')
      expect(mockSubmissionRepo.save).toHaveBeenCalled()
    })

    it('T-SUB-BE-NE-R07b: throws ConflictException when edit lock is not held', async () => {
      mockSubmissionRepo.findOne.mockResolvedValue(makeSubmission())
      mockDataSource.query.mockResolvedValue([]) // no lock

      await expect(service.submit('TST', 1, user)).rejects.toThrow(ConflictException)
    })

    it('T-SUB-BE-NE-R07c: throws NotFoundException when submission not found', async () => {
      mockSubmissionRepo.findOne.mockResolvedValue(null)

      await expect(service.submit('TST', 99, user)).rejects.toThrow(NotFoundException)
    })
  })

  // -------------------------------------------------------------------------
  // REQ-SUB-BE-NE-R08 — decline
  // -------------------------------------------------------------------------
  describe('decline', () => {
    const user = { id: 7, email: 'alice@test.com', username: 'alice' }

    it('T-SUB-BE-NE-R08a: throws BadRequestException when reasonCode is empty', async () => {
      await expect(service.decline('TST', 1, '', 'some reason', user)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('T-SUB-BE-NE-R08b: transitions status to Declined', async () => {
      const s = makeSubmission()
      mockSubmissionRepo.findOne.mockResolvedValue(s)
      mockDataSource.query
        .mockResolvedValueOnce([LOCK_ROW]) // assertCurrentUserHoldsEditLock
        .mockResolvedValueOnce([]) // audit INSERT (best-effort)
      mockSubmissionRepo.save.mockResolvedValue({ ...s, status: 'Declined' })

      const result = await service.decline('TST', 1, 'NTM', 'Not to market', user)
      expect(result.status).toBe('Declined')
    })

    it('T-SUB-BE-NE-R08c: inserts audit entry after declining', async () => {
      const s = makeSubmission()
      mockSubmissionRepo.findOne.mockResolvedValue(s)
      mockDataSource.query
        .mockResolvedValueOnce([LOCK_ROW])
        .mockResolvedValueOnce([])
      mockSubmissionRepo.save.mockResolvedValue({ ...s, status: 'Declined' })

      await service.decline('TST', 1, 'NTM', 'Not to market', user)
      // Second query is the audit INSERT
      expect(mockDataSource.query).toHaveBeenCalledTimes(2)
      const auditCall = mockDataSource.query.mock.calls[1]
      expect(auditCall[0]).toContain('INSERT INTO public.audit_event')
    })

    it('T-SUB-BE-NE-R08d: throws ConflictException when edit lock is not held', async () => {
      mockSubmissionRepo.findOne.mockResolvedValue(makeSubmission())
      mockDataSource.query.mockResolvedValue([]) // no lock

      await expect(service.decline('TST', 1, 'NTM', '', user)).rejects.toThrow(ConflictException)
    })
  })

  // -------------------------------------------------------------------------
  // REQ-SUB-BE-NE-R09 — findRelated
  // -------------------------------------------------------------------------
  describe('findRelated', () => {
    it('T-SUB-BE-NE-R09a: returns related submissions for a valid submission', async () => {
      mockSubmissionRepo.findOne.mockResolvedValue(makeSubmission())
      const related = [{ id: 2, reference: 'SUB-TST-002' }]
      mockDataSource.query.mockResolvedValue(related)

      const result = await service.findRelated('TST', 1)
      expect(result).toEqual(related)
    })

    it('T-SUB-BE-NE-R09b: throws NotFoundException when submission not found', async () => {
      mockSubmissionRepo.findOne.mockResolvedValue(null)

      await expect(service.findRelated('TST', 99)).rejects.toThrow(NotFoundException)
    })
  })

  // -------------------------------------------------------------------------
  // REQ-SUB-BE-NE-R10 — linkRelated
  // -------------------------------------------------------------------------
  describe('linkRelated', () => {
    it('T-SUB-BE-NE-R10a: throws BadRequestException when linking submission to itself', async () => {
      mockSubmissionRepo.findOne.mockResolvedValue(makeSubmission())

      await expect(service.linkRelated('TST', 1, 1)).rejects.toThrow(BadRequestException)
    })

    it('T-SUB-BE-NE-R10b: inserts link and returns related submission details', async () => {
      mockSubmissionRepo.findOne.mockResolvedValue(makeSubmission())
      mockDataSource.query
        .mockResolvedValueOnce([]) // INSERT WHERE NOT EXISTS
        .mockResolvedValueOnce([{ id: 2, reference: 'SUB-TST-002' }]) // SELECT related

      const result = await service.linkRelated('TST', 1, 2)
      expect(result['id']).toBe(2)
    })

    it('T-SUB-BE-NE-R10c: stores pair in normalised (min, max) order', async () => {
      mockSubmissionRepo.findOne.mockResolvedValue(makeSubmission())
      mockDataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 5, reference: 'SUB-TST-005' }])

      await service.linkRelated('TST', 5, 2) // 5 > 2, stored as (2, 5)
      const insertCall = mockDataSource.query.mock.calls[0]
      expect(insertCall[1]).toEqual([2, 5])
    })

    it('T-SUB-BE-NE-R10d: throws NotFoundException when related submission not found in DB', async () => {
      mockSubmissionRepo.findOne.mockResolvedValue(makeSubmission())
      mockDataSource.query
        .mockResolvedValueOnce([]) // INSERT
        .mockResolvedValueOnce([]) // SELECT returns nothing

      await expect(service.linkRelated('TST', 1, 99)).rejects.toThrow(NotFoundException)
    })
  })

  // -------------------------------------------------------------------------
  // REQ-SUB-BE-NE-R11 — removeRelated
  // -------------------------------------------------------------------------
  describe('removeRelated', () => {
    it('T-SUB-BE-NE-R11a: deletes link with normalised (min, max) id order', async () => {
      mockSubmissionRepo.findOne.mockResolvedValue(makeSubmission())
      mockDataSource.query.mockResolvedValue([])

      await service.removeRelated('TST', 5, 2) // 5 > 2, so normalised → (2, 5)
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM submission_related'),
        expect.arrayContaining([2, 5]),
      )
    })

    it('T-SUB-BE-NE-R11b: stores pair correctly when first arg is smaller', async () => {
      mockSubmissionRepo.findOne.mockResolvedValue(makeSubmission())
      mockDataSource.query.mockResolvedValue([])

      await service.removeRelated('TST', 1, 3) // 1 < 3, stored as (1, 3)
      const deleteCall = mockDataSource.query.mock.calls[0]
      expect(deleteCall[1]).toEqual([1, 3])
    })

    it('T-SUB-BE-NE-R11c: throws NotFoundException when submission not found', async () => {
      mockSubmissionRepo.findOne.mockResolvedValue(null)

      await expect(service.removeRelated('TST', 99, 2)).rejects.toThrow(NotFoundException)
    })
  })

  // -------------------------------------------------------------------------
  // REQ-SUB-BE-NE-R12 — findBindingAuthorities
  // -------------------------------------------------------------------------
  describe('findBindingAuthorities', () => {
    it('T-SUB-BE-NE-R12a: returns binding authorities for a valid submission', async () => {
      mockSubmissionRepo.findOne.mockResolvedValue(makeSubmission())
      const bas = [{ id: 1, reference: 'BA-TST-001', status: 'Active' }]
      mockDataSource.query.mockResolvedValue(bas)

      const result = await service.findBindingAuthorities('TST', 1)
      expect(result).toEqual(bas)
    })

    it('T-SUB-BE-NE-R12b: queries with correct submission_id parameter', async () => {
      mockSubmissionRepo.findOne.mockResolvedValue(makeSubmission())
      mockDataSource.query.mockResolvedValue([])

      await service.findBindingAuthorities('TST', 42)
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM binding_authority ba'),
        [42],
      )
    })

    it('T-SUB-BE-NE-R12c: throws NotFoundException when submission not found', async () => {
      mockSubmissionRepo.findOne.mockResolvedValue(null)

      await expect(service.findBindingAuthorities('TST', 99)).rejects.toThrow(NotFoundException)
    })
  })
})
