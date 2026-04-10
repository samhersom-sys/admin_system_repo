/**
 * Quotes Domain
 *
 * Owns the lifecycle management of quote records.
 * Provides: types, pure helpers, and API adapter functions.
 *
 * Requirements: domains/quotes/components/quotes.requirements.md
 */

import { post, get, put, del } from '@/shared/lib/api-client/api-client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuoteStatus = 'Draft' | 'Quoted' | 'Bound' | 'Declined'

export interface Quote {
    id: number
    reference: string
    submission_id?: number | null
    insured: string
    insured_id?: string | null
    status: QuoteStatus
    business_type?: string | null
    inception_date?: string | null
    expiry_date?: string | null
    inception_time?: string | null
    expiry_time?: string | null
    quote_currency: string
    created_date: string
    created_by?: string | null
    created_by_org_code: string
    // Block 2 header fields
    year_of_account?: string | null
    lta_applicable?: boolean | null
    lta_start_date?: string | null
    lta_start_time?: string | null
    lta_expiry_date?: string | null
    lta_expiry_time?: string | null
    contract_type?: string | null
    method_of_placement?: string | null
    unique_market_reference?: string | null
    renewable_indicator?: string | null
    renewal_date?: string | null
    renewal_status?: string | null
    payload?: Record<string, unknown>
}

export interface CreateQuoteInput {
    insured: string
    insured_id?: number
    submission_id?: number | null
    business_type?: string
    inception_date?: string
    expiry_date?: string
    inception_time?: string
    expiry_time?: string
    quote_currency?: string
    created_by?: string
    year_of_account?: string
    lta_applicable?: boolean
    lta_start_date?: string
    lta_start_time?: string
    lta_expiry_date?: string
    lta_expiry_time?: string
    contract_type?: string
    method_of_placement?: string
    unique_market_reference?: string
    renewable_indicator?: string
    renewal_date?: string
    renewal_status?: string
}

export type QuotePatch = Omit<
    Partial<Quote>,
    | 'id'
    | 'reference'
    | 'status'
    | 'created_date'
    | 'created_by'
    | 'created_by_org_code'
>

export interface QuoteFilters {
    submission_id?: number
    status?: QuoteStatus
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Build a quote reference in the format QUO-{ORGCODE}-{YYYYMMDD}-{NNN}.
 * Reference generation is enforced server-side; this helper is for display/preview only.
 */
export function buildQuoteReference(orgCode: string, isoDate: string, sequence: number): string {
    const datePart = isoDate.replace(/-/g, '')
    const seqPart = String(sequence).padStart(3, '0')
    return `QUO-${orgCode.toUpperCase()}-${datePart}-${seqPart}`
}

/**
 * Return the default expiry date for a new quote: inception + 365 days.
 */
export function defaultQuoteExpiry(inceptionDate: string): string {
    const d = new Date(inceptionDate)
    d.setDate(d.getDate() + 365)
    return d.toISOString().slice(0, 10)
}

/**
 * Returns true if the quote is in an editable state.
 * Per REQ-QUO-FE-F-018: only Draft quotes are editable.
 */
export function isQuoteEditable(status: QuoteStatus): boolean {
    return status === 'Draft'
}

// ---------------------------------------------------------------------------
// API adapters
// ---------------------------------------------------------------------------

/** List quotes with optional filters. */
export async function listQuotes(filters?: QuoteFilters): Promise<Quote[]> {
    const params = new URLSearchParams()
    if (filters?.submission_id) params.set('submission_id', String(filters.submission_id))
    if (filters?.status) params.set('status', filters.status)
    const qs = params.toString()
    return get<Quote[]>(`/api/quotes${qs ? `?${qs}` : ''}`)
}

/** Create a new quote. */
export async function createQuote(input: CreateQuoteInput): Promise<Quote> {
    return post<Quote>('/api/quotes', input)
}

/** Fetch a single quote by numeric ID. */
export async function getQuote(id: number): Promise<Quote> {
    return get<Quote>(`/api/quotes/${id}`)
}

/** Update mutable fields on a quote. */
export async function updateQuote(id: number, patch: QuotePatch): Promise<Quote> {
    return put<Quote>(`/api/quotes/${id}`, patch)
}

/** Transition a Draft quote to Quoted status. */
export async function markQuoteAsQuoted(id: number): Promise<Quote> {
    return post<Quote>(`/api/quotes/${id}/quote`, {})
}

/** Transition a Quoted quote to Bound status. */
export async function bindQuote(id: number): Promise<Quote> {
    return post<Quote>(`/api/quotes/${id}/bind`, {})
}

/** Transition a quote to Declined status. */
export async function declineQuote(
    id: number,
    reasonCode: string,
    reasonText?: string
): Promise<Quote> {
    return post<Quote>(`/api/quotes/${id}/decline`, { reasonCode, reasonText })
}

/** Soft-delete a Draft quote. */
export async function deleteQuote(id: number): Promise<void> {
    return del<void>(`/api/quotes/${id}`)
}

/** Create a Draft copy of a quote with a new auto-generated reference. */
export async function copyQuote(id: number): Promise<Quote> {
    return post<Quote>(`/api/quotes/${id}/copy`, {})
}

// ---------------------------------------------------------------------------
// Quote Sections
// ---------------------------------------------------------------------------

export interface QuoteSection {
    id: number
    quote_id: number
    reference: string
    class_of_business: string | null
    inception_date: string | null
    expiry_date: string | null
    inception_time: string | null
    expiry_time: string | null
    limit_currency: string | null
    limit_amount: number | null
    limit_loss_qualifier: string | null
    excess_currency: string | null
    excess_amount: number | null
    excess_loss_qualifier: string | null
    sum_insured_currency: string | null
    sum_insured_amount: number | null
    premium_currency: string | null
    gross_premium: number | null
    gross_gross_premium: number | null
    deductions: number | null
    net_premium: number | null
    annual_gross_premium: number | null
    annual_net_premium: number | null
    written_order: number | null
    signed_order: number | null
    payload: Record<string, unknown> | null
    is_current: boolean
    created_at: string
}

export interface QuoteSectionPatch {
    class_of_business?: string
    inception_date?: string
    expiry_date?: string
    inception_time?: string
    expiry_time?: string
    limit_currency?: string
    limit_amount?: number | null
    limit_loss_qualifier?: string
    excess_currency?: string
    excess_amount?: number | null
    excess_loss_qualifier?: string
    sum_insured_currency?: string
    sum_insured_amount?: number | null
    premium_currency?: string
    gross_premium?: number | null
    annual_gross_premium?: number | null
    annual_net_premium?: number | null
    written_order?: number | null
    signed_order?: number | null
    payload?: Record<string, unknown>
}

export interface CreateSectionInput {
    class_of_business?: string
    inception_date?: string
    expiry_date?: string
    limit_currency?: string
    limit_amount?: number
    premium_currency?: string
    gross_premium?: number
}

/** List all non-deleted sections for a quote. */
export async function listSections(quoteId: number): Promise<QuoteSection[]> {
    return get<QuoteSection[]>(`/api/quotes/${quoteId}/sections`)
}

/** Create a new section for a quote. */
export async function createSection(quoteId: number, input: CreateSectionInput): Promise<QuoteSection> {
    return post<QuoteSection>(`/api/quotes/${quoteId}/sections`, input)
}

/** Update mutable fields on a section. */
export async function updateSection(quoteId: number, sectionId: number, patch: QuoteSectionPatch): Promise<QuoteSection> {
    return put<QuoteSection>(`/api/quotes/${quoteId}/sections/${sectionId}`, patch)
}

/** Soft-delete a section. */
export async function deleteSection(quoteId: number, sectionId: number): Promise<void> {
    return del<void>(`/api/quotes/${quoteId}/sections/${sectionId}`)
}

// ---------------------------------------------------------------------------
// Coverages
// ---------------------------------------------------------------------------

export interface Coverage {
    id: number
    section_id: number
    reference: string
    coverage: string | null
    effective_date: string | null
    expiry_date: string | null
    annual_gross_premium: number | null
    annual_net_premium: number | null
    limit_currency: string | null
    limit_amount: number | null
}

export interface CreateCoverageInput {
    coverage?: string
    effective_date?: string
    expiry_date?: string
    annual_gross_premium?: number
    annual_net_premium?: number
    limit_currency?: string
    limit_amount?: number
}

export async function listCoverages(quoteId: number, sectionId: number): Promise<Coverage[]> {
    return get<Coverage[]>(`/api/quotes/${quoteId}/sections/${sectionId}/coverages`)
}

export async function createCoverage(quoteId: number, sectionId: number, input: CreateCoverageInput): Promise<Coverage> {
    return post<Coverage>(`/api/quotes/${quoteId}/sections/${sectionId}/coverages`, input)
}

export async function deleteCoverage(quoteId: number, sectionId: number, coverageId: number): Promise<void> {
    return del<void>(`/api/quotes/${quoteId}/sections/${sectionId}/coverages/${coverageId}`)
}

// ---------------------------------------------------------------------------
// Participations
// ---------------------------------------------------------------------------

export interface Participation {
    id?: number
    section_id: number
    market_name: string | null
    written_line: number | null
    signed_line: number | null
    role: string | null
    reference: string | null
    notes: string | null
}

export async function listParticipations(sectionId: number): Promise<Participation[]> {
    return get<Participation[]>(`/api/quote-sections/${sectionId}/participations`)
}

export async function saveParticipations(sectionId: number, participations: Omit<Participation, 'id' | 'section_id'>[]): Promise<Participation[]> {
    return post<Participation[]>(`/api/quote-sections/${sectionId}/participations`, { participations })
}

// ---------------------------------------------------------------------------
// Lookup adapters
// ---------------------------------------------------------------------------

export async function getContractTypes(): Promise<string[]> {
    return get<string[]>('/api/lookups/contractTypes')
}

export async function getMethodsOfPlacement(): Promise<string[]> {
    return get<string[]>('/api/lookups/methodsOfPlacement')
}

export async function getRenewalStatuses(): Promise<string[]> {
    return get<string[]>('/api/lookups/renewalStatuses')
}

export async function getRiskCodes(): Promise<string[]> {
    return get<string[]>('/api/lookups/riskCodes')
}

// ---------------------------------------------------------------------------
// Issue Policy (REQ-POL-FE-F-019)
// ---------------------------------------------------------------------------

/** Issue a policy from a Bound quote. Returns the created policy record. */
export async function issuePolicy(quoteId: number): Promise<{ id: number; reference: string; status: string }> {
    return post<{ id: number; reference: string; status: string }>(`/api/quotes/${quoteId}/issue-policy`, {})
}

// ---------------------------------------------------------------------------
// Location data — used by coverage detail pages (REQ-QUO-FE-F-062)
// ---------------------------------------------------------------------------

export interface LocationRow {
    CoverageType: string
    CoverageSubType: string
    Currency: string
    SumInsured: number
}

/** Fetch location/detail rows for a quote (used by QuoteCoverageDetailPage). */
export async function getQuoteLocations(quoteId: number): Promise<LocationRow[]> {
    return get<LocationRow[]>(`/api/quotes/${quoteId}/locations`)
}
