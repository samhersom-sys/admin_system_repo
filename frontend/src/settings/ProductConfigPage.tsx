/**
 * Product Config page - REQ-SETTINGS-PRODUCTS-F-004 through F-007
 * Requirements: settings.requirements.md �3c
 */

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiChevronDown, FiChevronUp, FiPlus, FiSave, FiSearch, FiTrash2 } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import { useSidebarSection } from '@/shell/SidebarContext'
import Card from '@/shared/Card/Card'
import FieldGroup from '@/shared/components/FieldGroup/FieldGroup'
import TabsNav from '@/shared/components/TabsNav/TabsNav'
import type { TabItem } from '@/shared/components/TabsNav/TabsNav'
import AuditTable from '@/shared/components/AuditTable/AuditTable'
import { useAudit } from '@/shared/lib/hooks/useAudit'
import { useResizableColumns } from '@/shared/lib/hooks/useResizableColumns'
import { getClassesOfBusiness } from '@/quotes/quotes.service'
import {
    createProduct,
    getProductCategories,
    getProduct,
    type ProductCategory,
    updateProduct as saveProduct,
    type Product,
} from './settings.service'

type ActiveTab = 'details' | 'audit'

type CoverageElementRow = {
    id: number
    policy_grain: 'Coverage Element'
    class_of_business: string
    name: string
    element_type: string
    default_value: string
}

type CoverageRow = {
    id: number
    policy_grain: 'Coverage'
    class_of_business: string
    reference: string
    coverage_type: string
    currency: string
    details: CoverageElementRow[]
}

type SectionRow = {
    id: number
    policy_grain: 'Section'
    reference: string
    class_of_business: string
    currency: string
    coverages: CoverageRow[]
}

const TOP_LEVEL_TABS: TabItem[] = [
    { key: 'details', label: 'Product Details' },
    { key: 'audit', label: 'Audit' },
]

const DETAIL_TABS: TabItem[] = [
    { key: 'section-default', label: 'Section Default' },
]

function createInitialSections(): SectionRow[] {
    return [
        {
            id: 1,
            policy_grain: 'Section',
            reference: 'Section 1',
            class_of_business: 'Property',
            currency: 'GBP',
            coverages: [
                {
                    id: 11,
                    policy_grain: 'Coverage',
                    class_of_business: 'Property',
                    reference: 'Coverage 1',
                    coverage_type: 'Building',
                    currency: 'GBP',
                    details: [
                        { id: 111, policy_grain: 'Coverage Element', class_of_business: 'Property', name: 'Limit Amount', element_type: 'Currency', default_value: '1000000' },
                        { id: 112, policy_grain: 'Coverage Element', class_of_business: 'Property', name: 'Deductible', element_type: 'Currency', default_value: '10000' },
                    ],
                },
            ],
        },
        {
            id: 2,
            policy_grain: 'Section',
            reference: 'Section 2',
            class_of_business: 'Marine',
            currency: 'USD',
            coverages: [
                {
                    id: 21,
                    policy_grain: 'Coverage',
                    class_of_business: 'Marine',
                    reference: 'Coverage 2',
                    coverage_type: 'Hull',
                    currency: 'USD',
                    details: [
                        { id: 211, policy_grain: 'Coverage Element', class_of_business: 'Marine', name: 'Limit Amount', element_type: 'Currency', default_value: '500000' },
                    ],
                },
            ],
        },
    ]
}

function normalizeProductCode(value: string): string {
    return value
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .slice(0, 30)
}

export default function ProductConfigPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const location = useLocation()
    const { addNotification } = useNotifications()
    const isNewProduct = !id || id === 'new'
    const routeProductId = isNewProduct ? 'new' : id
    const draftState = (location.state ?? {}) as Partial<Product>
    const productId = !isNewProduct && id && !Number.isNaN(Number(id)) ? Number(id) : null

    const [product, setProduct] = useState<Product | null>(null)
    const [productCategories, setProductCategories] = useState<ProductCategory[]>([])
    const [classOfBusinessOptions, setClassOfBusinessOptions] = useState<string[]>([])
    const [activeTab, setActiveTab] = useState<ActiveTab>('details')
    const [detailTab, setDetailTab] = useState('section-default')
    const [sections, setSections] = useState<SectionRow[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [dirty, setDirty] = useState(false)
    const [nameError, setNameError] = useState(false)
    const [categoryError, setCategoryError] = useState(false)
    const auditLoadedRef = useRef(false)

    const { audit, loading: auditLoading, error: auditError, getAudit } = useAudit({
        entityType: 'Product',
        entityId: productId,
        apiBase: '/api/audit',
        historyPathBuilder: (entity) => `/api/audit/Product/${entity}`,
    })

    useEffect(() => {
        auditLoadedRef.current = false
    }, [productId])

    useEffect(() => {
        if (isNewProduct) {
            setProduct({
                id: 0,
                name: draftState.name ?? '',
                code: draftState.code ?? '',
                product_type: draftState.product_type ?? '',
                productCategoryId: draftState.productCategoryId ?? null,
                productCategoryName: draftState.productCategoryName ?? '',
                line_of_business: draftState.line_of_business ?? '',
                underwriting_year: draftState.underwriting_year ?? new Date().getFullYear(),
                description: draftState.description ?? '',
                is_active: draftState.is_active ?? true,
            })
            setSections([])
            setLoading(false)
            return
        }

        if (!id) return
        getProduct(id)
            .then((data) => {
                setProduct(data)
                setSections(createInitialSections())
            })
            .finally(() => setLoading(false))
    }, [
        id,
        isNewProduct,
        draftState.code,
        draftState.description,
        draftState.is_active,
        draftState.line_of_business,
        draftState.name,
        draftState.product_type,
        draftState.underwriting_year,
    ])

    useEffect(() => {
        getProductCategories()
            .then((data) => setProductCategories(Array.isArray(data) ? data : []))
            .catch(() => setProductCategories([]))

        getClassesOfBusiness()
            .then((data) => setClassOfBusinessOptions(Array.isArray(data) ? data : []))
            .catch(() => setClassOfBusinessOptions([]))
    }, [])

    const sidebarSection = useMemo(
        () => ({
            title: 'Product Configuration',
            items: [
                { label: 'Save', icon: FiSave, event: 'product:save', disabled: saving || (!dirty && !isNewProduct) },
                { label: 'Create Product Catagory', icon: FiPlus, to: '/settings/product-catagories' },
            ],
        }),
        [dirty, isNewProduct, saving]
    )

    useSidebarSection(sidebarSection)

    useEffect(() => {
        const handler = () => {
            void handleSave()
        }
        window.addEventListener('product:save', handler)
        return () => window.removeEventListener('product:save', handler)
    }, [product, dirty, isNewProduct, saving])

    async function handleTabChange(tab: ActiveTab) {
        setActiveTab(tab)
        if (tab === 'audit' && !auditLoadedRef.current) {
            auditLoadedRef.current = true
            await getAudit()
        }
    }

    function updateProduct<K extends keyof Product>(key: K, value: Product[K]) {
        if (key === 'name' && String(value ?? '').trim()) {
            setNameError(false)
        }
        setProduct((prev) => (prev ? { ...prev, [key]: value } : prev))
        setDirty(true)
    }

    function updateSection(sectionId: number, patch: Partial<SectionRow>) {
        setSections((current) => current.map((section) => (section.id === sectionId ? { ...section, ...patch } : section)))
    }

    function moveSectionRow(sectionId: number, direction: 'up' | 'down') {
        setSections((current) => {
            const index = current.findIndex((section) => section.id === sectionId)
            if (index < 0) return current
            const nextIndex = direction === 'up' ? index - 1 : index + 1
            if (nextIndex < 0 || nextIndex >= current.length) return current
            const next = [...current]
            ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
            return next
        })
    }

    function updateCoverage(sectionId: number, coverageId: number, patch: Partial<CoverageRow>) {
        setSections((current) =>
            current.map((section) => {
                if (section.id !== sectionId) return section
                return {
                    ...section,
                    coverages: section.coverages.map((coverage) => (coverage.id === coverageId ? { ...coverage, ...patch } : coverage)),
                }
            })
        )
    }

    function moveCoverageRow(sectionId: number, coverageId: number, direction: 'up' | 'down') {
        setSections((current) =>
            current.map((section) => {
                if (section.id !== sectionId) return section
                const index = section.coverages.findIndex((coverage) => coverage.id === coverageId)
                if (index < 0) return section
                const nextIndex = direction === 'up' ? index - 1 : index + 1
                if (nextIndex < 0 || nextIndex >= section.coverages.length) return section
                const next = [...section.coverages]
                ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
                return { ...section, coverages: next }
            })
        )
    }

    function updateDetail(sectionId: number, coverageId: number, detailId: number, patch: Partial<CoverageElementRow>) {
        setSections((current) =>
            current.map((section) => {
                if (section.id !== sectionId) return section
                return {
                    ...section,
                    coverages: section.coverages.map((coverage) => {
                        if (coverage.id !== coverageId) return coverage
                        return {
                            ...coverage,
                            details: coverage.details.map((detail) => (detail.id === detailId ? { ...detail, ...patch } : detail)),
                        }
                    }),
                }
            })
        )
    }

    function moveDetailRow(sectionId: number, coverageId: number, detailId: number, direction: 'up' | 'down') {
        setSections((current) =>
            current.map((section) => {
                if (section.id !== sectionId) return section
                return {
                    ...section,
                    coverages: section.coverages.map((coverage) => {
                        if (coverage.id !== coverageId) return coverage
                        const index = coverage.details.findIndex((detail) => detail.id === detailId)
                        if (index < 0) return coverage
                        const nextIndex = direction === 'up' ? index - 1 : index + 1
                        if (nextIndex < 0 || nextIndex >= coverage.details.length) return coverage
                        const next = [...coverage.details]
                        ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
                        return { ...coverage, details: next }
                    }),
                }
            })
        )
    }

    function addSectionRow() {
        setSections((current) => {
            const nextId = (current[current.length - 1]?.id ?? 0) + 1
            return [
                ...current,
                {
                    id: nextId,
                    policy_grain: 'Section',
                    reference: `Section ${nextId}`,
                    class_of_business: classOfBusinessOptions[0] ?? '',
                    currency: 'GBP',
                    coverages: [],
                },
            ]
        })
    }

    function addCoverageRow(sectionId: number) {
        setSections((current) =>
            current.map((section) => {
                if (section.id !== sectionId) return section
                const nextId = (section.coverages[section.coverages.length - 1]?.id ?? section.id * 10) + 1
                return {
                    ...section,
                    coverages: [
                        ...section.coverages,
                        {
                            id: nextId,
                            policy_grain: 'Coverage',
                            class_of_business: section.class_of_business,
                            reference: `Coverage ${section.coverages.length + 1}`,
                            coverage_type: '',
                            currency: section.currency,
                            details: [],
                        },
                    ],
                }
            })
        )
    }

    function addDetailRow(sectionId: number, coverageId: number) {
        setSections((current) =>
            current.map((section) => {
                if (section.id !== sectionId) return section
                return {
                    ...section,
                    coverages: section.coverages.map((coverage) => {
                        if (coverage.id !== coverageId) return coverage
                        const nextId = (coverage.details[coverage.details.length - 1]?.id ?? coverage.id * 10) + 1
                        return {
                            ...coverage,
                            details: [
                                ...coverage.details,
                                { id: nextId, policy_grain: 'Coverage Element', class_of_business: section.class_of_business, name: '', element_type: 'Text', default_value: '' },
                            ],
                        }
                    }),
                }
            })
        )
    }

    function removeSectionRow(sectionId: number) {
        setSections((current) => current.filter((section) => section.id !== sectionId))
    }

    function removeCoverageRow(sectionId: number, coverageId: number) {
        setSections((current) =>
            current.map((section) => {
                if (section.id !== sectionId) return section
                return {
                    ...section,
                    coverages: section.coverages.filter((coverage) => coverage.id !== coverageId),
                }
            })
        )
    }

    function deleteDetailRow(sectionId: number, coverageId: number, detailId: number) {
        setSections((current) =>
            current.map((section) => {
                if (section.id !== sectionId) return section
                return {
                    ...section,
                    coverages: section.coverages.map((coverage) => {
                        if (coverage.id !== coverageId) return coverage
                        return {
                            ...coverage,
                            details: coverage.details.filter((detail) => detail.id !== detailId),
                        }
                    }),
                }
            })
        )
    }

    const policyGrainGridColumns = ['actions', 'id', 'policyGrain', 'classOfBusiness', 'open']
    const { startResize, getWidth } = useResizableColumns({
        defaultWidths: {
            actions: 112,
            id: 88,
            policyGrain: 220,
            classOfBusiness: 260,
            open: 56,
        },
        storageKey: 'table-widths-product-policy-grain',
        minWidth: 56,
    })

    async function handleSave() {
        if (!product) return
        if (!product.name.trim()) {
            setNameError(true)
            addNotification('Product name is required.', 'error')
            return
        }
        if (product.productCategoryId == null) {
            setCategoryError(true)
            addNotification('Product category is required.', 'error')
            return
        }

        setSaving(true)
        try {
            if (isNewProduct) {
                const codeToSave = product.code.trim() || normalizeProductCode(product.name)
                if (!codeToSave) {
                    addNotification('Product code is required.', 'error')
                    return
                }

                const created = await createProduct({
                    name: product.name,
                    code: codeToSave,
                    productCategoryId: product.productCategoryId,
                    line_of_business: product.line_of_business,
                    underwriting_year: product.underwriting_year,
                    description: product.description,
                })
                addNotification('Product created successfully', 'success')
                navigate(`/settings/products/${created.id}`, { replace: true })
                return
            }

            await saveProduct(id, product)
            addNotification('Product saved successfully', 'success')
            setDirty(false)
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to save product.'
            addNotification(message, 'error')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center h-64">
                <div className="animate-spin rounded-full w-12 h-12 border-b-2 border-brand-600" />
            </div>
        )
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => navigate('/settings/products')} className="text-gray-500 hover:text-gray-700">
                    <FiArrowLeft className="text-xl" />
                </button>
                <h2 className="text-2xl font-semibold text-gray-900">{product?.name || 'Product Configuration'}</h2>
            </div>

            <TabsNav tabs={TOP_LEVEL_TABS} activeTab={activeTab} onChange={(key) => { void handleTabChange(key as ActiveTab) }} />

            {activeTab === 'details' && product && (
                <div className="flex flex-col gap-6">
                    <FieldGroup title="Product Details">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <label htmlFor="prod-name" className="text-sm font-medium text-gray-700">Name</label>
                                <input
                                    id="prod-name"
                                    type="text"
                                    value={product.name}
                                    onChange={(e) => updateProduct('name', e.target.value)}
                                    className={`border rounded px-3 py-2 text-sm ${nameError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label htmlFor="prod-code" className="text-sm font-medium text-gray-700">Code</label>
                                <input
                                    id="prod-code"
                                    type="text"
                                    value={product.code}
                                    onChange={(e) => updateProduct('code', e.target.value)}
                                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label htmlFor="prod-type" className="text-sm font-medium text-gray-700">Product Catagory</label>
                                <select
                                    id="prod-type"
                                    value={product.productCategoryId ?? ''}
                                    onChange={(e) => {
                                        setCategoryError(false)
                                        updateProduct('productCategoryId', e.target.value ? Number(e.target.value) : null)
                                    }}
                                    className={`border rounded px-3 py-2 text-sm ${categoryError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                                >
                                    <option value="">Select a product catagory</option>
                                    {productCategories.map((option) => (
                                        <option key={option.id} value={option.id}>{option.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label htmlFor="prod-cob" className="text-sm font-medium text-gray-700">Class of Business</label>
                                <select
                                    id="prod-cob"
                                    value={product.line_of_business}
                                    onChange={(e) => updateProduct('line_of_business', e.target.value)}
                                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                                >
                                    <option value="">Select...</option>
                                    {classOfBusinessOptions.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label htmlFor="prod-year" className="text-sm font-medium text-gray-700">Year of Account</label>
                                <input
                                    id="prod-year"
                                    type="number"
                                    value={product.underwriting_year}
                                    onChange={(e) => updateProduct('underwriting_year', parseInt(e.target.value, 10) || new Date().getFullYear())}
                                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                                />
                            </div>

                            <label className="flex items-center gap-2 text-sm text-gray-700 self-end mb-2">
                                <input
                                    type="checkbox"
                                    checked={product.is_active}
                                    onChange={(e) => updateProduct('is_active', e.target.checked)}
                                    className="w-4 h-4 text-brand-600"
                                />
                                Active
                            </label>
                        </div>

                        <div className="flex flex-col gap-1 mt-4">
                            <label htmlFor="prod-desc" className="text-sm font-medium text-gray-700">Description</label>
                            <textarea
                                id="prod-desc"
                                value={product.description}
                                onChange={(e) => updateProduct('description', e.target.value)}
                                rows={3}
                                className="border border-gray-300 rounded px-3 py-2 text-sm resize-none"
                            />
                        </div>
                    </FieldGroup>

                    <TabsNav tabs={DETAIL_TABS} activeTab={detailTab} onChange={setDetailTab} />

                    {detailTab === 'section-default' && (
                        <Card>
                            <div className="table-wrapper overflow-x-auto">
                                <table className="app-table w-full" style={{ tableLayout: 'fixed' }}>
                                    <colgroup>
                                        {policyGrainGridColumns.map((columnKey) => (
                                            <col key={columnKey} style={{ width: getWidth(columnKey) }} />
                                        ))}
                                    </colgroup>
                                    <thead>
                                        <tr>
                                            <th className="text-left" style={{ position: 'relative' }}>
                                                <button
                                                    type="button"
                                                    aria-label="Add policy grain section"
                                                    title="Add policy grain section"
                                                    className="text-brand-600 hover:text-brand-800"
                                                    onClick={addSectionRow}
                                                >
                                                    <FiPlus size={14} />
                                                </button>
                                                <span
                                                    className="col-resizer"
                                                    style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'col-resize', userSelect: 'none' }}
                                                    onMouseDown={(e) => startResize('actions', e)}
                                                />
                                            </th>
                                            <th style={{ position: 'relative' }}>
                                                ID
                                                <span
                                                    className="col-resizer"
                                                    style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'col-resize', userSelect: 'none' }}
                                                    onMouseDown={(e) => startResize('id', e)}
                                                />
                                            </th>
                                            <th style={{ position: 'relative' }}>
                                                Policy Grain
                                                <span
                                                    className="col-resizer"
                                                    style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'col-resize', userSelect: 'none' }}
                                                    onMouseDown={(e) => startResize('policyGrain', e)}
                                                />
                                            </th>
                                            <th style={{ position: 'relative' }}>
                                                Class of Business
                                                <span
                                                    className="col-resizer"
                                                    style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'col-resize', userSelect: 'none' }}
                                                    onMouseDown={(e) => startResize('classOfBusiness', e)}
                                                />
                                            </th>
                                            <th aria-label="Open" style={{ position: 'relative' }}>
                                                <span
                                                    className="col-resizer"
                                                    style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'col-resize', userSelect: 'none' }}
                                                    onMouseDown={(e) => startResize('open', e)}
                                                />
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sections.map((section) => (
                                            <Fragment key={`section-group-${section.id}`}>
                                                <tr key={`section-${section.id}`} className="bg-gray-50">
                                                    <td className="align-top">
                                                        <div className="flex items-start gap-3">
                                                            <button
                                                                type="button"
                                                                aria-label="Add coverage"
                                                                title="Add coverage"
                                                                className="text-brand-600 hover:text-brand-800"
                                                                onClick={() => addCoverageRow(section.id)}
                                                            >
                                                                <FiPlus size={14} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                aria-label="Remove section"
                                                                title="Remove section"
                                                                className="text-red-500 hover:text-red-700"
                                                                onClick={() => removeSectionRow(section.id)}
                                                            >
                                                                <FiTrash2 size={14} />
                                                            </button>
                                                            <div className="flex flex-col">
                                                                <button
                                                                    type="button"
                                                                    aria-label="Move section up"
                                                                    title="Move section up"
                                                                    className="text-gray-500 hover:text-gray-700 disabled:opacity-30"
                                                                    onClick={() => moveSectionRow(section.id, 'up')}
                                                                    disabled={sections[0]?.id === section.id}
                                                                >
                                                                    <FiChevronUp size={14} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    aria-label="Move section down"
                                                                    title="Move section down"
                                                                    className="text-gray-500 hover:text-gray-700 disabled:opacity-30"
                                                                    onClick={() => moveSectionRow(section.id, 'down')}
                                                                    disabled={sections[sections.length - 1]?.id === section.id}
                                                                >
                                                                    <FiChevronDown size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="align-top">{section.id}</td>
                                                    <td className="align-top">
                                                        <select
                                                            value={section.policy_grain}
                                                            onChange={(e) => updateSection(section.id, { policy_grain: e.target.value as SectionRow['policy_grain'] })}
                                                            className="block w-full border-0 bg-transparent px-0 py-1 text-sm font-medium text-gray-900 focus:outline-none focus:ring-0"
                                                        >
                                                            <option value="Section">Section</option>
                                                        </select>
                                                    </td>
                                                    <td className="align-top">
                                                        <select
                                                            value={section.class_of_business}
                                                            onChange={(e) => updateSection(section.id, { class_of_business: e.target.value })}
                                                            className="block w-full border-0 bg-transparent px-0 py-1 text-sm text-gray-900 focus:outline-none focus:ring-0"
                                                        >
                                                            {classOfBusinessOptions.map((option) => (
                                                                <option key={option} value={option}>{option}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="align-top text-center">
                                                        <Link
                                                            to={`/settings/products/${routeProductId}/policy-grain/section/${section.id}/defaults`}
                                                            state={{ policyGrainLabel: section.policy_grain, sourceId: section.id }}
                                                            aria-label="Open section row"
                                                            title="Open section row"
                                                            className="inline-flex text-green-600 hover:text-green-700"
                                                        >
                                                            <FiSearch size={14} />
                                                        </Link>
                                                    </td>
                                                </tr>

                                                {section.coverages.map((coverage) => (
                                                    <Fragment key={`coverage-group-${coverage.id}`}>
                                                        <tr key={`coverage-${coverage.id}`}>
                                                            <td className="align-top">
                                                                <div className="flex items-start gap-3">
                                                                    <button
                                                                        type="button"
                                                                        aria-label="Add coverage detail"
                                                                        title="Add coverage detail"
                                                                        className="text-brand-600 hover:text-brand-800"
                                                                        onClick={() => addDetailRow(section.id, coverage.id)}
                                                                    >
                                                                        <FiPlus size={14} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        aria-label="Remove coverage"
                                                                        title="Remove coverage"
                                                                        className="text-red-500 hover:text-red-700"
                                                                        onClick={() => removeCoverageRow(section.id, coverage.id)}
                                                                    >
                                                                        <FiTrash2 size={14} />
                                                                    </button>
                                                                    <div className="flex flex-col">
                                                                        <button
                                                                            type="button"
                                                                            aria-label="Move coverage up"
                                                                            title="Move coverage up"
                                                                            className="text-gray-500 hover:text-gray-700 disabled:opacity-30"
                                                                            onClick={() => moveCoverageRow(section.id, coverage.id, 'up')}
                                                                            disabled={section.coverages[0]?.id === coverage.id}
                                                                        >
                                                                            <FiChevronUp size={14} />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            aria-label="Move coverage down"
                                                                            title="Move coverage down"
                                                                            className="text-gray-500 hover:text-gray-700 disabled:opacity-30"
                                                                            onClick={() => moveCoverageRow(section.id, coverage.id, 'down')}
                                                                            disabled={section.coverages[section.coverages.length - 1]?.id === coverage.id}
                                                                        >
                                                                            <FiChevronDown size={14} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="align-top pl-2">{coverage.id}</td>
                                                            <td className="align-top">
                                                                <select
                                                                    value={coverage.policy_grain}
                                                                    onChange={(e) => updateCoverage(section.id, coverage.id, { policy_grain: e.target.value as CoverageRow['policy_grain'] })}
                                                                    className="block w-full border-0 bg-transparent pl-6 py-1 text-sm text-gray-900 focus:outline-none focus:ring-0"
                                                                >
                                                                    <option value="Coverage">Coverage</option>
                                                                </select>
                                                            </td>
                                                            <td className="align-top">
                                                                <select
                                                                    value={coverage.class_of_business}
                                                                    onChange={(e) => updateCoverage(section.id, coverage.id, { class_of_business: e.target.value })}
                                                                    className="block w-full border-0 bg-transparent px-0 py-1 text-sm text-gray-900 focus:outline-none focus:ring-0"
                                                                >
                                                                    {classOfBusinessOptions.map((option) => (
                                                                        <option key={option} value={option}>{option}</option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                            <td className="align-top text-center">
                                                                <Link
                                                                    to={`/settings/products/${routeProductId}/policy-grain/coverage/${coverage.id}/defaults`}
                                                                    state={{ policyGrainLabel: coverage.policy_grain, sourceId: coverage.id }}
                                                                    aria-label="Open coverage row"
                                                                    title="Open coverage row"
                                                                    className="inline-flex text-green-600 hover:text-green-700"
                                                                >
                                                                    <FiSearch size={14} />
                                                                </Link>
                                                            </td>
                                                        </tr>

                                                        {coverage.details.map((detail) => (
                                                            <tr key={`detail-${detail.id}`}>
                                                                <td className="align-top">
                                                                    <div className="flex items-start gap-3">
                                                                        <span className="inline-block h-4 w-4" aria-hidden="true" />
                                                                        <button
                                                                            type="button"
                                                                            aria-label="Remove coverage detail"
                                                                            title="Remove coverage detail"
                                                                            className="text-red-500 hover:text-red-700"
                                                                            onClick={() => deleteDetailRow(section.id, coverage.id, detail.id)}
                                                                        >
                                                                            <FiTrash2 size={14} />
                                                                        </button>
                                                                        <div className="flex flex-col">
                                                                            <button
                                                                                type="button"
                                                                                aria-label="Move coverage detail up"
                                                                                title="Move coverage detail up"
                                                                                className="text-gray-500 hover:text-gray-700 disabled:opacity-30"
                                                                                onClick={() => moveDetailRow(section.id, coverage.id, detail.id, 'up')}
                                                                                disabled={coverage.details[0]?.id === detail.id}
                                                                            >
                                                                                <FiChevronUp size={14} />
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                aria-label="Move coverage detail down"
                                                                                title="Move coverage detail down"
                                                                                className="text-gray-500 hover:text-gray-700 disabled:opacity-30"
                                                                                onClick={() => moveDetailRow(section.id, coverage.id, detail.id, 'down')}
                                                                                disabled={coverage.details[coverage.details.length - 1]?.id === detail.id}
                                                                            >
                                                                                <FiChevronDown size={14} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="align-top pl-2">{detail.id}</td>
                                                                <td className="align-top">
                                                                    <select
                                                                        value={detail.policy_grain}
                                                                        onChange={(e) => updateDetail(section.id, coverage.id, detail.id, { policy_grain: e.target.value as CoverageElementRow['policy_grain'] })}
                                                                        className="block w-full border-0 bg-transparent pl-10 py-1 text-sm text-gray-900 focus:outline-none focus:ring-0"
                                                                    >
                                                                        <option value="Coverage Element">Coverage Element</option>
                                                                    </select>
                                                                </td>
                                                                <td className="align-top">
                                                                    <select
                                                                        value={detail.class_of_business}
                                                                        onChange={(e) => updateDetail(section.id, coverage.id, detail.id, { class_of_business: e.target.value })}
                                                                        className="block w-full border-0 bg-transparent px-0 py-1 text-sm text-gray-900 focus:outline-none focus:ring-0"
                                                                    >
                                                                        {classOfBusinessOptions.map((option) => (
                                                                            <option key={option} value={option}>{option}</option>
                                                                        ))}
                                                                    </select>
                                                                </td>
                                                                <td className="align-top text-center">
                                                                    <Link
                                                                        to={`/settings/products/${routeProductId}/policy-grain/coverage-element/${detail.id}/defaults`}
                                                                        state={{ policyGrainLabel: detail.policy_grain, sourceId: detail.id }}
                                                                        aria-label="Open coverage element row"
                                                                        title="Open coverage element row"
                                                                        className="inline-flex text-green-600 hover:text-green-700"
                                                                    >
                                                                        <FiSearch size={14} />
                                                                    </Link>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </Fragment>
                                                ))}
                                            </Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {activeTab === 'audit' && (
                <Card>
                    <AuditTable
                        audit={audit}
                        loading={auditLoading}
                        error={auditError}
                        entityType="product"
                        emptyMessage={productId === null ? 'Save the product before viewing audit history.' : 'No audit history available for this product.'}
                    />
                </Card>
            )}
        </div>
    )
}
