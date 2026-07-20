import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { BrokerSubmissionsService, CreateBrokerSubmissionInput } from './broker-submissions.service'

/**
 * BrokerSubmissionsController — /api/broker-submissions
 *
 * Domain: PSS-BRK-BE
 * Requirements: broker-submissions.requirements.md
 *
 * All routes protected by JwtAuthGuard.
 * orgCode is always taken from req.user (JWT payload) — never from the request body.
 */
@Controller('broker-submissions')
@UseGuards(JwtAuthGuard)
export class BrokerSubmissionsController {
  constructor(private readonly service: BrokerSubmissionsService) { }

  // GET /api/broker-submissions?source=:source&status=:status
  @Get()
  findAll(
    @Req() req: any,
    @Query('source') source?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll(
      { source, status },
      { orgCode: req.user.orgCode, userId: req.user.id, role: req.user.role },
    )
  }

  // POST /api/broker-submissions
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: any, @Body() body: CreateBrokerSubmissionInput) {
    return this.service.create(body, { orgCode: req.user.orgCode, userId: req.user.id, role: req.user.role })
  }

  // GET /api/broker-submissions/:id
  @Get(':id')
  findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id, { orgCode: req.user.orgCode, userId: req.user.id, role: req.user.role })
  }

  // PUT /api/broker-submissions/:id
  @Put(':id')
  update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Partial<CreateBrokerSubmissionInput>,
  ) {
    return this.service.update(id, body, { orgCode: req.user.orgCode, userId: req.user.id, role: req.user.role })
  }
}
