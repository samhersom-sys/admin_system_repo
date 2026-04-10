import { useEffect, useMemo, useState } from 'react'
import type {
    DashboardActiveFilters,
    DashboardChartWidgetData,
    DashboardPage,
    DashboardWidget,
    DashboardWidgetDataResponse,
    FieldMapping,
} from '@/reporting/reporting.service'
import { getDashboardWidgetData } from '@/reporting/reporting.service'

export type DashboardFieldOption = FieldMapping & {
    source: string
    compositeKey: string
}

export const DASHBOARD_DATA_SOURCES = [
    { key: 'submissions', label: 'Submissions' },
    { key: 'quotes', label: 'Quotes' },
    { key: 'policies', label: 'Policies' },
    { key: 'policyTransactions', label: 'Policy Transactions' },
    { key: 'bindingAuthorities', label: 'Binding Authorities' },
    { key: 'parties', label: 'Parties' },
    { key: 'claims', label: 'Claims' },
]

export function makeCompositeKey(source: string, key: string) {
    return `${source}::${key}`
}

export function normalizeDashboardWidget(widget: Partial<DashboardWidget>): DashboardWidget {
    return {
        id: widget.id ?? `${widget.sectionId ?? 'page'}-${widget.slotId ?? 1}`,
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

export function createDefaultDashboardFilters(dateBasis: string | null = null): DashboardActiveFilters {
    return {
        analysisBasis: 'cumulative',
        dateBasis,
        reportingDate: new Date().toISOString().slice(0, 10),
        customAttributes: [],
    }
}

function collectCompositeKeys(widget: DashboardWidget): string[] {
    return [
        widget.metric,
        widget.attribute,
        widget.yAxisAttribute,
        widget.legendAttribute,
        ...(widget.measures ?? []),
        ...(widget.attributes ?? []),
    ].filter(Boolean) as string[]
}

function getSourcesForWidget(widget: DashboardWidget): string[] {
    return Array.from(new Set(collectCompositeKeys(widget)
        .map((value) => value.split('::')[0])
        .filter(Boolean)))
}

export function deriveDashboardFilterOptions(page: DashboardPage | null, allFields: DashboardFieldOption[]) {
    const widgets = (page?.widgets ?? []).map((widget) => normalizeDashboardWidget(widget))
    const widgetSources = new Set(widgets.flatMap((widget) => getSourcesForWidget(widget)))
    const relevantFields = allFields.filter((field) => widgetSources.has(field.source))
    const dateBasisOptions = relevantFields.filter((field) => field.type === 'date')
    const customFieldOptions = relevantFields.filter((field) => field.type !== 'number' && field.type !== 'date')
    const hasLiveWidgets = widgets.some((widget) => widget.type !== 'text')
    return {
        hasFilterPanel: hasLiveWidgets && (dateBasisOptions.length > 0 || customFieldOptions.length > 0),
        dateBasisOptions,
        customFieldOptions,
    }
}

function primaryMeasureKey(data: DashboardChartWidgetData): string | null {
    const firstRow = data.rows[0]
    if (!firstRow) return null
    const firstKey = Object.keys(firstRow.values)[0]
    return firstKey ?? null
}

function formatValue(value: number) {
    return Number.isFinite(value) ? value.toLocaleString() : '0'
}

function MetricWidgetView({ widget, data, getFieldLabel }: { widget: DashboardWidget; data: DashboardWidgetDataResponse; getFieldLabel: (value: string | null | undefined) => string }) {
    if (data.type !== 'metric') return null
    return (
        <div className="h-full rounded-lg border border-emerald-100 bg-white p-3 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="text-sm font-semibold text-gray-900">{widget.title}</p>
                    <p className="text-[11px] text-gray-500">{getFieldLabel(widget.metric)}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    Metric
                </span>
            </div>
            <div>
                <p className="text-3xl font-bold text-gray-900">{formatValue(data.value)}</p>
                <p className="text-[11px] text-emerald-700">{getFieldLabel(widget.metric)}</p>
            </div>
        </div>
    )
}

function LoadingWidgetView({ widget, getFieldLabel }: { widget: DashboardWidget; getFieldLabel: (value: string | null | undefined) => string }) {
    if (widget.type === 'metric') {
        return (
            <div className="h-full rounded-lg border border-emerald-100 bg-white p-3 flex flex-col justify-between">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <p className="text-sm font-semibold text-gray-900">{widget.title}</p>
                        <p className="text-[11px] text-gray-500">{getFieldLabel(widget.metric)}</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                        Metric
                    </span>
                </div>
                <div className="flex-1 flex items-center justify-center text-sm text-gray-500">Loading live data...</div>
            </div>
        )
    }

    if (widget.type === 'chart') {
        return (
            <div className="h-full rounded-lg border border-sky-100 bg-white p-3 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <p className="text-sm font-semibold text-gray-900">{widget.title}</p>
                        <p className="text-[11px] text-gray-500">{widget.chartType} chart</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-1 text-[11px] text-gray-600">
                    <div className="flex items-start gap-1">
                        <span className="font-semibold text-gray-700">X:</span>
                        <span className="truncate">{getFieldLabel(widget.attribute)}</span>
                    </div>
                    <div className="flex items-start gap-1">
                        <span className="font-semibold text-gray-700">Y:</span>
                        <span className="truncate">{getFieldLabel(widget.yAxisAttribute ?? widget.measures?.[0] ?? null)}</span>
                    </div>
                    {widget.legendAttribute ? (
                        <div className="flex items-start gap-1">
                            <span className="font-semibold text-gray-700">Legend:</span>
                            <span className="truncate">{getFieldLabel(widget.legendAttribute)}</span>
                        </div>
                    ) : null}
                </div>
                <div className="flex-1 rounded-lg border border-dashed border-gray-300 bg-white/70 p-4 flex items-center justify-center text-sm text-gray-500">
                    Loading live data...
                </div>
            </div>
        )
    }

    if (widget.type === 'table') {
        return (
            <div className="h-full rounded-lg border border-amber-100 bg-white p-3 flex flex-col gap-2">
                <div>
                    <p className="text-sm font-semibold text-gray-900">{widget.title}</p>
                    <p className="text-[11px] text-gray-500">{(widget.attributes ?? []).map((value) => getFieldLabel(value)).join(', ')}</p>
                </div>
                <div className="flex-1 rounded-lg border border-dashed border-gray-300 bg-white/70 p-4 flex items-center justify-center text-sm text-gray-500">
                    Loading live data...
                </div>
            </div>
        )
    }

    return <TextWidgetView widget={widget} />
}

function ChartWidgetView({ widget, data }: { widget: DashboardWidget; data: DashboardWidgetDataResponse }) {
    if (data.type !== 'chart') return null
    if (data.rows.length === 0) {
        return <div className="h-full rounded-lg border border-sky-100 bg-white p-3 flex items-center justify-center text-sm text-gray-500">No data available</div>
    }

    const primaryMeasure = primaryMeasureKey(data)
    const values = data.rows.map((row) => row.values[primaryMeasure ?? ''] ?? 0)
    const maxValue = Math.max(...values, 1)

    if (widget.chartType === 'line' || widget.chartType === 'area') {
        const points = values.map((value, index) => {
            const x = values.length === 1 ? 48 : 8 + ((80 / Math.max(values.length - 1, 1)) * index)
            const y = 56 - ((value / maxValue) * 38)
            return `${x},${y}`
        }).join(' ')
        return (
            <div className="h-full rounded-lg border border-sky-100 bg-white p-3 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <p className="text-sm font-semibold text-gray-900">{widget.title}</p>
                        <p className="text-[11px] text-gray-500">{widget.chartType} chart</p>
                    </div>
                </div>
                <div className="flex-1 rounded-md bg-sky-50/70 p-2 border border-sky-100">
                    <svg viewBox="0 0 96 64" className="h-full w-full" aria-hidden="true">
                        {widget.chartType === 'area' ? (
                            <polygon points={`8,60 ${points} 88,60`} fill="rgba(14, 165, 233, 0.18)" />
                        ) : null}
                        <polyline fill="none" stroke="rgb(14, 165, 233)" strokeWidth="3" points={points} />
                    </svg>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500">
                    {data.rows.slice(0, 4).map((row) => (
                        <span key={`${widget.id}-${row.label}`} className="truncate">{row.label}: {formatValue(row.values[primaryMeasure ?? ''] ?? 0)}</span>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="h-full rounded-lg border border-sky-100 bg-white p-3 flex flex-col gap-2">
            <div>
                <p className="text-sm font-semibold text-gray-900">{widget.title}</p>
                <p className="text-[11px] text-gray-500">{widget.chartType} chart</p>
            </div>
            <div className="flex-1 flex items-end gap-2 rounded-md bg-sky-50/70 p-2 border border-sky-100">
                {values.map((value, index) => (
                    <div key={`${widget.id}-bar-${index}`} className="flex-1 rounded-t bg-sky-500/80" style={{ height: `${Math.max((value / maxValue) * 100, 10)}%` }} />
                ))}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500">
                {data.rows.slice(0, 4).map((row) => (
                    <span key={`${widget.id}-${row.label}`} className="truncate">{row.label}: {formatValue(row.values[primaryMeasure ?? ''] ?? 0)}</span>
                ))}
            </div>
        </div>
    )
}

function TableWidgetView({ widget, data, getFieldLabel }: { widget: DashboardWidget; data: DashboardWidgetDataResponse; getFieldLabel: (value: string | null | undefined) => string }) {
    if (data.type !== 'table') return null
    if (data.rows.length === 0) {
        return <div className="h-full rounded-lg border border-amber-100 bg-white p-3 flex items-center justify-center text-sm text-gray-500">No data available</div>
    }
    const headers = Object.keys(data.rows[0])
    return (
        <div className="h-full rounded-lg border border-amber-100 bg-white p-3 flex flex-col gap-2 overflow-hidden">
            <div>
                <p className="text-sm font-semibold text-gray-900">{widget.title}</p>
                <p className="text-[11px] text-gray-500">{(widget.attributes ?? []).map((value) => getFieldLabel(value)).join(', ')}</p>
            </div>
            <div className="overflow-auto text-xs">
                <table className="min-w-full border-collapse">
                    <thead>
                        <tr>
                            {headers.map((header) => (
                                <th key={header} className="border-b border-amber-100 px-2 py-1 text-left font-medium text-gray-700">{titleFromKey(header)}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.rows.slice(0, 6).map((row, index) => (
                            <tr key={`${widget.id}-row-${index}`}>
                                {headers.map((header) => (
                                    <td key={header} className="border-b border-amber-50 px-2 py-1 text-gray-600">{String(row[header] ?? '')}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function TextWidgetView({ widget }: { widget: DashboardWidget }) {
    return (
        <div className="h-full rounded-lg border border-violet-100 bg-white p-3 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="text-sm font-semibold text-gray-900">{widget.title}</p>
                    <p className="text-[11px] text-gray-500">Text widget</p>
                </div>
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                    Note
                </span>
            </div>
            <p className="text-sm text-gray-700 line-clamp-4">{widget.note || 'No note content'}</p>
        </div>
    )
}

function titleFromKey(value: string): string {
    return value
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function DashboardLiveWidget({
    widget,
    filters,
    getFieldLabel,
}: {
    widget: DashboardWidget
    filters: DashboardActiveFilters
    getFieldLabel: (value: string | null | undefined) => string
}) {
    const normalizedWidget = useMemo(() => normalizeDashboardWidget(widget), [widget])
    const [loading, setLoading] = useState(normalizedWidget.type !== 'text')
    const [data, setData] = useState<DashboardWidgetDataResponse | null>(normalizedWidget.type === 'text' ? { type: 'text' } : null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        if (normalizedWidget.type === 'text') {
            setData({ type: 'text' })
            setLoading(false)
            return () => { cancelled = true }
        }
        setLoading(true)
        setError(null)
        getDashboardWidgetData(normalizedWidget, filters)
            .then((result) => {
                if (cancelled) return
                setData(result)
            })
            .catch((err) => {
                if (cancelled) return
                setError(err?.message || 'Live data unavailable.')
                setData(null)
            })
            .finally(() => {
                if (cancelled) return
                setLoading(false)
            })
        return () => { cancelled = true }
    }, [normalizedWidget, filters])

    if (loading) {
        return <LoadingWidgetView widget={normalizedWidget} getFieldLabel={getFieldLabel} />
    }

    if (error) {
        return <div className="h-full rounded-lg border border-red-200 bg-red-50 p-4 flex items-center justify-center text-sm text-red-700 text-center">{error}</div>
    }

    if (!data) {
        return <div className="h-full rounded-lg border border-dashed border-gray-300 bg-white/70 p-4 flex items-center justify-center text-sm text-gray-500">No data available</div>
    }

    if (normalizedWidget.type === 'metric') {
        return <MetricWidgetView widget={normalizedWidget} data={data} getFieldLabel={getFieldLabel} />
    }
    if (normalizedWidget.type === 'chart') {
        return <ChartWidgetView widget={normalizedWidget} data={data} />
    }
    if (normalizedWidget.type === 'table') {
        return <TableWidgetView widget={normalizedWidget} data={data} getFieldLabel={getFieldLabel} />
    }
    return <TextWidgetView widget={normalizedWidget} />
}