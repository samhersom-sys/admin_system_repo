# AI GUIDELINES — SECTION 15: DATABASE STANDARDS

This document defines the standards for database schema design, migrations, seed data, and test data across the Policy Forge application. Every contributor — human or AI — must follow these rules when creating or modifying any database file, migration, or seed script.

This document covers structure and process only. It does not contain business logic or application rules.

---

## 15.1  Migrations and Seeds — The Distinction

Every contributor must understand what belongs in a migration and what belongs in a seed script. These are two separate concerns and must never be mixed.

| | Migration (`db/migrations/`) | Seed (`db/seeds/`) |
|---|---|---|
| **Purpose** | Change the database structure | Populate tables with development data |
| **Contains** | Table creation, column changes, indexes, constraints, views, enums | INSERT statements only |
| **When it runs** | Once per environment, in sequence, when deploying a schema change | On demand, in a development environment, to reset or populate data |
| **May contain data?** | Never | Yes — this is its entire purpose |
| **May contain schema changes?** | Yes | Never |

---

## 15.2  Naming Conventions

All naming must be lowercase snake_case. Names must be predictable so that any developer can navigate the schema without referring to documentation.

| Object | Rule | Example |
|---|---|---|
| Table | Plural noun | `users`, `parties`, `submissions` |
| Column | Singular noun or adjective | `email`, `created_at`, `is_active` |
| Foreign key column | `<referenced_table_singular>_id` | `party_id`, `submission_id` |
| Primary key | `id` | `id` |
| Index | `idx_<table>_<column>` | `idx_users_email`, `idx_submissions_party_id` |
| Unique index | `uq_<table>_<column>` | `uq_users_email` |
| Foreign key constraint | `fk_<table>_<referenced_table>` | `fk_submissions_parties` |
| Check constraint | `chk_<table>_<rule>` | `chk_submissions_status` |

**Rules:**
- No camelCase, PascalCase, or mixed case in schema objects.
- No abbreviations unless the abbreviation is the industry-standard term.
- Names must describe what they contain, not how they are used.

---

## 15.3  Data Types and Column Design

Choose the smallest appropriate data type for each column. Using an oversized type wastes storage, slows indexes, and makes the schema harder to reason about.

| Use case | Required type |
|---|---|
| All date and time fields | `TIMESTAMP WITH TIME ZONE` |
| True/false flags | `BOOLEAN` |
| Whole numbers | `INTEGER` or `BIGINT` depending on expected range |
| Monetary values | `NUMERIC(precision, scale)` — never `FLOAT` |
| Short text (known max length) | `VARCHAR(n)` |
| Long free text (unknown length) | `TEXT` — only when length is genuinely unbounded |
| Semi-structured data | `JSONB` — only when justified and documented (see §15.10) |

**Additional rules:**
- Avoid nullable columns unless the absence of a value is a meaningful and expected state.
- Do not store comma-separated lists or arrays in a single column. Normalise into a related table.
- Do not use `TEXT` as a default choice. Use `VARCHAR(n)` when the maximum length is known.
- No generic `data` or `payload` columns without documented structure.

---

## 15.4  Primary Key Strategy

The platform uses surrogate primary keys throughout. Natural keys are not used as primary keys unless explicitly documented and approved.

- All primary keys are named `id`.
- The default primary key type is `SERIAL` (auto-incrementing integer).
- For tables requiring globally unique identifiers (e.g., for external exposure or distributed systems), use `UUID` with `DEFAULT gen_random_uuid()`.
- The choice between `SERIAL` and `UUID` must be consistent within a domain. Mixed strategies within a single domain are not permitted without documentation.
- Composite primary keys are not permitted unless there is a specific, documented reason.

---

## 15.5  Referential Integrity and Foreign Keys

All relationships between tables must be enforced using foreign key constraints at the database level. Application-level checks alone are not sufficient.

**Rules:**
- Every foreign key column must have a corresponding `REFERENCES` constraint in the migration.
- The default delete behaviour is `ON DELETE RESTRICT`. This means a parent record cannot be deleted while child records reference it.
- `ON DELETE CASCADE` is only permitted when the dependent records have no independent existence and the cascading rule is permanent and universal. Any use of `ON DELETE CASCADE` must be documented in the migration file.
- `ON DELETE SET NULL` must only be used on nullable columns.
- Orphaned records are not permitted. Any exception requires documented approval.
- Foreign key constraints must follow the naming convention in §15.2.

---

## 15.6  Indexing

Indexes improve query performance but increase write overhead and storage. Every index must be justified.

**Always index:**
- All primary key columns (automatic)
- All foreign key columns
- Columns used in frequent `WHERE` or `ORDER BY` clauses

**Rules:**
- One index per justified use case. Do not create duplicate or overlapping indexes.
- Composite indexes may only be created when a single-column index is insufficient. Document the query it supports.
- Unique indexes must be used wherever a uniqueness rule exists.
- Partial indexes (filtering on a condition) must be documented in the migration with an explanation of the filter.
- All index names must follow the convention in §15.2.
- Do not index columns that are never queried directly.
- After adding a new index, verify the query plan to confirm it is used.

---

## 15.7  Normalisation

The schema must meet a minimum of Third Normal Form (3NF).

- Every non-key column must depend on the primary key only, not on another non-key column.
- Repeated groups of columns (e.g., `address1`, `address2`, `address3`) should be replaced with a related table unless the number of values is fixed and small.
- Denormalisation is only permitted when there is a documented and justified performance reason. The reason must be recorded in the migration file.

---

## 15.8  Soft Deletes

The platform uses soft deletes. Hard deletes are not permitted on domain tables unless explicitly approved.

- Tables that may be soft-deleted must include a `deleted_at TIMESTAMP WITH TIME ZONE` column, nullable, defaulting to `NULL`.
- A `NULL` value in `deleted_at` means the record is active.
- A non-null value means the record has been soft-deleted and the value is the timestamp of deletion.
- All queries against soft-deletable tables must filter on `deleted_at IS NULL` unless explicitly retrieving deleted records.
- Foreign key constraints and cascading rules must be compatible with soft deletes. A soft-deleted parent must not result in orphaned active children.

---

## 15.9  JSON and Semi-Structured Data

`JSONB` columns may only be used when the data is genuinely variable in structure and cannot be normalised without unacceptable complexity.

**Rules:**
- Every `JSONB` column must have its expected structure documented in the migration or in a linked specification.
- No personally identifiable information (PII) or sensitive data may be stored in a `JSONB` column.
- Do not use `JSONB` as a general-purpose storage field. If the structure is known, use relational columns.
- `JSONB` fields used in queries must be indexed with a `GIN` or functional index.
- `JSON` (non-binary) must not be used. Use `JSONB` only.

---

## 15.10  Migration Rules

Migrations define schema changes and nothing else.

### What a migration may contain

- `CREATE TABLE`
- `ALTER TABLE` (add column, modify column, rename column as part of a staged process — see §15.16)
- `CREATE INDEX`
- `CREATE UNIQUE INDEX`
- `ALTER TABLE ADD CONSTRAINT`
- `CREATE VIEW`
- `CREATE TYPE` (enums)
- `DROP TABLE`, `DROP COLUMN`, `DROP INDEX` — only when safe (see §15.16)

### What a migration must never contain

- `INSERT`, `UPDATE`, or `DELETE` statements
- Seed or reference data
- Business logic of any kind
- Conditional logic based on environment variables
- Tenant-specific logic
- Workflow logic

### RULE 1 — One logical change per migration

Each migration file contains exactly one logical schema change — creating one table, adding one column, creating one index. Do not bundle unrelated changes.

### RULE 2 — Every migration must be idempotent

All SQL in a migration must use `IF NOT EXISTS` or `IF EXISTS` guards so it is safe to run more than once.

```sql
CREATE TABLE IF NOT EXISTS users ( ... )
ALTER TABLE party ADD COLUMN IF NOT EXISTS phone VARCHAR(50)
CREATE INDEX IF NOT EXISTS idx_party_reference ON party (reference)
```

### RULE 3 — Migrations run in numbered order. Never modify a past migration.

Filenames follow the pattern `NNN-description.js` where `NNN` is a zero-padded three-digit number starting at `001`. Numbers must be sequential with no gaps.

If a change needs to be undone, add a new migration to reverse it. Never edit or delete a migration that has already been run.

---

## 15.11  Seed Data Rules

Seed scripts populate development and test environment databases with representative data. They must never run in a production environment.

### RULE 4 — One seed file per table

Each table that needs development data has exactly one seed file. The file is named `NNN-{table-name}.js`. When data needs to change, edit that file. Do not create a second file for the same table.

```
db/seeds/
  001-users.js         ← the only users seed — edit here when users change
  002-parties.js       ← the only party seed — edit here when parties change
  003-submissions.js   ← the only submission seed — edit here when submissions change
```

**Forbidden:**
```
db/seeds/001-users.js AND db/seeds/004-users-extra.js  ← two files for one table
tools/seed-test-auth-user.js                           ← seed file outside db/seeds/
INSERT statements inside a migration file              ← data inside a migration
```

### RULE 5 — Seed scripts must be fully independent

A seed script must not depend on another seed script running first. Each script must be executable in isolation without causing an error.

- Do not call or import another seed file.
- Do not assume a specific run order between seed files outside of what `db:seed` enforces.
- If foreign key constraints exist at the database level, the seed script must handle them (for example, by inserting parent records if they are missing, or by using `TRUNCATE ... CASCADE` before reinserting).

### RULE 6 — Seed data must be representative

Seed data must include a meaningful variety of records so that the development environment reflects realistic usage. This means including records that cover different roles, states, and data shapes — without encoding any specific business rule into this document.

The specific statuses, roles, or types that must be covered are defined in the requirements documents for each domain. The seed file must be updated whenever the requirements change.

### RULE 7 — All seed inserts must be idempotent

Every INSERT in a seed file must be safe to run multiple times. Use `ON CONFLICT DO NOTHING` where a unique constraint exists, or check for existence before inserting.

### RULE 8 — Seed scripts must not run in production

Seed scripts must check the environment and exit safely if the environment is not `development`. No seed script may be wired into a production deployment pipeline.

```javascript
if (process.env.NODE_ENV !== 'development') {
    console.log('[Seed] Not running — environment is not development.')
    process.exit(0)
}
```

---

## 15.12  Test Data Rules

Test data is separate from seed data. Tests must not rely on the development seed data being present.

- Each test must create the data it needs, or use a shared test fixture file specific to the test suite.
- Test data must be deterministic — running the same test twice must produce the same result.
- Tests must clean up after themselves or run in an isolated transaction that is rolled back.
- Tests must not leave data in a shared environment that could affect other tests.
- If a test needs to assert referential integrity, it must create both the parent and child records itself within the test or test setup.

---

## 15.13  Security Standards

### RULE 9 — Passwords must never be stored in plaintext

All passwords must be hashed using a slow, adaptive algorithm (bcryptjs with a cost factor of 10 or higher) before being written to the database.

Migrations must not contain any password hashing logic. Password hashing is the responsibility of seed scripts and application code only.

Seed scripts must not use passwords that resemble real or production credentials. Development passwords must be clearly non-production (e.g., simple patterns known to be test-only).

Sensitive fields such as tokens, secrets, or personal identifiers must not appear in log output or error messages.

---

## 15.14  Schema Evolution

Changing an existing schema must follow a safe, staged approach to avoid breaking running application code.

**Renaming a column:**
1. Add the new column alongside the old one.
2. Write application code that reads from and writes to both columns.
3. Backfill the new column from the old column in a separate, non-migration script.
4. Remove reads and writes from the old column in application code.
5. Drop the old column in a new migration.

**Backfills:**
- Backfills must never be placed inside a migration file.
- Backfills are standalone scripts run separately from migrations.

**Dropping a column or table:**
- Only drop a column or table after confirming that no application code references it.
- Use a two-step process: deprecate in one release, then drop in the next.

**Zero-downtime:**
- Migrations must not lock tables for extended periods.
- Column additions with a `NOT NULL DEFAULT` value must be staged to avoid locking.

---

## 15.15  Performance and Query Standards

- Do not use unbounded `SELECT *` queries. Select only the columns needed.
- Avoid N+1 query patterns. Batch related data in a single query.
- Queries must use available indexes. Verify with `EXPLAIN ANALYZE` when performance is a concern.
- Queries that scan large tables without a `WHERE` clause on an indexed column must be reviewed and justified.
- Do not add an index without checking the query plan to confirm it is used.

---

## 15.16  Concurrency and Locking

- Use optimistic locking (e.g., a `version` or `updated_at` check) for records that are edited concurrently.
- Use pessimistic locking (`SELECT FOR UPDATE`) only when the operation genuinely requires exclusive access and the lock duration is minimal.
- Acquire locks in a consistent order across all operations to prevent deadlocks.
- Document any pessimistic locking in the code and in the relevant requirements.

---

## 15.17  Data Retention and Archiving

- Each domain must define a retention period for its records. The period is recorded in the domain's requirements documentation.
- Records that exceed the retention period must be archived before deletion.
- Archived data must be stored separately from active tables to avoid degrading performance.
- The archiving strategy must be consistent across all domains on the platform.
- Archiving logic must not be placed in migrations.

---

## 15.18  Environment Parity

- The database schema must be identical across all environments (development, staging, production).
- Migrations run the same way in every environment. No environment-specific schema differences are permitted.
- Seed scripts must never run in staging or production. The `db:seed` npm script is for development only.
- Any data required in staging or production (e.g., lookup values) must be introduced through a migration using a controlled, reviewed process — not a seed script.

---

## 15.20  TypeORM Standards

TypeORM is the ORM for all NestJS backend modules. It replaces direct `pg.Pool` usage in feature modules. The raw `db/migrations/*.js` scripts are the historical schema source of truth; TypeORM does not re-apply them.

### 15.20.1  Configuration

- TypeORM is configured in `backend/nest/src/config/typeorm.config.ts`.
- `synchronize` must always be `false`. TypeORM must never auto-modify the database schema.
- `migrationsRun` must always be `false`. Migrations are run explicitly via `npm run typeorm:migration:run`.
- `migrationsTableName` is `typeorm_migrations`.
- The `AppDataSource` export is used by the TypeORM CLI only.

### 15.20.2  Entity Classes

- Entity files live in `backend/nest/src/entities/` and are named `<name>.entity.ts`.
- Each entity maps to exactly one database table. The `@Entity('table_name')` decorator must use the actual table name.
- All entities must be registered in the `entities` array in `typeorm.config.ts`.
- `@PrimaryGeneratedColumn()` is used for all `SERIAL` primary keys.
- Column names in the DB that differ from the TypeScript property name must use the `name` option: `@Column({ name: 'created_at' })`.
- `nullable: true` must be set for every column that the DB schema defines as nullable.
- `NUMERIC` columns must be typed as `string` in TypeScript — Postgres returns `NUMERIC` as a string to avoid floating-point loss.
- Never use `synchronize` or entity column changes to alter the live schema. Use a TypeORM migration instead.

### 15.20.3  Repositories

- Feature modules must use `@InjectRepository(Entity)` to access the database.
- Each module must import `TypeOrmModule.forFeature([Entity])` in its `@Module` imports.
- Direct `DatabaseService` / `pg.Pool` usage in a module is only permitted during the transition period. Once a module is migrated to TypeORM, `DatabaseModule` must be removed from its `@Module` imports.
- Use `EntityRepository` methods (`find`, `findOne`, `save`, `create`, `delete`) for simple CRUD.
- Use `createQueryBuilder()` when filtering is conditional or the query is complex.
- Never execute raw SQL via the Repository unless it cannot be expressed as a QueryBuilder query. If raw SQL is required, document the reason inline.

### 15.20.4  Migrations (TypeORM-managed)

Future schema changes after the baseline must be TypeORM migrations, not raw `.js` files.

```bash
# Generate a migration from entity diffs
npm run typeorm:migration:generate -- -n AddColumnToParty

# Apply pending migrations
npm run typeorm:migration:run

# Revert the last migration
npm run typeorm:migration:revert
```

- TypeORM migration files live in `backend/nest/src/migrations/`.
- The baseline migration (`1710000000000-Baseline.ts`) has empty `up()` and `down()` methods. It marks the point where TypeORM took over from the raw `db/migrations/` scripts.
- To initialise a fresh database: run `npm run db:migrate` (applies all 83+ raw SQL migrations) then `npm run typeorm:baseline` (records the baseline in `typeorm_migrations`), then `npm run typeorm:migration:run` (applies any subsequent TypeORM migrations).

### 15.20.5  Transition Rules

During the period when both `DatabaseService` and TypeORM coexist:
- Modules that have been migrated use `@InjectRepository`. They must not also import `DatabaseModule`.
- Modules not yet migrated continue to use `DatabaseService`. This is acceptable until their migration is scheduled.
- `DatabaseModule` remains registered in `AppModule` until all feature modules are migrated.
- `DatabaseService` will be removed once no module references it.

| Module | Status |
|---|---|
| PartiesModule | ✅ Migrated to TypeORM |
| SubmissionsModule | ✅ Migrated to TypeORM |
| QuotesModule | ✅ Migrated to TypeORM |
| AuthModule | ✅ Migrated to TypeORM |
| AuditModule | ✅ Migrated to TypeORM |
| SearchModule | ✅ Migrated to TypeORM |
| DashboardModule | ✅ Migrated to TypeORM |
| DatabaseModule | ✅ Removed from AppModule — migration complete |

---

## 15.19  npm Scripts — Required Set

`package.json` must always contain these database scripts, kept in sync with all files in `db/migrations/` and `db/seeds/`:

| Script | Command | Purpose |
|--------|---------|---------|
| `db:migrate` | Chains all migration files in order | Applies schema changes |
| `db:seed` | Chains all seed files | Populates development data |
| `db:setup` | `npm run db:migrate && npm run db:seed` | Full fresh development setup |

When a new migration is added: append it to the end of `db:migrate` in the same change.
When a new seed is added: append it to the end of `db:seed` in the same change.

A migration or seed file that is not listed in its npm script will never run and is invisible to the team.

---

## 15.20  Adding a New Table — Full Checklist

When a new domain table is required, all of the following must be delivered in the same change:

- [ ] `db/migrations/NNN-create-{table}-table.js` — schema only, idempotent, one logical change
- [ ] Migration defines all columns with correct types, nullable rules, and defaults
- [ ] Migration defines all foreign key constraints with explicit `ON DELETE` behaviour
- [ ] Migration creates indexes on all foreign key columns and any frequently queried columns
- [ ] All names follow the naming convention in §15.2
- [ ] `db/seeds/NNN-{table}.js` — development data only, idempotent, self-contained, representative
- [ ] `package.json` `db:migrate` — extended to include the new migration
- [ ] `package.json` `db:seed` — extended to include the new seed
- [ ] Requirements documentation updated to record the new table and its retention period
- [ ] If the table has soft delete: `deleted_at` column included in the migration

No partial delivery is acceptable.

---

## 15.21  Common Violations Checklist

| Violation | Fix |
|---|---|
| Table name is singular | Rename to plural |
| Column name uses camelCase | Rename to snake_case |
| Foreign key column not named `<table>_id` | Rename to follow convention |
| Index not named `idx_<table>_<column>` | Rename to follow convention |
| Migration contains `INSERT` or `UPDATE` | Move data to the appropriate `db/seeds/NNN-{table}.js` |
| Second seed file created for a table that already has one | Merge new data into the existing file and delete the second |
| Seed file located outside `db/seeds/` | Move into `db/seeds/` following the naming convention |
| Seed script depends on another seed script | Rewrite to be self-contained |
| Seed INSERT without idempotency guard | Add `ON CONFLICT DO NOTHING` or existence check |
| Seed script can run in production | Add environment guard at the top of the script |
| Plaintext password in seed INSERT | Hash with `bcryptjs` before inserting |
| Test queries development seed data | Rewrite test to create its own data |
| FK relationship exists without a DB-level constraint | Add `REFERENCES` constraint in a new migration |
| Foreign key column has no index | Add index in a new migration |
| New migration not added to `db:migrate` | Add to the chain in `package.json` |
| New seed not added to `db:seed` | Add to the chain in `package.json` |
| Column renamed in a single migration | Follow the staged rename process in §15.14 |
