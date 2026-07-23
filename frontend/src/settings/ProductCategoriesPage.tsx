import { useEffect, useMemo, useState } from 'react'
import { FiPackage, FiPlus, FiSave, FiTrash2 } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import { useSidebarSection } from '@/shell/SidebarContext'
import Card from '@/shared/Card/Card'
import {
    createProductCategory,
    deleteProductCategory,
    getProductCategories,
    type ProductCategory,
} from './settings.service'

export default function ProductCategoriesPage() {
    const { addNotification } = useNotifications()
    const [categories, setCategories] = useState<ProductCategory[]>([])
    const [loading, setLoading] = useState(true)
    const [showInlineCreate, setShowInlineCreate] = useState(false)
    const [name, setName] = useState('')
    const [nameError, setNameError] = useState(false)
    const [saving, setSaving] = useState(false)
    const hasUnsaved = showInlineCreate && name.trim().length > 0

    const sidebarSection = useMemo(() => ({
        title: 'Product Configuration',
        items: [
            { label: 'Save', icon: FiSave, event: 'product:save', disabled: !hasUnsaved },
        ],
    }), [hasUnsaved])

    useSidebarSection(sidebarSection)

    function loadCategories() {
        setLoading(true)
        getProductCategories()
            .then((data) => setCategories(Array.isArray(data) ? data : []))
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        const handler = () => { void handleCreate() }
        window.addEventListener('product:save', handler)
        return () => window.removeEventListener('product:save', handler)
    })

    useEffect(() => {
        loadCategories()
    }, [])

    async function handleCreate() {
        const value = name.trim()
        if (!value) {
            setNameError(true)
            return
        }

        setSaving(true)
        try {
            await createProductCategory({ name: value })
            addNotification('Product catagory created successfully.', 'success')
            setName('')
            setNameError(false)
            setShowInlineCreate(false)
            loadCategories()
        } catch (error) {
            addNotification(error instanceof Error ? error.message : 'Failed to create product catagory.', 'error')
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(categoryId: number) {
        try {
            await deleteProductCategory(categoryId)
            addNotification('Product catagory deleted.', 'success')
            loadCategories()
        } catch (error) {
            addNotification(error instanceof Error ? error.message : 'Failed to delete product catagory.', 'error')
        }
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center gap-3">
                <FiPackage className="text-brand-500 text-2xl" />
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900">Product Catagories</h2>
                    <p className="text-sm text-gray-500">Create and remove organisation-specific product catagories.</p>
                </div>
            </div>

            <Card className="p-0 overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900">Categories</h3>
                        <p className="text-sm text-gray-500">Product counts update automatically as products move between catagories.</p>
                    </div>
                    {!showInlineCreate && (
                        <button
                            type="button"
                            onClick={() => setShowInlineCreate(true)}
                            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
                        >
                            <FiPlus size={14} />
                            Create Product Catagory
                        </button>
                    )}
                </div>

                <div className="table-wrapper rounded-none shadow-none">
                    <table className="app-table">
                        <thead>
                            <tr>
                                <th style={{ width: 64 }}>ID</th>
                                <th>Name</th>
                                <th style={{ width: 160 }}>Products</th>
                                <th style={{ width: 120 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {showInlineCreate && (
                                <tr>
                                    <td>—</td>
                                    <td>
                                        <input
                                            aria-label="Product Catagory Name"
                                            value={name}
                                            onChange={(e) => {
                                                setName(e.target.value)
                                                setNameError(false)
                                            }}
                                            className={`w-full rounded border px-3 py-2 text-sm ${nameError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                                            placeholder="Enter a new product catagory"
                                        />
                                    </td>
                                    <td>0</td>
                                    <td>
                                        <button
                                            type="button"
                                            onClick={() => void handleCreate()}
                                            disabled={saving}
                                            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                                        >
                                            Save
                                        </button>
                                    </td>
                                </tr>
                            )}

                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="py-10 text-center">
                                        <div className="inline-flex h-8 w-8 animate-spin rounded-full border-b-2 border-brand-600" />
                                    </td>
                                </tr>
                            ) : categories.length === 0 && !showInlineCreate ? (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-sm text-gray-500">No product catagories found.</td>
                                </tr>
                            ) : (
                                categories.map((category) => (
                                    <tr key={category.id}>
                                        <td>{category.id}</td>
                                        <td>{category.name}</td>
                                        <td>
                                            <span className="inline-flex rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                                                {category.productCount}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                aria-label={`Delete ${category.name}`}
                                                title={category.productCount > 0 ? 'Category has products attached' : 'Delete category'}
                                                disabled={category.productCount > 0}
                                                onClick={() => void handleDelete(category.id)}
                                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                <FiTrash2 size={14} />
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    )
}