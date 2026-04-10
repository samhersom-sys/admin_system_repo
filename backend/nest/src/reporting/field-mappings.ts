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
    type?: 'text' | 'lookup' | 'date' | 'number'
    lookupValues?: string[]
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
            { key: 'status', label: 'Status', col: 'status', type: 'lookup', lookupValues: ['open', 'bound', 'declined', 'closed', 'referred', 'quoted'] },
            { key: 'placingBroker', label: 'Placing Broker', col: '"placingBrokerName"' },
            { key: 'inceptionDate', label: 'Inception Date', col: '"inceptionDate"', type: 'date' },
            { key: 'expiryDate', label: 'Expiry Date', col: '"expiryDate"', type: 'date' },
        ],
    },
    policies: {
        table: 'policies',
        orgCol: 'created_by_org_code',
        fields: [
            { key: 'reference', label: 'Reference', col: 'reference' },
            { key: 'insured', label: 'Insured', col: 'insured' },
            { key: 'status', label: 'Status', col: 'status', type: 'lookup', lookupValues: ['active', 'expired', 'cancelled', 'pending'] },
            { key: 'placingBroker', label: 'Placing Broker', col: 'placing_broker' },
            { key: 'inceptionDate', label: 'Inception Date', col: 'inception_date', type: 'date' },
            { key: 'expiryDate', label: 'Expiry Date', col: 'expiry_date', type: 'date' },
            { key: 'grossWrittenPremium', label: 'Gross Written Premium', col: 'gross_written_premium', type: 'number' },
        ],
    },
    quotes: {
        table: 'quotes',
        orgCol: 'created_by_org_code',
        fields: [
            { key: 'reference', label: 'Reference', col: 'reference' },
            { key: 'insured', label: 'Insured', col: 'insured' },
            { key: 'status', label: 'Status', col: 'status', type: 'lookup', lookupValues: ['draft', 'submitted', 'accepted', 'declined', 'expired'] },
            { key: 'inceptionDate', label: 'Inception Date', col: 'inception_date', type: 'date' },
            { key: 'expiryDate', label: 'Expiry Date', col: 'expiry_date', type: 'date' },
            { key: 'currency', label: 'Currency', col: 'quote_currency', type: 'lookup', lookupValues: ['GBP', 'USD', 'EUR', 'CAD', 'AUD'] },
        ],
    },
    parties: {
        table: 'party',
        orgCol: '"orgCode"',
        fields: [
            { key: 'name', label: 'Name', col: 'name' },
            { key: 'role', label: 'Role', col: 'role', type: 'lookup', lookupValues: ['broker', 'insured', 'underwriter', 'coverholder', 'third_party'] },
            { key: 'email', label: 'Email', col: 'email' },
            { key: 'phone', label: 'Phone', col: 'phone' },
            { key: 'city', label: 'City', col: 'city' },
            { key: 'country', label: 'Country', col: 'country', type: 'lookup', lookupValues: ['United Kingdom', 'United States', 'Germany', 'France', 'Australia', 'Canada'] },
            { key: 'reference', label: 'Reference', col: 'reference' },
        ],
    },
}

/**
 * Returns field definitions for the given domain, or [] if not found.
 * Used by the GET /api/report-field-mappings/:domain endpoint.
 */
export function getFieldMappings(domain: string): Array<{ key: string; label: string; type?: string; lookupValues?: string[] }> {
    const source = DATA_SOURCES[domain]
    if (!source) return []
    return source.fields.map(({ key, label, type, lookupValues }) => ({
        key,
        label,
        ...(type ? { type } : {}),
        ...(lookupValues ? { lookupValues } : {}),
    }))
}
