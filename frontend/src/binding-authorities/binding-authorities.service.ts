/**
 * Binding Authorities Domain — Service Layer
 *
 * Requirements: frontend/src/binding-authorities/binding-authorities.requirements.md
 * REQ-BA-FE-C-001 — all API calls via @/shared/lib/api-client/api-client
 */

import { get, post, put, del } from '@/shared/lib/api-client/api-client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BAStatus = 'Draft' | 'Active' | 'Bound' | 'Expired' | 'Cancelled'

export interface BindingAuthority {
    id: number
    reference: string
    coverholder?: string | null
    coverholder_id?: number | null
    status: BAStatus
    inception_date?: string | null
    expiry_date?: string | null
    year_of_account?: number | null
    submission_id?: number | null
    submission_reference?: string | null
    multi_year?: boolean
    renewal_of_id?: number | null
    created_at?: string | null
    updated_at?: string | null
}

export interface CreateBAInput {
    coverholder_id: number
    inception_date: string
    expiry_date: string
    year_of_account?: number | null
}

export interface BASection {
    id: number
    binding_authority_id: number
    reference: string
    class_of_business?: string | null
    time_basis?: string | null
    inception_date?: string | null
    expiry_date?: string | null
    days_on_cover?: number | null
    line_size?: number | null
    written_premium_limit?: number | null
    currency?: string | null
}

export interface CreateBASectionInput {
    class_of_business?: string | null
    time_basis?: string | null
    inception_date?: string | null
    expiry_date?: string | null
    line_size?: number | null
    written_premium_limit?: number | null
    currency?: string | null
}

export interface Participation {
    id: number
    section_id: number
    syndicate?: string | null
    share_percent: number
}

export interface BATransaction {
    id: number
    binding_authority_id: number
    type?: string | null
    amount?: number | null
    currency?: string | null
    date?: string | null
    description?: string | null
}

export interface CreateBATransactionInput {
    type?: string | null
    amount?: number | null
    currency?: string | null
    date?: string | null
    description?: string | null
}

// ---------------------------------------------------------------------------
// API — Binding Authorities
// ---------------------------------------------------------------------------

export async function getBindingAuthorities(search?: string): Promise<BindingAuthority[]> {
    const url = search
        ? `/api/binding-authorities?search=${encodeURIComponent(search)}`
        : '/api/binding-authorities'
    return get<BindingAuthority[]>(url)
}

export async function getBindingAuthority(id: number): Promise<BindingAuthority> {
    return get<BindingAuthority>(`/api/binding-authorities/${id}`)
}

export async function createBindingAuthority(input: CreateBAInput): Promise<BindingAuthority> {
    return post<BindingAuthority>('/api/binding-authorities', input)
}

export async function updateBindingAuthority(
    id: number,
    patch: Partial<BindingAuthority>
): Promise<BindingAuthority> {
    return put<BindingAuthority>(`/api/binding-authorities/${id}`, patch)
}

// ---------------------------------------------------------------------------
// API — Sections
// ---------------------------------------------------------------------------

export async function getBASections(baId: number): Promise<BASection[]> {
    return get<BASection[]>(`/api/binding-authorities/${baId}/sections`)
}

export async function createBASection(
    baId: number,
    input: CreateBASectionInput
): Promise<BASection> {
    return post<BASection>(`/api/binding-authorities/${baId}/sections`, input)
}

export async function updateBASection(
    sectionId: number,
    patch: Partial<BASection>
): Promise<BASection> {
    return put<BASection>(`/api/binding-authority-sections/${sectionId}`, patch)
}

export async function deleteBASection(sectionId: number): Promise<void> {
    await del(`/api/binding-authority-sections/${sectionId}`)
}

// ---------------------------------------------------------------------------
// API — Participations
// ---------------------------------------------------------------------------

export async function getParticipations(sectionId: number): Promise<Participation[]> {
    return get<Participation[]>(`/api/binding-authority-sections/${sectionId}/participations`)
}

export async function saveParticipations(
    sectionId: number,
    participations: Omit<Participation, 'id' | 'section_id'>[]
): Promise<Participation[]> {
    return post<Participation[]>(
        `/api/binding-authority-sections/${sectionId}/participations`,
        participations
    )
}

// ---------------------------------------------------------------------------
// API — Authorized Risk Codes
// ---------------------------------------------------------------------------

export async function getAuthorizedRiskCodes(sectionId: number): Promise<string[]> {
    return get<string[]>(`/api/binding-authority-sections/${sectionId}/authorized-risk-codes`)
}

export async function addAuthorizedRiskCode(sectionId: number, code: string): Promise<void> {
    await post(`/api/binding-authority-sections/${sectionId}/authorized-risk-codes`, { code })
}

export async function removeAuthorizedRiskCode(sectionId: number, code: string): Promise<void> {
    await del(`/api/binding-authority-sections/${sectionId}/authorized-risk-codes/${encodeURIComponent(code)}`)
}

// ---------------------------------------------------------------------------
// API — Transactions
// ---------------------------------------------------------------------------

export async function getBATransactions(baId: number): Promise<BATransaction[]> {
    return get<BATransaction[]>(`/api/binding-authorities/${baId}/transactions`)
}

export async function createBATransaction(
    baId: number,
    input: CreateBATransactionInput
): Promise<BATransaction> {
    return post<BATransaction>(`/api/binding-authorities/${baId}/transactions`, input)
}

export async function updateBATransaction(
    baId: number,
    transactionId: number,
    patch: Partial<BATransaction>
): Promise<BATransaction> {
    return put<BATransaction>(
        `/api/binding-authorities/${baId}/transactions/${transactionId}`,
        patch
    )
}

// ---------------------------------------------------------------------------
// API — Policies under BA
// ---------------------------------------------------------------------------

export async function getPoliciesForBA(baId: number): Promise<unknown[]> {
    return get<unknown[]>(`/api/policies?binding_authority_id=${baId}`)
}
