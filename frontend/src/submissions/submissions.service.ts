/**
 * Submissions Domain
 *
 * Owns the intake and lifecycle management of insurance submission records.
 * This module provides: types, pure helpers, and API adapter functions.
 *
 * Requirements: submissions.requirements.md
 */

import { post, get, put, del } from '@/shared/lib/api-client/api-client'

// ---------------------------------------------------------------------------
// Types (R01, R02)
// ---------------------------------------------------------------------------

export type SubmissionStatus =
    | 'Created'
    | 'In Review'
    | 'Outstanding'
    | 'Declined'
    | 'Quote Created'
    | 'Quoted'
    | 'Bound'

export interface Submission {
    id: number
    reference: string
    submissionType: string
    insured: string
    insuredId: string
    placingBroker: string
    placingBrokerId: string
    placingBrokerName?: string
    brokerId?: string | number
    contractType: string
    inceptionDate: string
    expiryDate: string
    renewalDate?: string
    status: SubmissionStatus
    createdDate: string
    createdBy: string
    createdByOrgCode: string
    /** The org type (role) of the org that created this submission — used for origin-based field locking (OQ-046) */
    createdByOrgType?: string
    /** Optional current assignment (system-managed — not user-editable) */
    assignment?: string
    /** Server-computed: true when at least one quote exists for this submission */
    hasQuote?: boolean
    /** Server-computed: true when at least one policy exists for this submission */
    hasPolicy?: boolean
}

export interface SubmissionEditLock {
    submissionId: number
    lockedByUserId: number
    lockedByUserName: string
    lockedByUserEmail?: string | null
    acquiredAt?: string
    expiresAt: string
    isHeldByCurrentUser: boolean
}

export interface CreateSubmissionInput {
    /** The linked party record ID for the insured */
    insuredId: string
    /** The display name for the insured */
    insuredName: string
    /** ISO date string, e.g. '2026-03-10' */
    inceptionDate: string
    /** Caller's org code — used for data isolation */
    orgCode: string
    /** Full name of the user creating the record */
    createdBy: string
    /**
     * Reference is generated server-side (§4.9 — backend-first business logic).
     * This field is accepted for backwards compatibility but ignored by the API.
     * @deprecated Pass nothing — the backend generates the reference.
     */
    reference?: string
    /** Optional — defaults to inception + 1 year (enforced server-side) */
    expiryDate?: string
    /** Optional — defaults to inception + 1 year */
    renewalDate?: string
    placingBrokerId?: string
    placingBroker?: string
    contractType?: string
    /** Defaults to 'Submission' */
    submissionType?: string
}

export interface SubmissionFilters {
    status?: SubmissionStatus
    orgCode?: string
}

// The patch type for updateSubmission intentionally omits immutable and
// server-managed fields — these must never be writable via the update endpoint.
export type SubmissionPatch = Omit<
    Partial<Submission>,
    | 'id'
    | 'reference'
    | 'status'
    | 'createdDate'
    | 'createdBy'
    | 'createdByOrgCode'
    | 'contractType'
    | 'createdByOrgType'
    | 'assignment'
    | 'hasQuote'
    | 'hasPolicy'
>

// ---------------------------------------------------------------------------
// Pure helpers (R03, R04)
// ---------------------------------------------------------------------------

/**
 * R03 — Build a submission reference in the format SUB-{ORGCODE}-{YYYYMMDD}-{NNN}.
 *
 * @param orgCode  The tenant org code (case-insensitive — uppercased internally)
 * @param isoDate  ISO date string for the date portion, e.g. '2026-03-10'
 * @param sequence The sequence number for this org+day combination (1-based)
 */
export function buildReference(orgCode: string, isoDate: string, sequence: number): string {
    const datePart = isoDate.replace(/-/g, '')
    const seqPart = String(sequence).padStart(3, '0')
    return `SUB-${orgCode.toUpperCase()}-${datePart}-${seqPart}`
}

/**
 * R04 — Return the expiry date for a new submission.
 * If an explicit expiry is supplied it is returned unchanged.
 * Otherwise returns inception + 1 calendar year.
 *
 * @param inceptionDate ISO date string, e.g. '2026-03-10'
 * @param explicitExpiry ISO date string or undefined
 */
export function defaultExpiryDate(inceptionDate: string, explicitExpiry: string | undefined): string {
    if (explicitExpiry) return explicitExpiry
    const d = new Date(inceptionDate)
    d.setFullYear(d.getFullYear() + 1)
    return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// API adapters (R05–R08)
// ---------------------------------------------------------------------------

/**
 * R05 — Create a new submission.
 * Forces status to 'Created' and sets createdDate to now.
 */
export async function createSubmission(input: CreateSubmissionInput): Promise<Submission> {
    // reference is intentionally omitted — generated server-side (§4.9)
    // expiryDate default is also enforced server-side; the frontend value is
    // sent as a hint but the backend applies the 1-year rule regardless.
    const payload = {
        submissionType: input.submissionType ?? 'Submission',
        insured: input.insuredName,
        insuredId: input.insuredId,
        placingBroker: input.placingBroker ?? '',
        placingBrokerId: input.placingBrokerId ?? '',
        contractType: input.contractType ?? '',
        inceptionDate: input.inceptionDate,
        expiryDate: input.expiryDate ?? null,
        renewalDate: input.renewalDate ?? null,
        createdDate: new Date().toISOString(),
        createdBy: input.createdBy,
    }
    return post<Submission>('/api/submissions', payload)
}

/**
 * R06 — Fetch a single submission by ID.
 */
export async function getSubmission(id: number): Promise<Submission> {
    return get<Submission>(`/api/submissions/${id}`)
}

/**
 * R07 — List submissions with optional filters.
 * Filters are appended as query string parameters.
 */
export async function listSubmissions(filters?: SubmissionFilters): Promise<Submission[]> {
    if (!filters || Object.keys(filters).length === 0) {
        return get<Submission[]>('/api/submissions')
    }
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.orgCode) params.set('orgCode', filters.orgCode)
    return get<Submission[]>(`/api/submissions?${params.toString()}`)
}

/**
 * R08 — Update a submission.
 * Status is stripped from the patch — status transitions go through workflows.
 */
export async function updateSubmission(id: number, patch: SubmissionPatch & { status?: unknown }): Promise<Submission> {
    const { status: _dropped, ...safePatch } = patch  // R08: strip status
    return put<Submission>(`/api/submissions/${id}`, safePatch)
}

export async function acquireSubmissionEditLock(id: number): Promise<SubmissionEditLock> {
    return post<SubmissionEditLock>(`/api/submissions/${id}/edit-lock`, {})
}

export async function releaseSubmissionEditLock(id: number): Promise<void> {
    await del(`/api/submissions/${id}/edit-lock`)
}
