/**
 * PaymentsPage — REQ-FIN-FE-F-031 to F-038
 *
 * Lists payments/receipts with status/type filters and a record payment modal.
 */

import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FiPlus, FiX } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import {
    getPayments,
    createPayment,
    type Payment,
    type PaymentStatus,
    type PaymentType,
    type PaymentMethod,
    type CreatePaymentInput,
} from '../finance.service'

const STATUS_CLASSES: Record<PaymentStatus, string> = {
    Pending: 'bg-amber-100 text-amber-800',
    Cleared: 'bg-green-100 text-green-800',
    Failed: 'bg-red-100 text-red-700',
    Reversed: 'bg-gray-100 text-gray-600',
}

const PAYMENT_TYPES: PaymentType[] = ['Receipt', 'Payment']
const PAYMENT_METHODS: PaymentMethod[] = ['Wire', 'Cheque', 'BACS', 'Direct Debit']
const CURRENCIES = ['GBP', 'USD', 'EUR', 'CAD', 'AUD', 'JPY']

const EMPTY_FORM: CreatePaymentInput = {
    type: 'Receipt',
    source: '',
    amount: 0,
    currency: 'GBP',
    method: 'Wire',
    date: '',
}

export default function PaymentsPage() {
    const { addNotification } = useNotifications()

    const [payments, setPayments] = useState<Payment[]>([])
    const [loading, setLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState<string>('')
    const [filterType, setFilterType] = useState<string>('')
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState<CreatePaymentInput>(EMPTY_FORM)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        setLoading(true)
        getPayments()
            .then(setPayments)
            .catch(() => addNotification('Could not load payments.', 'error'))
            .finally(() => setLoading(false))
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    function setField<K extends keyof CreatePaymentInput>(key: K, value: CreatePaymentInput[K]) {
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    const filtered = useMemo(() => {
        let rows = payments
        if (filterStatus) rows = rows.filter((r) => r.status === filterStatus)
        if (filterType) rows = rows.filter((r) => r.type === filterType)
        return rows
    }, [payments, filterStatus, filterType])

    const totalReceipts = useMemo(
        () => payments.filter((p) => p.type === 'Receipt').reduce((s, r) => s + r.amount, 0),
        [payments]
    )
    const totalPaymentsSum = useMemo(
        () => payments.filter((p) => p.type === 'Payment').reduce((s, r) => s + r.amount, 0),
        [payments]
    )

    async function handleCreate() {
        if (form.amount <= 0) {
            addNotification('Amount must be greater than zero.', 'error')
            return
        }
        setSaving(true)
        try {
            const created = await createPayment(form)
            setPayments((prev) => [...prev, created])
            addNotification('Payment recorded.', 'success')
            setShowModal(false)
            setForm(EMPTY_FORM)
        } catch {
            addNotification('Could not record payment.', 'error')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">Payments</h2>
                <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
                >
                    <FiPlus />
                    Record Payment
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                    { label: 'Total Receipts', value: totalReceipts },
                    { label: 'Total Payments', value: totalPaymentsSum },
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
                    {(['Pending', 'Cleared', 'Failed', 'Reversed'] as PaymentStatus[]).map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                >
                    <option value="">All Types</option>
                    {PAYMENT_TYPES.map((t) => (
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
                                <th className="px-4 py-3 font-medium text-gray-600">Source</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Amount</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Method</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                                        No payments found.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((p) => (
                                    <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-100">
                                        <td className="px-4 py-3">
                                            <Link
                                                to={`/finance/payments/${p.id}`}
                                                className="text-brand-600 hover:underline font-medium"
                                            >
                                                {p.reference}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3">{p.type}</td>
                                        <td className="px-4 py-3">{p.source ?? '—'}</td>
                                        <td className="px-4 py-3">{p.amount.toLocaleString()}</td>
                                        <td className="px-4 py-3">{p.method ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_CLASSES[p.status]}`}
                                            >
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">{p.date ?? '—'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Record Payment Modal */}
            {showModal && (
                <div className="fixed inset-y-0 left-14 right-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">Record Payment</h2>
                            <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <FiX />
                            </button>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1">
                                <label htmlFor="pay-type" className="text-sm font-medium text-gray-700">Type</label>
                                <select
                                    id="pay-type"
                                    value={form.type}
                                    onChange={(e) => setField('type', e.target.value as PaymentType)}
                                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                                >
                                    {PAYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label htmlFor="pay-source" className="text-sm font-medium text-gray-700">Source</label>
                                <input
                                    id="pay-source"
                                    type="text"
                                    value={form.source ?? ''}
                                    onChange={(e) => setField('source', e.target.value)}
                                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                                />
                            </div>

                            <div className="flex gap-3">
                                <div className="flex flex-col gap-1 flex-1">
                                    <label htmlFor="pay-amount" className="text-sm font-medium text-gray-700">Amount <span className="text-red-500">*</span></label>
                                    <input
                                        id="pay-amount"
                                        type="number"
                                        min={0}
                                        value={form.amount}
                                        onChange={(e) => setField('amount', parseFloat(e.target.value) || 0)}
                                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label htmlFor="pay-currency" className="text-sm font-medium text-gray-700">Currency</label>
                                    <select
                                        id="pay-currency"
                                        value={form.currency ?? 'GBP'}
                                        onChange={(e) => setField('currency', e.target.value)}
                                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                                    >
                                        {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label htmlFor="pay-method" className="text-sm font-medium text-gray-700">Method</label>
                                <select
                                    id="pay-method"
                                    value={form.method ?? 'Wire'}
                                    onChange={(e) => setField('method', e.target.value as PaymentMethod)}
                                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                                >
                                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label htmlFor="pay-date" className="text-sm font-medium text-gray-700">Date</label>
                                <input
                                    id="pay-date"
                                    type="date"
                                    value={form.date ?? ''}
                                    onChange={(e) => setField('date', e.target.value)}
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
                                {saving ? 'Saving…' : 'Record Payment'}
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
