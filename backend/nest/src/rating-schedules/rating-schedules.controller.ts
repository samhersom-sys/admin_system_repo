import {
    Controller, Get, Post, Put, Delete,
    Param, Body, ParseIntPipe, UseGuards, Request,
} from '@nestjs/common'
import { RatingSchedulesService } from './rating-schedules.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

/**
 * RatingSchedulesController
 * Prefix: /api/rating-schedules  (also handles /api/rating-rules and /api/rating)
 *
 * REQ-SET-BE-F-005 — Full rating engine endpoints migrated from BackUp rating-api.js
 */
@UseGuards(JwtAuthGuard)
@Controller()
export class RatingSchedulesController {
    constructor(private readonly ratingSchedulesService: RatingSchedulesService) { }

    // ── Rating Schedules ──────────────────────────────────────────────────────

    /** GET /api/rating-schedules */
    @Get('rating-schedules')
    findAll() {
        return this.ratingSchedulesService.findAll()
    }

    /** POST /api/rating-schedules */
    @Post('rating-schedules')
    create(@Body() body: Record<string, unknown>, @Request() req: any) {
        return this.ratingSchedulesService.create(body, req.user?.username ?? req.user?.email)
    }

    /** GET /api/rating-schedules/:id/versions — must come before :id */
    @Get('rating-schedules/:id/versions')
    getVersions(@Param('id', ParseIntPipe) id: number) {
        return this.ratingSchedulesService.getVersions(id)
    }

    /** GET /api/rating-schedules/:id/rules */
    @Get('rating-schedules/:id/rules')
    getRules(@Param('id', ParseIntPipe) id: number) {
        return this.ratingSchedulesService.getRules(id)
    }

    /** GET /api/rating-schedules/:id */
    @Get('rating-schedules/:id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.ratingSchedulesService.findOne(id)
    }

    /** PUT /api/rating-schedules/:id */
    @Put('rating-schedules/:id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: Record<string, unknown>,
    ) {
        return this.ratingSchedulesService.update(id, body)
    }

    /** POST /api/rating-schedules/:id/increment-version */
    @Post('rating-schedules/:id/increment-version')
    incrementVersion(@Param('id', ParseIntPipe) id: number) {
        return this.ratingSchedulesService.incrementVersion(id)
    }

    // ── Rating Rules ──────────────────────────────────────────────────────────

    /** POST /api/rating-rules */
    @Post('rating-rules')
    createRule(@Body() body: Record<string, unknown>, @Request() req: any) {
        return this.ratingSchedulesService.createRule(body, req.user?.username ?? req.user?.email)
    }

    /** PUT /api/rating-rules/:id */
    @Put('rating-rules/:id')
    updateRule(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: Record<string, unknown>,
    ) {
        return this.ratingSchedulesService.updateRule(id, body)
    }

    /** DELETE /api/rating-rules/:id */
    @Delete('rating-rules/:id')
    deleteRule(@Param('id', ParseIntPipe) id: number) {
        return this.ratingSchedulesService.deleteRule(id)
    }

    // ── Rating Calculate ──────────────────────────────────────────────────────

    /** POST /api/rating/calculate */
    @Post('rating/calculate')
    calculate(@Body() body: Record<string, unknown>, @Request() req: any) {
        const userName = req.user?.username ?? req.user?.email ?? 'System'
        return this.ratingSchedulesService.calculate(body, userName)
    }

    /** POST /api/rating/calculate-location */
    @Post('rating/calculate-location')
    calculateLocation(@Body() body: Record<string, unknown>, @Request() req: any) {
        const userName = req.user?.username ?? req.user?.email ?? 'System'
        return this.ratingSchedulesService.calculateLocation(body, userName)
    }

    /** POST /api/rating/calculate-quote */
    @Post('rating/calculate-quote')
    calculateQuote(@Body() body: Record<string, unknown>, @Request() req: any) {
        const userName = req.user?.username ?? req.user?.email ?? 'System'
        return this.ratingSchedulesService.calculateQuote(body, userName)
    }
}
