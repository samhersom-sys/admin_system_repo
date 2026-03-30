/**
 * Parties Domain
 *
 * Owns all data about external organisations and individuals:
 * insureds, brokers, insurers, coverholders, syndicates.
 *
 * Requirements: parties.requirements.md
 */

import { get, post } from '@/shared/lib/api-client/api-client'

// ---------------------------------------------------------------------------
// Types (R01)
// ---------------------------------------------------------------------------

export interface Party {
    id: number
    name: string
    type: string
    orgCode: string
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
