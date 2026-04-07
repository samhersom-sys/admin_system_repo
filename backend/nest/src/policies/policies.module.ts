import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PoliciesController } from './policies.controller'
import { PoliciesService } from './policies.service'
import { Policy } from '../entities/policy.entity'
import { AuditModule } from '../audit/audit.module'

@Module({
    imports: [TypeOrmModule.forFeature([Policy]), AuditModule],
    controllers: [PoliciesController],
    providers: [PoliciesService],
    exports: [PoliciesService],
})
export class PoliciesModule { }
