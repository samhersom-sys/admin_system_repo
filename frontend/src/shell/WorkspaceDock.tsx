/**
 * WorkspaceDock — fixed-position workspace monitor button + panel.
 *
 * Positioned above the notification bell (bottom-right) following the same
 * pattern as NotificationDock.  Uses WorkspaceContext so it must be rendered
 * inside <WorkspaceProvider> (satisfied by AppLayout wrapping order).
 */
import { useState } from 'react'
import { FiMonitor } from 'react-icons/fi'
import { useWorkspace } from './WorkspaceContext'
import WorkspacePanel from './WorkspacePanel'

export default function WorkspaceDock() {
    const { workspaces } = useWorkspace()
    const [isOpen, setIsOpen] = useState(false)

    const count = workspaces.length

    // Colour: highlight when more than one workspace is open (user is multi-tasking)
    const buttonClass = isOpen || count > 1
        ? 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]'
        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'

    return (
        <div
            className="fixed bottom-4 right-20 flex flex-col items-end space-y-2 z-50"
            style={{ pointerEvents: 'none' }}
        >
            {/* Panel floats above the button */}
            {isOpen && (
                <div style={{ pointerEvents: 'all' }}>
                    <WorkspacePanel onClose={() => setIsOpen(false)} />
                </div>
            )}

            {/* Monitor button */}
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className={`rounded-full p-3 shadow-lg relative ${buttonClass}`}
                title={`Workspaces (${count} open)`}
                aria-label="Workspaces"
                style={{ pointerEvents: 'all' }}
            >
                <FiMonitor size={20} />
                {/* Badge: show count when > 1 workspace open */}
                {count > 1 && (
                    <span
                        className="absolute -top-1 -right-1 bg-white text-[var(--color-primary)] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow"
                        aria-hidden="true"
                    >
                        {count}
                    </span>
                )}
            </button>
        </div>
    )
}
