'use strict'

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') })

const { Pool } = require('pg')

const DB_URL =
    process.env.DATABASE_URL ||
    'postgres://policyforge:changeme@127.0.0.1:5432/policyforge_cleaned'

const pool = new Pool({ connectionString: DB_URL })

const ISSUED_BA_STATUSES = new Set(['Active', 'Bound', 'Expired', 'Cancelled'])

function toIsoDate(value) {
    if (!value) return null
    if (value instanceof Date) return value.toISOString().slice(0, 10)
    return String(value).slice(0, 10)
}

function buildInitialPayload(bindingAuthority) {
    return {
        details: {
            coverholder: bindingAuthority.payload?.coverholder ?? null,
            coverholder_id: bindingAuthority.payload?.coverholder_id ?? null,
            year_of_account: bindingAuthority.year_of_account ?? null,
            inception_date: toIsoDate(bindingAuthority.inception_date),
            expiry_date: toIsoDate(bindingAuthority.expiry_date),
        },
    }
}

function compareTransactions(left, right) {
    const leftIsInitial = left.type === 'Initial Transaction'
    const rightIsInitial = right.type === 'Initial Transaction'
    if (leftIsInitial && !rightIsInitial) return -1
    if (!leftIsInitial && rightIsInitial) return 1

    const leftTimestamp = left.created_at ?? left.effective_date ?? ''
    const rightTimestamp = right.created_at ?? right.effective_date ?? ''
    if (leftTimestamp < rightTimestamp) return -1
    if (leftTimestamp > rightTimestamp) return 1

    return left.id - right.id
}

async function ensureInitialTransaction(client, bindingAuthority) {
    const existingInitial = await client.query(
        `SELECT id
           FROM binding_authority_transactions
          WHERE binding_authority_id = $1
            AND type = 'Initial Transaction'
            AND deleted_at IS NULL
          LIMIT 1`,
        [bindingAuthority.id],
    )

    if (existingInitial.rows.length > 0) return false

    const inceptionDate = toIsoDate(bindingAuthority.inception_date)

    await client.query(
        `INSERT INTO binding_authority_transactions (
            binding_authority_id,
            type,
            status,
            sequence_number,
            effective_date,
            description,
            payload,
            created_at,
            created_by,
            created_by_org_code
        ) VALUES ($1, 'Initial Transaction', 'Issued', 1, $2, $3, $4::jsonb, $5::timestamptz, $6, $7)`,
        [
            bindingAuthority.id,
            inceptionDate,
            'Initial Binding Authority issuance',
            JSON.stringify(buildInitialPayload(bindingAuthority)),
            `${inceptionDate}T00:00:00Z`,
            bindingAuthority.created_by,
            bindingAuthority.created_by_org_code,
        ],
    )

    return true
}

async function renumberTransactions(client, bindingAuthorityId) {
    const transactions = await client.query(
        `SELECT id, type, status, sequence_number, effective_date, created_at
           FROM binding_authority_transactions
          WHERE binding_authority_id = $1
            AND deleted_at IS NULL`,
        [bindingAuthorityId],
    )

    const ordered = [...transactions.rows].sort(compareTransactions)
    let updated = 0

    for (const [index, transaction] of ordered.entries()) {
        const nextSequence = index + 1
        if (transaction.sequence_number === nextSequence) continue
        await client.query(
            `UPDATE binding_authority_transactions
                SET sequence_number = $2
              WHERE id = $1`,
            [transaction.id, nextSequence],
        )
        updated++
    }

    return updated
}

async function run() {
    if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
        console.log('[seed-031] Not running — environment is not development.')
        process.exit(0)
    }

    const client = await pool.connect()
    try {
        console.log('[Seed 031 — binding_authority_transactions] Backfilling initial transactions...')

        const bindingAuthorities = await client.query(
            `SELECT id, reference, status, inception_date, expiry_date, year_of_account, payload, created_by, created_by_org_code
               FROM binding_authorities
              WHERE deleted_at IS NULL`,
        )

        let inserted = 0
        let renumbered = 0

        for (const bindingAuthority of bindingAuthorities.rows) {
            if (!ISSUED_BA_STATUSES.has(bindingAuthority.status)) continue

            const createdInitial = await ensureInitialTransaction(client, bindingAuthority)
            if (createdInitial) {
                inserted++
                console.log(`  ✅ ${bindingAuthority.reference} — inserted missing initial transaction`)
            }

            const updatedRows = await renumberTransactions(client, bindingAuthority.id)
            if (updatedRows > 0) {
                renumbered += updatedRows
                console.log(`  ↺ ${bindingAuthority.reference} — renumbered ${updatedRows} transaction(s)`)
            }
        }

        console.log(`[Seed 031 — binding_authority_transactions] Done. ${inserted} inserted, ${renumbered} renumbered.`)
    } catch (err) {
        console.error('[Seed 031 — binding_authority_transactions] ERROR:', err.message)
        process.exit(1)
    } finally {
        client.release()
        await pool.end()
    }
}

run()