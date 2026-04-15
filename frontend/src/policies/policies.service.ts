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

import { post, get, put } from '@/shared/lib/api-client/api-client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PolicyStatus = 'Active' | 'Expired' | 'Cancelled' | 'Draft'

export interface Policy {
    id: number
    reference: string
    quote_id?: number | null
    insured: string
    insured_id?: string | null
    placing_broker?: string | null
    class_of_business?: string | null
    inception_date?: string | null
    expiry_date?: string | null
    status: PolicyStatus
    gross_premium?: number | null
    net_premium?: number | null
    policy_currency?: string | null
}

export interface PolicySection {
    id: number
    policy_id: number
    reference: string
    class_of_business?: string | null
    inception_date?: string | null
    expiry_date?: string | null
    limit_currency?: string | null
    limit_amount?: number | null
    limit_loss_qualifier?: string | null
    excess_currency?: string | null
    excess_amount?: number | null
    excess_loss_qualifier?: string | null
    sum_insured_currency?: string | null
    sum_insured_amount?: number | null
    premium_currency?: string | null
    gross_gross_premium?: number | null
    gross_premium?: number | null
    deductions?: number | null
    net_premium?: number | null
    annual_gross?: number | null
    annual_net?: number | null
    written_order?: number | null
    signed_order?: number | null
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

export interface PolicyTransaction {
    id: number
    policy_id: number
    transaction_type: string
    effective_date?: string | null
    description?: string | null
    status: string
    reference?: string | null
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
    effectiveDate: string
    description?: string
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

/** Fetch a single section detail for a policy. */
export async function getPolicySectionDetails(
    policyId: string | number,
    sectionId: string | number
): Promise<PolicySection> {
    return get<PolicySection>(`/api/policies/${policyId}/sections/${sectionId}`)
}

/** List invoices for a policy. */
export async function getPolicyInvoices(policyId: string | number): Promise<Invoice[]> {
    return get<Invoice[]>(`/api/policies/${policyId}/invoices`)
}

/** List financial transactions for a policy. */
export async function getPolicyTransactions(policyId: string | number): Promise<PolicyTransaction[]> {
    return get<PolicyTransaction[]>(`/api/policies/${policyId}/transactions`)
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
    return post<void>(`/api/policies/${policyId}/audit`, event)
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

/** Fetch location/detail rows for a policy (used by coverage detail pages). */
export async function getPolicyLocations(policyId: string | number): Promise<LocationRow[]> {
    return get<LocationRow[]>(`/api/policies/${policyId}/locations`)
}
