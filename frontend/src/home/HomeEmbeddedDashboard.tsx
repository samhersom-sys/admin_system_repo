import { useEffect, useMemo, useState } from 'react'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import {
    getDashboard,
    getDashboardWidgetData,
    getFieldMappings,
    getReportTemplates,
    type DashboardActiveFilters,
    type DashboardPage,
    type DashboardWidget,
    type DashboardWidgetDataResponse,
    type FieldMapping,
    type ReportTemplate,
} from '@/reporting/reporting.service'
import { DASHBOARD_TEMPLATES } from '@/reporting/DashboardCreatePage/DashboardTemplates'
import {
    DASHBOARD_DATA_SOURCES,
    type DashboardFieldOption,
    DashboardLiveWidget,
    createDefaultDashboardFilters,
    makeCompositeKey,
    normalizeDashboardWidget,
} from '@/reporting/dashboardWidgets'

function gridSpan(value: number) {
    return String(Math.max(1, value))
}

function getFieldLabelFromAll(allFields: DashboardFieldOption[], value: string | null | undefined): string {
    if (!value) return 'None'
    const option = allFields.find((field) => field.compositeKey === value)
    return option ? `${option.label} (${option.domain})` : value
}

export default function HomeEmbeddedDashboard() {
    const [dashboardList, setDashboardList] = useState<ReportTemplate[]>([])
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const [dashboard, setDashboard] = useState<(ReportTemplate & { dashboardConfig: { pages: DashboardPage[]; showMetadata?: boolean } }) | null>(null)
    const [pages, setPages] = useState<DashboardPage[]>([])
    const [currentPageId, setCurrentPageId] = useState<number>(1)
    const [fieldMappings, setFieldMappings] = useState<Record<string, FieldMapping[]>>({})
    const [appliedFilters, setAppliedFilters] = useState<DashboardActiveFilters>(createDefaultDashboardFilters())
    const [initialWidgetData, setInitialWidgetData] = useState<Record<string, DashboardWidgetDataResponse>>({})
    const [loadError, setLoadError] = useState(false)

    // Load all field mappings once
    useEffect(() => {
        let cancelled = false
        Promise.all(
            DASHBOARD_DATA_SOURCES.map(async ({ key, label }) => {
                const fields = await getFieldMappings(key).catch(() => [] as FieldMapping[])
                return [key, fields.map((field) => ({ ...field, domain: field.domain ?? label }))] as const
            }),
        ).then((entries) => {
            if (!cancelled) setFieldMappings(Object.fromEntries(entries))
        })
        return () => { cancelled = true }
    }, [])

    // Load list of dashboards marked for the homepage
    useEffect(() => {
        let cancelled = false
        getReportTemplates()
            .then((templates) => {
                if (cancelled) return
                const homeDashboards = templates.filter(
                    (t) => t.type === 'dashboard' && (t as unknown as { fields?: { showOnHomepage?: boolean } }).fields?.showOnHomepage === true,
                )
                setDashboardList(homeDashboards)
                setSelectedIndex(0)
                if (homeDashboards.length === 0) setLoading(false)
            })
            .catch(() => {
                if (!cancelled) setLoading(false)
            })
        return () => { cancelled = true }
    }, [])

    const selectedId = dashboardList[selectedIndex]?.id ?? null

    // Load selected dashboard
    useEffect(() => {
        if (selectedId === null) return
        let cancelled = false
        setLoading(true)
        setLoadError(false)
        const defaultFilters = createDefaultDashboardFilters()
        getDashboard(selectedId)
            .then(async (loaded) => {
                if (cancelled) return
                if (loaded.type !== 'dashboard') throw new Error('Not a dashboard')
                setDashboard(loaded as typeof dashboard)
                setPages(loaded.dashboardConfig.pages)
                setCurrentPageId(loaded.dashboardConfig.pages[0]?.id ?? 1)
                setAppliedFilters(defaultFilters)

                const widgetList = loaded.dashboardConfig.pages
                    .flatMap((p) => (p.widgets ?? []).map((w) => normalizeDashboardWidget(w)))
                    .filter((w) => w.type !== 'text')

                const results = await Promise.all(
                    widgetList.map((w) =>
                        getDashboardWidgetData(w, w.ignoresDashboardFilters ? createDefaultDashboardFilters() : defaultFilters)
                            .then((data): [string, DashboardWidgetDataResponse] => [w.id, data])
                            .catch(() => null),
                    ),
                )
                if (cancelled) return
                const map: Record<string, DashboardWidgetDataResponse> = {}
                for (const entry of results) {
                    if (entry) map[entry[0]] = entry[1]
                }
                setInitialWidgetData(map)
            })
            .catch(() => {
                if (!cancelled) setLoadError(true)
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => { cancelled = true }
    }, [selectedId])

    const allFields = useMemo<DashboardFieldOption[]>(
        () =>
            Object.entries(fieldMappings).flatMap(([source, fields]) =>
                fields.map((field) => ({
                    ...field,
                    source,
                    compositeKey: makeCompositeKey(source, field.key),
                })),
            ),
        [fieldMappings],
    )

    const currentPage = useMemo(
        () => pages.find((page) => page.id === currentPageId) ?? pages[0] ?? null,
        [pages, currentPageId],
    )

    const currentPageWidgets = useMemo(
        () => (currentPage?.widgets ?? []).map((w) => normalizeDashboardWidget(w)),
        [currentPage],
    )

    function getWidgetsForSlot(slotId: number, sectionId?: number | null) {
        return currentPageWidgets.filter(
            (widget) => widget.slotId === slotId && (widget.sectionId ?? null) === (sectionId ?? null),
        )
    }

    function getTemplateId(page: DashboardPage, section?: { template?: string | null } | null) {
        return section?.template ?? page.template ?? null
    }

    function renderSlotGrid(page: DashboardPage, section?: { id: number; template?: string | null } | null) {
        const templateId = getTemplateId(page, section)
        const template = templateId ? DASHBOARD_TEMPLATES[templateId] : null

        if (!template) {
            return (
                <div className="rounded-lg border border-dashed border-gray-300 p-5 text-sm text-gray-500">
                    This page has no layout template configured.
                </div>
            )
        }

        const maxRow = Math.max(...template.slots.map((s) => s.row + s.rowSpan))

        return (
            <div
                className="grid grid-cols-4 gap-3 flex-1 min-h-0"
                style={{ gridTemplateRows: `repeat(${maxRow}, 1fr)` }}
            >
                {template.slots.map((slot) => {
                    const widget = getWidgetsForSlot(slot.id, section?.id)[0]
                    return (
                        <div
                            key={`${section?.id ?? 'page'}-${slot.id}`}
                            className="rounded-xl border border-gray-200 p-3 flex flex-col overflow-hidden"
                            style={{
                                gridColumn: `span ${gridSpan(slot.colSpan)} / span ${gridSpan(slot.colSpan)}`,
                                gridRow: `span ${gridSpan(slot.rowSpan)} / span ${gridSpan(slot.rowSpan)}`,
                            }}
                        >
                            <div className="flex-1 min-h-0">
                                {widget ? (
                                    <DashboardLiveWidget
                                        widget={widget as DashboardWidget}
                                        filters={appliedFilters}
                                        initialData={initialWidgetData[widget.id]}
                                        getFieldLabel={(v) => getFieldLabelFromAll(allFields, v)}
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
        return (
            <div className="flex-1 flex items-center justify-center">
                <LoadingSpinner />
            </div>
        )
    }

    if (dashboardList.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center p-6">
                <p className="text-sm text-gray-500">No dashboards are pinned to the homepage. Enable <strong>Show on Homepage</strong> on any dashboard to display it here.</p>
            </div>
        )
    }

    if (loadError || !dashboard) {
        return (
            <div className="flex-1 flex items-center justify-center p-6">
                <p className="text-sm text-red-600">Could not load dashboard.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4 p-6 flex-1 min-h-0">
            {/* Dashboard title */}
            <h2 className="text-lg font-semibold text-gray-900">{dashboard.name}</h2>

            {/* Pagination dots â€” one per pinned dashboard */}
            {dashboardList.length > 1 && (
                <div className="flex items-center justify-center gap-2" role="tablist" aria-label="Dashboard pagination">
                    {dashboardList.map((d, idx) => (
                        <button
                            key={d.id}
                            role="tab"
                            aria-selected={idx === selectedIndex}
                            aria-label={d.name}
                            title={d.name}
                            type="button"
                            onClick={() => setSelectedIndex(idx)}
                            className={`rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 ${
                                idx === selectedIndex
                                    ? 'w-6 h-3 bg-brand-600'
                                    : 'w-3 h-3 bg-brand-200 hover:bg-brand-400'
                            }`}
                        />
                    ))}
                </div>
            )}

            {/* Dashboard page tabs */}
            {pages.length > 1 && (
                <div className="flex flex-wrap gap-2">
                    {pages.map((page) => (
                        <button
                            key={page.id}
                            type="button"
                            onClick={() => setCurrentPageId(page.id)}
                            className={`px-3 py-1.5 rounded-full text-sm border ${
                                page.id === currentPageId
                                    ? 'bg-brand-600 text-white border-brand-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            {page.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Dashboard content */}
            {currentPage ? (
                <div className="rounded-lg border border-gray-200 bg-white shadow-sm flex-1 flex flex-col min-h-0">
                    <div className="p-6 flex flex-col gap-5 flex-1 min-h-0">
                        {currentPage.sections && currentPage.sections.length > 0 ? (
                            currentPage.sections.map((section) => (
                                <div key={section.id} className="flex flex-col gap-3">
                                    {renderSlotGrid(currentPage, section)}
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col gap-3 flex-1 min-h-0">
                                {renderSlotGrid(currentPage)}
                            </div>
                        )}
                    </div>
                </div>
            ) : null}
        </div>

    )
}
