/**
 * Policies Domain — Service Layer
 *
 * Owns the lifecycle management of policy records (issued from Bound quotes).
 * Provides: types, API adapter functions.
 *
 * Requirements: frontend/src/policies/policies.requirements.md
 * Tests: frontend/src/policies/__tests__/PoliciesPages.test.tsx
 *
 * REQ-POL-FE-S-001 — exports all 15 required functions
 */

import { post, get, put, del } from '@/shared/lib/api-client/api-client'

type LookupOption = string | { code?: string | null; name?: string | null; label?: string | null; value?: string | null }

function normaliseLookupValues(items: LookupOption[] | null | undefined): string[] {
    return (items ?? [])
        .map((item) => {
            if (typeof item === 'string') return item
            return item.name ?? item.label ?? item.code ?? item.value ?? ''
        })
        .map((item) => String(item).trim())
        .filter(Boolean)
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PolicyStatus = 'Active' | 'Expired' | 'Cancelled' | 'Draft'

export interface Policy {
    id: number
    reference: string
    quote_id?: number | null
    submission_id?: number | null
    insured: string
    insured_id?: string | null
    placing_broker?: string | null
    class_of_business?: string | null
    business_type?: string | null
    new_or_renewal?: string | null
    inception_date?: string | null
    expiry_date?: string | null
    inception_time?: string | null
    expiry_time?: string | null
    lta_applicable?: boolean | null
    contract_type?: string | null
    method_of_placement?: string | null
    unique_market_reference?: string | null
    renewable_indicator?: string | null
    renewal_date?: string | null
    renewal_status?: string | null
    status: PolicyStatus
    gross_premium?: number | null
    net_premium?: number | null
    policy_currency?: string | null
    payload?: Record<string, unknown> | null
}

export interface PolicySection {
    id: number
    policy_id: number
    reference: string
    class_of_business?: string | null
    inception_date?: string | null
    effective_date?: string | null
    expiry_date?: string | null
    days_on_cover?: number | null
    limit_currency?: string | null
    limit_amount?: number | null
    limit_loss_qualifier?: string | null
    excess_currency?: string | null
    excess_amount?: number | null
    excess_loss_qualifier?: string | null
    sum_insured_currency?: string | null
    sum_insured?: number | null
    sum_insured_amount?: number | null
    premium_currency?: string | null
    gross_gross_premium?: number | null
    gross_deductions?: number | null
    gross_premium?: number | null
    deductions?: number | null
    net_premium?: number | null
    tax_receivable?: number | null
    tax_payable?: number | null
    gross_gross_premium_written?: number | null
    gross_gross_premium_signed?: number | null
    gross_deductions_written?: number | null
    gross_deductions_signed?: number | null
    gross_premium_written?: number | null
    gross_premium_signed?: number | null
    deductions_written?: number | null
    deductions_signed?: number | null
    net_premium_written?: number | null
    net_premium_signed?: number | null
    tax_receivable_written?: number | null
    tax_receivable_signed?: number | null
    tax_payable_written?: number | null
    tax_payable_signed?: number | null
    annual_gross_premium?: number | null
    annual_net_premium?: number | null
    limit_amount_movement?: number | null
    excess_amount_movement?: number | null
    sum_insured_amount_movement?: number | null
    gross_premium_movement?: number | null
    annual_gross_premium_movement?: number | null
    annual_net_premium_movement?: number | null
    annual_gross?: number | null
    annual_net?: number | null
    written_order?: number | null
    signed_order?: number | null
    time_basis?: string | null
    written_order_basis?: string | null
    signed_order_basis?: string | null
    written_line_total?: number | null
    signed_line_total?: number | null
    delegated_authority_ref?: string | null
    delegated_authority_section_ref?: string | null
}

export interface PolicyCoverage {
    id: number
    section_id: number
    reference: string
    coverage?: string | null
    effective_date?: string | null
    expiry_date?: string | null
    sum_insured_currency?: string | null
    sum_insured?: number | null
    limit_currency?: string | null
    limit_amount?: number | null
    gross_premium?: number | null
    net_premium?: number | null
}

export interface PolicyCoverageDetail {
    id: number
    policy_id: number
    section_id: number
    coverage_id: number
    reference: string | null
    coverage_detail_type_id?: number | null
    coverage_detail_sub_type_id?: number | null
    effective_date?: string | null
    effective_time?: string | null
    expiry_date?: string | null
    expiry_time?: string | null
    sum_insured_currency?: string | null
    sum_insured?: number | null
    payload?: Record<string, unknown> | null
}

export interface CreatePolicyCoverageDetailInput {
    coverage_detail_type_id?: number | null
    coverage_detail_sub_type_id?: number | null
    effective_date?: string | null
    effective_time?: string | null
    expiry_date?: string | null
    expiry_time?: string | null
    sum_insured_currency?: string | null
    sum_insured?: number | null
    payload?: Record<string, unknown>
}

export interface PolicyTransaction {
    id: number
    policy_id: number
    transaction_type: string
    sub_type?: string | null
    effective_date?: string | null
    description?: string | null
    status: string
    reference?: string | null
    payload?: Record<string, unknown> | null
    created_by?: string | null
    created_at?: string | null
    sequence_number?: number | null
    number?: number | null
}

export interface PolicySectionTransactionDetail {
    id: number
    transaction_id: number
    section_id: number
    section_reference: string
    policy_reference: string
    transaction_type: string
    effective_date?: string | null
    current: {
        limit_amount?: number | null
        excess_amount?: number | null
        sum_insured?: number | null
        gross_premium?: number | null
        net_premium?: number | null
        tax_receivable?: number | null
        deductions?: number | null
        annual_gross_premium?: number | null
        annual_net_premium?: number | null
    }
    previous: {
        limit_amount?: number | null
        excess_amount?: number | null
        sum_insured?: number | null
        gross_premium?: number | null
        net_premium?: number | null
        tax_receivable?: number | null
        deductions?: number | null
        annual_gross_premium?: number | null
        annual_net_premium?: number | null
    }
    movements: {
        limit_amount?: number | null
        excess_amount?: number | null
        sum_insured?: number | null
        gross_premium?: number | null
        net_premium?: number | null
        tax_receivable?: number | null
        deductions?: number | null
        annual_gross_premium?: number | null
        annual_net_premium?: number | null
    }
}

export interface AuditEvent {
    id: number
    entity_type: string
    entity_id: number
    action: string
    performed_by?: string | null
    performed_at: string
}

export interface Invoice {
    id: number
    invoice_number: string
    date?: string | null
    amount?: number | null
    status?: string | null
    due_date?: string | null
}

export interface LocationRow {
    CoverageType: string
    CoverageSubType: string
    Currency: string
    SumInsured: number
}

export interface CreateEndorsementInput {
    transactionType?: string
    transactionSubType?: string | null
    effectiveDate: string
    description?: string
}

export interface CreatePolicySectionInput {
    class_of_business?: string
    inception_date?: string
    effective_date?: string
    expiry_date?: string
    inception_time?: string
    effective_time?: string
    expiry_time?: string
    limit_currency?: string
    limit_amount?: number
    limit_loss_qualifier?: string
    excess_currency?: string
    excess_loss_qualifier?: string
    sum_insured_currency?: string
    premium_currency?: string
    gross_premium?: number
}

// ---------------------------------------------------------------------------
// API adapters — REQ-POL-FE-S-001
// ---------------------------------------------------------------------------

/** List all policies for the tenant. */
export async function getPolicies(): Promise<Policy[]> {
    return get<Policy[]>('/api/policies')
}

/** Fetch a single policy by ID. */
export async function getPolicy(id: string | number): Promise<Policy> {
    return get<Policy>(`/api/policies/${id}`)
}

/** Create a new policy (used by Issue Policy flow). */
export async function createPolicy(input: Partial<Policy>): Promise<Policy> {
    return post<Policy>('/api/policies', input)
}

/** Update mutable fields on a policy. */
export async function updatePolicy(id: string | number, patch: Partial<Policy>): Promise<Policy> {
    return put<Policy>(`/api/policies/${id}`, patch)
}

/** List sections for a policy. */
export async function getPolicySections(policyId: string | number): Promise<PolicySection[]> {
    return get<PolicySection[]>(`/api/policies/${policyId}/sections`)
}

/** Create a new section for a policy. */
export async function createPolicySection(
    policyId: string | number,
    input: CreatePolicySectionInput
): Promise<PolicySection> {
    return post<PolicySection>(`/api/policies/${policyId}/sections`, input)
}

/** Fetch a single section detail for a policy. */
export async function getPolicySectionDetails(
    policyId: string | number,
    sectionId: string | number
): Promise<PolicySection> {
    return get<PolicySection>(`/api/policies/${policyId}/sections/${sectionId}`)
}

export async function updatePolicySection(
    policyId: string | number,
    sectionId: string | number,
    patch: Partial<PolicySection>,
): Promise<PolicySection> {
    return put<PolicySection>(`/api/policies/${policyId}/sections/${sectionId}`, patch)
}

/** List invoices for a policy. */
export async function getPolicyInvoices(policyId: string | number): Promise<Invoice[]> {
    return get<Invoice[]>(`/api/policies/${policyId}/invoices`)
}

/** List financial transactions for a policy. */
export async function getPolicyTransactions(policyId: string | number): Promise<PolicyTransaction[]> {
    return get<PolicyTransaction[]>(`/api/policies/${policyId}/transactions`)
}

export async function getPolicySectionTransaction(
    policyId: string | number,
    transactionId: string | number,
    sectionId: string | number,
): Promise<PolicySectionTransactionDetail> {
    return get<PolicySectionTransactionDetail>(
        `/api/policies/${policyId}/transactions/${transactionId}/sections/${sectionId}`,
    )
}

/** Fetch audit trail for a policy. */
export async function getPolicyAudit(policyId: string | number): Promise<AuditEvent[]> {
    return get<AuditEvent[]>(`/api/policies/${policyId}/audit`)
}

/** Post an audit event for a policy (e.g. "Policy Opened", "Policy Closed"). */
export async function postPolicyAudit(
    policyId: string | number,
    event: { action: string; entityType: string; entityId: number; performedBy?: string }
): Promise<void> {
    const action = event.action ?? ''
    let description = 'Record activity logged.'
    if (/opened/i.test(action)) description = 'Opened record.'
    else if (/closed/i.test(action)) description = 'Viewed record, no changes made.'
    else if (/created.*endorsement/i.test(action)) description = 'Created endorsement.'
    else if (/issue.*endorsement/i.test(action)) description = 'Issued endorsement.'

    return post<void>(`/api/policies/${policyId}/audit`, {
        event_type: action,
        description,
    })
}

/** List endorsements for a policy. */
export async function getPolicyEndorsements(policyId: string | number): Promise<PolicyTransaction[]> {
    return get<PolicyTransaction[]>(`/api/policies/${policyId}/endorsements`)
}

/** Create a new endorsement on a policy. */
export async function createEndorsement(
    policyId: string | number,
    input: CreateEndorsementInput
): Promise<PolicyTransaction> {
    return post<PolicyTransaction>(`/api/policies/${policyId}/endorsements`, {
        endorsement_type: input.transactionType,
        endorsement_sub_type: input.transactionSubType,
        effective_date: input.effectiveDate,
        description: input.description,
    })
}

/** Issue (finalise) an endorsement, transitioning it to Endorsed status. */
export async function issueEndorsement(
    policyId: string | number,
    endorsementId: string | number
): Promise<{ policy: Policy; endorsement: PolicyTransaction }> {
    return put<{ policy: Policy; endorsement: PolicyTransaction }>(
        `/api/policies/${policyId}/endorsements/${endorsementId}/issue`,
        {}
    )
}

/** Fetch section coverages for a policy (used by PolicyCoverageDetailPage). */
export async function getPolicyCoverages(
    policyId: string | number,
    sectionId: string | number
): Promise<PolicyCoverage[]> {
    return get<PolicyCoverage[]>(`/api/policies/${policyId}/sections/${sectionId}/coverages`)
}

export async function getPolicyCoverageDetails(
    policyId: string | number,
    sectionId: string | number,
    coverageId: string | number,
): Promise<PolicyCoverageDetail[]> {
    return get<PolicyCoverageDetail[]>(`/api/policies/${policyId}/sections/${sectionId}/coverages/${coverageId}/details`)
}

export async function createPolicyCoverageDetail(
    policyId: string | number,
    sectionId: string | number,
    coverageId: string | number,
    input: CreatePolicyCoverageDetailInput,
): Promise<PolicyCoverageDetail> {
    return post<PolicyCoverageDetail>(`/api/policies/${policyId}/sections/${sectionId}/coverages/${coverageId}/details`, input)
}

export async function updatePolicyCoverageDetail(
    policyId: string | number,
    sectionId: string | number,
    coverageId: string | number,
    detailId: string | number,
    patch: CreatePolicyCoverageDetailInput,
): Promise<PolicyCoverageDetail> {
    return put<PolicyCoverageDetail>(`/api/policies/${policyId}/sections/${sectionId}/coverages/${coverageId}/details/${detailId}`, patch)
}

export async function deletePolicyCoverageDetail(
    policyId: string | number,
    sectionId: string | number,
    coverageId: string | number,
    detailId: string | number,
): Promise<void> {
    return del<void>(`/api/policies/${policyId}/sections/${sectionId}/coverages/${coverageId}/details/${detailId}`)
}

/** Fetch location/detail rows for a policy (used by coverage detail pages). */
export async function getPolicyLocations(policyId: string | number): Promise<LocationRow[]> {
    return get<LocationRow[]>(`/api/policies/${policyId}/locations`)
}

export async function getClassesOfBusiness(): Promise<string[]> {
    const rows = await get<LookupOption[]>('/api/lookups/classesOfBusiness')
    return normaliseLookupValues(rows)
}

export async function getCurrencies(): Promise<string[]> {
    const rows = await get<LookupOption[]>('/api/lookups/currencies')
    return normaliseLookupValues(rows)
}

export async function getLossQualifiers(): Promise<string[]> {
    const rows = await get<LookupOption[]>('/api/lookups/lossQualifiers')
    return normaliseLookupValues(rows)
}
