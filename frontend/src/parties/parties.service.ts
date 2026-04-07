/**
 * Parties Domain
 *
 * Owns all data about external organisations and individuals:
 * insureds, brokers, insurers, coverholders, syndicates.
 *
 * Requirements: parties.requirements.md
 */

import { get, post, put, del } from '@/shared/lib/api-client/api-client'

// ---------------------------------------------------------------------------
// Types (R01)
// ---------------------------------------------------------------------------

export interface Party {
    id: number
    name: string
    type: string
    orgCode: string
    reference?: string
    email?: string
    phone?: string
    addressLine1?: string
    addressLine2?: string
    addressLine3?: string
    city?: string
    state?: string
    postcode?: string
    country?: string
    region?: string
    wageRoll?: number | string
    numberEmployees?: number | string
    annualRevenue?: number | string
    sicStandard?: string
    sicCode?: string
    sicDescription?: string
    createdBy?: string
    createdDate?: string
    [key: string]: unknown
}

export interface CreatePartyInput {
    name: string
    type: string
    orgCode: string
    createdBy: string
    email?: string
    phone?: string
    addressLine1?: string
    addressLine2?: string
    addressLine3?: string
    city?: string
    state?: string
    postcode?: string
    country?: string
}

export interface PartyFilters {
    type?: string
    search?: string
    orgCode?: string
}

export interface PartyEntity {
    id: number
    party_id: number
    name: string
    entity_type: string
    entity_code?: string
    reference?: string
    notes?: string
}

export interface AuditEvent {
    id: number
    action: string
    user?: string
    date: string
    details?: string | null
    changes?: Record<string, { old: string; new: string }> | null
}

// ---------------------------------------------------------------------------
// API adapters (R02, R03)
// ---------------------------------------------------------------------------

/**
 * R02 — List parties with optional filters.
 */
export async function listParties(filters?: PartyFilters): Promise<Party[]> {
    const qs = new URLSearchParams()
    if (filters?.type) qs.set('type', filters.type)
    if (filters?.search) qs.set('search', filters.search)
    if (filters?.orgCode) qs.set('orgCode', filters.orgCode)
    const query = qs.toString()
    const url = query ? `/api/parties?${query}` : '/api/parties'
    return get<Party[]>(url)
}

/**
 * R03 — Create a new party record.
 */
export async function createParty(input: CreatePartyInput): Promise<Party> {
    return post<Party>('/api/parties', input)
}

// ---------------------------------------------------------------------------
// PartyViewPage adapters (F-020 .. F-041)
// ---------------------------------------------------------------------------

/** F-020 — Fetch a single party by ID. */
export async function getParty(id: string | number): Promise<Party> {
    return get<Party>(`/api/parties/${id}`)
}

/** F-032 — Update mutable fields on a party. */
export async function updateParty(id: string | number, patch: Partial<Party>): Promise<Party> {
    return put<Party>(`/api/parties/${id}`, patch)
}

/** F-033 — List entities for a party. */
export async function getPartyEntities(partyId: string | number): Promise<PartyEntity[]> {
    return get<PartyEntity[]>(`/api/parties/${partyId}/entities`)
}

/** F-034 — Create a new entity on a party. */
export async function createPartyEntity(
    partyId: string | number,
    input: Partial<PartyEntity>
): Promise<PartyEntity> {
    return post<PartyEntity>(`/api/parties/${partyId}/entities`, input)
}

/** F-035 — Update an entity on a party. */
export async function updatePartyEntity(
    partyId: string | number,
    entityId: string | number,
    patch: Partial<PartyEntity>
): Promise<PartyEntity> {
    return put<PartyEntity>(`/api/parties/${partyId}/entities/${entityId}`, patch)
}

/** F-036 — Delete an entity from a party. */
export async function deletePartyEntity(
    partyId: string | number,
    entityId: string | number
): Promise<void> {
    return del<void>(`/api/parties/${partyId}/entities/${entityId}`)
}

/** F-037 — Fetch audit trail for a party. */
export async function getPartyAudit(partyId: string | number): Promise<AuditEvent[]> {
    return get<AuditEvent[]>(`/api/parties/${partyId}/audit`)
}

/** F-038 — Post an audit event for a party. */
export async function postPartyAudit(
    partyId: string | number,
    event: { action: string; entityType: string; entityId: number; performedBy?: string }
): Promise<void> {
    return post<void>(`/api/parties/${partyId}/audit`, event)
}

/** F-039 — Fetch submissions related to a party. */
export async function getPartySubmissions(partyId: string | number): Promise<unknown[]> {
    return get<unknown[]>(`/api/parties/${partyId}/submissions`)
}

/** F-040 — Fetch quotes related to a party. */
export async function getPartyQuotes(partyId: string | number): Promise<unknown[]> {
    return get<unknown[]>(`/api/parties/${partyId}/quotes`)
}
