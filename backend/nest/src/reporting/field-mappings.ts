/**
 * Reporting Semantic Layer — Field Mappings
 *
 * Defines the available reportable fields per data source.
 * Each entry maps a frontend-facing `key` to:
 *   - `label`  — human-readable column header
 *   - `col`    — exact SQL column expression (quoted where needed for legacy schemas)
 *
 * SECURITY: Only fields present in this map may appear in generated SQL.
 * User-supplied field names that do not match an entry are silently dropped.
 */

export interface FieldDef {
    key: string
    label: string
    col: string
}

export interface SourceConfig {
    table: string
    orgCol: string
    fields: FieldDef[]
}

export const DATA_SOURCES: Record<string, SourceConfig> = {
    submissions: {
        table: 'submission',
        orgCol: '"createdByOrgCode"',
        fields: [
            { key: 'reference', label: 'Reference', col: 'reference' },
            { key: 'insured', label: 'Insured', col: 'insured' },
            { key: 'status', label: 'Status', col: 'status' },
            { key: 'placingBroker', label: 'Placing Broker', col: '"placingBrokerName"' },
            { key: 'inceptionDate', label: 'Inception Date', col: '"inceptionDate"' },
            { key: 'expiryDate', label: 'Expiry Date', col: '"expiryDate"' },
        ],
    },
    policies: {
        table: 'policies',
        orgCol: 'created_by_org_code',
        fields: [
            { key: 'reference', label: 'Reference', col: 'reference' },
            { key: 'insured', label: 'Insured', col: 'insured' },
            { key: 'status', label: 'Status', col: 'status' },
            { key: 'placingBroker', label: 'Placing Broker', col: 'placing_broker' },
            { key: 'inceptionDate', label: 'Inception Date', col: 'inception_date' },
            { key: 'expiryDate', label: 'Expiry Date', col: 'expiry_date' },
            { key: 'grossWrittenPremium', label: 'Gross Written Premium', col: 'gross_written_premium' },
        ],
    },
    quotes: {
        table: 'quotes',
        orgCol: 'created_by_org_code',
        fields: [
            { key: 'reference', label: 'Reference', col: 'reference' },
            { key: 'insured', label: 'Insured', col: 'insured' },
            { key: 'status', label: 'Status', col: 'status' },
            { key: 'inceptionDate', label: 'Inception Date', col: 'inception_date' },
            { key: 'expiryDate', label: 'Expiry Date', col: 'expiry_date' },
            { key: 'currency', label: 'Currency', col: 'quote_currency' },
        ],
    },
    parties: {
        table: 'party',
        orgCol: '"orgCode"',
        fields: [
            { key: 'name', label: 'Name', col: 'name' },
            { key: 'role', label: 'Role', col: 'role' },
            { key: 'email', label: 'Email', col: 'email' },
            { key: 'phone', label: 'Phone', col: 'phone' },
            { key: 'city', label: 'City', col: 'city' },
            { key: 'country', label: 'Country', col: 'country' },
            { key: 'reference', label: 'Reference', col: 'reference' },
        ],
    },
}

/**
 * Returns field definitions for the given domain, or [] if not found.
 * Used by the GET /api/report-field-mappings/:domain endpoint.
 */
export function getFieldMappings(domain: string): Array<{ key: string; label: string }> {
    const source = DATA_SOURCES[domain]
    if (!source) return []
    return source.fields.map(({ key, label }) => ({ key, label }))
}
