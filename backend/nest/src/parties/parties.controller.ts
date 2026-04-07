import {
    Controller, Get, Post, Put, Delete, Body, Param, Query,
    Req, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { PartiesService } from './parties.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Controller('parties')
@UseGuards(JwtAuthGuard)
export class PartiesController {
    constructor(private readonly partiesService: PartiesService) { }

    @Get()
    findAll(@Req() req: any, @Query('type') type?: string, @Query('search') search?: string) {
        return this.partiesService.findAll(req.user.orgCode, type, search)
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Req() req: any, @Body() body: any) {
        return this.partiesService.create(req.user.orgCode, body)
    }

    @Get(':id')
    findOne(@Req() req: any, @Param('id') id: string) {
        return this.partiesService.findOne(req.user.orgCode, Number(id))
    }

    @Put(':id')
    update(@Req() req: any, @Param('id') id: string, @Body() body: Record<string, unknown>) {
        return this.partiesService.update(req.user.orgCode, Number(id), body)
    }

    @Get(':id/entities')
    findEntities(@Param('id') id: string) {
        return this.partiesService.findEntities(Number(id))
    }

    @Post(':id/entities')
    @HttpCode(HttpStatus.CREATED)
    createEntity(@Param('id') id: string, @Body() body: Record<string, unknown>) {
        return this.partiesService.createEntity(Number(id), body)
    }

    @Put(':id/entities/:entityId')
    updateEntity(
        @Param('id') id: string,
        @Param('entityId') entityId: string,
        @Body() body: Record<string, unknown>,
    ) {
        return this.partiesService.updateEntity(Number(id), Number(entityId), body)
    }

    @Delete(':id/entities/:entityId')
    @HttpCode(HttpStatus.NO_CONTENT)
    deleteEntity(@Param('id') id: string, @Param('entityId') entityId: string) {
        return this.partiesService.deleteEntity(Number(id), Number(entityId))
    }

    @Get(':id/audit')
    getAudit(@Param('id') id: string) {
        return this.partiesService.getAudit(Number(id))
    }

    @Post(':id/audit')
    @HttpCode(HttpStatus.CREATED)
    writeAudit(@Req() req: any, @Param('id') id: string, @Body() body: Record<string, unknown>) {
        return this.partiesService.writeAudit(Number(id), body, req.user)
    }

    @Get(':id/submissions')
    findRelatedSubmissions(@Req() req: any, @Param('id') id: string) {
        return this.partiesService.findRelatedSubmissions(Number(id), req.user.orgCode)
    }

    @Get(':id/quotes')
    findRelatedQuotes(@Req() req: any, @Param('id') id: string) {
        return this.partiesService.findRelatedQuotes(Number(id), req.user.orgCode)
    }
}
