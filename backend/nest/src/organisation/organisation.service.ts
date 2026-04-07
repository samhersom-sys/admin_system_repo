import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'

/**
 * OrganisationService – REQ-SETTINGS-BE-F-005 (Organisation & Hierarchy endpoints)
 *
 * Uses raw SQL via DataSource (consistent with SettingsService pattern).
 */
@Injectable()
export class OrganisationService {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) { }

    // -------------------------------------------------------------------------
    // Organisation Entities
    // -------------------------------------------------------------------------

    async findByCode(code: string): Promise<any[]> {
        return this.dataSource.query(
            `SELECT e.id,
                    e.entity_name  AS "entityName",
                    e.entity_code  AS "entityCode",
                    e.description,
                    e.is_active    AS "isActive"
             FROM   organisation_entities e
             WHERE  e.entity_code = $1
             ORDER  BY e.entity_name`,
            [code],
        )
    }

    async create(body: any): Promise<any> {
        const rows = await this.dataSource.query(
            `INSERT INTO organisation_entities
               (entity_name, entity_code, hierarchy_level_id, parent_entity_id, description, is_active)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id,
                       entity_name  AS "entityName",
                       entity_code  AS "entityCode",
                       description,
                       is_active    AS "isActive"`,
            [
                body.entityName,
                body.entityCode ?? null,
                body.hierarchyLevelId ?? null,
                body.parentEntityId ?? null,
                body.description ?? null,
                body.isActive !== false,
            ],
        )
        return rows[0]
    }

    async update(id: number, body: any): Promise<any> {
        const rows = await this.dataSource.query(
            `UPDATE organisation_entities
             SET    entity_name        = $1,
                    entity_code        = $2,
                    description        = $3,
                    is_active          = $4,
                    updated_at         = CURRENT_TIMESTAMP
             WHERE  id = $5
             RETURNING id,
                       entity_name  AS "entityName",
                       entity_code  AS "entityCode",
                       description,
                       is_active    AS "isActive"`,
            [body.entityName, body.entityCode ?? null, body.description ?? null, body.isActive !== false, id],
        )
        if (!rows.length) throw new NotFoundException({ error: 'Organisation entity not found' })
        return rows[0]
    }

    // -------------------------------------------------------------------------
    // Hierarchy Config
    // -------------------------------------------------------------------------

    async getHierarchyConfig(orgId: number): Promise<any[]> {
        return this.dataSource.query(
            `SELECT c.id,
                    c.organisation_entity_id AS "organisationEntityId",
                    c.hierarchy_level_id     AS "hierarchyLevelId",
                    c.description,
                    c.is_active              AS "isActive",
                    h.level_name             AS "levelName",
                    h.level_order            AS "levelOrder"
             FROM   organisation_hierarchy_config c
             JOIN   organisation_hierarchy h ON c.hierarchy_level_id = h.id
             WHERE  c.organisation_entity_id = $1
             ORDER  BY h.level_order`,
            [orgId],
        )
    }

    async saveHierarchyConfig(orgId: number, levels: any[]): Promise<any[]> {
        await this.dataSource.query(
            `DELETE FROM organisation_hierarchy_config WHERE organisation_entity_id = $1`,
            [orgId],
        )
        const inserted: any[] = []
        for (const level of levels) {
            const rows = await this.dataSource.query(
                `INSERT INTO organisation_hierarchy_config
                   (organisation_entity_id, hierarchy_level_id, description)
                 VALUES ($1, $2, $3)
                 RETURNING id,
                           organisation_entity_id AS "organisationEntityId",
                           hierarchy_level_id     AS "hierarchyLevelId",
                           description`,
                [orgId, level.levelId, level.description ?? null],
            )
            inserted.push(rows[0])
        }
        return inserted
    }

    // -------------------------------------------------------------------------
    // Hierarchy Links
    // -------------------------------------------------------------------------

    async getHierarchyLinks(orgId: number): Promise<any[]> {
        return this.dataSource.query(
            `SELECT l.id,
                    l.organisation_entity_id AS "organisationEntityId",
                    l.parent_config_id       AS "parentConfigId",
                    l.child_config_id        AS "childConfigId",
                    l.description,
                    l.is_active              AS "isActive",
                    pc.hierarchy_level_id    AS "parentLevelId",
                    cc.hierarchy_level_id    AS "childLevelId",
                    ph.level_name            AS "parentLevelName",
                    ch.level_name            AS "childLevelName"
             FROM   organisation_hierarchy_links l
             JOIN   organisation_hierarchy_config pc ON l.parent_config_id = pc.id
             JOIN   organisation_hierarchy_config cc ON l.child_config_id  = cc.id
             JOIN   organisation_hierarchy ph ON pc.hierarchy_level_id = ph.id
             JOIN   organisation_hierarchy ch ON cc.hierarchy_level_id = ch.id
             WHERE  l.organisation_entity_id = $1
             ORDER  BY ph.level_order, ch.level_order`,
            [orgId],
        )
    }

    async saveHierarchyLinks(orgId: number, links: any[]): Promise<any[]> {
        await this.dataSource.query(
            `DELETE FROM organisation_hierarchy_links WHERE organisation_entity_id = $1`,
            [orgId],
        )
        const inserted: any[] = []
        for (const link of links) {
            const rows = await this.dataSource.query(
                `INSERT INTO organisation_hierarchy_links
                   (organisation_entity_id, parent_config_id, child_config_id, description)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id,
                           organisation_entity_id AS "organisationEntityId",
                           parent_config_id       AS "parentConfigId",
                           child_config_id        AS "childConfigId",
                           description`,
                [orgId, link.parentConfigId, link.childConfigId, link.description ?? null],
            )
            inserted.push(rows[0])
        }
        return inserted
    }

    // -------------------------------------------------------------------------
    // Users (GET /api/users — returns active users for assignee dropdowns)
    // -------------------------------------------------------------------------

    async getUsers(): Promise<{ id: number; username: string; email: string }[]> {
        return this.dataSource.query(
            `SELECT id, username, email
             FROM   users
             WHERE  is_active = true
             ORDER  BY username`,
        )
    }

    // -------------------------------------------------------------------------
    // Global Hierarchy Levels
    // -------------------------------------------------------------------------

    async getGlobalHierarchyLevels(): Promise<any[]> {
        return this.dataSource.query(
            `SELECT id,
                    level_name  AS "levelName",
                    level_order AS "levelOrder"
             FROM   organisation_hierarchy
             ORDER  BY level_order`,
        )
    }
}
