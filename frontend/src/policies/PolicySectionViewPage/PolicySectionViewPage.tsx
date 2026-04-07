/**
 * PolicySectionViewPage — /policies/:policyId/sections/:sectionId
 *
 * Requirements: frontend/src/policies/policies.requirements.md
 * Tests: frontend/src/policies/__tests__/PoliciesPages.test.tsx
 *
 * REQ-POL-FE-F-008 — load section on mount, display header
 * REQ-POL-FE-F-015 — read-only when policy is Active/Expired/Cancelled
 * REQ-POL-FE-F-016 — 3 sub-tabs: Coverages, Deductions, Participations
 */

import React, { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FiSave, FiArrowLeft } from 'react-icons/fi'
import {
    getPolicy,
    getPolicySectionDetails,
    getPolicyCoverages,
} from '@/policies/policies.service'
import type { Policy, PolicySection, PolicyCoverage } from '@/policies/policies.service'
import { useSidebarSection } from '@/shell/SidebarContext'
import type { SidebarSection } from '@/shell/SidebarContext'
import { useNotifications } from '@/shell/NotificationDock'
import Card from '@/shared/Card/Card'
import FieldGroup from '@/shared/components/FieldGroup/FieldGroup'
import TabsNav from '@/shared/components/TabsNav/TabsNav'
import type { TabItem } from '@/shared/components/TabsNav/TabsNav'
import ResizableGrid from '@/shared/components/ResizableGrid/ResizableGrid'
import type { Column, SortConfig } from '@/shared/components/ResizableGrid/ResizableGrid'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS: TabItem[] = [
    { key: 'coverages', label: 'Coverages' },
    { key: 'deductions', label: 'Deductions' },
    { key: 'participations', label: 'Participations' },
]

const COVERAGE_COLUMNS: Column[] = [
    { key: 'reference', label: 'Reference', sortable: true, defaultWidth: 160 },
    { key: 'coverage', label: 'Coverage', sortable: true, defaultWidth: 150 },
    { key: 'effective_date', label: 'Effective Date', sortable: true, defaultWidth: 130 },
    { key: 'expiry_date', label: 'Expiry Date', sortable: true, defaultWidth: 120 },
    { key: 'sum_insured_currency', label: 'SI Ccy', sortable: false, defaultWidth: 80 },
    { key: 'sum_insured', label: 'Sum Insured', sortable: true, defaultWidth: 120 },
    { key: 'gross_premium', label: 'Gross Premium', sortable: true, defaultWidth: 120 },
    { key: 'net_premium', label: 'Net Premium', sortable: true, defaultWidth: 110 },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PolicySectionViewPage() {
    const { policyId, sectionId } = useParams<{ policyId: string; sectionId: string }>()
    const { addNotification } = useNotifications()

    const [policy, setPolicy] = useState<Policy | null>(null)
    const [section, setSection] = useState<PolicySection | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    const [activeTab, setActiveTab] = useState('coverages')
    const [coverages, setCoverages] = useState<PolicyCoverage[]>([])
    const [coveragesLoaded, setCoveragesLoaded] = useState(false)
    const [coverageSort, setCoverageSort] = useState<SortConfig>({ key: 'reference', direction: 'asc' })

    // Wave 1: load policy
    useEffect(() => {
        if (!policyId) return
        setLoading(true)
        getPolicy(policyId)
            .then((pol) => setPolicy(pol))
            .catch((err: Error) => {
                const msg = err.message ?? 'Failed to load policy.'
                setLoadError(msg)
                addNotification(`Could not load section: ${msg}`, 'error')
                setLoading(false)
            })
    }, [policyId]) // eslint-disable-line react-hooks/exhaustive-deps

    // Wave 2: once policy is loaded, load section details
    useEffect(() => {
        if (!policy || !policyId || !sectionId) return
        getPolicySectionDetails(policyId, sectionId)
            .then((sec) => {
                setSection(sec)
                setPolicyCoveragesData(policyId, sectionId)
            })
            .catch((err: Error) => {
                const msg = err.message ?? 'Failed to load section.'
                setLoadError(msg)
                addNotification(`Could not load section: ${msg}`, 'error')
            })
            .finally(() => setLoading(false))
    }, [policy]) // eslint-disable-line react-hooks/exhaustive-deps

    function setPolicyCoveragesData(polId: string, secId: string) {
        getPolicyCoverages(polId, secId)
            .then(setCoverages)
            .catch(() => undefined)
        setCoveragesLoaded(true)
    }

    // Sidebar section
    const sidebarSection = useMemo((): SidebarSection => {
        const items: SidebarSection['items'] = []
        if (policy && policy.status === 'Draft') {
            items.push({ label: 'Save', icon: FiSave, event: 'policy-section:save' })
        }
        items.push({ label: 'Back to Policy', icon: FiArrowLeft, to: `/policies/${policyId}` })
        return { title: 'Policy Section', items }
    }, [policy, policyId])

    useSidebarSection(sidebarSection)

    // Editable only when Draft
    const editable = policy?.status === 'Draft'
    const inputCls = `block w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 ${editable ? 'border-gray-300' : 'border-transparent bg-gray-50 text-gray-700'}`

    // ---------------------------------------------------------------------------
    // Render states
    // ---------------------------------------------------------------------------

    if (loadError) {
        return <div className="p-6 text-sm text-red-600">{loadError}</div>
    }

    const sortedCoverages = [...coverages].sort((a, b) => {
        const av = (a as Record<string, unknown>)[coverageSort.key] ?? ''
        const bv = (b as Record<string, unknown>)[coverageSort.key] ?? ''
        if (av < bv) return coverageSort.direction === 'asc' ? -1 : 1
        if (av > bv) return coverageSort.direction === 'asc' ? 1 : -1
        return 0
    })

    function renderCoverageCell(key: string, row: unknown): React.ReactNode {
        const cov = row as PolicyCoverage
        if (key === 'reference') {
            return (
                <Link
                    to={`/policies/${policy?.id}/sections/${section?.id}/coverages/${cov.id}`}
                    className="text-brand-600 hover:underline"
                >
                    {cov.reference}
                </Link>
            )
        }
        const val = (cov as Record<string, unknown>)[key]
        return val != null ? String(val) : '—'
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            {/* Breadcrumb */}
            <div className="text-sm text-gray-500">
                {policy ? (
                    <Link to={`/policies/${policy.id}`} className="text-brand-600 hover:underline">
                        {policy.reference}
                    </Link>
                ) : '…'}
                {' / '}
                <span>{section?.reference ?? '…'}</span>
            </div>

            {/* Section header — F-008 */}
            {loading && !section ? (
                <div className="flex justify-center p-6"><LoadingSpinner /></div>
            ) : section ? (
                <FieldGroup title="Section Details">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-500 block mb-0.5">Reference</label>
                            <input
                                className={inputCls}
                                value={section.reference}
                                readOnly={!editable}
                                onChange={() => undefined}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-0.5">Class of Business</label>
                            <input
                                className={inputCls}
                                value={section.class_of_business ?? ''}
                                readOnly={!editable}
                                onChange={() => undefined}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-0.5">Inception Date</label>
                            <input
                                type="date"
                                className={inputCls}
                                value={section.inception_date ?? ''}
                                readOnly={!editable}
                                onChange={() => undefined}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-0.5">Expiry Date</label>
                            <input
                                type="date"
                                className={inputCls}
                                value={section.expiry_date ?? ''}
                                readOnly={!editable}
                                onChange={() => undefined}
                            />
                        </div>
                    </div>
                </FieldGroup>
            ) : null}

            {/* Sub-tabs — F-016 */}
            <TabsNav tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === 'coverages' && (
                <Card>
                    {section && policy ? (
                        <ResizableGrid
                            columns={COVERAGE_COLUMNS}
                            rows={sortedCoverages}
                            sortConfig={coverageSort}
                            onSort={(key) =>
                                setCoverageSort((prev) => ({
                                    key,
                                    direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
                                }))
                            }
                            renderCell={renderCoverageCell}
                            emptyMessage="No coverages found."
                            storageKey="table-widths-policy-section-coverages"
                        />
                    ) : <p className="text-sm text-gray-400">Loading…</p>}
                </Card>
            )}

            {activeTab === 'deductions' && (
                <Card title="Deductions">
                    <p className="text-sm text-gray-400">No deductions found.</p>
                </Card>
            )}

            {activeTab === 'participations' && (
                <Card title="Participations">
                    <p className="text-sm text-gray-400">No participations found.</p>
                </Card>
            )}
        </div>
    )
}
