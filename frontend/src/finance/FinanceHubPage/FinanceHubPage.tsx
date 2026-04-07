/**
 * FinanceHubPage — REQ-FIN-FE-F-001 to F-004
 *
 * Shows 3-col module cards with icon + description (matching BackUp design),
 * plus a 4-col quick stats row loaded from GET /api/finance/summary.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiDollarSign, FiFileText, FiBarChart2 } from 'react-icons/fi'
import Card from '@/shared/Card/Card'
import { useNotifications } from '@/shell/NotificationDock'
import { getFinanceSummary, type FinanceSummary } from '../finance.service'

const MODULES = [
    {
        id: 'cash-batching',
        title: 'Cash Batching',
        description: 'Allocate cash receipts to invoices and manage payment batches',
        icon: FiDollarSign,
        path: '/finance/cash-batching',
        color: 'bg-gray-100 text-gray-600',
    },
    {
        id: 'trial-balance',
        title: 'Trial Balance',
        description: 'View trial balance reports and financial statements',
        icon: FiBarChart2,
        path: '/finance/trial-balance',
        color: 'bg-gray-100 text-gray-600',
    },
    {
        id: 'invoices',
        title: 'Invoices',
        description: 'Manage and track invoices for policies and claims',
        icon: FiFileText,
        path: '/finance/invoices',
        color: 'bg-gray-100 text-gray-600',
    },
    {
        id: 'payments',
        title: 'Payments',
        description: 'Process and track payments and receipts',
        icon: FiDollarSign,
        path: '/finance/payments',
        color: 'bg-gray-100 text-gray-600',
    },
]

const STATS = [
    { label: 'Outstanding Invoices', statKey: 'outstandingInvoices' as keyof FinanceSummary },
    { label: 'Pending Payments', statKey: 'pendingPayments' as keyof FinanceSummary },
    { label: 'Unallocated Cash', statKey: 'outstandingCash' as keyof FinanceSummary },
    { label: 'Total Receivables', statKey: 'totalReceivables' as keyof FinanceSummary },
]

export default function FinanceHubPage() {
    const navigate = useNavigate()
    const { addNotification } = useNotifications()

    const [summary, setSummary] = useState<FinanceSummary | null>(null)

    useEffect(() => {
        getFinanceSummary()
            .then(setSummary)
            .catch(() => {
                addNotification('Could not load finance summary.', 'error')
            })
    }, [addNotification])

    return (
        <div className="p-6 flex flex-col gap-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Finance</h2>
                <p className="text-sm text-gray-600 mt-1">Manage financial operations, cash allocation, and reporting</p>
            </div>

            {/* Finance Modules Grid — 3 columns with icon + description */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MODULES.map((mod) => {
                    const Icon = mod.icon
                    return (
                        <div
                            key={mod.id}
                            className="cursor-pointer"
                            onClick={() => navigate(mod.path)}
                        >
                            <Card className="p-6 hover:shadow-lg transition-shadow">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-lg ${mod.color}`}>
                                        <Icon size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{mod.title}</h3>
                                        <p className="text-sm text-gray-600">{mod.description}</p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )
                })}
            </div>

            {/* Quick Stats — 4 columns */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {STATS.map((s) => (
                    <Card key={s.statKey} className="p-4">
                        <div className="text-sm text-gray-600">{s.label}</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">
                            {summary != null ? summary[s.statKey].toLocaleString() : '—'}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}
