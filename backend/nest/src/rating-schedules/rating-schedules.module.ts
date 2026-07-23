import { Module } from '@nestjs/common'
import { RatingSchedulesController } from './rating-schedules.controller'
import { RatingSchedulesService } from './rating-schedules.service'
import { AuditModule } from '../audit/audit.module'

@Module({
    imports: [AuditModule],
    controllers: [RatingSchedulesController],
    providers: [RatingSchedulesService],
})
export class RatingSchedulesModule { }
