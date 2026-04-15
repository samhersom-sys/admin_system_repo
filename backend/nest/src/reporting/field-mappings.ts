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
    type?: 'text' | 'lookup' | 'date' | 'number' | 'count'
    lookupValues?: string[]
    /** SQL predicate injected as CASE/WHEN for filtered count measures. Only valid when type = 'count'. */
    filterExpr?: string
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
            // Measures (REQ-RPT-BE-F-049)
            { key: 'countAll', label: 'Count of Submissions', col: '*', type: 'count' },
            // Dimension attributes
            { key: 'reference', label: 'Reference', col: 'reference' },
            { key: 'insured', label: 'Insured', col: 'insured' },
            { key: 'status', label: 'Status', col: 'status', type: 'lookup', lookupValues: ['open', 'bound', 'declined', 'closed', 'referred', 'quoted'] },
            { key: 'placingBroker', label: 'Placing Broker', col: '"placingBrokerName"' },
            { key: 'inceptionDate', label: 'Inception Date', col: '"inceptionDate"', type: 'date' },
            { key: 'expiryDate', label: 'Expiry Date', col: '"expiryDate"', type: 'date' },
            { key: 'workflowStatus', label: 'Workflow Status', col: '"workflowStatus"', type: 'lookup', lookupValues: ['Created', 'In Review', 'Referred', 'Declined', 'Bound'] },
            { key: 'contractType', label: 'Contract Type', col: '"contractType"' },
            { key: 'submissionType', label: 'Submission Type', col: '"submissionType"' },
            { key: 'clearanceStatus', label: 'Clearance Status', col: '"clearanceStatus"', type: 'lookup', lookupValues: ['pending', 'cleared', 'referred', 'declined'] },
        ],
    },
    policies: {
        table: 'policies',
        orgCol: 'created_by_org_code',
        fields: [
            // Measures (REQ-RPT-BE-F-049)
            { key: 'countAll', label: 'Count of Policies', col: '*', type: 'count' },
            { key: 'countActive', label: 'Count of Active Policies', col: '*', type: 'count', filterExpr: "status = 'active'" },
            { key: 'grossWrittenPremium', label: 'Gross Net Written Premium', col: 'gross_written_premium', type: 'number' },
            // Dimension attributes
            { key: 'reference', label: 'Reference', col: 'reference' },
            { key: 'insured', label: 'Insured', col: 'insured' },
            { key: 'status', label: 'Status', col: 'status', type: 'lookup', lookupValues: ['active', 'expired', 'cancelled', 'pending'] },
            { key: 'placingBroker', label: 'Placing Broker', col: 'placing_broker' },
            { key: 'inceptionDate', label: 'Inception Date', col: 'inception_date', type: 'date' },
            { key: 'expiryDate', label: 'Expiry Date', col: 'expiry_date', type: 'date' },
            { key: 'businessType', label: 'Business Type', col: 'business_type' },
            { key: 'contractType', label: 'Contract Type', col: 'contract_type' },
            { key: 'newOrRenewal', label: 'New or Renewal', col: 'new_or_renewal', type: 'lookup', lookupValues: ['New', 'Renewal'] },
        ],
    },
    quotes: {
        table: 'quotes',
        orgCol: 'created_by_org_code',
        fields: [
            // Measures (REQ-RPT-BE-F-049)
            { key: 'countAll', label: 'Count of Quotes', col: '*', type: 'count' },
            { key: 'countDeclined', label: 'Count of Declined Quotes', col: '*', type: 'count', filterExpr: "status = 'declined'" },
            { key: 'countRenewable', label: 'Count of Renewable Quotes', col: '*', type: 'count', filterExpr: "renewable_indicator = 'Yes'" },
            { key: 'countRenewed', label: 'Count of Renewed Quotes', col: '*', type: 'count', filterExpr: "renewal_status = 'renewed'" },
            // Dimension attributes
            { key: 'reference', label: 'Reference', col: 'reference' },
            { key: 'insured', label: 'Insured', col: 'insured' },
            { key: 'status', label: 'Status', col: 'status', type: 'lookup', lookupValues: ['draft', 'submitted', 'accepted', 'declined', 'expired'] },
            { key: 'inceptionDate', label: 'Inception Date', col: 'inception_date', type: 'date' },
            { key: 'expiryDate', label: 'Expiry Date', col: 'expiry_date', type: 'date' },
            { key: 'currency', label: 'Currency', col: 'quote_currency', type: 'lookup', lookupValues: ['GBP', 'USD', 'EUR', 'CAD', 'AUD'] },
            { key: 'newOrRenewal', label: 'New or Renewal', col: 'new_or_renewal', type: 'lookup', lookupValues: ['New', 'Renewal'] },
        ],
    },
    quoteSections: {
        table: 'quote_sections',
        orgCol: '(SELECT created_by_org_code FROM quotes WHERE id = quote_sections.quote_id)',
        fields: [
            { key: 'reference', label: 'Reference', col: 'reference' },
            { key: 'classOfBusiness', label: 'Class of Business', col: 'class_of_business' },
            { key: 'inceptionDate', label: 'Inception Date', col: 'inception_date', type: 'date' },
            { key: 'expiryDate', label: 'Expiry Date', col: 'expiry_date', type: 'date' },
            { key: 'grossPremium', label: 'Gross Premium', col: 'gross_premium', type: 'number' },
            { key: 'netPremium', label: 'Net Premium', col: 'net_premium', type: 'number' },
            { key: 'annualGrossPremium', label: 'Annual Gross Premium', col: 'annual_gross_premium', type: 'number' },
            { key: 'annualNetPremium', label: 'Annual Net Premium', col: 'annual_net_premium', type: 'number' },
            { key: 'writtenOrder', label: 'Written Order %', col: 'written_order', type: 'number' },
            { key: 'signedOrder', label: 'Signed Order %', col: 'signed_order', type: 'number' },
            { key: 'writtenLineTotal', label: 'Written Line Total', col: 'written_line_total', type: 'number' },
            { key: 'signedLineTotal', label: 'Signed Line Total', col: 'signed_line_total', type: 'number' },
            { key: 'sumInsuredAmount', label: 'Sum Insured Amount', col: 'sum_insured_amount', type: 'number' },
            { key: 'limitAmount', label: 'Limit Amount', col: 'limit_amount', type: 'number' },
            { key: 'daysOnCover', label: 'Days on Cover', col: 'days_on_cover', type: 'number' },
        ],
    },
    policyTransactions: {
        table: 'policy_transactions',
        orgCol: '(SELECT created_by_org_code FROM policies WHERE id = policy_transactions.policy_id)',
        fields: [
            { key: 'transactionType', label: 'Transaction Type', col: 'transaction_type', type: 'lookup', lookupValues: ['new_business', 'renewal', 'endorsement', 'cancellation', 'reinstatement'] },
            { key: 'status', label: 'Status', col: 'status', type: 'lookup', lookupValues: ['pending', 'processed', 'reversed'] },
            { key: 'effectiveDate', label: 'Effective Date', col: 'effective_date', type: 'date' },
        ],
    },
    bindingAuthorities: {
        table: 'binding_authorities',
        orgCol: 'created_by_org_code',
        fields: [
            // Measures (REQ-RPT-BE-F-049)
            { key: 'countAll', label: 'Count of Binding Authorities', col: '*', type: 'count' },
            // Dimension attributes
            { key: 'reference', label: 'Reference', col: 'reference' },
            { key: 'status', label: 'Status', col: 'status' },
            { key: 'inceptionDate', label: 'Inception Date', col: 'inception_date', type: 'date' },
            { key: 'expiryDate', label: 'Expiry Date', col: 'expiry_date', type: 'date' },
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
