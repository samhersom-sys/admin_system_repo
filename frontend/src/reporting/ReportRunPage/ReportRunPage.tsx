/**
 * ReportRunPage — REQ-RPT-FE-F-021 to F-029
 *
 * Loads template → shows Run button → executes → displays dynamic results table.
 * 3-tab layout: Results | Execution History | Audit History
 * "Export CSV" downloads file named {reportName}_{YYYY-MM-DD}.csv
 */

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FiPlay, FiDownload } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import Card from '@/shared/Card/Card'
import ResizableGrid, { type Column, type SortConfig } from '@/shared/components/ResizableGrid/ResizableGrid'
import {
    getReportTemplate,
    runReport,
    runCoreReport,
    getReportHistory,
    type ReportTemplate,
    type ExecutionHistory,
} from '../reporting.service'

type Tab = 'results' | 'history' | 'audit'

// Core report templates — mirrors ReportsListPage CORE_TEMPLATES
// Loaded locally so navigating to /reports/run/submissions works without an API call.
const CORE_REPORT_TEMPLATES: Record<string, ReportTemplate> = {
    submissions: { id: -1, name: 'Submissions Report', description: 'All submissions with status and broker info.', type: 'core', data_source: 'submissions', created_by: 'System' },
    quotes: { id: -2, name: 'New Business Report', description: 'New policies written in the selected period.', type: 'core', data_source: 'quotes', created_by: 'System' },
    parties: { id: -3, name: 'Parties Report', description: 'Party directory with roles and contact info.', type: 'core', data_source: 'parties', created_by: 'System' },
    policies: { id: -4, name: 'Policies Report', description: 'All policies with premium and expiry data.', type: 'core', data_source: 'policies', created_by: 'System' },
}

function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
    const escape = (v: unknown) => {
        const s = String(v ?? '')
        return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"`
            : s
    }
    return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n')
}

function downloadCsv(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

export default function ReportRunPage() {
    const { reportId } = useParams<{ reportId: string }>()
    const { addNotification } = useNotifications()

    const [template, setTemplate] = useState<ReportTemplate | null>(null)
    const [loadingTemplate, setLoadingTemplate] = useState(true)
    const [running, setRunning] = useState(false)
    const [results, setResults] = useState<Record<string, unknown>[] | null>(null)
    const [history, setHistory] = useState<ExecutionHistory[]>([])
    const [activeTab, setActiveTab] = useState<Tab>('results')
    const [sortConfig, setSortConfig] = useState<SortConfig | undefined>(undefined)

    const headers = results && results.length > 0 ? Object.keys(results[0]) : []

    const resultColumns: Column[] = useMemo(() =>
        headers.map((h) => ({
            key: h,
            label: h.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            sortable: true,
            defaultWidth: 160,
        })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [headers.join(',')]
    )

    const sortedResults = useMemo(() => {
        if (!results || !sortConfig) return results
        return [...results].sort((a, b) => {
            const aVal = a[sortConfig.key]
            const bVal = b[sortConfig.key]
            const aStr = String(aVal ?? '')
            const bStr = String(bVal ?? '')
            const isNum = typeof aVal === 'number' && typeof bVal === 'number'
            if (isNum) return sortConfig.direction === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
            return sortConfig.direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
        })
    }, [results, sortConfig])

    function handleResultSort(key: string) {
        setSortConfig((prev) => {
            if (prev?.key === key) return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
            return { key, direction: 'asc' }
        })
    }

    useEffect(() => {
        if (!reportId) return

        // Core report slug (e.g. "submissions") — load template locally, no API call needed
        const coreTemplate = CORE_REPORT_TEMPLATES[reportId]
        if (coreTemplate) {
            setTemplate(coreTemplate)
            setLoadingTemplate(false)
            return
        }

        const id = parseInt(reportId, 10)
        if (isNaN(id)) return

        setLoadingTemplate(true)
        Promise.all([
            getReportTemplate(id),
            getReportHistory(id).catch(() => [] as ExecutionHistory[]),
        ])
            .then(([tpl, hist]) => {
                setTemplate(tpl)
                setHistory(hist)
            })
            .catch(() => addNotification('Could not load report.', 'error'))
            .finally(() => setLoadingTemplate(false))
    }, [reportId]) // eslint-disable-line react-hooks/exhaustive-deps

    async function handleRun() {
        if (!reportId) return
        const coreTemplate = CORE_REPORT_TEMPLATES[reportId]
        setRunning(true)
        try {
            const res = coreTemplate
                ? await runCoreReport(coreTemplate.data_source!)
                : await runReport(parseInt(reportId, 10))
            setResults(res)
            setActiveTab('results')
        } catch {
            addNotification('Could not run report.', 'error')
        } finally {
            setRunning(false)
        }
    }

    function handleExport() {
        if (!results || results.length === 0 || !template) return
        const date = new Date().toISOString().slice(0, 10)
        const filename = `${template.name.replace(/\s+/g, '_')}_${date}.csv`
        downloadCsv(filename, toCsv(headers, results))
    }

    if (loadingTemplate) return <LoadingSpinner />

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-semibold text-gray-900">{template?.name ?? 'Report'}</h2>
                    {template?.description && (
                        <p className="text-sm text-gray-500">{template.description}</p>
                    )}
                </div>
                <div className="flex gap-2">
                    {results !== null && results.length > 0 && (
                        <button
                            type="button"
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100"
                        >
                            <FiDownload size={14} />
                            Export CSV
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleRun}
                        disabled={running}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                    >
                        <FiPlay size={14} />
                        {running ? 'Running…' : 'Run Report'}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-0">
                    {(['results', 'history', 'audit'] as Tab[]).map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 ${activeTab === tab
                                ? 'border-brand-600 text-brand-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            {tab === 'results' ? 'Results' : tab === 'history' ? 'Execution History' : 'Audit History'}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab content */}
            {activeTab === 'results' && (
                <>
                    {running && <LoadingSpinner />}
                    {!running && results === null && (
                        <p className="text-sm text-gray-400">Click "Run Report" to see results.</p>
                    )}
                    {!running && results !== null && (
                        <Card className="p-4">
                            <div className="mb-4 text-sm text-gray-600">
                                {results.length} record(s) found
                            </div>
                            <ResizableGrid
                                columns={resultColumns}
                                rows={sortedResults ?? []}
                                storageKey={`table-widths-report-run-${reportId}`}
                                sortConfig={sortConfig}
                                onRequestSort={handleResultSort}
                                renderCell={(key, row) => {
                                    const r = row as Record<string, unknown>
                                    const val = r[key]
                                    if (val == null) return '—'
                                    if (typeof val === 'number') return <span className="text-right block">{val}</span>
                                    return String(val)
                                }}
                                emptyMessage="No results returned."
                            />
                        </Card>
                    )}
                </>
            )}

            {activeTab === 'history' && (
                <Card className="overflow-hidden">
                    <table className="app-table min-w-full">
                        <thead className="bg-gray-100 text-left">
                            <tr>
                                <th className="px-4 py-3 font-medium text-gray-600">Run At</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Run By</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Rows</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                                        No execution history.
                                    </td>
                                </tr>
                            ) : (
                                history.map((h) => (
                                    <tr key={h.id} className="border-t border-gray-100">
                                        <td className="px-4 py-3">{h.run_at}</td>
                                        <td className="px-4 py-3">{h.run_by ?? '—'}</td>
                                        <td className="px-4 py-3">{h.row_count ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${h.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                                                {h.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </Card>
            )}

            {activeTab === 'audit' && (
                <p className="text-sm text-gray-400">Audit history — coming soon.</p>
            )}
        </div>
    )
}
