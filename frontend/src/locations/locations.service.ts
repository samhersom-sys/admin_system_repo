/**
 * Locations Schedule Service — frontend API adapter
 *
 * REQ-LOC-FE-S-001 — exports all required API functions
 */

import { del, get, post, put } from '@/shared/lib/api-client/api-client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LocationsImport {
    id: number
    import_id: number
    versionNumber: number
    payload: { rows: LocationRow[] } | null
    createdBy: string | null
    createdAt: string | null
    isActive: boolean
}

export interface LocationRow {
    id?: number
    [key: string]: unknown
}

export interface LocationVersion {
    id: number
    versionNumber: number
    createdBy: string | null
    createdAt: string | null
    isActive: boolean
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export const getLocationsImports = (entityType: string, entityId: number): Promise<LocationsImport[]> =>
    get<LocationsImport[]>(`/api/locations-schedule/imports?entityType=${entityType}&entityId=${entityId}`)

export const importLocationsCsv = (entityType: string, entityId: number, rows: LocationRow[]): Promise<LocationsImport> =>
    post<LocationsImport>('/api/locations-schedule/import', { entityType, entityId, rows })

export const updateLocationsImport = (importId: number, body: Record<string, unknown>): Promise<LocationsImport> =>
    put<LocationsImport>(`/api/locations-schedule/imports/${importId}`, body)

export const getLocationVersions = (importId: number): Promise<LocationVersion[]> =>
    get<LocationVersion[]>(`/api/locations-schedule/imports/${importId}/versions`)

export const revertToVersion = (importId: number, versionNumber: number): Promise<LocationsImport> =>
    post<LocationsImport>(`/api/locations-schedule/imports/${importId}/revert/${versionNumber}`, {})

export const getHistoricalLocations = (importId: number): Promise<LocationsImport[]> =>
    get<LocationsImport[]>(`/api/locations-schedule/imports/${importId}/historical`)

// ---------------------------------------------------------------------------
// Block 2 — normalised CRUD types
// ---------------------------------------------------------------------------

export interface LocationRecord {
    id: number
    quote_id: number
    org_code: string
    asset_type?: string | null
    location_name: string | null
    address_line1: string | null
    address_line2: string | null
    city: string | null
    state_province: string | null
    country: string | null
    postcode: string | null
    created_at: string | null
    updated_at: string | null
}

export interface LocationCoverageRecord {
    id: number
    location_id: number
    quote_id: number
    section_id: number | null
    coverage_type: string | null
    coverage_sub_type: string | null
    currency: string | null
    sum_insured: number | null
    rating_schedule_id: number | null
    rate_percent: number | null
    annual_risk_gross_premium: number | null
    created_at: string | null
    updated_at: string | null
}

export interface QuoteLocationRow extends LocationRecord {
    coverage_id: number | null
    section_id: number | null
    coverage_type: string | null
    coverage_sub_type: string | null
    currency: string | null
    sum_insured_currency?: string | null
    premium_currency?: string | null
    sum_insured: number | null
    sum_insured_movement?: number | null
    rating_schedule_id: number | null
    rate_percent: number | null
    annual_risk_gross_premium: number | null
    annual_risk_gross_premium_movement?: number | null
}

// ---------------------------------------------------------------------------
// Block 2 — CRUD API functions (REQ-LOC-FE-F-016 to F-019)
// ---------------------------------------------------------------------------

export const getQuoteLocationRows = (quoteId: number): Promise<QuoteLocationRow[]> =>
    get<QuoteLocationRow[]>(`/api/quotes/${quoteId}/locations`)

export const addLocation = (quoteId: number, body: Partial<LocationRecord>): Promise<LocationRecord> =>
    post<LocationRecord>(`/api/locations-schedule/quotes/${quoteId}/locations/rows`, body)

export const updateLocation = (quoteId: number, locationId: number, body: Partial<LocationRecord>): Promise<LocationRecord> =>
    put<LocationRecord>(`/api/locations-schedule/quotes/${quoteId}/locations/rows/${locationId}`, body)

export const deleteLocation = (quoteId: number, locationId: number): Promise<void> =>
    del<void>(`/api/locations-schedule/quotes/${quoteId}/locations/rows/${locationId}`)

export const addCoverage = (quoteId: number, locationId: number, body: Partial<LocationCoverageRecord>): Promise<LocationCoverageRecord> =>
    post<LocationCoverageRecord>(`/api/locations-schedule/quotes/${quoteId}/locations/rows/${locationId}/coverages`, body)

export const updateCoverage = (quoteId: number, locationId: number, coverageId: number, body: Partial<LocationCoverageRecord>): Promise<LocationCoverageRecord> =>
    put<LocationCoverageRecord>(`/api/locations-schedule/quotes/${quoteId}/locations/rows/${locationId}/coverages/${coverageId}`, body)

export const deleteCoverage = (quoteId: number, locationId: number, coverageId: number): Promise<void> =>
    del<void>(`/api/locations-schedule/quotes/${quoteId}/locations/rows/${locationId}/coverages/${coverageId}`)

export const saveLocationVersion = (quoteId: number): Promise<{ id: number }> =>
    post<{ id: number }>(`/api/locations-schedule/imports/${quoteId}/save-version`, {})

export const calculateLocation = (locationCoverageId: number, ratingScheduleId: number): Promise<{ rate_percent: number; annual_risk_gross_premium: number }> =>
    post<{ rate_percent: number; annual_risk_gross_premium: number }>('/api/rating/calculate-location', { locationCoverageId, ratingScheduleId })

export const calculateQuote = (quoteId: number): Promise<{ updated: number }> =>
    post<{ updated: number }>('/api/rating/calculate-quote', { quoteId })

