/**
 * ReportCreatePage — REQ-RPT-FE-F-011 to F-019
 *
 * Create or edit a report template.
 * Route: /reports/create  |  /reports/edit/:id
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiPlus, FiX, FiArrowUp, FiArrowDown } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
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
    'starts_with', 'ends_with', 'greater_than', 'less_than',
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
    filters: [],
}

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

    useEffect(() => {
        getDateBasisOptions()
            .then(setDateBasisOptions)
            .catch(() => setDateBasisOptions([]))
    }, [])

    useEffect(() => {
        if (!isEdit) return
        setLoadingTemplate(true)
        getReportTemplate(parseInt(id!, 10))
            .then((t) => {
                setForm({
                    name: t.name,
                    description: t.description ?? '',
                    data_source: t.data_source ?? '',
                    date_basis: t.date_basis ?? '',
                    date_from: t.date_from ?? '',
                    date_to: t.date_to ?? '',
                    sort_by: t.sort_by ?? '',
                    sort_order: t.sort_order ?? 'asc',
                    fields: t.fields ?? [],
                    filters: t.filters ?? [],
                })
                if (t.data_source) loadFieldMappings(t.data_source)
            })
            .catch(() => addNotification('Could not load report.', 'error'))
            .finally(() => setLoadingTemplate(false))
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    function loadFieldMappings(source: string) {
        if (!source) return setFieldMappings([])
        getFieldMappings(source)
            .then(setFieldMappings)
            .catch(() => setFieldMappings([]))
    }

    function setField<K extends keyof CreateReportTemplateInput>(key: K, value: CreateReportTemplateInput[K]) {
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    function handleDataSourceChange(source: string) {
        setField('data_source', source)
        setField('fields', [])
        loadFieldMappings(source)
    }

    // --- Two-panel field selection helpers ---
    const selectedFields = (form.fields ?? []) as SelectedField[]
    const selectedIds = new Set(selectedFields.map((f) => f.id))
    const availableFields = fieldMappings.filter((f) => !selectedIds.has(f.key))

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
        setForm((prev) => ({
            ...prev,
            filters: [...(prev.filters ?? []), { field: '', operator: 'equals', value: '' }],
        }))
    }

    function updateFilter(i: number, patch: Partial<ReportFilter>) {
        setForm((prev) => ({
            ...prev,
            filters: (prev.filters ?? []).map((f, idx) => (idx === i ? { ...f, ...patch } : f)),
        }))
    }

    function removeFilter(i: number) {
        setForm((prev) => ({
            ...prev,
            filters: (prev.filters ?? []).filter((_, idx) => idx !== i),
        }))
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
        if (!(form.data_source ?? '').trim()) {
            addNotification('Data Source is required.', 'error')
            return
        }
        setSaving(true)
        try {
            if (isEdit) {
                await updateReportTemplate(parseInt(id!, 10), form)
                addNotification('Report updated.', 'success')
            } else {
                await createReportTemplate(form)
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
        <div className="p-6 flex flex-col gap-6">
            <h2 className="text-2xl font-semibold text-gray-900">
                {isEdit ? 'Edit Report' : 'Create Report'}
            </h2>

            <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col gap-5">
                {/* Basic info */}
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

                <div className="flex flex-col gap-1">
                    <label htmlFor="rpt-source" className="text-sm font-medium text-gray-700">
                        Data Source <span className="text-red-500">*</span>
                    </label>
                    <select
                        id="rpt-source"
                        value={form.data_source ?? ''}
                        onChange={(e) => handleDataSourceChange(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                    >
                        <option value="">— Select —</option>
                        {DATA_SOURCES.map((s) => (
                            <option key={s.key} value={s.key}>{s.label}</option>
                        ))}
                    </select>
                </div>

                {/* Two-panel field selection — REQ-RPT-FE-F-013 */}
                {fieldMappings.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Left panel — Available Fields */}
                        <div data-testid="available-fields" className="flex flex-col gap-2">
                            <p className="text-sm font-medium text-gray-700">Available Fields</p>
                            <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="text-left px-3 py-2 font-medium text-gray-600">Field</th>
                                            <th className="text-left px-3 py-2 font-medium text-gray-600">Domain</th>
                                            <th className="px-3 py-2 w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {availableFields.map((f) => (
                                            <tr key={f.key} className="border-t border-gray-100 hover:bg-gray-50">
                                                <td className="px-3 py-1.5">{f.label}</td>
                                                <td className="px-3 py-1.5 text-gray-500">{f.domain}</td>
                                                <td className="px-3 py-1.5 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => addField(f)}
                                                        className="text-brand-600 hover:text-brand-800 text-xs font-medium"
                                                    >
                                                        Add
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {availableFields.length === 0 && (
                                            <tr><td colSpan={3} className="px-3 py-2 text-gray-400 text-center">All fields selected</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Right panel — Selected Fields */}
                        <div data-testid="selected-fields" className="flex flex-col gap-2">
                            <p className="text-sm font-medium text-gray-700">
                                Selected Fields ({selectedFields.length})
                            </p>
                            <div className="border border-gray-200 rounded-lg max-h-96 min-h-[200px] overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="text-left px-3 py-2 font-medium text-gray-600">Field</th>
                                            <th className="text-left px-3 py-2 font-medium text-gray-600">Domain</th>
                                            <th className="px-3 py-2 w-24 font-medium text-gray-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedFields.map((f, idx) => (
                                            <tr key={f.id} className="border-t border-gray-100 hover:bg-gray-50">
                                                <td className="px-3 py-1.5">{f.label}</td>
                                                <td className="px-3 py-1.5 text-gray-500">{f.domain}</td>
                                                <td className="px-3 py-1.5 flex gap-1 justify-center">
                                                    <button type="button" onClick={() => moveField(idx, -1)} disabled={idx === 0}
                                                        className="text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move up">
                                                        <FiArrowUp size={12} />
                                                    </button>
                                                    <button type="button" onClick={() => moveField(idx, 1)} disabled={idx === selectedFields.length - 1}
                                                        className="text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move down">
                                                        <FiArrowDown size={12} />
                                                    </button>
                                                    <button type="button" onClick={() => removeField(f.id)}
                                                        className="text-red-400 hover:text-red-600" title="Remove">
                                                        <FiX size={12} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {selectedFields.length === 0 && (
                                            <tr><td colSpan={3} className="px-3 py-4 text-gray-400 text-center">No fields selected</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Date range */}
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
                    {(form.filters ?? []).map((f, i) => (
                        <div key={i} className="flex gap-2 items-center">
                            <select
                                value={f.field}
                                onChange={(e) => updateFilter(i, { field: e.target.value })}
                                className="border border-gray-300 rounded px-3 py-2 text-sm flex-1"
                            >
                                <option value="">— Field —</option>
                                {selectedFields.map((sf) => (
                                    <option key={sf.id} value={sf.id}>{sf.label}</option>
                                ))}
                            </select>
                            <select
                                value={f.operator}
                                onChange={(e) => updateFilter(i, { operator: e.target.value })}
                                className="border border-gray-300 rounded px-3 py-2 text-sm"
                            >
                                {OPERATORS.map((op) => <option key={op} value={op}>{op}</option>)}
                            </select>
                            <input
                                type="text"
                                placeholder="Value"
                                value={f.value}
                                onChange={(e) => updateFilter(i, { value: e.target.value })}
                                className="border border-gray-300 rounded px-3 py-2 text-sm flex-1"
                            />
                            <button
                                type="button"
                                onClick={() => removeFilter(i)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <FiX size={14} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Schedule placeholder */}
                <div className="border border-dashed border-gray-300 rounded-lg p-4">
                    <p className="text-sm text-gray-400 text-center">
                        Scheduled reporting — coming soon.
                    </p>
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                    >
                        {saving ? 'Saving…' : 'Save Report'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/reports')}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )
}
