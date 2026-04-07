/**
 * Product Config page — REQ-SETTINGS-PRODUCTS-F-004 through F-005
 * Requirements: settings.requirements.md §3c
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import {
    getProduct,
    updateProduct as saveProduct,
    getWorkflowSteps,
    type Product,
    type WorkflowStep,
} from './settings.service'

type ActiveTab = 'general' | 'workflow'

export default function ProductConfigPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { addNotification } = useNotifications()

    const [product, setProduct] = useState<Product | null>(null)
    const [steps, setSteps] = useState<WorkflowStep[]>([])
    const [activeTab, setActiveTab] = useState<ActiveTab>('general')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [stepsLoaded, setStepsLoaded] = useState(false)

    useEffect(() => {
        if (!id) return
        getProduct(id)
            .then(data => setProduct(data))
            .finally(() => setLoading(false))
    }, [id])

    async function handleTabChange(tab: ActiveTab) {
        setActiveTab(tab)
        if (tab === 'workflow' && !stepsLoaded && id) {
            const data = await getWorkflowSteps(id)
            setSteps(Array.isArray(data) ? data : [])
            setStepsLoaded(true)
        }
    }

    async function handleSave() {
        if (!product || !id) return
        setSaving(true)
        try {
            await saveProduct(id, product)
            addNotification('Product saved successfully', 'success')
        } finally {
            setSaving(false)
        }
    }

    function updateProduct<K extends keyof Product>(key: K, value: Product[K]) {
        setProduct(prev => (prev ? { ...prev, [key]: value } : prev))
    }

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
            </div>
        )
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => navigate('/settings/products')} className="text-gray-500 hover:text-gray-700">
                    <FiArrowLeft className="text-xl" />
                </button>
                <h2 className="text-2xl font-semibold text-gray-900">
                    {product?.name ?? 'Product Configuration'}
                </h2>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-1">
                    {(['general', 'workflow'] as const).map(tab => (
                        <button
                            key={tab}
                            role="tab"
                            aria-selected={activeTab === tab}
                            onClick={() => handleTabChange(tab)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === tab
                                    ? 'border-brand-600 text-brand-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab === 'general' ? 'General' : 'Workflow Steps'}
                        </button>
                    ))}
                </nav>
            </div>

            {/* General tab */}
            {activeTab === 'general' && product && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label htmlFor="prod-name" className="text-sm font-medium text-gray-700">Name</label>
                            <input
                                id="prod-name"
                                type="text"
                                value={product.name}
                                onChange={e => updateProduct('name', e.target.value)}
                                className="border border-gray-300 rounded px-3 py-2 text-sm"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label htmlFor="prod-code" className="text-sm font-medium text-gray-700">Code</label>
                            <input
                                id="prod-code"
                                type="text"
                                value={product.code}
                                onChange={e => updateProduct('code', e.target.value)}
                                className="border border-gray-300 rounded px-3 py-2 text-sm"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label htmlFor="prod-type" className="text-sm font-medium text-gray-700">Product Type</label>
                            <select
                                id="prod-type"
                                value={product.product_type}
                                onChange={e => updateProduct('product_type', e.target.value)}
                                className="border border-gray-300 rounded px-3 py-2 text-sm"
                            >
                                <option value="open_market">Open Market</option>
                                <option value="binding_authority">Binding Authority</option>
                                <option value="delegated">Delegated</option>
                                <option value="lineslip">Lineslip</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label htmlFor="prod-lob" className="text-sm font-medium text-gray-700">Line of Business</label>
                            <input
                                id="prod-lob"
                                type="text"
                                value={product.line_of_business}
                                onChange={e => updateProduct('line_of_business', e.target.value)}
                                className="border border-gray-300 rounded px-3 py-2 text-sm"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label htmlFor="prod-year" className="text-sm font-medium text-gray-700">Underwriting Year</label>
                            <input
                                id="prod-year"
                                type="number"
                                value={product.underwriting_year}
                                onChange={e => updateProduct('underwriting_year', parseInt(e.target.value) || new Date().getFullYear())}
                                className="border border-gray-300 rounded px-3 py-2 text-sm"
                            />
                        </div>

                        <label className="flex items-center gap-2 text-sm text-gray-700 self-end mb-2">
                            <input
                                type="checkbox"
                                checked={product.is_active}
                                onChange={e => updateProduct('is_active', e.target.checked)}
                                className="w-4 h-4 text-brand-600"
                            />
                            Active
                        </label>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="prod-desc" className="text-sm font-medium text-gray-700">Description</label>
                        <textarea
                            id="prod-desc"
                            value={product.description}
                            onChange={e => updateProduct('description', e.target.value)}
                            rows={3}
                            className="border border-gray-300 rounded px-3 py-2 text-sm resize-none"
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                        >
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </div>
            )}

            {/* Workflow Steps tab */}
            {activeTab === 'workflow' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">Step Name</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">Code</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">Description</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">Order</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">Active</th>
                            </tr>
                        </thead>
                        <tbody>
                            {steps.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                        No workflow steps defined.
                                    </td>
                                </tr>
                            ) : (
                                steps.map(step => (
                                    <tr key={step.id} className="border-b border-gray-100">
                                        <td className="px-4 py-2 text-gray-900">{step.step_name}</td>
                                        <td className="px-4 py-2 font-mono text-xs text-gray-600">{step.step_code}</td>
                                        <td className="px-4 py-2 text-gray-600">{step.description}</td>
                                        <td className="px-4 py-2 text-gray-600">{step.sort_order}</td>
                                        <td className="px-4 py-2">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${step.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {step.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
