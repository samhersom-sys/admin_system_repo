/**
 * LocationsScheduleTab — embeddable component for Quote/Policy view pages
 *
 * REQ-LOC-FE-F-001 — load location schedule for entityType + entityId on mount
 * REQ-LOC-FE-F-002 — display schedule rows in a ResizableGrid
 * REQ-LOC-FE-F-003 — CSV import: parse file and POST rows
 * REQ-LOC-FE-F-004 — version selector: list and revert to previous versions
 * REQ-LOC-FE-F-005 — loading and error states
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { FiUpload, FiRotateCcw } from 'react-icons/fi'
import {
    getLocationsImports,
    importLocationsCsv,
    getLocationVersions,
    revertToVersion,
} from '@/locations/locations.service'
import type { LocationsImport, LocationRow, LocationVersion } from '@/locations/locations.service'
import { useNotifications } from '@/shell/NotificationDock'
import ResizableGrid from '@/shared/components/ResizableGrid/ResizableGrid'
import type { Column } from '@/shared/components/ResizableGrid/ResizableGrid'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LocationsScheduleTabProps {
    entityType: 'Quote' | 'Policy'
    entityId: number
}

// ---------------------------------------------------------------------------
// Column config
// ---------------------------------------------------------------------------

const LOCATION_COLUMNS: Column[] = [
    { key: 'location', label: 'Location', sortable: false, defaultWidth: 200 },
    { key: 'address', label: 'Address', sortable: false, defaultWidth: 220 },
    { key: 'city', label: 'City', sortable: false, defaultWidth: 140 },
    { key: 'state', label: 'State', sortable: false, defaultWidth: 100 },
    { key: 'country', label: 'Country', sortable: false, defaultWidth: 120 },
    { key: 'postcode', label: 'Postcode', sortable: false, defaultWidth: 100 },
    { key: 'sumInsured', label: 'Sum Insured', sortable: false, defaultWidth: 130 },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LocationsScheduleTab({ entityType, entityId }: LocationsScheduleTabProps) {
    const { addNotification } = useNotifications()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [importRecord, setImportRecord] = useState<LocationsImport | null>(null)
    const [rows, setRows] = useState<LocationRow[]>([])
    const [versions, setVersions] = useState<LocationVersion[]>([])
    const [importing, setImporting] = useState(false)
    const [reverting, setReverting] = useState(false)

    // REQ-LOC-FE-F-001 – load on mount
    const loadSchedule = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const imports = await getLocationsImports(entityType, entityId)
            if (imports.length > 0) {
                const latest = imports[0]
                setImportRecord(latest)
                setRows(latest.payload?.rows ?? [])
                const vs = await getLocationVersions(latest.id)
                setVersions(vs)
            } else {
                setImportRecord(null)
                setRows([])
                setVersions([])
            }
        } catch (err: unknown) {
            const msg = (err as Error)?.message ?? 'Failed to load locations schedule'
            setError(msg)
            addNotification(msg, 'error')
        } finally {
            setLoading(false)
        }
    }, [entityType, entityId, addNotification])

    useEffect(() => {
        loadSchedule()
    }, [loadSchedule])

    // REQ-LOC-FE-F-003 – CSV import
    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        e.target.value = ''

        setImporting(true)
        try {
            const text = await file.text()
            const lines = text.trim().split('\n')
            const headers = lines[0].split(',').map((h) => h.trim())
            const csvRows: LocationRow[] = lines.slice(1).map((line) => {
                const cells = line.split(',')
                return Object.fromEntries(headers.map((h, i) => [h, cells[i]?.trim() ?? '']))
            })
            await importLocationsCsv(entityType, entityId, csvRows)
            addNotification('Locations schedule imported successfully', 'success')
            await loadSchedule()
        } catch (err: unknown) {
            addNotification((err as Error)?.message ?? 'Import failed', 'error')
        } finally {
            setImporting(false)
        }
    }

    // REQ-LOC-FE-F-004 – revert to version
    async function handleRevert(versionNumber: number) {
        if (!importRecord) return
        setReverting(true)
        try {
            await revertToVersion(importRecord.id, versionNumber)
            addNotification(`Reverted to version ${versionNumber}`, 'success')
            await loadSchedule()
        } catch (err: unknown) {
            addNotification((err as Error)?.message ?? 'Revert failed', 'error')
        } finally {
            setReverting(false)
        }
    }

    // REQ-LOC-FE-F-005 – loading and error states
    if (loading) return <LoadingSpinner />
    if (error) return <div className="p-4 text-red-600" role="alert">{error}</div>

    return (
        <div className="flex flex-col gap-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                        {rows.length} location{rows.length !== 1 ? 's' : ''}
                        {importRecord && (
                            <span className="ml-2 text-gray-400">
                                (v{importRecord.versionNumber})
                            </span>
                        )}
                    </span>
                    {versions.length > 1 && (
                        <select
                            aria-label="Select version"
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                            defaultValue={importRecord?.versionNumber ?? ''}
                            onChange={(e) => handleRevert(Number(e.target.value))}
                            disabled={reverting}
                        >
                            {versions.map((v) => (
                                <option key={v.id} value={v.versionNumber}>
                                    v{v.versionNumber} — {v.createdAt?.slice(0, 10) ?? ''}{v.isActive ? ' (current)' : ''}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {reverting && <span className="text-sm text-gray-500">Reverting…</span>}
                    <button
                        type="button"
                        aria-label="Import CSV"
                        disabled={importing}
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded border border-brand-500 text-brand-600 hover:bg-brand-50 disabled:opacity-50"
                    >
                        <FiUpload size={14} />
                        {importing ? 'Importing…' : 'Import CSV'}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        aria-label="CSV file input"
                        onChange={handleFileChange}
                    />
                </div>
            </div>

            {/* REQ-LOC-FE-F-002 – grid */}
            <ResizableGrid
                columns={LOCATION_COLUMNS}
                rows={rows}
                storageKey={`table-widths-locations-${entityType}-${entityId}`}
                renderCell={(key, row) => String((row as Record<string, unknown>)[key] ?? '')}
                emptyMessage="No locations. Import a CSV to get started."
            />
        </div>
    )
}
