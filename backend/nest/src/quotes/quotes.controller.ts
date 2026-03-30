import {
    Controller, Get, Post, Put, Delete, Param, Body, Query,
    Req, UseGuards, ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common'
import { QuotesService } from './quotes.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Controller('quotes')
@UseGuards(JwtAuthGuard)
export class QuotesController {
    constructor(private readonly quotesService: QuotesService) { }

    @Get()
    findAll(
        @Req() req: any,
        @Query('submission_id') submissionId?: string,
        @Query('status') status?: string,
    ) {
        return this.quotesService.findAll(req.user.orgCode, submissionId, status)
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Req() req: any, @Body() body: any) {
        return this.quotesService.create(
            req.user.orgCode,
            body,
            req.user.orgCode,
            req.user.name ?? req.user.username ?? null,
        )
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.quotesService.findOne(id, req.user.orgCode, req.user.name ?? req.user.username ?? null)
    }

    @Put(':id')
    update(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Body() body: any) {
        return this.quotesService.update(id, req.user.orgCode, body, req.user.name ?? req.user.username ?? null)
    }

    @Post(':id/quote')
    @HttpCode(HttpStatus.OK)
    markQuoted(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.quotesService.markQuoted(id, req.user.orgCode, req.user.name ?? req.user.username ?? null)
    }

    @Post(':id/bind')
    @HttpCode(HttpStatus.OK)
    bind(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.quotesService.bind(id, req.user.orgCode, req.user.name ?? req.user.username ?? null)
    }

    @Post(':id/decline')
    @HttpCode(HttpStatus.OK)
    decline(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Body() body: any) {
        return this.quotesService.decline(id, req.user.orgCode, body, req.user.name ?? req.user.username ?? null)
    }

    // REQ-QUO-BE-F-030 to F-036 — Audit endpoints
    @Get(':id/audit')
    getAudit(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.quotesService.getAudit(
            id,
            req.user.orgCode,
            req.user.name ?? req.user.username ?? null,
        )
    }

    @Post(':id/audit')
    @HttpCode(HttpStatus.CREATED)
    postAudit(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Body() body: any) {
        return this.quotesService.postAudit(id, req.user.orgCode, req.user, body)
    }

    // R12 — GET /api/quotes/:id/sections
    @Get(':id/sections')
    listSections(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.quotesService.listSections(id, req.user.orgCode, req.user.name ?? req.user.username ?? null)
    }

    // R13 — POST /api/quotes/:id/sections
    @Post(':id/sections')
    @HttpCode(HttpStatus.CREATED)
    createSection(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Body() body: any) {
        return this.quotesService.createSection(id, req.user.orgCode, req.user.name ?? req.user.username ?? null, body)
    }

    // R15 — PUT /api/quotes/:id/sections/:sectionId
    @Put(':id/sections/:sectionId')
    updateSection(
        @Param('id', ParseIntPipe) id: number,
        @Param('sectionId', ParseIntPipe) sectionId: number,
        @Req() req: any,
        @Body() body: any,
    ) {
        return this.quotesService.updateSection(id, sectionId, req.user.orgCode, req.user.name ?? req.user.username ?? null, body)
    }

    // R14 — DELETE /api/quotes/:id/sections/:sectionId
    @Delete(':id/sections/:sectionId')
    @HttpCode(HttpStatus.OK)
    deleteSection(
        @Param('id', ParseIntPipe) id: number,
        @Param('sectionId', ParseIntPipe) sectionId: number,
        @Req() req: any,
    ) {
        return this.quotesService.deleteSection(id, sectionId, req.user.orgCode, req.user.name ?? req.user.username ?? null)
    }

    // R11 — POST /api/quotes/:id/copy
    @Post(':id/copy')
    @HttpCode(HttpStatus.CREATED)
    copy(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.quotesService.copy(id, req.user.orgCode, req.user.name ?? req.user.username ?? null)
    }

    // R15 — GET /api/quotes/:quoteId/sections/:sectionId/risk-codes
    @Get(':quoteId/sections/:sectionId/risk-codes')
    listRiskCodes(
        @Param('quoteId', ParseIntPipe) quoteId: number,
        @Param('sectionId', ParseIntPipe) sectionId: number,
        @Req() req: any,
    ) {
        return this.quotesService.listRiskCodes(quoteId, sectionId, req.user.orgCode)
    }

    // R16 — POST /api/quotes/:quoteId/sections/:sectionId/risk-codes
    @Post(':quoteId/sections/:sectionId/risk-codes')
    @HttpCode(HttpStatus.CREATED)
    addRiskCode(
        @Param('quoteId', ParseIntPipe) quoteId: number,
        @Param('sectionId', ParseIntPipe) sectionId: number,
        @Req() req: any,
        @Body() body: any,
    ) {
        return this.quotesService.addRiskCode(quoteId, sectionId, req.user.orgCode, body)
    }

    // R17 — DELETE /api/quotes/:quoteId/sections/:sectionId/risk-codes/:code
    @Delete(':quoteId/sections/:sectionId/risk-codes/:code')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteRiskCode(
        @Param('quoteId', ParseIntPipe) quoteId: number,
        @Param('sectionId', ParseIntPipe) sectionId: number,
        @Param('code') code: string,
        @Req() req: any,
    ) {
        await this.quotesService.deleteRiskCode(quoteId, sectionId, req.user.orgCode, code)
    }
}
