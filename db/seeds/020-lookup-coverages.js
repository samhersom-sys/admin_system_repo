'use strict'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned' })
async function run() {
    if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
        console.log('[seed] Not running — environment is not development.')
        process.exit(0)
    }
    const client = await pool.connect()
    try {
        // lookup_coverages
        const coverages = [
            { class_of_business: 'PROPERTY', code: 'PD',  name: 'Property Damage',        active: true },
            { class_of_business: 'PROPERTY', code: 'BI',  name: 'Business Interruption',  active: true },
            { class_of_business: 'PROPERTY', code: 'EQ',  name: 'Earthquake',              active: true },
            { class_of_business: 'PROPERTY', code: 'FL',  name: 'Flood',                   active: true },
            { class_of_business: 'MARINE',   code: 'MHL', name: 'Marine Hull',             active: true },
            { class_of_business: 'MARINE',   code: 'MCG', name: 'Marine Cargo',            active: true },
            { class_of_business: 'CASUALTY', code: 'GL',  name: 'General Liability',       active: true },
            { class_of_business: 'CASUALTY', code: 'EL',  name: 'Employers Liability',     active: true },
            { class_of_business: 'AVIATION', code: 'AV',  name: 'Aviation Hull & Liability', active: true },
        ]
        for (const c of coverages) {
            await client.query(
                `INSERT INTO lookup_coverages (class_of_business, code, name, active)
                 VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
                [c.class_of_business, c.code, c.name, c.active]
            )
        }

        // lookup_coverage_detail_types (FK -> lookup_coverages via coverage_code)
        const detailTypes = [
            { coverage_code: 'PD',  code: 'PD_BLDG',  name: 'Buildings',              active: true },
            { coverage_code: 'PD',  code: 'PD_CNTS',  name: 'Contents',               active: true },
            { coverage_code: 'PD',  code: 'PD_MACH',  name: 'Machinery Breakdown',    active: true },
            { coverage_code: 'BI',  code: 'BI_GROSS',  name: 'Gross Profit',           active: true },
            { coverage_code: 'BI',  code: 'BI_RENT',   name: 'Rental Income',          active: true },
            { coverage_code: 'GL',  code: 'GL_PL',    name: 'Public Liability',       active: true },
            { coverage_code: 'GL',  code: 'GL_PI',    name: 'Products Liability',     active: true },
        ]
        for (const d of detailTypes) {
            // Get the coverage id
            const res = await client.query(
                `SELECT id, class_of_business FROM lookup_coverages WHERE code = $1 LIMIT 1`, [d.coverage_code]
            )
            if (res.rows.length === 0) continue
            const coverageId = res.rows[0].id
            const classOfBusiness = res.rows[0].class_of_business
            await client.query(
                `INSERT INTO lookup_coverage_detail_types (coverage_id, class_of_business, code, name, active)
                 VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
                [coverageId, classOfBusiness, d.code, d.name, d.active]
            )
        }

        console.log('[seed-020] Done.')
    } finally { client.release(); await pool.end() }
}
run().catch(err => { console.error('[seed-020] ERROR:', err.message); process.exit(1) })
