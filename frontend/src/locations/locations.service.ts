/**
 * Locations Schedule Service — frontend API adapter
 *
 * REQ-LOC-FE-S-001 — exports all required API functions
 */

import { get, post, put } from '@/shared/lib/api-client/api-client'

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
