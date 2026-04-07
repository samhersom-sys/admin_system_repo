import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { BindingAuthoritiesService } from './binding-authorities.service'

@Controller()
@UseGuards(JwtAuthGuard)
export class BindingAuthoritiesController {
  constructor(private readonly baService: BindingAuthoritiesService) { }

  // ------------------------------------------------------------------
  // Binding Authorities
  // ------------------------------------------------------------------

  @Get('binding-authorities')
  findAll(@Req() req: any, @Query('search') search?: string) {
    return this.baService.findAll(req.user.orgCode, search)
  }

  @Get('binding-authorities/:id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.baService.findOne(req.user.orgCode, +id)
  }

  @Post('binding-authorities')
  @HttpCode(201)
  create(@Req() req: any, @Body() body: Record<string, unknown>) {
    return this.baService.create(req.user.orgCode, body, req.user.name ?? req.user.email)
  }

  @Put('binding-authorities/:id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.baService.update(req.user.orgCode, +id, body)
  }

  // ------------------------------------------------------------------
  // Sections
  // ------------------------------------------------------------------

  @Get('binding-authorities/:id/sections')
  getSections(@Req() req: any, @Param('id') id: string) {
    return this.baService.getSections(req.user.orgCode, +id)
  }

  @Post('binding-authorities/:id/sections')
  @HttpCode(201)
  createSection(@Req() req: any, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.baService.createSection(req.user.orgCode, +id, body)
  }

  @Put('binding-authority-sections/:id')
  updateSection(@Req() req: any, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.baService.updateSection(req.user.orgCode, +id, body)
  }

  @Delete('binding-authority-sections/:id')
  @HttpCode(204)
  deleteSection(@Req() req: any, @Param('id') id: string) {
    return this.baService.deleteSection(req.user.orgCode, +id)
  }

  // ------------------------------------------------------------------
  // Participations
  // ------------------------------------------------------------------

  @Get('binding-authority-sections/:id/participations')
  getParticipations(@Req() req: any, @Param('id') id: string) {
    return this.baService.getParticipations(req.user.orgCode, +id)
  }

  @Post('binding-authority-sections/:id/participations')
  @HttpCode(200)
  saveParticipations(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>[],
  ) {
    return this.baService.saveParticipations(req.user.orgCode, +id, body)
  }

  // ------------------------------------------------------------------
  // Authorized Risk Codes
  // ------------------------------------------------------------------

  @Get('binding-authority-sections/:id/authorized-risk-codes')
  getAuthorizedRiskCodes(@Req() req: any, @Param('id') id: string) {
    return this.baService.getAuthorizedRiskCodes(req.user.orgCode, +id)
  }

  @Post('binding-authority-sections/:id/authorized-risk-codes')
  @HttpCode(201)
  addAuthorizedRiskCode(
    @Req() req: any,
    @Param('id') id: string,
    @Body('code') code: string,
  ) {
    return this.baService.addAuthorizedRiskCode(req.user.orgCode, +id, code)
  }

  @Delete('binding-authority-sections/:id/authorized-risk-codes/:code')
  @HttpCode(204)
  removeAuthorizedRiskCode(
    @Req() req: any,
    @Param('id') id: string,
    @Param('code') code: string,
  ) {
    return this.baService.removeAuthorizedRiskCode(req.user.orgCode, +id, code)
  }

  // ------------------------------------------------------------------
  // Transactions
  // ------------------------------------------------------------------

  @Get('binding-authorities/:id/transactions')
  getTransactions(@Req() req: any, @Param('id') id: string) {
    return this.baService.getTransactions(req.user.orgCode, +id)
  }

  @Post('binding-authorities/:id/transactions')
  @HttpCode(201)
  createTransaction(@Req() req: any, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.baService.createTransaction(req.user.orgCode, +id, body, req.user.name ?? req.user.email)
  }

  @Put('binding-authorities/:id/transactions/:transId')
  updateTransaction(
    @Req() req: any,
    @Param('id') id: string,
    @Param('transId') transId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.baService.updateTransaction(req.user.orgCode, +id, +transId, body)
  }
}
