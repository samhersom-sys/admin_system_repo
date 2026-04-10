import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FiPlus, FiSave, FiTrash2, FiX } from 'react-icons/fi'
import Card from '@/shared/Card/Card'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import { useNotifications } from '@/shell/NotificationDock'
import { useSidebarSection } from '@/shell/SidebarContext'
import type { SidebarSection } from '@/shell/SidebarContext'
import {
    getFieldMappings,
    getDashboard,
    updateDashboard,
    type DashboardPage,
    type DashboardSection,
    type DashboardWidget,
    type DashboardWidgetType,
    type DashboardChartType,
    type FieldMapping,
} from '@/reporting/reporting.service'
import { DASHBOARD_TEMPLATES } from '@/reporting/DashboardCreatePage/DashboardTemplates'
import { DashboardLiveWidget, createDefaultDashboardFilters } from '@/reporting/dashboardWidgets'

type WidgetEditorState = {
    slotId: number
    sectionId?: number | null
    widget?: DashboardWidget
}

type DashboardFieldOption = FieldMapping & {
    source: string
    compositeKey: string
}

const DATA_SOURCES = [
    { key: 'submissions', label: 'Submissions' },
    { key: 'quotes', label: 'Quotes' },
    { key: 'policies', label: 'Policies' },
    { key: 'policyTransactions', label: 'Policy Transactions' },
    { key: 'bindingAuthorities', label: 'Binding Authorities' },
    { key: 'parties', label: 'Parties' },
    { key: 'claims', label: 'Claims' },
]

const WIDGET_TYPES: Array<{ value: DashboardWidgetType, label: string }> = [
    { value: 'metric', label: 'Metric Card' },
    { value: 'chart', label: 'Chart' },
    { value: 'table', label: 'Table' },
    { value: 'text', label: 'Text / Note' },
]

const CHART_TYPES: Array<{ value: DashboardChartType, label: string }> = [
    { value: 'bar', label: 'Bar' },
    { value: 'line', label: 'Line' },
    { value: 'pie', label: 'Pie' },
    { value: 'doughnut', label: 'Doughnut' },
    { value: 'area', label: 'Area' },
]

const AGGREGATIONS: Array<NonNullable<DashboardWidget['aggregation']>> = ['count', 'sum', 'avg', 'min', 'max']

function makeCompositeKey(source: string, key: string) {
    return `${source}::${key}`
}

function normalizeWidget(widget: Partial<DashboardWidget>): DashboardWidget {
    return {
        id: widget.id ?? `${widget.sectionId ?? 'page'}-${widget.slotId ?? 1}-${Date.now()}`,
        slotId: widget.slotId ?? 1,
        sectionId: widget.sectionId ?? null,
        title: widget.title ?? '',
        type: widget.type ?? 'metric',
        source: widget.source ?? null,
        chartType: widget.chartType ?? 'bar',
        metric: widget.metric ?? null,
        attribute: widget.attribute ?? null,
        yAxisAttribute: widget.yAxisAttribute ?? null,
        legendAttribute: widget.legendAttribute ?? null,
        measures: Array.isArray(widget.measures) ? widget.measures : [],
        attributes: Array.isArray(widget.attributes) ? widget.attributes : [],
        xAxisLabel: widget.xAxisLabel ?? '',
        yAxisLabel: widget.yAxisLabel ?? '',
        categoryLabel: widget.categoryLabel ?? '',
        aggregation: widget.aggregation ?? 'count',
        note: widget.note ?? '',
    }
}

function blankWidget(slotId: number, sectionId?: number | null): DashboardWidget {
    return normalizeWidget({ slotId, sectionId })
}

function gridSpan(value: number) {
    return String(Math.max(1, value))
}

function toggleSelection(values: string[], nextValue: string) {
    return values.includes(nextValue)
        ? values.filter((value) => value !== nextValue)
        : [...values, nextValue]
}

export default function DashboardConfigurePage() {
    const { id } = useParams<{ id: string }>()
    const { addNotification } = useNotifications()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [dashboardName, setDashboardName] = useState('')
    const [description, setDescription] = useState('')
    const [showMetadata, setShowMetadata] = useState(true)
    const [pages, setPages] = useState<DashboardPage[]>([])
    const [currentPageId, setCurrentPageId] = useState<number>(1)
    const [editor, setEditor] = useState<WidgetEditorState | null>(null)
    const [draftWidget, setDraftWidget] = useState<DashboardWidget | null>(null)
    const [fieldMappings, setFieldMappings] = useState<Record<string, FieldMapping[]>>({})
    const liveFilters = useMemo(() => createDefaultDashboardFilters(), [])

    const sidebarSection = useMemo<SidebarSection>(() => ({
        title: 'Dashboard',
        items: [{ label: 'Save Widgets', icon: FiSave, event: 'dashboard:configure:save' }],
    }), [])
    useSidebarSection(sidebarSection)

    useEffect(() => {
        const handleSidebarSave = () => { void handleSave() }
        window.addEventListener('dashboard:configure:save', handleSidebarSave)
        return () => window.removeEventListener('dashboard:configure:save', handleSidebarSave)
    })

    useEffect(() => {
        let cancelled = false
        Promise.all(DATA_SOURCES.map(async ({ key, label }) => {
            const fields = await getFieldMappings(key).catch(() => [] as FieldMapping[])
            return [key, fields.map((field) => ({ ...field, domain: field.domain ?? label }))] as const
        })).then((entries) => {
            if (cancelled) return
            setFieldMappings(Object.fromEntries(entries))
        })
        return () => { cancelled = true }
    }, [])

    useEffect(() => {
        if (!id) return
        setLoading(true)
        getDashboard(parseInt(id, 10))
            .then((dashboard) => {
                setDashboardName(dashboard.name)
                setDescription(dashboard.description ?? '')
                setShowMetadata(dashboard.dashboardConfig.showMetadata)
                setPages(dashboard.dashboardConfig.pages)
                setCurrentPageId(dashboard.dashboardConfig.pages[0]?.id ?? 1)
            })
            .catch(() => addNotification('Could not load dashboard configuration.', 'error'))
            .finally(() => setLoading(false))
    }, [id, addNotification])

    const currentPage = useMemo(
        () => pages.find((page) => page.id === currentPageId) ?? pages[0] ?? null,
        [pages, currentPageId],
    )

    const allFields = useMemo<DashboardFieldOption[]>(() => Object.entries(fieldMappings)
        .flatMap(([source, fields]) => fields.map((field) => ({
            ...field,
            source,
            compositeKey: makeCompositeKey(source, field.key),
        }))), [fieldMappings])

    const allMeasureFields = useMemo(() => {
        const numeric = allFields.filter((field) => field.type === 'number')
        return numeric.length > 0 ? numeric : allFields
    }, [allFields])

    const allAttributeFields = useMemo(() => {
        const attributes = allFields.filter((field) => field.type !== 'number')
        return attributes.length > 0 ? attributes : allFields
    }, [allFields])

    function isMeasureField(value: string | null | undefined) {
        return Boolean(value) && allMeasureFields.some((field) => field.compositeKey === value)
    }

    function getChartMeasures(widget: DashboardWidget) {
        const selectedMeasures = [...(widget.measures ?? [])]
        if (widget.yAxisAttribute && isMeasureField(widget.yAxisAttribute) && !selectedMeasures.includes(widget.yAxisAttribute)) {
            selectedMeasures.push(widget.yAxisAttribute)
        }
        return selectedMeasures
    }

    function getTemplateId(page: DashboardPage, section?: DashboardSection | null) {
        return section?.template ?? page.template ?? null
    }

    function getWidgetsForSlot(slotId: number, sectionId?: number | null) {
        if (!currentPage) return []
        const widgets = (currentPage.widgets ?? []).map((widget) => normalizeWidget(widget))
        return widgets.filter((widget) => widget.slotId === slotId && (widget.sectionId ?? null) === (sectionId ?? null))
    }

    function getFieldLabel(value: string | null | undefined) {
        if (!value) return 'None'
        const option = allFields.find((field) => field.compositeKey === value)
        return option ? `${option.label} (${option.domain})` : value
    }

    function summarizeWidget(widget: DashboardWidget) {
        if (widget.type === 'text') {
            return widget.note?.trim() ? 'Text note' : 'Empty note'
        }
        if (widget.type === 'metric') {
            return `${getFieldLabel(widget.metric)} • ${widget.aggregation}`
        }
        if (widget.type === 'chart') {
            const measureLabels = getChartMeasures(widget).map((measure) => getFieldLabel(measure)).join(', ') || 'No measures'
            const legendLabel = widget.legendAttribute ? ` • Legend ${getFieldLabel(widget.legendAttribute)}` : ''
            const yAxisLabel = widget.yAxisAttribute ? ` • Y ${getFieldLabel(widget.yAxisAttribute)}` : ''
            return `${widget.chartType} • ${getFieldLabel(widget.attribute)}${yAxisLabel}${legendLabel} • ${measureLabels}`
        }
        const attributeLabels = widget.attributes?.map((attribute) => getFieldLabel(attribute)).join(', ') || 'No columns'
        return attributeLabels
    }

    function openEditor(slotId: number, sectionId?: number | null) {
        const existing = getWidgetsForSlot(slotId, sectionId)[0]
        setEditor({ slotId, sectionId, widget: existing })
        setDraftWidget(existing ? normalizeWidget(existing) : blankWidget(slotId, sectionId))
    }

    function saveWidgetLocally() {
        if (!currentPage || !draftWidget) return
        if (!draftWidget.title.trim()) {
            addNotification('Widget title is required.', 'error')
            return
        }
        if (draftWidget.type === 'metric' && !draftWidget.metric) {
            addNotification('Select a measure for the metric widget.', 'error')
            return
        }
        if (draftWidget.type === 'chart' && (!draftWidget.attribute || getChartMeasures(draftWidget).length === 0)) {
            addNotification('Chart widgets require an attribute and at least one measure.', 'error')
            return
        }
        if (draftWidget.type === 'table' && !(draftWidget.attributes?.length)) {
            addNotification('Select at least one attribute for the table widget.', 'error')
            return
        }
        setPages((prev) => prev.map((page) => {
            if (page.id !== currentPage.id) return page
            const widgets = (page.widgets ?? []).map((widget) => normalizeWidget(widget))
                .filter((widget) => !(widget.slotId === draftWidget.slotId && (widget.sectionId ?? null) === (draftWidget.sectionId ?? null)))
            return {
                ...page,
                widgets: [...widgets, {
                    ...draftWidget,
                    title: draftWidget.title.trim(),
                    source: null,
                    note: draftWidget.note?.trim() ?? '',
                    measures: getChartMeasures(draftWidget),
                    xAxisLabel: draftWidget.xAxisLabel?.trim() ?? '',
                    yAxisLabel: draftWidget.yAxisLabel?.trim() ?? '',
                    categoryLabel: draftWidget.categoryLabel?.trim() ?? '',
                }],
            }
        }))
        setEditor(null)
        setDraftWidget(null)
    }

    function removeWidget(slotId: number, sectionId?: number | null) {
        if (!currentPage) return
        setPages((prev) => prev.map((page) => {
            if (page.id !== currentPage.id) return page
            return {
                ...page,
                widgets: (page.widgets ?? []).filter(
                    (widget) => !(widget.slotId === slotId && (widget.sectionId ?? null) === (sectionId ?? null)),
                ),
            }
        }))
    }

    async function handleSave() {
        if (!id) return
        try {
            setSaving(true)
            await updateDashboard(parseInt(id, 10), {
                name: dashboardName,
                description,
                config: {
                    pages,
                    showMetadata,
                },
            })
            addNotification('Dashboard widgets saved.', 'success')
        } catch {
            addNotification('Could not save dashboard widgets.', 'error')
        } finally {
            setSaving(false)
        }
    }

    function renderSlotGrid(page: DashboardPage, section?: DashboardSection | null) {
        const templateId = getTemplateId(page, section)
        const template = templateId ? DASHBOARD_TEMPLATES[templateId] : null

        if (!template) {
            return (
                <div className="rounded-lg border border-dashed border-gray-300 p-5 text-sm text-gray-500">
                    Choose a layout template on the dashboard edit page before configuring widgets.
                </div>
            )
        }

        return (
            <div className="grid grid-cols-4 gap-3 auto-rows-[110px]">
                {template.slots.map((slot) => {
                    const widget = getWidgetsForSlot(slot.id, section?.id)[0]
                    return (
                        <div
                            key={`${section?.id ?? 'page'}-${slot.id}`}
                            className="rounded-xl border border-gray-200 p-3 flex flex-col justify-between"
                            style={{
                                gridColumn: `span ${gridSpan(slot.colSpan)} / span ${gridSpan(slot.colSpan)}`,
                                gridRow: `span ${gridSpan(slot.rowSpan)} / span ${gridSpan(slot.rowSpan)}`,
                            }}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-semibold text-gray-500">Slot {slot.id}</p>
                                {widget && (
                                    <button
                                        type="button"
                                        onClick={() => removeWidget(slot.id, section?.id)}
                                        className="text-gray-400 hover:text-red-600"
                                        title="Remove widget"
                                    >
                                        <FiTrash2 size={14} />
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 min-h-0">
                                {widget ? <DashboardLiveWidget widget={widget} filters={liveFilters} getFieldLabel={getFieldLabel} /> : (
                                    <div className="h-full rounded-lg border border-dashed border-gray-300 bg-white/70 p-4 flex flex-col items-center justify-center text-center gap-2">
                                        <p className="text-sm font-medium text-gray-900">No widget assigned</p>
                                        <p className="text-xs text-gray-500">Add a widget to this slot</p>
                                    </div>
                                )}
                            </div>
                            {widget && (
                                <p className="text-xs text-gray-500 truncate">{summarizeWidget(widget)}</p>
                            )}
                            <button
                                type="button"
                                onClick={() => openEditor(slot.id, section?.id)}
                                className="inline-flex items-center gap-2 self-start rounded-lg border border-brand-300 bg-white px-3 py-1.5 text-sm text-brand-700 hover:bg-brand-50"
                            >
                                <FiPlus size={14} />
                                {widget ? 'Edit Widget' : 'Add Widget'}
                            </button>
                        </div>
                    )
                })}
            </div>
        )
    }

    if (loading) return <LoadingSpinner />

    return (
        <div className="p-6 flex flex-col gap-6" aria-busy={saving}>
            <div>
                <h2 className="text-2xl font-semibold text-gray-900">Configure Dashboard Widgets</h2>
                <p className="text-sm text-gray-500">{dashboardName}</p>
            </div>

            <Card>
                <div className="p-6 flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2">
                        {pages.map((page) => (
                            <button
                                key={page.id}
                                type="button"
                                onClick={() => setCurrentPageId(page.id)}
                                className={`px-3 py-1.5 rounded-full text-sm border ${page.id === currentPageId ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                            >
                                {page.name}
                            </button>
                        ))}
                    </div>

                    {currentPage?.sections && currentPage.sections.length > 0 ? (
                        <div className="flex flex-col gap-5">
                            {currentPage.sections.map((section) => (
                                <div key={section.id} className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-gray-800">Section {section.id}</h3>
                                        <span className="text-xs text-gray-500">Template: {getTemplateId(currentPage, section) ?? 'None'}</span>
                                    </div>
                                    {renderSlotGrid(currentPage, section)}
                                </div>
                            ))}
                        </div>
                    ) : currentPage ? (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-gray-800">{currentPage.name}</h3>
                                <span className="text-xs text-gray-500">Template: {getTemplateId(currentPage) ?? 'None'}</span>
                            </div>
                            {renderSlotGrid(currentPage)}
                        </div>
                    ) : null}
                </div>
            </Card>

            {editor && draftWidget && (
                <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center p-4">
                    <Card className="w-full max-w-xl">
                        <div className="p-6 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">{editor.widget ? 'Edit Widget' : 'Add Widget'}</h3>
                                <button type="button" onClick={() => { setEditor(null); setDraftWidget(null) }} className="text-gray-400 hover:text-gray-700">
                                    <FiX size={18} />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1 sm:col-span-2">
                                    <label className="text-sm font-medium text-gray-700" htmlFor="widget-title">Widget Title</label>
                                    <input
                                        id="widget-title"
                                        type="text"
                                        value={draftWidget.title}
                                        onChange={(e) => setDraftWidget((prev) => prev ? { ...prev, title: e.target.value } : prev)}
                                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium text-gray-700" htmlFor="widget-type">Widget Type</label>
                                    <select
                                        id="widget-type"
                                        value={draftWidget.type}
                                        onChange={(e) => setDraftWidget((prev) => prev ? normalizeWidget({
                                            ...prev,
                                            type: e.target.value as DashboardWidgetType,
                                            metric: null,
                                            attribute: null,
                                            yAxisAttribute: null,
                                            legendAttribute: null,
                                            measures: [],
                                            attributes: [],
                                            xAxisLabel: '',
                                            yAxisLabel: '',
                                            categoryLabel: '',
                                        }) : prev)}
                                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                                    >
                                        {WIDGET_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                                    </select>
                                </div>
                                {draftWidget.type === 'text' ? (
                                    <div className="flex flex-col gap-1">
                                        <label className="text-sm font-medium text-gray-700" htmlFor="widget-note">Note</label>
                                        <textarea
                                            id="widget-note"
                                            rows={3}
                                            value={draftWidget.note ?? ''}
                                            onChange={(e) => setDraftWidget((prev) => prev ? { ...prev, note: e.target.value } : prev)}
                                            className="border border-gray-300 rounded px-3 py-2 text-sm resize-none"
                                            placeholder="Add the note content that should appear in this widget"
                                        />
                                    </div>
                                ) : null}
                                {draftWidget.type === 'metric' && (
                                    <>
                                        <div className="flex flex-col gap-1 sm:col-span-2">
                                            <label className="text-sm font-medium text-gray-700" htmlFor="widget-metric">Measure</label>
                                            <select
                                                id="widget-metric"
                                                value={draftWidget.metric ?? ''}
                                                onChange={(e) => setDraftWidget((prev) => prev ? { ...prev, metric: e.target.value || null } : prev)}
                                                className="border border-gray-300 rounded px-3 py-2 text-sm"
                                            >
                                                <option value="">Select measure</option>
                                                {allMeasureFields.map((field) => (
                                                    <option key={field.compositeKey} value={field.compositeKey}>{field.label} ({field.domain})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-sm font-medium text-gray-700" htmlFor="widget-aggregation">Aggregation</label>
                                            <select
                                                id="widget-aggregation"
                                                value={draftWidget.aggregation ?? 'count'}
                                                onChange={(e) => setDraftWidget((prev) => prev ? { ...prev, aggregation: e.target.value as DashboardWidget['aggregation'] } : prev)}
                                                className="border border-gray-300 rounded px-3 py-2 text-sm"
                                            >
                                                {AGGREGATIONS.map((aggregation) => (
                                                    <option key={aggregation} value={aggregation}>{aggregation}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                )}
                                {draftWidget.type === 'chart' && (
                                    <>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-sm font-medium text-gray-700" htmlFor="widget-chart-type">Chart Type</label>
                                            <select
                                                id="widget-chart-type"
                                                value={draftWidget.chartType ?? 'bar'}
                                                onChange={(e) => setDraftWidget((prev) => prev ? { ...prev, chartType: e.target.value as DashboardChartType } : prev)}
                                                className="border border-gray-300 rounded px-3 py-2 text-sm"
                                            >
                                                {CHART_TYPES.map((type) => (
                                                    <option key={type.value} value={type.value}>{type.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {draftWidget.chartType === 'pie' || draftWidget.chartType === 'doughnut' ? (
                                            <>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-sm font-medium text-gray-700" htmlFor="widget-attribute">Category Attribute</label>
                                                    <select
                                                        id="widget-attribute"
                                                        value={draftWidget.attribute ?? ''}
                                                        onChange={(e) => setDraftWidget((prev) => prev ? { ...prev, attribute: e.target.value || null } : prev)}
                                                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                                                    >
                                                        <option value="">Select category</option>
                                                        {allAttributeFields.map((field) => (
                                                            <option key={field.compositeKey} value={field.compositeKey}>{field.label} ({field.domain})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-sm font-medium text-gray-700" htmlFor="widget-category-label">Category Label</label>
                                                    <input
                                                        id="widget-category-label"
                                                        type="text"
                                                        value={draftWidget.categoryLabel ?? ''}
                                                        onChange={(e) => setDraftWidget((prev) => prev ? { ...prev, categoryLabel: e.target.value } : prev)}
                                                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                                                        placeholder="e.g. Status"
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-sm font-medium text-gray-700" htmlFor="widget-attribute">X-Axis Field</label>
                                                    <select
                                                        id="widget-attribute"
                                                        value={draftWidget.attribute ?? ''}
                                                        onChange={(e) => setDraftWidget((prev) => prev ? { ...prev, attribute: e.target.value || null } : prev)}
                                                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                                                    >
                                                        <option value="">Select x-axis field</option>
                                                        {allFields.map((field) => (
                                                            <option key={field.compositeKey} value={field.compositeKey}>{field.label} ({field.domain})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-sm font-medium text-gray-700" htmlFor="widget-x-axis-label">X-Axis Label</label>
                                                    <input
                                                        id="widget-x-axis-label"
                                                        type="text"
                                                        value={draftWidget.xAxisLabel ?? ''}
                                                        onChange={(e) => setDraftWidget((prev) => prev ? { ...prev, xAxisLabel: e.target.value } : prev)}
                                                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                                                        placeholder="e.g. Month"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1 sm:col-span-2">
                                                    <label className="text-sm font-medium text-gray-700" htmlFor="widget-y-axis-label">Y-Axis Label</label>
                                                    <input
                                                        id="widget-y-axis-label"
                                                        type="text"
                                                        value={draftWidget.yAxisLabel ?? ''}
                                                        onChange={(e) => setDraftWidget((prev) => prev ? { ...prev, yAxisLabel: e.target.value } : prev)}
                                                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                                                        placeholder="e.g. Premium"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-sm font-medium text-gray-700" htmlFor="widget-y-axis-attribute">Y-Axis Field</label>
                                                    <select
                                                        id="widget-y-axis-attribute"
                                                        value={draftWidget.yAxisAttribute ?? ''}
                                                        onChange={(e) => setDraftWidget((prev) => prev ? { ...prev, yAxisAttribute: e.target.value || null } : prev)}
                                                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                                                    >
                                                        <option value="">Select y-axis field</option>
                                                        {allFields.map((field) => (
                                                            <option key={field.compositeKey} value={field.compositeKey}>{field.label} ({field.domain})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-sm font-medium text-gray-700" htmlFor="widget-legend-attribute">Legend Split By</label>
                                                    <select
                                                        id="widget-legend-attribute"
                                                        value={draftWidget.legendAttribute ?? ''}
                                                        onChange={(e) => setDraftWidget((prev) => prev ? { ...prev, legendAttribute: e.target.value || null } : prev)}
                                                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                                                    >
                                                        <option value="">No legend split</option>
                                                        {allAttributeFields.map((field) => (
                                                            <option key={field.compositeKey} value={field.compositeKey}>{field.label} ({field.domain})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </>
                                        )}
                                        <fieldset className="sm:col-span-2 flex flex-col gap-2">
                                            <legend className="text-sm font-medium text-gray-700">Measures</legend>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded border border-gray-200 p-3 max-h-44 overflow-y-auto">
                                                {allMeasureFields.map((field) => (
                                                    <label key={field.compositeKey} className="flex items-center gap-2 text-sm text-gray-700">
                                                        <input
                                                            type="checkbox"
                                                            checked={draftWidget.measures?.includes(field.compositeKey) ?? false}
                                                            onChange={() => setDraftWidget((prev) => prev ? { ...prev, measures: toggleSelection(prev.measures ?? [], field.compositeKey) } : prev)}
                                                            className="h-4 w-4 rounded border-gray-300 text-brand-600"
                                                        />
                                                        {field.label} ({field.domain})
                                                    </label>
                                                ))}
                                            </div>
                                        </fieldset>
                                    </>
                                )}
                                {draftWidget.type === 'table' && (
                                    <fieldset className="sm:col-span-2 flex flex-col gap-2">
                                        <legend className="text-sm font-medium text-gray-700">Attributes / Columns</legend>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded border border-gray-200 p-3 max-h-44 overflow-y-auto">
                                            {allAttributeFields.map((field) => (
                                                <label key={field.compositeKey} className="flex items-center gap-2 text-sm text-gray-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={draftWidget.attributes?.includes(field.compositeKey) ?? false}
                                                        onChange={() => setDraftWidget((prev) => prev ? { ...prev, attributes: toggleSelection(prev.attributes ?? [], field.compositeKey) } : prev)}
                                                        className="h-4 w-4 rounded border-gray-300 text-brand-600"
                                                    />
                                                    {field.label} ({field.domain})
                                                </label>
                                            ))}
                                        </div>
                                    </fieldset>
                                )}
                            </div>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => { setEditor(null); setDraftWidget(null) }} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                                <button type="button" onClick={saveWidgetLocally} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700">Save Widget</button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
