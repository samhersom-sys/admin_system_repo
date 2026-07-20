/**
 * Broker Submissions Domain Service
 *
 * Domain: PSS-BRK-DOM
 * Requirements: broker-submissions.requirements.md
 * Tests: __tests__/broker-submissions.domain.test.ts
 *
 * Owns the client-side API adapter functions for the broker-submissions
 * resource. All HTTP calls go through the shared api-client — never raw fetch.
 *
 * Architectural rule (REQ-PSS-BRK-DOM-C-001):
 *   This file MUST NOT import from any other domain module.
 */

import { get, post, put } from '@/shared/lib/api-client/api-client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BrokerSubmission {
  id: number
  orgCode: string
  reference: string | null
  insuredName: string
  classOfBusiness: string | null
  inceptionDate: string
  expiryDate: string | null
  estimatedPremium: number | null
  currency: string | null
  source: string
  workflowStatus: string
  createdBy: number
  updatedBy: number | null
  createdAt: string
  updatedAt: string
}

export interface CreateBrokerSubmissionInput {
  insuredName: string
  inceptionDate: string
  source: string
  reference?: string | null
  classOfBusiness?: string | null
  expiryDate?: string | null
  estimatedPremium?: number | null
  currency?: string | null
}

export interface BrokerSubmissionFilters {
  source?: string
  status?: string
}

// ---------------------------------------------------------------------------
// Allowed submission types (REQ-PSS-BRK-DOM-F-002/003)
// Values must exactly match lookup_broker_submission_sources.code
// ---------------------------------------------------------------------------

export const BROKER_SUBMISSION_TYPES = ['manual', 'platform_shared'] as const

export type BrokerSubmissionType = typeof BROKER_SUBMISSION_TYPES[number]

// ---------------------------------------------------------------------------
// API adapter functions
// ---------------------------------------------------------------------------

/**
 * Create a new broker submission.
 * REQ-PSS-BRK-DOM-F-012
 */
export async function createBrokerSubmission(input: CreateBrokerSubmissionInput): Promise<BrokerSubmission> {
  return post<BrokerSubmission>('/api/broker-submissions', input)
}

/**
 * List broker submissions for the authenticated org, with optional filters.
 * REQ-PSS-BRK-DOM-F-013
 */
export async function listBrokerSubmissions(filters?: BrokerSubmissionFilters): Promise<BrokerSubmission[]> {
  const qs = new URLSearchParams()
  if (filters?.source) qs.set('source', filters.source)
  if (filters?.status) qs.set('status', filters.status)
  const query = qs.toString()
  return get<BrokerSubmission[]>(`/api/broker-submissions${query ? `?${query}` : ''}`)
}

/**
 * Get a single broker submission by id.
 * REQ-PSS-BRK-DOM-F-014
 */
export async function getBrokerSubmission(id: number): Promise<BrokerSubmission> {
  return get<BrokerSubmission>(`/api/broker-submissions/${id}`)
}

/**
 * Update editable fields on a broker submission.
 * REQ-PSS-BRK-DOM-F-015
 */
export async function updateBrokerSubmission(
  id: number,
  patch: Partial<CreateBrokerSubmissionInput>,
): Promise<BrokerSubmission> {
  return put<BrokerSubmission>(`/api/broker-submissions/${id}`, patch)
}
