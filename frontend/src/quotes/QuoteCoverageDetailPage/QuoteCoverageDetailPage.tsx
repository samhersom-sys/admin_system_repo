/**
 * QuoteCoverageDetailPage — /quotes/:id/sections/:sectionId/coverages/:coverageId
 *
 * Requirements: frontend/src/quotes/quotes.requirements.md
 * Tests: frontend/src/quotes/quotes.test.tsx
 *
 * REQ-QUO-FE-F-062 — loads parent quote, section, coverage and location details
 * REQ-QUO-FE-F-063 — read-only header + Sub-Details tab grouped by CoverageType;
 *                     clickable rows navigate to sub-detail; totals tfoot
 */

import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
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

const TABS: TabItem[] = [{ key: 'sub-details', label: 'Coverage Sub-Details' }]

function groupByCoverageType(rows: LocationRow[]): Map<string, LocationRow[]> {
    const map = new Map<string, LocationRow[]>()
    for (const row of rows) {
        const key = row.CoverageType?.trim()
        if (!key) continue
        const existing = map.get(key) ?? []
        map.set(key, [...existing, row])
    }
    return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)))
}

export default function QuoteCoverageDetailPage() {
    const { id, sectionId, coverageId } = useParams<{
        id: string
        sectionId: string
        coverageId: string
    }>()
    const navigate = useNavigate()
    const { addNotification } = useNotifications()

    const quoteId = Number(id)

    const [quote, setQuote] = useState<Quote | null>(null)
    const [section, setSection] = useState<QuoteSection | null>(null)
    const [coverage, setCoverage] = useState<Coverage | null>(null)
    const [locations, setLocations] = useState<LocationRow[]>([])
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [activeTab, setActiveTab] = useState('sub-details')

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
                    setLocations(locs)
                }
            })
            .catch((err: Error) => {
                addNotification(`Could not load coverage: ${err.message}`, 'error')
                setNotFound(true)
            })
            .finally(() => setLoading(false))
    }, [quoteId, sectionId, coverageId]) // eslint-disable-line react-hooks/exhaustive-deps

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
                Coverage not found.{' '}
                <Link
                    to={`/quotes/${id}/sections/${sectionId}`}
                    className="text-brand-600 hover:underline"
                >
                    Back to Section
                </Link>
            </div>
        )
    }

    const sectionCurrency = section?.sum_insured_currency ?? 'GBP'
    const filteredLocations = locations.filter((r) => r.Currency === sectionCurrency)
    const grouped = groupByCoverageType(filteredLocations)
    const hasGroups = grouped.size > 0

    const totals: Record<string, number> = {}
    const subDetailCounts: Record<string, number> = {}
    const locationCounts: Record<string, number> = {}
    for (const [type, rows] of grouped) {
        totals[type] = rows.reduce((sum, r) => sum + (r.SumInsured ?? 0), 0)
        const subTypes = new Set(rows.map((r) => r.CoverageSubType?.trim() || 'No Sub-Detail'))
        subDetailCounts[type] = subTypes.size
        locationCounts[type] = rows.length
    }
    const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0)

    function handleRowClick(coverageType: string) {
        navigate(
            `/quotes/${id}/sections/${sectionId}/coverages/${coverageId}/details/${encodeURIComponent(coverageType)}`
        )
    }

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
                {coverage.reference}
            </div>

            {/* Header — F-063 */}
            <FieldGroup title="Coverage Details">
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div>
                        <p className="text-xs text-gray-500">Reference</p>
                        <p className="font-semibold text-gray-900">{coverage.reference}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Coverage</p>
                        <p className="text-gray-900">{coverage.coverage_name ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Insured</p>
                        <p className="text-gray-900">{quote.insured}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Limit Currency</p>
                        <p className="text-gray-900">{coverage.limit_currency ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Limit Amount</p>
                        <p className="text-gray-900">
                            {coverage.limit_amount != null
                                ? coverage.limit_amount.toLocaleString()
                                : '—'}
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

            {/* Sub-Details tab — F-063 */}
            <TabsNav tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === 'sub-details' && (
                <Card>
                    {!hasGroups ? (
                        <p className="text-sm text-gray-400">No coverage details found.</p>
                    ) : (
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                                    <th className="pb-2 font-medium">Coverage Detail</th>
                                    <th className="pb-2 font-medium">Coverage Sub-Details</th>
                                    <th className="pb-2 font-medium text-right">Number of Locations</th>
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
                                        <td className="py-2 text-gray-700">{subDetailCounts[type]}</td>
                                        <td className="py-2 text-right text-gray-700">{locationCounts[type]}</td>
                                        <td className="py-2 text-right text-gray-800">
                                            {totals[type].toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-gray-300">
                                    <td className="py-2 font-semibold text-gray-700">Total</td>
                                    <td />
                                    <td />
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
