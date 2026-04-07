import {
    Controller,
    Get,
    Post,
    Put,
    Param,
    Query,
    Body,
    ParseIntPipe,
    UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { OrganisationService } from './organisation.service'

@UseGuards(JwtAuthGuard)
@Controller()
export class OrganisationController {
    constructor(private readonly service: OrganisationService) { }

    // GET /api/organisation-entities?code=:code
    @Get('organisation-entities')
    findByCode(@Query('code') code: string): Promise<any[]> {
        return this.service.findByCode(code ?? '')
    }

    // POST /api/organisation-entities
    @Post('organisation-entities')
    create(@Body() body: any): Promise<any> {
        return this.service.create(body)
    }

    // PUT /api/organisation-entities/:id
    @Put('organisation-entities/:id')
    update(@Param('id', ParseIntPipe) id: number, @Body() body: any): Promise<any> {
        return this.service.update(id, body)
    }

    // GET /api/organisation-entities/:id/hierarchy-config
    @Get('organisation-entities/:id/hierarchy-config')
    getHierarchyConfig(@Param('id', ParseIntPipe) id: number): Promise<any[]> {
        return this.service.getHierarchyConfig(id)
    }

    // POST /api/organisation-entities/:id/hierarchy-config
    @Post('organisation-entities/:id/hierarchy-config')
    saveHierarchyConfig(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { levels: any[] },
    ): Promise<any[]> {
        return this.service.saveHierarchyConfig(id, body.levels ?? [])
    }

    // GET /api/organisation-entities/:id/hierarchy-links
    @Get('organisation-entities/:id/hierarchy-links')
    getHierarchyLinks(@Param('id', ParseIntPipe) id: number): Promise<any[]> {
        return this.service.getHierarchyLinks(id)
    }

    // POST /api/organisation-entities/:id/hierarchy-links
    @Post('organisation-entities/:id/hierarchy-links')
    saveHierarchyLinks(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { links: any[] },
    ): Promise<any[]> {
        return this.service.saveHierarchyLinks(id, body.links ?? [])
    }

    // GET /api/users
    @Get('users')
    getUsers(): Promise<{ id: number; username: string; email: string }[]> {
        return this.service.getUsers()
    }

    // GET /api/organisation-hierarchy
    @Get('organisation-hierarchy')
    getGlobalHierarchyLevels(): Promise<any[]> {
        return this.service.getGlobalHierarchyLevels()
    }
}
