import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ScheduleModule } from '@nestjs/schedule'
import { EarningEngineController } from './earning-engine.controller'
import { EarningEngineService } from './earning-engine.service'
import { EarningEngineCronService } from './earning-engine-cron.service'
import { PolicyEarningPeriod } from './policy-earning-period.entity'
import { EarningPattern, EarningPatternPoint, EarningPatternRule } from '../entities/earning-pattern.entity'
import { Policy } from '../entities/policy.entity'
import { PolicySection } from '../entities/policy-section.entity'
import { AuthModule } from '../auth/auth.module'

@Module({
    imports: [
        TypeOrmModule.forFeature([
            PolicyEarningPeriod,
            EarningPattern,
            EarningPatternPoint,
            EarningPatternRule,
            PolicySection,
            Policy,
        ]),
        ScheduleModule.forRoot(),
        AuthModule,
    ],
    controllers: [EarningEngineController],
    providers: [EarningEngineService, EarningEngineCronService],
    exports: [EarningEngineService],
})
export class EarningEngineModule {}
