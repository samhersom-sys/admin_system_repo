import {
    Controller, Get, Post, Put, Param, Body, Req,
    UseGuards, ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common'
import { PoliciesService } from './policies.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

/**
 * PoliciesController — /api/policies
 *
 * Requirements: backend/nest/src/policies/policies.requirements.md
 * REQ-POL-BE-F-001 to F-015
 */
@Controller('policies')
@UseGuards(JwtAuthGuard)
export class PoliciesController {
    constructor(private readonly policiesService: PoliciesService) { }

    // REQ-POL-BE-F-001 — GET /api/policies
    @Get()
    findAll(@Req() req: any) {
        return this.policiesService.findAll(req.user.orgCode)
    }

    // REQ-POL-BE-F-002 — GET /api/policies/:id
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.policiesService.findOne(id, req.user.orgCode)
    }

    // REQ-POL-BE-F-003 — POST /api/policies
    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Req() req: any, @Body() body: any) {
        return this.policiesService.create(
            req.user.orgCode,
            body,
            req.user.name ?? req.user.username ?? null,
        )
    }

    // REQ-POL-BE-F-004 — PUT /api/policies/:id
    @Put(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: any,
        @Body() body: any,
    ) {
        return this.policiesService.update(
            id,
            req.user.orgCode,
            body,
            req.user.name ?? req.user.username ?? null,
        )
    }

    // REQ-POL-BE-F-005 — GET /api/policies/:id/sections
    @Get(':id/sections')
    getSections(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.policiesService.getSections(id, req.user.orgCode)
    }

    // REQ-POL-BE-F-006 — GET /api/policies/:id/sections/:sectionId
    @Get(':id/sections/:sectionId')
    getSectionDetail(
        @Param('id', ParseIntPipe) id: number,
        @Param('sectionId', ParseIntPipe) sectionId: number,
        @Req() req: any,
    ) {
        return this.policiesService.getSectionDetail(id, sectionId, req.user.orgCode)
    }

    // REQ-POL-BE-F-007 — GET /api/policies/:id/invoices
    @Get(':id/invoices')
    getInvoices(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.policiesService.getInvoices(id, req.user.orgCode)
    }

    // REQ-POL-BE-F-008 — GET /api/policies/:id/transactions
    @Get(':id/transactions')
    getTransactions(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.policiesService.getTransactions(id, req.user.orgCode)
    }

    // REQ-POL-BE-F-009 — GET /api/policies/:id/audit
    @Get(':id/audit')
    getAudit(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.policiesService.getAudit(id, req.user.orgCode)
    }

    // REQ-POL-BE-F-010 — POST /api/policies/:id/audit
    @Post(':id/audit')
    @HttpCode(HttpStatus.CREATED)
    postAudit(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: any,
        @Body() body: any,
    ) {
        return this.policiesService.postAudit(
            id,
            req.user.orgCode,
            req.user,
            body,
        )
    }

    // REQ-POL-BE-F-011 — GET /api/policies/:id/endorsements
    @Get(':id/endorsements')
    getEndorsements(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.policiesService.getEndorsements(id, req.user.orgCode)
    }

    // REQ-POL-BE-F-012 — POST /api/policies/:id/endorsements
    @Post(':id/endorsements')
    @HttpCode(HttpStatus.CREATED)
    createEndorsement(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: any,
        @Body() body: any,
    ) {
        return this.policiesService.createEndorsement(
            id,
            req.user.orgCode,
            body,
            req.user.name ?? req.user.username ?? null,
        )
    }

    // REQ-POL-BE-F-013 — PUT /api/policies/:id/endorsements/:endorsementId/issue
    @Put(':id/endorsements/:endorsementId/issue')
    @HttpCode(HttpStatus.OK)
    issueEndorsement(
        @Param('id', ParseIntPipe) id: number,
        @Param('endorsementId', ParseIntPipe) endorsementId: number,
        @Req() req: any,
    ) {
        return this.policiesService.issueEndorsement(
            id,
            endorsementId,
            req.user.orgCode,
            req.user.name ?? req.user.username ?? null,
        )
    }

    // REQ-POL-BE-F-014 — GET /api/policies/:id/sections/:sectionId/coverages
    @Get(':id/sections/:sectionId/coverages')
    getCoverages(
        @Param('id', ParseIntPipe) id: number,
        @Param('sectionId', ParseIntPipe) sectionId: number,
        @Req() req: any,
    ) {
        return this.policiesService.getCoverages(id, sectionId, req.user.orgCode)
    }

    // REQ-POL-BE-F-015 — GET /api/policies/:id/locations
    @Get(':id/locations')
    getLocations(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.policiesService.getLocations(id, req.user.orgCode)
    }
}
