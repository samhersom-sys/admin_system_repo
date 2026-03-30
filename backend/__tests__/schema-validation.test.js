/**
 * LAYER 2 — Schema Validation Tests
 *
 * Verifies that every database column referenced in backend route handlers
 * actually exists in the live database.
 *
 * PURPOSE: Catch the class of bug where a route handler references a column
 * that was never created by a migration. Example: the `/api/my-work-items`
 * route references `s.workflow_assigned_to` but that column does not exist on
 * the `submission` table — causing every request to return HTTP 500.
 *
 * HOW TO MAINTAIN:
 *   When you add a new route or change a SQL query:
 *   1. Add every `table.column` reference from your SQL to ROUTE_COLUMN_DEPS below
 *   2. Run `npm run test:backend` — it must pass before you commit
 *   3. If a column is missing, run the migration first, then re-run
 *
 * Run: npm run test:backend
 */

const { tableExists, columnExists, closePool } = require('./helpers')

afterAll(() => closePool())

// ---------------------------------------------------------------------------
// ROUTE_COLUMN_DEPS
// Maps each route to the exact table+column pairs the SQL query references.
// Format: { table: string, column: string, route: string }
//
// Column names are verified against the live database (2026-03-06).
// Use `node backend/__tests__/_schema-inspect.js` to re-verify if the schema changes.
// ---------------------------------------------------------------------------

const ROUTE_COLUMN_DEPS = [
    // ---------------------------------------------------------------------------
    // /api/submissions — F-05-01
    // Real column names (verified 2026-03-06): id, insured, status, createdDate, createdByOrgCode
    // ---------------------------------------------------------------------------
    { table: 'submission', column: 'id', route: 'GET /api/submissions' },
    { table: 'submission', column: 'insured', route: 'GET /api/submissions' },
    { table: 'submission', column: 'status', route: 'GET /api/submissions' },
    { table: 'submission', column: 'createdByOrgCode', route: 'GET /api/submissions (tenant scope)' },
    { table: 'submission', column: 'createdDate', route: 'GET /api/submissions' },

    // ---------------------------------------------------------------------------
    // /api/my-work-items — F-05-03
    // KNOWN BROKEN: These columns do not exist. The route fails with HTTP 500.
    // These tests are hard failures until the migration is run.
    // Migration needed: ALTER TABLE submission ADD COLUMN workflow_status VARCHAR, ADD COLUMN workflow_assigned_to INTEGER
    // Tracked: OQ-011
    // ---------------------------------------------------------------------------
    { table: 'submission', column: 'workflow_status', route: 'GET /api/my-work-items [MIGRATION REQUIRED]' },
    { table: 'submission', column: 'workflow_assigned_to', route: 'GET /api/my-work-items [MIGRATION REQUIRED — this column caused HTTP 500]' },

    // ---------------------------------------------------------------------------
    // /api/recent-records-data — dashboard widget
    // KNOWN MISSING: last_opened_date does not exist on any table.
    // The route works but returns null/undefined for lastOpenedDate fields.
    // Migration needed to add last_opened_date to submission, quote, policy tables.
    // ---------------------------------------------------------------------------
    { table: 'submission', column: 'last_opened_date', route: 'GET /api/recent-records-data [MIGRATION REQUIRED]' },
    { table: 'quotes', column: 'last_opened_date', route: 'GET /api/recent-records-data [MIGRATION REQUIRED]' },
    { table: 'policy', column: 'last_opened_date', route: 'GET /api/recent-records-data [MIGRATION REQUIRED]' },
    { table: 'binding_authority', column: 'lastOpened', route: 'GET /api/recent-records-data (binding_authority uses lastOpened)' },

    // ---------------------------------------------------------------------------
    // /api/quotes — F-06
    // Real column names (verified from Cleaned migration 008): id, submission_id, status, created_by_org_code
    // Note: Cleaned uses snake_case; BackUp used camelCase.
    // ---------------------------------------------------------------------------
    { table: 'quotes', column: 'id', route: 'GET /api/quotes' },
    { table: 'quotes', column: 'submission_id', route: 'GET /api/quotes' },
    { table: 'quotes', column: 'status', route: 'GET /api/quotes' },
    { table: 'quotes', column: 'created_by_org_code', route: 'GET /api/quotes (tenant scope)' },

    // ---------------------------------------------------------------------------
    // /api/policies — F-07
    // Real column names (verified 2026-03-06): id, status, createdByOrgCode
    // ---------------------------------------------------------------------------
    { table: 'policy', column: 'id', route: 'GET /api/policies' },
    { table: 'policy', column: 'status', route: 'GET /api/policies' },
    { table: 'policy', column: 'createdByOrgCode', route: 'GET /api/policies (tenant scope)' },

    // ---------------------------------------------------------------------------
    // /api/binding-authorities — F-09
    // Real column names (verified 2026-03-06): id, status, createdByOrgCode
    // ---------------------------------------------------------------------------
    { table: 'binding_authority', column: 'id', route: 'GET /api/binding-authorities' },
    { table: 'binding_authority', column: 'status', route: 'GET /api/binding-authorities' },
    { table: 'binding_authority', column: 'createdByOrgCode', route: 'GET /api/binding-authorities (tenant scope)' },

    // ---------------------------------------------------------------------------
    // /api/notifications — shared service
    // Column names per migration 020: id, user_name, org_code, type, message, is_read, payload, created_at
    // ---------------------------------------------------------------------------
    { table: 'notifications', column: 'id', route: 'GET /api/notifications' },
    { table: 'notifications', column: 'message', route: 'GET /api/notifications' },
    { table: 'notifications', column: 'is_read', route: 'GET /api/notifications (unread count)' },
    { table: 'notifications', column: 'created_at', route: 'GET /api/notifications' },

    // ---------------------------------------------------------------------------
    // /api/auth/login — auth
    // Real column names (verified 2026-03-06): id, email, username, password_hash, role, org_code, is_active
    // ---------------------------------------------------------------------------
    { table: 'users', column: 'id', route: 'POST /api/auth/login' },
    { table: 'users', column: 'email', route: 'POST /api/auth/login' },
    { table: 'users', column: 'username', route: 'POST /api/auth/login' },
    { table: 'users', column: 'password_hash', route: 'POST /api/auth/login' },
    { table: 'users', column: 'role', route: 'POST /api/auth/login' },
    { table: 'users', column: 'org_code', route: 'POST /api/auth/login (tenant)' },
    { table: 'users', column: 'is_active', route: 'POST /api/auth/login' },

    // ---------------------------------------------------------------------------
    // /api/parties — parties domain
    // Run migration: node backend/create-parties-table.js
    // ---------------------------------------------------------------------------
    { table: 'party', column: 'id', route: 'GET /api/parties' },
    { table: 'party', column: 'name', route: 'GET /api/parties' },
    { table: 'party', column: 'role', route: 'GET /api/parties (?type= filter maps to role column)' },
    { table: 'party', column: 'orgCode', route: 'GET /api/parties (tenant scope)' },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Layer 2: Schema Validation — Route Column Dependencies', () => {
    // Group by table so we only query information_schema once per table
    const byTable = ROUTE_COLUMN_DEPS.reduce((acc, dep) => {
        if (!acc[dep.table]) acc[dep.table] = []
        acc[dep.table].push(dep)
        return acc
    }, {})

    for (const [tableName, deps] of Object.entries(byTable)) {
        describe(`Table: ${tableName}`, () => {
            test(`${tableName} table exists`, async () => {
                const exists = await tableExists(tableName)
                expect(exists).toBe(true)
            })

            for (const dep of deps) {
                test(`column ${tableName}.${dep.column} exists (required by: ${dep.route})`, async () => {
                    const exists = await columnExists(tableName, dep.column)
                    // Hard assertion. DO NOT change to expect([true, false]) — that defeats the purpose.
                    // If this fails, run the missing migration, then re-run.
                    expect(exists).toBe(true)
                })
            }
        })
    }
})
