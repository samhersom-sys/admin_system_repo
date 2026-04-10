import { useEffect, useMemo, useState } from 'react'
import { FiChevronDown, FiChevronUp, FiFilter } from 'react-icons/fi'
import { useParams } from 'react-router-dom'
import Card from '@/shared/Card/Card'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import { useNotifications } from '@/shell/NotificationDock'
import {
    getDashboard,
    getFieldMappings,
    type DashboardActiveFilters,
    type DashboardPage,
    type DashboardSection,
    type DashboardWidget,
    type FieldMapping,
    type ReportTemplate,
} from '@/reporting/reporting.service'
import { DASHBOARD_TEMPLATES } from '@/reporting/DashboardCreatePage/DashboardTemplates'
import {
    DASHBOARD_DATA_SOURCES,
    type DashboardFieldOption,
    DashboardLiveWidget,
    createDefaultDashboardFilters,
    deriveDashboardFilterOptions,
    makeCompositeKey,
    normalizeDashboardWidget,
} from '@/reporting/dashboardWidgets'

function gridSpan(value: number) {
    return String(Math.max(1, value))
}

export default function DashboardViewPage() {
    const { reportId } = useParams<{ reportId: string }>()
    const { addNotification } = useNotifications()

    const [loading, setLoading] = useState(true)
    const [dashboard, setDashboard] = useState<ReportTemplate | null>(null)
    const [pages, setPages] = useState<DashboardPage[]>([])
    const [showMetadata, setShowMetadata] = useState(true)
    const [currentPageId, setCurrentPageId] = useState<number>(1)
    const [fieldMappings, setFieldMappings] = useState<Record<string, FieldMapping[]>>({})
    const [showFilterPanel, setShowFilterPanel] = useState(false)
    const [draftFilters, setDraftFilters] = useState<DashboardActiveFilters>(createDefaultDashboardFilters())
    const [appliedFilters, setAppliedFilters] = useState<DashboardActiveFilters>(createDefaultDashboardFilters())

    useEffect(() => {
        let cancelled = false
        Promise.all(DASHBOARD_DATA_SOURCES.map(async ({ key, label }) => {
            const fields = await getFieldMappings(key).catch(() => [] as FieldMapping[])
            return [key, fields.map((field) => ({ ...field, domain: field.domain ?? label }))] as const
        })).then((entries) => {
            if (cancelled) {
                return
            }
            setFieldMappings(Object.fromEntries(entries))
        })
        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        if (!reportId) {
            return
        }
        setLoading(true)
        getDashboard(parseInt(reportId, 10))
            .then((loadedDashboard) => {
                if (loadedDashboard.type !== 'dashboard') {
                    throw new Error('Not a dashboard')
                }
                setDashboard(loadedDashboard)
                setPages(loadedDashboard.dashboardConfig.pages)
                setShowMetadata(loadedDashboard.dashboardConfig.showMetadata)
                setCurrentPageId(loadedDashboard.dashboardConfig.pages[0]?.id ?? 1)
            })
            .catch(() => {
                setDashboard(null)
                addNotification('Could not load dashboard.', 'error')
            })
            .finally(() => setLoading(false))
    }, [reportId, addNotification])

    const currentPage = useMemo(
        () => pages.find((page) => page.id === currentPageId) ?? pages[0] ?? null,
        [pages, currentPageId],
    )

    const allFields = useMemo<DashboardFieldOption[]>(
        () => Object.entries(fieldMappings).flatMap(([source, fields]) =>
            fields.map((field) => ({
                ...field,
                source,
                compositeKey: makeCompositeKey(source, field.key),
            })),
        ),
        [fieldMappings],
    )

    const filterOptions = useMemo(
        () => deriveDashboardFilterOptions(currentPage, allFields),
        [currentPage, allFields],
    )

    useEffect(() => {
        const nextDateBasis = filterOptions.dateBasisOptions[0]?.compositeKey ?? null
        setDraftFilters((prev) => (prev.dateBasis === nextDateBasis ? prev : { ...prev, dateBasis: nextDateBasis }))
        setAppliedFilters((prev) => (prev.dateBasis === nextDateBasis ? prev : { ...prev, dateBasis: nextDateBasis }))
    }, [filterOptions.dateBasisOptions])

    function getFieldLabel(value: string | null | undefined) {
        if (!value) {
            return 'None'
        }
        const option = allFields.find((field) => field.compositeKey === value)
        return option ? `${option.label} (${option.domain})` : value
    }

    function getTemplateId(page: DashboardPage, section?: DashboardSection | null) {
        return section?.template ?? page.template ?? null
    }

    function getWidgetsForSlot(slotId: number, sectionId?: number | null) {
        if (!currentPage) {
            return []
        }
        return (currentPage.widgets ?? [])
            .map((widget) => normalizeDashboardWidget(widget))
            .filter((widget) => widget.slotId === slotId && (widget.sectionId ?? null) === (sectionId ?? null))
    }

    function addCustomFilterRow() {
        const firstField = filterOptions.customFieldOptions[0]?.compositeKey
        if (!firstField) {
            return
        }
        setDraftFilters((prev) => ({
            ...prev,
            customAttributes: [...prev.customAttributes, { field: firstField, operator: 'equals', value: '' }],
        }))
    }

    function renderFilterPanel() {
        if (!filterOptions.hasFilterPanel) {
            return null
        }

        return (
            <Card>
                <div>
                    <button
                        type="button"
                        onClick={() => setShowFilterPanel((prev) => !prev)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                        aria-label="Dashboard Filters"
                    >
                        <div className="flex items-center gap-2">
                            <FiFilter className="text-brand-600" />
                            <span className="font-medium text-gray-900">Dashboard Filters</span>
                        </div>
                        {showFilterPanel ? <FiChevronUp className="text-gray-500" /> : <FiChevronDown className="text-gray-500" />}
                    </button>

                    {showFilterPanel ? (
                        <div className="border-t p-4 flex flex-col gap-4">
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="flex flex-col gap-1">
                                    <label htmlFor="dashboard-analysis-basis" className="text-sm font-medium text-gray-700">Analysis Basis</label>
                                    <select
                                        id="dashboard-analysis-basis"
                                        value={draftFilters.analysisBasis}
                                        onChange={(event) => setDraftFilters((prev) => ({
                                            ...prev,
                                            analysisBasis: event.target.value as DashboardActiveFilters['analysisBasis'],
                                        }))}
                                        className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                                    >
                                        <option value="cumulative">Cumulative</option>
                                        <option value="ytd">Year to Date</option>
                                        <option value="qtd">Quarter to Date</option>
                                        <option value="mtd">Month to Date</option>
                                        <option value="month">Month</option>
                                        <option value="week">Week</option>
                                        <option value="day">Day</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label htmlFor="dashboard-date-basis" className="text-sm font-medium text-gray-700">Date Basis</label>
                                    <select
                                        id="dashboard-date-basis"
                                        value={draftFilters.dateBasis ?? ''}
                                        onChange={(event) => setDraftFilters((prev) => ({
                                            ...prev,
                                            dateBasis: event.target.value || null,
                                        }))}
                                        className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                                    >
                                        {filterOptions.dateBasisOptions.map((field) => (
                                            <option key={field.compositeKey} value={field.compositeKey}>
                                                {field.label} ({field.domain})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label htmlFor="dashboard-reporting-date" className="text-sm font-medium text-gray-700">Reporting Date</label>
                                    <input
                                        id="dashboard-reporting-date"
                                        type="date"
                                        value={draftFilters.reportingDate}
                                        onChange={(event) => setDraftFilters((prev) => ({
                                            ...prev,
                                            reportingDate: event.target.value,
                                        }))}
                                        className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>

                            {filterOptions.customFieldOptions.length > 0 ? (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-gray-700">Custom Filters</p>
                                        <button
                                            type="button"
                                            onClick={addCustomFilterRow}
                                            className="text-sm text-brand-600 hover:text-brand-700"
                                        >
                                            + Add Filter
                                        </button>
                                    </div>

                                    {draftFilters.customAttributes.length === 0 ? (
                                        <p className="text-sm text-gray-500">No custom filters added.</p>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            {draftFilters.customAttributes.map((filter, index) => (
                                                <div
                                                    key={`${filter.field}-${index}`}
                                                    className="grid gap-2 md:grid-cols-[2fr,1fr,2fr,auto] items-center"
                                                >
                                                    <select
                                                        aria-label={`Custom filter field ${index + 1}`}
                                                        value={filter.field}
                                                        onChange={(event) => setDraftFilters((prev) => ({
                                                            ...prev,
                                                            customAttributes: prev.customAttributes.map((entry, entryIndex) =>
                                                                entryIndex === index ? { ...entry, field: event.target.value } : entry,
                                                            ),
                                                        }))}
                                                        className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                                                    >
                                                        {filterOptions.customFieldOptions.map((field) => (
                                                            <option key={field.compositeKey} value={field.compositeKey}>
                                                                {field.label} ({field.domain})
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        aria-label={`Custom filter operator ${index + 1}`}
                                                        value={filter.operator}
                                                        onChange={(event) => setDraftFilters((prev) => ({
                                                            ...prev,
                                                            customAttributes: prev.customAttributes.map((entry, entryIndex) =>
                                                                entryIndex === index
                                                                    ? { ...entry, operator: event.target.value as typeof entry.operator }
                                                                    : entry,
                                                            ),
                                                        }))}
                                                        className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                                                    >
                                                        <option value="equals">Equals</option>
                                                        <option value="not_equals">Not Equals</option>
                                                        <option value="contains">Contains</option>
                                                        <option value="greater_than">Greater Than</option>
                                                        <option value="less_than">Less Than</option>
                                                    </select>
                                                    <input
                                                        aria-label={`Custom filter value ${index + 1}`}
                                                        type="text"
                                                        value={filter.value}
                                                        onChange={(event) => setDraftFilters((prev) => ({
                                                            ...prev,
                                                            customAttributes: prev.customAttributes.map((entry, entryIndex) =>
                                                                entryIndex === index ? { ...entry, value: event.target.value } : entry,
                                                            ),
                                                        }))}
                                                        className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setDraftFilters((prev) => ({
                                                            ...prev,
                                                            customAttributes: prev.customAttributes.filter((_, entryIndex) => entryIndex !== index),
                                                        }))}
                                                        className="text-gray-500 hover:text-red-600"
                                                        aria-label={`Remove custom filter ${index + 1}`}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : null}

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const defaults = createDefaultDashboardFilters(
                                            filterOptions.dateBasisOptions[0]?.compositeKey ?? null,
                                        )
                                        setDraftFilters(defaults)
                                        setAppliedFilters(defaults)
                                    }}
                                    className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    Reset Filters
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAppliedFilters(draftFilters)}
                                    className="px-4 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700"
                                >
                                    Apply Filters
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </Card>
        )
    }

    function renderSlotGrid(page: DashboardPage, section?: DashboardSection | null) {
        const templateId = getTemplateId(page, section)
        const template = templateId ? DASHBOARD_TEMPLATES[templateId] : null

        if (!template) {
            return (
                <div className="rounded-lg border border-dashed border-gray-300 p-5 text-sm text-gray-500">
                    This page has no layout template configured.
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
                            className="rounded-xl border border-gray-200 p-3 flex flex-col"
                            style={{
                                gridColumn: `span ${gridSpan(slot.colSpan)} / span ${gridSpan(slot.colSpan)}`,
                                gridRow: `span ${gridSpan(slot.rowSpan)} / span ${gridSpan(slot.rowSpan)}`,
                            }}
                        >
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <p className="text-xs font-semibold text-gray-500">Slot {slot.id}</p>
                                {widget ? (
                                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-gray-600 border border-gray-200">
                                        {widget.type}
                                    </span>
                                ) : null}
                            </div>
                            <div className="flex-1 min-h-0">
                                {widget ? (
                                    <DashboardLiveWidget
                                        widget={widget as DashboardWidget}
                                        filters={appliedFilters}
                                        getFieldLabel={getFieldLabel}
                                    />
                                ) : (
                                    <div className="h-full rounded-lg border border-dashed border-gray-300 bg-white/70 p-4 flex items-center justify-center text-center text-sm text-gray-500">
                                        No widget configured
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    if (loading) {
        return <LoadingSpinner />
    }

    if (!dashboard) {
        return (
            <div className="p-6">
                <Card className="p-6">
                    <p className="text-sm text-gray-600">Dashboard not found.</p>
                </Card>
            </div>
        )
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-semibold text-gray-900">{dashboard.name}</h2>
                {dashboard.description ? <p className="text-sm text-gray-500">{dashboard.description}</p> : null}
            </div>

            {showMetadata ? (
                <Card>
                    <div className="p-6 grid gap-4 md:grid-cols-3 text-sm text-gray-600">
                        <div>
                            <p className="font-medium text-gray-900">Created By</p>
                            <p>{dashboard.created_by || 'Unknown'}</p>
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">Created</p>
                            <p>{dashboard.created_at ? new Date(dashboard.created_at).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">Last Updated</p>
                            <p>{dashboard.updated_at ? new Date(dashboard.updated_at).toLocaleDateString() : 'N/A'}</p>
                        </div>
                    </div>
                </Card>
            ) : null}

            {renderFilterPanel()}

            {pages.length > 1 ? (
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
            ) : null}

            {currentPage ? (
                <Card>
                    <div className="p-6 flex flex-col gap-5">
                        {currentPage.sections && currentPage.sections.length > 0 ? (
                            currentPage.sections.map((section) => (
                                <div key={section.id} className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-gray-800">Section {section.id}</h3>
                                        <span className="text-xs text-gray-500">
                                            Template: {getTemplateId(currentPage, section) ?? 'None'}
                                        </span>
                                    </div>
                                    {renderSlotGrid(currentPage, section)}
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-gray-800">{currentPage.name}</h3>
                                    <span className="text-xs text-gray-500">Template: {getTemplateId(currentPage) ?? 'None'}</span>
                                </div>
                                {renderSlotGrid(currentPage)}
                            </div>
                        )}
                    </div>
                </Card>
            ) : null}
        </div>
    )
}