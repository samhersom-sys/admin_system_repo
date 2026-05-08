import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import {
    getBindingAuthority,
    getBASections,
    getBATransactions,
    getCoverholderParty,
} from '@/binding-authorities/binding-authorities.service'
import type { BASection, BATransaction, BATransactionDetails, BindingAuthority } from '@/binding-authorities/binding-authorities.service'
import { useSidebarSection } from '@/shell/SidebarContext'
import type { SidebarSection } from '@/shell/SidebarContext'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import ResizableGrid, { type Column, type SortConfig } from '@/shared/components/ResizableGrid/ResizableGrid'

const labelClass = 'text-xs text-gray-400'
const valClass = 'text-sm font-medium text-gray-900 mt-0.5'

const STATUS_CLASSES: Record<string, string> = {
    Draft: 'bg-yellow-100 text-yellow-800',
    Active: 'bg-green-100 text-green-800',
    Bound: 'bg-blue-100 text-blue-800',
    Expired: 'bg-gray-100 text-gray-600',
    Cancelled: 'bg-red-100 text-red-700',
}

const TX_STATUS_CLASSES: Record<string, string> = {
    Draft: 'bg-yellow-100 text-yellow-800',
    Bound: 'bg-orange-100 text-orange-800',
    Active: 'bg-green-100 text-green-800',
    Issued: 'bg-green-100 text-green-800',
    Endorsed: 'bg-gray-100 text-gray-600',
}

export default function BATransactionViewPage() {
    const { id, transactionId } = useParams<{ id: string; transactionId: string }>()

    const [ba, setBa] = useState<BindingAuthority | null>(null)
    const [sections, setSections] = useState<BASection[]>([])
    const [transactions, setTransactions] = useState<BATransaction[]>([])
    const [transaction, setTransaction] = useState<BATransaction | null | 'not-found'>('not-found')
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [sectionSort, setSectionSort] = useState<SortConfig>({ key: 'reference', direction: 'asc' })
    const [resolvedCoverholderName, setResolvedCoverholderName] = useState<string | null>(null)

    function buildHistoricalSnapshot(
        allTransactions: BATransaction[],
        targetTransactionId: number,
        currentBa: BindingAuthority,
        currentSections: BASection[],
    ): BATransactionDetails & { coverholderId?: number | null } {
        const chronologicalTransactions = [...allTransactions].reverse()
        const snapshot: BATransactionDetails & { coverholderId?: number | null } = {
            sections: [],
            year_of_account: null,
            inception_date: null,
            expiry_date: null,
            coverholder: null,
            coverholder_id: null,
            coverholderId: null,
        }

        for (const tx of chronologicalTransactions) {
            const details = (tx.details ?? {}) as BATransactionDetails

            if (details.coverholder !== undefined) snapshot.coverholder = details.coverholder
            if (details.coverholder_id !== undefined) {
                snapshot.coverholder_id = details.coverholder_id
                snapshot.coverholderId = details.coverholder_id
            }
            if (details.year_of_account !== undefined) snapshot.year_of_account = details.year_of_account
            if (details.inception_date !== undefined) snapshot.inception_date = details.inception_date
            if (details.expiry_date !== undefined) snapshot.expiry_date = details.expiry_date
            if (Array.isArray(details.sections)) {
                snapshot.sections = details.sections.map((section) => ({ ...section }))
            }

            if (tx.id === targetTransactionId) break
        }

        if (snapshot.coverholder == null && snapshot.coverholderId == null) {
            snapshot.coverholder = currentBa.coverholder ?? null
            snapshot.coverholder_id = currentBa.coverholder_id ?? null
            snapshot.coverholderId = currentBa.coverholder_id ?? null
        }
        if (snapshot.year_of_account == null) snapshot.year_of_account = currentBa.year_of_account ?? null
        if (snapshot.inception_date == null) snapshot.inception_date = currentBa.inception_date ?? null
        if (snapshot.expiry_date == null) snapshot.expiry_date = currentBa.expiry_date ?? null

        return snapshot
    }

    useEffect(() => {
        if (!id) return
        Promise.all([
            getBindingAuthority(id as unknown as number),
            getBASections(id as unknown as number),
            getBATransactions(id as unknown as number),
        ])
            .then(([baData, sectionData, txs]) => {
                setBa(baData)
                setSections(sectionData)
                setTransactions(txs)
                const found = txs.find(tx => String(tx.id) === transactionId)
                setTransaction(found ?? 'not-found')
            })
            .catch(() => setLoadError('Binding authority not found.'))
            .finally(() => setLoading(false))
    }, [id, transactionId]) // eslint-disable-line react-hooks/exhaustive-deps

    const sidebarSection = useMemo((): SidebarSection => ({
        title: 'Binding Authority',
        items: [
            { label: 'Back to Binding Authority', icon: FiArrowLeft, to: `/binding-authorities/${id}` },
        ],
    }), [id])

    const snapshot = useMemo(() => {
        if (!ba || transaction === 'not-found' || !transaction) return null
        return buildHistoricalSnapshot(transactions, transaction.id, ba, sections)
    }, [ba, transaction, transactions, sections])

    useEffect(() => {
        let active = true

        if (!snapshot) {
            setResolvedCoverholderName(null)
            return () => { active = false }
        }

        if (snapshot.coverholder) {
            setResolvedCoverholderName(snapshot.coverholder)
            return () => { active = false }
        }

        if (typeof snapshot.coverholderId !== 'number') {
            setResolvedCoverholderName(ba?.coverholder ?? null)
            return () => { active = false }
        }

        getCoverholderParty(snapshot.coverholderId)
            .then((party) => {
                if (active) setResolvedCoverholderName(party.name)
            })
            .catch(() => {
                if (active) {
                    const fallbackName = ba?.coverholder_id === snapshot.coverholderId ? (ba.coverholder ?? null) : null
                    setResolvedCoverholderName(fallbackName)
                }
            })

        return () => { active = false }
    }, [snapshot, ba?.coverholder, ba?.coverholder_id])

    useSidebarSection(sidebarSection)

    if (loading) return <LoadingSpinner />

    if (loadError) {
        return (
            <div className="p-6 text-sm text-red-600">
                {loadError}{' '}
                <Link to={`/binding-authorities/${id}`} className="text-brand-600 hover:underline ml-2">
                    ← Back to Binding Authority
                </Link>
            </div>
        )
    }

    if (transaction === 'not-found' || !transaction) {
        return (
            <div className="p-6 text-sm text-red-600">
                Transaction not found.{' '}
                <Link to={`/binding-authorities/${id}`} className="text-brand-600 hover:underline ml-2">
                    ← Back to Binding Authority
                </Link>
            </div>
        )
    }

    const snapshotSections = Array.isArray(snapshot?.sections) ? snapshot.sections : sections
    const sortedSections = [...snapshotSections].sort((a, b) => {
        const av = (a as unknown as Record<string, unknown>)[sectionSort.key] ?? ''
        const bv = (b as unknown as Record<string, unknown>)[sectionSort.key] ?? ''
        if (av < bv) return sectionSort.direction === 'asc' ? -1 : 1
        if (av > bv) return sectionSort.direction === 'asc' ? 1 : -1
        return 0
    })
    const coverholderVal = resolvedCoverholderName ?? snapshot?.coverholder ?? '—'
    const yearOfAccountVal = snapshot?.year_of_account ?? '—'
    const inceptionDateVal = snapshot?.inception_date ?? '—'
    const expiryDateVal = snapshot?.expiry_date ?? '—'

    const SECTION_COLUMNS: Column[] = [
        { key: 'reference', label: 'Reference', sortable: true, defaultWidth: 140 },
        { key: 'class_of_business', label: 'Class of Business', sortable: true, defaultWidth: 180 },
        { key: 'inception_date', label: 'Inception Date', sortable: true, defaultWidth: 130 },
        { key: 'expiry_date', label: 'Expiry Date', sortable: true, defaultWidth: 130 },
        { key: 'time_basis', label: 'Time Basis', sortable: true, defaultWidth: 120 },
        { key: 'currency', label: 'Currency', sortable: true, defaultWidth: 110 },
        { key: 'written_premium_limit', label: 'Gross Premium Income Limit', sortable: true, defaultWidth: 180 },
    ]

    function handleSectionSort(key: string) {
        setSectionSort(prev =>
            prev.key === key
                ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
                : { key, direction: 'asc' }
        )
    }

    function renderSectionCell(key: string, row: unknown): React.ReactNode {
        const section = row as BASection
        if (key === 'written_premium_limit') return section.written_premium_limit?.toLocaleString() ?? '—'
        return (section as unknown as Record<string, unknown>)[key]?.toString() ?? '—'
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                        {ba?.reference ?? '—'} — {coverholderVal} — {transaction.type ?? '—'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Transaction {transaction.sequence_number ?? transaction.id} · Effective {transaction.effective_date ?? '—'} · {transaction.status ?? '—'}
                    </p>
                </div>
                <Link to={`/binding-authorities/${id}`} className="text-sm text-brand-600 hover:underline">
                    ← Back to Binding Authority
                </Link>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col gap-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contract &amp; Reference</p>
                        <div>
                            <p className={labelClass}>Reference</p>
                            <p className={valClass}>{ba?.reference ?? '—'}</p>
                        </div>
                        <div>
                            <p className={labelClass}>Binding Authority Status</p>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_CLASSES[ba?.status ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>
                                {ba?.status ?? '—'}
                            </span>
                        </div>
                        <div>
                            <p className={labelClass}>Coverholder</p>
                            <p className={valClass}>{coverholderVal}</p>
                        </div>
                        <div>
                            <p className={labelClass}>Year of Account</p>
                            <p className={valClass}>{yearOfAccountVal}</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dates</p>
                        <div>
                            <p className={labelClass}>Inception Date</p>
                            <p className={valClass}>{inceptionDateVal}</p>
                        </div>
                        <div>
                            <p className={labelClass}>Expiry Date</p>
                            <p className={valClass}>{expiryDateVal}</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Endorsement Details</p>
                        <div>
                            <p className={labelClass}>Transaction Number</p>
                            <p className={valClass}>{transaction.id}</p>
                        </div>
                        <div>
                            <p className={labelClass}>Endorsement Type</p>
                            <p className={valClass}>{transaction.type ?? '—'}</p>
                        </div>
                        <div>
                            <p className={labelClass}>Endorsement Status</p>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${TX_STATUS_CLASSES[transaction.status ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>
                                {transaction.status ?? '—'}
                            </span>
                        </div>
                        <div>
                            <p className={labelClass}>Transaction Effective Date</p>
                            <p className={valClass}>{transaction.effective_date ?? '—'}</p>
                        </div>
                        <div>
                            <p className={labelClass}>Endorsement Description</p>
                            <p className={valClass}>{transaction.description ?? '—'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-4">
                <div>
                    <h3 className="text-sm font-semibold text-gray-900">Sections</h3>
                    <p className="text-sm text-gray-500 mt-1">Issued endorsement values shown in locked form.</p>
                </div>
                <ResizableGrid
                    columns={SECTION_COLUMNS}
                    rows={sortedSections}
                    storageKey="table-widths-transaction-view-sections"
                    sortConfig={sectionSort}
                    onRequestSort={handleSectionSort}
                    renderCell={renderSectionCell}
                    rowKey={(row) => (row as BASection).id}
                    emptyMessage="No sections found."
                />
            </div>
        </div>
    )
}
