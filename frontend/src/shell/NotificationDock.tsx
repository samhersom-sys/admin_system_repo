/**
 * NotificationDock — context provider + bell button + panel integration
 * Third artifact. Requirements: app/AppLayout/notification-dock.requirements.md
 *
 * Exports:
 *   NotificationProvider — wraps the authenticated shell; owns notification state
 *   useNotifications     — hook consumed by any page or component
 *   NotificationDock     — fixed-position bell button with severity indicator
 */

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react'
import { FiBell } from 'react-icons/fi'
import { getSession } from '@/shared/lib/auth-session/auth-session'
import {
    fetchNotifications,
    createNotification,
    deleteNotification,
    markNotificationRead,
    bulkDeleteNotifications,
} from '@/shared/lib/notifications/notifications'
import NotificationPanel from '@/shared/NotificationPanel/NotificationPanel'
import type { AppNotification } from '@/shared/lib/notifications/notifications'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationAction {
    label: string
    onClick?: () => void
    variant?: 'danger' | 'primary'
}

interface NotificationOptions {
    id?: string
    actions?: NotificationAction[]
    payload?: Record<string, unknown>
}

interface NotificationContextValue {
    notifications: AppNotification[]
    /** Increments each time addNotification is called. Dock watches this for
     *  auto-open so initial data load never triggers the panel. */
    addedSignal: number
    addNotification: (
        message: string,
        type?: AppNotification['type'],
        options?: NotificationOptions
    ) => Promise<AppNotification | undefined>
    removeNotification: (id: string | number) => Promise<void>
    markAsRead: (id: string | number) => Promise<void>
    clearAll: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const NotificationContext = createContext<NotificationContextValue | null>(null)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isNumericId(val: unknown): boolean {
    return /^\d+$/.test(String(val))
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<AppNotification[]>([])
    const [addedSignal, setAddedSignal] = useState(0)

    // Load notifications for current user/org on mount
    useEffect(() => {
        const session = getSession()
        const user = session?.user as { name?: string; orgCode?: string } | undefined
        fetchNotifications({ userName: user?.name, orgCode: user?.orgCode })
            .then((rows) => { if (Array.isArray(rows)) setNotifications(rows) })
            .catch(() => { })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // R02 — addNotification (with local-only fallback)
    const addNotification = useCallback(
        async (
            message: string,
            type: AppNotification['type'] = 'info',
            options: NotificationOptions = {}
        ): Promise<AppNotification | undefined> => {
            const session = getSession()
            const user = session?.user as { name?: string; orgCode?: string } | undefined
            try {
                const payload = {
                    ...(options.payload ?? {}),
                    actions: options.actions,
                    ...(options.id ? { clientId: options.id } : {}),
                }
                const saved = await createNotification({
                    userName: user?.name ?? null,
                    orgCode: user?.orgCode ?? null,
                    type,
                    message,
                    payload,
                })
                if (options.id && !saved.payload?.clientId) {
                    saved.payload = { ...(saved.payload ?? {}), clientId: options.id }
                }
                setNotifications((prev) => [saved, ...prev])
                setAddedSignal((n) => n + 1)
                return saved
            } catch {
                const localId = `local-${Date.now()}`
                const fallback: AppNotification = {
                    id: localId,
                    message,
                    type,
                    payload: {
                        ...(options.payload ?? {}),
                        actions: options.actions,
                        clientId: options.id,
                        localOnly: true,
                    },
                }
                setNotifications((prev) => [fallback, ...prev])
                setAddedSignal((n) => n + 1)
                return fallback
            }
        },
        []
    )

    // R08 — removeNotification (supports both numeric id and clientId)
    const removeNotification = useCallback(
        async (id: string | number): Promise<void> => {
            if (!isNumericId(id)) {
                const clientId = String(id)
                const toDelete = notifications
                    .filter((n) => n.payload?.clientId === clientId && isNumericId(n.id))
                    .map((n) => n.id)
                setNotifications((prev) =>
                    prev.filter(
                        (n) => String(n.id) !== clientId && n.payload?.clientId !== clientId
                    )
                )
                for (const serverId of toDelete) {
                    try { await deleteNotification(serverId) } catch { }
                }
                return
            }
            setNotifications((prev) => prev.filter((n) => String(n.id) !== String(id)))
            try { await deleteNotification(id) } catch { }
        },
        [notifications]
    )

    // markAsRead
    const markAsRead = useCallback(async (id: string | number): Promise<void> => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        )
        try {
            if (isNumericId(id)) await markNotificationRead(id)
        } catch { }
    }, [])

    // R09 — clearAll
    const clearAll = useCallback(async (): Promise<void> => {
        const serverIds = notifications
            .filter((n) => isNumericId(n.id) && !n.payload?.localOnly)
            .map((n) => n.id)
        setNotifications([])
        try {
            await bulkDeleteNotifications(serverIds)
        } catch {
            for (const id of serverIds) {
                try { await deleteNotification(id) } catch { }
            }
        }
    }, [notifications])

    return (
        <NotificationContext.Provider
            value={{ notifications, addedSignal, addNotification, removeNotification, markAsRead, clearAll }}
        >
            {children}
        </NotificationContext.Provider>
    )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useNotifications(): NotificationContextValue {
    const ctx = useContext(NotificationContext)
    if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
    return ctx
}

// ---------------------------------------------------------------------------
// NotificationDock — bell button + auto-open + panel
// ---------------------------------------------------------------------------

export function NotificationDock() {
    const { notifications, addedSignal, removeNotification, clearAll } = useNotifications()
    const [isOpen, setIsOpen] = useState(false)
    const prevSignalRef = useRef(addedSignal)
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    // Ref kept in sync with isOpen so the "close when empty" effect does not
    // need isOpen in its dependency array (which caused the panel to close
    // immediately when the bell was clicked with zero notifications).
    const isOpenRef = useRef(isOpen)
    useEffect(() => { isOpenRef.current = isOpen }, [isOpen])

    // R06 — Auto-open on programmatic addNotification; R07 — auto-close after 5 s.
    // Watches addedSignal so initial data load never triggers the panel.
    useEffect(() => {
        if (addedSignal === prevSignalRef.current) return
        prevSignalRef.current = addedSignal
        setIsOpen(true)
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
        const newestNotification = notifications[0]
        if (newestNotification?.type === 'warning' || newestNotification?.type === 'error') {
            hideTimerRef.current = null
            return
        }
        hideTimerRef.current = setTimeout(() => setIsOpen(false), 5000)
    }, [addedSignal, notifications])

    // Auto-close panel when all notifications are cleared (user cleared them while
    // panel was open). isOpen is intentionally read from the ref so this effect
    // only runs when notifications changes — not when isOpen changes — preventing
    // the panel from closing immediately after the bell is clicked with zero items.
    useEffect(() => {
        if (notifications.length === 0 && isOpenRef.current) {
            setIsOpen(false)
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current)
                hideTimerRef.current = null
            }
        }
    }, [notifications]) // eslint-disable-line react-hooks/exhaustive-deps

    // Cleanup timer on unmount
    useEffect(() => {
        return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current) }
    }, [])

    // R04 — Bell severity colour
    const hasError = notifications.some((n) => n.type === 'error')
    const hasWarning = notifications.some((n) => n.type === 'warning')
    const hasSuccess = notifications.some((n) => n.type === 'success')

    let bellClass = 'bg-gray-200 text-gray-600 hover:bg-gray-300'
    if (hasError) bellClass = 'bg-red-500 text-white hover:bg-red-600'
    else if (hasWarning) bellClass = 'bg-yellow-400 text-white hover:bg-yellow-500'
    else if (hasSuccess) bellClass = 'bg-green-500 text-white hover:bg-green-600'

    // R05 — Manual toggle (cancels auto-close timer)
    const handleBellClick = () => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current)
            hideTimerRef.current = null
        }
        setIsOpen((prev) => !prev)
    }

    return (
        <div className="fixed bottom-4 right-4 flex flex-col items-end space-y-2 z-50">
            {/* Panel — always render when open; shows "No notifications" when empty */}
            {isOpen && (
                <NotificationPanel
                    notifications={notifications}
                    onRemove={removeNotification}
                    onClearAll={clearAll}
                    onClose={() => setIsOpen(false)}
                />
            )}

            {/* R02 — Bell button always visible */}
            <button
                onClick={handleBellClick}
                className={`rounded-full p-3 shadow-lg relative ${bellClass}`}
                title="Notifications"
                aria-label="Notifications"
            >
                <FiBell size={20} />

                {/* R03 — Badge count */}
                {notifications.length > 0 && (
                    <span
                        role="status"
                        aria-label={`${notifications.length} notifications`}
                        className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold"
                    >
                        {notifications.length}
                    </span>
                )}
            </button>
        </div>
    )
}
