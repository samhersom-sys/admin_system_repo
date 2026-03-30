import {
    Controller, Get, Post, Body, Query,
    Req, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { PartiesService } from './parties.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Controller('parties')
@UseGuards(JwtAuthGuard)
export class PartiesController {
    constructor(private readonly partiesService: PartiesService) {}

    @Get()
    findAll(@Req() req: any, @Query('type') type?: string, @Query('search') search?: string) {
        return this.partiesService.findAll(req.user.orgCode, type, search)
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Req() req: any, @Body() body: any) {
        return this.partiesService.create(req.user.orgCode, body)
    }
}
