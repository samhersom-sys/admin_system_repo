import { Module } from '@nestjs/common'
import { LocationsScheduleService } from './locations.service'
import { LocationsScheduleController } from './locations.controller'

@Module({
  providers: [LocationsScheduleService],
  controllers: [LocationsScheduleController],
  exports: [LocationsScheduleService],
})
export class LocationsModule { }
