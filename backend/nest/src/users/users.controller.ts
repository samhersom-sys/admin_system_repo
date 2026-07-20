import { Controller, Patch, Body, Req, UseGuards, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

/**
 * UsersController — /api/users
 *
 * PATCH /api/users/me/master-homepage      — set/clear master homepage (REQ-HOME-CFG-BE-F-001)
 * PATCH /api/users/me/homepage-preferences — upsert show/order prefs (REQ-HOME-CFG-BE-F-002)
 *
 * All routes use /me/ — no /:userId/ path param, preventing IDOR (REQ-HOME-CFG-FE-S-001).
 */
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Patch('me/master-homepage')
    @HttpCode(HttpStatus.OK)
    setMasterHomepage(
        @Req() req: any,
        @Body() body: { masterHomepageTemplateId: number | null },
    ) {
        const id = body.masterHomepageTemplateId
        if (id !== null && id !== undefined && (!Number.isInteger(id) || id <= 0)) {
            throw new BadRequestException({ error: 'masterHomepageTemplateId must be a positive integer or null' })
        }
        return this.usersService.setMasterHomepage(
            req.user.id,
            req.user.orgCode,
            id ?? null,
        )
    }

    @Patch('me/homepage-preferences')
    @HttpCode(HttpStatus.OK)
    upsertHomepagePreference(
        @Req() req: any,
        @Body() body: { templateId: number; showOnHomepage?: boolean; homepagePageOrder?: number | null },
    ) {
        if (!Number.isInteger(body.templateId) || body.templateId <= 0) {
            throw new BadRequestException({ error: 'templateId must be a positive integer' })
        }
        return this.usersService.upsertHomepagePreference(
            req.user.id,
            req.user.orgCode,
            body.templateId,
            body.showOnHomepage,
            body.homepagePageOrder,
        )
    }
}
