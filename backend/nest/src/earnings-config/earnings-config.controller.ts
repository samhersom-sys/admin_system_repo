import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Param,
    Body,
    Req,
    UseGuards,
    HttpCode,
    HttpStatus,
    ParseIntPipe,
} from '@nestjs/common'
import { EarningsConfigService } from './earnings-config.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'

/**
 * EarningsConfigController — /api/earnings-config
 *
 * REQ-SETTINGS-EARN-R03 through R09
 *
 * GET  /api/earnings-config/patterns              — list active patterns
 * POST /api/earnings-config/patterns              — create pattern
 * PATCH /api/earnings-config/patterns/:id/deactivate — deactivate pattern
 *
 * GET  /api/earnings-config/patterns/:id/points        — list interpolation points
 * POST /api/earnings-config/patterns/:id/points        — add interpolation point
 * DELETE /api/earnings-config/patterns/:id/points/:pid — remove interpolation point
 *
 * GET  /api/earnings-config/rules                 — list active rules
 * POST /api/earnings-config/rules                 — create rule
 * PUT  /api/earnings-config/rules/:id             — update rule
 * PATCH /api/earnings-config/rules/:id/deactivate — deactivate rule
 */
@Controller('earnings-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('client_admin', 'internal_admin')
export class EarningsConfigController {
    constructor(private readonly svc: EarningsConfigService) { }

    // -------------------------------------------------------------------------
    // Patterns
    // -------------------------------------------------------------------------

    @Get('patterns')
    getPatterns(@Req() req: any) {
        return this.svc.getPatterns(req.user.orgCode)
    }

    @Post('patterns')
    @HttpCode(HttpStatus.CREATED)
    createPattern(@Body() body: any, @Req() req: any) {
        return this.svc.createPattern(req.user.orgCode, req.user.username, body)
    }

    @Patch('patterns/:id/deactivate')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deactivatePattern(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: any,
    ) {
        await this.svc.deactivatePattern(id, req.user.orgCode)
    }

    // -------------------------------------------------------------------------
    // Interpolation points
    // -------------------------------------------------------------------------

    @Get('patterns/:id/points')
    getPoints(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.svc.getPoints(id, req.user.orgCode)
    }

    @Post('patterns/:id/points')
    @HttpCode(HttpStatus.CREATED)
    createPoint(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: any,
        @Req() req: any,
    ) {
        return this.svc.createPoint(id, req.user.orgCode, body)
    }

    @Delete('patterns/:id/points/:pointId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deletePoint(
        @Param('id', ParseIntPipe) id: number,
        @Param('pointId', ParseIntPipe) pointId: number,
        @Req() req: any,
    ) {
        await this.svc.deletePoint(id, pointId, req.user.orgCode)
    }

    // -------------------------------------------------------------------------
    // Rules
    // -------------------------------------------------------------------------

    @Get('rules')
    getRules(@Req() req: any) {
        return this.svc.getRules(req.user.orgCode)
    }

    @Post('rules')
    @HttpCode(HttpStatus.CREATED)
    createRule(@Body() body: any, @Req() req: any) {
        return this.svc.createRule(req.user.orgCode, req.user.username, body)
    }

    @Put('rules/:id')
    updateRule(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: any,
        @Req() req: any,
    ) {
        return this.svc.updateRule(id, req.user.orgCode, body)
    }

    @Patch('rules/:id/deactivate')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deactivateRule(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: any,
    ) {
        await this.svc.deactivateRule(id, req.user.orgCode)
    }
}
