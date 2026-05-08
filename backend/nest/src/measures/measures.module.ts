import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MeasureDefinition } from './measure-definition.entity'
import { MeasuresService } from './measures.service'
import { MeasuresController } from './measures.controller'

@Module({
    imports: [TypeOrmModule.forFeature([MeasureDefinition])],
    providers: [MeasuresService],
    controllers: [MeasuresController],
    exports: [MeasuresService],  // exported so HomeModule and ReportingModule can inject it
})
export class MeasuresModule { }
