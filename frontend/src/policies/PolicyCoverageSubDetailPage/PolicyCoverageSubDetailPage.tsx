/**
 * PolicyCoverageSubDetailPage
 *   /policies/:policyId/sections/:sectionId/coverages/:coverageId/details/:detailName
 *
 * Requirements: frontend/src/policies/policies.requirements.md
 * Tests: frontend/src/policies/__tests__/PoliciesPages.test.tsx
 *
 * REQ-POL-FE-F-031 — Locations tab; rows grouped by CoverageSubType;
 *                     "No Sub-Detail" sorted last; empty state
 */

import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
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

const TABS: TabItem[] = [{ key: 'locations', label: 'Locations' }]
const NO_SUB_DETAIL_LABEL = 'No Sub-Detail'

function groupByCoverageSubType(rows: LocationRow[]): Map<string, LocationRow[]> {
    const map = new Map<string, LocationRow[]>()
    for (const row of rows) {
        const rawKey = row.CoverageSubType?.trim()
        const key = rawKey || NO_SUB_DETAIL_LABEL
        const existing = map.get(key) ?? []
        map.set(key, [...existing, row])
    }
    // Sort alphabetically, but always put NO_SUB_DETAIL_LABEL last
    const entries = [...map.entries()].sort(([a], [b]) => {
        if (a === NO_SUB_DETAIL_LABEL) return 1
        if (b === NO_SUB_DETAIL_LABEL) return -1
        return a.localeCompare(b)
    })
    return new Map(entries)
}

export default function PolicyCoverageSubDetailPage() {
    const { policyId, sectionId, coverageId, detailName } = useParams<{
        policyId: string
        sectionId: string
        coverageId: string
        detailName: string
    }>()
    const { addNotification } = useNotifications()

    const decoded = detailName ? decodeURIComponent(detailName) : ''

    const [policy, setPolicy] = useState<Policy | null>(null)
    const [section, setSection] = useState<PolicySection | null>(null)
    const [coverage, setCoverage] = useState<PolicyCoverage | null>(null)
    const [locations, setLocations] = useState<LocationRow[]>([])
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [activeTab, setActiveTab] = useState('locations')

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
                // Filter to only rows matching this detailName CoverageType
                const matching = locs.filter((r) => r.CoverageType?.trim() === decoded)
                setLocations(matching)
            })
            .catch((err: Error) => {
                addNotification(`Could not load coverage detail: ${err.message}`, 'error')
            })
    }, [policyId, sectionId]) // eslint-disable-line react-hooks/exhaustive-deps

    // Second wave: load coverages once policy is available
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
                <Link
                    to={`/policies/${policyId}/sections/${sectionId}/coverages/${coverageId}`}
                    className="text-brand-600 hover:underline"
                >
                    Back to Coverage
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

    const grouped = groupByCoverageSubType(locations)
    const hasGroups = grouped.size > 0

    const totals: Record<string, number> = {}
    for (const [type, rows] of grouped) {
        totals[type] = rows.reduce((sum, r) => sum + (r.SumInsured ?? 0), 0)
    }
    const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0)

    return (
        <div className="p-6 flex flex-col gap-6">
            {/* Breadcrumb */}
            <div className="text-sm text-gray-500">
                <Link to={`/policies/${policyId}`} className="text-brand-600 hover:underline">
                    ← Policy
                </Link>
                {section && (
                    <>
                        {' / '}
                        <Link
                            to={`/policies/${policyId}/sections/${sectionId}`}
                            className="text-brand-600 hover:underline"
                        >
                            Section
                        </Link>
                    </>
                )}
                {' / '}
                <Link
                    to={`/policies/${policyId}/sections/${sectionId}/coverages/${coverageId}`}
                    className="text-brand-600 hover:underline"
                >
                    Coverage
                </Link>
                {' / '}
                {decoded}
            </div>

            {/* Header */}
            <FieldGroup title="Coverage Sub-Detail">
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div>
                        <p className="text-xs text-gray-500">Policy</p>
                        <p className="font-semibold text-gray-900">{policy.reference}</p>
                    </div>
                    {section && (
                        <div>
                            <p className="text-xs text-gray-500">Section</p>
                            <p className="text-gray-900">{section.reference}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-xs text-gray-500">Coverage Detail</p>
                        <p className="text-gray-900">{decoded}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Coverage</p>
                        <p className="text-gray-900">{coverage.coverage ?? '—'}</p>
                    </div>
                </div>
            </FieldGroup>

            {/* Locations tab */}
            <TabsNav tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === 'locations' && (
                <Card>
                    {!hasGroups ? (
                        <p className="text-sm text-gray-400">No locations found.</p>
                    ) : (
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                                    <th className="pb-2 font-medium">Coverage Sub-Type</th>
                                    <th className="pb-2 font-medium">Currency</th>
                                    <th className="pb-2 font-medium text-right">Sum Insured</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...grouped.keys()].map((subType) => (
                                    <tr
                                        key={subType}
                                        className="border-b border-gray-100 hover:bg-gray-100"
                                    >
                                        <td className="py-2 text-gray-800">{subType}</td>
                                        <td className="py-2 text-gray-600">
                                            {grouped.get(subType)?.[0]?.Currency ?? '—'}
                                        </td>
                                        <td className="py-2 text-right text-gray-800">
                                            {totals[subType].toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-gray-300">
                                    <td className="py-2 font-semibold text-gray-700" colSpan={2}>
                                        Total
                                    </td>
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
