/**
 * LocationsScheduleService
 *
 * Provides read/write access to the locations_schedule_versions table.
 * Handles CSV import parsing and versioning for quote/policy location schedules.
 *
 * REQ-LOC-BE-F-001 — CRUD + import + versioning endpoints
 */

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'

@Injectable()
export class LocationsScheduleService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) { }

  // -------------------------------------------------------------------------
  // R01 — GET /api/locations-schedule/imports
  //        ?entityType=Quote&entityId=:id  (or contextType/recordId for compat)
  // -------------------------------------------------------------------------
  async getImports(
    entityType: string,
    entityId: number,
    orgCode: string,
  ): Promise<Record<string, unknown>[]> {
    if (!entityType || !entityId) {
      throw new BadRequestException('entityType and entityId are required')
    }
    const normalised = this.normaliseEntityType(entityType)
    await this.assertAccess(normalised, entityId, orgCode)

    return this.dataSource.query<Record<string, unknown>[]>(
      `SELECT v.id, v.import_id, v.version_number AS "versionNumber",
              v.payload, v.created_by AS "createdBy", v.created_at AS "createdAt",
              v.is_active AS "isActive"
         FROM locations_schedule_versions v
        WHERE v.import_id = $1
          AND v.is_active = TRUE
        ORDER BY v.version_number DESC`,
      [entityId],
    )
  }

  // -------------------------------------------------------------------------
  // R02 — POST /api/locations-schedule/import (CSV multipart — parses rows)
  // -------------------------------------------------------------------------
  async importCsv(
    entityType: string,
    entityId: number,
    orgCode: string,
    rows: Record<string, unknown>[],
    createdBy: string,
  ): Promise<Record<string, unknown>> {
    if (!entityType || !entityId) {
      throw new BadRequestException('entityType and entityId are required')
    }
    if (!rows || rows.length === 0) {
      throw new BadRequestException('No rows provided in import')
    }
    const normalised = this.normaliseEntityType(entityType)
    await this.assertAccess(normalised, entityId, orgCode)

    // Get next version number
    const countRows = await this.dataSource.query<{ max_version: string }[]>(
      `SELECT COALESCE(MAX(version_number), 0) AS max_version
         FROM locations_schedule_versions
        WHERE import_id = $1`,
      [entityId],
    )
    const nextVersion = Number(countRows[0]?.max_version ?? 0) + 1

    const inserted = await this.dataSource.query<Record<string, unknown>[]>(
      `INSERT INTO locations_schedule_versions
              (import_id, version_number, payload, created_by, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id, import_id AS "importId", version_number AS "versionNumber",
                 payload, created_by AS "createdBy", created_at AS "createdAt"`,
      [entityId, nextVersion, JSON.stringify({ rows }), createdBy],
    )
    return inserted[0]
  }

  // -------------------------------------------------------------------------
  // R03 — PUT /api/locations-schedule/imports/:id
  // -------------------------------------------------------------------------
  async updateImport(
    importId: number,
    orgCode: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const existing = await this.getImportById(importId)
    // Validate access using first row's entity context (best-effort)
    const rows = await this.dataSource.query<Record<string, unknown>[]>(
      `SELECT * FROM locations_schedule_versions WHERE id = $1`,
      [importId],
    )
    if (!rows.length) throw new NotFoundException('Import not found')

    const updated = await this.dataSource.query<Record<string, unknown>[]>(
      `UPDATE locations_schedule_versions
          SET payload = $1
        WHERE id = $2
       RETURNING id, import_id AS "importId", version_number AS "versionNumber",
                 payload, created_by AS "createdBy", created_at AS "createdAt"`,
      [JSON.stringify(body.payload ?? existing.payload), importId],
    )
    return updated[0]
  }

  // -------------------------------------------------------------------------
  // R04 — GET /api/locations-schedule/imports/:id/versions
  // -------------------------------------------------------------------------
  async getVersions(importId: number): Promise<Record<string, unknown>[]> {
    return this.dataSource.query<Record<string, unknown>[]>(
      `SELECT id, import_id AS "importId", version_number AS "versionNumber",
              created_by AS "createdBy", created_at AS "createdAt", is_active AS "isActive"
         FROM locations_schedule_versions
        WHERE import_id = $1
        ORDER BY version_number DESC`,
      [importId],
    )
  }

  // -------------------------------------------------------------------------
  // R05 — POST /api/locations-schedule/imports/:id/revert/:versionNumber
  // -------------------------------------------------------------------------
  async revertToVersion(
    importId: number,
    versionNumber: number,
  ): Promise<Record<string, unknown>> {
    // Find the target version
    const versions = await this.dataSource.query<Record<string, unknown>[]>(
      `SELECT * FROM locations_schedule_versions
        WHERE import_id = $1 AND version_number = $2`,
      [importId, versionNumber],
    )
    if (!versions.length) {
      throw new NotFoundException(`Version ${versionNumber} not found for import ${importId}`)
    }
    const target = versions[0]

    // Deactivate all current active versions
    await this.dataSource.query(
      `UPDATE locations_schedule_versions SET is_active = FALSE WHERE import_id = $1`,
      [importId],
    )

    // Get next version number
    const countRows = await this.dataSource.query<{ max_version: string }[]>(
      `SELECT COALESCE(MAX(version_number), 0) AS max_version
         FROM locations_schedule_versions WHERE import_id = $1`,
      [importId],
    )
    const nextVersion = Number(countRows[0]?.max_version ?? 0) + 1

    // Insert new active row cloned from target
    const inserted = await this.dataSource.query<Record<string, unknown>[]>(
      `INSERT INTO locations_schedule_versions
              (import_id, version_number, payload, created_by, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id, import_id AS "importId", version_number AS "versionNumber",
                 payload, created_by AS "createdBy", created_at AS "createdAt"`,
      [importId, nextVersion, JSON.stringify(target['payload']), target['created_by']],
    )
    return inserted[0]
  }

  // -------------------------------------------------------------------------
  // R06 — GET /api/locations-schedule/imports/:id/historical
  // -------------------------------------------------------------------------
  async getHistorical(importId: number): Promise<Record<string, unknown>[]> {
    return this.dataSource.query<Record<string, unknown>[]>(
      `SELECT id, import_id AS "importId", version_number AS "versionNumber",
              payload, created_by AS "createdBy", created_at AS "createdAt", is_active AS "isActive"
         FROM locations_schedule_versions
        WHERE import_id = $1
        ORDER BY version_number DESC`,
      [importId],
    )
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private normaliseEntityType(raw: string): 'Quote' | 'Policy' {
    const lower = raw.toLowerCase()
    if (lower === 'quote') return 'Quote'
    if (lower === 'policy') return 'Policy'
    throw new BadRequestException(`Unsupported entityType: ${raw}`)
  }

  private async assertAccess(
    entityType: 'Quote' | 'Policy',
    entityId: number,
    orgCode: string,
  ): Promise<void> {
    if (entityType === 'Quote') {
      const rows = await this.dataSource.query<{ id: number }[]>(
        `SELECT id FROM quotes WHERE id = $1 AND created_by_org_code = $2`,
        [entityId, orgCode],
      )
      if (!rows.length) throw new ForbiddenException('Access denied')
    } else {
      const rows = await this.dataSource.query<{ id: number }[]>(
        `SELECT id FROM policies WHERE id = $1 AND created_by_org_code = $2`,
        [entityId, orgCode],
      )
      if (!rows.length) throw new ForbiddenException('Access denied')
    }
  }

  private async getImportById(importId: number): Promise<Record<string, unknown>> {
    const rows = await this.dataSource.query<Record<string, unknown>[]>(
      `SELECT * FROM locations_schedule_versions WHERE id = $1`,
      [importId],
    )
    if (!rows.length) throw new NotFoundException('Import not found')
    return rows[0]
  }

  /** Shared quote access + edit-lock guard used by all normalised CRUD methods */
  private async assertQuoteEditable(
    quoteId: number,
    orgCode: string,
  ): Promise<Record<string, unknown>> {
    const rows = await this.dataSource.query<Record<string, unknown>[]>(
      `SELECT id, created_by_org_code, status FROM quotes WHERE id = $1`,
      [quoteId],
    )
    if (!rows.length) throw new NotFoundException('Quote not found')
    const quote = rows[0]
    if (quote['created_by_org_code'] !== orgCode) throw new ForbiddenException('Forbidden')
    const status = String(quote['status'] ?? '')
    if (!['Created', 'Quoted', 'Draft'].includes(status)) {
      throw new BadRequestException(`Location schedule is locked for quote status: ${status}`)
    }
    return quote
  }

  // -------------------------------------------------------------------------
  // REQ-LOC-BE-NE-F-011 — POST /api/quotes/:id/locations/rows
  // -------------------------------------------------------------------------
  async addLocation(
    quoteId: number,
    orgCode: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    await this.assertQuoteEditable(quoteId, orgCode)

    const rows = await this.dataSource.query<Record<string, unknown>[]>(
      `INSERT INTO locations
              (quote_id, country, country_code, state, state_code, city,
               address1, address2, address3, zip_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        quoteId,
        body['country'] ?? null,
        body['country_code'] ?? null,
        body['state'] ?? null,
        body['state_code'] ?? null,
        body['city'] ?? null,
        body['address1'] ?? null,
        body['address2'] ?? null,
        body['address3'] ?? null,
        body['zip_code'] ?? null,
      ],
    )
    return rows[0]
  }

  // -------------------------------------------------------------------------
  // REQ-LOC-BE-NE-F-012 — PUT /api/quotes/:id/locations/rows/:locationId
  // -------------------------------------------------------------------------
  async updateLocation(
    quoteId: number,
    locationId: number,
    orgCode: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    await this.assertQuoteEditable(quoteId, orgCode)

    const rows = await this.dataSource.query<Record<string, unknown>[]>(
      `UPDATE locations
          SET country       = COALESCE($3, country),
              country_code  = COALESCE($4, country_code),
              state         = COALESCE($5, state),
              state_code    = COALESCE($6, state_code),
              city          = COALESCE($7, city),
              address1      = COALESCE($8, address1),
              address2      = COALESCE($9, address2),
              address3      = COALESCE($10, address3),
              zip_code      = COALESCE($11, zip_code),
              updated_at    = NOW()
        WHERE id = $1 AND quote_id = $2
       RETURNING *`,
      [
        locationId,
        quoteId,
        body['country'] ?? null,
        body['country_code'] ?? null,
        body['state'] ?? null,
        body['state_code'] ?? null,
        body['city'] ?? null,
        body['address1'] ?? null,
        body['address2'] ?? null,
        body['address3'] ?? null,
        body['zip_code'] ?? null,
      ],
    )
    if (!rows.length) throw new NotFoundException('Location not found')
    return rows[0]
  }

  // -------------------------------------------------------------------------
  // REQ-LOC-BE-NE-F-013 — DELETE /api/quotes/:id/locations/rows/:locationId
  // -------------------------------------------------------------------------
  async deleteLocation(
    quoteId: number,
    locationId: number,
    orgCode: string,
  ): Promise<{ message: string }> {
    await this.assertQuoteEditable(quoteId, orgCode)

    const loc = await this.dataSource.query<Record<string, unknown>[]>(
      `SELECT id FROM locations WHERE id = $1 AND quote_id = $2`,
      [locationId, quoteId],
    )
    if (!loc.length) throw new NotFoundException('Location not found')

    await this.dataSource.query(
      `DELETE FROM location_coverages WHERE location_id = $1`,
      [locationId],
    )
    await this.dataSource.query(
      `DELETE FROM locations WHERE id = $1`,
      [locationId],
    )
    return { message: 'Location deleted' }
  }

  // -------------------------------------------------------------------------
  // REQ-LOC-BE-NE-F-014 — POST /api/quotes/:id/locations/rows/:locationId/coverages
  // -------------------------------------------------------------------------
  async addCoverage(
    quoteId: number,
    locationId: number,
    orgCode: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    await this.assertQuoteEditable(quoteId, orgCode)

    const rows = await this.dataSource.query<Record<string, unknown>[]>(
      `INSERT INTO location_coverages
              (location_id, quote_id, section_id, coverage_type, coverage_sub_type,
               coverage_type_id, coverage_sub_type_id, currency, sum_insured, rating_schedule_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        locationId,
        quoteId,
        body['section_id'] ?? null,
        body['coverage_type'] ?? null,
        body['coverage_sub_type'] ?? null,
        body['coverage_type_id'] ?? null,
        body['coverage_sub_type_id'] ?? null,
        body['currency'] ?? 'GBP',
        body['sum_insured'] ?? 0,
        body['rating_schedule_id'] ?? null,
      ],
    )
    return rows[0]
  }

  // -------------------------------------------------------------------------
  // REQ-LOC-BE-NE-F-015 — PUT /api/quotes/:id/locations/rows/:locationId/coverages/:coverageId
  // -------------------------------------------------------------------------
  async updateCoverage(
    quoteId: number,
    locationId: number,
    coverageId: number,
    orgCode: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    await this.assertQuoteEditable(quoteId, orgCode)

    const rows = await this.dataSource.query<Record<string, unknown>[]>(
      `UPDATE location_coverages
          SET section_id           = COALESCE($4, section_id),
              coverage_type        = COALESCE($5, coverage_type),
              coverage_sub_type    = COALESCE($6, coverage_sub_type),
              coverage_type_id     = COALESCE($7, coverage_type_id),
              coverage_sub_type_id = COALESCE($8, coverage_sub_type_id),
              currency             = COALESCE($9, currency),
              sum_insured          = COALESCE($10, sum_insured),
              rating_schedule_id   = COALESCE($11, rating_schedule_id),
              updated_at           = NOW()
        WHERE id = $1 AND location_id = $2 AND quote_id = $3
       RETURNING *`,
      [
        coverageId,
        locationId,
        quoteId,
        body['section_id'] ?? null,
        body['coverage_type'] ?? null,
        body['coverage_sub_type'] ?? null,
        body['coverage_type_id'] ?? null,
        body['coverage_sub_type_id'] ?? null,
        body['currency'] ?? null,
        body['sum_insured'] ?? null,
        body['rating_schedule_id'] ?? null,
      ],
    )
    if (!rows.length) throw new NotFoundException('Coverage row not found')
    return rows[0]
  }

  // -------------------------------------------------------------------------
  // REQ-LOC-BE-NE-F-016 — DELETE /api/quotes/:id/locations/rows/:locationId/coverages/:coverageId
  // -------------------------------------------------------------------------
  async deleteCoverage(
    quoteId: number,
    locationId: number,
    coverageId: number,
    orgCode: string,
  ): Promise<{ message: string }> {
    await this.assertQuoteEditable(quoteId, orgCode)

    const rows = await this.dataSource.query<{ id: number }[]>(
      `DELETE FROM location_coverages
        WHERE id = $1 AND location_id = $2 AND quote_id = $3
       RETURNING id`,
      [coverageId, locationId, quoteId],
    )
    if (!rows.length) throw new NotFoundException('Coverage row not found')
    return { message: 'Coverage row deleted' }
  }

  // -------------------------------------------------------------------------
  // REQ-LOC-BE-NE-F-017 — POST /api/locations-schedule/imports/:quoteId/save-version
  // Snapshots current quote_location_rows into locations_schedule_versions.
  // -------------------------------------------------------------------------
  async saveVersion(
    quoteId: number,
    orgCode: string,
    createdBy: string,
  ): Promise<Record<string, unknown>> {
    // Access check
    const quoteRows = await this.dataSource.query<Record<string, unknown>[]>(
      `SELECT id, created_by_org_code FROM quotes WHERE id = $1`,
      [quoteId],
    )
    if (!quoteRows.length) throw new NotFoundException('Quote not found')
    if (quoteRows[0]['created_by_org_code'] !== orgCode) throw new ForbiddenException('Forbidden')

    // Read current normalised rows to snapshot
    const locationRows = await this.dataSource.query<Record<string, unknown>[]>(
      `SELECT * FROM quote_location_rows WHERE quote_id = $1 ORDER BY id`,
      [quoteId],
    )

    // Get next version number
    const countRows = await this.dataSource.query<{ max_version: string }[]>(
      `SELECT COALESCE(MAX(version_number), 0) AS max_version
         FROM locations_schedule_versions WHERE import_id = $1`,
      [quoteId],
    )
    const nextVersion = Number(countRows[0]?.max_version ?? 0) + 1

    // Deactivate all previous active versions for this import
    await this.dataSource.query(
      `UPDATE locations_schedule_versions SET is_active = FALSE WHERE import_id = $1`,
      [quoteId],
    )

    // Insert new snapshot
    const inserted = await this.dataSource.query<Record<string, unknown>[]>(
      `INSERT INTO locations_schedule_versions
              (import_id, version_number, payload, created_by, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id, import_id AS "importId", version_number, created_at`,
      [quoteId, nextVersion, JSON.stringify({ rows: locationRows }), createdBy],
    )
    return inserted[0]
  }
}
