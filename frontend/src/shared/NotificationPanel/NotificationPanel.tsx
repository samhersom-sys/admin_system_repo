/**
 * NotificationPanel — pure presentational component
 * Third artifact. Requirements: components/NotificationPanel/requirements.md
 *
 * Receives all data and callbacks as props — zero context coupling.
 */

import React from 'react'
import { FiX } from 'react-icons/fi'
import type { AppNotification } from '@/shared/lib/notifications/notifications'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
    notifications: AppNotification[]
    onRemove: (id: string | number) => void
    onClearAll: () => void
    onClose: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NotificationPanel({
    notifications,
    onRemove,
    onClearAll,
    onClose,
}: Props) {
    // R03: panel header turns red when any notification is an error
    const hasErrors = notifications.some((n) => n.type === 'error')

    return (
        <div
            className={`shadow-lg rounded-lg p-4 w-80 mb-2 border ${hasErrors
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 bg-white'
                }`}
        >
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
                <h3
                    className={`font-semibold ${hasErrors ? 'text-red-600' : 'text-gray-800'
                        }`}
                >
                    Notifications
                </h3>

                <div className="flex items-center gap-2">
                    {/* R05 — Clear all */}
                    <button
                        onClick={() => { if (notifications.length) onClearAll() }}
                        disabled={notifications.length === 0}
                        className={`text-xs px-2 py-1 rounded border ${notifications.length
                                ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                : 'border-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        Clear
                    </button>

                    {/* R06 — Close */}
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                        title="Close"
                    >
                        <FiX size={18} />
                    </button>
                </div>
            </div>

            {/* R02 — Notification list */}
            <ul className="space-y-2 text-sm max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                    /* R01 — Empty state */
                    <li className="text-gray-500">No notifications</li>
                ) : (
                    notifications.map((n) => (
                        <li
                            key={n.id}
                            className={`px-2 py-1 rounded border ${n.type === 'error'
                                    ? 'bg-red-100 border-red-300 text-red-700'
                                    : n.type === 'warning'
                                        ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
                                        : n.type === 'success'
                                            ? 'bg-green-100 border-green-300 text-gray-700'
                                            : 'bg-gray-50 border-gray-200 text-gray-700'
                                }`}
                        >
                            {/* R04 — Per-item dismiss */}
                            <div className="flex justify-between items-center">
                                <span>{n.message}</span>
                                <button
                                    onClick={() => onRemove(n.id)}
                                    className="text-xs ml-2 text-gray-500 hover:text-gray-700"
                                >
                                    ×
                                </button>
                            </div>

                            {/* R07 — Action buttons */}
                            {Array.isArray(n.payload?.actions) && n.payload!.actions!.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {n.payload!.actions!.map((a, idx) => (
                                        <button
                                            key={idx}
                                            onClick={a.onClick}
                                            className={`text-xs underline ${a.variant === 'danger'
                                                    ? 'text-red-700 hover:text-red-900'
                                                    : 'text-gray-700 hover:text-gray-900'
                                                }`}
                                        >
                                            {a.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </li>
                    ))
                )}
            </ul>
        </div>
    )
}
