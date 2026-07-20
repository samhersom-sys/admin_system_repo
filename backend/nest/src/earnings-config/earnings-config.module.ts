import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { EarningsConfigController } from './earnings-config.controller'
import { EarningsConfigService } from './earnings-config.service'
import { EarningPattern, EarningPatternPoint, EarningPatternRule } from '../entities/earning-pattern.entity'
import { AuthModule } from '../auth/auth.module'

@Module({
    imports: [
        TypeOrmModule.forFeature([EarningPattern, EarningPatternPoint, EarningPatternRule]),
        AuthModule,
    ],
    controllers: [EarningsConfigController],
    providers: [EarningsConfigService],
    exports: [EarningsConfigService],
})
export class EarningsConfigModule { }
