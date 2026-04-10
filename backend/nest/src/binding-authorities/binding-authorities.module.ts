import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BindingAuthority } from '../entities/binding-authority.entity'
import { BASection } from '../entities/ba-section.entity'
import { BATransaction } from '../entities/ba-transaction.entity'
import { BASectionParticipation } from '../entities/ba-section-participation.entity'
import { BASectionAuthorizedRisk } from '../entities/ba-section-authorized-risk.entity'
import { BADocument } from '../entities/ba-document.entity'
import { BindingAuthoritiesService } from './binding-authorities.service'
import { BindingAuthoritiesController } from './binding-authorities.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BindingAuthority,
      BASection,
      BATransaction,
      BASectionParticipation,
      BASectionAuthorizedRisk,
      BADocument,
    ]),
  ],
  controllers: [BindingAuthoritiesController],
  providers: [BindingAuthoritiesService],
  exports: [BindingAuthoritiesService],
})
export class BindingAuthoritiesModule { }
