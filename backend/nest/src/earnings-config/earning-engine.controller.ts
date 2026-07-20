import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
    UnprocessableEntityException,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { EarningEngineService } from './earning-engine.service'

/**
 * EarningEngineController — REQ-EARN-F-001, F-002, F-009, F-010, F-011
 *
 * All routes require a valid JWT (JwtAuthGuard) and are role-gated (RolesGuard).
 */
@Controller('earning-engine')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EarningEngineController {
    constructor(private readonly earningEngineService: EarningEngineService) {}

    // -------------------------------------------------------------------------
    // POST /earning-engine/sections/resolve — REQ-EARN-F-001, F-002
    // -------------------------------------------------------------------------

    /**
     * Resolve the earning pattern for a section's attributes.
     * Returns { resolvedEarningPatternId, patternName } or HTTP 422.
     */
    @Post('sections/resolve')
    @Roles('client_admin', 'internal_admin')
    @HttpCode(HttpStatus.OK)
    async resolvePattern(
        @Request() req: any,
        @Body() body: { classOfBusiness: string; contractType: string; includeIncepted: boolean },
    ) {
        try {
            return await this.earningEngineService.resolvePatternForSection(req.user.orgCode, body)
        } catch (err) {
            if (err instanceof UnprocessableEntityException) {
                // Ensure the response body always carries a `message` property
                // so clients and tests can access res.body.message.unmatchedAttributes
                throw new UnprocessableEntityException({ message: err.getResponse() })
            }
            throw err
        }
    }

    // -------------------------------------------------------------------------
    // POST /earning-engine/run — REQ-EARN-F-009
    // -------------------------------------------------------------------------

    /**
     * Batch-recalculate all active sections org-wide.
     * Restricted to internal_admin only.
     */
    @Post('run')
    @Roles('internal_admin')
    @HttpCode(HttpStatus.OK)
    async runBatch() {
        return this.earningEngineService.runBatchCalculation()
    }

    // -------------------------------------------------------------------------
    // POST /earning-engine/sections/:sectionId/calculate — REQ-EARN-F-010
    // -------------------------------------------------------------------------

    /**
     * Trigger earning calculation for a single section.
     */
    @Post('sections/:sectionId/calculate')
    @Roles('client_admin', 'internal_admin')
    @HttpCode(HttpStatus.OK)
    async calculateSection(
        @Param('sectionId') sectionId: string,
        @Request() req: any,
    ) {
        await this.earningEngineService.calculateForSection(+sectionId, req.user.orgCode)
        return { processed: 1, errors: [] }
    }

    // -------------------------------------------------------------------------
    // GET /earning-engine/sections/:sectionId/periods — REQ-EARN-F-011
    // -------------------------------------------------------------------------

    /**
     * List earning periods for a section, ordered year/month ASC.
     */
    @Get('sections/:sectionId/periods')
    @Roles('client_admin', 'internal_admin')
    async getPeriods(
        @Param('sectionId') sectionId: string,
        @Request() req: any,
    ) {
        return this.earningEngineService.getPeriodsForSection(+sectionId, req.user.orgCode)
    }
}
