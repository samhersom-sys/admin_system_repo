import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddOrgTables1740000000004 implements MigrationInterface {
  name = 'AddOrgTables1740000000004'

  async up(queryRunner: QueryRunner): Promise<void> {
    // Global hierarchy levels (e.g. Group → Region → Division)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organisation_hierarchy (
        id               SERIAL PRIMARY KEY,
        level_name       VARCHAR(200) NOT NULL,
        level_order      INTEGER NOT NULL,
        parent_level_id  INTEGER REFERENCES organisation_hierarchy(id),
        description      TEXT,
        is_active        BOOLEAN NOT NULL DEFAULT true,
        created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_org_hierarchy_order ON organisation_hierarchy (level_order)`)

    // Organisation entities – actual org units (Head Office, North Division …)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organisation_entities (
        id                  SERIAL PRIMARY KEY,
        entity_name         VARCHAR(200) NOT NULL,
        entity_code         VARCHAR(50),
        hierarchy_level_id  INTEGER NOT NULL REFERENCES organisation_hierarchy(id),
        parent_entity_id    INTEGER REFERENCES organisation_entities(id),
        description         TEXT,
        is_active           BOOLEAN NOT NULL DEFAULT true,
        created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(entity_code)
      )
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_org_entities_level  ON organisation_entities (hierarchy_level_id)`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_org_entities_parent ON organisation_entities (parent_entity_id)`)

    // Per-entity hierarchy configuration (which levels apply to this org)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organisation_hierarchy_config (
        id                       SERIAL PRIMARY KEY,
        organisation_entity_id   INTEGER NOT NULL REFERENCES organisation_entities(id) ON DELETE CASCADE,
        hierarchy_level_id       INTEGER NOT NULL REFERENCES organisation_hierarchy(id) ON DELETE CASCADE,
        description              TEXT,
        is_active                BOOLEAN NOT NULL DEFAULT true,
        created_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(organisation_entity_id, hierarchy_level_id)
      )
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_org_hierarchy_config_entity ON organisation_hierarchy_config (organisation_entity_id)`)

    // Hierarchy links between config entries (parent→child relationships)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organisation_hierarchy_links (
        id                       SERIAL PRIMARY KEY,
        organisation_entity_id   INTEGER NOT NULL REFERENCES organisation_entities(id) ON DELETE CASCADE,
        parent_config_id         INTEGER NOT NULL REFERENCES organisation_hierarchy_config(id) ON DELETE CASCADE,
        child_config_id          INTEGER NOT NULL REFERENCES organisation_hierarchy_config(id) ON DELETE CASCADE,
        description              TEXT,
        is_active                BOOLEAN NOT NULL DEFAULT true,
        created_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(organisation_entity_id, parent_config_id, child_config_id),
        CHECK (parent_config_id != child_config_id)
      )
    `)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_org_hierarchy_links_entity ON organisation_hierarchy_links (organisation_entity_id)`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS organisation_hierarchy_links`)
    await queryRunner.query(`DROP TABLE IF EXISTS organisation_hierarchy_config`)
    await queryRunner.query(`DROP TABLE IF EXISTS organisation_entities`)
    await queryRunner.query(`DROP TABLE IF EXISTS organisation_hierarchy`)
  }
}
