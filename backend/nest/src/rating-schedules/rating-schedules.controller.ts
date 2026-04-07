import { Controller, Get, Put, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common'
import { RatingSchedulesService } from './rating-schedules.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

/**
 * RatingSchedulesController
 * Prefix: /api/rating-schedules (registered in app.module with globalPrefix 'api')
 */
@UseGuards(JwtAuthGuard)
@Controller('rating-schedules')
export class RatingSchedulesController {
    constructor(private readonly ratingSchedulesService: RatingSchedulesService) { }

    /** GET /api/rating-schedules */
    @Get()
    findAll() {
        return this.ratingSchedulesService.findAll()
    }

    /** GET /api/rating-schedules/:id */
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.ratingSchedulesService.findOne(id)
    }

    /** GET /api/rating-schedules/:id/rules */
    @Get(':id/rules')
    getRules(@Param('id', ParseIntPipe) id: number) {
        return this.ratingSchedulesService.getRules(id)
    }

    /** PUT /api/rating-schedules/:id */
    @Put(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: Record<string, unknown>,
    ) {
        return this.ratingSchedulesService.update(id, body)
    }
}
