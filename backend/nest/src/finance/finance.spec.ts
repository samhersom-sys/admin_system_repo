import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { NotFoundException } from '@nestjs/common'
import { FinanceService } from './finance.service'
import { FinanceCashBatch } from '../entities/finance-cash-batch.entity'
import { FinanceInvoice } from '../entities/finance-invoice.entity'
import { FinancePayment } from '../entities/finance-payment.entity'

const ORG = 'ORG1'
const OTHER_ORG = 'ORG2'

const CASH_BATCH: Partial<FinanceCashBatch> = {
  id: 1, orgCode: ORG, reference: 'CB-001', amount: 5000, currency: 'USD',
  allocated: 2000, remaining: 3000, status: 'open', assignedTo: null,
  createdDate: new Date(), createdAt: new Date(),
}

const INVOICE: Partial<FinanceInvoice> = {
  id: 1, orgCode: ORG, reference: 'INV-001', type: 'premium',
  policyReference: 'POL-001', policyId: null, insuredName: 'Acme Corp',
  amount: 10000, outstanding: 8000, status: 'outstanding',
  dueDate: '2025-06-30', issueDate: '2025-01-01', currency: 'USD',
  createdAt: new Date(),
}

const PAYMENT: Partial<FinancePayment> = {
  id: 1, orgCode: ORG, reference: 'PAY-001', type: 'incoming',
  source: 'broker', amount: 5000, currency: 'USD',
  method: 'bank_transfer', status: 'paid', date: '2025-01-15',
  createdAt: new Date(),
}

describe('FinanceService', () => {
  let service: FinanceService
  let cashBatchRepo: jest.Mocked<Repository<FinanceCashBatch>>
  let invoiceRepo: jest.Mocked<Repository<FinanceInvoice>>
  let paymentRepo: jest.Mocked<Repository<FinancePayment>>

  beforeEach(async () => {
    const mockRepo = () => ({
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    })

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceService,
        { provide: getRepositoryToken(FinanceCashBatch), useValue: mockRepo() },
        { provide: getRepositoryToken(FinanceInvoice), useValue: mockRepo() },
        { provide: getRepositoryToken(FinancePayment), useValue: mockRepo() },
      ],
    }).compile()

    service = module.get(FinanceService)
    cashBatchRepo = module.get(getRepositoryToken(FinanceCashBatch))
    invoiceRepo = module.get(getRepositoryToken(FinanceInvoice))
    paymentRepo = module.get(getRepositoryToken(FinancePayment))
  })

  // ---------------------------------------------------------------------------
  // getSummary
  // ---------------------------------------------------------------------------
  describe('getSummary', () => {
    it('aggregates outstanding cash, invoices, pending payments and total receivables', async () => {
      cashBatchRepo.find.mockResolvedValue([CASH_BATCH] as any)
      invoiceRepo.find.mockResolvedValue([INVOICE] as any)
      paymentRepo.find.mockResolvedValue([{ ...PAYMENT, status: 'pending' }] as any)

      const result = await service.getSummary(ORG)

      expect(result.outstandingCash).toBe(3000)
      expect(result.outstandingInvoices).toBe(8000)
      expect(result.pendingPayments).toBe(1)
      expect(result.totalReceivables).toBe(11000)
    })

    it('returns zero totals when no records exist', async () => {
      cashBatchRepo.find.mockResolvedValue([])
      invoiceRepo.find.mockResolvedValue([])
      paymentRepo.find.mockResolvedValue([])

      const result = await service.getSummary(ORG)

      expect(result.outstandingCash).toBe(0)
      expect(result.outstandingInvoices).toBe(0)
      expect(result.pendingPayments).toBe(0)
      expect(result.totalReceivables).toBe(0)
    })

    it('only counts payments with status=pending in pendingPayments', async () => {
      cashBatchRepo.find.mockResolvedValue([])
      invoiceRepo.find.mockResolvedValue([])
      paymentRepo.find.mockResolvedValue([
        { ...PAYMENT, status: 'paid' },
        { ...PAYMENT, id: 2, status: 'pending' },
        { ...PAYMENT, id: 3, status: 'pending' },
      ] as any)

      const result = await service.getSummary(ORG)
      expect(result.pendingPayments).toBe(2)
    })
  })

  // ---------------------------------------------------------------------------
  // getCashBatches
  // ---------------------------------------------------------------------------
  describe('getCashBatches', () => {
    it('returns all cash batches for the org', async () => {
      cashBatchRepo.find.mockResolvedValue([CASH_BATCH] as any)
      const result = await service.getCashBatches(ORG)
      expect(result).toHaveLength(1)
      expect(cashBatchRepo.find).toHaveBeenCalledWith({ where: { orgCode: ORG }, order: { createdAt: 'DESC' } })
    })
  })

  // ---------------------------------------------------------------------------
  // createCashBatch
  // ---------------------------------------------------------------------------
  describe('createCashBatch', () => {
    it('creates and saves a cash batch with the org code', async () => {
      const body = { reference: 'CB-002', amount: 1000, currency: 'GBP' }
      cashBatchRepo.create.mockReturnValue({ ...body, orgCode: ORG } as any)
      cashBatchRepo.save.mockResolvedValue({ id: 2, ...body, orgCode: ORG } as any)

      const result = await service.createCashBatch(ORG, body)

      expect(cashBatchRepo.create).toHaveBeenCalledWith({ ...body, orgCode: ORG })
      expect(result).toMatchObject({ id: 2, orgCode: ORG })
    })
  })

  // ---------------------------------------------------------------------------
  // updateCashBatch
  // ---------------------------------------------------------------------------
  describe('updateCashBatch', () => {
    it('updates status and returns the updated cash batch', async () => {
      cashBatchRepo.findOne.mockResolvedValue({ ...CASH_BATCH } as any)
      cashBatchRepo.save.mockResolvedValue({ ...CASH_BATCH, status: 'allocated' } as any)

      const result = await service.updateCashBatch(ORG, 1, { status: 'allocated' })

      expect(result.status).toBe('allocated')
    })

    it('throws NotFoundException when cash batch not found or wrong org', async () => {
      cashBatchRepo.findOne.mockResolvedValue(null)
      await expect(service.updateCashBatch(OTHER_ORG, 999, {})).rejects.toThrow(NotFoundException)
    })
  })

  // ---------------------------------------------------------------------------
  // getInvoices
  // ---------------------------------------------------------------------------
  describe('getInvoices', () => {
    it('returns all invoices for the org', async () => {
      invoiceRepo.find.mockResolvedValue([INVOICE] as any)
      const result = await service.getInvoices(ORG)
      expect(result).toHaveLength(1)
      expect(invoiceRepo.find).toHaveBeenCalledWith({ where: { orgCode: ORG }, order: { createdAt: 'DESC' } })
    })
  })

  // ---------------------------------------------------------------------------
  // createInvoice
  // ---------------------------------------------------------------------------
  describe('createInvoice', () => {
    it('creates and saves an invoice with org code', async () => {
      const body = { reference: 'INV-002', type: 'broker_fee', amount: 500 }
      invoiceRepo.create.mockReturnValue({ ...body, orgCode: ORG } as any)
      invoiceRepo.save.mockResolvedValue({ id: 2, ...body, orgCode: ORG } as any)

      const result = await service.createInvoice(ORG, body)

      expect(invoiceRepo.create).toHaveBeenCalledWith({ ...body, orgCode: ORG })
      expect(result).toMatchObject({ id: 2, orgCode: ORG })
    })
  })

  // ---------------------------------------------------------------------------
  // updateInvoice
  // ---------------------------------------------------------------------------
  describe('updateInvoice', () => {
    it('updates outstanding amount and returns the invoice', async () => {
      invoiceRepo.findOne.mockResolvedValue({ ...INVOICE } as any)
      invoiceRepo.save.mockResolvedValue({ ...INVOICE, outstanding: 5000 } as any)

      const result = await service.updateInvoice(ORG, 1, { outstanding: 5000 })

      expect(result.outstanding).toBe(5000)
    })

    it('throws NotFoundException when invoice not found', async () => {
      invoiceRepo.findOne.mockResolvedValue(null)
      await expect(service.updateInvoice(ORG, 999, {})).rejects.toThrow(NotFoundException)
    })
  })

  // ---------------------------------------------------------------------------
  // getPayments
  // ---------------------------------------------------------------------------
  describe('getPayments', () => {
    it('returns all payments for the org', async () => {
      paymentRepo.find.mockResolvedValue([PAYMENT] as any)
      const result = await service.getPayments(ORG)
      expect(result).toHaveLength(1)
    })
  })

  // ---------------------------------------------------------------------------
  // createPayment
  // ---------------------------------------------------------------------------
  describe('createPayment', () => {
    it('creates and saves a payment with org code', async () => {
      const body = { reference: 'PAY-002', amount: 2500, currency: 'USD', method: 'cheque' }
      paymentRepo.create.mockReturnValue({ ...body, orgCode: ORG } as any)
      paymentRepo.save.mockResolvedValue({ id: 2, ...body, orgCode: ORG } as any)

      const result = await service.createPayment(ORG, body)

      expect(paymentRepo.create).toHaveBeenCalledWith({ ...body, orgCode: ORG })
      expect(result).toMatchObject({ id: 2, orgCode: ORG })
    })
  })

  // ---------------------------------------------------------------------------
  // getTrialBalance
  // ---------------------------------------------------------------------------
  describe('getTrialBalance', () => {
    it('returns Premium Receivable row for premium invoices', async () => {
      invoiceRepo.find.mockResolvedValue([INVOICE] as any)       // amount=10000, outstanding=8000
      cashBatchRepo.find.mockResolvedValue([])
      paymentRepo.find.mockResolvedValue([])

      const result = await service.getTrialBalance(ORG)

      expect(result).toHaveLength(1)
      expect(result[0].account).toBe('Premium Receivable')
      expect(result[0].debit).toBe(8000)
      expect(result[0].credit).toBe(2000)
    })

    it('returns Cash Received row for cash batches', async () => {
      invoiceRepo.find.mockResolvedValue([])
      cashBatchRepo.find.mockResolvedValue([CASH_BATCH] as any)  // allocated=2000, remaining=3000
      paymentRepo.find.mockResolvedValue([])

      const result = await service.getTrialBalance(ORG)

      expect(result).toHaveLength(1)
      expect(result[0].account).toBe('Cash Received')
      expect(result[0].debit).toBe(2000)
      expect(result[0].credit).toBe(3000)
    })

    it('returns Payments Made row for outgoing payments', async () => {
      invoiceRepo.find.mockResolvedValue([])
      cashBatchRepo.find.mockResolvedValue([])
      paymentRepo.find.mockResolvedValue([{ ...PAYMENT, type: 'outgoing', amount: 3000 }] as any)

      const result = await service.getTrialBalance(ORG)

      expect(result).toHaveLength(1)
      expect(result[0].account).toBe('Payments Made')
      expect(result[0].debit).toBe(3000)
      expect(result[0].credit).toBe(0)
    })

    it('returns empty array when no data', async () => {
      invoiceRepo.find.mockResolvedValue([])
      cashBatchRepo.find.mockResolvedValue([])
      paymentRepo.find.mockResolvedValue([])
      const result = await service.getTrialBalance(ORG)
      expect(result).toEqual([])
    })
  })
})
