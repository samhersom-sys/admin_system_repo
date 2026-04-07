import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { FinanceCashBatch } from '../entities/finance-cash-batch.entity'
import { FinanceInvoice } from '../entities/finance-invoice.entity'
import { FinancePayment } from '../entities/finance-payment.entity'
import { FinanceService } from './finance.service'
import { FinanceController } from './finance.controller'

@Module({
  imports: [TypeOrmModule.forFeature([FinanceCashBatch, FinanceInvoice, FinancePayment])],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule { }
