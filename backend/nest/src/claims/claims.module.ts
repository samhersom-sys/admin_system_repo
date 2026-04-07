import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ClaimsController } from './claims.controller'
import { ClaimsService } from './claims.service'
import { Claim } from '../entities/claim.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Claim])],
  controllers: [ClaimsController],
  providers: [ClaimsService],
  exports: [ClaimsService],
})
export class ClaimsModule { }
