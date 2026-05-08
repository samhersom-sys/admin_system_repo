import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { HomeService } from './home.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Controller('home')
@UseGuards(JwtAuthGuard)
export class HomeController {
    constructor(private readonly homeService: HomeService) { }

    // REQ-HOME-F-019 / REQ-HOME-F-020 — GET /api/home/kpi-summary
    // Scope context (orgCode, username) is derived from the JWT — no query params needed.
    @Get('kpi-summary')
    getKpiSummary(@Req() req: any) {
        return this.homeService.getKpiSummary(req.user.orgCode, req.user.username)
    }
}
