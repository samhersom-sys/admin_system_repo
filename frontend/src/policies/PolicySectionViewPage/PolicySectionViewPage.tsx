/**
 * PolicySectionViewPage — /policies/:policyId/sections/:sectionId
 */

import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FiArrowLeft, FiSave } from 'react-icons/fi'
import Card from '@/shared/Card/Card'
import FieldGroup from '@/shared/components/FieldGroup/FieldGroup'
import SearchableSelect from '@/shared/components/SearchableSelect/SearchableSelect'
import TabsNav from '@/shared/components/TabsNav/TabsNav'
import type { TabItem } from '@/shared/components/TabsNav/TabsNav'
import ResizableGrid from '@/shared/components/ResizableGrid/ResizableGrid'
import type { Column, SortConfig } from '@/shared/components/ResizableGrid/ResizableGrid'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import { useNotifications } from '@/shell/NotificationDock'
import { useSidebarSection } from '@/shell/SidebarContext'
import type { SidebarSection } from '@/shell/SidebarContext'
import {
    getPolicy,
    getPolicyCoverages,
    getPolicySectionDetails,
    getClassesOfBusiness,
    getCurrencies,
    getLossQualifiers,
    updatePolicySection,
    type Policy,
    type PolicyCoverage,
    type PolicySection,
} from '@/policies/policies.service'

const TABS: TabItem[] = [
    { key: 'coverages', label: 'Coverages' },
    { key: 'deductions', label: 'Deductions' },
    { key: 'riskCodes', label: 'Risk Codes' },
    { key: 'participations', label: 'Participations' },
    { key: 'section-financial-summary', label: 'Section Financial Summary' },
    { key: 'signings', label: 'Signings' },
]

const COVERAGE_COLUMNS: Column[] = [
    { key: 'reference', label: 'Reference', sortable: true, defaultWidth: 160 },
    { key: 'coverage', label: 'Coverage', sortable: true, defaultWidth: 150 },
    { key: 'effective_date', label: 'Effective Date', sortable: true, defaultWidth: 130 },
    { key: 'expiry_date', label: 'Expiry Date', sortable: true, defaultWidth: 120 },
    { key: 'limit_currency', label: 'Limit Currency', sortable: false, defaultWidth: 120 },
    { key: 'limit_amount', label: 'Limit Amount', sortable: true, defaultWidth: 120 },
    { key: 'sum_insured_currency', label: 'Sum Insured Currency', sortable: false, defaultWidth: 140 },
    { key: 'sum_insured', label: 'Sum Insured', sortable: true, defaultWidth: 120 },
    { key: 'annual_gross_premium', label: 'Annual Gross Premium', sortable: true, defaultWidth: 150 },
    { key: 'annual_net_premium', label: 'Annual Net Premium', sortable: true, defaultWidth: 150 },
    { key: 'gross_premium', label: 'Gross Premium', sortable: true, defaultWidth: 120 },
    { key: 'net_premium', label: 'Net Premium', sortable: true, defaultWidth: 110 },
]

function computeDaysOnCover(inceptionDate: string | null | undefined, expiryDate: string | null | undefined): number | null {
    if (!inceptionDate || !expiryDate) return null
    const diff = Math.floor((new Date(expiryDate).getTime() - new Date(inceptionDate).getTime()) / 86_400_000)
    return diff >= 0 ? diff : null
}

export default function PolicySectionViewPage() {
    const { policyId, sectionId } = useParams<{ policyId: string; sectionId: string }>()
    const { addNotification } = useNotifications()

    const [policy, setPolicy] = useState<Policy | null>(null)
    const [section, setSection] = useState<PolicySection | null>(null)
    const [coverages, setCoverages] = useState<PolicyCoverage[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState('coverages')
    const [coverageSort, setCoverageSort] = useState<SortConfig>({ key: 'reference', direction: 'asc' })
    const [classesOfBusiness, setClassesOfBusiness] = useState<string[]>([])
    const [currencyOptions, setCurrencyOptions] = useState<string[]>([])
    const [lossQualifierOptions, setLossQualifierOptions] = useState<string[]>([])

    const editable = policy?.status === 'Draft'
    const inputCls = `block w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 ${editable ? 'border-gray-300' : 'border-transparent bg-gray-50 text-gray-700'}`
    const inputClsSm = `block w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 ${editable ? 'border-gray-300' : 'border-transparent bg-gray-50 text-gray-700'}`

    useEffect(() => {
        if (!policyId) return
        getPolicy(policyId)
            .then(setPolicy)
            .catch((err: Error) => {
                const msg = err.message ?? 'Failed to load policy.'
                setLoadError(msg)
                addNotification(`Could not load section: ${msg}`, 'error')
            })
    }, [policyId]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!policy || !policyId || !sectionId) return
        setLoading(true)
        Promise.all([
            getPolicySectionDetails(policyId, sectionId),
            getPolicyCoverages(policyId, sectionId),
        ])
            .then(([sec, covs]) => {
                setSection({
                    ...sec,
                    inception_date: sec.inception_date ?? policy.inception_date ?? null,
                    effective_date: sec.effective_date ?? sec.inception_date ?? policy.inception_date ?? null,
                    expiry_date: sec.expiry_date ?? policy.expiry_date ?? null,
                    inception_time: (sec as PolicySection & { inception_time?: string | null }).inception_time ?? policy.inception_time ?? '00:00:00',
                    effective_time: (sec as PolicySection & { effective_time?: string | null }).effective_time ?? (sec as PolicySection & { inception_time?: string | null }).inception_time ?? policy.inception_time ?? '00:00:00',
                    expiry_time: (sec as PolicySection & { expiry_time?: string | null }).expiry_time ?? policy.expiry_time ?? '23:59:59',
                } as PolicySection)
                setCoverages(covs)
            })
            .catch((err: Error) => {
                const msg = err.message ?? 'Failed to load section.'
                setLoadError(msg)
                addNotification(`Could not load section: ${msg}`, 'error')
            })
            .finally(() => setLoading(false))
    }, [policy, policyId, sectionId]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        getClassesOfBusiness().then((items) => setClassesOfBusiness(items ?? [])).catch(() => setClassesOfBusiness([]))
        getCurrencies().then((items) => setCurrencyOptions(items ?? [])).catch(() => setCurrencyOptions([]))
        getLossQualifiers().then((items) => setLossQualifierOptions(items ?? [])).catch(() => setLossQualifierOptions([]))
    }, [])

    useEffect(() => {
        const handler = async () => {
            if (!policyId || !sectionId || !section || !editable) return
            try {
                const saved = await updatePolicySection(policyId, sectionId, {
                    ...section,
                    sum_insured: section.sum_insured_amount ?? section.sum_insured,
                })
                setSection(saved)
                addNotification('Policy section saved.', 'success')
            } catch (err) {
                addNotification(err instanceof Error ? err.message : 'Failed to save policy section.', 'error')
            }
        }
        window.addEventListener('policy-section:save', handler)
        return () => window.removeEventListener('policy-section:save', handler)
    }, [policyId, sectionId, section, editable, addNotification])

    const sidebarSection = useMemo((): SidebarSection => {
        const items: SidebarSection['items'] = []
        if (editable) items.push({ label: 'Save', icon: FiSave, event: 'policy-section:save' })
        items.push({ label: 'Back to Policy', icon: FiArrowLeft, to: `/policies/${policyId}` })
        return { title: 'Policy Section', items }
    }, [editable, policyId])

    useSidebarSection(sidebarSection)

    if (loadError) return <div className="p-6 text-sm text-red-600">{loadError}</div>

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
                <Link to={`/policies/${policy?.id}/sections/${section?.id}/coverages/${cov.id}`} className="text-brand-600 hover:underline">
                    {cov.reference}
                </Link>
            )
        }
        const val = (cov as Record<string, unknown>)[key]
        return val != null ? String(val) : '—'
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="text-sm text-gray-500">
                {policy ? <Link to={`/policies/${policy.id}`} className="text-brand-600 hover:underline">{policy.reference}</Link> : '…'}
                {' / '}
                <span>{section?.reference ?? '…'}</span>
            </div>

            {loading && !section ? (
                <div className="flex justify-center p-6"><LoadingSpinner /></div>
            ) : section ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                    <FieldGroup title="Contract & Reference">
                        <div className="grid grid-cols-1 gap-3">
                            <div><label className="text-xs text-gray-500 block mb-0.5">Reference</label><input className={inputCls} value={section.reference} readOnly /></div>
                            <div><label className="text-xs text-gray-500 block mb-0.5">Class of Business</label>{editable ? <SearchableSelect id="policy-section-class-of-business" ariaLabel="Class of Business" value={section.class_of_business ?? ''} options={classesOfBusiness} onChange={(nextValue) => setSection((prev) => prev ? { ...prev, class_of_business: nextValue } : prev)} /> : <input className={inputCls} value={section.class_of_business ?? ''} readOnly />}</div>
                            <div><label className="text-xs text-gray-500 block mb-0.5">Delegated Authority Reference</label><input className={inputCls} value={section.delegated_authority_ref ?? ''} readOnly={!editable} onChange={(e) => setSection((prev) => prev ? { ...prev, delegated_authority_ref: e.target.value } : prev)} /></div>
                            <div><label className="text-xs text-gray-500 block mb-0.5">Delegated Authority Section Reference</label><input className={inputCls} value={section.delegated_authority_section_ref ?? ''} readOnly={!editable} onChange={(e) => setSection((prev) => prev ? { ...prev, delegated_authority_section_ref: e.target.value } : prev)} /></div>
                        </div>
                    </FieldGroup>

                    <FieldGroup title="Limit">
                        <div className="grid grid-cols-1 gap-3">
                            <div><label className="text-xs text-gray-500 block mb-0.5">Limit Loss Qualifier</label>{editable ? <SearchableSelect id="policy-section-limit-loss-qualifier" ariaLabel="Limit Loss Qualifier" value={section.limit_loss_qualifier ?? ''} options={lossQualifierOptions} onChange={(nextValue) => setSection((prev) => prev ? { ...prev, limit_loss_qualifier: nextValue } : prev)} /> : <input className={inputCls} value={section.limit_loss_qualifier ?? ''} readOnly />}</div>
                            <div className="grid grid-cols-3 gap-2"><div><label className="text-xs text-gray-500 block mb-0.5">Currency</label>{editable ? <SearchableSelect id="policy-section-limit-currency" ariaLabel="Limit Currency" value={section.limit_currency ?? ''} options={currencyOptions} onChange={(nextValue) => setSection((prev) => prev ? { ...prev, limit_currency: nextValue } : prev)} /> : <input className={inputClsSm} value={section.limit_currency ?? ''} readOnly />}</div><div><label className="text-xs text-gray-500 block mb-0.5">Limit Amount</label><input type="number" className={inputClsSm} value={section.limit_amount ?? ''} readOnly={!editable} onChange={(e) => setSection((prev) => prev ? { ...prev, limit_amount: Number(e.target.value) } : prev)} /></div><div><label className="text-xs text-gray-500 block mb-0.5">Movement</label><input className={inputClsSm} value={section.limit_amount_movement != null ? String(section.limit_amount_movement) : ''} readOnly /></div></div>
                        </div>
                    </FieldGroup>

                    <FieldGroup title="Insured">
                        <div><label className="text-xs text-gray-500 block mb-0.5">Insured</label><input className={inputCls} value={policy?.insured ?? ''} readOnly /></div>
                    </FieldGroup>

                    <FieldGroup title="Annual Rating">
                        <div className="grid grid-cols-1 gap-3">
                            <div className="grid grid-cols-3 gap-2"><div><label className="text-xs text-gray-500 block mb-0.5">Currency</label>{editable ? <SearchableSelect id="policy-section-premium-currency" ariaLabel="Premium Currency" value={section.premium_currency ?? ''} options={currencyOptions} onChange={(nextValue) => setSection((prev) => prev ? { ...prev, premium_currency: nextValue } : prev)} /> : <input className={inputClsSm} value={section.premium_currency ?? ''} readOnly />}</div><div><label className="text-xs text-gray-500 block mb-0.5">Gross Premium</label><input type="number" className={inputClsSm} value={section.gross_premium ?? ''} readOnly={!editable} onChange={(e) => setSection((prev) => prev ? { ...prev, gross_premium: Number(e.target.value) } : prev)} /></div><div><label className="text-xs text-gray-500 block mb-0.5">Movement</label><input className={inputClsSm} value={section.gross_premium_movement != null ? String(section.gross_premium_movement) : ''} readOnly /></div></div>
                            <div className="grid grid-cols-3 gap-2"><div><label className="text-xs text-gray-500 block mb-0.5">Currency</label>{editable ? <SearchableSelect id="policy-section-annual-gross-currency" ariaLabel="Annual Rated Gross Premium Currency" value={section.premium_currency ?? ''} options={currencyOptions} onChange={(nextValue) => setSection((prev) => prev ? { ...prev, premium_currency: nextValue } : prev)} /> : <input className={inputClsSm} value={section.premium_currency ?? ''} readOnly />}</div><div><label className="text-xs text-gray-500 block mb-0.5">Annual Rated Gross Premium</label><input type="number" className={inputClsSm} value={section.annual_gross_premium ?? ''} readOnly={!editable} onChange={(e) => setSection((prev) => prev ? { ...prev, annual_gross_premium: Number(e.target.value) } : prev)} /></div><div><label className="text-xs text-gray-500 block mb-0.5">Movement</label><input className={inputClsSm} value={section.annual_gross_premium_movement != null ? String(section.annual_gross_premium_movement) : ''} readOnly /></div></div>
                            <div className="grid grid-cols-3 gap-2"><div><label className="text-xs text-gray-500 block mb-0.5">Currency</label>{editable ? <SearchableSelect id="policy-section-annual-net-currency" ariaLabel="Annual Rated Net Premium Currency" value={section.premium_currency ?? ''} options={currencyOptions} onChange={(nextValue) => setSection((prev) => prev ? { ...prev, premium_currency: nextValue } : prev)} /> : <input className={inputClsSm} value={section.premium_currency ?? ''} readOnly />}</div><div><label className="text-xs text-gray-500 block mb-0.5">Annual Rated Net Premium</label><input type="number" className={inputClsSm} value={section.annual_net_premium ?? ''} readOnly={!editable} onChange={(e) => setSection((prev) => prev ? { ...prev, annual_net_premium: Number(e.target.value) } : prev)} /></div><div><label className="text-xs text-gray-500 block mb-0.5">Movement</label><input className={inputClsSm} value={section.annual_net_premium_movement != null ? String(section.annual_net_premium_movement) : ''} readOnly /></div></div>
                        </div>
                    </FieldGroup>

                    <FieldGroup title="Dates">
                        <div className="grid grid-cols-1 gap-3">
                            <div className="grid grid-cols-2 gap-2"><div><label className="text-xs text-gray-500 block mb-0.5">Inception Date</label><input type="date" className={inputCls} value={section.inception_date ?? ''} readOnly={!editable} onChange={(e) => setSection((prev) => prev ? { ...prev, inception_date: e.target.value } : prev)} /></div><div><label className="text-xs text-gray-500 block mb-0.5">Inception Time</label><input type="time" step="1" className={inputCls} value={(section as PolicySection & { inception_time?: string | null }).inception_time ?? '00:00:00'} readOnly={!editable} onChange={(e) => setSection((prev) => prev ? { ...prev, inception_time: e.target.value } as PolicySection : prev)} /></div></div>
                            <div className="grid grid-cols-2 gap-2"><div><label className="text-xs text-gray-500 block mb-0.5">Effective Date</label><input type="date" className={inputCls} value={section.effective_date ?? ''} readOnly={!editable} onChange={(e) => setSection((prev) => prev ? { ...prev, effective_date: e.target.value } : prev)} /></div><div><label className="text-xs text-gray-500 block mb-0.5">Effective Time</label><input type="time" step="1" className={inputCls} value={(section as PolicySection & { effective_time?: string | null }).effective_time ?? '00:00:00'} readOnly={!editable} onChange={(e) => setSection((prev) => prev ? { ...prev, effective_time: e.target.value } as PolicySection : prev)} /></div></div>
                            <div className="grid grid-cols-2 gap-2"><div><label className="text-xs text-gray-500 block mb-0.5">Expiry Date</label><input type="date" className={inputCls} value={section.expiry_date ?? ''} readOnly={!editable} onChange={(e) => setSection((prev) => prev ? { ...prev, expiry_date: e.target.value } : prev)} /></div><div><label className="text-xs text-gray-500 block mb-0.5">Expiry Time</label><input type="time" step="1" className={inputCls} value={(section as PolicySection & { expiry_time?: string | null }).expiry_time ?? '23:59:59'} readOnly={!editable} onChange={(e) => setSection((prev) => prev ? { ...prev, expiry_time: e.target.value } as PolicySection : prev)} /></div></div>
                            <div><label className="text-xs text-gray-500 block mb-0.5">Days on Cover</label><input className={inputCls} value={String(computeDaysOnCover(section.inception_date, section.expiry_date) ?? '')} readOnly /></div>
                        </div>
                    </FieldGroup>

                    <FieldGroup title="Order & Lines">
                        <div className="grid grid-cols-1 gap-3">
                            <div><label className="text-xs text-gray-500 block mb-0.5">Time Basis</label><input className={inputCls} value={section.time_basis ?? ''} readOnly={!editable} onChange={(e) => setSection((prev) => prev ? { ...prev, time_basis: e.target.value } : prev)} /></div>
                            <div className="grid grid-cols-3 gap-2"><div><label className="text-xs text-gray-500 block mb-0.5">Written Order %</label><input type="number" className={inputCls} value={section.written_order ?? ''} readOnly={!editable} onChange={(e) => setSection((prev) => prev ? { ...prev, written_order: Number(e.target.value) } : prev)} /></div><div><label className="text-xs text-gray-500 block mb-0.5">Written Order Basis</label><input className={inputCls} value={section.written_order_basis ?? ''} readOnly={!editable} onChange={(e) => setSection((prev) => prev ? { ...prev, written_order_basis: e.target.value } : prev)} /></div><div><label className="text-xs text-gray-500 block mb-0.5">Written Line Total</label><input type="number" className={inputCls} value={section.written_line_total ?? ''} readOnly={!editable} onChange={(e) => setSection((prev) => prev ? { ...prev, written_line_total: Number(e.target.value) } : prev)} /></div></div>
                            <div className="grid grid-cols-3 gap-2"><div><label className="text-xs text-gray-500 block mb-0.5">Signed Order %</label><input type="number" className={inputCls} value={section.signed_order ?? ''} readOnly={!editable} onChange={(e) => setSection((prev) => prev ? { ...prev, signed_order: Number(e.target.value) } : prev)} /></div><div><label className="text-xs text-gray-500 block mb-0.5">Signed Order Basis</label><input className={inputCls} value={section.signed_order_basis ?? ''} readOnly={!editable} onChange={(e) => setSection((prev) => prev ? { ...prev, signed_order_basis: e.target.value } : prev)} /></div><div><label className="text-xs text-gray-500 block mb-0.5">Signed Line Total</label><input type="number" className={inputCls} value={section.signed_line_total ?? ''} readOnly={!editable} onChange={(e) => setSection((prev) => prev ? { ...prev, signed_line_total: Number(e.target.value) } : prev)} /></div></div>
                        </div>
                    </FieldGroup>

                    <FieldGroup title="Renewal">
                        <div className="grid grid-cols-1 gap-3">
                            <div><label className="text-xs text-gray-500 block mb-0.5">Renewal Date</label><input className={inputCls} value={policy?.renewal_date ?? ''} readOnly /></div>
                            <div><label className="text-xs text-gray-500 block mb-0.5">Renewal Status</label><input className={inputCls} value={policy?.renewal_status ?? ''} readOnly /></div>
                        </div>
                    </FieldGroup>

                    <FieldGroup title="Excess">
                        <div className="grid grid-cols-1 gap-3">
                            <div><label className="text-xs text-gray-500 block mb-0.5">Excess Loss Qualifier</label>{editable ? <SearchableSelect id="policy-section-excess-loss-qualifier" ariaLabel="Excess Loss Qualifier" value={section.excess_loss_qualifier ?? ''} options={lossQualifierOptions} onChange={(nextValue) => setSection((prev) => prev ? { ...prev, excess_loss_qualifier: nextValue } : prev)} /> : <input className={inputCls} value={section.excess_loss_qualifier ?? ''} readOnly />}</div>
                            <div className="grid grid-cols-3 gap-2"><div><label className="text-xs text-gray-500 block mb-0.5">Currency</label>{editable ? <SearchableSelect id="policy-section-excess-currency" ariaLabel="Excess Currency" value={section.excess_currency ?? ''} options={currencyOptions} onChange={(nextValue) => setSection((prev) => prev ? { ...prev, excess_currency: nextValue } : prev)} /> : <input className={inputClsSm} value={section.excess_currency ?? ''} readOnly />}</div><div><label className="text-xs text-gray-500 block mb-0.5">Excess Amount</label><input type="number" className={inputClsSm} value={section.excess_amount ?? ''} readOnly={!editable} onChange={(e) => setSection((prev) => prev ? { ...prev, excess_amount: Number(e.target.value) } : prev)} /></div><div><label className="text-xs text-gray-500 block mb-0.5">Movement</label><input className={inputClsSm} value={section.excess_amount_movement != null ? String(section.excess_amount_movement) : ''} readOnly /></div></div>
                        </div>
                    </FieldGroup>

                    <FieldGroup title="Sum Insured">
                        <div className="grid grid-cols-1 gap-3">
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="text-xs text-gray-500 block mb-0.5">Currency</label>
                                    {editable ? (
                                        <SearchableSelect id="policy-section-sum-insured-currency" ariaLabel="Sum Insured Currency" value={section.sum_insured_currency ?? ''} options={currencyOptions} onChange={(nextValue) => setSection((prev) => prev ? { ...prev, sum_insured_currency: nextValue } : prev)} />
                                    ) : <input className={inputClsSm} value={section.sum_insured_currency ?? ''} readOnly />}
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-0.5">Sum Insured Amount</label>
                                    <input type="number" className={inputClsSm} value={section.sum_insured_amount ?? section.sum_insured ?? ''} readOnly={!editable} onChange={(e) => setSection((prev) => prev ? { ...prev, sum_insured_amount: Number(e.target.value) } : prev)} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-0.5">Movement</label>
                                    <input className={inputClsSm} value={section.sum_insured_amount_movement != null ? String(section.sum_insured_amount_movement) : ''} readOnly />
                                </div>
                            </div>
                        </div>
                    </FieldGroup>
                </div>
            ) : null}

            <TabsNav tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === 'coverages' && (
                <Card>
                    {section && policy ? (
                        <ResizableGrid
                            columns={COVERAGE_COLUMNS}
                            rows={sortedCoverages}
                            sortConfig={coverageSort}
                            onSort={(key) => setCoverageSort((prev) => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }))}
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

            {activeTab === 'riskCodes' && (
                <Card title="Risk Codes">
                    <p className="text-sm text-gray-400">No risk codes found.</p>
                </Card>
            )}

            {activeTab === 'participations' && (
                <Card title="Participations">
                    <p className="text-sm text-gray-400">No participations found.</p>
                </Card>
            )}

            {activeTab === 'section-financial-summary' && (
                <Card title="Section Financial Summary">
                    <div className="table-wrapper">
                        <table className="app-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>Measure</th>
                                    <th className="text-right">Base</th>
                                    <th className="text-right">Written</th>
                                    <th className="text-right">Signed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    ['Gross Gross Premium', section?.gross_gross_premium, section?.gross_gross_premium_written, section?.gross_gross_premium_signed],
                                    ['Gross Deductions', section?.gross_deductions, section?.gross_deductions_written, section?.gross_deductions_signed],
                                    ['Gross Premium', section?.gross_premium, section?.gross_premium_written, section?.gross_premium_signed],
                                    ['Deductions', section?.deductions, section?.deductions_written, section?.deductions_signed],
                                    ['Gross Net Premium', section?.net_premium, section?.net_premium_written, section?.net_premium_signed],
                                    ['Tax Receivable', section?.tax_receivable, section?.tax_receivable_written, section?.tax_receivable_signed],
                                    ['Tax Payable', section?.tax_payable, section?.tax_payable_written, section?.tax_payable_signed],
                                ].map(([name, base, written, signed]) => (
                                    <tr key={String(name)}>
                                        <td>{String(name)}</td>
                                        <td className="text-right">{typeof base === 'number' ? base.toLocaleString() : '—'}</td>
                                        <td className="text-right">{typeof written === 'number' ? written.toLocaleString() : '—'}</td>
                                        <td className="text-right">{typeof signed === 'number' ? signed.toLocaleString() : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {activeTab === 'signings' && (
                <Card title="Signings">
                    <p className="text-sm text-gray-400">Signings placeholder.</p>
                </Card>
            )}

            {policy && (
                <div className="fixed bottom-20 right-4 z-40">
                    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium shadow-sm ${editable ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${editable ? 'bg-green-500' : 'bg-amber-400'}`} aria-hidden="true" />
                        <span>{editable ? 'Editable' : 'Read-only'}</span>
                    </div>
                </div>
            )}
        </div>
    )
}
