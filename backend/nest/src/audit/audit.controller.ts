import {
    Controller, Get, Post, Param, Body,
    Req, Res, UseGuards,
} from '@nestjs/common'
import { Response } from 'express'
import { AuditService } from './audit.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
    constructor(private readonly auditService: AuditService) {}

    @Post('event')
    async writeEvent(@Body() body: any, @Req() req: any, @Res({ passthrough: true }) res: Response) {
        const result = await this.auditService.writeEvent(body, req.user)
        // REQ-AUDIT-BE-F-005: duplicate events return 200 with skipped:true; new events return 201
        res.status(result.skipped ? 200 : 201)
        return result
    }

    @Get(':type/:id')
    getHistory(@Param('type') type: string, @Param('id') id: string) {
        return this.auditService.getHistory(type, id)
    }
}
