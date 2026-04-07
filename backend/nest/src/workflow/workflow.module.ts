import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Submission } from '../entities/submission.entity'
import { ClearanceSubmission } from '../entities/clearance-submission.entity'
import { DataQualityIssue } from '../entities/data-quality-issue.entity'
import { WorkflowService } from './workflow.service'
import { WorkflowController } from './workflow.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Submission, ClearanceSubmission, DataQualityIssue])],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule { }
