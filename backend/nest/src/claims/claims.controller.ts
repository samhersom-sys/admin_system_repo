import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { ClaimsService } from './claims.service'

@UseGuards(JwtAuthGuard)
@Controller('claims')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) { }

  @Get()
  findAll(@Request() req: any) {
    return this.claimsService.findAll(req.user.orgCode)
  }

  @Post()
  create(@Request() req: any, @Body() body: Record<string, any>) {
    return this.claimsService.create(req.user.orgCode, body)
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.claimsService.findOne(req.user.orgCode, id)
  }

  @Put(':id')
  update(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, any>,
  ) {
    return this.claimsService.update(req.user.orgCode, id, body)
  }

  @Get(':id/transactions')
  getTransactions(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.claimsService.getTransactions(req.user.orgCode, id)
  }

  @Post(':id/transactions')
  addTransaction(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, any>,
  ) {
    return this.claimsService.addTransaction(req.user.orgCode, id, body)
  }

  @Get(':id/audit')
  getAudit(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.claimsService.getAudit(req.user.orgCode, id)
  }

  @Post(':id/audit')
  postAudit(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { action: string },
  ) {
    return this.claimsService.postAudit(
      req.user.orgCode,
      id,
      body.action,
      req.user.email ?? req.user.username,
      req.user.id ?? null,
    )
  }
}
