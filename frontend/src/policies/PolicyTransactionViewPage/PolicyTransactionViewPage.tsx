import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import {
    getPolicy,
    getPolicySectionTransaction,
    getPolicySections,
    getPolicyTransactions,
} from '@/policies/policies.service'
import type {
    Policy,
    PolicySection,
    PolicySectionTransactionDetail,
    PolicyTransaction,
} from '@/policies/policies.service'
import { useSidebarSection } from '@/shell/SidebarContext'
import type { SidebarSection } from '@/shell/SidebarContext'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import ResizableGrid, { type Column, type SortConfig } from '@/shared/components/ResizableGrid/ResizableGrid'

const labelClass = 'text-xs text-gray-400'
const valClass = 'text-sm font-medium text-gray-900 mt-0.5'

const POLICY_STATUS_CLASSES: Record<string, string> = {
    Active: 'bg-green-100 text-green-800',
    Expired: 'bg-gray-100 text-gray-700',
    Cancelled: 'bg-red-100 text-red-700',
    Draft: 'bg-yellow-100 text-yellow-800',
}

const TX_STATUS_CLASSES: Record<string, string> = {
    Draft: 'bg-yellow-100 text-yellow-800',
    Bound: 'bg-orange-100 text-orange-800',
    Active: 'bg-green-100 text-green-800',
    Issued: 'bg-green-100 text-green-800',
    Endorsed: 'bg-gray-100 text-gray-600',
}

const SECTION_COLUMNS: Column[] = [
    { key: 'reference', label: 'Reference', sortable: true, defaultWidth: 140 },
    { key: 'class_of_business', label: 'Class of Business', sortable: true, defaultWidth: 180 },
    { key: 'inception_date', label: 'Inception Date', sortable: true, defaultWidth: 130 },
    { key: 'expiry_date', label: 'Expiry Date', sortable: true, defaultWidth: 130 },
    { key: 'limit_amount', label: 'Limit Amount', sortable: true, defaultWidth: 140 },
    { key: 'sum_insured_amount', label: 'Sum Insured', sortable: true, defaultWidth: 150 },
    { key: 'gross_premium', label: 'Gross Premium', sortable: true, defaultWidth: 140 },
    { key: 'net_premium', label: 'Net Premium', sortable: true, defaultWidth: 140 },
    { key: 'annual_gross', label: 'Annual Gross Premium', sortable: true, defaultWidth: 170 },
    { key: 'annual_net', label: 'Annual Net Premium', sortable: true, defaultWidth: 170 },
]

function buildTransactionNumberMap(transactions: PolicyTransaction[]) {
    const ordered = [...transactions].sort((left, right) => {
        const leftIsInitial = left.transaction_type === 'Initial Transaction'
        const rightIsInitial = right.transaction_type === 'Initial Transaction'
        if (leftIsInitial && !rightIsInitial) return -1
        if (!leftIsInitial && rightIsInitial) return 1

        const leftTimestamp = left.created_at ?? left.effective_date ?? ''
        const rightTimestamp = right.created_at ?? right.effective_date ?? ''
        if (leftTimestamp < rightTimestamp) return -1
        if (leftTimestamp > rightTimestamp) return 1

        return left.id - right.id
    })

    return new Map(ordered.map((tx, index) => [tx.id, tx.sequence_number ?? tx.number ?? index + 1]))
}

function formatTxnLabel(transaction: PolicyTransaction): string {
    const subType = transaction.sub_type
        ?? (typeof transaction.payload?.sub_type === 'string' ? transaction.payload.sub_type : null)
    return subType ? `${transaction.transaction_type} - ${subType}` : transaction.transaction_type
}

function mergeSectionSnapshot(
    section: PolicySection,
    snapshot?: PolicySectionTransactionDetail,
): PolicySection {
    if (!snapshot) return section
    return {
        ...section,
        limit_amount: snapshot.current.limit_amount,
        excess_amount: snapshot.current.excess_amount,
        sum_insured_amount: snapshot.current.sum_insured,
        gross_premium: snapshot.current.gross_premium,
        net_premium: snapshot.current.net_premium,
        deductions: snapshot.current.deductions,
        annual_gross: snapshot.current.annual_gross_premium,
        annual_net: snapshot.current.annual_net_premium,
    }
}

export default function PolicyTransactionViewPage() {
    const { id, transactionId } = useParams<{ id: string; transactionId: string }>()

    const [policy, setPolicy] = useState<Policy | null>(null)
    const [sections, setSections] = useState<PolicySection[]>([])
    const [transactions, setTransactions] = useState<PolicyTransaction[]>([])
    const [transaction, setTransaction] = useState<PolicyTransaction | 'not-found' | null>(null)
    const [sectionSnapshots, setSectionSnapshots] = useState<Record<number, PolicySectionTransactionDetail>>({})
    const [sectionSort, setSectionSort] = useState<SortConfig>({ key: 'reference', direction: 'asc' })
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    useEffect(() => {
        if (!id || !transactionId) return

        setLoading(true)
        Promise.all([
            getPolicy(id),
            getPolicySections(id),
            getPolicyTransactions(id),
        ])
            .then(([policyData, sectionData, transactionData]) => {
                setPolicy(policyData)
                setSections(sectionData)
                setTransactions(transactionData)
                setTransaction(
                    transactionData.find((tx) => String(tx.id) === String(transactionId)) ?? 'not-found',
                )
            })
            .catch((err: Error) => {
                setLoadError(err.message ?? 'Policy transaction not found.')
            })
            .finally(() => setLoading(false))
    }, [id, transactionId])

    useEffect(() => {
        if (!id || !transactionId || !transaction || transaction === 'not-found' || sections.length === 0) {
            setSectionSnapshots({})
            return
        }

        let active = true
        Promise.allSettled(
            sections.map((section) =>
                getPolicySectionTransaction(id, transactionId, section.id)
                    .then((detail) => [section.id, detail] as const),
            ),
        ).then((results) => {
            if (!active) return
            const nextSnapshots: Record<number, PolicySectionTransactionDetail> = {}
            for (const result of results) {
                if (result.status === 'fulfilled') {
                    const [sectionId, detail] = result.value
                    nextSnapshots[sectionId] = detail
                }
            }
            setSectionSnapshots(nextSnapshots)
        })

        return () => {
            active = false
        }
    }, [id, transactionId, transaction, sections])

    const sidebarSection = useMemo((): SidebarSection => ({
        title: 'Policy',
        items: [
            { label: 'Back to Policy', icon: FiArrowLeft, to: `/policies/${id}` },
        ],
    }), [id])

    useSidebarSection(sidebarSection)

    const transactionNumbers = useMemo(() => buildTransactionNumberMap(transactions), [transactions])

    const mergedSections = useMemo(() => {
        return sections.map((section) => mergeSectionSnapshot(section, sectionSnapshots[section.id]))
    }, [sections, sectionSnapshots])

    const sortedSections = useMemo(() => {
        return [...mergedSections].sort((a, b) => {
            const left = (a as Record<string, unknown>)[sectionSort.key] ?? ''
            const right = (b as Record<string, unknown>)[sectionSort.key] ?? ''
            if (left < right) return sectionSort.direction === 'asc' ? -1 : 1
            if (left > right) return sectionSort.direction === 'asc' ? 1 : -1
            return 0
        })
    }, [mergedSections, sectionSort])

    function handleSectionSort(key: string) {
        setSectionSort((prev) => (
            prev.key === key
                ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
                : { key, direction: 'asc' }
        ))
    }

    function renderSectionCell(key: string, row: unknown): React.ReactNode {
        const section = row as PolicySection
        if (key === 'limit_amount') return section.limit_amount != null ? Number(section.limit_amount).toLocaleString() : '—'
        if (key === 'sum_insured_amount') return section.sum_insured_amount != null ? Number(section.sum_insured_amount).toLocaleString() : '—'
        if (key === 'gross_premium') return section.gross_premium != null ? Number(section.gross_premium).toLocaleString() : '—'
        if (key === 'net_premium') return section.net_premium != null ? Number(section.net_premium).toLocaleString() : '—'
        if (key === 'annual_gross') return section.annual_gross != null ? Number(section.annual_gross).toLocaleString() : '—'
        if (key === 'annual_net') return section.annual_net != null ? Number(section.annual_net).toLocaleString() : '—'
        return (section as Record<string, unknown>)[key]?.toString() ?? '—'
    }

    if (loading) return <LoadingSpinner />

    if (loadError) {
        return (
            <div className="p-6 text-sm text-red-600">
                {loadError}{' '}
                <Link to={`/policies/${id}`} className="text-brand-600 hover:underline">
                    Back to Policy
                </Link>
            </div>
        )
    }

    if (transaction === 'not-found' || !transaction || !policy) {
        return (
            <div className="p-6 text-sm text-red-600">
                Transaction not found.{` `}
                <Link to={`/policies/${id}`} className="text-brand-600 hover:underline">
                    Back to Policy
                </Link>
            </div>
        )
    }

    const transactionLabel = formatTxnLabel(transaction)
    const transactionNumber = transactionNumbers.get(transaction.id) ?? transaction.id

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                        {policy.reference ?? '—'} — {policy.insured ?? '—'} — {transactionLabel}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Transaction {transactionNumber} · Effective {transaction.effective_date ?? '—'} · {transaction.status ?? '—'}
                    </p>
                </div>
                <Link to={`/policies/${id}`} className="text-sm text-brand-600 hover:underline">
                    ← Back to Policy
                </Link>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col gap-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Policy Summary</p>
                        <div>
                            <p className={labelClass}>Reference</p>
                            <p className={valClass}>{policy.reference ?? '—'}</p>
                        </div>
                        <div>
                            <p className={labelClass}>Policy Status</p>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${POLICY_STATUS_CLASSES[policy.status] ?? 'bg-gray-100 text-gray-500'}`}>
                                {policy.status ?? '—'}
                            </span>
                        </div>
                        <div>
                            <p className={labelClass}>Insured</p>
                            <p className={valClass}>{policy.insured ?? '—'}</p>
                        </div>
                        <div>
                            <p className={labelClass}>Class of Business</p>
                            <p className={valClass}>{policy.class_of_business ?? '—'}</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dates</p>
                        <div>
                            <p className={labelClass}>Inception Date</p>
                            <p className={valClass}>{policy.inception_date ?? '—'}</p>
                        </div>
                        <div>
                            <p className={labelClass}>Expiry Date</p>
                            <p className={valClass}>{policy.expiry_date ?? '—'}</p>
                        </div>
                        <div>
                            <p className={labelClass}>Currency</p>
                            <p className={valClass}>{policy.policy_currency ?? '—'}</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Transaction Details</p>
                        <div>
                            <p className={labelClass}>Transaction Number</p>
                            <p className={valClass}>{transactionNumber}</p>
                        </div>
                        <div>
                            <p className={labelClass}>Transaction Type</p>
                            <p className={valClass}>{transactionLabel}</p>
                        </div>
                        <div>
                            <p className={labelClass}>Transaction Status</p>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${TX_STATUS_CLASSES[transaction.status ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>
                                {transaction.status ?? '—'}
                            </span>
                        </div>
                        <div>
                            <p className={labelClass}>Created By</p>
                            <p className={valClass}>{transaction.created_by ?? '—'}</p>
                        </div>
                        <div>
                            <p className={labelClass}>Description</p>
                            <p className={valClass}>{transaction.description ?? '—'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-4">
                <div>
                    <h3 className="text-sm font-semibold text-gray-900">Sections</h3>
                    <p className="text-sm text-gray-500 mt-1">Transaction snapshot values are shown where a persisted section transaction exists.</p>
                </div>
                <ResizableGrid
                    columns={SECTION_COLUMNS}
                    rows={sortedSections}
                    storageKey="table-widths-policy-transaction-view-sections"
                    sortConfig={sectionSort}
                    onRequestSort={handleSectionSort}
                    renderCell={renderSectionCell}
                    rowKey={(row) => (row as PolicySection).id}
                    emptyMessage="No sections found."
                />
            </div>
        </div>
    )
}