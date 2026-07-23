import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BrokerSubmissionsController } from './broker-submissions.controller'
import { BrokerSubmissionsService } from './broker-submissions.service'
import { BrokerSubmission } from '../entities/broker-submission.entity'
import { Organisation } from '../entities/organisation.entity'
import { LookupBrokerSubmissionSource } from '../entities/lookup-broker-submission-source.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([BrokerSubmission, Organisation, LookupBrokerSubmissionSource]),
  ],
  controllers: [BrokerSubmissionsController],
  providers: [BrokerSubmissionsService],
})
export class BrokerSubmissionsModule { }
