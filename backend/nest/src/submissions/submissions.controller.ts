import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common'
import { SubmissionsService } from './submissions.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

/**
 * SubmissionsController — /api/submissions
 *
 * All routes are protected by JwtAuthGuard.
 * Org-scoping is enforced by the service using req.user.orgCode from JWT.
 */
@Controller('submissions')
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) { }

  // R01 — List submissions
  @Get()
  findAll(@Req() req: any, @Query('status') status?: string) {
    return this.submissionsService.findAll(req.user.orgCode, status)
  }

  // R02 — Create submission
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: any, @Body() body: Record<string, any>) {
    return this.submissionsService.create(req.user.orgCode, body)
  }

  // R03 — Get single submission
  @Get(':id')
  findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.submissionsService.findOne(req.user.orgCode, id)
  }

  // R04 — Update submission
  @Put(':id')
  update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, any>,
  ) {
    return this.submissionsService.update(req.user.orgCode, id, body, req.user)
  }

  @Post(':id/edit-lock')
  @HttpCode(HttpStatus.OK)
  acquireEditLock(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.submissionsService.acquireEditLock(req.user.orgCode, id, req.user)
  }

  @Delete(':id/edit-lock')
  @HttpCode(HttpStatus.NO_CONTENT)
  async releaseEditLock(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    await this.submissionsService.releaseEditLock(req.user.orgCode, id, req.user)
  }

  // R05 — Submit (→ 'In Review')
  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  submit(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.submissionsService.submit(req.user.orgCode, id, req.user)
  }

  // R06 — Decline (→ 'Declined')
  @Post(':id/decline')
  @HttpCode(HttpStatus.OK)
  decline(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reasonCode: string; reasonText?: string },
  ) {
    return this.submissionsService.decline(
      req.user.orgCode,
      id,
      body.reasonCode,
      body.reasonText ?? '',
      req.user,
    )
  }

  // R07 — GET /api/submissions/:id/related
  @Get(':id/related')
  findRelated(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.submissionsService.findRelated(req.user.orgCode, id)
  }

  // R08 — POST /api/submissions/:id/related
  @Post(':id/related')
  @HttpCode(HttpStatus.CREATED)
  linkRelated(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { relatedSubmissionId: number },
  ) {
    return this.submissionsService.linkRelated(req.user.orgCode, id, body.relatedSubmissionId)
  }

  // R09 — DELETE /api/submissions/:id/related/:relatedId
  @Delete(':id/related/:relatedId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRelated(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Param('relatedId', ParseIntPipe) relatedId: number,
  ) {
    await this.submissionsService.removeRelated(req.user.orgCode, id, relatedId)
  }

  // R10 — GET /api/submissions/:id/binding-authorities
  @Get(':id/binding-authorities')
  findBindingAuthorities(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.submissionsService.findBindingAuthorities(req.user.orgCode, id)
  }
}
