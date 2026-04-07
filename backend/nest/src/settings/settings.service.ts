import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'

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
            `SELECT id, name, code, product_type, line_of_business, underwriting_year, description, is_active
       FROM products
       WHERE org_code = $1
       ORDER BY name`,
            [orgCode],
        )
    }

    async getProductById(id: number, orgCode: string): Promise<any> {
        const rows = await this.dataSource.query(
            `SELECT id, name, code, product_type, line_of_business, underwriting_year, description, is_active
       FROM products
       WHERE id = $1 AND org_code = $2`,
            [id, orgCode],
        )
        if (!rows.length) throw new NotFoundException({ error: 'Product not found' })
        return rows[0]
    }

    async createProduct(orgCode: string, body: any): Promise<any> {
        const rows = await this.dataSource.query(
            `INSERT INTO products (org_code, name, code, product_type, line_of_business, underwriting_year, description, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, code, product_type, line_of_business, underwriting_year, description, is_active`,
            [orgCode, body.name, body.code, body.product_type, body.line_of_business, body.underwriting_year ?? new Date().getFullYear(), body.description ?? '', body.is_active ?? true],
        )
        return rows[0]
    }

    async updateProduct(id: number, orgCode: string, body: any): Promise<any> {
        await this.dataSource.query(
            `UPDATE products
       SET name = $1, code = $2, product_type = $3, line_of_business = $4,
           underwriting_year = $5, description = $6, is_active = $7
       WHERE id = $8 AND org_code = $9`,
            [body.name, body.code, body.product_type, body.line_of_business, body.underwriting_year, body.description, body.is_active, id, orgCode],
        )
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
}
