import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    Req,
    UseGuards,
    HttpCode,
    HttpStatus,
    ParseIntPipe,
} from '@nestjs/common'
import { ReportingService } from './reporting.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

/**
 * ReportingController — /api/report-templates and /api/report-field-mappings
 *
 * All routes are protected by JwtAuthGuard.
 * Org-scoping is enforced by the service using req.user.orgCode from JWT.
 *
 * Routes:
 *   GET    /api/report-templates              R01 — list all accessible templates
 *   GET    /api/report-templates/:id          R02 — get single template
 *   POST   /api/report-templates              R03 — create custom template
 *   PUT    /api/report-templates/:id          R04 — update custom template
 *   DELETE /api/report-templates/:id          R05 — delete custom template
 *   POST   /api/report-templates/:id/run      R06 — execute report
 *   GET    /api/report-templates/:id/history  R07 — execution history
 *   GET    /api/report-field-mappings/:domain R08 — semantic field list
 *   GET    /api/date-basis                    R09 — date basis options
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class ReportingController {
    constructor(private readonly reportingService: ReportingService) { }

    // R01 — List templates (core + org-scoped custom)
    @Get('report-templates')
    findAll(@Req() req: any) {
        return this.reportingService.findAll(req.user.orgCode)
    }

    // R02 — Get single template
    @Get('report-templates/:id')
    findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
        return this.reportingService.findOne(req.user.orgCode, id)
    }

    // R03 — Create custom template
    @Post('report-templates')
    @HttpCode(HttpStatus.CREATED)
    create(@Req() req: any, @Body() body: Record<string, any>) {
        return this.reportingService.create(req.user.orgCode, body, req.user.username)
    }

    // R04 — Update custom template
    @Put('report-templates/:id')
    update(
        @Req() req: any,
        @Param('id', ParseIntPipe) id: number,
        @Body() body: Record<string, any>,
    ) {
        return this.reportingService.update(req.user.orgCode, id, body)
    }

    // R05 — Delete custom template
    @Delete('report-templates/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
        return this.reportingService.remove(req.user.orgCode, id)
    }

    // R06 — Execute (run) a report
    @Post('report-templates/:id/run')
    @HttpCode(HttpStatus.OK)
    run(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
        return this.reportingService.run(req.user.orgCode, id, req.user.username)
    }

    // R07 — Execution history for a template
    @Get('report-templates/:id/history')
    getHistory(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
        return this.reportingService.getHistory(req.user.orgCode, id)
    }

    // R08 — Semantic field mappings for a domain (no org-scope needed)
    @Get('report-field-mappings/:domain')
    getFieldMappings(@Param('domain') domain: string) {
        return this.reportingService.getFieldMappings(domain)
    }

    // R09 — Date basis options (static lookup)
    @Get('date-basis')
    getDateBasisOptions() {
        return this.reportingService.getDateBasisOptions()
    }

    @Post('dashboards/widgets/data')
    @HttpCode(HttpStatus.OK)
    getDashboardWidgetData(@Req() req: any, @Body() body: Record<string, any>) {
        return this.reportingService.getDashboardWidgetData(req.user.orgCode, body.widget, body.filters)
    }
}
