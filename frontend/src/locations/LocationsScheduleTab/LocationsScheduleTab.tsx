/**
 * LocationsScheduleTab — embeddable component for Quote/Policy view pages
 *
 * REQ-LOC-FE-F-001 — load location schedule for entityType + entityId on mount
 * REQ-LOC-FE-F-002 — display schedule rows in an app-table
 * REQ-LOC-FE-F-003 — CSV import: parse file and POST rows
 * REQ-LOC-FE-F-004 — version selector: list and revert to previous versions
 * REQ-LOC-FE-F-005 — loading and error states
 * REQ-LOC-FE-F-006 — inline row add, delete, and save
 * REQ-LOC-FE-F-007 — previously included locations tab
 * REQ-LOC-FE-F-008 — hierarchical collapsible grid (Country → State → rows)
 * REQ-LOC-FE-F-013 — per-row Calculate button
 * REQ-LOC-FE-F-014 — Calculate All button
 * REQ-LOC-FE-F-015 — Save Version button
 * REQ-LOC-FE-F-016 — Add location via CRUD endpoint
 * REQ-LOC-FE-F-017 — Delete location via CRUD endpoint
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FaSort, FaSortDown, FaSortUp } from 'react-icons/fa'
import { FiCheck, FiChevronDown, FiChevronRight, FiPlus, FiRotateCcw, FiSave, FiTrash2, FiUpload, FiX, FiZap } from 'react-icons/fi'
import {
    getLocationsImports,
    getHistoricalLocations,
    getLocationVersions,
    importLocationsCsv,
    revertToVersion,
    updateLocationsImport,
    getQuoteLocationRows,
    addLocation,
    updateLocation,
    deleteLocation,
    calculateLocation,
    calculateQuote,
    saveLocationVersion,
} from '@/locations/locations.service'
import type { LocationsImport, LocationRow, LocationVersion, QuoteLocationRow } from '@/locations/locations.service'
import { getLookupCurrencies } from '@/settings/settings.service'
import { listSections, listCoverages, listCoverageDetails } from '@/quotes/quotes.service'
import { getPolicySections, getPolicyCoverages, getPolicyCoverageDetails } from '@/policies/policies.service'
import { useNotifications } from '@/shell/NotificationDock'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import { useResizableColumns } from '@/shared/lib/hooks/useResizableColumns'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LocationsScheduleTabProps {
    entityType: 'Quote' | 'Policy'
    entityId: number
    /** quoteId required for Block 2 CRUD + calculation features */
    quoteId?: number
    /** editable controls whether add/delete/calculate/save-version buttons show */
    editable?: boolean
}

// ---------------------------------------------------------------------------
// Column config
// ---------------------------------------------------------------------------

type GridColumn = { key: string; label: string; sortable?: boolean; defaultWidth?: number }

const COMMON_COLUMNS: GridColumn[] = [
    { key: 'scheduleId', label: 'Schedule ID', sortable: true, defaultWidth: 120 },
    { key: 'section', label: 'Section' },
    { key: 'coverage', label: 'Coverage' },
    { key: 'coverageElement', label: 'Coverage Element' },
    { key: 'sumInsuredCurrency', label: 'Sum Insured Currency' },
    { key: 'sumInsured', label: 'Sum Insured' },
    { key: 'sumInsuredMovement', label: 'Sum Insured Movement' },
    { key: 'premiumCurrency', label: 'Premium Currency' },
    { key: 'annualRatedGrossPremium', label: 'Annual Rated Gross Premium' },
    { key: 'annualRatedGrossPremiumMovement', label: 'Annual Rated Gross Premium Movement' },
]

const LOCATION_ONLY_COLUMNS: GridColumn[] = [
    { key: 'location', label: 'Location' },
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'country', label: 'Country' },
    { key: 'postcode', label: 'Postcode' },
]

const ASSET_ONLY_COLUMNS: GridColumn[] = [
    { key: 'assetName', label: 'Asset Name' },
]

const ALL_COLUMNS: GridColumn[] = [...COMMON_COLUMNS, ...LOCATION_ONLY_COLUMNS, ...ASSET_ONLY_COLUMNS]

type InternalTab = 'schedule' | 'historical'
type SortDirection = 'asc' | 'desc'
type ScheduleType = 'Location' | 'Asset' | 'Vehicle' | 'Yachts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupByCountryState(rows: QuoteLocationRow[]): Map<string, Map<string, QuoteLocationRow[]>> {
    const map = new Map<string, Map<string, QuoteLocationRow[]>>()
    for (const row of rows) {
        const country = row.country ?? 'Unknown'
        const state = row.state_province ?? ''
        if (!map.has(country)) map.set(country, new Map())
        const stateMap = map.get(country)!
        if (!stateMap.has(state)) stateMap.set(state, [])
        stateMap.get(state)!.push(row)
    }
    return map
}

function mapAssetTypeValue(row: Record<string, unknown>): string {
    return String(row.assetType ?? row.asset_type ?? 'Location')
}

function getCellValue(row: Record<string, unknown>, key: string): string {
    const aliases: Record<string, string[]> = {
        assetType: ['assetType', 'asset_type'],
        assetName: ['assetName', 'asset_name'],
        scheduleId: ['scheduleId', 'schedule_id', 'rating_schedule_id'],
        location: ['location', 'location_name'],
        address: ['address', 'address_line1'],
        city: ['city'],
        state: ['state', 'state_province'],
        country: ['country'],
        postcode: ['postcode', 'zip'],
        section: ['section', 'section_reference', 'section_id'],
        coverage: ['coverage', 'coverage_type'],
        coverageElement: ['coverageElement', 'coverage_sub_type'],
        sumInsuredCurrency: ['sumInsuredCurrency', 'sum_insured_currency', 'currency'],
        sumInsured: ['sumInsured', 'sum_insured'],
        sumInsuredMovement: ['sumInsuredMovement', 'sum_insured_movement'],
        premiumCurrency: ['premiumCurrency', 'premium_currency', 'currency'],
        annualRatedGrossPremium: ['annualRatedGrossPremium', 'annual_risk_gross_premium'],
        annualRatedGrossPremiumMovement: ['annualRatedGrossPremiumMovement', 'annual_risk_gross_premium_movement', 'argp_movement'],
    }
    const fields = aliases[key] ?? [key]
    for (const field of fields) {
        const value = row[field]
        if (value !== null && value !== undefined && String(value) !== '') {
            return String(value)
        }
    }
    return ''
}

function expandRowsForCreateRows(rows: LocationRow[], combos: Array<{ section?: string; coverage?: string; coverageElement?: string }>): LocationRow[] {
    if (combos.length === 0) return rows
    return rows.flatMap((row) => combos.map((combo) => ({
        ...row,
        section: combo.section ?? row.section,
        coverage: combo.coverage ?? row.coverage,
        coverageElement: combo.coverageElement ?? row.coverageElement,
    } as LocationRow)))
}

function nextScheduleId(rows: LocationRow[]): number {
    const maxId = rows.reduce((acc, row) => {
        const value = Number(getCellValue(row as Record<string, unknown>, 'scheduleId'))
        if (Number.isFinite(value)) return Math.max(acc, value)
        return acc
    }, 0)
    return maxId + 1
}

function normalizeScheduleType(value: string): ScheduleType {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'asset') return 'Asset'
    if (normalized === 'vehicle') return 'Vehicle'
    if (normalized === 'yacht' || normalized === 'yachts') return 'Yachts'
    return 'Location'
}

function columnsForScheduleType(type: ScheduleType): GridColumn[] {
    if (type === 'Location') return [...COMMON_COLUMNS, ...LOCATION_ONLY_COLUMNS]
    return [...COMMON_COLUMNS, ...ASSET_ONLY_COLUMNS]
}

function sortRows(rows: LocationRow[], key: string, direction: SortDirection): LocationRow[] {
    const factor = direction === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
        const av = getCellValue(a as Record<string, unknown>, key)
        const bv = getCellValue(b as Record<string, unknown>, key)
        const an = Number(av)
        const bn = Number(bv)
        const bothNumeric = av.trim() !== '' && bv.trim() !== '' && Number.isFinite(an) && Number.isFinite(bn)
        if (bothNumeric) {
            if (an < bn) return -1 * factor
            if (an > bn) return 1 * factor
            return 0
        }
        const cmp = av.localeCompare(bv, undefined, { sensitivity: 'base', numeric: true })
        return cmp * factor
    })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LocationsScheduleTab({ entityType, entityId, quoteId, editable = false }: LocationsScheduleTabProps) {
    const { addNotification } = useNotifications()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const createRowsLabel = entityType === 'Policy' ? 'Create Policy Structure Rows' : 'Create Quote Structure Rows'
    const [selectedScheduleTypes, setSelectedScheduleTypes] = useState<ScheduleType[]>(['Location'])

    // --- Schedule state ---
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [importRecord, setImportRecord] = useState<LocationsImport | null>(null)
    const [rows, setRows] = useState<LocationRow[]>([])
    const [versions, setVersions] = useState<LocationVersion[]>([])
    const [importing, setImporting] = useState(false)
    const [reverting, setReverting] = useState(false)

    // --- Inline add state ---
    const [showInlineAddType, setShowInlineAddType] = useState<ScheduleType | null>(null)
    const [newRow, setNewRow] = useState<Record<string, string>>({})

    // --- Save state ---
    const [pendingChanges, setPendingChanges] = useState(false)
    const [saving, setSaving] = useState(false)
    const [scheduleSort, setScheduleSort] = useState<{ key: string; direction: SortDirection }>({ key: 'location', direction: 'asc' })
    const [historicalSort, setHistoricalSort] = useState<{ key: string; direction: SortDirection }>({ key: 'location', direction: 'asc' })
    const [createRows, setCreateRows] = useState(false)
    const [currencyOptions, setCurrencyOptions] = useState<string[]>([])
    const [structureCombos, setStructureCombos] = useState<Array<{ section?: string; coverage?: string; coverageElement?: string }>>([])

    // --- Internal tab state ---
    const [activeTab, setActiveTab] = useState<InternalTab>('schedule')

    // --- Historical state ---
    const [historicalRows, setHistoricalRows] = useState<LocationRow[]>([])
    const [historicalLoaded, setHistoricalLoaded] = useState(false)
    const [historicalLoading, setHistoricalLoading] = useState(false)

    // --- Block 2: normalised location rows ---
    const [locationRows, setLocationRows] = useState<QuoteLocationRow[]>([])
    const [collapsedCountries, setCollapsedCountries] = useState<Set<string>>(new Set())
    const [collapsedStates, setCollapsedStates] = useState<Set<string>>(new Set())
    const [calculatingAll, setCalculatingAll] = useState(false)
    const [savingVersion, setSavingVersion] = useState(false)

    const defaultWidths = useMemo(
        () => Object.fromEntries(ALL_COLUMNS.map((col) => [col.key, col.defaultWidth ?? 150])),
        []
    )
    const { startResize: startResizeSchedule, getWidth: getScheduleWidth } = useResizableColumns({
        defaultWidths,
        storageKey: 'table-widths-locations-schedule-main',
    })
    const { startResize: startResizeHistorical, getWidth: getHistoricalWidth } = useResizableColumns({
        defaultWidths,
        storageKey: 'table-widths-locations-schedule-historical',
    })

    const sortedRows = useMemo(
        () => sortRows(rows, scheduleSort.key, scheduleSort.direction),
        [rows, scheduleSort]
    )
    const sortedHistoricalRows = useMemo(
        () => sortRows(historicalRows, historicalSort.key, historicalSort.direction),
        [historicalRows, historicalSort]
    )

    const selectedSet = useMemo(() => new Set(selectedScheduleTypes), [selectedScheduleTypes])

    const rowsByType = useMemo(() => {
        const map: Record<ScheduleType, LocationRow[]> = {
            Location: [],
            Asset: [],
            Vehicle: [],
            Yachts: [],
        }
        for (const row of sortedRows) {
            const type = normalizeScheduleType(mapAssetTypeValue(row as Record<string, unknown>))
            if (selectedSet.has(type)) map[type].push(row)
        }
        return map
    }, [sortedRows, selectedSet])

    const historicalByType = useMemo(() => {
        const map: Record<ScheduleType, LocationRow[]> = {
            Location: [],
            Asset: [],
            Vehicle: [],
            Yachts: [],
        }
        for (const row of sortedHistoricalRows) {
            const type = normalizeScheduleType(mapAssetTypeValue(row as Record<string, unknown>))
            if (selectedSet.has(type)) map[type].push(row)
        }
        return map
    }, [sortedHistoricalRows, selectedSet])

    const filteredLocationRows = useMemo(
        () => locationRows.filter((row) => selectedSet.has(normalizeScheduleType(String((row as unknown as Record<string, unknown>).asset_type ?? 'Location')))),
        [locationRows, selectedSet]
    )

    function toggleSort(kind: 'schedule' | 'historical', key: string) {
        if (kind === 'schedule') {
            setScheduleSort((prev) =>
                prev.key === key
                    ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
                    : { key, direction: 'asc' }
            )
            return
        }
        setHistoricalSort((prev) =>
            prev.key === key
                ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
                : { key, direction: 'asc' }
        )
    }

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

    // REQ-LOC-FE-F-008 — load normalised location rows (Block 2)
    const loadLocationRows = useCallback(async () => {
        if (!quoteId) return
        try {
            const data = await getQuoteLocationRows(quoteId)
            setLocationRows(data)
        } catch {
            // non-blocking — rows may not exist yet
        }
    }, [quoteId])

    useEffect(() => {
        loadLocationRows()
    }, [loadLocationRows])

    useEffect(() => {
        getLookupCurrencies()
            .then((currencies) => setCurrencyOptions(Array.isArray(currencies) ? currencies : []))
            .catch(() => setCurrencyOptions([]))
    }, [])

    useEffect(() => {
        async function loadStructureCombos() {
            try {
                if (entityType === 'Quote' && quoteId) {
                    const sections = await listSections(quoteId)
                    const combos: Array<{ section?: string; coverage?: string; coverageElement?: string }> = []
                    for (const section of sections) {
                        const sectionLabel = section.reference ?? String(section.id)
                        const coverages = await listCoverages(quoteId, section.id)
                        if (coverages.length === 0) {
                            combos.push({ section: sectionLabel })
                            continue
                        }
                        for (const coverage of coverages) {
                            const coverageLabel = coverage.coverage ?? coverage.reference ?? String(coverage.id)
                            const details = await listCoverageDetails(quoteId, section.id, coverage.id)
                            if (details.length === 0) {
                                combos.push({ section: sectionLabel, coverage: coverageLabel })
                                continue
                            }
                            for (const detail of details) {
                                const detailLabel = detail.reference ?? String(detail.id)
                                combos.push({ section: sectionLabel, coverage: coverageLabel, coverageElement: detailLabel })
                            }
                        }
                    }
                    setStructureCombos(combos)
                    return
                }

                if (entityType === 'Policy' && entityId) {
                    const sections = await getPolicySections(entityId)
                    const combos: Array<{ section?: string; coverage?: string; coverageElement?: string }> = []
                    for (const section of sections) {
                        const sectionLabel = section.reference ?? String(section.id)
                        const coverages = await getPolicyCoverages(entityId, section.id)
                        if (coverages.length === 0) {
                            combos.push({ section: sectionLabel })
                            continue
                        }
                        for (const coverage of coverages) {
                            const coverageLabel = coverage.coverage ?? coverage.reference ?? String(coverage.id)
                            const details = await getPolicyCoverageDetails(entityId, section.id, coverage.id)
                            if (details.length === 0) {
                                combos.push({ section: sectionLabel, coverage: coverageLabel })
                                continue
                            }
                            for (const detail of details) {
                                const detailLabel = detail.reference ?? String(detail.id)
                                combos.push({ section: sectionLabel, coverage: coverageLabel, coverageElement: detailLabel })
                            }
                        }
                    }
                    setStructureCombos(combos)
                    return
                }

                setStructureCombos([])
            } catch {
                setStructureCombos([])
            }
        }

        loadStructureCombos()
    }, [entityType, entityId, quoteId])

    // REQ-LOC-FE-F-016 — Add location via CRUD
    async function handleAddLocation() {
        if (!quoteId) return
        try {
            await addLocation(quoteId, { asset_type: 'Location', location_name: 'New Location', country: '', state_province: '' })
            await loadLocationRows()
            addNotification('Location added.', 'success')
        } catch (err: unknown) {
            addNotification((err as Error)?.message ?? 'Could not add location.', 'error')
        }
    }

    // REQ-LOC-FE-F-017 — Delete location via CRUD
    async function handleDeleteLocationRow(locationId: number) {
        if (!quoteId) return
        try {
            await deleteLocation(quoteId, locationId)
            setLocationRows((prev) => prev.filter((r) => r.location_id !== locationId))
        } catch (err: unknown) {
            addNotification((err as Error)?.message ?? 'Could not delete location.', 'error')
        }
    }

    async function handlePersistLocationName(locationId: number, locationName: string) {
        if (!quoteId) return
        try {
            await updateLocation(quoteId, locationId, { location_name: locationName })
        } catch (err: unknown) {
            addNotification((err as Error)?.message ?? 'Could not save location name.', 'error')
        }
    }

    // REQ-LOC-FE-F-013 — per-row Calculate
    async function handleCalculateRow(coverageId: number, ratingScheduleId: number) {
        try {
            const result = await calculateLocation(coverageId, ratingScheduleId)
            setLocationRows((prev) =>
                prev.map((r) =>
                    r.coverage_id === coverageId
                        ? { ...r, rate_percent: result.rate_percent, annual_risk_gross_premium: result.annual_risk_gross_premium }
                        : r
                )
            )
        } catch (err: unknown) {
            addNotification((err as Error)?.message ?? 'Calculation failed.', 'error')
        }
    }

    // REQ-LOC-FE-F-014 — Calculate All
    async function handleCalculateAll() {
        if (!quoteId) return
        setCalculatingAll(true)
        try {
            await calculateQuote(quoteId)
            await loadLocationRows()
            addNotification('All locations rated.', 'success')
        } catch (err: unknown) {
            addNotification((err as Error)?.message ?? 'Calculate all failed.', 'error')
        } finally {
            setCalculatingAll(false)
        }
    }

    // REQ-LOC-FE-F-015 — Save Version
    async function handleSaveVersion() {
        if (!quoteId) return
        setSavingVersion(true)
        try {
            await saveLocationVersion(quoteId)
            addNotification('Version saved successfully.', 'success')
            await loadSchedule()
        } catch (err: unknown) {
            addNotification((err as Error)?.message ?? 'Save version failed.', 'error')
        } finally {
            setSavingVersion(false)
        }
    }

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

    // REQ-LOC-FE-F-006a – inline add row
    function handleConfirmAdd(scheduleType: ScheduleType) {
        const baseScheduleId = nextScheduleId(rows)
        const baseRow = { assetType: scheduleType, asset_type: scheduleType, assetName: '', ...newRow, scheduleId: String(baseScheduleId) } as LocationRow
        let createdRows: LocationRow[] = [baseRow]

        if (createRows) {
            const combos = structureCombos.length > 0 ? structureCombos : []
            const expanded = combos.length > 0
                ? expandRowsForCreateRows([baseRow], combos)
                : [baseRow]
            createdRows = expanded.map((row, index) => ({
                ...row,
                scheduleId: String(baseScheduleId + index),
            }))
        }

        setRows((prev) => [...createdRows, ...prev])
        setShowInlineAddType(null)
        setNewRow({})
        setPendingChanges(true)
    }

    // REQ-LOC-FE-F-006b – delete row
    function handleDeleteRow(idx: number) {
        setRows((prev) => prev.filter((_, i) => i !== idx))
        setPendingChanges(true)
    }

    // REQ-LOC-FE-F-006d – save manual changes
    async function handleSave() {
        setSaving(true)
        try {
            if (importRecord) {
                await updateLocationsImport(importRecord.id, { rows })
            } else {
                await importLocationsCsv(entityType, entityId, rows)
            }
            addNotification('Schedule saved.', 'success')
            setPendingChanges(false)
            await loadSchedule()
        } catch (err: unknown) {
            addNotification((err as Error)?.message ?? 'Could not save schedule.', 'error')
        } finally {
            setSaving(false)
        }
    }

    // REQ-LOC-FE-F-007 – previously included tab
    async function handleHistoricalTab() {
        setActiveTab('historical')
        if (historicalLoaded || !importRecord) return
        setHistoricalLoading(true)
        try {
            const data = await getHistoricalLocations(importRecord.id)
            setHistoricalRows(data.flatMap((imp) => imp.payload?.rows ?? []))
            setHistoricalLoaded(true)
        } catch {
            addNotification('Could not load historical locations.', 'error')
        } finally {
            setHistoricalLoading(false)
        }
    }

    // REQ-LOC-FE-F-005 – loading and error states
    if (loading) return <LoadingSpinner />
    if (error) return <div className="p-4 text-red-600" role="alert">{error}</div>

    function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
        if (!active) return <FaSort className="flex-shrink-0 text-gray-400" size={12} aria-hidden="true" />
        return direction === 'asc'
            ? <FaSortUp className="flex-shrink-0 text-brand-600" size={12} aria-hidden="true" />
            : <FaSortDown className="flex-shrink-0 text-brand-600" size={12} aria-hidden="true" />
    }

    return (
        <div className="flex flex-col gap-4">
            {/* REQ-LOC-FE-F-007 – internal tab bar */}
            <div className="flex gap-1 border-b border-gray-200">
                <button
                    type="button"
                    onClick={() => setActiveTab('schedule')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'schedule'
                        ? 'border-brand-500 text-brand-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Schedule
                </button>
                <button
                    type="button"
                    onClick={handleHistoricalTab}
                    disabled={!importRecord}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors disabled:opacity-40 ${activeTab === 'historical'
                        ? 'border-brand-500 text-brand-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Previously Included
                </button>
            </div>

            {/* ---- Schedule tab ---- */}
            {activeTab === 'schedule' && (
                <>
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
                            {pendingChanges && (
                                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                                    Unsaved changes
                                </span>
                            )}
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
                            <label className="flex items-center gap-2 text-sm text-gray-600">
                                <span>Schedule Type</span>
                                <select
                                    aria-label="Schedule Type"
                                    multiple
                                    value={selectedScheduleTypes}
                                    onChange={(e) => {
                                        const values = Array.from(e.target.selectedOptions).map((o) => o.value as ScheduleType)
                                        setSelectedScheduleTypes(values.length > 0 ? values : ['Location'])
                                    }}
                                    className="border border-gray-200 bg-white px-1 py-0.5 text-sm rounded focus:outline-none focus:ring-0 min-w-[180px]"
                                >
                                    <option value="Location">Location</option>
                                    <option value="Asset">Asset</option>
                                    <option value="Vehicle">Vehicle</option>
                                    <option value="Yachts">Yachts</option>
                                </select>
                            </label>
                            {reverting && <span className="text-sm text-gray-500">Reverting…</span>}
                            <label className="flex items-center gap-2 text-sm text-gray-600">
                                <span>{createRowsLabel}</span>
                                <select
                                    aria-label={createRowsLabel}
                                    value={createRows ? 'Yes' : 'No'}
                                    onChange={(e) => setCreateRows(e.target.value === 'Yes')}
                                    className="border-0 bg-transparent px-1 py-0.5 text-sm focus:outline-none focus:ring-0"
                                >
                                    <option value="No">No</option>
                                    <option value="Yes">Yes</option>
                                </select>
                            </label>
                            {pendingChanges && (
                                <button
                                    type="button"
                                    aria-label="Save"
                                    disabled={saving}
                                    onClick={handleSave}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"
                                >
                                    <FiSave size={14} />
                                    {saving ? 'Saving…' : 'Save'}
                                </button>
                            )}
                            {editable && quoteId && (
                                <>
                                    <button
                                        type="button"
                                        aria-label="Add location"
                                        onClick={handleAddLocation}
                                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                                    >
                                        <FiPlus size={14} />
                                        Add Location
                                    </button>
                                    <button
                                        type="button"
                                        aria-label="Calculate all"
                                        disabled={calculatingAll}
                                        onClick={handleCalculateAll}
                                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded border border-amber-400 text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                                    >
                                        <FiZap size={14} />
                                        {calculatingAll ? 'Calculating…' : 'Calculate All'}
                                    </button>
                                    <button
                                        type="button"
                                        aria-label="Save version"
                                        disabled={savingVersion}
                                        onClick={handleSaveVersion}
                                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"
                                    >
                                        <FiSave size={14} />
                                        {savingVersion ? 'Saving…' : 'Save Version'}
                                    </button>
                                </>
                            )}
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

                    {/* REQ-LOC-FE-F-002 / F-006 – schedule table */}
                    {selectedScheduleTypes.map((scheduleType) => {
                        const columns = columnsForScheduleType(scheduleType)
                        const typeRows = rowsByType[scheduleType]
                        const needsLocation = scheduleType === 'Location'
                        const needsAssetName = scheduleType !== 'Location'
                        return (
                            <div key={scheduleType} className="table-wrapper rounded-lg shadow-sm">
                                <div className="px-3 py-2 text-sm font-semibold text-gray-700 border-b border-gray-200">{scheduleType} Schedule</div>
                                <table className="app-table">
                                    <colgroup>
                                        <col style={{ width: 44 }} />
                                        {columns.map((c) => (
                                            <col key={c.key} style={{ width: getScheduleWidth(c.key) }} />
                                        ))}
                                        <col style={{ width: 44 }} />
                                    </colgroup>
                                    <thead>
                                        <tr>
                                            <th style={{ width: 44 }}>
                                                <button
                                                    type="button"
                                                    aria-label="Add row"
                                                    onClick={() => { setShowInlineAddType(scheduleType); setNewRow({ assetType: scheduleType, asset_type: scheduleType, assetName: '' }) }}
                                                    className="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100"
                                                >
                                                    <FiPlus size={13} />
                                                </button>
                                            </th>
                                            {columns.map((c) => (
                                                <th key={`${scheduleType}-${c.key}`} style={{ position: 'relative' }} className="cursor-pointer select-none">
                                                    <span className="inline-flex items-center" onClick={() => toggleSort('schedule', c.key)}>
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
                                                        <SortIcon active={scheduleSort.key === c.key} direction={scheduleSort.direction} />
                                                    </span>
                                                    <span
                                                        className="col-resizer"
                                                        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'col-resize', zIndex: 1 }}
                                                        onMouseDown={(e) => startResizeSchedule(c.key, e)}
                                                    />
                                                </th>
                                            ))}
                                            <th style={{ width: 44 }} />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {showInlineAddType === scheduleType && (
                                            <tr>
                                                <td>
                                                    <div className="flex gap-1">
                                                        <button
                                                            type="button"
                                                            aria-label="Confirm add row"
                                                            disabled={(needsLocation && !newRow.location?.trim()) || (needsAssetName && !newRow.assetName?.trim())}
                                                            onClick={() => handleConfirmAdd(scheduleType)}
                                                            className="text-green-600 disabled:opacity-40"
                                                        >
                                                            <FiCheck size={14} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            aria-label="Cancel add row"
                                                            onClick={() => { setShowInlineAddType(null); setNewRow({}) }}
                                                            className="text-gray-400 hover:text-gray-600"
                                                        >
                                                            <FiX size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                                {columns.map((c) => {
                                                    if (c.key === 'sumInsuredCurrency' || c.key === 'premiumCurrency') {
                                                        return (
                                                            <td key={c.key}>
                                                                <select
                                                                    aria-label={c.label}
                                                                    value={String(newRow[c.key] ?? '')}
                                                                    onChange={(e) => setNewRow((prev) => ({ ...prev, [c.key]: e.target.value }))}
                                                                    className="w-full text-sm border-0 bg-transparent px-1.5 py-0.5 focus:outline-none focus:ring-0"
                                                                >
                                                                    <option value="">Select…</option>
                                                                    {currencyOptions.map((currency) => (
                                                                        <option key={currency} value={currency}>{currency}</option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                        )
                                                    }
                                                    return (
                                                        <td key={c.key}>
                                                            <input
                                                                aria-label={c.label}
                                                                type="text"
                                                                value={String(newRow[c.key] ?? '')}
                                                                onChange={(e) => setNewRow((prev) => ({ ...prev, [c.key]: e.target.value }))}
                                                                className="w-full text-sm border-0 bg-transparent px-1.5 py-0.5 focus:outline-none focus:ring-0"
                                                            />
                                                        </td>
                                                    )
                                                })}
                                                <td />
                                            </tr>
                                        )}

                                        {typeRows.length === 0 && showInlineAddType !== scheduleType ? (
                                            <tr>
                                                <td colSpan={columns.length + 2} className="text-center text-gray-400 py-6 text-sm">No rows for {scheduleType} schedule.</td>
                                            </tr>
                                        ) : (
                                            typeRows.map((row, idx) => {
                                                const sourceIndex = rows.findIndex((r) => r === row)
                                                const safeIndex = sourceIndex >= 0 ? sourceIndex : idx
                                                const rowObj = row as Record<string, unknown>
                                                return (
                                                    <tr key={`${scheduleType}-${idx}`}>
                                                        <td />
                                                        {columns.map((c) => {
                                                            if (c.key === 'sumInsuredCurrency' || c.key === 'premiumCurrency') {
                                                                return (
                                                                    <td key={c.key}>
                                                                        <select
                                                                            aria-label={c.label}
                                                                            value={getCellValue(rowObj, c.key)}
                                                                            onChange={(e) => {
                                                                                const value = e.target.value
                                                                                setRows((prev) => prev.map((r, i) => (i === safeIndex ? { ...r, [c.key]: value, currency: value } : r)))
                                                                                setPendingChanges(true)
                                                                            }}
                                                                            className="w-full text-sm border-0 bg-transparent px-1.5 py-0.5 focus:outline-none focus:ring-0"
                                                                        >
                                                                            <option value="">Select…</option>
                                                                            {currencyOptions.map((currency) => (
                                                                                <option key={currency} value={currency}>{currency}</option>
                                                                            ))}
                                                                        </select>
                                                                    </td>
                                                                )
                                                            }
                                                            return (
                                                                <td key={c.key}>
                                                                    <input
                                                                        aria-label={c.label}
                                                                        type="text"
                                                                        value={getCellValue(rowObj, c.key)}
                                                                        onChange={(e) => {
                                                                            const value = e.target.value
                                                                            setRows((prev) => prev.map((r, i) => (i === safeIndex ? { ...r, [c.key]: value } : r)))
                                                                            setPendingChanges(true)
                                                                        }}
                                                                        className="w-full text-sm border-0 bg-transparent px-1.5 py-0.5 focus:outline-none focus:ring-0"
                                                                    />
                                                                </td>
                                                            )
                                                        })}
                                                        <td>
                                                            <button
                                                                type="button"
                                                                aria-label="Delete row"
                                                                onClick={() => handleDeleteRow(safeIndex)}
                                                                className="text-gray-400 hover:text-red-500"
                                                            >
                                                                <FiTrash2 size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )
                    })}
                </>
            )}

            {/* REQ-LOC-FE-F-008 — Hierarchical grid (Country → State → rows) */}
            {activeTab === 'schedule' && quoteId && filteredLocationRows.length > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                    <h3 className="text-sm font-semibold text-gray-700">Coverage Rows</h3>
                    {Array.from(groupByCountryState(filteredLocationRows)).map(([country, stateMap]) => {
                        const countryCollapsed = collapsedCountries.has(country)
                        return (
                            <div key={country} className="border border-gray-200 rounded-lg overflow-hidden">
                                {/* Country header */}
                                <button
                                    type="button"
                                    onClick={() => setCollapsedCountries((prev) => {
                                        const next = new Set(prev)
                                        if (next.has(country)) next.delete(country)
                                        else next.add(country)
                                        return next
                                    })}
                                    className="w-full flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-150 text-sm font-semibold text-gray-800"
                                >
                                    {countryCollapsed ? <FiChevronRight size={14} /> : <FiChevronDown size={14} />}
                                    {country}
                                </button>

                                {!countryCollapsed && Array.from(stateMap).map(([state, stateRows]) => {
                                    const stateKey = `${country}::${state}`
                                    const stateCollapsed = collapsedStates.has(stateKey)
                                    return (
                                        <div key={stateKey}>
                                            {/* State header */}
                                            <button
                                                type="button"
                                                onClick={() => setCollapsedStates((prev) => {
                                                    const next = new Set(prev)
                                                    if (next.has(stateKey)) next.delete(stateKey)
                                                    else next.add(stateKey)
                                                    return next
                                                })}
                                                className="w-full flex items-center gap-2 px-6 py-1.5 bg-gray-50 hover:bg-gray-100 text-xs font-medium text-gray-600"
                                            >
                                                {stateCollapsed ? <FiChevronRight size={12} /> : <FiChevronDown size={12} />}
                                                {state || '(No State)'}
                                            </button>

                                            {!stateCollapsed && (
                                                <div className="overflow-x-auto">
                                                    <table className="app-table w-full text-xs">
                                                        <thead>
                                                            <tr>
                                                                <th>Asset Type</th>
                                                                <th>Asset Name</th>
                                                                <th>Location</th>
                                                                <th>Section</th>
                                                                <th>Coverage Type</th>
                                                                <th>Coverage Element</th>
                                                                <th>Schedule ID</th>
                                                                <th>Sum Insured Currency</th>
                                                                <th>Sum Insured</th>
                                                                <th>Sum Insured Movement</th>
                                                                <th>Rate %</th>
                                                                <th>Premium Currency</th>
                                                                <th>Annual Rated Gross Premium</th>
                                                                <th>Annual Rated Gross Premium Movement</th>
                                                                {editable && <th style={{ width: 120 }}>Actions</th>}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {stateRows.map((row) => (
                                                                <tr key={`${row.location_id}-${row.coverage_id ?? 'loc'}`}>
                                                                    <td>
                                                                        <select
                                                                            aria-label="Asset Type"
                                                                            value={String((row as unknown as Record<string, unknown>).asset_type ?? 'Location')}
                                                                            disabled={!editable}
                                                                            onChange={(e) => {
                                                                                const value = e.target.value
                                                                                setLocationRows((prev) => prev.map((r) => (
                                                                                    r.location_id === row.location_id && r.coverage_id === row.coverage_id
                                                                                        ? { ...r, asset_type: value } as QuoteLocationRow
                                                                                        : r
                                                                                )))
                                                                            }}
                                                                            className="w-full text-xs border-0 bg-transparent px-1 py-0.5 focus:outline-none focus:ring-0 disabled:bg-transparent"
                                                                        >
                                                                            <option value="Location">Location</option>
                                                                            <option value="Asset">Asset</option>
                                                                        </select>
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            aria-label="Asset Name"
                                                                            type="text"
                                                                            value={String((row as unknown as Record<string, unknown>).asset_name ?? (row as unknown as Record<string, unknown>).assetName ?? '')}
                                                                            disabled={!editable || String((row as unknown as Record<string, unknown>).asset_type ?? 'Location').toLowerCase() !== 'asset'}
                                                                            onChange={(e) => {
                                                                                const value = e.target.value
                                                                                setLocationRows((prev) => prev.map((r) => (
                                                                                    r.location_id === row.location_id && r.coverage_id === row.coverage_id
                                                                                        ? { ...r, asset_name: value, assetName: value } as QuoteLocationRow
                                                                                        : r
                                                                                )))
                                                                            }}
                                                                            className="w-full text-xs border-0 bg-transparent px-1 py-0.5 focus:outline-none focus:ring-0 disabled:bg-transparent"
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            aria-label="Location"
                                                                            type="text"
                                                                            value={row.location_name ?? ''}
                                                                            disabled={!editable || String((row as unknown as Record<string, unknown>).asset_type ?? 'Location').toLowerCase() !== 'location'}
                                                                            onChange={(e) => {
                                                                                const value = e.target.value
                                                                                setLocationRows((prev) => prev.map((r) => (
                                                                                    r.location_id === row.location_id && r.coverage_id === row.coverage_id
                                                                                        ? { ...r, location_name: value }
                                                                                        : r
                                                                                )))
                                                                            }}
                                                                            onBlur={(e) => {
                                                                                void handlePersistLocationName(row.location_id, e.target.value)
                                                                            }}
                                                                            className="w-full text-xs border-0 bg-transparent px-1 py-0.5 focus:outline-none focus:ring-0 disabled:bg-transparent"
                                                                        />
                                                                    </td>
                                                                    <td>{row.section_id ?? ''}</td>
                                                                    <td>{row.coverage_type ?? ''}</td>
                                                                    <td>{row.coverage_sub_type ?? ''}</td>
                                                                    <td>{row.rating_schedule_id ?? ''}</td>
                                                                    <td>
                                                                        <select
                                                                            aria-label="Sum Insured Currency"
                                                                            value={String((row as unknown as Record<string, unknown>).sum_insured_currency ?? row.currency ?? '')}
                                                                            disabled={!editable}
                                                                            onChange={(e) => {
                                                                                const value = e.target.value
                                                                                setLocationRows((prev) => prev.map((r) => (
                                                                                    r.location_id === row.location_id && r.coverage_id === row.coverage_id
                                                                                        ? { ...r, sum_insured_currency: value, currency: value } as QuoteLocationRow
                                                                                        : r
                                                                                )))
                                                                            }}
                                                                            className="w-full text-xs border-0 bg-transparent px-1 py-0.5 focus:outline-none focus:ring-0 disabled:bg-transparent"
                                                                        >
                                                                            <option value="">Select…</option>
                                                                            {currencyOptions.map((currency) => (
                                                                                <option key={currency} value={currency}>{currency}</option>
                                                                            ))}
                                                                        </select>
                                                                    </td>
                                                                    <td>{row.sum_insured != null ? row.sum_insured.toLocaleString() : ''}</td>
                                                                    <td>{String((row as unknown as Record<string, unknown>).sum_insured_movement ?? '')}</td>
                                                                    <td>{row.rate_percent != null ? `${row.rate_percent}%` : ''}</td>
                                                                    <td>
                                                                        <select
                                                                            aria-label="Premium Currency"
                                                                            value={String((row as unknown as Record<string, unknown>).premium_currency ?? row.currency ?? '')}
                                                                            disabled={!editable}
                                                                            onChange={(e) => {
                                                                                const value = e.target.value
                                                                                setLocationRows((prev) => prev.map((r) => (
                                                                                    r.location_id === row.location_id && r.coverage_id === row.coverage_id
                                                                                        ? { ...r, premium_currency: value, currency: value } as QuoteLocationRow
                                                                                        : r
                                                                                )))
                                                                            }}
                                                                            className="w-full text-xs border-0 bg-transparent px-1 py-0.5 focus:outline-none focus:ring-0 disabled:bg-transparent"
                                                                        >
                                                                            <option value="">Select…</option>
                                                                            {currencyOptions.map((currency) => (
                                                                                <option key={currency} value={currency}>{currency}</option>
                                                                            ))}
                                                                        </select>
                                                                    </td>
                                                                    <td>{row.annual_risk_gross_premium != null ? row.annual_risk_gross_premium.toLocaleString() : ''}</td>
                                                                    <td>{String((row as unknown as Record<string, unknown>).annual_risk_gross_premium_movement ?? '')}</td>
                                                                    {editable && (
                                                                        <td>
                                                                            <div className="flex items-center gap-1">
                                                                                {row.coverage_id != null && row.rating_schedule_id != null && (
                                                                                    <button
                                                                                        type="button"
                                                                                        aria-label="Calculate"
                                                                                        onClick={() => handleCalculateRow(row.coverage_id!, row.rating_schedule_id!)}
                                                                                        className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded border border-amber-300 text-amber-700 hover:bg-amber-50"
                                                                                    >
                                                                                        <FiZap size={10} />
                                                                                        Calculate
                                                                                    </button>
                                                                                )}
                                                                                <button
                                                                                    type="button"
                                                                                    aria-label="Delete location"
                                                                                    onClick={() => handleDeleteLocationRow(row.location_id)}
                                                                                    className="text-gray-400 hover:text-red-500"
                                                                                >
                                                                                    <FiTrash2 size={12} />
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* ---- Previously Included tab ---- */}
            {activeTab === 'historical' && (
                <div className="flex flex-col gap-4">
                    {historicalLoading ? (
                        <p className="text-sm text-gray-500 py-4">Loading previously included locations…</p>
                    ) : selectedScheduleTypes.every((type) => historicalByType[type].length === 0) ? (
                        <p className="text-sm text-gray-500 py-4">No previously included locations.</p>
                    ) : (
                        selectedScheduleTypes.map((scheduleType) => {
                            const columns = columnsForScheduleType(scheduleType)
                            const typeRows = historicalByType[scheduleType]
                            if (typeRows.length === 0) return null
                            return (
                                <div key={`historical-${scheduleType}`} className="table-wrapper rounded-lg shadow-sm">
                                    <div className="px-3 py-2 text-sm font-semibold text-gray-700 border-b border-gray-200">{scheduleType} Schedule</div>
                                    <table className="app-table">
                                        <colgroup>
                                            {columns.map((c) => (
                                                <col key={c.key} style={{ width: getHistoricalWidth(c.key) }} />
                                            ))}
                                        </colgroup>
                                        <thead>
                                            <tr>
                                                {columns.map((c) => (
                                                    <th key={`${scheduleType}-${c.key}`} style={{ position: 'relative' }} className="cursor-pointer select-none">
                                                        <span className="inline-flex items-center" onClick={() => toggleSort('historical', c.key)}>
                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {c.label}
                                                            </span>
                                                            <SortIcon active={historicalSort.key === c.key} direction={historicalSort.direction} />
                                                        </span>
                                                        <span
                                                            className="col-resizer"
                                                            style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'col-resize', zIndex: 1 }}
                                                            onMouseDown={(e) => startResizeHistorical(c.key, e)}
                                                        />
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {typeRows.map((row, idx) => (
                                                <tr key={`${scheduleType}-${idx}`}>
                                                    {columns.map((c) => (
                                                        <td key={c.key}>
                                                            {getCellValue(row as Record<string, unknown>, c.key)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        })
                    )}
                </div>
            )}
        </div>
    )
}
