/**
 * CashBatchingCreatePage — REQ-FIN-FE-F-016 to F-018
 *
 * Form to create a new cash batch.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '@/shell/NotificationDock'
import { createCashBatch, type CreateCashBatchInput } from '../finance.service'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']

const EMPTY_FORM: CreateCashBatchInput = {
    amount: 0,
    currency: 'GBP',
    reference: '',
    assigned_to: '',
}

export default function CashBatchingCreatePage() {
    const navigate = useNavigate()
    const { addNotification } = useNotifications()

    const [form, setForm] = useState<CreateCashBatchInput>(EMPTY_FORM)
    const [saving, setSaving] = useState(false)

    function setField<K extends keyof CreateCashBatchInput>(key: K, value: CreateCashBatchInput[K]) {
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    async function handleSave() {
        if (!form.reference.trim()) {
            addNotification('Reference is required.', 'error')
            return
        }
        if (form.amount <= 0) {
            addNotification('Amount must be greater than zero.', 'error')
            return
        }
        setSaving(true)
        try {
            await createCashBatch(form)
            addNotification('Cash batch created successfully.', 'success')
            navigate('/finance/cash-batching')
        } catch {
            addNotification('Could not create cash batch.', 'error')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">Create Batch</h2>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <label htmlFor="cb-reference" className="text-sm font-medium text-gray-700">
                        Reference <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="cb-reference"
                        type="text"
                        value={form.reference}
                        onChange={(e) => setField('reference', e.target.value)}
                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="cb-amount" className="text-sm font-medium text-gray-700">
                        Amount <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="cb-amount"
                        type="number"
                        min={0}
                        value={form.amount}
                        onChange={(e) => setField('amount', parseFloat(e.target.value) || 0)}
                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="cb-currency" className="text-sm font-medium text-gray-700">
                        Currency
                    </label>
                    <select
                        id="cb-currency"
                        value={form.currency}
                        onChange={(e) => setField('currency', e.target.value)}
                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                    >
                        {CURRENCIES.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="cb-assigned" className="text-sm font-medium text-gray-700">
                        Assigned To
                    </label>
                    <input
                        id="cb-assigned"
                        type="text"
                        value={form.assigned_to ?? ''}
                        onChange={(e) => setField('assigned_to', e.target.value)}
                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                    >
                        {saving ? 'Saving…' : 'Save Batch'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/finance/cash-batching')}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )
}
