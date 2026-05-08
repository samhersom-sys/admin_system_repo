import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common'
import { SearchService } from './search.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
    constructor(private readonly searchService: SearchService) {}

    @Get('created-by-options')
    getCreatedByOptions(@Req() req: any) {
        const user = req.user
        return this.searchService.getCreatedByOptions(user.orgCode)
    }

    @Get()
    search(@Query() query: Record<string, string>, @Req() req: any) {
        const user = req.user
        return this.searchService.search(
            query,
            user.orgCode,
        )
    }
}
