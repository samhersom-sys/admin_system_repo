import { useEffect, useMemo, useRef, useState } from 'react'
import { brandColors } from '@/shared/lib/design-tokens/brandColors'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Filler,
    Tooltip,
    Legend,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import type {
    DashboardActiveFilters,
    DashboardChartWidgetData,
    DashboardPage,
    DashboardWidget,
    DashboardWidgetDataResponse,
    FieldMapping,
} from '@/reporting/reporting.service'
import { getDashboardWidgetData } from '@/reporting/reporting.service'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Filler, Tooltip, Legend)

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
        filters: Array.isArray(widget.filters) ? widget.filters : [],
        ignoresDashboardFilters: widget.ignoresDashboardFilters ?? false,
        showTitle: widget.showTitle ?? true,
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
    const measureLabel = getFieldLabel(widget.metric)
    return (
        <div className="h-full rounded-lg border border-emerald-100 bg-white p-4 flex flex-col items-center justify-center gap-2 text-center">
            {(widget.showTitle ?? true) && widget.title && (
                <p className="text-sm font-semibold text-gray-900">{widget.title}</p>
            )}
            <p className="text-4xl font-bold text-gray-900">{formatValue(data.value)}</p>
            <p className="text-xs text-emerald-700">{measureLabel}</p>
        </div>
    )
}

function LoadingWidgetView({ widget, getFieldLabel }: { widget: DashboardWidget; getFieldLabel: (value: string | null | undefined) => string }) {
    if (widget.type === 'metric') {
        return (
            <div className="h-full rounded-lg border border-emerald-100 bg-white p-4 flex flex-col items-center justify-center gap-2 text-center">
                {(widget.showTitle ?? true) && widget.title && (
                    <p className="text-sm font-semibold text-gray-900">{widget.title}</p>
                )}
                <div className="flex-1 flex items-center justify-center text-sm text-gray-500">Loading live data...</div>
            </div>
        )
    }

    if (widget.type === 'chart') {
        return (
            <div className="h-full rounded-lg border border-sky-100 bg-white p-3 flex flex-col gap-2">
                <div className="flex-1 rounded-lg border border-dashed border-gray-300 bg-white/70 flex items-center justify-center text-sm text-gray-500">
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
        return <div className="h-full rounded-lg border border-sky-100 bg-white p-4 flex items-center justify-center text-sm text-gray-500">No data available</div>
    }

    const primaryMeasure = primaryMeasureKey(data)
    const labels = data.rows.map((row) => row.label)
    const values = data.rows.map((row) => row.values[primaryMeasure ?? ''] ?? 0)
    const measureLabel = widget.yAxisLabel || widget.categoryLabel || primaryMeasure || 'Value'
    const isLine = widget.chartType === 'line' || widget.chartType === 'area'
    const isDonut = widget.chartType === 'pie' || widget.chartType === 'doughnut'

    const PIE_COLOURS = [
        'rgba(14,165,233,0.75)',
        'rgba(16,185,129,0.75)',
        'rgba(245,158,11,0.75)',
        'rgba(239,68,68,0.75)',
        'rgba(139,92,246,0.75)',
        'rgba(236,72,153,0.75)',
        'rgba(20,184,166,0.75)',
        'rgba(249,115,22,0.75)',
    ]

    if (isDonut) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const donutData: any = {
            labels,
            datasets: [{
                data: values,
                backgroundColor: labels.map((_, i) => PIE_COLOURS[i % PIE_COLOURS.length]),
                borderWidth: 1,
                borderColor: 'white',
            }],
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const donutOptions: any = {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            cutout: widget.chartType === 'doughnut' ? '60%' : 0,
            plugins: {
                legend: { display: true, position: 'right', labels: { font: { size: 10 }, color: brandColors.neutral[500], boxWidth: 10 } },
                tooltip: {
                    callbacks: {
                        label: (ctx: { label: string; formattedValue: string }) => `${ctx.label}: ${ctx.formattedValue}`,
                    },
                },
            },
        }
        return (
            <div className="h-full rounded-lg border border-sky-100 bg-white p-3 flex flex-col gap-2 overflow-hidden">
                <p className="text-sm font-semibold text-gray-900 shrink-0">{widget.title}</p>
                <div className="flex-1 min-h-0">
                    <Doughnut data={donutData} options={donutOptions} />
                </div>
            </div>
        )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataset: any = {
        data: values,
        borderColor: 'rgb(14, 165, 233)',
        backgroundColor: isLine ? 'rgba(14, 165, 233, 0.08)' : 'rgba(14, 165, 233, 0.65)',
        fill: widget.chartType === 'area',
        tension: 0.35,
        pointRadius: values.length > 20 ? 1.5 : 3,
        pointBackgroundColor: 'white',
        pointBorderColor: 'rgb(14, 165, 233)',
        pointBorderWidth: 1.5,
        borderWidth: 2,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options: any = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (ctx: { formattedValue: string }) => `${measureLabel}: ${ctx.formattedValue}`,
                },
            },
        },
        scales: {
            x: {
                border: { display: false },
                grid: { color: 'rgba(0,0,0,0.04)' },
                ticks: { font: { size: 10 }, color: brandColors.neutral[400], maxTicksLimit: 10, maxRotation: 30 },
                ...(widget.xAxisLabel ? { title: { display: true, text: widget.xAxisLabel, color: brandColors.neutral[500], font: { size: 11 } } } : {}),
            },
            y: {
                border: { display: false },
                grid: { color: 'rgba(0,0,0,0.04)' },
                ticks: { font: { size: 10 }, color: brandColors.neutral[400] },
                beginAtZero: true,
                ...(widget.yAxisLabel ? { title: { display: true, text: widget.yAxisLabel, color: brandColors.neutral[500], font: { size: 11 } } } : {}),
            },
        },
    }

    const chartData = { labels, datasets: [dataset] }

    return (
        <div className="h-full rounded-lg border border-sky-100 bg-white p-3 flex flex-col gap-2 overflow-hidden">
            <p className="text-sm font-semibold text-gray-900 shrink-0">{widget.title}</p>
            <div className="flex-1 min-h-0">
                {isLine
                    ? <Line data={chartData} options={options} />
                    : <Bar data={chartData} options={options} />
                }
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
    initialData,
    getFieldLabel,
}: {
    widget: DashboardWidget
    filters: DashboardActiveFilters
    initialData?: DashboardWidgetDataResponse
    getFieldLabel: (value: string | null | undefined) => string
}) {
    const normalizedWidget = useMemo(() => normalizeDashboardWidget(widget), [widget])
    const ownDefaultFilters = useMemo(() => createDefaultDashboardFilters(), [])
    const effectiveFilters = normalizedWidget.ignoresDashboardFilters ? ownDefaultFilters : filters
    const hasInitial = initialData !== undefined
    const [loading, setLoading] = useState(normalizedWidget.type !== 'text' && !hasInitial)
    const [data, setData] = useState<DashboardWidgetDataResponse | null>(
        normalizedWidget.type === 'text' ? { type: 'text' } : (initialData ?? null),
    )
    const [error, setError] = useState<string | null>(null)

    const skipFirstFetch = useRef(hasInitial)
    useEffect(() => {
        // Skip re-fetch on first mount if initial data was provided by the parent
        if (skipFirstFetch.current) {
            skipFirstFetch.current = false
            return
        }
        let cancelled = false
        if (normalizedWidget.type === 'text') {
            setData({ type: 'text' })
            setLoading(false)
            return () => { cancelled = true }
        }
        setLoading(true)
        setError(null)
        getDashboardWidgetData(normalizedWidget, effectiveFilters)
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