/**
 * ReportCreatePage — REQ-RPT-FE-F-011 to F-019
 *
 * Create or edit a report template.
 * Route: /reports/create  |  /reports/edit/:id
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiPlus, FiX, FiArrowUp, FiArrowDown, FiSearch, FiSave } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import { useSidebarSection } from '@/shell/SidebarContext'
import type { SidebarSection } from '@/shell/SidebarContext'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import Card from '@/shared/Card/Card'
import { brandColors } from '@/shared/lib/design-tokens/brandColors'
import {
    getReportTemplate,
    getFieldMappings,
    getDateBasisOptions,
    createReportTemplate,
    updateReportTemplate,
    type CreateReportTemplateInput,
    type ReportFilter,
    type FieldMapping,
    type SelectedField,
} from '../reporting.service'

const DATA_SOURCES = [
    { key: 'submissions', label: 'Submissions' },
    { key: 'quotes', label: 'Quotes' },
    { key: 'policies', label: 'Policies' },
    { key: 'policyTransactions', label: 'Policy Transactions' },
    { key: 'bindingAuthorities', label: 'Binding Authorities' },
    { key: 'parties', label: 'Parties' },
    { key: 'claims', label: 'Claims' },
]

const OPERATORS = [
    'equals', 'not_equals', 'contains', 'not_contains',
    'starts_with', 'ends_with', 'greater_than', 'less_than', 'in',
]

const SORT_ORDERS = ['asc', 'desc'] as const

const EMPTY_FORM: CreateReportTemplateInput = {
    name: '',
    description: '',
    data_source: '',
    date_basis: '',
    date_from: '',
    date_to: '',
    sort_by: '',
    sort_order: 'asc',
    fields: [],
    filters: [{ group: 1, field: '', operator: 'equals', value: '' }],
}

// ---------------------------------------------------------------------------
function normalizeSelectedFields(value: unknown): SelectedField[] {
    if (!Array.isArray(value)) return []
    return value.filter((item): item is SelectedField => (
        Boolean(item)
        && typeof item === 'object'
        && typeof (item as SelectedField).id === 'string'
        && typeof (item as SelectedField).label === 'string'
    ))
}

function normalizeFilters(value: unknown): ReportFilter[] {
    if (!Array.isArray(value) || value.length === 0) return [{ group: 1, field: '', operator: 'equals', value: '' }]
    return value.map((item, index) => {
        const filter = (item ?? {}) as Partial<ReportFilter>
        return {
            connector: index === 0 ? undefined : (filter.connector === 'OR' ? 'OR' : 'AND'),
            group: typeof filter.group === 'number' && Number.isFinite(filter.group) ? filter.group : 1,
            field: typeof filter.field === 'string' ? filter.field : '',
            operator: typeof filter.operator === 'string' ? filter.operator : 'equals',
            value: Array.isArray(filter.value)
                ? filter.value.map((entry) => String(entry))
                : typeof filter.value === 'string'
                    ? filter.value
                    : '',
        }
    })
}

function FilterFieldPicker({
    options,
    value,
    onChange,
}: {
    options: FieldMapping[]
    value: string
    onChange: (fieldKey: string) => void
}) {
    const selected = options.find((option) => option.key === value)
    const [query, setQuery] = useState(selected ? `${selected.label} (${selected.domain})` : '')
    const [open, setOpen] = useState(false)

    useEffect(() => {
        if (!open) setQuery(selected ? `${selected.label} (${selected.domain})` : '')
    }, [open, selected])

    const filtered = options.filter((option) => {
        const search = query.trim().toLowerCase()
        if (!search) return true
        return option.label.toLowerCase().includes(search) || option.domain.toLowerCase().includes(search)
    })

    return (
        <div className="relative flex-1">
            <input
                type="text"
                placeholder="Search field or domain"
                value={query}
                onFocus={() => setOpen(true)}
                onChange={(e) => {
                    setQuery(e.target.value)
                    setOpen(true)
                }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
            {open && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded border border-gray-300 bg-white shadow-lg max-h-48 overflow-y-auto">
                    {filtered.map((option) => (
                        <button
                            key={`${option.key}::${option.domain}`}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                onChange(option.key)
                                setQuery(`${option.label} (${option.domain})`)
                                setOpen(false)
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                        >
                            {option.label} ({option.domain})
                        </button>
                    ))}
                    {filtered.length === 0 && (
                        <p className="px-3 py-2 text-sm text-gray-400">No matching fields</p>
                    )}
                </div>
            )}
        </div>
    )
}

// FilterValueInput — searchable creatable input with optional token mode
// ---------------------------------------------------------------------------

function FilterValueInput({
    options,
    value,
    multiple,
    onChange,
}: {
    options: string[]
    value: string | string[]
    multiple: boolean
    onChange: (v: string | string[]) => void
}) {
    const [search, setSearch] = useState('')
    const [open, setOpen] = useState(false)
    const values = Array.isArray(value) ? value : value ? [value] : []
    const filtered = (search || open)
        ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
        : options

    function commitValue(rawValue: string) {
        const nextValue = rawValue.trim()
        if (!nextValue) return
        if (multiple) {
            if (!values.includes(nextValue)) onChange([...values, nextValue])
            setSearch('')
            setOpen(false)
            return
        }
        onChange(nextValue)
        setSearch(nextValue)
        setOpen(false)
    }

    function removeValue(target: string) {
        if (!multiple) {
            onChange('')
            setSearch('')
            return
        }
        onChange(values.filter((entry) => entry !== target))
    }

    return (
        <div className="relative flex-1">
            <div className="border border-gray-300 rounded bg-white px-2 py-1.5 min-h-[42px] flex flex-wrap items-center gap-1">
                {multiple && values.map((entry) => (
                    <span key={entry} className="inline-flex items-center gap-1 rounded-full bg-brand-50 text-brand-700 px-2 py-0.5 text-xs">
                        {entry}
                        <button type="button" onClick={() => removeValue(entry)} className="text-brand-700 hover:text-brand-900">
                            <FiX size={12} />
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    placeholder="Search or add value"
                    value={multiple ? search : typeof value === 'string' ? value : search}
                    onFocus={() => setOpen(true)}
                    onChange={(e) => {
                        const next = e.target.value
                        setSearch(next)
                        if (!multiple) onChange(next)
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault()
                            commitValue(multiple ? search : String(value ?? search))
                        }
                    }}
                    className="flex-1 min-w-[140px] border-0 focus:outline-none text-sm px-1 py-1"
                />
                <button
                    type="button"
                    onClick={() => commitValue(multiple ? search : String(value ?? search))}
                    className="text-xs font-medium text-brand-700 hover:text-brand-900 px-1"
                >
                    Add
                </button>
            </div>
            {open && (filtered.length > 0 || search.trim()) && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg">
                    <div className="max-h-40 overflow-y-auto">
                        {search.trim() && !filtered.some((option) => option.toLowerCase() === search.trim().toLowerCase()) && (
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => commitValue(search)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100"
                            >
                                Add "{search.trim()}"
                            </button>
                        )}
                        {filtered.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => commitValue(option)}
                                className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-sm"
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// ---------------------------------------------------------------------------

export default function ReportCreatePage() {
    const navigate = useNavigate()
    const { id } = useParams<{ id: string }>()
    const isEdit = id !== undefined
    const { addNotification } = useNotifications()

    const [form, setForm] = useState<CreateReportTemplateInput>(EMPTY_FORM)
    const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
    const [dateBasisOptions, setDateBasisOptions] = useState<string[]>([])
    const [loadingTemplate, setLoadingTemplate] = useState(isEdit)
    const [saving, setSaving] = useState(false)
    const [fieldSearch, setFieldSearch] = useState('')
    const [loadingFields, setLoadingFields] = useState(true)

    const sidebarSection = useMemo<SidebarSection>(() => ({
        title: 'Reporting',
        items: [{ label: 'Save', icon: FiSave, event: 'reporting:save' }],
    }), [])
    useSidebarSection(sidebarSection)

    useEffect(() => {
        getDateBasisOptions()
            .then(setDateBasisOptions)
            .catch(() => setDateBasisOptions([]))
    }, [])

    useEffect(() => {
        const handleSidebarSave = () => { void handleSave() }
        window.addEventListener('reporting:save', handleSidebarSave)
        return () => window.removeEventListener('reporting:save', handleSidebarSave)
    })

    // Load field mappings for ALL data sources on mount — domain shown inline per field
    useEffect(() => {
        setLoadingFields(true)
        Promise.all(DATA_SOURCES.map((s) => getFieldMappings(s.key).catch(() => [] as FieldMapping[])))
            .then((results) => {
                const seen = new Set<string>()
                const merged = results.flatMap((fields, index) => fields.map((field) => ({
                    ...field,
                    domain: field.domain ?? DATA_SOURCES[index].label,
                }))).filter((f) => {
                    const k = `${f.key}::${f.domain}`
                    if (seen.has(k)) return false
                    seen.add(k)
                    return true
                })
                setFieldMappings(merged)
            })
            .finally(() => setLoadingFields(false))
    }, [])

    useEffect(() => {
        if (!isEdit) return
        setLoadingTemplate(true)
        getReportTemplate(parseInt(id!, 10))
            .then((t) => {
                if (t.type === 'dashboard') {
                    navigate(`/dashboards/edit/${t.id}`)
                    return
                }
                setForm({
                    name: t.name,
                    description: t.description ?? '',
                    data_source: t.data_source ?? '',
                    date_basis: t.date_basis ?? '',
                    date_from: t.date_from ?? '',
                    date_to: t.date_to ?? '',
                    sort_by: t.sort_by ?? '',
                    sort_order: t.sort_order ?? 'asc',
                    fields: normalizeSelectedFields(t.fields),
                    filters: normalizeFilters(t.filters),
                })
            })
            .catch(() => addNotification('Could not load report.', 'error'))
            .finally(() => setLoadingTemplate(false))
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    function setField<K extends keyof CreateReportTemplateInput>(key: K, value: CreateReportTemplateInput[K]) {
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    // --- Two-panel field selection helpers ---
    const selectedFields = normalizeSelectedFields(form.fields)
    const selectedIds = new Set(selectedFields.map((f) => f.id))
    const availableFields = fieldMappings.filter((f) => !selectedIds.has(f.key))
    const filteredAvailable = availableFields.filter((f) => {
        if (!fieldSearch.trim()) return true
        const q = fieldSearch.toLowerCase()
        return f.label.toLowerCase().includes(q) || f.domain.toLowerCase().includes(q)
    })

    function addField(mapping: FieldMapping) {
        setForm((prev) => ({
            ...prev,
            fields: [...(prev.fields ?? []), { id: mapping.key, label: mapping.label, domain: mapping.domain }],
        }))
    }

    function removeField(fieldId: string) {
        setForm((prev) => ({
            ...prev,
            fields: ((prev.fields ?? []) as SelectedField[]).filter((f) => f.id !== fieldId),
        }))
    }

    function moveField(index: number, direction: -1 | 1) {
        setForm((prev) => {
            const fields = [...((prev.fields ?? []) as SelectedField[])]
            const target = index + direction
            if (target < 0 || target >= fields.length) return prev
                ;[fields[index], fields[target]] = [fields[target], fields[index]]
            return { ...prev, fields }
        })
    }

    function addFilter() {
        setForm((prev) => {
            const existing = prev.filters ?? []
            return {
                ...prev,
                filters: [
                    ...existing,
                    {
                        connector: existing.length > 0 ? ('AND' as const) : undefined,
                        group: existing.length > 0 ? ((existing[existing.length - 1]?.group ?? 1)) : 1,
                        field: '',
                        operator: 'equals',
                        value: '',
                    } as ReportFilter,
                ],
            }
        })
    }

    function updateFilter(i: number, patch: Partial<ReportFilter>) {
        setForm((prev) => ({
            ...prev,
            filters: (prev.filters ?? []).map((f, idx) => (idx === i ? { ...f, ...patch } : f)),
        }))
    }

    function removeFilter(i: number) {
        setForm((prev) => {
            if ((prev.filters ?? []).length <= 1) {
                return { ...prev, filters: [{ group: 1, field: '', operator: 'equals', value: '' }] }
            }
            const next = (prev.filters ?? []).filter((_, idx) => idx !== i)
            if (next.length > 0) next[0] = { ...next[0], connector: undefined, group: next[0].group ?? 1 }
            return { ...prev, filters: next }
        })
    }

    function moveFilter(i: number, direction: -1 | 1) {
        setForm((prev) => {
            const filters = [...(prev.filters ?? [])]
            const target = i + direction
            if (target < 0 || target >= filters.length) return prev
                ;[filters[i], filters[target]] = [filters[target], filters[i]]
            // Keep first row connector-free; ensure rows 1+ have a connector
            filters[0] = { ...filters[0], connector: undefined, group: filters[0].group ?? 1 }
            for (let j = 1; j < filters.length; j++) {
                if (!filters[j].connector || (filters[j].connector !== 'AND' && filters[j].connector !== 'OR')) {
                    filters[j] = { ...filters[j], connector: 'AND' }
                }
                if (!filters[j].group) filters[j] = { ...filters[j], group: filters[j - 1]?.group ?? 1 }
            }
            return { ...prev, filters }
        })
    }

    function buildSavePayload(): CreateReportTemplateInput {
        const filters = normalizeFilters(form.filters).filter((filter) => {
            const hasValue = Array.isArray(filter.value)
                ? filter.value.some((entry) => entry.trim().length > 0)
                : filter.value.trim().length > 0
            return filter.field.trim().length > 0 && hasValue
        })

        return {
            ...form,
            fields: normalizeSelectedFields(form.fields),
            filters,
        }
    }

    async function handleSave() {
        if (!form.name.trim()) {
            addNotification('Report Name is required.', 'error')
            return
        }
        if (!(form.description ?? '').trim()) {
            addNotification('Description is required.', 'error')
            return
        }
        setSaving(true)
        try {
            const payload = buildSavePayload()
            if (isEdit) {
                await updateReportTemplate(parseInt(id!, 10), payload)
                addNotification('Report updated.', 'success')
            } else {
                await createReportTemplate(payload)
                addNotification('Report created.', 'success')
            }
            navigate('/reports')
        } catch {
            addNotification('Could not save report.', 'error')
        } finally {
            setSaving(false)
        }
    }

    if (loadingTemplate) return <LoadingSpinner />

    return (
        <div className="p-6 flex flex-col gap-6" aria-busy={saving}>
            <h2 className="text-2xl font-semibold text-gray-900">
                {isEdit ? 'Edit Report' : 'Create Report'}
            </h2>

            <Card>
                <div className="p-6 flex flex-col gap-5">
                    {/* Basic info */}
                    <h3 className="text-base font-semibold text-gray-700">Basic Info</h3>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="rpt-name" className="text-sm font-medium text-gray-700">
                            Report Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="rpt-name"
                            type="text"
                            value={form.name}
                            onChange={(e) => setField('name', e.target.value)}
                            className="border border-gray-300 rounded px-3 py-2 text-sm"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="rpt-desc" className="text-sm font-medium text-gray-700">
                            Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="rpt-desc"
                            value={form.description ?? ''}
                            onChange={(e) => setField('description', e.target.value)}
                            rows={2}
                            className="border border-gray-300 rounded px-3 py-2 text-sm resize-none"
                        />
                    </div>

                    {/* Two-panel field selection — REQ-RPT-FE-F-013: always visible; all domains loaded on mount */}
                    <h3 className="text-base font-semibold text-gray-700">Field Selection</h3>
                    {/* 4-cell grid: row 1 = aligned headings, row 2 = aligned tables */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                        {/* Row 1, col 1 — Available Fields heading + inline search */}
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-700 whitespace-nowrap flex-shrink-0">Available Fields</p>
                            <div className="relative flex-1">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                                <input
                                    type="text"
                                    placeholder="Search fields or domain…"
                                    value={fieldSearch}
                                    onChange={(e) => setFieldSearch(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md pl-8 pr-3 py-1.5 text-sm"
                                    data-testid="field-search"
                                />
                            </div>
                        </div>
                        {/* Row 1, col 2 — Selected Fields heading */}
                        <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-700">
                                Selected Fields ({selectedFields.length})
                            </p>
                        </div>
                        {/* Row 2, col 1 — Available Fields table */}
                        <div data-testid="available-fields" className="border border-gray-300 rounded-md max-h-80 overflow-y-auto">
                            <table className="app-table min-w-full">
                                <thead className="sticky top-0" style={{ backgroundColor: brandColors.table.headerBg }}>
                                    <tr>
                                        <th className="text-left px-3 py-2 font-medium text-white">Field</th>
                                        <th className="text-left px-3 py-2 font-medium text-white">Domain</th>
                                        <th className="px-3 py-2 w-16"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingFields ? (
                                        <tr>
                                            <td colSpan={3} className="px-3 py-6 text-center text-gray-400 text-sm">
                                                Loading fields…
                                            </td>
                                        </tr>
                                    ) : filteredAvailable.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-3 py-4 text-gray-400 text-center text-sm">
                                                {availableFields.length === 0 ? 'All fields selected' : 'No fields match search'}
                                            </td>
                                        </tr>
                                    ) : filteredAvailable.map((f) => (
                                        <tr key={`${f.key}-${f.domain}`} className="border-t border-gray-100 hover:bg-gray-50">
                                            <td className="px-3 py-1.5 text-sm">{f.label}</td>
                                            <td className="px-3 py-1.5 text-sm text-gray-500">{f.domain}</td>
                                            <td className="px-3 py-1.5 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => addField(f)}
                                                    className="p-2 text-brand-500 hover:text-brand-700 hover:bg-brand-50 rounded"
                                                    title="Add field"
                                                >
                                                    <FiPlus size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Row 2, col 2 — Selected Fields table */}
                        <div data-testid="selected-fields" className="border border-gray-300 rounded-md max-h-80 min-h-[200px] overflow-y-auto">
                            <table className="app-table min-w-full">
                                <thead className="sticky top-0" style={{ backgroundColor: brandColors.table.headerBg }}>
                                    <tr>
                                        <th className="px-3 py-2 w-8 font-medium text-white text-center">#</th>
                                        <th className="text-left px-3 py-2 font-medium text-white">Field</th>
                                        <th className="text-left px-3 py-2 font-medium text-white">Domain</th>
                                        <th className="px-3 py-2 w-28 font-medium text-white text-center">Order</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedFields.map((f, idx) => (
                                        <tr key={f.id} className="border-t border-gray-100 hover:bg-gray-50">
                                            <td className="px-3 py-1.5 text-center text-sm font-mono text-gray-500">{idx + 1}</td>
                                            <td className="px-3 py-1.5 text-sm">{f.label}</td>
                                            <td className="px-3 py-1.5 text-sm text-gray-500">{f.domain}</td>
                                            <td className="px-2 py-1.5">
                                                <div className="flex gap-1 justify-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => moveField(idx, -1)}
                                                        disabled={idx === 0}
                                                        className="inline-flex items-center justify-center w-7 h-7 rounded border border-gray-300 bg-white hover:bg-brand-50 hover:border-brand-400 hover:text-brand-700 text-gray-600 disabled:opacity-25 disabled:cursor-not-allowed"
                                                        title="Move up"
                                                    >
                                                        <FiArrowUp size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => moveField(idx, 1)}
                                                        disabled={idx === selectedFields.length - 1}
                                                        className="inline-flex items-center justify-center w-7 h-7 rounded border border-gray-300 bg-white hover:bg-brand-50 hover:border-brand-400 hover:text-brand-700 text-gray-600 disabled:opacity-25 disabled:cursor-not-allowed"
                                                        title="Move down"
                                                    >
                                                        <FiArrowDown size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeField(f.id)}
                                                        className="inline-flex items-center justify-center w-7 h-7 rounded border border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-400 text-red-500 hover:text-red-700"
                                                        title="Remove"
                                                    >
                                                        <FiX size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {selectedFields.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-3 py-4 text-gray-400 text-center text-sm">
                                                No fields selected — add from the Available Fields panel
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Date range */}
                    <h3 className="text-base font-semibold text-gray-700">Date Range</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1">
                            <label htmlFor="rpt-date-basis" className="text-sm font-medium text-gray-700">Date Basis</label>
                            <select
                                id="rpt-date-basis"
                                value={form.date_basis ?? ''}
                                onChange={(e) => setField('date_basis', e.target.value)}
                                className="border border-gray-300 rounded px-3 py-2 text-sm"
                            >
                                <option value="">— Select —</option>
                                {dateBasisOptions.map((o) => (
                                    <option key={o} value={o}>{o}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label htmlFor="rpt-date-from" className="text-sm font-medium text-gray-700">Date From</label>
                            <input
                                id="rpt-date-from"
                                type="date"
                                value={form.date_from ?? ''}
                                onChange={(e) => setField('date_from', e.target.value)}
                                className="border border-gray-300 rounded px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label htmlFor="rpt-date-to" className="text-sm font-medium text-gray-700">Date To</label>
                            <input
                                id="rpt-date-to"
                                type="date"
                                value={form.date_to ?? ''}
                                onChange={(e) => setField('date_to', e.target.value)}
                                className="border border-gray-300 rounded px-3 py-2 text-sm"
                            />
                        </div>
                    </div>

                    {/* Sort */}
                    <h3 className="text-base font-semibold text-gray-700">Sort</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label htmlFor="rpt-sort-by" className="text-sm font-medium text-gray-700">Sort By</label>
                            <select
                                id="rpt-sort-by"
                                value={form.sort_by ?? ''}
                                onChange={(e) => setField('sort_by', e.target.value)}
                                className="border border-gray-300 rounded px-3 py-2 text-sm"
                            >
                                <option value="">— None —</option>
                                {selectedFields.map((f) => (
                                    <option key={f.id} value={f.id}>{f.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label htmlFor="rpt-sort-order" className="text-sm font-medium text-gray-700">Sort Order</label>
                            <select
                                id="rpt-sort-order"
                                value={form.sort_order ?? 'asc'}
                                onChange={(e) => setField('sort_order', e.target.value as 'asc' | 'desc')}
                                className="border border-gray-300 rounded px-3 py-2 text-sm"
                            >
                                {SORT_ORDERS.map((o) => (
                                    <option key={o} value={o}>{o === 'asc' ? 'Ascending' : 'Descending'}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Filters — REQ-RPT-FE-F-014 */}
                    <div className="flex flex-col gap-3" data-testid="filters-section">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-700">Filters</p>
                            <button
                                type="button"
                                onClick={addFilter}
                                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium"
                            >
                                <FiPlus size={12} />
                                Add Filter
                            </button>
                        </div>
                        {(form.filters ?? []).map((f, i) => {
                            const mapping = fieldMappings.find((m) => m.key === f.field)
                            const lookupValues = mapping?.lookupValues ?? []
                            const isInOp = f.operator === 'in'
                            const filters = form.filters ?? []
                            return (
                                <div key={i} className="flex flex-col gap-1">
                                    {/* AND / OR connector before every row after the first */}
                                    {i > 0 && (
                                        <div className="flex items-center gap-2 pl-1">
                                            <button
                                                type="button"
                                                onClick={() => updateFilter(i, { connector: f.connector === 'OR' ? 'AND' : 'OR' })}
                                                className="text-xs font-semibold px-2 py-0.5 rounded border border-brand-400 bg-brand-50 text-brand-700 hover:bg-brand-100 select-none"
                                                title="Toggle AND / OR"
                                            >
                                                {f.connector ?? 'AND'}
                                            </button>
                                            <label className="text-xs text-gray-500 flex items-center gap-1">
                                                Group
                                                <input
                                                    aria-label="Group"
                                                    type="number"
                                                    min={1}
                                                    value={f.group ?? 1}
                                                    onChange={(e) => updateFilter(i, { group: Math.max(1, parseInt(e.target.value || '1', 10)) })}
                                                    className="w-16 border border-gray-300 rounded px-2 py-1 text-xs"
                                                />
                                            </label>
                                        </div>
                                    )}
                                    <div className="flex gap-2 items-center">
                                        {/* Field select — all loaded field mappings */}
                                        <FilterFieldPicker
                                            options={fieldMappings}
                                            value={f.field}
                                            onChange={(fieldKey) => {
                                                const newMapping = fieldMappings.find((m) => m.key === fieldKey)
                                                updateFilter(i, {
                                                    field: fieldKey,
                                                    operator: newMapping?.type === 'lookup' ? 'in' : 'equals',
                                                    value: newMapping?.type === 'lookup' ? [] : '',
                                                })
                                            }}
                                        />
                                        {/* Operator select */}
                                        <select
                                            value={f.operator}
                                            onChange={(e) => {
                                                const op = e.target.value
                                                updateFilter(i, { operator: op, value: op === 'in' ? [] : '' })
                                            }}
                                            className="border border-gray-300 rounded px-3 py-2 text-sm"
                                        >
                                            {OPERATORS.map((op) => (
                                                <option key={op} value={op}>{op}</option>
                                            ))}
                                        </select>
                                        <FilterValueInput
                                            options={lookupValues}
                                            value={f.value}
                                            multiple={isInOp}
                                            onChange={(nextValue) => updateFilter(i, { value: nextValue })}
                                        />
                                        {/* Move Up */}
                                        <button
                                            type="button"
                                            onClick={() => moveFilter(i, -1)}
                                            disabled={i === 0}
                                            className="inline-flex items-center justify-center w-7 h-7 rounded border border-gray-300 bg-white hover:bg-brand-50 hover:border-brand-400 hover:text-brand-700 text-gray-600 disabled:opacity-25 disabled:cursor-not-allowed"
                                            title="Move up"
                                        >
                                            <FiArrowUp size={14} />
                                        </button>
                                        {/* Move Down */}
                                        <button
                                            type="button"
                                            onClick={() => moveFilter(i, 1)}
                                            disabled={i === filters.length - 1}
                                            className="inline-flex items-center justify-center w-7 h-7 rounded border border-gray-300 bg-white hover:bg-brand-50 hover:border-brand-400 hover:text-brand-700 text-gray-600 disabled:opacity-25 disabled:cursor-not-allowed"
                                            title="Move down"
                                        >
                                            <FiArrowDown size={14} />
                                        </button>
                                        {/* Remove */}
                                        <button
                                            type="button"
                                            onClick={() => removeFilter(i)}
                                            className="text-gray-400 hover:text-gray-600"
                                            title="Remove filter"
                                        >
                                            <FiX size={14} />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Schedule placeholder */}
                    <div className="border border-dashed border-gray-300 rounded-lg p-4">
                        <p className="text-sm text-gray-400 text-center">
                            Scheduled reporting — coming soon.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    )
}
