/**
 * bordereauValidations — Normalisation and validation utilities for bordereaux imports.
 *
 * Ported from the backup's `src/utils/bordereauValidations.js`.
 * REQ-BA-FE-F-012 (Import wizard — validation step)
 */

// ---------------------------------------------------------------------------
// Value normalisation maps per target field key
// ---------------------------------------------------------------------------
const VALUE_MAPS: Record<string, Record<string, string>> = {
    'policyTxn.transactionType': {
        N:   'New Business',
        NB:  'New Business',
        NEW: 'New Business',
        R:   'Renewal',
        RN:  'Renewal',
        RNL: 'Renewal',
        REN: 'Renewal',
        E:   'Endorsement',
        END: 'Endorsement',
        C:   'Cancellation',
        CAN: 'Cancellation',
    },
}

export function normalizeValue(targetKey: string, raw: unknown): string {
    if (raw == null) return ''
    const v = String(raw).trim()
    const map = VALUE_MAPS[targetKey]
    if (!map) return v
    return map[v.toUpperCase()] ?? v
}

export function parseNumber(raw: unknown): number {
    if (raw == null || raw === '') return 0
    const s = String(raw).replace(/[,\s]/g, '')
    const n = parseFloat(s)
    return Number.isFinite(n) ? n : 0
}

/** Build a normalised flat object of mapped target fields from one raw spreadsheet row. */
export function buildNormalizedRow(
    rawRow: Record<string, unknown>,
    columnMapping: Record<string, string>,
): Record<string, string> {
    const out: Record<string, string> = {}
    for (const [srcHeader, targetKey] of Object.entries(columnMapping)) {
        if (!targetKey) continue
        out[targetKey] = normalizeValue(targetKey, rawRow[srcHeader])
    }
    return out
}

export interface ValidationIssue {
    type: string
    severity: 'error' | 'warning'
    row?: number
    field?: string
    policyRef?: string
    message: string
}

interface ValidationContext {
    classesOfBusiness?: Array<string | { name: string }>
}

/** Validate a batch of normalised rows. Returns an array of issues. */
export function validateRows(
    normalizedRows: Record<string, string>[],
    context: ValidationContext = {},
): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const { classesOfBusiness = [] } = context
    const cobSet = new Set(
        classesOfBusiness.map((c) =>
            typeof c === 'string' ? c.toLowerCase() : String((c as { name: string }).name ?? '').toLowerCase(),
        ),
    )

    const sumPerPolicy = new Map<string, number>()

    normalizedRows.forEach((row, idx) => {
        // 1) COB validation
        const cob = row['section.classOfBusiness'] ?? row['policy.classOfBusiness'] ?? ''
        if (cob) {
            if (!cobSet.has(cob.toLowerCase())) {
                issues.push({
                    type: 'invalid-cob',
                    severity: 'error',
                    row: idx + 1,
                    field: 'section.classOfBusiness',
                    message: `Unrecognised Class of Business: ${cob}`,
                })
            }
        }

        // 2) Transaction type canonical check
        if (row['policyTxn.transactionType']) {
            const allowed = new Set(['New Business', 'Renewal', 'Endorsement', 'Cancellation'])
            if (!allowed.has(row['policyTxn.transactionType'])) {
                issues.push({
                    type: 'invalid-txn-type',
                    severity: 'error',
                    row: idx + 1,
                    field: 'policyTxn.transactionType',
                    message: `Unknown transaction type: ${row['policyTxn.transactionType']}`,
                })
            }
        }

        // 3) Gross premium non-negative
        const gp = parseNumber(row['section.grossPremium'] ?? row['policy.grossPremium'])
        if (gp < 0) {
            issues.push({
                type: 'negative-premium',
                severity: 'error',
                row: idx + 1,
                field: 'section.grossPremium',
                message: `Gross premium is negative (${gp}).`,
            })
        }

        // 4) Aggregate per policy
        const polRef = row['policy.reference'] ? String(row['policy.reference']) : ''
        if (polRef) {
            sumPerPolicy.set(polRef, (sumPerPolicy.get(polRef) ?? 0) + gp)
        }
    })

    // 5) Flag policies whose net premium sum is below zero
    for (const [policyRef, sum] of sumPerPolicy.entries()) {
        if (sum < 0) {
            issues.push({
                type: 'policy-premium-below-zero',
                severity: 'warning',
                policyRef,
                message: `Sum of gross premiums for policy ${policyRef} is below zero (${sum}).`,
            })
        }
    }

    return issues
}
