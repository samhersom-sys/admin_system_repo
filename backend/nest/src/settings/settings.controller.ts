import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Patch,
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
 * GET  /api/settings/product-categories              — list categories for org
 * POST /api/settings/product-categories              — create category
 * DELETE /api/settings/product-categories/:id        — delete category
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

    @Get('product-categories')
    async getProductCategories(@Req() req: any) {
        return this.settingsService.getProductCategories(req.user.orgCode)
    }

    @Post('product-categories')
    @HttpCode(HttpStatus.CREATED)
    async createProductCategory(@Body() body: any, @Req() req: any) {
        return this.settingsService.createProductCategory(req.user.orgCode, body)
    }

    @Delete('product-categories/:id')
    @HttpCode(HttpStatus.OK)
    async deleteProductCategory(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.settingsService.deleteProductCategory(id, req.user.orgCode)
    }

    @Get('products/:id/workflow-steps')
    async getWorkflowSteps(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.settingsService.getWorkflowSteps(id, req.user.orgCode)
    }

    @Get('products/:id/policy-grain-defaults-metadata')
    async getPolicyGrainDefaultsMetadata(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.settingsService.getPolicyGrainDefaultsMetadata(id, req.user.orgCode)
    }

    @Get('products/:id/grain-defaults/:grain/:rowId')
    async getGrainDefaults(
        @Param('id', ParseIntPipe) id: number,
        @Param('grain') grain: string,
        @Param('rowId') rowId: string,
        @Req() req: any,
    ) {
        return this.settingsService.getGrainDefaults(id, grain, rowId, req.user.orgCode)
    }

    @Put('products/:id/grain-defaults/:grain/:rowId')
    @HttpCode(HttpStatus.OK)
    async saveGrainDefaults(
        @Param('id', ParseIntPipe) id: number,
        @Param('grain') grain: string,
        @Param('rowId') rowId: string,
        @Body() body: { rows: { applicableField: string; rule: string; value: string | null }[] },
        @Req() req: any,
    ) {
        return this.settingsService.saveGrainDefaults(id, grain, rowId, req.user.orgCode, body.rows ?? [])
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

    // -------------------------------------------------------------------------
    // User Management: REQ-SETTINGS-USERS-BE-001 through BE-004
    // -------------------------------------------------------------------------

    @Get('users')
    @Roles('internal_admin')
    async getAdminUsers() {
        return this.settingsService.getAdminUsers()
    }

    @Post('users')
    @Roles('internal_admin')
    @HttpCode(HttpStatus.CREATED)
    async createUser(@Body() body: any, @Req() req: any) {
        return this.settingsService.createUser(body, req.user)
    }

    @Get('users/:id')
    @Roles('internal_admin')
    async getUserById(@Param('id', ParseIntPipe) id: number) {
        return this.settingsService.getUserById(id)
    }

    @Patch('users/:id')
    @Roles('internal_admin')
    @HttpCode(HttpStatus.OK)
    async updateUser(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { role?: string; isActive?: boolean; fullName?: string; email?: string },
        @Req() req: any,
    ) {
        return this.settingsService.updateUser(req.user.id, id, body)
    }

    @Get('users/:id/audit')
    @Roles('internal_admin')
    async getUserAudit(@Param('id', ParseIntPipe) id: number) {
        return this.settingsService.getUserAudit(id)
    }

    @Post('users/:id/audit')
    @Roles('internal_admin')
    @HttpCode(HttpStatus.OK)
    async postUserAudit(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: any,
        @Req() req: any,
    ) {
        return this.settingsService.postUserAudit(id, body, req.user)
    }
}
