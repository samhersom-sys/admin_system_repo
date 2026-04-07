import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Req,
  HttpCode,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { FinanceService } from './finance.service'

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) { }

  @Get('summary')
  getSummary(@Req() req: any) {
    return this.financeService.getSummary(req.user.orgCode)
  }

  @Get('cash-batches')
  getCashBatches(@Req() req: any) {
    return this.financeService.getCashBatches(req.user.orgCode)
  }

  @Post('cash-batches')
  @HttpCode(201)
  createCashBatch(@Req() req: any, @Body() body: Record<string, unknown>) {
    return this.financeService.createCashBatch(req.user.orgCode, body)
  }

  @Put('cash-batches/:id')
  updateCashBatch(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.financeService.updateCashBatch(req.user.orgCode, +id, body)
  }

  @Get('invoices')
  getInvoices(@Req() req: any) {
    return this.financeService.getInvoices(req.user.orgCode)
  }

  @Post('invoices')
  @HttpCode(201)
  createInvoice(@Req() req: any, @Body() body: Record<string, unknown>) {
    return this.financeService.createInvoice(req.user.orgCode, body)
  }

  @Put('invoices/:id')
  updateInvoice(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.financeService.updateInvoice(req.user.orgCode, +id, body)
  }

  @Get('payments')
  getPayments(@Req() req: any) {
    return this.financeService.getPayments(req.user.orgCode)
  }

  @Post('payments')
  @HttpCode(201)
  createPayment(@Req() req: any, @Body() body: Record<string, unknown>) {
    return this.financeService.createPayment(req.user.orgCode, body)
  }

  @Get('trial-balance')
  getTrialBalance(@Req() req: any) {
    return this.financeService.getTrialBalance(req.user.orgCode)
  }
}
