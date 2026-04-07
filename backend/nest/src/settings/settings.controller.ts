import {
    Controller,
    Get,
    Post,
    Put,
    Param,
    Body,
    Req,
    UseGuards,
    HttpCode,
    HttpStatus,
    ParseIntPipe,
} from '@nestjs/common'
import { SettingsService } from './settings.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'

/**
 * SettingsController — /api/settings
 *
 * REQ-SETTINGS-BE-F-001 through F-005
 *
 * GET  /api/settings/products                        — list products for org
 * POST /api/settings/products                        — create product
 * GET  /api/settings/products/:id                    — get product by id
 * PUT  /api/settings/products/:id                    — update product
 * GET  /api/settings/products/:id/workflow-steps     — get workflow steps
 * GET  /api/settings/data-quality                    — get DQ settings
 * PUT  /api/settings/data-quality                    — save DQ settings
 */
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('client_admin', 'internal_admin')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    // -------------------------------------------------------------------------
    // Products
    // -------------------------------------------------------------------------

    @Get('products')
    async getProducts(@Req() req: any) {
        return this.settingsService.getProducts(req.user.orgCode)
    }

    @Post('products')
    @HttpCode(HttpStatus.CREATED)
    async createProduct(@Body() body: any, @Req() req: any) {
        return this.settingsService.createProduct(req.user.orgCode, body)
    }

    @Get('products/:id')
    async getProductById(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.settingsService.getProductById(id, req.user.orgCode)
    }

    @Put('products/:id')
    @HttpCode(HttpStatus.OK)
    async updateProduct(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any) {
        return this.settingsService.updateProduct(id, req.user.orgCode, body)
    }

    @Get('products/:id/workflow-steps')
    async getWorkflowSteps(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.settingsService.getWorkflowSteps(id, req.user.orgCode)
    }

    // -------------------------------------------------------------------------
    // Data Quality
    // -------------------------------------------------------------------------

    @Get('data-quality')
    async getDataQualitySettings(@Req() req: any) {
        return this.settingsService.getDataQualitySettings(req.user.orgCode)
    }

    @Put('data-quality')
    @HttpCode(HttpStatus.OK)
    async saveDataQualitySettings(@Body() body: any, @Req() req: any) {
        await this.settingsService.saveDataQualitySettings(req.user.orgCode, body)
        return { message: 'Data quality settings saved successfully' }
    }
}
