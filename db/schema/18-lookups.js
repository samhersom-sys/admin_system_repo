'use strict'
/**
 * Schema 18: lookup tables (all 27 lookup tables)
 * Replaces migrations: 027 through 053 (no schema alters — migration 115 is data-only)
 *
 * Tables created:
 *   lookup_submission_statuses, lookup_quote_statuses, lookup_policy_statuses,
 *   lookup_binding_authority_statuses, lookup_contract_types, lookup_methods_of_placement,
 *   lookup_renewal_statuses, lookup_transaction_types, lookup_loss_qualifiers,
 *   lookup_claim_statuses, lookup_classes_of_business, lookup_basis_for_order,
 *   lookup_analysis_basis, lookup_date_basis, lookup_workflow_statuses,
 *   lookup_party_roles, lookup_coverages, lookup_coverage_detail_types,
 *   lookup_coverage_detail_sub_types, lookup_currencies, lookup_countries,
 *   lookup_regions, lookup_subdivisions, lookup_sic_codes, lookup_risk_codes,
 *   lookup_class_risk_codes, lookup_tax_rules
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const DB_URL = process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'
const pool = new Pool({ connectionString: DB_URL })

async function run() {
    const client = await pool.connect()
    try {
        console.log('[18-lookups] Creating all lookup tables...')

        // Standard status-code tables (027-030)
        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_submission_statuses (
                id          SERIAL PRIMARY KEY,
                code        VARCHAR(50) NOT NULL UNIQUE,
                name        VARCHAR(100) NOT NULL,
                description TEXT,
                order_index INTEGER NOT NULL DEFAULT 0,
                is_active   BOOLEAN NOT NULL DEFAULT TRUE,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)

        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_quote_statuses (
                id          SERIAL PRIMARY KEY,
                code        VARCHAR(50) NOT NULL UNIQUE,
                name        VARCHAR(100) NOT NULL,
                description TEXT,
                order_index INTEGER NOT NULL DEFAULT 0,
                is_active   BOOLEAN NOT NULL DEFAULT TRUE,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)

        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_policy_statuses (
                id          SERIAL PRIMARY KEY,
                code        VARCHAR(50) NOT NULL UNIQUE,
                name        VARCHAR(100) NOT NULL,
                description TEXT,
                order_index INTEGER NOT NULL DEFAULT 0,
                is_active   BOOLEAN NOT NULL DEFAULT TRUE,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)

        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_binding_authority_statuses (
                id          SERIAL PRIMARY KEY,
                code        VARCHAR(50) NOT NULL UNIQUE,
                name        VARCHAR(100) NOT NULL,
                description TEXT,
                order_index INTEGER NOT NULL DEFAULT 0,
                is_active   BOOLEAN NOT NULL DEFAULT TRUE,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)

        // Simple name-only lookup tables (031-036)
        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_contract_types (
                id         SERIAL PRIMARY KEY,
                name       TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)

        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_methods_of_placement (
                id         SERIAL PRIMARY KEY,
                name       TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)

        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_renewal_statuses (
                id         SERIAL PRIMARY KEY,
                name       TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)

        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_transaction_types (
                id         SERIAL PRIMARY KEY,
                name       TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)

        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_loss_qualifiers (
                id         SERIAL PRIMARY KEY,
                name       TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)

        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_claim_statuses (
                id         SERIAL PRIMARY KEY,
                name       TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)

        // Classes of business (037)
        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_classes_of_business (
                id                          SERIAL PRIMARY KEY,
                code                        TEXT NOT NULL UNIQUE,
                name                        TEXT NOT NULL,
                active                      BOOLEAN NOT NULL DEFAULT TRUE,
                requires_locations_schedule BOOLEAN NOT NULL DEFAULT FALSE,
                payload                     JSONB NOT NULL DEFAULT '{}'
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_lookup_classes_of_business_code ON lookup_classes_of_business (code)`)

        // Basis for order (038)
        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_basis_for_order (
                id         SERIAL PRIMARY KEY,
                name       TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_lookup_basis_for_order_name ON lookup_basis_for_order (name)`)

        // Analysis basis (039)
        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_analysis_basis (
                id            SERIAL PRIMARY KEY,
                field_id      TEXT NOT NULL UNIQUE,
                label         TEXT NOT NULL,
                description   TEXT,
                display_order INTEGER NOT NULL DEFAULT 0,
                created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)

        // Date basis (040)
        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_date_basis (
                id            SERIAL PRIMARY KEY,
                field_id      TEXT NOT NULL UNIQUE,
                label         TEXT NOT NULL,
                description   TEXT,
                domain        TEXT NOT NULL,
                display_order INTEGER NOT NULL DEFAULT 0,
                created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_lookup_date_basis_domain ON lookup_date_basis (domain)`)

        // Workflow statuses (041)
        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_workflow_statuses (
                id            SERIAL PRIMARY KEY,
                code          VARCHAR(50) NOT NULL UNIQUE,
                name          VARCHAR(100) NOT NULL,
                description   TEXT,
                category      VARCHAR(50),
                is_active     BOOLEAN NOT NULL DEFAULT TRUE,
                display_order INTEGER NOT NULL DEFAULT 0,
                created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)

        // Party roles (042)
        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_party_roles (
                id            SERIAL PRIMARY KEY,
                code          VARCHAR(50) NOT NULL UNIQUE,
                name          VARCHAR(100) NOT NULL,
                description   TEXT,
                is_active     BOOLEAN NOT NULL DEFAULT TRUE,
                display_order INTEGER NOT NULL DEFAULT 0,
                created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)

        // Coverage hierarchy: coverages -> detail types -> detail sub types (043-045)
        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_coverages (
                id                 SERIAL PRIMARY KEY,
                class_of_business  TEXT NOT NULL,
                code               TEXT,
                name               TEXT NOT NULL,
                description        TEXT,
                active             BOOLEAN NOT NULL DEFAULT TRUE,
                display_order      INTEGER,
                created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_lookup_coverages_class  ON lookup_coverages (class_of_business)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_lookup_coverages_active ON lookup_coverages (active)`)

        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_coverage_detail_types (
                id                 SERIAL PRIMARY KEY,
                coverage_id        INTEGER REFERENCES lookup_coverages(id) ON DELETE CASCADE,
                class_of_business  TEXT NOT NULL,
                code               TEXT,
                name               TEXT NOT NULL,
                description        TEXT,
                active             BOOLEAN NOT NULL DEFAULT TRUE,
                display_order      INTEGER,
                created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_lookup_coverage_detail_types_coverage ON lookup_coverage_detail_types (coverage_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_lookup_coverage_detail_types_class    ON lookup_coverage_detail_types (class_of_business)`)

        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_coverage_detail_sub_types (
                id                      SERIAL PRIMARY KEY,
                coverage_detail_type_id INTEGER REFERENCES lookup_coverage_detail_types(id) ON DELETE CASCADE,
                code                    TEXT,
                name                    TEXT NOT NULL,
                description             TEXT,
                active                  BOOLEAN NOT NULL DEFAULT TRUE,
                display_order           INTEGER,
                created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_lookup_coverage_detail_sub_types_detail ON lookup_coverage_detail_sub_types (coverage_detail_type_id)`)

        // Currencies (046)
        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_currencies (
                code      VARCHAR(8) PRIMARY KEY,
                name      TEXT,
                is_active BOOLEAN NOT NULL DEFAULT TRUE
            )
        `)

        // Countries (047)
        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_countries (
                id         SERIAL PRIMARY KEY,
                code       VARCHAR(3) NOT NULL UNIQUE,
                name       VARCHAR(100) NOT NULL,
                is_active  BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_lookup_countries_code ON lookup_countries (code)`)

        // Regions (048)
        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_regions (
                id           SERIAL PRIMARY KEY,
                country_code VARCHAR(3) NOT NULL,
                name         VARCHAR(100) NOT NULL,
                sort_order   INTEGER NOT NULL DEFAULT 0,
                is_active    BOOLEAN NOT NULL DEFAULT TRUE,
                created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_lookup_regions_country_code ON lookup_regions (country_code)`)

        // Subdivisions (049)
        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_subdivisions (
                id           SERIAL PRIMARY KEY,
                country_code VARCHAR(3) NOT NULL,
                code         VARCHAR(10) NOT NULL,
                name         VARCHAR(100) NOT NULL,
                region       VARCHAR(100),
                sort_order   INTEGER NOT NULL DEFAULT 0,
                is_active    BOOLEAN NOT NULL DEFAULT TRUE,
                created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_lookup_subdivisions_country_code        ON lookup_subdivisions (country_code)`)
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_lookup_subdivisions_country_code ON lookup_subdivisions (country_code, code)`)

        // SIC codes (050)
        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_sic_codes (
                id           SERIAL PRIMARY KEY,
                country_code VARCHAR(3) NOT NULL,
                code         VARCHAR(20) NOT NULL,
                description  TEXT NOT NULL,
                is_active    BOOLEAN NOT NULL DEFAULT TRUE,
                created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_lookup_sic_codes_country_code ON lookup_sic_codes (country_code)`)
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_lookup_sic_codes        ON lookup_sic_codes (country_code, code)`)

        // Risk codes (051)
        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_risk_codes (
                id                    SERIAL PRIMARY KEY,
                code                  VARCHAR(20) NOT NULL UNIQUE,
                description           TEXT,
                first_year_of_account INTEGER,
                last_year_of_account  INTEGER,
                is_active             BOOLEAN NOT NULL DEFAULT TRUE,
                created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_lookup_risk_codes_code ON lookup_risk_codes (code)`)

        // Class risk codes (052)
        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_class_risk_codes (
                id          SERIAL PRIMARY KEY,
                code        VARCHAR(20) NOT NULL UNIQUE,
                description TEXT NOT NULL,
                is_active   BOOLEAN NOT NULL DEFAULT TRUE,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)

        // Tax rules (053)
        await client.query(`
            CREATE TABLE IF NOT EXISTS lookup_tax_rules (
                id               SERIAL PRIMARY KEY,
                tax_id           VARCHAR(50) NOT NULL UNIQUE,
                name             VARCHAR(100) NOT NULL,
                country_code     VARCHAR(3) NOT NULL,
                state_code       VARCHAR(10),
                city             VARCHAR(100),
                line_of_business VARCHAR(50) NOT NULL DEFAULT 'ANY',
                tax_type         VARCHAR(50) NOT NULL,
                base             VARCHAR(20) NOT NULL,
                rate_percent     NUMERIC(10,4) NOT NULL,
                fixed_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
                min_amount       NUMERIC(15,2),
                max_amount       NUMERIC(15,2),
                effective_from   DATE NOT NULL,
                effective_to     DATE,
                notes            TEXT,
                is_active        BOOLEAN NOT NULL DEFAULT TRUE,
                created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_lookup_tax_rules_country_code  ON lookup_tax_rules (country_code)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_lookup_tax_rules_country_state ON lookup_tax_rules (country_code, state_code)`)

        console.log('[18-lookups] Done.')
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch(err => { console.error('[18-lookups] ERROR:', err.message); process.exit(1) })
