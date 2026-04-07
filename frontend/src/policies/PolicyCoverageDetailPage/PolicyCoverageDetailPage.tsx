/**
 * PolicyCoverageDetailPage — /policies/:policyId/sections/:sectionId/coverages/:coverageId
 *
 * Requirements: frontend/src/policies/policies.requirements.md
 * Tests: frontend/src/policies/__tests__/PoliciesPages.test.tsx
 *
 * REQ-POL-FE-F-029 — loads policy/sections/coverages/locations; error if coverage not found
 * REQ-POL-FE-F-030 — header fields; Sub-Details tab grouped by CoverageType; clickable rows; empty state
 */

import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
    getPolicy,
    getPolicySections,
    getPolicyCoverages,
    getPolicyLocations,
} from '@/policies/policies.service'
import type { Policy, PolicySection, PolicyCoverage, LocationRow } from '@/policies/policies.service'
import { useNotifications } from '@/shell/NotificationDock'
import Card from '@/shared/Card/Card'
import FieldGroup from '@/shared/components/FieldGroup/FieldGroup'
import TabsNav from '@/shared/components/TabsNav/TabsNav'
import type { TabItem } from '@/shared/components/TabsNav/TabsNav'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'

const TABS: TabItem[] = [
    { key: 'sub-details', label: 'Coverage Sub-Details' },
]

// Group location rows by CoverageType, returning a Map with sorted keys
function groupByCoverageType(rows: LocationRow[]): Map<string, LocationRow[]> {
    const map = new Map<string, LocationRow[]>()
    for (const row of rows) {
        const key = row.CoverageType?.trim()
        if (!key) continue
        const existing = map.get(key) ?? []
        map.set(key, [...existing, row])
    }
    // Sort keys alphabetically
    return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)))
}

export default function PolicyCoverageDetailPage() {
    const { policyId, sectionId, coverageId } = useParams<{
        policyId: string
        sectionId: string
        coverageId: string
    }>()
    const navigate = useNavigate()
    const { addNotification } = useNotifications()

    const [policy, setPolicy] = useState<Policy | null>(null)
    const [section, setSection] = useState<PolicySection | null>(null)
    const [coverage, setCoverage] = useState<PolicyCoverage | null>(null)
    const [locations, setLocations] = useState<LocationRow[]>([])
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [activeTab, setActiveTab] = useState('sub-details')

    // First wave: load policy, sections, locations
    useEffect(() => {
        if (!policyId || !sectionId) return
        Promise.all([
            getPolicy(policyId),
            getPolicySections(policyId),
            getPolicyLocations(policyId),
        ])
            .then(([pol, sections, locs]) => {
                setPolicy(pol)
                const sec = sections.find((s) => String(s.id) === sectionId)
                if (sec) setSection(sec)
                setLocations(locs)
            })
            .catch((err: Error) => {
                addNotification(`Could not load policy: ${err.message}`, 'error')
            })
    }, [policyId, sectionId]) // eslint-disable-line react-hooks/exhaustive-deps

    // Second wave: load coverages once policy+section are available
    useEffect(() => {
        if (!policy || !policyId || !sectionId || !coverageId) return
        getPolicyCoverages(policyId, sectionId)
            .then((coverages) => {
                const cov = coverages.find((c) => String(c.id) === coverageId)
                if (!cov) {
                    setNotFound(true)
                } else {
                    setCoverage(cov)
                }
            })
            .catch((err: Error) => {
                addNotification(`Could not load coverage: ${err.message}`, 'error')
                setNotFound(true)
            })
            .finally(() => setLoading(false))
    }, [policy]) // eslint-disable-line react-hooks/exhaustive-deps

    if (notFound) {
        return (
            <div className="p-6 text-sm text-red-600">
                Coverage not found.{' '}
                <Link to={`/policies/${policyId}/sections/${sectionId}`} className="text-brand-600 hover:underline">
                    Back to Section
                </Link>
            </div>
        )
    }

    if (!coverage || !policy) {
        return (
            <div className="p-6 flex items-center justify-center">
                <LoadingSpinner />
            </div>
        )
    }

    const grouped = groupByCoverageType(locations)
    const hasGroups = grouped.size > 0

    // Sum per CoverageType
    const totals: Record<string, number> = {}
    for (const [type, rows] of grouped) {
        totals[type] = rows.reduce((sum, r) => sum + (r.SumInsured ?? 0), 0)
    }
    const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0)

    function handleRowClick(coverageType: string) {
        navigate(
            `/policies/${policyId}/sections/${sectionId}/coverages/${coverageId}/details/${encodeURIComponent(coverageType)}`
        )
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            {/* Breadcrumb */}
            <div className="text-sm text-gray-500">
                <Link to={`/policies/${policyId}`} className="text-brand-600 hover:underline">
                    {policy.reference}
                </Link>
                {section && (
                    <>
                        {' / '}
                        <Link
                            to={`/policies/${policyId}/sections/${sectionId}`}
                            className="text-brand-600 hover:underline"
                        >
                            {section.reference}
                        </Link>
                    </>
                )}
                {' / '}
                {coverage.reference}
            </div>

            {/* Header — F-030 */}
            <FieldGroup title="Coverage Details">
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div>
                        <p className="text-xs text-gray-500">Reference</p>
                        <p className="font-semibold text-gray-900">{coverage.reference}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Coverage</p>
                        <p className="text-gray-900">{coverage.coverage ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Insured</p>
                        <p className="text-gray-900">{policy.insured}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Sum Insured Currency</p>
                        <p className="text-gray-900">{coverage.sum_insured_currency ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Sum Insured</p>
                        <p className="text-gray-900">
                            {coverage.sum_insured != null ? coverage.sum_insured.toLocaleString() : '—'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Effective Date</p>
                        <p className="text-gray-900">{coverage.effective_date ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Expiry Date</p>
                        <p className="text-gray-900">{coverage.expiry_date ?? '—'}</p>
                    </div>
                </div>
            </FieldGroup>

            {/* Sub-Details tab — F-030 */}
            <TabsNav tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === 'sub-details' && (
                <Card>
                    {!hasGroups ? (
                        <p className="text-sm text-gray-400">No coverage details found.</p>
                    ) : (
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                                    <th className="pb-2 font-medium">Coverage Type</th>
                                    <th className="pb-2 font-medium text-right">Sum Insured</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...grouped.keys()].map((type) => (
                                    <tr
                                        key={type}
                                        className="border-b border-gray-100 cursor-pointer hover:bg-gray-100"
                                        onClick={() => handleRowClick(type)}
                                    >
                                        <td className="py-2 text-brand-600">{type}</td>
                                        <td className="py-2 text-right text-gray-800">
                                            {totals[type].toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-gray-300">
                                    <td className="py-2 font-semibold text-gray-700">Total</td>
                                    <td className="py-2 text-right font-semibold text-gray-900">
                                        {grandTotal.toLocaleString()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </Card>
            )}
        </div>
    )
}
