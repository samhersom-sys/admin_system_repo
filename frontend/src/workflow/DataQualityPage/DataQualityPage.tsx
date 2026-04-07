/**
 * DataQualityPage — REQ-WF-FE-F-051 to F-058
 *
 * Shows data quality issues with summary cards, severity/type filters, and refresh.
 * Sorted: High first, then alphabetically by entity reference.
 */

import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FiRefreshCw } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import { getDataQualityIssues, type DataQualityIssue, type DataQualitySeverity } from '../workflow.service'

const SEVERITY_CLASSES: Record<DataQualitySeverity, string> = {
    High: 'bg-red-100 text-red-700',
    Medium: 'bg-amber-100 text-amber-800',
    Low: 'bg-gray-100 text-gray-600',
}

const SEVERITY_ORDER: Record<DataQualitySeverity, number> = {
    High: 0,
    Medium: 1,
    Low: 2,
}

const ENTITY_PATH: Record<string, string> = {
    submission: '/submissions',
    policy: '/policies',
    party: '/parties',
    quote: '/quotes',
}

function entityLink(issue: DataQualityIssue): string | null {
    if (!issue.entity_id) return null
    const base = ENTITY_PATH[issue.entity_type.toLowerCase()]
    return base ? `${base}/${issue.entity_id}` : null
}

export default function DataQualityPage() {
    const { addNotification } = useNotifications()

    const [issues, setIssues] = useState<DataQualityIssue[]>([])
    const [loading, setLoading] = useState(true)
    const [filterSeverity, setFilterSeverity] = useState<string>('')
    const [filterEntityType, setFilterEntityType] = useState<string>('')

    function load() {
        setLoading(true)
        getDataQualityIssues()
            .then(setIssues)
            .catch(() => addNotification('Could not load data quality issues.', 'error'))
            .finally(() => setLoading(false))
    }

    useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const filtered = useMemo(() => {
        let rows = issues
        if (filterSeverity) rows = rows.filter((r) => r.severity === filterSeverity)
        if (filterEntityType) rows = rows.filter((r) => r.entity_type === filterEntityType)
        return [...rows].sort((a, b) => {
            const sev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
            if (sev !== 0) return sev
            return a.entity_reference.localeCompare(b.entity_reference)
        })
    }, [issues, filterSeverity, filterEntityType])

    const entityTypes = useMemo(
        () => [...new Set(issues.map((i) => i.entity_type))].sort(),
        [issues]
    )

    const byType = useMemo(() => {
        const map: Record<string, number> = {}
        issues.forEach((i) => { map[i.entity_type] = (map[i.entity_type] ?? 0) + 1 })
        return map
    }, [issues])

    const bySeverity = useMemo(() => ({
        High: issues.filter((i) => i.severity === 'High').length,
        Medium: issues.filter((i) => i.severity === 'Medium').length,
        Low: issues.filter((i) => i.severity === 'Low').length,
    }), [issues])

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">Data Quality</h2>
                <button
                    type="button"
                    onClick={load}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
                >
                    <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <p className="text-sm text-gray-500">Total Issues</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{issues.length}</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <p className="text-sm text-gray-500 mb-2">By Type</p>
                    <div className="flex flex-col gap-0.5">
                        {Object.entries(byType).map(([t, n]) => (
                            <p key={t} className="text-sm text-gray-700">
                                <span className="font-medium capitalize">{t}</span>: {n}
                            </p>
                        ))}
                        {Object.keys(byType).length === 0 && <p className="text-sm text-gray-400">—</p>}
                    </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <p className="text-sm text-gray-500 mb-2">By Severity</p>
                    <div className="flex flex-col gap-0.5">
                        {(['High', 'Medium', 'Low'] as DataQualitySeverity[]).map((s) => (
                            <p key={s} className="text-sm text-gray-700">
                                <span className="font-medium">{s}</span>: {bySeverity[s]}
                            </p>
                        ))}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
                <select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                >
                    <option value="">All Severities</option>
                    {(['High', 'Medium', 'Low'] as DataQualitySeverity[]).map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
                <select
                    value={filterEntityType}
                    onChange={(e) => setFilterEntityType(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                >
                    <option value="">All Entity Types</option>
                    {entityTypes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 text-left">
                            <tr>
                                <th className="px-4 py-3 font-medium text-gray-600">Entity Type</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Entity Reference</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Field</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Issue</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Severity</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                                        No data quality issues found.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((issue) => {
                                    const link = entityLink(issue)
                                    return (
                                        <tr key={issue.id} className="border-t border-gray-100 hover:bg-gray-100">
                                            <td className="px-4 py-3 capitalize">{issue.entity_type}</td>
                                            <td className="px-4 py-3">
                                                {link ? (
                                                    <Link to={link} className="text-brand-600 hover:underline font-medium">
                                                        {issue.entity_reference}
                                                    </Link>
                                                ) : (
                                                    issue.entity_reference
                                                )}
                                            </td>
                                            <td className="px-4 py-3">{issue.field}</td>
                                            <td className="px-4 py-3">{issue.issue_description}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_CLASSES[issue.severity]}`}>
                                                    {issue.severity}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
