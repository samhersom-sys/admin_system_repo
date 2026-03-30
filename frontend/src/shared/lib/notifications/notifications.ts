/**
 * notifications — lib service
 * First artifact: lib/notifications/notifications.requirements.md
 *
 * Thin fetch wrapper for all notification CRUD operations.
 * Uses lib/api-client so auth and org-code headers are added automatically.
 * No React dependencies — pure TypeScript.
 */

import { get, post, del, patch } from '@/shared/lib/api-client/api-client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NotificationAction {
    label: string
    onClick?: () => void
    variant?: 'danger' | 'primary'
}

export interface AppNotification {
    id: string | number
    message: string
    type: 'info' | 'warning' | 'error' | 'success'
    read?: boolean
    payload?: {
        actions?: NotificationAction[]
        clientId?: string
        localOnly?: boolean
    }
}

export interface CreateNotificationPayload {
    userName: string | null
    orgCode: string | null
    type: 'info' | 'warning' | 'error' | 'success'
    message: string
    payload?: {
        actions?: NotificationAction[]
        clientId?: string
        [key: string]: unknown
    }
}

// ---------------------------------------------------------------------------
// R01 — fetchNotifications
// ---------------------------------------------------------------------------

export async function fetchNotifications(
    params: { userName?: string; orgCode?: string } = {}
): Promise<AppNotification[]> {
    const qs = new URLSearchParams()
    if (params.userName) qs.set('userName', params.userName)
    if (params.orgCode) qs.set('orgCode', params.orgCode)
    const query = qs.toString() ? `?${qs.toString()}` : ''
    return get<AppNotification[]>(`/api/notifications${query}`)
}

// ---------------------------------------------------------------------------
// R02 — createNotification
// ---------------------------------------------------------------------------

export async function createNotification(
    payload: CreateNotificationPayload
): Promise<AppNotification> {
    return post<AppNotification>('/api/notifications', payload)
}

// ---------------------------------------------------------------------------
// R03 — deleteNotification
// ---------------------------------------------------------------------------

export async function deleteNotification(id: string | number): Promise<void> {
    await del(`/api/notifications/${id}`)
}

// ---------------------------------------------------------------------------
// R04 — markNotificationRead
// ---------------------------------------------------------------------------

export async function markNotificationRead(id: string | number): Promise<void> {
    await patch(`/api/notifications/${id}/read`)
}

// ---------------------------------------------------------------------------
// R05 — bulkDeleteNotifications
// ---------------------------------------------------------------------------

/**
 * Attempts a single bulk-delete request.
 * Uses a POST to /api/notifications/bulk-delete with { ids } in the body
 * because the api-client's del() helper does not support a request body.
 * Throws on failure so the caller can fall back to sequential deletes.
 */
export async function bulkDeleteNotifications(
    ids: (string | number)[]
): Promise<void> {
    await post('/api/notifications/bulk-delete', { ids })
}
