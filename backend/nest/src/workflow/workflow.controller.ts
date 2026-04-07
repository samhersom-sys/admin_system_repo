import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  HttpCode,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { WorkflowService } from './workflow.service'

@Controller()
@UseGuards(JwtAuthGuard)
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) { }

  // ------------------------------------------------------------------
  // Workflow submissions
  // ------------------------------------------------------------------

  @Get('workflow/submissions')
  getWorkflowSubmissions(@Req() req: any) {
    return this.workflowService.getWorkflowSubmissions(req.user.orgCode)
  }

  @Post('workflow/submissions/:id/assign')
  @HttpCode(200)
  assignSubmission(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.workflowService.assignSubmission(req.user.orgCode, +id, body)
  }

  @Patch('workflow/submissions/:id/status')
  updateSubmissionStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.workflowService.updateSubmissionStatus(req.user.orgCode, +id, body)
  }

  @Get('workflow/data-quality')
  getDataQualityIssues(@Req() req: any) {
    return this.workflowService.getDataQualityIssues(req.user.orgCode)
  }

  // ------------------------------------------------------------------
  // Clearance
  // ------------------------------------------------------------------

  @Get('clearance/pending')
  getClearancePending(@Req() req: any) {
    return this.workflowService.getClearancePending(req.user.orgCode)
  }

  @Post('clearance/check/:id')
  @HttpCode(200)
  checkDuplicates(@Req() req: any, @Param('id') id: string) {
    return this.workflowService.checkDuplicates(req.user.orgCode, +id)
  }

  @Post('clearance/:id/clear')
  @HttpCode(200)
  clearSubmission(@Req() req: any, @Param('id') id: string) {
    return this.workflowService.clearSubmission(req.user.orgCode, +id)
  }

  @Post('clearance/:id/confirm-duplicate')
  @HttpCode(200)
  confirmDuplicate(@Req() req: any, @Param('id') id: string) {
    return this.workflowService.confirmDuplicate(req.user.orgCode, +id)
  }
}
