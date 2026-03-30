/**
 * useResizableColumns — mouse-drag column resize with localStorage persistence.
 *
 * Requirements: ../../components/ResizableGrid/requirements.md
 * Tests: ../../components/ResizableGrid/__tests__/ResizableGrid.test.tsx
 *
 * REQ-SHARED-GRID-F-001 — reads stored widths from localStorage on init
 * REQ-SHARED-GRID-F-002 — persists widths to localStorage on change
 * REQ-SHARED-GRID-F-003 — enforces minimum column width (default 60px)
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export type ColumnWidths = Record<string, number>

interface UseResizableColumnsOptions {
    defaultWidths: ColumnWidths
    storageKey: string
    minWidth?: number
}

export function useResizableColumns({
    defaultWidths,
    storageKey,
    minWidth = 60,
}: UseResizableColumnsOptions) {
    const [colWidths, setColWidths] = useState<ColumnWidths>(() => {
        try {
            const stored = localStorage.getItem(storageKey)
            if (stored) {
                const parsed = JSON.parse(stored) as ColumnWidths
                // Merge: stored values override defaults; missing keys use defaults
                return { ...defaultWidths, ...parsed }
            }
        } catch {
            // Ignore parse errors — fall through to defaults
        }
        return defaultWidths
    })

    // Persist to localStorage whenever widths change
    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(colWidths))
        } catch {
            // Silently ignore quota errors
        }
    }, [colWidths, storageKey])

    const resizingRef = useRef<{
        key: string
        startX: number
        startWidth: number
    } | null>(null)

    const startResize = useCallback(
        (key: string, e: React.MouseEvent) => {
            e.preventDefault()
            resizingRef.current = {
                key,
                startX: e.clientX,
                startWidth: colWidths[key] ?? defaultWidths[key] ?? 100,
            }

            function onMouseMove(me: MouseEvent) {
                if (!resizingRef.current) return
                const delta = me.clientX - resizingRef.current.startX
                const newWidth = Math.max(minWidth, resizingRef.current.startWidth + delta)
                setColWidths((prev) => ({ ...prev, [resizingRef.current!.key]: newWidth }))
            }

            function onMouseUp() {
                resizingRef.current = null
                window.removeEventListener('mousemove', onMouseMove)
                window.removeEventListener('mouseup', onMouseUp)
            }

            window.addEventListener('mousemove', onMouseMove)
            window.addEventListener('mouseup', onMouseUp)
        },
        [colWidths, defaultWidths, minWidth]
    )

    const getWidth = useCallback(
        (key: string): string => `${colWidths[key] ?? defaultWidths[key] ?? 100}px`,
        [colWidths, defaultWidths]
    )

    return { colWidths, startResize, getWidth }
}
