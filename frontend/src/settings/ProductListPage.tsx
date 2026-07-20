/**
 * Product List page — REQ-SETTINGS-PRODUCTS-F-001 through F-003
 * Requirements: settings.requirements.md §3c
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPackage, FiPlus, FiSave, FiSearch } from 'react-icons/fi'
import { useSidebarSection } from '@/shell/SidebarContext'
import {
    getProductCategories,
    getProducts,
    type ProductCategory,
    type Product,
    type NewProductForm,
} from './settings.service'
import { getClassesOfBusiness } from '@/quotes/quotes.service'

export default function ProductListPage() {
    const navigate = useNavigate()
    const [products, setProducts] = useState<Product[]>([])
    const [productCategories, setProductCategories] = useState<ProductCategory[]>([])
    const [loading, setLoading] = useState(true)
    const [showInlineCreate, setShowInlineCreate] = useState(false)
    const [draftId, setDraftId] = useState<number | null>(null)
    const [nameError, setNameError] = useState(false)
    const [filters, setFilters] = useState({
        query: '',
        productCategory: '',
        classOfBusiness: '',
        status: 'all',
    })
    const [form, setForm] = useState<NewProductForm>({
        name: '',
        code: '',
        productCategoryId: null,
        line_of_business: '',
        underwriting_year: new Date().getFullYear(),
        description: '',
    })
    const [classOfBusinessOptions, setClassOfBusinessOptions] = useState<string[]>([])
    const hasUnsaved = showInlineCreate && form.name.trim().length > 0

    const filteredProducts = useMemo(() => {
        const query = filters.query.trim().toLowerCase()
        return products.filter((product) => {
            const matchesQuery = !query
                || product.name.toLowerCase().includes(query)
                || product.code.toLowerCase().includes(query)
            const matchesCategory = !filters.productCategory || String(product.productCategoryId ?? '') === filters.productCategory
            const matchesCob = !filters.classOfBusiness || product.line_of_business === filters.classOfBusiness
            const matchesStatus = filters.status === 'all'
                || (filters.status === 'active' && product.is_active)
                || (filters.status === 'inactive' && !product.is_active)
            return matchesQuery && matchesCategory && matchesCob && matchesStatus
        })
    }, [filters, products])

    useEffect(() => {
        getProducts()
            .then(data => setProducts(Array.isArray(data) ? data : []))
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        getProductCategories()
            .then((data) => setProductCategories(Array.isArray(data) ? data : []))
            .catch(() => setProductCategories([]))
    }, [])

    useEffect(() => {
        getClassesOfBusiness()
            .then((data) => setClassOfBusinessOptions(Array.isArray(data) ? data : []))
            .catch(() => setClassOfBusinessOptions([]))
    }, [])

    function setField<K extends keyof NewProductForm>(key: K, value: NewProductForm[K]) {
        setForm(prev => ({ ...prev, [key]: value }))
    }

    function normalizeCode(value: string): string {
        return value
            .toUpperCase()
            .replace(/[^A-Z0-9\s]/g, '')
            .trim()
            .replace(/\s+/g, '_')
            .slice(0, 30)
    }

    function handleNameChange(value: string) {
        setForm(prev => ({
            ...prev,
            name: value,
            code: normalizeCode(value),
        }))
    }

    function resetCreateRow() {
        setShowInlineCreate(false)
        setDraftId(null)
        setNameError(false)
        setForm({
            name: '',
            code: '',
            productCategoryId: null,
            line_of_business: '',
            underwriting_year: new Date().getFullYear(),
            description: '',
        })
    }

    function handleAddRow() {
        setDraftId(Date.now())
        setShowInlineCreate(true)
        setNameError(false)
    }

    async function handleCreate() {
        navigate('/settings/products/new', { state: { ...form, draftId } })
        resetCreateRow()
    }

    const sidebarSection = useMemo(() => ({
        title: 'Product Configuration',
        items: [
            { label: 'Save', icon: FiSave, event: 'product-list:save', disabled: !hasUnsaved },
            { label: 'Create Product Catagory', icon: FiPlus, to: '/settings/product-catagories' },
        ],
    }), [hasUnsaved])

    useSidebarSection(sidebarSection)

    useEffect(() => {
        const handler = () => { void handleCreate() }
        window.addEventListener('product-list:save', handler)
        return () => window.removeEventListener('product-list:save', handler)
    })

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FiPackage className="text-brand-500 text-2xl" />
                    <h2 className="text-2xl font-semibold text-gray-900">Product Configuration</h2>
                </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                    <div>
                        <label htmlFor="product-filter-query" className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Search</label>
                        <input
                            id="product-filter-query"
                            type="text"
                            value={filters.query}
                            onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
                            placeholder="Name or code"
                            className="block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="product-filter-category" className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Product Catagory</label>
                        <select
                            id="product-filter-category"
                            value={filters.productCategory}
                            onChange={(e) => setFilters((prev) => ({ ...prev, productCategory: e.target.value }))}
                            className="block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        >
                            <option value="">All</option>
                                    {productCategories.map((category) => (
                                        <option key={category.id} value={String(category.id)}>{category.name} ({category.productCount})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="product-filter-cob" className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Class of Business</label>
                        <select
                            id="product-filter-cob"
                            value={filters.classOfBusiness}
                            onChange={(e) => setFilters((prev) => ({ ...prev, classOfBusiness: e.target.value }))}
                            className="block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        >
                            <option value="">All</option>
                            {classOfBusinessOptions.map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="product-filter-status" className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Status</label>
                        <select
                            id="product-filter-status"
                            value={filters.status}
                            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                            className="block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        >
                            <option value="all">All</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
                </div>
            ) : (
                <div className="table-wrapper rounded-lg shadow-sm">
                    <table className="app-table">
                        <thead>
                            <tr>
                                <th style={{ width: 52 }}>
                                    {!showInlineCreate && (
                                        <button
                                            type="button"
                                            aria-label="Add product"
                                            title="Add product"
                                            onClick={handleAddRow}
                                        >
                                            <FiPlus size={14} />
                                        </button>
                                    )}
                                </th>
                                <th style={{ width: 64 }}>ID</th>
                                <th>Name</th>
                                <th>Product Catagory</th>
                                <th>Class of Business</th>
                                <th style={{ width: 140 }}>UW Year</th>
                                <th style={{ width: 140 }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {showInlineCreate && (
                                <tr>
                                    <td>
                                        <button
                                            type="button"
                                            aria-label="View product configuration"
                                            title="View product configuration"
                                            className="inline-flex items-center justify-center text-brand-600 hover:text-brand-700 disabled:opacity-50"
                                            onClick={handleCreate}
                                        >
                                            <FiSearch size={14} />
                                        </button>
                                    </td>
                                    <td>{draftId ?? '—'}</td>
                                    <td>
                                        <input
                                            aria-label="Product Name"
                                            type="text"
                                            value={form.name}
                                            onChange={(e) => handleNameChange(e.target.value)}
                                            className={`w-full ${nameError ? 'border border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                        />
                                    </td>
                                    <td>
                                        <select
                                            aria-label="Product Catagory"
                                            value={form.productCategoryId ?? ''}
                                            onChange={e => setField('productCategoryId', e.target.value ? Number(e.target.value) : null)}
                                            className="w-full"
                                        >
                                            <option value="">Select a product catagory</option>
                                            {productCategories.map((category) => (
                                                <option key={category.id} value={category.id}>{category.name}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td>
                                        <select
                                            aria-label="Class of Business"
                                            value={form.line_of_business}
                                            onChange={e => setField('line_of_business', e.target.value)}
                                            className="w-full"
                                        >
                                            <option value="">Select…</option>
                                            {classOfBusinessOptions.map((option) => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td>
                                        <input
                                            aria-label="Underwriting Year"
                                            type="number"
                                            value={form.underwriting_year}
                                            onChange={e => setField('underwriting_year', parseInt(e.target.value, 10) || new Date().getFullYear())}
                                            className="w-full"
                                        />
                                    </td>
                                    <td>
                                        <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">Active</span>
                                    </td>
                                </tr>
                            )}

                            {filteredProducts.length === 0 && !showInlineCreate ? (
                                <tr>
                                    <td colSpan={7} className="text-center text-gray-400 py-8">No products found.</td>
                                </tr>
                            ) : (
                                filteredProducts.map((p) => (
                                    <tr key={p.id}>
                                        <td>
                                            <button
                                                type="button"
                                                aria-label="View product"
                                                title="View product"
                                                className="inline-flex items-center justify-center text-brand-600 hover:text-brand-700"
                                                onClick={() => navigate(`/settings/products/${p.id}`)}
                                            >
                                                <FiSearch size={14} />
                                            </button>
                                        </td>
                                        <td>{p.id}</td>
                                        <td>{p.name}</td>
                                        <td>{p.productCategoryName || p.product_type || '—'}</td>
                                        <td>{p.line_of_business || '—'}</td>
                                        <td>{p.underwriting_year || '—'}</td>
                                        <td>
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {p.is_active ? 'Active' : 'Inactive'}
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
