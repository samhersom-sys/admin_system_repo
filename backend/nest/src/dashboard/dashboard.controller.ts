import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { DashboardService } from './dashboard.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

// All dashboard routes require a valid JWT.
// Routes mirror the stub registrations in dashboard-stubs.js.

@Controller()
@UseGuards(JwtAuthGuard)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    // REQ-DASH-STUB-F-001
    @Get('quotes')
    getQuotes() { return this.dashboardService.getQuotes() }

    // REQ-DASH-STUB-F-002
    @Get('policies')
    getPolicies() { return this.dashboardService.getPolicies() }

    // REQ-DASH-STUB-F-003
    @Get('policies/gwp-monthly')
    getPoliciesGwpMonthly(@Req() req: any) {
        return this.dashboardService.getPoliciesGwpMonthly(req.user.orgCode)
    }

    // REQ-DASH-STUB-F-004
    @Get('policies/gwp-cumulative')
    getPoliciesGwpCumulative(@Req() req: any) {
        return this.dashboardService.getPoliciesGwpCumulative(req.user.orgCode)
    }

    // REQ-DASH-STUB-F-005
    @Get('policies/gwp-summary')
    getPoliciesGwpSummary(@Req() req: any) {
        return this.dashboardService.getPoliciesGwpSummary(req.user.orgCode, req.user.username)
    }

    // REQ-DASH-STUB-F-006
    @Get('binding-authorities')
    getBindingAuthorities() { return this.dashboardService.getBindingAuthorities() }

    // REQ-DASH-STUB-F-007
    @Get('notifications')
    getNotifications() { return this.dashboardService.getNotifications() }

    // REQ-DASH-STUB-F-008
    @Get('recent-records-data')
    getRecentRecords(@Req() req: any) {
        return this.dashboardService.getRecentRecords(req.user.orgCode)
    }

    // REQ-DASH-STUB-F-009
    @Get('tasks')
    getTasks() { return this.dashboardService.getTasks() }
}
