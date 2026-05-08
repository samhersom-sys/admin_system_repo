import { Module } from '@nestjs/common'
import { HomeController } from './home.controller'
import { HomeService } from './home.service'
import { MeasuresModule } from '../measures/measures.module'

@Module({
    imports: [MeasuresModule],
    controllers: [HomeController],
    providers: [HomeService],
})
export class HomeModule { }
