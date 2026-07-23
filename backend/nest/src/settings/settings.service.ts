import {
    BadRequestException,
    ConflictException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, getMetadataArgsStorage } from 'typeorm'
import { logError } from '../shared/log-error'
import { QuoteSection } from '../entities/quote-section.entity'
import { QuoteSectionCoverage } from '../entities/policy-section-coverage.entity'
import { QuoteSectionCoverageDetail } from '../entities/coverage-detail.entity'

type PolicyGrainFieldOption = {
    value: string
    label: string
}

type PolicyGrainRuleOption = {
    value: string
    label: string
}

const POLICY_GRAIN_RULE_OPTIONS: PolicyGrainRuleOption[] = [
    { value: 'minimum_premium', label: 'Minimum Premium' },
    { value: 'maximum_premium', label: 'Maximum Premium' },
    { value: 'default_currency', label: 'Default Currency' },
    { value: 'default_loss_qualifier', label: 'Default Loss Qualifier' },
]

const QUOTE_SECTION_EXCLUDED_FIELDS = new Set([
    'id',
    'quote_id',
    'payload',
    'created_at',
    'deleted_at',
    'is_current',
])

const QUOTE_COVERAGE_EXCLUDED_FIELDS = new Set([
    'id',
    'quote_id',
    'section_id',
    'payload',
    'created_at',
    'deleted_at',
])

const QUOTE_COVERAGE_DETAIL_EXCLUDED_FIELDS = new Set([
    'id',
    'quote_id',
    'section_id',
    'coverage_id',
    'payload',
    'created_at',
    'deleted_at',
])

function toTitleCase(value: string): string {
    return value
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

function getEntityFieldNames(entity: Function): string[] {
    const columnMetadata = getMetadataArgsStorage().columns.filter((column) => column.target === entity)
    return columnMetadata.map((column) => {
        const dbName = column.options.name
        return typeof dbName === 'string' ? dbName : String(column.propertyName)
    })
}

function buildPolicyGrainFieldOptions(
    entity: Function,
    prefix: string,
    excludedFields: Set<string>,
): PolicyGrainFieldOption[] {
    const names = getEntityFieldNames(entity)
    return names
        .filter((name) => !excludedFields.has(name))
        .map((name) => ({
            value: `${prefix}.${name}`,
            label: toTitleCase(name),
        }))
}

function normalizeProductCode(value: string): string {
    return value
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .slice(0, 30)
}

function normalizeProductCategoryName(value: string): string {
    return value.trim().replace(/\s+/g, ' ')
}

function titleCaseProductType(value: string): string {
    return value
        .replace(/_/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ')
}

/**
 * SettingsService — REQ-SETTINGS-BE-F-001 through F-005
 *
 * Uses raw SQL via DataSource (no TypeORM entities for settings tables).
 */
@Injectable()
export class SettingsService {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) { }

    // -------------------------------------------------------------------------
    // Products: REQ-SETTINGS-BE-F-003
    // -------------------------------------------------------------------------

    async getProducts(orgCode: string): Promise<any[]> {
        return this.dataSource.query(
            `SELECT p.id, p.name, p.code, p.product_type,
                    p.product_category_id AS "productCategoryId",
                    COALESCE(pc.name, p.product_type) AS "productCategoryName",
                    p.line_of_business, p.underwriting_year, p.description, p.is_active
       FROM products p
       LEFT JOIN product_categories pc ON pc.id = p.product_category_id
       WHERE p.org_code = $1
       ORDER BY p.name`,
            [orgCode],
        )
    }

    async getProductById(id: number, orgCode: string): Promise<any> {
        const rows = await this.dataSource.query(
            `SELECT p.id, p.name, p.code, p.product_type,
                    p.product_category_id AS "productCategoryId",
                    COALESCE(pc.name, p.product_type) AS "productCategoryName",
                    p.line_of_business, p.underwriting_year, p.description, p.is_active
       FROM products p
       LEFT JOIN product_categories pc ON pc.id = p.product_category_id
       WHERE p.id = $1 AND p.org_code = $2`,
            [id, orgCode],
        )
        if (!rows.length) {
            await logError(this.dataSource, orgCode, null, 'GET /api/settings/products/:id', 'ERR_PRODUCT_NOT_FOUND', 'Product not found', { id })
            throw new NotFoundException({ error: 'Product not found' })
        }
        return rows[0]
    }

    async getProductCategories(orgCode: string): Promise<any[]> {
        return this.dataSource.query(
            `SELECT pc.id, pc.name, COUNT(p.id)::int AS "productCount"
       FROM product_categories pc
       LEFT JOIN products p ON p.product_category_id = pc.id AND p.org_code = $1
       WHERE pc.org_code = $1
       GROUP BY pc.id
       ORDER BY pc.name`,
            [orgCode],
        )
    }

    async createProductCategory(orgCode: string, body: any): Promise<any> {
        const name = normalizeProductCategoryName(String(body?.name ?? ''))
        if (!name) {
            throw new BadRequestException({ error: 'Product category name is required.' })
        }

        try {
            const rows = await this.dataSource.query(
                `INSERT INTO product_categories (org_code, name)
       VALUES ($1, $2)
       RETURNING id, name`,
                [orgCode, name],
            )
            return { ...rows[0], productCount: 0 }
        } catch (error: any) {
            if (error?.code === '23505') {
                throw new ConflictException({ error: 'Product category already exists.' })
            }
            await logError(
                this.dataSource,
                orgCode,
                null,
                'POST /api/settings/product-categories',
                'ERR_PRODUCT_CATEGORY_CREATE_FAILED',
                'Failed to create product category',
                { detail: error?.detail ?? null, name },
            )
            throw new InternalServerErrorException({ error: 'Failed to create product category.' })
        }
    }

    async deleteProductCategory(id: number, orgCode: string): Promise<{ deleted: boolean; id: number }> {
        const category = await this.dataSource.query(
            `SELECT id, name
       FROM product_categories
       WHERE id = $1 AND org_code = $2`,
            [id, orgCode],
        )
        if (!category.length) {
            throw new NotFoundException({ error: 'Product category not found.' })
        }

        const productCountRows = await this.dataSource.query(
            `SELECT COUNT(*)::int AS "productCount"
       FROM products
       WHERE product_category_id = $1 AND org_code = $2`,
            [id, orgCode],
        )
        const productCount = productCountRows[0]?.productCount ?? 0
        if (productCount > 0) {
            throw new ConflictException({ error: 'Product category cannot be deleted while products are attached.' })
        }

        await this.dataSource.query(
            `DELETE FROM product_categories
       WHERE id = $1 AND org_code = $2`,
            [id, orgCode],
        )
        return { deleted: true, id }
    }

    private async resolveProductCategory(orgCode: string, body: any): Promise<{ id: number; name: string } | null> {
        const rawCategoryId = body?.product_category_id ?? body?.productCategoryId ?? null
        if (rawCategoryId !== null && rawCategoryId !== undefined && String(rawCategoryId).trim() !== '') {
            const categoryId = Number(rawCategoryId)
            if (!Number.isInteger(categoryId)) {
                throw new BadRequestException({ error: 'Product category is invalid.' })
            }

            const rows = await this.dataSource.query(
                `SELECT id, name
           FROM product_categories
           WHERE id = $1 AND org_code = $2`,
                [categoryId, orgCode],
            )
            if (!rows.length) {
                throw new NotFoundException({ error: 'Product category not found.' })
            }
            return rows[0]
        }

        const fallbackName = normalizeProductCategoryName(String(body?.product_type ?? body?.productCategoryName ?? ''))
        if (!fallbackName) {
            return null
        }

        const existing = await this.dataSource.query(
            `SELECT id, name
       FROM product_categories
       WHERE org_code = $1 AND LOWER(name) = LOWER($2)
       LIMIT 1`,
            [orgCode, fallbackName],
        )
        if (existing.length) {
            return existing[0]
        }

        const created = await this.dataSource.query(
            `INSERT INTO product_categories (org_code, name)
       VALUES ($1, $2)
       RETURNING id, name`,
            [orgCode, fallbackName],
        )
        return created[0] ?? null
    }

    async createProduct(orgCode: string, body: any): Promise<any> {
        const name = String(body?.name ?? '').trim()
        if (!name) {
            throw new BadRequestException({ error: 'Product name is required.' })
        }

        if (!String(orgCode ?? '').trim()) {
            throw new BadRequestException({ error: 'Organisation code is required.' })
        }

        const normalizedCode = String(body?.code ?? '').trim() || normalizeProductCode(name)
        if (!normalizedCode) {
            throw new BadRequestException({ error: 'Product code is required.' })
        }

        const category = await this.resolveProductCategory(orgCode, body)
        if (!category) {
            throw new BadRequestException({ error: 'Product category is required.' })
        }

        try {
            const rows = await this.dataSource.query(
                `INSERT INTO products (org_code, name, code, product_type, product_category_id, line_of_business, underwriting_year, description, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, code, product_type, product_category_id AS "productCategoryId", line_of_business, underwriting_year, description, is_active`,
                [orgCode, name, normalizedCode, category.name, category.id, body.line_of_business, body.underwriting_year ?? new Date().getFullYear(), body.description ?? '', body.is_active ?? true],
            )
            return rows[0]
        } catch (error: any) {
            if (error?.code === '23505') {
                throw new ConflictException({ error: 'Product code already exists.' })
            }
            await logError(
                this.dataSource,
                orgCode,
                null,
                'POST /api/settings/products',
                'ERR_PRODUCT_CREATE_FAILED',
                'Failed to create product',
                { detail: error?.detail ?? null, code: normalizedCode },
            )
            throw new InternalServerErrorException({ error: 'Failed to create product.' })
        }
    }

    async updateProduct(id: number, orgCode: string, body: any): Promise<any> {
        const name = String(body?.name ?? '').trim()
        if (!name) {
            throw new BadRequestException({ error: 'Product name is required.' })
        }

        const normalizedCode = String(body?.code ?? '').trim() || normalizeProductCode(name)
        if (!normalizedCode) {
            throw new BadRequestException({ error: 'Product code is required.' })
        }

        const category = await this.resolveProductCategory(orgCode, body)
        if (!category) {
            throw new BadRequestException({ error: 'Product category is required.' })
        }

        try {
            await this.dataSource.query(
                `UPDATE products
       SET name = $1, code = $2, product_type = $3, product_category_id = $4, line_of_business = $5,
           underwriting_year = $6, description = $7, is_active = $8
       WHERE id = $9 AND org_code = $10`,
                [name, normalizedCode, category.name, category.id, body.line_of_business, body.underwriting_year, body.description, body.is_active, id, orgCode],
            )
        } catch (error: any) {
            if (error?.code === '23505') {
                throw new ConflictException({ error: 'Product code already exists.' })
            }
            await logError(
                this.dataSource,
                orgCode,
                null,
                'PUT /api/settings/products/:id',
                'ERR_PRODUCT_UPDATE_FAILED',
                'Failed to update product',
                { id, detail: error?.detail ?? null, code: normalizedCode },
            )
            throw new InternalServerErrorException({ error: 'Failed to update product.' })
        }
        return this.getProductById(id, orgCode)
    }

    async getWorkflowSteps(productId: number, orgCode: string): Promise<any[]> {
        return this.dataSource.query(
            `SELECT ws.id, ws.step_name, ws.step_code, ws.description, ws.is_active, ws.is_default, ws.sort_order
       FROM product_workflow_steps ws
       INNER JOIN products p ON p.id = ws.product_id
       WHERE ws.product_id = $1 AND p.org_code = $2
       ORDER BY ws.sort_order`,
            [productId, orgCode],
        )
    }

    async getPolicyGrainDefaultsMetadata(_productId: number, _orgCode: string): Promise<{
        rules: PolicyGrainRuleOption[]
        fieldsByPolicyGrain: {
            section: PolicyGrainFieldOption[]
            coverage: PolicyGrainFieldOption[]
            coverage_element: PolicyGrainFieldOption[]
        }
    }> {
        return {
            rules: POLICY_GRAIN_RULE_OPTIONS,
            fieldsByPolicyGrain: {
                section: buildPolicyGrainFieldOptions(QuoteSection, 'section', QUOTE_SECTION_EXCLUDED_FIELDS),
                coverage: buildPolicyGrainFieldOptions(QuoteSectionCoverage, 'coverage', QUOTE_COVERAGE_EXCLUDED_FIELDS),
                coverage_element: buildPolicyGrainFieldOptions(QuoteSectionCoverageDetail, 'coverage_element', QUOTE_COVERAGE_DETAIL_EXCLUDED_FIELDS),
            },
        }
    }

    // -------------------------------------------------------------------------
    // Policy Grain Defaults: per-row field defaults for a product
    // -------------------------------------------------------------------------

    async getGrainDefaults(productId: number, grain: string, rowId: string, orgCode: string): Promise<any[]> {
        const rows = await this.dataSource.query(
            `SELECT id, grain, row_id AS "rowId", applicable_field AS "applicableField",
                    rule, value, sort_order AS "sortOrder"
             FROM product_grain_defaults
             WHERE product_id = $1 AND org_code = $2 AND grain = $3 AND row_id = $4
             ORDER BY sort_order, id`,
            [productId, orgCode, grain, rowId],
        )
        return rows
    }

    async saveGrainDefaults(
        productId: number,
        grain: string,
        rowId: string,
        orgCode: string,
        rows: { applicableField: string; rule: string; value: string | null }[],
    ): Promise<any[]> {
        // Replace all existing rows for this product/grain/rowId with the new set
        await this.dataSource.query(
            `DELETE FROM product_grain_defaults
             WHERE product_id = $1 AND org_code = $2 AND grain = $3 AND row_id = $4`,
            [productId, orgCode, grain, rowId],
        )

        if (!rows.length) return []

        const values: any[] = []
        const placeholders = rows.map((row, i) => {
            const base = i * 7
            values.push(productId, orgCode, grain, rowId, row.applicableField, row.rule, row.value ?? null)
            return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, ${i})`
        })

        const inserted = await this.dataSource.query(
            `INSERT INTO product_grain_defaults
                (product_id, org_code, grain, row_id, applicable_field, rule, value, sort_order)
             VALUES ${placeholders.join(', ')}
             RETURNING id, grain, row_id AS "rowId", applicable_field AS "applicableField",
                       rule, value, sort_order AS "sortOrder"`,
            values,
        )
        return inserted
    }

    // -------------------------------------------------------------------------
    // Data Quality: REQ-SETTINGS-BE-F-004
    // -------------------------------------------------------------------------

    async getDataQualitySettings(orgCode: string): Promise<any> {
        const rows = await this.dataSource.query(
            `SELECT enable_ba_section_date_validation AS "enableBASectionDateValidation",
              enable_quote_mandatory_fields AS "enableQuoteMandatoryFields",
              enable_policy_mandatory_fields AS "enablePolicyMandatoryFields",
              exclude_draft_status AS "excludeDraftStatus",
              severity_threshold AS "severityThreshold",
              auto_check_on_save AS "autoCheckOnSave",
              email_notifications AS "emailNotifications",
              notification_email AS "notificationEmail"
       FROM data_quality_settings
       WHERE org_code = $1`,
            [orgCode],
        )
        if (!rows.length) {
            return {
                enableBASectionDateValidation: true,
                enableQuoteMandatoryFields: true,
                enablePolicyMandatoryFields: true,
                excludeDraftStatus: true,
                severityThreshold: 'medium',
                autoCheckOnSave: true,
                emailNotifications: false,
                notificationEmail: '',
            }
        }
        return rows[0]
    }

    async saveDataQualitySettings(orgCode: string, body: any): Promise<void> {
        const existing = await this.dataSource.query(
            `SELECT 1 FROM data_quality_settings WHERE org_code = $1`,
            [orgCode],
        )
        if (existing.length) {
            await this.dataSource.query(
                `UPDATE data_quality_settings
         SET enable_ba_section_date_validation = $1,
             enable_quote_mandatory_fields = $2,
             enable_policy_mandatory_fields = $3,
             exclude_draft_status = $4,
             severity_threshold = $5,
             auto_check_on_save = $6,
             email_notifications = $7,
             notification_email = $8
         WHERE org_code = $9`,
                [
                    body.enableBASectionDateValidation ?? true,
                    body.enableQuoteMandatoryFields ?? true,
                    body.enablePolicyMandatoryFields ?? true,
                    body.excludeDraftStatus ?? true,
                    body.severityThreshold ?? 'medium',
                    body.autoCheckOnSave ?? true,
                    body.emailNotifications ?? false,
                    body.notificationEmail ?? '',
                    orgCode,
                ],
            )
        } else {
            await this.dataSource.query(
                `INSERT INTO data_quality_settings
           (org_code, enable_ba_section_date_validation, enable_quote_mandatory_fields,
            enable_policy_mandatory_fields, exclude_draft_status, severity_threshold,
            auto_check_on_save, email_notifications, notification_email)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    orgCode,
                    body.enableBASectionDateValidation ?? true,
                    body.enableQuoteMandatoryFields ?? true,
                    body.enablePolicyMandatoryFields ?? true,
                    body.excludeDraftStatus ?? true,
                    body.severityThreshold ?? 'medium',
                    body.autoCheckOnSave ?? true,
                    body.emailNotifications ?? false,
                    body.notificationEmail ?? '',
                ],
            )
        }
    }
    // -------------------------------------------------------------------------
    // User management (internal_admin): REQ-SETTINGS-BE-F-005
    // -------------------------------------------------------------------------

    async getAdminUsers(): Promise<any[]> {
        return this.dataSource.query(
            `SELECT id, username, email, full_name AS "fullName", org_code AS "orgCode",
                    role, is_active AS "isActive", created_at AS "createdAt", last_login AS "lastLogin"
             FROM users ORDER BY full_name, username`,
        )
    }

    async createUser(body: any, caller: any): Promise<any> {
        const bcrypt = await import('bcryptjs')
        const passwordHash = await bcrypt.hash(body.password ?? 'ChangeMe123!', 10)
        const rows = await this.dataSource.query(
            `INSERT INTO users (username, email, password_hash, full_name, org_code, role, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, username, email, full_name AS "fullName", org_code AS "orgCode", role, is_active AS "isActive"`,
            [body.username, body.email, passwordHash, body.fullName ?? null, body.orgCode ?? caller?.orgCode ?? null, body.role ?? 'user', body.isActive ?? true],
        )
        return rows[0]
    }

    async getUserById(id: number): Promise<any> {
        const rows = await this.dataSource.query(
            `SELECT id, username, email, full_name AS "fullName", org_code AS "orgCode",
                    role, is_active AS "isActive", created_at AS "createdAt", last_login AS "lastLogin"
             FROM users WHERE id = $1`,
            [id],
        )
        if (!rows.length) throw new NotFoundException('User not found')
        return rows[0]
    }

    async updateUser(callerId: number, id: number, body: { role?: string; isActive?: boolean; fullName?: string; email?: string }): Promise<any> {
        if (id === callerId && body.isActive === false) {
            throw new Error('Cannot deactivate your own account')
        }
        const sets: string[] = []
        const params: any[] = []
        if (body.role !== undefined) { params.push(body.role); sets.push(`role = $${params.length}`) }
        if (body.isActive !== undefined) { params.push(body.isActive); sets.push(`is_active = $${params.length}`) }
        if (body.fullName !== undefined) { params.push(body.fullName); sets.push(`full_name = $${params.length}`) }
        if (body.email !== undefined) { params.push(body.email); sets.push(`email = $${params.length}`) }
        if (!sets.length) return this.getUserById(id)
        params.push(id)
        await this.dataSource.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length}`, params)
        return this.getUserById(id)
    }

    async getUserAudit(id: number): Promise<any[]> {
        return this.dataSource.query(
            `SELECT id, event_type AS "eventType", description, created_at AS "createdAt", created_by AS "createdBy"
             FROM audit_events WHERE entity_type = 'User' AND entity_id = $1 ORDER BY created_at DESC LIMIT 100`,
            [id],
        )
    }

    async postUserAudit(id: number, body: any, caller: any): Promise<void> {
        await this.dataSource.query(
            `INSERT INTO audit_events (entity_type, entity_id, event_type, description, created_by, org_code)
             VALUES ('User', $1, $2, $3, $4, $5)`,
            [id, body.eventType ?? 'UserAction', body.description ?? '', caller?.name ?? caller?.username ?? null, caller?.orgCode ?? null],
        )
    }
}
