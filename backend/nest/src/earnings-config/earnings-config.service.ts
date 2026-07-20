import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import {
    EarningPattern,
    EarningPatternPoint,
    EarningPatternRule,
} from '../entities/earning-pattern.entity'

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export interface CreatePatternDto {
    name: string
    patternType: 'upfront' | 'straight_line' | 'interpolated'
    earnBy?: 'day' | 'period'
    description?: string
}

export interface CreatePointDto {
    pctThroughPolicy: number
    pctEarnedIncrement: number
}

export interface CreateRuleDto {
    patternId: number
    priority?: number
    productId?: number | null
    classOfBusiness?: string | null
    contractType?: string | null
    includeIncepted?: boolean
}

export interface UpdateRuleDto extends Partial<CreateRuleDto> { }

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * EarningsConfigService — REQ-SETTINGS-EARN-R03 through R11
 *
 * All logic for managing earning patterns and rules is tenant-scoped: every
 * read, write and delete is filtered by org_code from the JWT session.
 */
@Injectable()
export class EarningsConfigService {
    constructor(
        @InjectRepository(EarningPattern)
        private readonly patternRepo: Repository<EarningPattern>,
        @InjectRepository(EarningPatternPoint)
        private readonly pointRepo: Repository<EarningPatternPoint>,
        @InjectRepository(EarningPatternRule)
        private readonly ruleRepo: Repository<EarningPatternRule>,
    ) { }

    // -------------------------------------------------------------------------
    // Patterns
    // -------------------------------------------------------------------------

    async getPatterns(orgCode: string): Promise<EarningPattern[]> {
        return this.patternRepo.find({
            where: { orgCode, isActive: true },
            order: { name: 'ASC' },
        })
    }

    async createPattern(
        orgCode: string,
        username: string,
        dto: CreatePatternDto,
    ): Promise<EarningPattern> {
        if (!dto.name?.trim()) {
            throw new BadRequestException('Pattern name is required.')
        }
        const valid = ['upfront', 'straight_line', 'interpolated']
        if (!valid.includes(dto.patternType)) {
            throw new BadRequestException(`patternType must be one of: ${valid.join(', ')}.`)
        }
        const earnByValid = ['day', 'period']
        if (dto.earnBy && !earnByValid.includes(dto.earnBy)) {
            throw new BadRequestException(`earnBy must be 'day' or 'period'.`)
        }

        const pattern = this.patternRepo.create({
            orgCode,
            name: dto.name.trim(),
            patternType: dto.patternType,
            earnBy: dto.earnBy ?? 'day',
            description: dto.description?.trim() ?? null,
            isActive: true,
            createdBy: username,
        })
        return this.patternRepo.save(pattern)
    }

    async deactivatePattern(id: number, orgCode: string): Promise<void> {
        const pattern = await this.patternRepo.findOne({ where: { id, orgCode } })
        if (!pattern) throw new NotFoundException('Earning pattern not found.')
        if (!pattern.isActive) return
        pattern.isActive = false
        await this.patternRepo.save(pattern)
    }

    // -------------------------------------------------------------------------
    // Interpolation points
    // -------------------------------------------------------------------------

    async getPoints(patternId: number, orgCode: string): Promise<EarningPatternPoint[]> {
        await this.requirePattern(patternId, orgCode, 'interpolated')
        return this.pointRepo.find({
            where: { patternId },
            order: { pctThroughPolicy: 'ASC' },
        })
    }

    async createPoint(
        patternId: number,
        orgCode: string,
        dto: CreatePointDto,
    ): Promise<EarningPatternPoint> {
        await this.requirePattern(patternId, orgCode, 'interpolated')
        this.validatePointValues(dto)

        // Prevent duplicate pct_through_policy within the same pattern
        const existing = await this.pointRepo.findOne({
            where: { patternId, pctThroughPolicy: String(dto.pctThroughPolicy) as any },
        })
        if (existing) {
            throw new BadRequestException(
                `A point at ${dto.pctThroughPolicy}% through policy already exists.`,
            )
        }

        // Validate running total would not exceed 100
        const points = await this.pointRepo.find({ where: { patternId } })
        const currentTotal = points.reduce(
            (sum, p) => sum + parseFloat(p.pctEarnedIncrement),
            0,
        )
        if (currentTotal + dto.pctEarnedIncrement > 100 + 1e-9) {
            throw new BadRequestException(
                `Adding this increment (${dto.pctEarnedIncrement}%) would exceed 100%. ` +
                `Current total: ${currentTotal.toFixed(4)}%.`,
            )
        }

        const sortOrder = points.length
        const point = this.pointRepo.create({
            patternId,
            pctThroughPolicy: String(dto.pctThroughPolicy) as any,
            pctEarnedIncrement: String(dto.pctEarnedIncrement) as any,
            sortOrder,
        })
        return this.pointRepo.save(point)
    }

    async deletePoint(
        patternId: number,
        pointId: number,
        orgCode: string,
    ): Promise<void> {
        await this.requirePattern(patternId, orgCode, 'interpolated')
        const point = await this.pointRepo.findOne({ where: { id: pointId, patternId } })
        if (!point) throw new NotFoundException('Earning pattern point not found.')
        await this.pointRepo.remove(point)
    }

    // -------------------------------------------------------------------------
    // Rules
    // -------------------------------------------------------------------------

    async getRules(orgCode: string): Promise<EarningPatternRule[]> {
        return this.ruleRepo.find({
            where: { orgCode, isActive: true },
            order: { priority: 'ASC' },
        })
    }

    async createRule(
        orgCode: string,
        username: string,
        dto: CreateRuleDto,
    ): Promise<EarningPatternRule> {
        await this.requirePatternById(dto.patternId, orgCode)

        const priority = dto.priority ?? (await this.nextPriority(orgCode))

        const rule = this.ruleRepo.create({
            orgCode,
            patternId: dto.patternId,
            priority,
            classOfBusiness: dto.classOfBusiness ?? null,
            contractType: dto.contractType ?? null,
            includeIncepted: dto.includeIncepted ?? true,
            isActive: true,
            createdBy: username,
        })
        return this.ruleRepo.save(rule)
    }

    async updateRule(
        id: number,
        orgCode: string,
        dto: UpdateRuleDto,
    ): Promise<EarningPatternRule> {
        const rule = await this.ruleRepo.findOne({ where: { id, orgCode } })
        if (!rule) throw new NotFoundException('Earning rule not found.')

        if (dto.patternId !== undefined) {
            await this.requirePatternById(dto.patternId, orgCode)
            rule.patternId = dto.patternId
        }
        if (dto.priority !== undefined) rule.priority = dto.priority
        if (dto.classOfBusiness !== undefined) rule.classOfBusiness = dto.classOfBusiness ?? null
        if (dto.contractType !== undefined) rule.contractType = dto.contractType ?? null
        if (dto.includeIncepted !== undefined) rule.includeIncepted = dto.includeIncepted

        return this.ruleRepo.save(rule)
    }

    async deactivateRule(id: number, orgCode: string): Promise<void> {
        const rule = await this.ruleRepo.findOne({ where: { id, orgCode } })
        if (!rule) throw new NotFoundException('Earning rule not found.')
        if (!rule.isActive) return
        rule.isActive = false
        await this.ruleRepo.save(rule)
    }

    // -------------------------------------------------------------------------
    // Pattern resolver — REQ-EARN-F-001, F-002 (shared with EarningEngineService)
    // -------------------------------------------------------------------------

    /**
     * Evaluate active rules for the org, ordered by priority ASC.
     * Returns null when no rule matches (controller layer decides response code).
     */
    async resolvePatternForSection(
        dto: { classOfBusiness: string; contractType: string; includeIncepted: boolean },
        orgCode: string,
    ): Promise<{ resolvedEarningPatternId: number; patternName: string } | null> {
        const rules = await this.ruleRepo
            .createQueryBuilder('r')
            .where('r.org_code = :orgCode', { orgCode })
            .andWhere('r.is_active = :active', { active: true })
            .orderBy('r.priority', 'ASC')
            .getMany()

        for (const rule of rules) {
            if (rule.classOfBusiness !== null && rule.classOfBusiness !== dto.classOfBusiness) continue
            if (rule.contractType !== null && rule.contractType !== dto.contractType) continue
            if (rule.includeIncepted !== dto.includeIncepted) continue

            const pattern = await this.patternRepo.findOne({ where: { id: rule.patternId } })
            return {
                resolvedEarningPatternId: rule.patternId,
                patternName: pattern?.name ?? 'Unknown',
            }
        }

        return null
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private async requirePattern(
        patternId: number,
        orgCode: string,
        requiredType?: string,
    ): Promise<EarningPattern> {
        const pattern = await this.patternRepo.findOne({
            where: { id: patternId, orgCode, isActive: true },
        })
        if (!pattern) throw new NotFoundException('Earning pattern not found.')
        if (requiredType && pattern.patternType !== requiredType) {
            throw new BadRequestException(
                `Pattern points are only valid for '${requiredType}' patterns.`,
            )
        }
        return pattern
    }

    private async requirePatternById(
        patternId: number,
        orgCode: string,
    ): Promise<EarningPattern> {
        const pattern = await this.patternRepo.findOne({
            where: { id: patternId, orgCode, isActive: true },
        })
        if (!pattern) {
            throw new NotFoundException(`Earning pattern ${patternId} not found for this organisation.`)
        }
        return pattern
    }

    private validatePointValues(dto: CreatePointDto): void {
        const pct = dto.pctThroughPolicy
        const inc = dto.pctEarnedIncrement
        if (typeof pct !== 'number' || pct <= 0 || pct > 100) {
            throw new BadRequestException('pctThroughPolicy must be > 0 and ≤ 100.')
        }
        if (typeof inc !== 'number' || inc <= 0) {
            throw new BadRequestException('pctEarnedIncrement must be > 0.')
        }
    }

    private async nextPriority(orgCode: string): Promise<number> {
        const result = await this.ruleRepo
            .createQueryBuilder('r')
            .select('MAX(r.priority)', 'max')
            .where('r.org_code = :orgCode AND r.is_active = true', { orgCode })
            .getRawOne<{ max: string | null }>()
        const max = result?.max != null ? parseInt(result.max, 10) : -1
        return max + 1
    }
}
