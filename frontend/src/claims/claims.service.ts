/**
 * Claims Domain — Service Layer
 *
 * Provides: types, API adapter functions.
 *
 * REQ-CLM-FE-S-001 — exports all required API functions
 */

import { get, post, put } from '@/shared/lib/api-client/api-client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ClaimStatus = 'Open' | 'In Progress' | 'Closed' | 'Declined'

export interface Claim {
    id: number
    claimNumber: string
    reference: string
    policyId: number
    policyReference?: string | null
    insured?: string | null
    status: ClaimStatus
    lossDate?: string | null
    reportedDate?: string | null
    description?: string | null
    payload?: {
        lossType?: string | null
        claimantName?: string | null
        claimantContact?: string | null
    }
    createdAt?: string | null
}

export interface ClaimTransaction {
    id: number
    claimId: number
    type: string
    amount: number
    description?: string | null
    date?: string | null
    createdBy?: string | null
    createdAt?: string | null
}

export interface AuditEvent {
    id: number
    entityType: string
    entityId: number
    action: string
    createdBy?: string | null
    createdAt?: string | null
}

export interface CreateClaimInput {
    policyId: number
    description?: string
    lossDate?: string
    reportedDate?: string
    lossType?: string
    claimantName?: string
    claimantContact?: string
}

// ---------------------------------------------------------------------------
// API adapters
// ---------------------------------------------------------------------------

export const getClaims = (): Promise<Claim[]> =>
    get<Claim[]>('/api/claims')

export const getClaim = (id: number): Promise<Claim> =>
    get<Claim>(`/api/claims/${id}`)

export const createClaim = (body: CreateClaimInput): Promise<Claim> =>
    post<Claim>('/api/claims', body)

export const updateClaim = (id: number, body: Partial<Claim>): Promise<Claim> =>
    put<Claim>(`/api/claims/${id}`, body)

export const getClaimTransactions = (id: number): Promise<ClaimTransaction[]> =>
    get<ClaimTransaction[]>(`/api/claims/${id}/transactions`)

export const addClaimTransaction = (id: number, body: Omit<ClaimTransaction, 'id' | 'claimId' | 'createdAt'>): Promise<ClaimTransaction> =>
    post<ClaimTransaction>(`/api/claims/${id}/transactions`, body)

export const getClaimAudit = (id: number): Promise<AuditEvent[]> =>
    get<AuditEvent[]>(`/api/claims/${id}/audit`)

export const postClaimAudit = (id: number, action: string): Promise<void> =>
    post<void>(`/api/claims/${id}/audit`, { action })
