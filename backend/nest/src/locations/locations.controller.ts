/**
 * LocationsScheduleController
 *
 * REQ-LOC-BE-F-001 — Exposes all 6 locations-schedule endpoints
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { LocationsScheduleService } from './locations.service'

@UseGuards(JwtAuthGuard)
@Controller('locations-schedule')
export class LocationsScheduleController {
  constructor(private readonly locationsService: LocationsScheduleService) { }

  // GET /api/locations-schedule/imports?entityType=Quote&entityId=1
  // (also accepts legacy ?contextType=&recordId= query params from backup)
  @Get('imports')
  getImports(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Query('contextType') contextType: string,
    @Query('recordId') recordId: string,
    @Req() req: any,
  ) {
    const et = entityType || contextType
    const id = Number(entityId || recordId)
    return this.locationsService.getImports(et, id, req.user.orgCode)
  }

  // POST /api/locations-schedule/import
  @Post('import')
  importCsv(
    @Body() body: { entityType: string; entityId: number; rows: Record<string, unknown>[] },
    @Req() req: any,
  ) {
    return this.locationsService.importCsv(
      body.entityType,
      body.entityId,
      req.user.orgCode,
      body.rows,
      req.user.email ?? req.user.name ?? 'unknown',
    )
  }

  // PUT /api/locations-schedule/imports/:id
  @Put('imports/:id')
  updateImport(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
    @Req() req: any,
  ) {
    return this.locationsService.updateImport(id, req.user.orgCode, body)
  }

  // GET /api/locations-schedule/imports/:id/versions
  @Get('imports/:id/versions')
  getVersions(@Param('id', ParseIntPipe) id: number) {
    return this.locationsService.getVersions(id)
  }

  // POST /api/locations-schedule/imports/:id/revert/:versionNumber
  @Post('imports/:id/revert/:versionNumber')
  revertToVersion(
    @Param('id', ParseIntPipe) id: number,
    @Param('versionNumber', ParseIntPipe) versionNumber: number,
  ) {
    return this.locationsService.revertToVersion(id, versionNumber)
  }

  // GET /api/locations-schedule/imports/:id/historical
  @Get('imports/:id/historical')
  getHistorical(@Param('id', ParseIntPipe) id: number) {
    return this.locationsService.getHistorical(id)
  }
}
