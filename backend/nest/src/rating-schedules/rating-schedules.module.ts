import { Module } from '@nestjs/common'
import { RatingSchedulesController } from './rating-schedules.controller'
import { RatingSchedulesService } from './rating-schedules.service'

@Module({
    controllers: [RatingSchedulesController],
    providers: [RatingSchedulesService],
})
export class RatingSchedulesModule { }
