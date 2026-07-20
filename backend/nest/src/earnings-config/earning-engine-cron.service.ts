import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { EarningEngineService } from './earning-engine.service'

/**
 * EarningEngineCronService — REQ-EARN-F-008
 *
 * Runs the earning engine nightly at 02:00 UTC for all qualifying sections
 * across all tenants.
 */
@Injectable()
export class EarningEngineCronService {
    private readonly logger = new Logger(EarningEngineCronService.name)

    constructor(private readonly earningEngineService: EarningEngineService) {}

    /**
     * Nightly earning run — 02:00 UTC every day.
     * Fetches all qualifying sections (resolved_earning_pattern_id IS NOT NULL,
     * policy status = Active) and recalculates each one.
     */
    @Cron('0 2 * * *')
    async runNightlyEarningJob(): Promise<void> {
        this.logger.log('Nightly earning run started')
        const sections = await this.earningEngineService.getQualifyingSections()
        const calcDate = new Date()
        let processed = 0
        const errors: string[] = []

        for (const section of sections) {
            try {
                await this.earningEngineService.calculateForSection(section.id, (section as any).orgCode ?? '', calcDate)
                processed++
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err)
                errors.push(msg)
                this.logger.error(`Failed section ${section.id}: ${msg}`)
            }
        }

        this.logger.log(
            `Nightly earning run complete: processed=${processed}, errors=${errors.length}`,
        )
    }
}
