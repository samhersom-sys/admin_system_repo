import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm'
import { NotFoundException } from '@nestjs/common'
import { BindingAuthoritiesService } from './binding-authorities.service'
import { BindingAuthority } from '../entities/binding-authority.entity'
import { BASection } from '../entities/ba-section.entity'
import { BATransaction } from '../entities/ba-transaction.entity'
import { BASectionParticipation } from '../entities/ba-section-participation.entity'
import { BASectionAuthorizedRisk } from '../entities/ba-section-authorized-risk.entity'
import { BADocument } from '../entities/ba-document.entity'
import { BABordereauConfig } from '../entities/ba-bordereau-config.entity'
import { AuditService } from '../audit/audit.service'

const ORG = 'ORG1'
const OTHER_ORG = 'ORG2'

const BA: Partial<BindingAuthority> = {
  id: 1, reference: 'BA-001', status: 'Active',
  inceptionDate: '2025-01-01', expiryDate: '2025-12-31',
  yearOfAccount: 2025, isMultiYear: false,
  payload: { coverholder_id: 10, coverholder: 'Alpha Holdings' },
  createdByOrgCode: ORG, createdBy: 'user@test.com',
  createdAt: new Date(),
}

const SECTION: Partial<BASection> = {
  id: 1, bindingAuthorityId: 1, reference: '1-S1',
  classOfBusiness: 'Marine', timeBasis: 'annual',
  inceptionDate: '2025-01-01', expiryDate: '2025-12-31',
  daysOnCover: null, limitAmount: 500000, limitCurrency: 'USD',
  payload: { line_size: 0.1 }, createdAt: new Date(),
}

const PARTICIPATION: Partial<BASectionParticipation> = {
  id: 1, bindingAuthoritySectionId: 1, marketName: 'Syndicate 1234',
  sharePct: 0.25, role: 'lead', createdAt: new Date(),
}

const TRANSACTION: Partial<BATransaction> = {
  id: 1, bindingAuthorityId: 1, type: 'Administrative', status: 'Draft',
  effectiveDate: '2025-01-15', description: 'Q1 premium',
  payload: { sub_type: null },
  createdByOrgCode: ORG, createdAt: new Date(),
}

const RISK: Partial<BASectionAuthorizedRisk> = {
  id: 1, sectionId: 1, riskCode: 'MAR001', createdAt: new Date(),
}

describe('BindingAuthoritiesService', () => {
  let service: BindingAuthoritiesService
  let baRepo: any
  let sectionRepo: any
  let transactionRepo: any
  let participationRepo: any
  let riskRepo: any
  let auditService: any

  beforeEach(async () => {
    const mockQB = () => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    })

    const mockRepo = () => ({
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQB()),
    })

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BindingAuthoritiesService,
        { provide: getRepositoryToken(BindingAuthority), useValue: mockRepo() },
        { provide: getRepositoryToken(BASection), useValue: mockRepo() },
        { provide: getRepositoryToken(BATransaction), useValue: mockRepo() },
        { provide: getRepositoryToken(BASectionParticipation), useValue: mockRepo() },
        { provide: getRepositoryToken(BASectionAuthorizedRisk), useValue: mockRepo() },
        { provide: getRepositoryToken(BADocument), useValue: mockRepo() },
        { provide: getRepositoryToken(BABordereauConfig), useValue: mockRepo() },
        { provide: AuditService, useValue: { getHistory: jest.fn(), writeEvent: jest.fn() } },
        { provide: getDataSourceToken(), useValue: { query: jest.fn() } },
      ],
    }).compile()

    service = module.get(BindingAuthoritiesService)
    baRepo = module.get(getRepositoryToken(BindingAuthority))
    sectionRepo = module.get(getRepositoryToken(BASection))
    transactionRepo = module.get(getRepositoryToken(BATransaction))
    participationRepo = module.get(getRepositoryToken(BASectionParticipation))
    riskRepo = module.get(getRepositoryToken(BASectionAuthorizedRisk))
    auditService = module.get(AuditService)
  })

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('returns all BAs for the org mapped to view shape', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([BA]),
      }
      baRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll(ORG)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 1, reference: 'BA-001', status: 'Active',
        coverholder: 'Alpha Holdings', coverholder_id: 10,
      })
    })

    it('adds search filter when search param provided', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }
      baRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll(ORG, 'alpha')

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(ba.reference)'),
        expect.objectContaining({ search: '%alpha%' }),
      )
    })
  })

  // ---------------------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------------------
  describe('findOne', () => {
    it('returns the BA view when found', async () => {
      baRepo.findOne.mockResolvedValue(BA)
      const result = await service.findOne(ORG, 1)
      expect(result).toMatchObject({ id: 1, reference: 'BA-001' })
    })

    it('throws NotFoundException when not found or wrong org', async () => {
      baRepo.findOne.mockResolvedValue(null)
      await expect(service.findOne(OTHER_ORG, 999)).rejects.toThrow(NotFoundException)
    })
  })

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('creates a BA with coverholder in payload and returns view', async () => {
      const body = { coverholder_id: 10, coverholder: 'Alpha Holdings', inception_date: '2025-01-01', expiry_date: '2025-12-31' }
      baRepo.create.mockReturnValue({ ...BA })
      baRepo.save.mockResolvedValue({ ...BA })

      const result = await service.create(ORG, body, 'user@test.com')

      expect(baRepo.create).toHaveBeenCalled()
      expect(result).toMatchObject({ coverholder: 'Alpha Holdings' })
    })
  })

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('updates status and returns updated view', async () => {
      baRepo.findOne.mockResolvedValue({ ...BA })
      baRepo.save.mockResolvedValue({ ...BA, status: 'Bound' })

      const result = await service.update(ORG, 1, { status: 'Bound' })

      expect(baRepo.save).toHaveBeenCalled()
      expect(result).toMatchObject({ status: 'Bound' })
    })

    it('updates coverholder in payload', async () => {
      baRepo.findOne.mockResolvedValue({ ...BA })
      baRepo.save.mockResolvedValue({ ...BA, payload: { coverholder_id: 20, coverholder: 'Beta Corp' } })

      const result = await service.update(ORG, 1, { coverholder_id: 20, coverholder: 'Beta Corp' })

      expect(baRepo.save).toHaveBeenCalled()
      expect(result).toMatchObject({ coverholder_id: 20 })
    })

    it('throws NotFoundException when BA not found', async () => {
      baRepo.findOne.mockResolvedValue(null)
      await expect(service.update(OTHER_ORG, 999, {})).rejects.toThrow(NotFoundException)
    })
  })

  describe('audit', () => {
    it('returns binding authority audit after ownership check', async () => {
      baRepo.findOne.mockResolvedValue(BA)
      auditService.getHistory.mockResolvedValue([{ action: 'Binding Authority Opened' }])

      const result = await service.getAudit(ORG, 1)

      expect(auditService.getHistory).toHaveBeenCalledWith('Binding Authority', 1)
      expect(result).toEqual([{ action: 'Binding Authority Opened' }])
    })

    it('posts binding authority audit events through AuditService', async () => {
      baRepo.findOne.mockResolvedValue(BA)
      auditService.writeEvent.mockResolvedValue({ created: true })

      const result = await service.postAudit(ORG, 1, { id: 9, username: 'local-admin' }, { action: 'Binding Authority Opened' })

      expect(auditService.writeEvent).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'Binding Authority', entityId: 1, action: 'Binding Authority Opened' }),
        expect.objectContaining({ username: 'local-admin' }),
      )
      expect(result).toEqual({ created: true })
    })

    it('lists active classes of business in name order', async () => {
      baRepo.manager = { query: jest.fn().mockResolvedValue([{ code: 'MARINE', name: 'Marine' }, { code: 'PROPERTY', name: 'Property' }]) }

      const result = await service.listClassesOfBusiness()

      expect(result).toEqual([{ code: 'MARINE', name: 'Marine' }, { code: 'PROPERTY', name: 'Property' }])
    })

    it('lists active currencies in code order', async () => {
      baRepo.manager = { query: jest.fn().mockResolvedValue([{ code: 'EUR' }, { code: 'GBP' }]) }

      const result = await service.listCurrencies()

      expect(result).toEqual(['EUR', 'GBP'])
    })
  })

  // ---------------------------------------------------------------------------
  // getSections
  // ---------------------------------------------------------------------------
  describe('getSections', () => {
    it('returns sections mapped to view shape', async () => {
      baRepo.findOne.mockResolvedValue(BA)
      sectionRepo.find.mockResolvedValue([SECTION])

      const result = await service.getSections(ORG, 1)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 1, binding_authority_id: 1, class_of_business: 'Marine',
        written_premium_limit: 500000, currency: 'USD', line_size: 0.1,
      })
    })

    it('throws NotFoundException for unknown BA', async () => {
      baRepo.findOne.mockResolvedValue(null)
      await expect(service.getSections(OTHER_ORG, 999)).rejects.toThrow(NotFoundException)
    })
  })

  // ---------------------------------------------------------------------------
  // createSection
  // ---------------------------------------------------------------------------
  describe('createSection', () => {
    it('creates a section and returns view', async () => {
      baRepo.findOne.mockResolvedValue(BA)
      sectionRepo.count.mockResolvedValue(0)
      sectionRepo.create.mockReturnValue({ ...SECTION })
      sectionRepo.save.mockResolvedValue({ ...SECTION })

      const result = await service.createSection(ORG, 1, { class_of_business: 'Marine', currency: 'USD' })

      expect(sectionRepo.save).toHaveBeenCalled()
      expect(result).toMatchObject({ binding_authority_id: 1 })
    })

    it('normalises blank section fields to null before save', async () => {
      baRepo.findOne.mockResolvedValue(BA)
      sectionRepo.count.mockResolvedValue(0)
      sectionRepo.create.mockImplementation((payload: any) => payload)
      sectionRepo.save.mockImplementation(async (payload: any) => ({ ...SECTION, ...payload }))

      await service.createSection(ORG, 1, {
        class_of_business: 'Marine',
        time_basis: '',
        inception_date: '',
        expiry_date: '',
        currency: '',
      })

      expect(sectionRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        classOfBusiness: 'Marine',
        timeBasis: null,
        inceptionDate: null,
        expiryDate: null,
        limitCurrency: null,
        limitAmount: null,
      }))
    })
  })

  // ---------------------------------------------------------------------------
  // deleteSection
  // ---------------------------------------------------------------------------
  describe('deleteSection', () => {
    it('removes section when found and org matches', async () => {
      sectionRepo.findOne.mockResolvedValue({ ...SECTION })
      baRepo.findOne.mockResolvedValue(BA)

      await service.deleteSection(ORG, 1)

      expect(sectionRepo.remove).toHaveBeenCalled()
    })

    it('throws NotFoundException when section not found', async () => {
      sectionRepo.findOne.mockResolvedValue(null)
      await expect(service.deleteSection(ORG, 999)).rejects.toThrow(NotFoundException)
    })
  })

  // ---------------------------------------------------------------------------
  // getParticipations
  // ---------------------------------------------------------------------------
  describe('getParticipations', () => {
    it('returns participations mapped to view shape', async () => {
      sectionRepo.findOne.mockResolvedValue(SECTION)
      baRepo.findOne.mockResolvedValue(BA)
      participationRepo.find.mockResolvedValue([PARTICIPATION])

      const result = await service.getParticipations(ORG, 1)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({ id: 1, section_id: 1, syndicate: 'Syndicate 1234', share_percent: 0.25 })
    })
  })

  // ---------------------------------------------------------------------------
  // saveParticipations
  // ---------------------------------------------------------------------------
  describe('saveParticipations', () => {
    it('deletes existing and saves new participations', async () => {
      sectionRepo.findOne.mockResolvedValue(SECTION)
      baRepo.findOne.mockResolvedValue(BA)
      participationRepo.delete.mockResolvedValue({})
      participationRepo.create.mockImplementation((d: any) => d)
      participationRepo.save.mockResolvedValue([{ id: 2, bindingAuthoritySectionId: 1, marketName: 'Lloyd\'s', sharePct: 0.5 }])

      const result = await service.saveParticipations(ORG, 1, [{ syndicate: "Lloyd's", share_percent: 0.5 }])

      expect(participationRepo.delete).toHaveBeenCalledWith({ bindingAuthoritySectionId: 1 })
      expect(result).toHaveLength(1)
    })
  })

  // ---------------------------------------------------------------------------
  // getAuthorizedRiskCodes
  // ---------------------------------------------------------------------------
  describe('getAuthorizedRiskCodes', () => {
    it('returns array of risk code strings', async () => {
      sectionRepo.findOne.mockResolvedValue(SECTION)
      baRepo.findOne.mockResolvedValue(BA)
      riskRepo.find.mockResolvedValue([RISK])

      const result = await service.getAuthorizedRiskCodes(ORG, 1)

      expect(result).toEqual(['MAR001'])
    })
  })

  // ---------------------------------------------------------------------------
  // addAuthorizedRiskCode
  // ---------------------------------------------------------------------------
  describe('addAuthorizedRiskCode', () => {
    it('does not duplicate if code already exists', async () => {
      sectionRepo.findOne.mockResolvedValue(SECTION)
      baRepo.findOne.mockResolvedValue(BA)
      riskRepo.findOne.mockResolvedValue(RISK)

      await service.addAuthorizedRiskCode(ORG, 1, 'MAR001')

      expect(riskRepo.save).not.toHaveBeenCalled()
    })

    it('creates new risk code when not found', async () => {
      sectionRepo.findOne.mockResolvedValue(SECTION)
      baRepo.findOne.mockResolvedValue(BA)
      riskRepo.findOne.mockResolvedValue(null)
      riskRepo.create.mockReturnValue({ sectionId: 1, riskCode: 'MAR002' })
      riskRepo.save.mockResolvedValue({ id: 2, sectionId: 1, riskCode: 'MAR002' })

      await service.addAuthorizedRiskCode(ORG, 1, 'MAR002')

      expect(riskRepo.save).toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // removeAuthorizedRiskCode
  // ---------------------------------------------------------------------------
  describe('removeAuthorizedRiskCode', () => {
    it('deletes the risk code', async () => {
      sectionRepo.findOne.mockResolvedValue(SECTION)
      baRepo.findOne.mockResolvedValue(BA)
      riskRepo.delete.mockResolvedValue({})

      await service.removeAuthorizedRiskCode(ORG, 1, 'MAR001')

      expect(riskRepo.delete).toHaveBeenCalledWith({ sectionId: 1, riskCode: 'MAR001' })
    })
  })

  // ---------------------------------------------------------------------------
  // getTransactions
  // ---------------------------------------------------------------------------
  describe('getTransactions', () => {
    it('returns transactions mapped to view shape', async () => {
      baRepo.findOne.mockResolvedValue(BA)
      transactionRepo.find.mockResolvedValue([TRANSACTION])

      const result = await service.getTransactions(ORG, 1)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 1, binding_authority_id: 1, type: 'Administrative', status: 'Draft',
        effective_date: '2025-01-15', description: 'Q1 premium',
      })
    })
  })

  // ---------------------------------------------------------------------------
  // createTransaction
  // ---------------------------------------------------------------------------
  describe('createTransaction', () => {
    it('creates transaction with status Draft by default (REQ-BA-FE-F-136)', async () => {
      baRepo.findOne.mockResolvedValue(BA)
      // Override QB mock to return null (no duplicate draft) for Administrative type check
      transactionRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      })
      const createSpy = jest.spyOn(transactionRepo, 'create')
      transactionRepo.create.mockReturnValue({ ...TRANSACTION, status: 'Draft' })
      transactionRepo.save.mockResolvedValue({ ...TRANSACTION, status: 'Draft' })

      await service.createTransaction(ORG, 1, { type: 'Administrative' }, 'user@test.com')

      expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'Draft' }))
      expect(transactionRepo.save).toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // updateTransaction
  // ---------------------------------------------------------------------------
  describe('updateTransaction', () => {
    it('updates transaction fields and returns view', async () => {
      baRepo.findOne.mockResolvedValue(BA)
      transactionRepo.findOne.mockResolvedValue({ ...TRANSACTION })
      transactionRepo.save.mockResolvedValue({ ...TRANSACTION, type: 'Contractual', payload: { sub_type: 'Section Addition' } })

      const result = await service.updateTransaction(ORG, 1, 1, { type: 'Contractual', sub_type: 'Section Addition' })

      expect(transactionRepo.save).toHaveBeenCalled()
      expect(result).toMatchObject({ type: 'Contractual' })
    })

    it('throws NotFoundException when transaction not found', async () => {
      baRepo.findOne.mockResolvedValue(BA)
      transactionRepo.findOne.mockResolvedValue(null)
      await expect(service.updateTransaction(ORG, 1, 999, {})).rejects.toThrow(NotFoundException)
    })
  })
})
