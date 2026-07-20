import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../entities/user.entity'
import { UserHomepagePreference } from '../entities/user-homepage-preference.entity'
import { ReportTemplate } from '../entities/report-template.entity'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

@Module({
    imports: [TypeOrmModule.forFeature([User, UserHomepagePreference, ReportTemplate])],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule {}
