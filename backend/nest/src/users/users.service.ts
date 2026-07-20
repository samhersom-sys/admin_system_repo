import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../entities/user.entity'
import { UserHomepagePreference } from '../entities/user-homepage-preference.entity'
import { ReportTemplate } from '../entities/report-template.entity'

/**
 * UsersService — /api/users
 *
 * Handles per-user homepage preferences.
 * REQ-HOME-CFG-BE-F-001: PATCH /api/users/me/master-homepage
 * REQ-HOME-CFG-BE-F-002: PATCH /api/users/me/homepage-preferences
 * REQ-HOME-CFG-FE-S-001: All mutations use /me/ endpoints — no /:userId/ path param (IDOR-free)
 */
@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(UserHomepagePreference)
        private readonly prefRepo: Repository<UserHomepagePreference>,
        @InjectRepository(ReportTemplate)
        private readonly templateRepo: Repository<ReportTemplate>,
    ) {}

    /**
     * Set or clear the master homepage template for the calling user.
     * REQ-HOME-CFG-BE-F-001
     */
    async setMasterHomepage(
        userId: number,
        orgCode: string,
        masterHomepageTemplateId: number | null,
    ): Promise<{ id: number; masterHomepageTemplateId: number | null }> {
        const user = await this.userRepo.findOne({ where: { id: userId } })
        if (!user) throw new NotFoundException({ error: 'User not found' })

        // REQ-HOME-CFG-BE-F-001 AC-BE-001d / OWASP A01 — validate template belongs to caller's org
        if (masterHomepageTemplateId !== null) {
            const tpl = await this.templateRepo.findOne({
                where: { id: masterHomepageTemplateId },
                select: { id: true, orgCode: true },
            })
            if (!tpl) throw new NotFoundException({ error: 'Template not found' })
            const isCore = !tpl.orgCode || tpl.orgCode === 'SYSTEM'
            if (!isCore && tpl.orgCode !== orgCode) {
                throw new ForbiddenException({ error: 'Template does not belong to your organisation' })
            }
        }

        user.masterHomepageTemplateId = masterHomepageTemplateId
        await this.userRepo.save(user)
        return { id: user.id, masterHomepageTemplateId: user.masterHomepageTemplateId }
    }

    /**
     * Upsert a homepage preference (show-on-homepage / page-order) for a template.
     * REQ-HOME-CFG-BE-F-002
     */
    async upsertHomepagePreference(
        userId: number,
        orgCode: string,
        templateId: number,
        showOnHomepage?: boolean,
        homepagePageOrder?: number | null,
    ): Promise<Record<string, unknown>> {
        if (!templateId) throw new BadRequestException({ error: 'templateId is required' })

        // REQ-HOME-CFG-BE-F-002 AC-BE-002d / OWASP A01 — validate template belongs to caller's org
        const tpl = await this.templateRepo.findOne({
            where: { id: templateId },
            select: { id: true, orgCode: true },
        })
        if (!tpl) throw new NotFoundException({ error: 'Template not found' })
        const isCore = !tpl.orgCode || tpl.orgCode === 'SYSTEM'
        if (!isCore && tpl.orgCode !== orgCode) {
            throw new ForbiddenException({ error: 'Template does not belong to your organisation' })
        }

        let pref = await this.prefRepo.findOne({ where: { userId, templateId } })
        if (!pref) {
            pref = this.prefRepo.create({ userId, templateId, orgCode, showOnHomepage: false, homepagePageOrder: null })
        }

        if (showOnHomepage !== undefined) pref.showOnHomepage = showOnHomepage
        if (homepagePageOrder !== undefined) pref.homepagePageOrder = homepagePageOrder
        pref.orgCode = orgCode

        await this.prefRepo.save(pref)
        return { id: pref.id, userId: pref.userId, templateId: pref.templateId, showOnHomepage: pref.showOnHomepage, homepagePageOrder: pref.homepagePageOrder }
    }
}
