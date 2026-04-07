import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PartiesController } from './parties.controller'
import { PartiesService } from './parties.service'
import { Party } from '../entities/party.entity'
import { AuditModule } from '../audit/audit.module'

@Module({
    imports: [TypeOrmModule.forFeature([Party]), AuditModule],
    controllers: [PartiesController],
    providers: [PartiesService],
    exports: [PartiesService],
})
export class PartiesModule { }
