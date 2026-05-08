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
    class_of_business_code?: string | null
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
    class_of_business_code?: string | null
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

export interface BATransactionDetails {
    coverholder?: string | null
    coverholder_id?: number | null
    year_of_account?: number | null
    inception_date?: string | null
    expiry_date?: string | null
    sections?: BASection[]
}

/** Transaction status lifecycle: Draft → Bound → Issued. Active/Endorsed kept for backward compatibility with existing records. */
export type BATransactionStatus = 'Draft' | 'Issued' | 'Active' | 'Bound' | 'Endorsed'

export interface BATransaction {
    id: number
    binding_authority_id: number
    type?: string | null
    sub_type?: string | null
    status?: BATransactionStatus | null
    sequence_number?: number | null
    effective_date?: string | null
    description?: string | null
    created_by?: string | null
    created_at?: string | null
    details?: BATransactionDetails | null
}

export interface CreateBATransactionInput {
    type?: string | null
    sub_type?: string | null
    effective_date?: string | null
    description?: string | null
    status?: string | null
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

export interface ClassOfBusiness {
    code: string
    name: string
}

export async function getClassesOfBusiness(): Promise<ClassOfBusiness[]> {
    return get<ClassOfBusiness[]>('/api/lookups/classesOfBusiness')
}

export async function getCurrencies(): Promise<string[]> {
    return get<string[]>('/api/lookups/currencies')
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

// ---------------------------------------------------------------------------
// API — Bordereau Configs
// ---------------------------------------------------------------------------

export interface BordereauConfigAPI {
    id: number
    config_id: string
    binding_authority_id: number
    name: string
    type: string
    data_style: string
    fields: string[]
    created_at: string
}

export async function getBordereauConfigs(baId: number): Promise<BordereauConfigAPI[]> {
    return get<BordereauConfigAPI[]>(`/api/binding-authorities/${baId}/bordereau-configs`)
}

export async function createBordereauConfig(
    baId: number,
    config: Pick<BordereauConfigAPI, 'config_id' | 'name' | 'type' | 'data_style' | 'fields'>
): Promise<BordereauConfigAPI> {
    return post<BordereauConfigAPI>(`/api/binding-authorities/${baId}/bordereau-configs`, config)
}

export async function updateBordereauConfig(
    baId: number,
    configId: string,
    patch: Partial<Pick<BordereauConfigAPI, 'name' | 'type' | 'data_style' | 'fields'>>
): Promise<BordereauConfigAPI> {
    return put<BordereauConfigAPI>(`/api/binding-authorities/${baId}/bordereau-configs/${encodeURIComponent(configId)}`, patch)
}

export async function deleteBordereauConfig(baId: number, configId: string): Promise<void> {
    await del(`/api/binding-authorities/${baId}/bordereau-configs/${encodeURIComponent(configId)}`)
}

// ---------------------------------------------------------------------------
// API — Coverholder Search (local proxy to avoid cross-domain import)
// ---------------------------------------------------------------------------

export interface CoverholderParty {
    id: number
    name: string
    type: string
    orgCode: string
    reference?: string
    email?: string
    phone?: string
    city?: string
    [key: string]: unknown
}

export async function listCoverholders(filters?: { type?: string; search?: string }): Promise<CoverholderParty[]> {
    const qs = new URLSearchParams()
    if (filters?.type) qs.set('type', filters.type)
    if (filters?.search) qs.set('search', filters.search)
    const query = qs.toString()
    const url = query ? `/api/parties?${query}` : '/api/parties'
    return get<CoverholderParty[]>(url)
}

export async function getCoverholderParty(id: number): Promise<CoverholderParty> {
    return get<CoverholderParty>(`/api/parties/${id}`)
}
