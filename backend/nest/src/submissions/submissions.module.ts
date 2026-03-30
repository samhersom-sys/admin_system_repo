import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SubmissionsController } from './submissions.controller'
import { SubmissionsService } from './submissions.service'
import { Submission } from '../entities/submission.entity'
import { Quote } from '../entities/quote.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Submission, Quote])],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
})
export class SubmissionsModule {}
