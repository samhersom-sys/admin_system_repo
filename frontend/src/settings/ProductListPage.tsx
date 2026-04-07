/**
 * Product List page — REQ-SETTINGS-PRODUCTS-F-001 through F-003
 * Requirements: settings.requirements.md §3c
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPackage, FiPlus, FiX } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import {
    getProducts,
    createProduct,
    type Product,
    type NewProductForm,
} from './settings.service'
import Card from '@/shared/Card/Card'

export default function ProductListPage() {
    const navigate = useNavigate()
    const { addNotification } = useNotifications()
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState<NewProductForm>({
        name: '',
        code: '',
        product_type: 'open_market',
        line_of_business: '',
        underwriting_year: new Date().getFullYear(),
        description: '',
    })
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        getProducts()
            .then(data => setProducts(Array.isArray(data) ? data : []))
            .finally(() => setLoading(false))
    }, [])

    function setField<K extends keyof NewProductForm>(key: K, value: NewProductForm[K]) {
        setForm(prev => ({ ...prev, [key]: value }))
    }

    async function handleCreate() {
        setCreating(true)
        try {
            const created = await createProduct(form)
            setProducts(prev => [...prev, created])
            addNotification('Product created successfully', 'success')
            setShowModal(false)
            setForm({ name: '', code: '', product_type: 'open_market', line_of_business: '', underwriting_year: new Date().getFullYear(), description: '' })
        } finally {
            setCreating(false)
        }
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FiPackage className="text-brand-500 text-2xl" />
                    <h2 className="text-2xl font-semibold text-gray-900">Product Configuration</h2>
                </div>
                <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
                >
                    <FiPlus />
                    New Product
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.length === 0 ? (
                        <p className="col-span-full text-gray-500 text-sm">No products found.</p>
                    ) : (
                        products.map(p => (
                            <Card key={p.id}>
                                <div
                                    className="p-5 cursor-pointer hover:bg-gray-100 rounded-lg"
                                    onClick={() => navigate(`/settings/products/${p.id}`)}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-semibold text-gray-900 text-sm">{p.name}</h3>
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                                }`}
                                        >
                                            {p.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-brand-600 font-mono mb-1">{p.code}</p>
                                    <p className="text-xs text-gray-500">{p.product_type} · {p.line_of_business}</p>
                                    {p.description && (
                                        <p className="text-xs text-gray-500 mt-2 line-clamp-2">{p.description}</p>
                                    )}
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            )}

            {/* New Product Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">New Product</h3>
                            <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <FiX />
                            </button>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1">
                                <label htmlFor="prod-name" className="text-sm font-medium text-gray-700">
                                    Product Name
                                </label>
                                <input
                                    id="prod-name"
                                    type="text"
                                    value={form.name}
                                    onChange={e => setField('name', e.target.value)}
                                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label htmlFor="prod-code" className="text-sm font-medium text-gray-700">
                                    Product Code
                                </label>
                                <input
                                    id="prod-code"
                                    type="text"
                                    value={form.code}
                                    onChange={e => setField('code', e.target.value)}
                                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label htmlFor="prod-type" className="text-sm font-medium text-gray-700">
                                    Product Type
                                </label>
                                <select
                                    id="prod-type"
                                    value={form.product_type}
                                    onChange={e => setField('product_type', e.target.value)}
                                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                                >
                                    <option value="open_market">Open Market</option>
                                    <option value="binding_authority">Binding Authority</option>
                                    <option value="delegated">Delegated</option>
                                    <option value="lineslip">Lineslip</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label htmlFor="prod-lob" className="text-sm font-medium text-gray-700">
                                    Line of Business
                                </label>
                                <input
                                    id="prod-lob"
                                    type="text"
                                    value={form.line_of_business}
                                    onChange={e => setField('line_of_business', e.target.value)}
                                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label htmlFor="prod-year" className="text-sm font-medium text-gray-700">
                                    Underwriting Year
                                </label>
                                <input
                                    id="prod-year"
                                    type="number"
                                    value={form.underwriting_year}
                                    onChange={e => setField('underwriting_year', parseInt(e.target.value) || new Date().getFullYear())}
                                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label htmlFor="prod-desc" className="text-sm font-medium text-gray-700">
                                    Description
                                </label>
                                <textarea
                                    id="prod-desc"
                                    value={form.description}
                                    onChange={e => setField('description', e.target.value)}
                                    rows={2}
                                    className="border border-gray-300 rounded px-3 py-2 text-sm resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleCreate}
                                disabled={creating}
                                className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
                            >
                                {creating ? 'Creating…' : 'Create Product'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
