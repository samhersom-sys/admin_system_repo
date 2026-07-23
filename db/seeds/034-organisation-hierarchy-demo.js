/**
 * Seed 034 — organisation hierarchy demo data
 *
 * Purpose:
 * - Populate organisation hierarchy levels and entities used by
 *   Organisation Configuration and hierarchy-aware dashboard filtering.
 * - Safe to run multiple times (upsert / existence checks).
 */

'use strict'

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })

const { Pool } = require('pg')

const DB_URL =
  process.env.DATABASE_URL ||
  'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'

const pool = new Pool({ connectionString: DB_URL })

const HIERARCHY_LEVELS = [
  { levelName: 'Organisation', levelOrder: 1, description: 'Top-level organisation node' },
  { levelName: 'Region', levelOrder: 2, description: 'Regional business unit' },
  { levelName: 'Team', levelOrder: 3, description: 'Operational team' },
  { levelName: 'User', levelOrder: 4, description: 'User-level assignment' },
]

const ENTITIES = [
  { entityName: 'PolicyForge Demo Org', entityCode: 'DEMO', hierarchyLevel: 1, parentCode: null },
  { entityName: 'North Region', entityCode: 'DEMO-NORTH', hierarchyLevel: 2, parentCode: 'DEMO' },
  { entityName: 'South Region', entityCode: 'DEMO-SOUTH', hierarchyLevel: 2, parentCode: 'DEMO' },
  { entityName: 'North Team 1', entityCode: 'DEMO-TEAM-N1', hierarchyLevel: 3, parentCode: 'DEMO-NORTH' },
  { entityName: 'South Team 1', entityCode: 'DEMO-TEAM-S1', hierarchyLevel: 3, parentCode: 'DEMO-SOUTH' },
  { entityName: 'PolicyForge Partner Org', entityCode: 'DEMO-PARTNER', hierarchyLevel: 1, parentCode: null },
  { entityName: 'Partner Region', entityCode: 'DEMO-PARTNER-REGION', hierarchyLevel: 2, parentCode: 'DEMO-PARTNER' },
  { entityName: 'Partner Team 1', entityCode: 'DEMO-PARTNER-TEAM1', hierarchyLevel: 3, parentCode: 'DEMO-PARTNER-REGION' },
]

async function tableExists(client, name) {
  const res = await client.query('SELECT to_regclass($1) AS regclass', [name])
  return Boolean(res.rows[0] && res.rows[0].regclass)
}

async function upsertHierarchyLevels(client) {
  const levelIdByOrder = new Map()
  for (const level of HIERARCHY_LEVELS) {
    const existing = await client.query(
      `SELECT id FROM organisation_hierarchy WHERE level_order = $1 LIMIT 1`,
      [level.levelOrder],
    )
    let id
    if (existing.rows.length > 0) {
      id = existing.rows[0].id
      await client.query(
        `UPDATE organisation_hierarchy
         SET level_name = $1,
             description = $2,
             is_active = true,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [level.levelName, level.description, id],
      )
    } else {
      const inserted = await client.query(
        `INSERT INTO organisation_hierarchy (level_name, level_order, parent_level_id, description, is_active)
         VALUES ($1, $2, NULL, $3, true)
         RETURNING id`,
        [level.levelName, level.levelOrder, level.description],
      )
      id = inserted.rows[0].id
    }
    levelIdByOrder.set(level.levelOrder, id)
  }

  // Parent-level linkage by order
  await client.query(
    `UPDATE organisation_hierarchy h
     SET parent_level_id = p.id,
         updated_at = CURRENT_TIMESTAMP
     FROM organisation_hierarchy p
     WHERE h.level_order = p.level_order + 1`,
  )

  return levelIdByOrder
}

async function upsertEntities(client, levelIdByOrder) {
  const entityIdByCode = new Map()

  // First pass: insert/update base entities
  for (const entity of ENTITIES) {
    const levelId = levelIdByOrder.get(entity.hierarchyLevel)
    if (!levelId) {
      continue
    }

    const existing = await client.query(
      `SELECT id FROM organisation_entities WHERE entity_code = $1 LIMIT 1`,
      [entity.entityCode],
    )

    let id
    if (existing.rows.length > 0) {
      id = existing.rows[0].id
      await client.query(
        `UPDATE organisation_entities
         SET entity_name = $1,
             hierarchy_level_id = $2,
             is_active = true,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [entity.entityName, levelId, id],
      )
    } else {
      const inserted = await client.query(
        `INSERT INTO organisation_entities (entity_name, entity_code, hierarchy_level_id, parent_entity_id, description, is_active)
         VALUES ($1, $2, $3, NULL, NULL, true)
         RETURNING id`,
        [entity.entityName, entity.entityCode, levelId],
      )
      id = inserted.rows[0].id
    }

    entityIdByCode.set(entity.entityCode, id)
  }

  // Second pass: set parent links
  for (const entity of ENTITIES) {
    if (!entity.parentCode) {
      continue
    }
    const childId = entityIdByCode.get(entity.entityCode)
    const parentId = entityIdByCode.get(entity.parentCode)
    if (!childId || !parentId) {
      continue
    }
    await client.query(
      `UPDATE organisation_entities
       SET parent_entity_id = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [parentId, childId],
    )
  }

  return entityIdByCode
}

async function upsertConfigAndLinks(client, levelIdByOrder, entityIdByCode) {
  const orgEntityId = entityIdByCode.get('DEMO')
  if (!orgEntityId) {
    return
  }

  // Ensure one config row per level for the DEMO org entity.
  for (const level of HIERARCHY_LEVELS) {
    const hierarchyLevelId = levelIdByOrder.get(level.levelOrder)
    if (!hierarchyLevelId) {
      continue
    }

    const existing = await client.query(
      `SELECT id FROM organisation_hierarchy_config
       WHERE organisation_entity_id = $1 AND hierarchy_level_id = $2
       LIMIT 1`,
      [orgEntityId, hierarchyLevelId],
    )

    if (existing.rows.length === 0) {
      await client.query(
        `INSERT INTO organisation_hierarchy_config (organisation_entity_id, hierarchy_level_id, description, is_active)
         VALUES ($1, $2, $3, true)`,
        [orgEntityId, hierarchyLevelId, `${level.levelName} level for DEMO`],
      )
    }
  }

  const configRows = await client.query(
    `SELECT id, hierarchy_level_id
     FROM organisation_hierarchy_config
     WHERE organisation_entity_id = $1`,
    [orgEntityId],
  )

  const configByOrder = new Map()
  for (const row of configRows.rows) {
    const levelRes = await client.query(
      `SELECT level_order FROM organisation_hierarchy WHERE id = $1 LIMIT 1`,
      [row.hierarchy_level_id],
    )
    if (levelRes.rows.length > 0) {
      configByOrder.set(levelRes.rows[0].level_order, row.id)
    }
  }

  for (let order = 1; order < HIERARCHY_LEVELS.length; order += 1) {
    const parentConfigId = configByOrder.get(order)
    const childConfigId = configByOrder.get(order + 1)
    if (!parentConfigId || !childConfigId) {
      continue
    }

    const existing = await client.query(
      `SELECT id FROM organisation_hierarchy_links
       WHERE organisation_entity_id = $1 AND parent_config_id = $2 AND child_config_id = $3
       LIMIT 1`,
      [orgEntityId, parentConfigId, childConfigId],
    )

    if (existing.rows.length === 0) {
      await client.query(
        `INSERT INTO organisation_hierarchy_links (organisation_entity_id, parent_config_id, child_config_id, description, is_active)
         VALUES ($1, $2, $3, $4, true)`,
        [orgEntityId, parentConfigId, childConfigId, `Level ${order} to ${order + 1}`],
      )
    }
  }
}

async function run() {
  if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
    console.log('[seed-034] Not running — environment is not development.')
    process.exit(0)
  }

  const client = await pool.connect()
  try {
    const required = [
      'organisation_hierarchy',
      'organisation_entities',
      'organisation_hierarchy_config',
      'organisation_hierarchy_links',
    ]

    for (const table of required) {
      const exists = await tableExists(client, table)
      if (!exists) {
        console.log(`[Seed 034 — org hierarchy] Skipped: table ${table} not found.`)
        return
      }
    }

    console.log('[Seed 034 — org hierarchy] Upserting hierarchy levels and entities...')
    const levelIdByOrder = await upsertHierarchyLevels(client)
    const entityIdByCode = await upsertEntities(client, levelIdByOrder)
    await upsertConfigAndLinks(client, levelIdByOrder, entityIdByCode)
    console.log('[Seed 034 — org hierarchy] Done.')
  } catch (err) {
    console.error('[Seed 034 — org hierarchy] ERROR:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

run()
