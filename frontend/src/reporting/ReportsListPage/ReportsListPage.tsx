/**
 * ReportsListPage — REQ-RPT-FE-F-001 to F-008
 *
 * Shows core templates (read-only) and custom templates (run/edit/delete).
 * 4 always-present core templates are merged with any server-returned core templates.
 * Layout: table format matching BackUp design (app-table).
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiFileText, FiEdit2, FiTrash2 } from 'react-icons/fi'
import { FaSearch } from 'react-icons/fa'
import { useNotifications } from '@/shell/NotificationDock'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import Card from '@/shared/Card/Card'
import ResizableGrid, { type Column, type SortConfig } from '@/shared/components/ResizableGrid/ResizableGrid'
import { getReportTemplates, deleteReportTemplate, type ReportTemplate } from '../reporting.service'

const CORE_TEMPLATES: ReportTemplate[] = [
    { id: -1, name: 'Submissions Report', description: 'All submissions with status and broker info.', type: 'core', data_source: 'submissions', created_by: 'System' },
    { id: -2, name: 'New Business Report', description: 'New policies written in the selected period.', type: 'core', data_source: 'quotes', created_by: 'System' },
    { id: -3, name: 'Parties Report', description: 'Party directory with roles and contact info.', type: 'core', data_source: 'parties', created_by: 'System' },
    { id: -4, name: 'Policies Report', description: 'All policies with premium and expiry data.', type: 'core', data_source: 'policies', created_by: 'System' },
]

const CORE_COLUMNS: Column[] = [
    { key: 'name', label: 'Report Name', sortable: false, defaultWidth: 220 },
    { key: 'description', label: 'Description', sortable: false, defaultWidth: 340 },
    { key: 'data_source', label: 'Data Source', sortable: false, defaultWidth: 130 },
    { key: 'type', label: 'Type', sortable: false, defaultWidth: 120 },
    { key: 'actions', label: 'Actions', sortable: false, defaultWidth: 80 },
]

const CUSTOM_COLUMNS: Column[] = [
    { key: 'name', label: 'Name', sortable: true, defaultWidth: 200 },
    { key: 'description', label: 'Description', sortable: false, defaultWidth: 280 },
    { key: 'type', label: 'Type', sortable: true, defaultWidth: 110 },
    { key: 'created_by', label: 'Created By', sortable: true, defaultWidth: 140 },
    { key: 'created_at', label: 'Date Created', sortable: true, defaultWidth: 140 },
    { key: 'actions', label: 'Actions', sortable: false, defaultWidth: 140 },
]

export default function ReportsListPage() {
    const navigate = useNavigate()
    const { addNotification } = useNotifications()

    const [templates, setTemplates] = useState<ReportTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [sortConfig, setSortConfig] = useState<SortConfig | undefined>(undefined)

    useEffect(() => {
        setLoading(true)
        getReportTemplates()
            .then((data) => {
                // Merge server-returned templates; replace any core placeholders with server versions
                const mergedCores = CORE_TEMPLATES.map((c) => {
                    const found = data.find((t) => t.type === 'core' && t.name === c.name)
                    return found ?? c
                })
                const extraCores = data.filter(
                    (t) => t.type === 'core' && !CORE_TEMPLATES.some((c) => c.name === t.name)
                )
                const customs = data.filter((t) => t.type !== 'core')
                setTemplates([...mergedCores, ...extraCores, ...customs])
            })
            .catch(() => addNotification('Could not load report templates.', 'error'))
            .finally(() => setLoading(false))
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    async function handleDelete(t: ReportTemplate) {
        if (t.id < 0) return
        if (!confirm(`Delete report "${t.name}"?`)) return
        try {
            await deleteReportTemplate(t.id)
            setTemplates((prev) => prev.filter((r) => r.id !== t.id))
            addNotification('Report deleted.', 'success')
        } catch {
            addNotification('Could not delete report.', 'error')
        }
    }

    function handleSort(key: string) {
        setSortConfig((prev) => {
            if (prev?.key === key) return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
            return { key, direction: 'asc' }
        })
    }

    const coreTemplates = templates.filter((t) => t.type === 'core' || t.id < 0)
    const customTemplates = templates.filter((t) => t.type !== 'core' && t.id >= 0)

    const sortedCustom = [...customTemplates].sort((a, b) => {
        if (!sortConfig) return 0
        const aVal = String((a as unknown as Record<string, unknown>)[sortConfig.key] ?? '')
        const bVal = String((b as unknown as Record<string, unknown>)[sortConfig.key] ?? '')
        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    })

    return (
        <div className="p-6 flex flex-col gap-6">
            <h2 className="text-xl font-semibold text-gray-800">Report Library</h2>

            {loading ? (
                <LoadingSpinner />
            ) : (
                <>
                    {/* Core Application Reports */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">Core Application Reports</h2>
                        <Card className="overflow-hidden">
                            <ResizableGrid
                                columns={CORE_COLUMNS}
                                rows={coreTemplates}
                                storageKey="table-widths-reports-core"
                                renderCell={(key, row) => {
                                    const t = row as ReportTemplate
                                    if (key === 'name') {
                                        return (
                                            <div className="flex items-center gap-2">
                                                <FiFileText className="text-brand-500" size={16} />
                                                <span className="font-medium">{t.name}</span>
                                            </div>
                                        )
                                    }
                                    if (key === 'description') return <span className="text-gray-600 text-sm">{t.description ?? '—'}</span>
                                    if (key === 'data_source') {
                                        return (
                                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                                {t.data_source ?? '—'}
                                            </span>
                                        )
                                    }
                                    if (key === 'type') {
                                        return <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">Core Report</span>
                                    }
                                    if (key === 'actions') {
                                        return (
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/reports/run/${t.data_source}`)}
                                                title="Run Report"
                                                className="p-2 text-brand-500 hover:text-brand-700 hover:bg-brand-50 rounded"
                                            >
                                                <FaSearch size={14} />
                                            </button>
                                        )
                                    }
                                    return '—'
                                }}
                                emptyMessage="No core reports available."
                            />
                        </Card>
                    </section>

                    {/* Custom Reports */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">My Custom Reports</h2>
                        {customTemplates.length === 0 ? (
                            <Card className="p-6 text-center text-gray-500">
                                <p>No custom reports yet.</p>
                                <p className="text-sm mt-2">Click &quot;Create Report&quot; to build your first custom report template.</p>
                            </Card>
                        ) : (
                            <Card className="overflow-hidden">
                                <ResizableGrid
                                    columns={CUSTOM_COLUMNS}
                                    rows={sortedCustom}
                                    storageKey="table-widths-reports-custom"
                                    sortConfig={sortConfig}
                                    onRequestSort={handleSort}
                                    renderCell={(key, row) => {
                                        const t = row as ReportTemplate
                                        if (key === 'name') {
                                            return (
                                                <div className="flex items-center gap-2">
                                                    <FiFileText className="text-brand-500" size={16} />
                                                    <span className="font-medium">{t.name}</span>
                                                </div>
                                            )
                                        }
                                        if (key === 'description') return <span className="text-gray-600 text-sm">{t.description || '—'}</span>
                                        if (key === 'type') {
                                            const label = t.type === 'dashboard' ? 'Dashboard' : 'Report'
                                            return <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">{label}</span>
                                        }
                                        if (key === 'created_by') return <span className="text-sm text-gray-600">{t.created_by || '—'}</span>
                                        if (key === 'created_at') {
                                            return (
                                                <span className="text-sm text-gray-600">
                                                    {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                                                </span>
                                            )
                                        }
                                        if (key === 'actions') {
                                            const primaryActionLabel = t.type === 'dashboard' ? 'View Dashboard' : 'Run Report'
                                            const primaryActionPath = t.type === 'dashboard' ? `/dashboards/view/${t.id}` : `/reports/run/${t.id}`
                                            return (
                                                <div className="inline-flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(primaryActionPath)}
                                                        className="p-2 text-brand-500 hover:text-brand-700 hover:bg-brand-50 rounded"
                                                        title={primaryActionLabel}
                                                    >
                                                        <FaSearch size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(t.type === 'dashboard' ? `/dashboards/edit/${t.id}` : `/reports/edit/${t.id}`)}
                                                        className="p-2 text-brand-500 hover:text-brand-700 hover:bg-brand-50 rounded"
                                                        title="Edit Report"
                                                    >
                                                        <FiEdit2 size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(t)}
                                                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                                        title="Delete Report"
                                                    >
                                                        <FiTrash2 size={14} />
                                                    </button>
                                                </div>
                                            )
                                        }
                                        return '—'
                                    }}
                                    emptyMessage="No custom reports yet."
                                />
                            </Card>
                        )}
                    </section>
                </>
            )}
        </div>
    )
}
