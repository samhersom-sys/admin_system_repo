/**
 * claims.spec.ts — ClaimsService unit tests
 * Domain: CLM-BE-NE
 * Standard: AI Guidelines §06-Testing-Standards.md §6.2
 *
 * Coverage:
 *   R01 — findAll (list claims scoped to org via policy join)
 *   R02 — create (generates reference, validates policyId, access-checks policy org)
 *   R03 — findOne (access-controlled retrieval)
 *   R04 — update (selective field update)
 *   R05 — getTransactions
 *   R06 — addTransaction (validates type/amount)
 *   R07 — getAudit / postAudit
 */

import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { ClaimsService } from './claims.service'
import { Claim } from '../entities/claim.entity'

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function makeClaim(overrides: Partial<Claim> = {}): Claim {
  const c = new Claim()
  c.id = 1
  c.policyId = 10
  c.claimNumber = 'CLM-TST-20260101-001'
  c.reference = 'CLM-TST-20260101-001'
  c.status = 'Open'
  c.lossDate = '2026-01-01'
  c.reportedDate = '2026-01-02'
  c.description = 'Test claim'
  c.payload = {}
  c.deletedAt = null
  c.createdAt = new Date('2026-01-02')
  Object.assign(c, overrides)
  return c
}

function buildRepoQbMock(getRawOneResult: { cnt: string } | null) {
  const qb: Record<string, jest.Mock> = {}
  const chain = jest.fn().mockReturnValue(qb)
  qb.select = chain
  qb.where = chain
  qb.getRawOne = jest.fn().mockResolvedValue(getRawOneResult)
  return qb
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('ClaimsService', () => {
  let service: ClaimsService
  let mockClaimRepo: Record<string, jest.Mock>
  let mockDataSource: Record<string, jest.Mock>

  beforeEach(async () => {
    mockClaimRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    }

    mockDataSource = {
      query: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClaimsService,
        { provide: getRepositoryToken(Claim), useValue: mockClaimRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile()

    service = module.get<ClaimsService>(ClaimsService)
  })

  afterEach(() => jest.clearAllMocks())

  // -------------------------------------------------------------------------
  // REQ-CLM-BE-NE-R01 — findAll
  // -------------------------------------------------------------------------
  describe('findAll', () => {
    it('T-CLM-BE-NE-R01a: returns claims scoped to org via policy join', async () => {
      const rows = [{ id: 1, claimNumber: 'CLM-TST-001', policyReference: 'POL-001' }]
      mockDataSource.query.mockResolvedValue(rows)

      const result = await service.findAll('TST')
      expect(result).toEqual(rows)
      expect(mockDataSource.query.mock.calls[0][1]).toEqual(['TST'])
    })

    it('T-CLM-BE-NE-R01b: returns empty array when no claims exist for org', async () => {
      mockDataSource.query.mockResolvedValue([])
      const result = await service.findAll('TST')
      expect(result).toEqual([])
    })
  })

  // -------------------------------------------------------------------------
  // REQ-CLM-BE-NE-R02 — create
  // -------------------------------------------------------------------------
  describe('create', () => {
    it('T-CLM-BE-NE-R02a: throws BadRequestException when policyId is missing', async () => {
      await expect(service.create('TST', {})).rejects.toThrow(BadRequestException)
    })

    it('T-CLM-BE-NE-R02b: throws NotFoundException when policy not found for org', async () => {
      mockDataSource.query.mockResolvedValueOnce([]) // no matching policy
      await expect(service.create('TST', { policyId: 99 })).rejects.toThrow(NotFoundException)
    })

    it('T-CLM-BE-NE-R02c: creates claim with Open status and generated reference', async () => {
      mockDataSource.query.mockResolvedValueOnce([{ id: 10 }]) // policy access check
      const repoQb = buildRepoQbMock({ cnt: '0' })
      mockClaimRepo.createQueryBuilder.mockReturnValue(repoQb)
      const newClaim = makeClaim()
      mockClaimRepo.create.mockReturnValue(newClaim)
      mockClaimRepo.save.mockResolvedValue(newClaim)

      const result = await service.create('TST', { policyId: 10, description: 'Test' })
      expect(result.status).toBe('Open')
      expect(mockClaimRepo.save).toHaveBeenCalled()
    })

    it('T-CLM-BE-NE-R02d: includes lossType, claimantName, claimantContact in payload', async () => {
      mockDataSource.query.mockResolvedValueOnce([{ id: 10 }])
      const repoQb = buildRepoQbMock(null)
      mockClaimRepo.createQueryBuilder.mockReturnValue(repoQb)
      const newClaim = makeClaim()
      mockClaimRepo.create.mockReturnValue(newClaim)
      mockClaimRepo.save.mockResolvedValue(newClaim)

      await service.create('TST', { policyId: 10, lossType: 'Property Damage', claimantName: 'John' })
      const createArg = mockClaimRepo.create.mock.calls[0][0]
      expect(createArg.payload.lossType).toBe('Property Damage')
      expect(createArg.payload.claimantName).toBe('John')
    })
  })

  // -------------------------------------------------------------------------
  // REQ-CLM-BE-NE-R03 — findOne
  // -------------------------------------------------------------------------
  describe('findOne', () => {
    it('T-CLM-BE-NE-R03a: throws NotFoundException when claim not found', async () => {
      mockDataSource.query.mockResolvedValue([])
      await expect(service.findOne('TST', 99)).rejects.toThrow(NotFoundException)
    })

    it('T-CLM-BE-NE-R03b: throws ForbiddenException when policy belongs to different org', async () => {
      mockDataSource.query.mockResolvedValue([{ id: 1, policyOrgCode: 'OTHER' }])
      await expect(service.findOne('TST', 1)).rejects.toThrow(ForbiddenException)
    })

    it('T-CLM-BE-NE-R03c: returns claim row with policy fields when org matches', async () => {
      const row = { id: 1, claimNumber: 'CLM-TST-001', policyOrgCode: 'TST', policyReference: 'POL-001' }
      mockDataSource.query.mockResolvedValue([row])

      const result = await service.findOne('TST', 1)
      expect(result['claimNumber']).toBe('CLM-TST-001')
    })
  })

  // -------------------------------------------------------------------------
  // REQ-CLM-BE-NE-R04 — update
  // -------------------------------------------------------------------------
  describe('update', () => {
    it('T-CLM-BE-NE-R04a: updates status field and saves', async () => {
      const claim = makeClaim()
      mockClaimRepo.findOne.mockResolvedValue(claim)
      mockDataSource.query.mockResolvedValue([{ created_by_org_code: 'TST' }])
      mockClaimRepo.save.mockResolvedValue({ ...claim, status: 'Closed' } as Claim)

      const result = await service.update('TST', 1, { status: 'Closed' })
      expect(result.status).toBe('Closed')
    })

    it('T-CLM-BE-NE-R04b: skips null values (COALESCE behaviour)', async () => {
      const claim = makeClaim({ description: 'Original' })
      mockClaimRepo.findOne.mockResolvedValue(claim)
      mockDataSource.query.mockResolvedValue([{ created_by_org_code: 'TST' }])
      mockClaimRepo.save.mockResolvedValue(claim)

      await service.update('TST', 1, { description: null })
      const saved = mockClaimRepo.save.mock.calls[0][0]
      expect(saved.description).toBe('Original')
    })

    it('T-CLM-BE-NE-R04c: throws NotFoundException when claim not found', async () => {
      mockClaimRepo.findOne.mockResolvedValue(null)
      // getAccessibleClaim: findOne returns null → NotFoundException before dataSource.query
      await expect(service.update('TST', 99, {})).rejects.toThrow(NotFoundException)
    })
  })

  // -------------------------------------------------------------------------
  // REQ-CLM-BE-NE-R05 — getTransactions
  // -------------------------------------------------------------------------
  describe('getTransactions', () => {
    it('T-CLM-BE-NE-R05a: returns transactions for a valid claim', async () => {
      mockClaimRepo.findOne.mockResolvedValue(makeClaim())
      mockDataSource.query
        .mockResolvedValueOnce([{ created_by_org_code: 'TST' }]) // getAccessibleClaim policy check
        .mockResolvedValueOnce([{ id: 1, type: 'Reserve Movement', amount: 5000 }]) // transactions query

      const result = await service.getTransactions('TST', 1)
      expect(result[0]['type']).toBe('Reserve Movement')
    })

    it('T-CLM-BE-NE-R05b: throws NotFoundException when claim not found', async () => {
      mockClaimRepo.findOne.mockResolvedValue(null)
      await expect(service.getTransactions('TST', 99)).rejects.toThrow(NotFoundException)
    })
  })

  // -------------------------------------------------------------------------
  // REQ-CLM-BE-NE-R06 — addTransaction
  // -------------------------------------------------------------------------
  describe('addTransaction', () => {
    it('T-CLM-BE-NE-R06a: throws BadRequestException when type is missing', async () => {
      mockClaimRepo.findOne.mockResolvedValue(makeClaim())
      mockDataSource.query.mockResolvedValueOnce([{ created_by_org_code: 'TST' }]) // getAccessibleClaim
      await expect(service.addTransaction('TST', 1, { amount: 100 })).rejects.toThrow(BadRequestException)
    })

    it('T-CLM-BE-NE-R06b: throws BadRequestException when amount is missing', async () => {
      mockClaimRepo.findOne.mockResolvedValue(makeClaim())
      mockDataSource.query.mockResolvedValueOnce([{ created_by_org_code: 'TST' }]) // getAccessibleClaim
      await expect(service.addTransaction('TST', 1, { type: 'Payment' })).rejects.toThrow(BadRequestException)
    })

    it('T-CLM-BE-NE-R06c: inserts transaction and returns the created row', async () => {
      mockClaimRepo.findOne.mockResolvedValue(makeClaim())
      mockDataSource.query
        .mockResolvedValueOnce([{ created_by_org_code: 'TST' }]) // getAccessibleClaim
        .mockResolvedValueOnce([{ id: 5, claimId: 1, type: 'Payment', amount: 1000 }]) // INSERT RETURNING

      const result = await service.addTransaction('TST', 1, { type: 'Payment', amount: 1000 })
      expect(result['type']).toBe('Payment')
      expect(result['amount']).toBe(1000)
    })
  })

  // -------------------------------------------------------------------------
  // REQ-CLM-BE-NE-R07 — getAudit / postAudit
  // -------------------------------------------------------------------------
  describe('getAudit', () => {
    it('T-CLM-BE-NE-R07a: returns audit events for the claim', async () => {
      mockClaimRepo.findOne.mockResolvedValue(makeClaim())
      mockDataSource.query
        .mockResolvedValueOnce([{ created_by_org_code: 'TST' }]) // getAccessibleClaim
        .mockResolvedValueOnce([{ id: 1, action: 'Claim Opened' }]) // audit_event query

      const result = await service.getAudit('TST', 1)
      expect(result[0]['action']).toBe('Claim Opened')
    })
  })

  describe('postAudit', () => {
    it('T-CLM-BE-NE-R07b: inserts an audit_event row', async () => {
      mockClaimRepo.findOne.mockResolvedValue(makeClaim())
      mockDataSource.query
        .mockResolvedValueOnce([{ created_by_org_code: 'TST' }]) // getAccessibleClaim
        .mockResolvedValueOnce([]) // INSERT audit_event

      await service.postAudit('TST', 1, 'Claim Opened', 'alice@test.com', 7)
      const insertCall = mockDataSource.query.mock.calls[1]
      expect(insertCall[0]).toContain('INSERT INTO audit_event')
    })
  })
})
