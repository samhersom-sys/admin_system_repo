/**
 * InvoicesPage — REQ-FIN-FE-F-021 to F-028
 *
 * Lists invoices with status/type filters and a create modal.
 * Auto-overdue: dueDate past + Outstanding status.
 */

import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FiPlus, FiX } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import {
    getInvoices,
    createInvoice,
    type Invoice,
    type InvoiceStatus,
    type InvoiceType,
    type CreateInvoiceInput,
} from '../finance.service'

const STATUS_CLASSES: Record<InvoiceStatus, string> = {
    Outstanding: 'bg-amber-100 text-amber-800',
    Paid: 'bg-green-100 text-green-800',
    Overdue: 'bg-red-100 text-red-700',
    Cancelled: 'bg-gray-100 text-gray-600',
}

const INVOICE_TYPES: InvoiceType[] = ['Premium', 'Claim', 'Commission']
const CURRENCIES = ['GBP', 'USD', 'EUR', 'CAD', 'AUD', 'JPY']

function isOverdue(inv: Invoice): boolean {
    if (inv.status !== 'Outstanding') return false
    if (!inv.due_date) return false
    return new Date(inv.due_date) < new Date()
}

const EMPTY_FORM: CreateInvoiceInput = {
    type: 'Premium',
    policy_reference: '',
    insured_name: '',
    amount: 0,
    due_date: '',
    currency: 'GBP',
}

export default function InvoicesPage() {
    const { addNotification } = useNotifications()

    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loading, setLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState<string>('')
    const [filterType, setFilterType] = useState<string>('')
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState<CreateInvoiceInput>(EMPTY_FORM)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        setLoading(true)
        getInvoices()
            .then(setInvoices)
            .catch(() => addNotification('Could not load invoices.', 'error'))
            .finally(() => setLoading(false))
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    function setField<K extends keyof CreateInvoiceInput>(key: K, value: CreateInvoiceInput[K]) {
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    const enriched = useMemo(
        () =>
            invoices.map((inv) => ({
                ...inv,
                status: isOverdue(inv) ? ('Overdue' as InvoiceStatus) : inv.status,
            })),
        [invoices]
    )

    const filtered = useMemo(() => {
        let rows = enriched
        if (filterStatus) rows = rows.filter((r) => r.status === filterStatus)
        if (filterType) rows = rows.filter((r) => r.type === filterType)
        return rows
    }, [enriched, filterStatus, filterType])

    const totalInvoiced = useMemo(() => invoices.reduce((s, r) => s + r.amount, 0), [invoices])
    const outstanding = useMemo(
        () =>
            enriched
                .filter((r) => r.status === 'Outstanding' || r.status === 'Overdue')
                .reduce((s, r) => s + r.outstanding, 0),
        [enriched]
    )
    const paid = useMemo(
        () =>
            enriched
                .filter((r) => r.status === 'Paid')
                .reduce((s, r) => s + r.amount, 0),
        [enriched]
    )

    async function handleCreate() {
        if (form.amount <= 0) {
            addNotification('Amount must be greater than zero.', 'error')
            return
        }
        setSaving(true)
        try {
            const created = await createInvoice(form)
            setInvoices((prev) => [...prev, created])
            addNotification('Invoice created.', 'success')
            setShowModal(false)
            setForm(EMPTY_FORM)
        } catch {
            addNotification('Could not create invoice.', 'error')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">Invoices</h2>
                <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
                >
                    <FiPlus />
                    Create Invoice
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Total Invoiced', value: totalInvoiced },
                    { label: 'Outstanding', value: outstanding },
                    { label: 'Paid', value: paid },
                ].map((s) => (
                    <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">{s.label}</p>
                        <p className="text-xl font-bold text-gray-900 mt-1">{s.value.toLocaleString()}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                >
                    <option value="">All Statuses</option>
                    {(['Outstanding', 'Paid', 'Overdue', 'Cancelled'] as InvoiceStatus[]).map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                >
                    <option value="">All Types</option>
                    {INVOICE_TYPES.map((t) => (
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
                                <th className="px-4 py-3 font-medium text-gray-600">Reference</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Type</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Policy Ref</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Insured Name</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Amount</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Outstanding</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Due Date</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Issue Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                                        No invoices found.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((inv) => (
                                    <tr key={inv.id} className="border-t border-gray-100 hover:bg-gray-100">
                                        <td className="px-4 py-3">
                                            <Link
                                                to={`/finance/invoices/${inv.id}`}
                                                className="text-brand-600 hover:underline font-medium"
                                            >
                                                {inv.reference}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3">{inv.type}</td>
                                        <td className="px-4 py-3">
                                            {inv.policy_id ? (
                                                <Link
                                                    to={`/policies/${inv.policy_id}`}
                                                    className="text-brand-600 hover:underline"
                                                >
                                                    {inv.policy_reference ?? inv.policy_id}
                                                </Link>
                                            ) : (
                                                inv.policy_reference ?? '—'
                                            )}
                                        </td>
                                        <td className="px-4 py-3">{inv.insured_name ?? '—'}</td>
                                        <td className="px-4 py-3">{inv.amount.toLocaleString()}</td>
                                        <td className="px-4 py-3">{inv.outstanding.toLocaleString()}</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_CLASSES[inv.status]}`}
                                            >
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">{inv.due_date ?? '—'}</td>
                                        <td className="px-4 py-3">{inv.issue_date ?? '—'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Invoice Modal */}
            {showModal && (
                <div className="fixed inset-y-0 left-14 right-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">Create Invoice</h2>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <FiX />
                            </button>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1">
                                <label htmlFor="inv-type" className="text-sm font-medium text-gray-700">Type</label>
                                <select
                                    id="inv-type"
                                    value={form.type}
                                    onChange={(e) => setField('type', e.target.value as InvoiceType)}
                                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                                >
                                    {INVOICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label htmlFor="inv-policy" className="text-sm font-medium text-gray-700">Policy Reference</label>
                                <input
                                    id="inv-policy"
                                    type="text"
                                    value={form.policy_reference ?? ''}
                                    onChange={(e) => setField('policy_reference', e.target.value)}
                                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label htmlFor="inv-insured" className="text-sm font-medium text-gray-700">Insured Name</label>
                                <input
                                    id="inv-insured"
                                    type="text"
                                    value={form.insured_name ?? ''}
                                    onChange={(e) => setField('insured_name', e.target.value)}
                                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                                />
                            </div>

                            <div className="flex gap-3">
                                <div className="flex flex-col gap-1 flex-1">
                                    <label htmlFor="inv-amount" className="text-sm font-medium text-gray-700">Amount <span className="text-red-500">*</span></label>
                                    <input
                                        id="inv-amount"
                                        type="number"
                                        min={0}
                                        value={form.amount}
                                        onChange={(e) => setField('amount', parseFloat(e.target.value) || 0)}
                                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label htmlFor="inv-currency" className="text-sm font-medium text-gray-700">Currency</label>
                                    <select
                                        id="inv-currency"
                                        value={form.currency ?? 'GBP'}
                                        onChange={(e) => setField('currency', e.target.value)}
                                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                                    >
                                        {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label htmlFor="inv-due" className="text-sm font-medium text-gray-700">Due Date</label>
                                <input
                                    id="inv-due"
                                    type="date"
                                    value={form.due_date ?? ''}
                                    onChange={(e) => setField('due_date', e.target.value)}
                                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleCreate}
                                disabled={saving}
                                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                            >
                                {saving ? 'Saving…' : 'Create Invoice'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
