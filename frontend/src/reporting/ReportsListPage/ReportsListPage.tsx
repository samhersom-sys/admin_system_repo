/**
 * ReportsListPage â€” REQ-RPT-FE-F-001 to F-008, REQ-HOME-CFG-FE-F-002 to F-006
 *
 * Shows core templates (read-only), core dashboards, and custom templates.
 * Adds three new inline columns: Homepage (master toggle), Dashboard (show-on-homepage
 * toggle), and No (page order integer).
 * Layout: table format matching BackUp design (app-table).
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiFileText, FiEdit2, FiTrash2, FiCopy } from 'react-icons/fi'
import { FaSearch } from 'react-icons/fa'
import { useNotifications } from '@/shell/NotificationDock'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import Card from '@/shared/Card/Card'
import ResizableGrid, { type Column, type SortConfig } from '@/shared/components/ResizableGrid/ResizableGrid'
import {
    getReportTemplates,
    deleteReportTemplate,
    updateReportTemplate,
    createDashboard,
    patchMasterHomepage,
    patchHomepagePreferences,
    type ReportTemplate,
} from '../reporting.service'
import { CORE_DASHBOARD_TEMPLATES } from '../coreDashboards'
import { getSession } from '@/shared/lib/auth-session/auth-session'

const CORE_TEMPLATES: ReportTemplate[] = [
    { id: -1, name: 'Submissions Report', description: 'All submissions with status and broker info.', type: 'core', data_source: 'submissions', created_by: 'System' },
    { id: -2, name: 'New Business Report', description: 'New policies written in the selected period.', type: 'core', data_source: 'quotes', created_by: 'System' },
    { id: -3, name: 'Parties Report', description: 'Party directory with roles and contact info.', type: 'core', data_source: 'parties', created_by: 'System' },
    { id: -4, name: 'Policies Report', description: 'All policies with premium and expiry data.', type: 'core', data_source: 'policies', created_by: 'System' },
    { id: -5, name: 'User Login Activity Report', description: 'Full login history for users in your organisation. Internal admins see all organisations.', type: 'core', data_source: 'login-activity', created_by: 'System' },
    { id: -6, name: 'Recent Records', description: 'Your recently opened submissions, quotes, policies and binding authorities.', type: 'core', data_source: 'recent-records', created_by: 'System' },
    { id: -7, name: 'My Tasks', description: 'Tasks currently assigned to you.', type: 'core', data_source: 'tasks', created_by: 'System' },
]

// Column set for dashboard sections — Homepage, Additional Homepage, Additional Homepage Order
const WITH_HOMEPAGE_COLUMNS: Column[] = [
    { key: 'name', label: 'Report Name', sortable: false, defaultWidth: 220 },
    { key: 'description', label: 'Description', sortable: false, defaultWidth: 260 },
    { key: 'type', label: 'Type', sortable: false, defaultWidth: 100 },
    { key: 'homepage', label: 'Homepage', sortable: false, defaultWidth: 90 },
    { key: 'dashboard', label: 'Additional Homepage', sortable: false, defaultWidth: 140 },
    { key: 'pageOrder', label: 'Additional Homepage Order', sortable: false, defaultWidth: 170 },
    { key: 'actions', label: 'Actions', sortable: false, defaultWidth: 130 },
]

// Column set for table-based core reports — no homepage configuration columns
const CORE_REPORT_COLUMNS: Column[] = [
    { key: 'name', label: 'Report Name', sortable: false, defaultWidth: 220 },
    { key: 'description', label: 'Description', sortable: false, defaultWidth: 460 },
    { key: 'type', label: 'Type', sortable: false, defaultWidth: 100 },
    { key: 'actions', label: 'Actions', sortable: false, defaultWidth: 110 },
]

const CUSTOM_WITH_HOMEPAGE_COLUMNS: Column[] = [
    { key: 'name', label: 'Name', sortable: true, defaultWidth: 200 },
    { key: 'description', label: 'Description', sortable: false, defaultWidth: 200 },
    { key: 'type', label: 'Type', sortable: true, defaultWidth: 100 },
    { key: 'created_by', label: 'Created By', sortable: true, defaultWidth: 120 },
    { key: 'created_at', label: 'Date Created', sortable: true, defaultWidth: 120 },
    { key: 'homepage', label: 'Homepage', sortable: false, defaultWidth: 90 },
    { key: 'dashboard', label: 'Additional Homepage', sortable: false, defaultWidth: 140 },
    { key: 'pageOrder', label: 'Additional Homepage Order', sortable: false, defaultWidth: 170 },
    { key: 'actions', label: 'Actions', sortable: false, defaultWidth: 140 },
]

export default function ReportsListPage() {
    const navigate = useNavigate()
    const { addNotification } = useNotifications()

    const [templates, setTemplates] = useState<ReportTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [sortConfig, setSortConfig] = useState<SortConfig | undefined>(undefined)
    const [copyingDashboard, setCopyingDashboard] = useState<string | null>(null)

    // Homepage preference state â€” REQ-HOME-CFG-FE-F-003 to F-006
    const session = getSession() as any
    const [masterHomepageId, setMasterHomepageId] = useState<number | null>(
        session?.user?.masterHomepageTemplateId ?? null,
    )
    const [dashboardOn, setDashboardOn] = useState<Record<number, boolean>>({})
    const [pageOrder, setPageOrder] = useState<Record<number, number | ''>>({})
    const [pageOrderError, setPageOrderError] = useState<Record<number, string | null>>({})
    const [togglingMaster, setTogglingMaster] = useState<number | null>(null)
    const [togglingDashboard, setTogglingDashboard] = useState<number | null>(null)

    useEffect(() => {
        setLoading(true)
        getReportTemplates()
            .then((data) => {
                // Merge server-returned templates; replace any core placeholders with server versions
                const mergedCores = CORE_TEMPLATES
                    .map((c) => {
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

    // -----------------------------------------------------------------------
    // Homepage preference handlers â€” REQ-HOME-CFG-FE-F-003 to F-006
    // -----------------------------------------------------------------------

    async function handleMasterToggle(templateId: number) {
        const newId = masterHomepageId === templateId ? null : templateId
        setTogglingMaster(templateId)
        const prev = masterHomepageId
        setMasterHomepageId(newId)
        try {
            await patchMasterHomepage({ masterHomepageTemplateId: newId })
        } catch {
            setMasterHomepageId(prev)
            addNotification('Could not update homepage setting.', 'error')
        } finally {
            setTogglingMaster(null)
        }
    }

    async function handleDashboardToggle(t: ReportTemplate) {
        const current = dashboardOn[t.id] ?? false
        const next = !current
        setTogglingDashboard(t.id)
        setDashboardOn((prev) => ({ ...prev, [t.id]: next }))
        if (!next) setPageOrder((prev) => ({ ...prev, [t.id]: '' }))
        try {
            if (t.type === 'custom') {
                await updateReportTemplate(t.id, { showOnHomepage: next } as any)
            } else {
                await patchHomepagePreferences({ templateId: t.id, showOnHomepage: next })
            }
        } catch {
            setDashboardOn((prev) => ({ ...prev, [t.id]: current }))
            addNotification('Could not update dashboard setting.', 'error')
        } finally {
            setTogglingDashboard(null)
        }
    }

    function handlePageOrderChange(templateId: number, value: string) {
        setPageOrder((prev) => ({ ...prev, [templateId]: value === '' ? '' : (value as any) }))
        setPageOrderError((prev) => ({ ...prev, [templateId]: null }))
    }

    async function handlePageOrderBlur(templateId: number) {
        const raw = pageOrder[templateId]
        if (raw === '' || raw === undefined) return
        const val = Number(raw)
        if (!Number.isFinite(val) || !Number.isInteger(val) || val < 1) {
            setPageOrderError((prev) => ({
                ...prev,
                [templateId]: 'Page order must be a positive integer \u2265 1',
            }))
            setPageOrder((prev) => ({ ...prev, [templateId]: '' }))
            return
        }
        try {
            await patchHomepagePreferences({ templateId, homepagePageOrder: val })
        } catch {
            addNotification('Could not update page order.', 'error')
        }
    }

    // Helper: render the three new homepage columns for a given template row
    function renderHomepageCells(key: string, t: ReportTemplate) {
        if (key === 'homepage') {
            const isOn = masterHomepageId === t.id
            return (
                <button
                    type="button"
                    data-testid={`homepage-toggle-${t.id}`}
                    aria-pressed={isOn}
                    disabled={togglingMaster === t.id}
                    onClick={() => void handleMasterToggle(t.id)}
                    className={`w-7 h-7 rounded-full border-2 transition-colors ${
                        isOn ? 'bg-brand-600 border-brand-600' : 'bg-white border-gray-300 hover:border-brand-400'
                    } disabled:opacity-50`}
                    title={isOn ? 'Clear master homepage' : 'Set as master homepage'}
                />
            )
        }
        if (key === 'dashboard') {
            const isOn = dashboardOn[t.id] ?? false
            return (
                <button
                    type="button"
                    data-testid={`dashboard-toggle-${t.id}`}
                    aria-pressed={isOn}
                    disabled={togglingDashboard === t.id}
                    onClick={() => void handleDashboardToggle(t)}
                    className={`w-7 h-7 rounded-full border-2 transition-colors ${
                        isOn ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300 hover:border-blue-400'
                    } disabled:opacity-50`}
                    title={isOn ? 'Remove from dashboard' : 'Show on dashboard'}
                />
            )
        }
        if (key === 'pageOrder') {
            const isOn = dashboardOn[t.id] ?? false
            const val = pageOrder[t.id]
            const err = pageOrderError[t.id]
            return (
                <div className="flex flex-col gap-0.5">
                    <input
                        type="text"
                        inputMode="numeric"
                        data-testid={`page-order-input-${t.id}`}
                        value={val ?? ''}
                        min={1}
                        disabled={!isOn}
                        onChange={(e) => handlePageOrderChange(t.id, e.target.value)}
                        onBlur={() => void handlePageOrderBlur(t.id)}
                        className="w-14 text-sm border rounded px-1 py-0.5 disabled:bg-gray-50 disabled:text-gray-400"
                    />
                    {err && (
                        <span className="text-xs text-red-600" role="alert">{err}</span>
                    )}
                </div>
            )
        }
        return null
    }

    async function handleDelete(t: ReportTemplate) {
        if (!confirm(`Delete report "${t.name}"?`)) return
        try {
            await deleteReportTemplate(t.id)
            setTemplates((prev) => prev.filter((r) => r.id !== t.id))
            addNotification('Report deleted.', 'success')
        } catch {
            addNotification('Could not delete report.', 'error')
        }
    }

    function handleCopyReport(t: ReportTemplate) {
        navigate('/reports/create', { state: { copyFrom: { name: `Copy of ${t.name}`, description: t.description ?? '' } } })
    }

    async function handleCopyDashboard(coreSlug: string) {
        const coreDash = CORE_DASHBOARD_TEMPLATES[coreSlug]
        if (!coreDash) return
        setCopyingDashboard(coreSlug)
        try {
            const created = await createDashboard({
                name: `Copy of ${coreDash.name}`,
                description: coreDash.description ?? '',
                config: coreDash.dashboardConfig,
            })
            navigate(`/dashboards/configure/${created.id}`)
        } catch {
            addNotification('Could not copy dashboard.', 'error')
        } finally {
            setCopyingDashboard(null)
        }
    }

    function handleSort(key: string) {
        setSortConfig((prev) => {
            if (prev?.key === key) return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
            return { key, direction: 'asc' }
        })
    }

    const coreTemplates = templates.filter((t) => t.type === 'core' || t.id < 0)
    const dashboardTemplates = templates.filter((t) => t.type === 'dashboard' && t.id >= 0)
    const customTemplates = templates.filter((t) => t.type === 'custom' && t.id >= 0)
    const coreDashboards = Object.values(CORE_DASHBOARD_TEMPLATES)

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
                    {/* Core Homepages â€” REQ-HOME-CFG-FE-F-002 */}
                    <section aria-label="Core Homepages">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">Core Homepages</h2>
                        <Card className="overflow-hidden">
                            <ResizableGrid
                                columns={WITH_HOMEPAGE_COLUMNS}
                                rows={dashboardTemplates}
                                storageKey="table-widths-homepages"
                                renderCell={(key, row) => {
                                    const t = row as ReportTemplate
                                    const hpCell = renderHomepageCells(key, t)
                                    if (hpCell !== null) return hpCell
                                    if (key === 'name') return <div className="flex items-center gap-2"><FiFileText className="text-brand-500" size={16} /><span className="font-medium">{t.name}</span></div>
                                    if (key === 'description') return <span className="text-gray-600 text-sm">{t.description ?? 'â€”'}</span>
                                    if (key === 'type') return <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">Dashboard</span>
                                    if (key === 'actions') {
                                        const isUserCreated = t.created_by && t.created_by !== 'System'
                                        return (
                                            <div className="inline-flex items-center gap-1">
                                                <button type="button" onClick={() => navigate(`/dashboards/view/${t.id}`)} title="View Dashboard" className="p-2 text-brand-500 hover:text-brand-700 hover:bg-brand-50 rounded"><FaSearch size={14} /></button>
                                                {isUserCreated && (
                                                    <>
                                                        <button type="button" onClick={() => navigate(`/dashboards/edit/${t.id}`)} title="Edit Report" className="p-2 text-brand-500 hover:text-brand-700 hover:bg-brand-50 rounded"><FiEdit2 size={14} /></button>
                                                        <button type="button" onClick={() => handleDelete(t)} title="Delete Report" className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"><FiTrash2 size={14} /></button>
                                                    </>
                                                )}
                                            </div>
                                        )
                                    }
                                    return 'â€”'
                                }}
                                emptyMessage="No dashboards found. Create a dashboard to use it as your homepage."
                            />
                        </Card>
                    </section>

                    {/* Core Application Reports â€” REQ-RPT-FE-F-001 */}
                    <section aria-label="Core Application Reports">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">Core Application Reports</h2>
                        <Card className="overflow-hidden">
                            <ResizableGrid
                                columns={CORE_REPORT_COLUMNS}
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
                                    if (key === 'description') return <span className="text-gray-600 text-sm">{t.description ?? 'â€”'}</span>
                                    if (key === 'type') {
                                        return <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">Core Report</span>
                                    }
                                    if (key === 'actions') {
                                        return (
                                            <div className="inline-flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/reports/run/${t.data_source}`)}
                                                    title="Run Report"
                                                    className="p-2 text-brand-500 hover:text-brand-700 hover:bg-brand-50 rounded"
                                                >
                                                    <FaSearch size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyReport(t)}
                                                    title="Copy to My Reports"
                                                    className="p-2 text-brand-500 hover:text-brand-700 hover:bg-brand-50 rounded"
                                                >
                                                    <FiCopy size={14} />
                                                </button>
                                            </div>
                                        )
                                    }
                                    return 'â€”'
                                }}
                                emptyMessage="No core reports available."
                            />
                        </Card>
                    </section>

                    {/* Core Application Dashboards */}
                    <section aria-label="Core Application Dashboards">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">Core Application Dashboards</h2>
                        <Card className="overflow-hidden">
                            <ResizableGrid
                                columns={WITH_HOMEPAGE_COLUMNS}
                                rows={coreDashboards}
                                storageKey="table-widths-dashboards-core"
                                renderCell={(key, row) => {
                                    const d = row as (ReportTemplate & { coreSlug: string })
                                    const hpCell = renderHomepageCells(key, d)
                                    if (hpCell !== null) return hpCell
                                    if (key === 'name') {
                                        return (
                                            <div className="flex items-center gap-2">
                                                <FiFileText className="text-brand-500" size={16} />
                                                <span className="font-medium">{d.name}</span>
                                            </div>
                                        )
                                    }
                                    if (key === 'description') return <span className="text-gray-600 text-sm">{d.description ?? 'â€”'}</span>
                                    if (key === 'type') {
                                        return <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">Core Dashboard</span>
                                    }
                                    if (key === 'actions') {
                                        return (
                                            <div className="inline-flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/dashboards/view/${d.coreSlug}`)}
                                                    title="View Dashboard"
                                                    className="p-2 text-brand-500 hover:text-brand-700 hover:bg-brand-50 rounded"
                                                >
                                                    <FaSearch size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleCopyDashboard(d.coreSlug)}
                                                    title="Copy to My Dashboards"
                                                    disabled={copyingDashboard === d.coreSlug}
                                                    className="p-2 text-brand-500 hover:text-brand-700 hover:bg-brand-50 rounded disabled:opacity-50"
                                                >
                                                    <FiCopy size={14} />
                                                </button>
                                            </div>
                                        )
                                    }
                                    return 'â€”'
                                }}
                                emptyMessage="No core dashboards available."
                            />
                        </Card>
                    </section>

                    {/* Custom Reports */}
                    <section aria-label="My Custom Reports">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">My Custom Reports</h2>
                        {customTemplates.length === 0 ? (
                            <Card className="p-6 text-center text-gray-500">
                                <p>No custom reports yet.</p>
                                <p className="text-sm mt-2">Click &quot;Create Report&quot; to build your first custom report template.</p>
                            </Card>
                        ) : (
                            <Card className="overflow-hidden">
                                <ResizableGrid
                                    columns={CUSTOM_WITH_HOMEPAGE_COLUMNS}
                                    rows={sortedCustom}
                                    storageKey="table-widths-reports-custom"
                                    sortConfig={sortConfig}
                                    onRequestSort={handleSort}
                                    renderCell={(key, row) => {
                                        const t = row as ReportTemplate
                                        const hpCell = renderHomepageCells(key, t)
                                        if (hpCell !== null) return hpCell
                                        if (key === 'name') {
                                            return (
                                                <div className="flex items-center gap-2">
                                                    <FiFileText className="text-brand-500" size={16} />
                                                    <span className="font-medium">{t.name}</span>
                                                </div>
                                            )
                                        }
                                        if (key === 'description') return <span className="text-gray-600 text-sm">{t.description || 'â€”'}</span>
                                        if (key === 'type') {
                                            const label = t.type === 'dashboard' ? 'Dashboard' : 'Report'
                                            return <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">{label}</span>
                                        }
                                        if (key === 'created_by') return <span className="text-sm text-gray-600">{t.created_by || 'â€”'}</span>
                                        if (key === 'created_at') {
                                            return (
                                                <span className="text-sm text-gray-600">
                                                    {t.created_at ? new Date(t.created_at).toLocaleDateString() : 'â€”'}
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
                                        return 'â€”'
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
