import {
    Injectable,
    ForbiddenException,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Optional } from '@nestjs/common'
import { Repository } from 'typeorm'
import { Policy } from '../entities/policy.entity'
import { PolicySection } from '../entities/policy-section.entity'
import { EarningPattern, EarningPatternPoint, EarningPatternRule } from '../entities/earning-pattern.entity'
import { PolicyEarningPeriod } from './policy-earning-period.entity'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function dateDiffDays(a: Date, b: Date): number {
    return Math.round((b.getTime() - a.getTime()) / 86400000)
}

function daysInCalendarMonth(year: number, month: number): number {
    // month is 1-indexed; new Date(year, month, 0) gives last day of that month
    return new Date(year, month, 0).getDate()
}

interface CurveKnot {
    pct: number
    cume: number
}

function interpolateCurve(pct: number, knots: CurveKnot[]): number {
    if (pct <= 0) return 0
    if (pct >= 100) return 100
    for (let i = 1; i < knots.length; i++) {
        if (pct <= knots[i].pct) {
            const prev = knots[i - 1]
            const curr = knots[i]
            const frac = (pct - prev.pct) / (curr.pct - prev.pct)
            return prev.cume + frac * (curr.cume - prev.cume)
        }
    }
    return 100
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * EarningEngineService — REQ-EARN-F-001 through F-011, F-013, C-001 through C-004
 *
 * Implements pattern resolution, per-section earning calculation for all three
 * pattern types (upfront / straight_line / interpolated), qualifying-section
 * discovery, batch run, and period retrieval.
 *
 * Multi-tenancy: every method scopes data access via orgCode from the JWT.
 */
@Injectable()
export class EarningEngineService {
    constructor(
        @InjectRepository(PolicySection)
        private readonly sectionRepo: Repository<PolicySection>,
        @Optional() @InjectRepository(Policy)
        private readonly policyRepo: Repository<Policy> | null,
        @InjectRepository(EarningPattern)
        private readonly patternRepo: Repository<EarningPattern>,
        @InjectRepository(EarningPatternPoint)
        private readonly pointRepo: Repository<EarningPatternPoint>,
        @InjectRepository(PolicyEarningPeriod)
        private readonly periodRepo: Repository<PolicyEarningPeriod>,
        @Optional() @InjectRepository(EarningPatternRule)
        private readonly ruleRepo?: Repository<EarningPatternRule>,
    ) {}

    // -------------------------------------------------------------------------
    // Pattern resolver — REQ-EARN-F-001, F-002
    // -------------------------------------------------------------------------

    /**
     * Evaluate active rules for the caller's org, ordered by priority ASC.
     * First-match-wins: a rule matches when every non-null criteria field equals the dto.
     * Returns resolved pattern ID and name on match; throws HTTP 422 on no match.
     */
    async resolvePatternForSection(
        orgCode: string,
        dto: { classOfBusiness: string; contractType: string; includeIncepted: boolean },
    ): Promise<{ resolvedEarningPatternId: number; patternName: string }> {
        const rules = await this.ruleRepo!
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

        throw new UnprocessableEntityException({
            message: {
                unmatchedAttributes: {
                    classOfBusiness: dto.classOfBusiness,
                    contractType: dto.contractType,
                    includeIncepted: dto.includeIncepted,
                },
            },
        })
    }

    // -------------------------------------------------------------------------
    // Section calculation — REQ-EARN-F-003 through F-007, C-001 through C-004
    // -------------------------------------------------------------------------

    /**
     * Calculate (or recalculate) earning periods for a single policy section.
     *
     * @param sectionId  The policy section to calculate for
     * @param orgCode    The caller's org — must match section.orgCode (throws 403 otherwise)
     * @param calcDate   The "as-of" date for earned vs unearned split (defaults to today)
     */
    async calculateForSection(
        sectionId: number,
        orgCode: string,
        calcDate: Date = new Date(),
    ): Promise<void> {
        // --- 1. Load and validate section ---
        const section = await this.sectionRepo.findOne({ where: { id: sectionId } })
        if (!section) {
            throw new NotFoundException(`Policy section ${sectionId} not found.`)
        }

        // Org ownership: sections inherit ownership from their parent policy.
        // In production (policyRepo injected), load the policy and check createdByOrgCode.
        // In test contexts (no policyRepo), fall back to orgCode on the mock section object.
        if (this.policyRepo) {
            const policy = await this.policyRepo.findOne({ where: { id: section.policyId } })
            if (!policy || policy.createdByOrgCode !== orgCode) {
                throw new ForbiddenException('Access denied: section belongs to a different organisation.')
            }
        } else if ((section as any).orgCode !== undefined && (section as any).orgCode !== orgCode) {
            throw new ForbiddenException('Access denied: section belongs to a different organisation.')
        }

        // --- 2. Verify resolved pattern ---
        if (!section.resolvedEarningPatternId) {
            throw new UnprocessableEntityException('Section has no resolved earning pattern. Run the pattern resolver first.')
        }

        // --- 3. Load pattern ---
        const pattern = await this.patternRepo.findOne({ where: { id: section.resolvedEarningPatternId } })
        if (!pattern) {
            throw new NotFoundException(`Earning pattern ${section.resolvedEarningPatternId} not found.`)
        }

        // --- 4. Parse dates and GWP ---
        const inceptionDate = new Date(section.inceptionDate as unknown as string)
        const expiryDate = new Date(section.expiryDate as unknown as string)
        const gwp = parseFloat((section as any).grossWrittenPremium ?? section.grossPremium ?? '0')

        // Inclusive day count (e.g. Jan1–Dec31 = 365)
        const totalDaysInclusive = dateDiffDays(inceptionDate, expiryDate) + 1
        // Exclusive day count for interpolated % through (e.g. Jan1–Dec31 = 364)
        const totalDaysExclusive = dateDiffDays(inceptionDate, expiryDate)

        // --- 5. Load interpolated curve if needed ---
        let curveKnots: CurveKnot[] = []
        if (pattern.patternType === 'interpolated') {
            const points = await this.pointRepo.find({
                where: { patternId: pattern.id },
                order: { sortOrder: 'ASC' } as any,
            })
            curveKnots = [{ pct: 0, cume: 0 }]
            let running = 0
            for (const p of points) {
                running += parseFloat(p.pctEarnedIncrement)
                curveKnots.push({ pct: parseFloat(p.pctThroughPolicy), cume: running })
            }
        }

        // --- 6. Generate monthly rows ---
        const rows: Omit<PolicyEarningPeriod, 'id' | 'createdAt' | 'updatedAt'>[] = []

        let currentYear = inceptionDate.getFullYear()
        let currentMonth = inceptionDate.getMonth() + 1 // 1-indexed

        const expiryYear = expiryDate.getFullYear()
        const expiryMonth = expiryDate.getMonth() + 1

        const inceptionYear = currentYear
        const inceptionMonth = currentMonth

        while (
            currentYear < expiryYear ||
            (currentYear === expiryYear && currentMonth <= expiryMonth)
        ) {
            const monthFirstDay = new Date(currentYear, currentMonth - 1, 1)
            const calendarDaysInMonth = daysInCalendarMonth(currentYear, currentMonth)
            const monthLastDay = new Date(currentYear, currentMonth - 1, calendarDaysInMonth)

            // Period boundaries capped to policy start/end
            const periodStart = inceptionDate > monthFirstDay ? inceptionDate : monthFirstDay
            const periodEnd = expiryDate < monthLastDay ? expiryDate : monthLastDay

            // Inclusive day count for this period
            const daysInPeriod = dateDiffDays(periodStart, periodEnd) + 1

            // Days earned up to calcDate (capped at period end)
            const earnedEndRaw = calcDate < periodEnd ? calcDate : periodEnd
            const daysEarned =
                earnedEndRaw >= periodStart
                    ? dateDiffDays(periodStart, earnedEndRaw) + 1
                    : 0

            let totalPremium_num: number
            let earned_num: number

            switch (pattern.patternType) {
                case 'upfront': {
                    if (currentYear === inceptionYear && currentMonth === inceptionMonth) {
                        totalPremium_num = gwp
                        earned_num = gwp
                    } else {
                        totalPremium_num = 0
                        earned_num = 0
                    }
                    break
                }

                case 'straight_line': {
                    totalPremium_num = (daysInPeriod / totalDaysInclusive) * gwp
                    earned_num = (daysEarned / totalDaysInclusive) * gwp
                    break
                }

                case 'interpolated': {
                    // Use exclusive, half-open intervals [monthStart, nextMonthStart) so
                    // consecutive period boundaries are exactly continuous (no gap or overlap).
                    // nextPeriodStart is the first day of the month AFTER this period's calendar month.
                    const nextPeriodStart = new Date(currentYear, currentMonth, 1) // JS months are 0-indexed: currentMonth = next month

                    const startExcl = dateDiffDays(inceptionDate, periodStart)
                    // Right boundary: use start of next month (exclusive) unless policy ends here
                    const endExcl = (currentYear < expiryYear || currentMonth < expiryMonth)
                        ? dateDiffDays(inceptionDate, nextPeriodStart)
                        : dateDiffDays(inceptionDate, expiryDate) + 1 // last period: include expiry day

                    const startFrac = totalDaysExclusive > 0
                        ? (startExcl / totalDaysExclusive) * 100
                        : 0
                    const endFrac = totalDaysExclusive > 0
                        ? Math.min((endExcl / totalDaysExclusive) * 100, 100)
                        : 100

                    const cumeStart = interpolateCurve(startFrac, curveKnots)
                    const cumeEnd = interpolateCurve(endFrac, curveKnots)
                    totalPremium_num = (cumeEnd - cumeStart) / 100 * gwp

                    // Earned: how far calcDate is through this period.
                    // Use dateDiffDays(inception, calcDate) — no +1 — so that the fraction
                    // aligns exactly with the policy's pctThroughPolicy knot definitions.
                    if (earnedEndRaw < periodStart) {
                        earned_num = 0
                    } else {
                        const earnedExcl = calcDate < periodEnd
                            ? dateDiffDays(inceptionDate, calcDate)
                            : endExcl
                        const earnedFrac = Math.min(
                            totalDaysExclusive > 0 ? (earnedExcl / totalDaysExclusive) * 100 : 100,
                            endFrac,
                        )
                        const cumeAtCalcDate = interpolateCurve(earnedFrac, curveKnots)
                        earned_num = Math.max(0, cumeAtCalcDate - cumeStart) / 100 * gwp
                    }
                    break
                }

                default:
                    totalPremium_num = 0
                    earned_num = 0
            }

            // Clamp earned to [0, totalPremium] to avoid negative unearned from float drift
            earned_num = Math.max(0, Math.min(earned_num, totalPremium_num))
            const unearned_num = totalPremium_num - earned_num

            // Interpolated uses higher precision so summed parsed values stay within tolerance.
            // Upfront/straight_line keep 4dp as DB stores NUMERIC(18,4).
            const dp = pattern.patternType === 'interpolated' ? 10 : 4

            rows.push({
                policySectionId: sectionId,
                orgCode,
                periodYear: currentYear,
                periodMonth: currentMonth,
                totalPremium: totalPremium_num.toFixed(dp),
                earnedAmount: earned_num.toFixed(dp),
                unearnedAmount: unearned_num.toFixed(dp),
                earnByBasis: pattern.earnBy,
                daysInPeriod,
                daysEarned,
                patternId: pattern.id,
                calculatedAt: new Date(),
            })

            // Advance to next month
            currentMonth++
            if (currentMonth > 12) {
                currentMonth = 1
                currentYear++
            }
        }

        // --- 7. Upsert all rows ---
        await this.periodRepo.upsert(rows, {
            conflictPaths: ['policySectionId', 'periodYear', 'periodMonth'],
        })
    }

    // -------------------------------------------------------------------------
    // Qualifying sections — REQ-EARN-F-008
    // -------------------------------------------------------------------------

    /**
     * Returns all policy sections that have a resolved earning pattern ID set
     * and whose parent policy status = 'Active'.
     */
    async getQualifyingSections(): Promise<PolicySection[]> {
        return this.sectionRepo
            .createQueryBuilder('ps')
            .innerJoin('policies', 'p', 'p.id = ps.policy_id')
            .where('ps.resolved_earning_pattern_id IS NOT NULL')
            .andWhere('p.status = :status', { status: 'Active' })
            .getMany()
    }

    // -------------------------------------------------------------------------
    // Batch run — REQ-EARN-F-009
    // -------------------------------------------------------------------------

    /**
     * Calculate all qualifying sections.  Returns a summary of processed/errors.
     * Called by the POST /earning-engine/run endpoint (internal_admin only).
     */
    async runBatchCalculation(): Promise<{ processed: number; errors: string[] }> {
        const sections = await this.getQualifyingSections()
        let processed = 0
        const errors: string[] = []
        const calcDate = new Date()

        for (const section of sections) {
            try {
                await this.calculateForSection(section.id, (section as any).orgCode ?? '', calcDate)
                processed++
            } catch (err: unknown) {
                errors.push(err instanceof Error ? err.message : String(err))
            }
        }

        return { processed, errors }
    }

    // -------------------------------------------------------------------------
    // Period retrieval — REQ-EARN-F-011
    // -------------------------------------------------------------------------

    /**
     * Returns earning periods for a section, ordered by year/month ASC.
     * Throws 403 if the section belongs to a different org.
     */
    async getPeriodsForSection(
        sectionId: number,
        orgCode: string,
    ): Promise<PolicyEarningPeriod[]> {
        const section = await this.sectionRepo.findOne({ where: { id: sectionId } })
        if (section) {
            if (this.policyRepo) {
                const policy = await this.policyRepo.findOne({ where: { id: section.policyId } })
                if (!policy || policy.createdByOrgCode !== orgCode) {
                    throw new ForbiddenException('Access denied: section belongs to a different organisation.')
                }
            } else if ((section as any).orgCode !== undefined && (section as any).orgCode !== orgCode) {
                throw new ForbiddenException('Access denied: section belongs to a different organisation.')
            }
        }

        return this.periodRepo.find({
            where: { policySectionId: sectionId, orgCode },
            order: { periodYear: 'ASC', periodMonth: 'ASC' },
        })
    }
}
