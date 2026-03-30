/**
 * useAudit — fetch audit history and post lifecycle events for an entity.
 *
 * Requirements: ../../components/AuditTable/requirements.md
 * Tests: ../../components/AuditTable/__tests__/AuditTable.test.tsx
 *
 * REQ-SHARED-AUDIT-F-007 — posts "Entity Opened" on mount (when trackVisits=true)
 * REQ-SHARED-AUDIT-F-008 — posts "Entity Closed" on unmount
 * REQ-SHARED-AUDIT-F-009 — skips lifecycle posts when entityId is null
 * REQ-SHARED-AUDIT-F-010 — getAudit() calls GET and returns events
 * REQ-SHARED-AUDIT-F-011 — returns { audit, loading, error, getAudit }
 * REQ-SHARED-AUDIT-F-012 — uses auth-session for user identity (never body prop)
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { get, post } from '@/shared/lib/api-client/api-client'
import { getSession } from '@/shared/lib/auth-session/auth-session'

// Shape returned by GET /api/quotes/:id/audit (and equivalent domain endpoints)
export interface AuditEvent {
    action: string
    user: string | null
    userId?: string | number | null
    date: string
    details?: string | null
    changes?: Record<string, { old: string; new: string }> | null
}

export interface UseAuditOptions {
    entityType: string
    entityId: number | null
    apiBase: string
    trackVisits?: boolean
}

export function useAudit({
    entityType,
    entityId,
    apiBase,
    trackVisits = false,
}: UseAuditOptions) {
    const [audit, setAudit] = useState<AuditEvent[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Keep a ref so the cleanup function always has the latest entityId
    const entityIdRef = useRef(entityId)
    useEffect(() => {
        entityIdRef.current = entityId
    }, [entityId])

    const getAudit = useCallback(async () => {
        if (entityIdRef.current === null) return
        setLoading(true)
        setError(null)
        try {
            const data = await get<AuditEvent[]>(`${apiBase}/${entityIdRef.current}/audit`)
            setAudit(data)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load audit history.')
        } finally {
            setLoading(false)
        }
    }, [apiBase])

    // Post lifecycle events (Opened on mount, Closed on unmount)
    useEffect(() => {
        if (!trackVisits || entityId === null) return

        const session = getSession()
        const userName =
            session?.user?.name ?? session?.user?.email ?? 'Unknown'
        const userId = session?.user?.id ?? null

        post(`${apiBase}/${entityId}/audit`, {
            action: `${entityType} Opened`,
            user: userName,
            userId,
        }).catch(() => {
            // Silently ignore — lifecycle events are best-effort
        })

        return () => {
            const id = entityIdRef.current
            if (id === null) return
            post(`${apiBase}/${id}/audit`, {
                action: `${entityType} Closed`,
                user: userName,
                userId,
            }).catch(() => { })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entityType, entityId, apiBase, trackVisits])

    return { audit, loading, error, getAudit }
}
