import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Baseline migration — marks the point where TypeORM takes over schema management.
 *
 * The 92 existing raw SQL migrations (db/migrations/001-*.js through 083-*.js)
 * were applied directly to the database before TypeORM was introduced.
 * This migration has empty up() and down() methods — it exists solely so that
 * TypeORM records its own starting point in the typeorm_migrations table.
 *
 * To initialise a fresh database:
 *   1. Run: npm run db:migrate            (applies the 92 raw SQL migrations)
 *   2. Run: npm run typeorm:baseline      (inserts this row into typeorm_migrations)
 *   Future schema changes: npm run typeorm:migration:generate -- -n MigrationName
 */
export class Baseline1710000000000 implements MigrationInterface {
  name = 'Baseline1710000000000'

  async up(_queryRunner: QueryRunner): Promise<void> {
    // Intentionally empty — schema already applied by db/migrations/*.js
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // Intentionally empty — rollback is not supported for the baseline
  }
}
