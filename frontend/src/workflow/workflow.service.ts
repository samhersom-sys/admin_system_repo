/**
 * Workflow Domain — Service Layer
 *
 * Requirements: frontend/src/workflow/workflow.requirements.md
 * REQ-WF-FE-C-001 — all API calls via @/shared/lib/api-client/api-client
 */

import { get, post, patch } from '@/shared/lib/api-client/api-client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WorkflowSubmissionStatus =
    | 'Unassigned'
    | 'Assigned'
    | 'In Review'
    | 'Quoted'
    | 'Declined'

export interface WorkflowSubmission {
    id: number
    reference: string
    insured?: string | null
    broker?: string | null
    email_received?: string | null
    processed?: string | null
    status: WorkflowSubmissionStatus
    assigned_to?: string | null
    source?: string | null
    ai_extracted?: boolean
    review_required?: boolean
}

export interface AssignSubmissionInput {
    assigned_to: number
    notes?: string | null
}

export type ClearanceStatus = 'pending_clearance' | 'cleared' | 'confirmed_duplicate'

export interface ClearanceSubmission {
    id: number
    reference: string
    insured?: string | null
    inception_date?: string | null
    expiry_date?: string | null
    clearance_status: ClearanceStatus
    cleared_by?: string | null
    cleared_date?: string | null
    assigned_to?: string | null
    created_date?: string | null
}

export interface ClearanceMatch {
    id: number
    reference: string
    insured?: string | null
    status?: string | null
}

export interface ClearanceCheckResult {
    matches: ClearanceMatch[]
}

export type DataQualitySeverity = 'High' | 'Medium' | 'Low'

export interface DataQualityIssue {
    id: number
    entity_type: string
    entity_reference: string
    entity_id?: number | null
    field: string
    issue_description: string
    severity: DataQualitySeverity
}

export interface User {
    id: number
    name: string
    email?: string | null
    profile_type?: string | null
    is_active?: boolean
}

// ---------------------------------------------------------------------------
// API adapters
// ---------------------------------------------------------------------------

export async function getWorkflowSubmissions(): Promise<WorkflowSubmission[]> {
    return get<WorkflowSubmission[]>('/api/workflow/submissions')
}

export async function assignSubmission(
    id: number,
    input: AssignSubmissionInput
): Promise<{ assignedTo: string }> {
    return post<{ assignedTo: string }>(`/api/workflow/submissions/${id}/assign`, input)
}

export async function updateSubmissionStatus(
    id: number,
    status: WorkflowSubmissionStatus
): Promise<WorkflowSubmission> {
    return patch<WorkflowSubmission>(`/api/workflow/submissions/${id}/status`, { status })
}

export async function getClearancePending(): Promise<ClearanceSubmission[]> {
    return get<ClearanceSubmission[]>('/api/clearance/pending')
}

export async function checkClearanceDuplicates(id: number): Promise<ClearanceCheckResult> {
    return post<ClearanceCheckResult>(`/api/clearance/check/${id}`, {})
}

export async function clearSubmission(id: number, notes?: string): Promise<ClearanceSubmission> {
    return post<ClearanceSubmission>(`/api/clearance/${id}/clear`, { notes })
}

export async function confirmDuplicate(id: number, notes?: string): Promise<ClearanceSubmission> {
    return post<ClearanceSubmission>(`/api/clearance/${id}/confirm-duplicate`, { notes })
}

export async function getDataQualityIssues(): Promise<DataQualityIssue[]> {
    return get<DataQualityIssue[]>('/api/workflow/data-quality')
}

export async function getUnderwriters(): Promise<User[]> {
    return get<User[]>('/api/users?profileType=underwriter&isActive=true')
}
