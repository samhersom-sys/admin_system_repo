import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    ParseIntPipe,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common'
import { MeasuresService, CreateMeasureDto, UpdateMeasureDto } from './measures.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

/**
 * MeasuresController — CRUD endpoints for measure definitions.
 *
 * All routes require JWT authentication. Scope is derived from the JWT token:
 *   req.user.orgCode  — the tenant this user belongs to
 *   req.user.username — used for history audit trail
 *
 * Internal measures (created_by_type = 'internal') are READ-ONLY via this API.
 * Only tenant measures can be created, updated, or deactivated here.
 */
@Controller('measures')
@UseGuards(JwtAuthGuard)
export class MeasuresController {
    constructor(private readonly measuresService: MeasuresService) { }

    /**
     * GET /api/measures
     * Returns all active measures visible to this org (internal + own tenant measures).
     */
    @Get()
    findAll(@Req() req: any) {
        return this.measuresService.findAll(req.user.orgCode)
    }

    /**
     * GET /api/measures/:id
     */
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.measuresService.findOne(id, req.user.orgCode)
    }

    /**
     * POST /api/measures
     * Creates a new tenant-admin measure for the authenticated org.
     * Body must include a filter_condition JSONB — raw SQL is never accepted.
     */
    @Post()
    create(@Req() req: any, @Body() dto: CreateMeasureDto) {
        return this.measuresService.create(req.user.orgCode, req.user.username, dto)
    }

    /**
     * PUT /api/measures/:id
     * Updates label, scope, or filter_condition for a tenant-admin measure.
     */
    @Put(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: any,
        @Body() dto: UpdateMeasureDto,
    ) {
        return this.measuresService.update(id, req.user.orgCode, req.user.username, dto)
    }

    /**
     * DELETE /api/measures/:id
     * Deactivates (soft-deletes) a tenant-admin measure. Append-only history entry written.
     * Internal measures cannot be deactivated via this endpoint.
     */
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    deactivate(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.measuresService.deactivate(id, req.user.orgCode, req.user.username)
    }
}
