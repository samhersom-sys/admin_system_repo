import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { FinanceCashBatch } from '../entities/finance-cash-batch.entity'
import { FinanceInvoice } from '../entities/finance-invoice.entity'
import { FinancePayment } from '../entities/finance-payment.entity'

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(FinanceCashBatch)
    private readonly cashBatchRepo: Repository<FinanceCashBatch>,
    @InjectRepository(FinanceInvoice)
    private readonly invoiceRepo: Repository<FinanceInvoice>,
    @InjectRepository(FinancePayment)
    private readonly paymentRepo: Repository<FinancePayment>,
  ) { }

  async getSummary(orgCode: string) {
    const [cashBatches, invoices, payments] = await Promise.all([
      this.cashBatchRepo.find({ where: { orgCode } }),
      this.invoiceRepo.find({ where: { orgCode } }),
      this.paymentRepo.find({ where: { orgCode } }),
    ])

    const outstandingCash = cashBatches.reduce((sum, cb) => sum + Number(cb.remaining ?? 0), 0)
    const outstandingInvoices = invoices.reduce((sum, inv) => sum + Number(inv.outstanding ?? 0), 0)
    const pendingPayments = payments.filter(p => p.status === 'pending').length
    const totalReceivables = outstandingCash + outstandingInvoices

    return { outstandingCash, outstandingInvoices, pendingPayments, totalReceivables }
  }

  async getCashBatches(orgCode: string): Promise<FinanceCashBatch[]> {
    return this.cashBatchRepo.find({ where: { orgCode }, order: { createdAt: 'DESC' } })
  }

  async createCashBatch(orgCode: string, body: Record<string, unknown>): Promise<FinanceCashBatch> {
    const entity = this.cashBatchRepo.create({ ...body, orgCode })
    return this.cashBatchRepo.save(entity)
  }

  async updateCashBatch(orgCode: string, id: number, body: Record<string, unknown>): Promise<FinanceCashBatch> {
    const existing = await this.cashBatchRepo.findOne({ where: { id, orgCode } })
    if (!existing) throw new NotFoundException(`Cash batch ${id} not found`)
    Object.assign(existing, body)
    return this.cashBatchRepo.save(existing)
  }

  async getInvoices(orgCode: string): Promise<FinanceInvoice[]> {
    return this.invoiceRepo.find({ where: { orgCode }, order: { createdAt: 'DESC' } })
  }

  async createInvoice(orgCode: string, body: Record<string, unknown>): Promise<FinanceInvoice> {
    const entity = this.invoiceRepo.create({ ...body, orgCode })
    return this.invoiceRepo.save(entity)
  }

  async updateInvoice(orgCode: string, id: number, body: Record<string, unknown>): Promise<FinanceInvoice> {
    const existing = await this.invoiceRepo.findOne({ where: { id, orgCode } })
    if (!existing) throw new NotFoundException(`Invoice ${id} not found`)
    Object.assign(existing, body)
    return this.invoiceRepo.save(existing)
  }

  async getPayments(orgCode: string): Promise<FinancePayment[]> {
    return this.paymentRepo.find({ where: { orgCode }, order: { createdAt: 'DESC' } })
  }

  async createPayment(orgCode: string, body: Record<string, unknown>): Promise<FinancePayment> {
    const entity = this.paymentRepo.create({ ...body, orgCode })
    return this.paymentRepo.save(entity)
  }

  async getTrialBalance(orgCode: string): Promise<Array<{ account: string; debit: number; credit: number }>> {
    const [invoices, cashBatches, payments] = await Promise.all([
      this.invoiceRepo.find({ where: { orgCode } }),
      this.cashBatchRepo.find({ where: { orgCode } }),
      this.paymentRepo.find({ where: { orgCode } }),
    ])

    const rows: Array<{ account: string; debit: number; credit: number }> = []

    const premiumInvoices = invoices.filter(i => i.type === 'premium')
    if (premiumInvoices.length > 0) {
      rows.push({
        account: 'Premium Receivable',
        debit: premiumInvoices.reduce((s, i) => s + Number(i.outstanding ?? 0), 0),
        credit: premiumInvoices.reduce((s, i) => s + (Number(i.amount ?? 0) - Number(i.outstanding ?? 0)), 0),
      })
    }

    if (cashBatches.length > 0) {
      rows.push({
        account: 'Cash Received',
        debit: cashBatches.reduce((s, cb) => s + Number(cb.allocated ?? 0), 0),
        credit: cashBatches.reduce((s, cb) => s + Number(cb.remaining ?? 0), 0),
      })
    }

    const outPayments = payments.filter(p => p.type === 'outgoing')
    if (outPayments.length > 0) {
      rows.push({
        account: 'Payments Made',
        debit: outPayments.reduce((s, p) => s + Number(p.amount ?? 0), 0),
        credit: 0,
      })
    }

    return rows
  }
}
