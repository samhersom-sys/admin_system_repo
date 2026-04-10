/**
 * QuoteCoverageSubDetailPage — /quotes/:id/sections/:sectionId/coverages/:coverageId/details/:detailName
 *
 * Requirements: frontend/src/quotes/quotes.requirements.md
 * Tests: frontend/src/quotes/quotes.test.tsx
 *
 * REQ-QUO-FE-F-064 — loads parent quote, section, coverage, and locations
 * REQ-QUO-FE-F-065 — read-only header + Locations tab grouped by CoverageSubType;
 *                     "No Sub-Detail" rows sorted last
 */

import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
    getQuote,
    listSections,
    listCoverages,
    getQuoteLocations,
} from '@/quotes/quotes.service'
import type { Quote, QuoteSection, Coverage, LocationRow } from '@/quotes/quotes.service'
import { useNotifications } from '@/shell/NotificationDock'
import Card from '@/shared/Card/Card'
import FieldGroup from '@/shared/components/FieldGroup/FieldGroup'
import TabsNav from '@/shared/components/TabsNav/TabsNav'
import type { TabItem } from '@/shared/components/TabsNav/TabsNav'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'

const TABS: TabItem[] = [{ key: 'locations', label: 'Locations' }]

function groupByCoverageSubType(rows: LocationRow[]): Map<string, LocationRow[]> {
    const map = new Map<string, LocationRow[]>()
    for (const row of rows) {
        const key = row.CoverageSubType?.trim() || 'No Sub-Detail'
        const existing = map.get(key) ?? []
        map.set(key, [...existing, row])
    }
    // Sort alphabetically, "No Sub-Detail" always last
    return new Map(
        [...map.entries()].sort(([a], [b]) => {
            if (a === 'No Sub-Detail') return 1
            if (b === 'No Sub-Detail') return -1
            return a.localeCompare(b)
        })
    )
}

export default function QuoteCoverageSubDetailPage() {
    const { id, sectionId, coverageId, detailName } = useParams<{
        id: string
        sectionId: string
        coverageId: string
        detailName: string
    }>()
    const { addNotification } = useNotifications()

    const quoteId = Number(id)
    const decoded = detailName ? decodeURIComponent(detailName) : ''

    const [quote, setQuote] = useState<Quote | null>(null)
    const [section, setSection] = useState<QuoteSection | null>(null)
    const [coverage, setCoverage] = useState<Coverage | null>(null)
    const [locations, setLocations] = useState<LocationRow[]>([])
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [activeTab, setActiveTab] = useState('locations')

    useEffect(() => {
        if (!id || !sectionId || !coverageId) return
        setLoading(true)
        Promise.all([
            getQuote(quoteId),
            listSections(quoteId),
            listCoverages(quoteId, Number(sectionId)),
            getQuoteLocations(quoteId),
        ])
            .then(([q, sections, coverages, locs]) => {
                setQuote(q)
                const sec = sections.find((s) => String(s.id) === sectionId)
                if (sec) setSection(sec)
                const cov = coverages.find((c) => String(c.id) === coverageId)
                if (!cov) {
                    setNotFound(true)
                } else {
                    setCoverage(cov)
                    const sectionCurrency = sec?.sum_insured_currency ?? 'GBP'
                    setLocations(locs.filter((r) => r.CoverageType === decoded && r.Currency === sectionCurrency))
                }
            })
            .catch((err: Error) => {
                addNotification(`Could not load coverage sub-details: ${err.message}`, 'error')
                setNotFound(true)
            })
            .finally(() => setLoading(false))
    }, [quoteId, sectionId, coverageId, decoded]) // eslint-disable-line react-hooks/exhaustive-deps

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center">
                <LoadingSpinner />
            </div>
        )
    }

    if (notFound || !coverage || !quote) {
        return (
            <div className="p-6 text-sm text-red-600">
                Coverage sub-details not found.{' '}
                <Link
                    to={`/quotes/${id}/sections/${sectionId}/coverages/${coverageId}`}
                    className="text-brand-600 hover:underline"
                >
                    Back to Coverage
                </Link>
            </div>
        )
    }

    const grouped = groupByCoverageSubType(locations)
    const hasGroups = grouped.size > 0

    return (
        <div className="p-6 flex flex-col gap-6">
            {/* Breadcrumb */}
            <div className="text-sm text-gray-500">
                <Link to={`/quotes/${id}`} className="text-brand-600 hover:underline">
                    {quote.reference}
                </Link>
                {section && (
                    <>
                        {' / '}
                        <Link
                            to={`/quotes/${id}/sections/${sectionId}`}
                            className="text-brand-600 hover:underline"
                        >
                            {section.reference}
                        </Link>
                    </>
                )}
                {' / '}
                <Link
                    to={`/quotes/${id}/sections/${sectionId}/coverages/${coverageId}`}
                    className="text-brand-600 hover:underline"
                >
                    {coverage.reference}
                </Link>
                {' / '}
                {decoded}
            </div>

            {/* Header — F-064 */}
            <FieldGroup title="Coverage Sub-Detail">
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div>
                        <p className="text-xs text-gray-500">Reference</p>
                        <p className="font-semibold text-gray-900">{quote.reference}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Section</p>
                        <p className="text-gray-900">{section?.reference ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Coverage</p>
                        <p className="text-gray-900">{coverage.coverage ?? coverage.reference}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Coverage Type</p>
                        <p className="text-gray-900">{decoded}</p>
                    </div>
                </div>
            </FieldGroup>

            {/* Locations tab — F-065 */}
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
                                    <th className="pb-2 font-medium text-right">Number of Locations</th>
                                    <th className="pb-2 font-medium text-right">Sum Insured</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...grouped.entries()].map(([subType, rows]) => (
                                    <React.Fragment key={subType}>
                                        <tr className="bg-gray-100">
                                            <td
                                                colSpan={4}
                                                className="py-1 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider"
                                            >
                                                {subType}
                                            </td>
                                        </tr>
                                        {rows.map((row, idx) => (
                                            <tr
                                                key={`${subType}-${idx}`}
                                                className="border-b border-gray-100"
                                            >
                                                <td className="py-2 text-gray-700">{row.CoverageSubType || '—'}</td>
                                                <td className="py-2 text-gray-700">{row.Currency ?? '—'}</td>
                                                <td className="py-2 text-right text-gray-700">{idx === 0 ? rows.length : ''}</td>
                                                <td className="py-2 text-right text-gray-800">
                                                    {row.SumInsured != null
                                                        ? row.SumInsured.toLocaleString()
                                                        : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    )}
                </Card>
            )}
        </div>
    )
}
