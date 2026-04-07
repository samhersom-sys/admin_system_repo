/**
 * TrialBalancePage — REQ-FIN-FE-F-041 to F-046
 *
 * Shows "Generate Report" button. On click loads trial balance from API.
 * Totals row is green when balanced, red when unbalanced.
 */

import { useState } from 'react'
import { useNotifications } from '@/shell/NotificationDock'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import { getTrialBalance, type TrialBalanceRow } from '../finance.service'

export default function TrialBalancePage() {
    const { addNotification } = useNotifications()

    const [rows, setRows] = useState<TrialBalanceRow[] | null>(null)
    const [loading, setLoading] = useState(false)

    async function handleGenerate() {
        setLoading(true)
        try {
            const data = await getTrialBalance()
            setRows(data)
        } catch {
            addNotification('Could not generate trial balance.', 'error')
        } finally {
            setLoading(false)
        }
    }

    const totalDebit = rows?.reduce((s, r) => s + r.debit, 0) ?? 0
    const totalCredit = rows?.reduce((s, r) => s + r.credit, 0) ?? 0
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">Trial Balance</h2>
                <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={loading}
                    className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                >
                    {loading ? 'Generating…' : 'Generate Report'}
                </button>
            </div>

            {loading && <LoadingSpinner />}

            {rows !== null && !loading && (
                <>
                    {/* Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <p className="text-sm text-gray-500">Total Debit</p>
                            <p className="text-xl font-bold text-gray-900 mt-1">{totalDebit.toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <p className="text-sm text-gray-500">Total Credit</p>
                            <p className="text-xl font-bold text-gray-900 mt-1">{totalCredit.toLocaleString()}</p>
                        </div>
                        <div className={`rounded-lg border p-4 ${isBalanced ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                            <p className="text-sm text-gray-500">Balance</p>
                            <p className={`text-xl font-bold mt-1 ${isBalanced ? 'text-green-700' : 'text-red-700'}`}>
                                {isBalanced ? 'Balanced' : `Difference: ${Math.abs(totalDebit - totalCredit).toLocaleString()}`}
                            </p>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-100 text-left">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-gray-600">Account</th>
                                    <th className="px-4 py-3 font-medium text-gray-600 text-right">Debit</th>
                                    <th className="px-4 py-3 font-medium text-gray-600 text-right">Credit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                                            No data returned.
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row, i) => (
                                        <tr key={i} className="border-t border-gray-100 hover:bg-gray-100">
                                            <td className="px-4 py-3">{row.account}</td>
                                            <td className="px-4 py-3 text-right font-mono">{row.debit.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right font-mono">{row.credit.toLocaleString()}</td>
                                        </tr>
                                    ))
                                )}
                                {rows.length > 0 && (
                                    <tr
                                        className={`border-t-2 font-semibold ${isBalanced ? 'border-green-400 bg-green-50 text-green-800' : 'border-red-400 bg-red-50 text-red-800'}`}
                                    >
                                        <td className="px-4 py-3">Total</td>
                                        <td className="px-4 py-3 text-right font-mono">{totalDebit.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right font-mono">{totalCredit.toLocaleString()}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    )
}
