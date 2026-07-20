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
 *
 * MULTI-TENANCY CONTRACT — MANDATORY:
 *   Every `SourceConfig` carries an `orgCol` field. Any service that executes a
 *   measure derived from this file MUST include `WHERE {orgCol} = :orgCode` in
 *   the generated SQL, where `:orgCode` comes from the authenticated user's JWT.
 *
 *   `filterExpr` values are business-logic predicates ONLY (e.g. "status = 'Active'").
 *   They must NEVER contain an org_code clause. Tenant scoping is always the
 *   responsibility of the executing service, not the measure definition.
 *
 *   Violation of this contract is a multi-tenancy breach (§5.10.5 of AI Guidelines).
 */

export interface FieldDef {
    key: string
    label: string
    col: string
    type?: 'text' | 'lookup' | 'date' | 'number' | 'count' | 'ratio'
    lookupValues?: string[]
    /** SQL predicate injected as CASE/WHEN for filtered count measures. Only valid when type = 'count'.
     *  MUST NOT contain an org_code clause — tenant scoping is always added by the executing service via `orgCol`. */
    filterExpr?: string
    /** SQL predicate for the numerator of a ratio measure. Only valid when type = 'ratio'.
     *  MUST NOT contain an org_code clause — tenant scoping is always added by the executing service via `orgCol`. */
    ratioNumerator?: string
    /** SQL predicate for the denominator of a ratio measure. Only valid when type = 'ratio'.
     *  MUST NOT contain an org_code clause — tenant scoping is always added by the executing service via `orgCol`. */
    ratioDenominator?: string
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
            // Dimension attributes (measures live in measure_definitions — see §5.10.5)
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
            // Dimension attributes (measures live in measure_definitions — see §5.10.5)
            { key: 'grossWrittenPremium', label: 'Gross Net Written Premium', col: 'gross_written_premium', type: 'number' },
            { key: 'reference', label: 'Reference', col: 'reference' },
            { key: 'insured', label: 'Insured', col: 'insured' },
            { key: 'status', label: 'Status', col: 'status', type: 'lookup', lookupValues: ['Active', 'Expired', 'Cancelled', 'Renewed', 'Lapsed', 'Disbanded'] },
            { key: 'renewable', label: 'Renewable', col: 'renewable', type: 'lookup', lookupValues: ['Renewable', 'Non-Renewable'] },
            { key: 'placingBroker', label: 'Placing Broker', col: 'placing_broker' },
            { key: 'inceptionDate', label: 'Inception Date', col: 'inception_date', type: 'date' },
            { key: 'expiryDate', label: 'Expiry Date', col: 'expiry_date', type: 'date' },
            { key: 'businessType', label: 'Business Type', col: 'business_type' },
            { key: 'contractType', label: 'Contract Type', col: 'contract_type' },
            { key: 'newOrRenewal', label: 'New or Renewal', col: 'new_or_renewal', type: 'lookup', lookupValues: ['New', 'Renewal'] },
        ],
    },
    policyUserSummary: {
        table: `(
            WITH RECURSIVE entity_path AS (
                SELECT
                    e.id AS leaf_id,
                    e.parent_entity_id,
                    e.entity_name,
                    h.level_order
                FROM organisation_entities e
                JOIN organisation_hierarchy h ON h.id = e.hierarchy_level_id
                WHERE e.is_active = true

                UNION ALL

                SELECT
                    ep.leaf_id,
                    p.parent_entity_id,
                    p.entity_name,
                    h.level_order
                FROM entity_path ep
                JOIN organisation_entities p ON p.id = ep.parent_entity_id
                JOIN organisation_hierarchy h ON h.id = p.hierarchy_level_id
                WHERE p.is_active = true
            ),
            entity_levels AS (
                SELECT
                    leaf_id,
                    MAX(entity_name) FILTER (WHERE level_order = 1) AS "hierarchyLevel1",
                    MAX(entity_name) FILTER (WHERE level_order = 2) AS "hierarchyLevel2",
                    MAX(entity_name) FILTER (WHERE level_order = 3) AS "hierarchyLevel3",
                    MAX(entity_name) FILTER (WHERE level_order = 4) AS "hierarchyLevel4",
                    MAX(entity_name) FILTER (WHERE level_order = 5) AS "hierarchyLevel5",
                    STRING_AGG(entity_name, ' > ' ORDER BY level_order) AS "hierarchyPath"
                FROM entity_path
                GROUP BY leaf_id
            )
            SELECT
                COALESCE(NULLIF(p.created_by, ''), 'Unknown User') AS "user",
                p.created_by_org_code AS org_code,
                COALESCE(NULLIF(u.org_code, ''), p.created_by_org_code) AS "userOrgCode",
                COALESCE(el."hierarchyLevel1", 'Unassigned') AS "hierarchyLevel1",
                COALESCE(el."hierarchyLevel2", 'Unassigned') AS "hierarchyLevel2",
                COALESCE(el."hierarchyLevel3", 'Unassigned') AS "hierarchyLevel3",
                COALESCE(el."hierarchyLevel4", 'Unassigned') AS "hierarchyLevel4",
                COALESCE(el."hierarchyLevel5", 'Unassigned') AS "hierarchyLevel5",
                COALESCE(el."hierarchyPath", 'Unassigned') AS "hierarchyPath",
                CONCAT(COALESCE(el."hierarchyPath", 'Unassigned'), ' > ', COALESCE(NULLIF(p.created_by, ''), 'Unknown User')) AS "hierarchy",
                SUM(CASE WHEN CAST(p.expiry_date AS date) >= CURRENT_DATE THEN 1 ELSE 0 END)::bigint AS "expiringPolicyCount",
                SUM(CASE WHEN p.renewable = 'Renewable' THEN 1 ELSE 0 END)::bigint AS "renewablePolicyCount",
                SUM(CASE WHEN p.new_or_renewal = 'New' OR p.business_type = 'New Business' THEN 1 ELSE 0 END)::bigint AS "newBusinessPolicyCount",
                SUM(CASE WHEN p.status = 'Renewed' THEN 1 ELSE 0 END)::bigint AS "renewedPolicyCount",
                SUM(CASE WHEN p.status = 'Expired' THEN 1 ELSE 0 END)::bigint AS "lapsedPolicyCount",
                SUM(CASE WHEN p.status = 'Cancelled' THEN 1 ELSE 0 END)::bigint AS "cancelledPolicyCount",
                (
                    SUM(CASE WHEN p.new_or_renewal = 'New' OR p.business_type = 'New Business' THEN 1 ELSE 0 END)
                    + SUM(CASE WHEN p.status = 'Renewed' THEN 1 ELSE 0 END)
                    - SUM(CASE WHEN CAST(p.expiry_date AS date) >= CURRENT_DATE THEN 1 ELSE 0 END)
                )::bigint AS "netNewPolicyCount",
                COUNT(*)::bigint AS "policyCount",
                CASE
                    WHEN SUM(CASE WHEN p.renewable = 'Renewable' THEN 1 ELSE 0 END) = 0 THEN NULL
                    ELSE LEAST(
                        100::numeric,
                        ROUND(
                            100::numeric * SUM(CASE WHEN p.status = 'Renewed' THEN 1 ELSE 0 END)::numeric
                            / NULLIF(SUM(CASE WHEN p.renewable = 'Renewable' THEN 1 ELSE 0 END)::numeric, 0),
                            4
                        )
                    )
                END AS "retentionRatio",
                COALESCE(SUM(CASE WHEN CAST(p.expiry_date AS date) >= CURRENT_DATE THEN p.gross_written_premium ELSE 0 END), 0)::numeric AS "expiringGrossWrittenPremium",
                COALESCE(SUM(CASE WHEN p.renewable = 'Renewable' THEN p.gross_written_premium ELSE 0 END), 0)::numeric AS "renewableGrossWrittenPremium",
                COALESCE(SUM(CASE WHEN p.new_or_renewal = 'New' OR p.business_type = 'New Business' THEN p.gross_written_premium ELSE 0 END), 0)::numeric AS "newBusinessGrossWrittenPremium",
                COALESCE(SUM(CASE WHEN p.status = 'Renewed' THEN p.gross_written_premium ELSE 0 END), 0)::numeric AS "renewedGrossWrittenPremium",
                COALESCE(SUM(CASE WHEN p.status = 'Expired' THEN p.gross_written_premium ELSE 0 END), 0)::numeric AS "lapsedGrossWrittenPremium",
                COALESCE(SUM(CASE WHEN p.status = 'Cancelled' THEN p.gross_written_premium ELSE 0 END), 0)::numeric AS "cancelledGrossWrittenPremium",
                COALESCE(SUM(p.gross_written_premium), 0)::numeric AS "policyGrossWrittenPremium",
                (
                    COALESCE(SUM(CASE WHEN p.new_or_renewal = 'New' OR p.business_type = 'New Business' THEN p.gross_written_premium ELSE 0 END), 0)
                    + COALESCE(SUM(CASE WHEN p.status = 'Renewed' THEN p.gross_written_premium ELSE 0 END), 0)
                    - COALESCE(SUM(CASE WHEN CAST(p.expiry_date AS date) >= CURRENT_DATE THEN p.gross_written_premium ELSE 0 END), 0)
                )::numeric AS "netNewGrossWrittenPremium",
                CASE
                    WHEN COALESCE(SUM(CASE WHEN p.renewable = 'Renewable' THEN p.gross_written_premium ELSE 0 END), 0) = 0 THEN NULL
                    ELSE LEAST(
                        100::numeric,
                        ROUND(
                            100::numeric * COALESCE(SUM(CASE WHEN p.status = 'Renewed' THEN p.gross_written_premium ELSE 0 END), 0)::numeric
                            / NULLIF(COALESCE(SUM(CASE WHEN p.renewable = 'Renewable' THEN p.gross_written_premium ELSE 0 END), 0)::numeric, 0),
                            4
                        )
                    )
                END AS "retentionRatioGrossWrittenPremium",
                COALESCE(SUM(p.gross_written_premium), 0)::numeric AS "totalGrossWrittenPremium"
            FROM policies p
            LEFT JOIN users u ON LOWER(u.username) = LOWER(COALESCE(NULLIF(p.created_by, ''), ''))
            LEFT JOIN organisation_entities leaf ON leaf.entity_code = COALESCE(NULLIF(u.org_code, ''), p.created_by_org_code) AND leaf.is_active = true
            LEFT JOIN entity_levels el ON el.leaf_id = leaf.id
            WHERE p.deleted_at IS NULL
            GROUP BY
                COALESCE(NULLIF(p.created_by, ''), 'Unknown User'),
                p.created_by_org_code,
                COALESCE(NULLIF(u.org_code, ''), p.created_by_org_code),
                el."hierarchyLevel1",
                el."hierarchyLevel2",
                el."hierarchyLevel3",
                el."hierarchyLevel4",
                el."hierarchyLevel5",
                el."hierarchyPath"
        ) policy_user_summary`,
        orgCol: 'org_code',
        fields: [
            { key: 'user', label: 'User', col: '"user"' },
            { key: 'hierarchy', label: 'Hierarchy', col: '"hierarchy"' },
            { key: 'userOrgCode', label: 'User Org Code', col: '"userOrgCode"' },
            { key: 'hierarchyLevel1', label: 'Hierarchy Level 1', col: '"hierarchyLevel1"' },
            { key: 'hierarchyLevel2', label: 'Hierarchy Level 2', col: '"hierarchyLevel2"' },
            { key: 'hierarchyLevel3', label: 'Hierarchy Level 3', col: '"hierarchyLevel3"' },
            { key: 'hierarchyLevel4', label: 'Hierarchy Level 4', col: '"hierarchyLevel4"' },
            { key: 'hierarchyLevel5', label: 'Hierarchy Level 5', col: '"hierarchyLevel5"' },
            { key: 'hierarchyPath', label: 'Hierarchy Path', col: '"hierarchyPath"' },
            { key: 'expiringPolicyCount', label: 'Expiring Policy Count', col: '"expiringPolicyCount"', type: 'number' },
            { key: 'renewablePolicyCount', label: 'Renewable Policy Count', col: '"renewablePolicyCount"', type: 'number' },
            { key: 'newBusinessPolicyCount', label: 'New Business Policy Count', col: '"newBusinessPolicyCount"', type: 'number' },
            { key: 'renewedPolicyCount', label: 'Renewed Policy Count', col: '"renewedPolicyCount"', type: 'number' },
            { key: 'lapsedPolicyCount', label: 'Lapsed Policy Count', col: '"lapsedPolicyCount"', type: 'number' },
            { key: 'cancelledPolicyCount', label: 'Cancelled Policy Count', col: '"cancelledPolicyCount"', type: 'number' },
            { key: 'netNewPolicyCount', label: 'Net New Policy Count', col: '"netNewPolicyCount"', type: 'number' },
            { key: 'policyCount', label: 'Policy Count', col: '"policyCount"', type: 'number' },
            { key: 'retentionRatio', label: 'Retention Ratio', col: '"retentionRatio"', type: 'number' },
            { key: 'expiringGrossWrittenPremium', label: 'Expiring Gross Written Premium', col: '"expiringGrossWrittenPremium"', type: 'number' },
            { key: 'renewableGrossWrittenPremium', label: 'Renewable Gross Written Premium', col: '"renewableGrossWrittenPremium"', type: 'number' },
            { key: 'newBusinessGrossWrittenPremium', label: 'New Business Gross Written Premium', col: '"newBusinessGrossWrittenPremium"', type: 'number' },
            { key: 'renewedGrossWrittenPremium', label: 'Renewed Gross Written Premium', col: '"renewedGrossWrittenPremium"', type: 'number' },
            { key: 'lapsedGrossWrittenPremium', label: 'Lapsed Gross Written Premium', col: '"lapsedGrossWrittenPremium"', type: 'number' },
            { key: 'cancelledGrossWrittenPremium', label: 'Cancelled Gross Written Premium', col: '"cancelledGrossWrittenPremium"', type: 'number' },
            { key: 'policyGrossWrittenPremium', label: 'Policy Gross Written Premium', col: '"policyGrossWrittenPremium"', type: 'number' },
            { key: 'netNewGrossWrittenPremium', label: 'Net New Gross Written Premium', col: '"netNewGrossWrittenPremium"', type: 'number' },
            { key: 'retentionRatioGrossWrittenPremium', label: 'Retention Ratio (Gross Written Premium)', col: '"retentionRatioGrossWrittenPremium"', type: 'number' },
            { key: 'totalGrossWrittenPremium', label: 'Total Gross Written Premium', col: '"totalGrossWrittenPremium"', type: 'number' },
        ],
    },
    quotes: {
        table: 'quotes',
        orgCol: 'created_by_org_code',
        fields: [
            // Dimension attributes (measures live in measure_definitions — see §5.10.5)
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
            // Dimension attributes (measures live in measure_definitions — see §5.10.5)
            { key: 'reference', label: 'Reference', col: 'reference' },
            { key: 'status', label: 'Status', col: 'status' },
            { key: 'inceptionDate', label: 'Inception Date', col: 'inception_date', type: 'date' },
            { key: 'expiryDate', label: 'Expiry Date', col: 'expiry_date', type: 'date' },
        ],
    },
    policy_earning_periods: {
        table: 'policy_earning_periods',
        orgCol: 'org_code',
        fields: [
            { key: 'earned_amount', label: 'Earned Amount', col: 'earned_amount' },
            { key: 'unearned_amount', label: 'Unearned Amount', col: 'unearned_amount' },
            { key: 'total_premium', label: 'Total Premium', col: 'total_premium' },
            { key: 'period_year', label: 'Period Year', col: 'period_year' },
            { key: 'period_month', label: 'Period Month', col: 'period_month' },
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
