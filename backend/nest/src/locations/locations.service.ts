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
}
