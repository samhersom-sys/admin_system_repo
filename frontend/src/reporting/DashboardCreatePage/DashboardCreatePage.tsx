/**
 * DashboardCreatePage — REQ-RPT-FE-F-031 to F-037
 *
 * Create or edit a dashboard template. In edit mode the :id param is present.
 * Config (pages, templates, metadata flag) is stored in the 'fields' jsonb column
 * on the report_templates table, keyed by type = 'dashboard'.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiPlus, FiX, FiSave } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import { useSidebarSection } from '@/shell/SidebarContext'
import type { SidebarSection } from '@/shell/SidebarContext'
import Card from '@/shared/Card/Card'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import TemplateSelector from './TemplateSelector'
import {
    createDashboard,
    getDashboard,
    updateDashboard,
    type DashboardPage,
    type DashboardSection,
} from '../reporting.service'
import { DASHBOARD_TEMPLATES, type DashboardTemplate } from './DashboardTemplates'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const inputClass =
    'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

function blankPage(id: number): DashboardPage {
    return {
        id,
        name: `Page ${id}`,
        template: null,
        widgets: [],
        scrollEnabled: false,
        maxRows: 12,
        sections: null,
    }
}

function blankSection(id: number): DashboardSection {
    return { id, template: null }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardCreatePage() {
    const navigate = useNavigate()
    const { id } = useParams<{ id: string }>()
    const isEdit = Boolean(id)
    const { addNotification } = useNotifications()

    const [loading, setLoading] = useState(isEdit)
    const [saving, setSaving] = useState(false)

    const [dashboardName, setDashboardName] = useState('')
    const [description, setDescription] = useState('')
    const [showMetadata, setShowMetadata] = useState(true)
    const [showOnHomepage, setShowOnHomepage] = useState(false)
    const [pages, setPages] = useState<DashboardPage[]>([blankPage(1)])

    // Template selector state
    const [showTemplateSelector, setShowTemplateSelector] = useState(false)
    const [selectingTemplateForPage, setSelectingTemplateForPage] = useState<number | null>(null)
    const [selectingSectionIndex, setSelectingSectionIndex] = useState<number | null>(null)
    const [currentPreviewTemplate, setCurrentPreviewTemplate] = useState<string | null>(null)

    const sidebarSection = useMemo<SidebarSection>(() => ({
        title: 'Dashboard',
        items: [
            { label: 'Save', icon: FiSave, event: 'dashboard:save' },
            ...(isEdit && id ? [{ label: 'Configure Widgets', icon: FiPlus, to: `/dashboards/configure/${id}` }] : []),
        ],
    }), [id, isEdit])
    useSidebarSection(sidebarSection)

    // ---------------------------------------------------------------------------
    // Load existing dashboard in edit mode
    // ---------------------------------------------------------------------------

    const loadDashboard = useCallback(async () => {
        if (!id) return
        try {
            setLoading(true)
            const dash = await getDashboard(parseInt(id, 10))
            setDashboardName(dash.name)
            setDescription(dash.description ?? '')
            setShowMetadata(dash.dashboardConfig.showMetadata)
            setShowOnHomepage(dash.dashboardConfig.showOnHomepage ?? false)
            setPages(
                dash.dashboardConfig.pages.length > 0
                    ? dash.dashboardConfig.pages
                    : [blankPage(1)],
            )
        } catch {
            addNotification('Failed to load dashboard. Please try again.', 'error')
        } finally {
            setLoading(false)
        }
    }, [id, addNotification])

    useEffect(() => {
        if (isEdit) loadDashboard()
    }, [isEdit, loadDashboard])

    useEffect(() => {
        const handleSidebarSave = () => { void handleSave() }
        window.addEventListener('dashboard:save', handleSidebarSave)
        return () => window.removeEventListener('dashboard:save', handleSidebarSave)
    })

    // ---------------------------------------------------------------------------
    // Template selection
    // ---------------------------------------------------------------------------

    function openTemplateSelector(pageId: number, sectionIndex: number | null, currentTemplate: string | null) {
        setSelectingTemplateForPage(pageId)
        setSelectingSectionIndex(sectionIndex)
        setCurrentPreviewTemplate(currentTemplate)
        setShowTemplateSelector(true)
    }

    function handleTemplateSelected(template: DashboardTemplate) {
        if (selectingTemplateForPage === null) return
        setPages((prev) =>
            prev.map((page) => {
                if (page.id !== selectingTemplateForPage) return page
                if (selectingSectionIndex !== null && page.sections) {
                    // Updating a specific section template
                    return {
                        ...page,
                        sections: page.sections.map((s) =>
                            s.id === selectingSectionIndex ? { ...s, template: template.id } : s,
                        ),
                    }
                }
                // Updating the whole page template
                return { ...page, template: template.id }
            }),
        )
    }

    // ---------------------------------------------------------------------------
    // Page management
    // ---------------------------------------------------------------------------

    function handleAddPage() {
        setPages((prev) => {
            const nextId = prev.length > 0 ? Math.max(...prev.map((p) => p.id)) + 1 : 1
            return [...prev, blankPage(nextId)]
        })
    }

    function handleRemovePage(pageId: number) {
        setPages((prev) => prev.filter((p) => p.id !== pageId))
    }

    function updatePage(pageId: number, patch: Partial<DashboardPage>) {
        setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, ...patch } : p)))
    }

    function handleToggleScroll(pageId: number, enabled: boolean) {
        const defaultSections = enabled
            ? [blankSection(1), blankSection(2)]
            : null
        setPages((prev) =>
            prev.map((p) =>
                p.id === pageId
                    ? { ...p, scrollEnabled: enabled, sections: defaultSections }
                    : p,
            ),
        )
    }

    function handleSectionCountChange(pageId: number, count: number) {
        setPages((prev) =>
            prev.map((p) => {
                if (p.id !== pageId) return p
                const current = p.sections ?? []
                const next: DashboardSection[] = Array.from({ length: count }, (_, i) => ({
                    id: i + 1,
                    template: current[i]?.template ?? null,
                }))
                return { ...p, sections: next }
            }),
        )
    }

    // ---------------------------------------------------------------------------
    // Save / Cancel
    // ---------------------------------------------------------------------------

    async function handleSave() {
        if (!dashboardName.trim()) {
            addNotification('Dashboard Name is required.', 'error')
            return
        }

        const config = { pages, showMetadata, showOnHomepage }
        try {
            setSaving(true)
            if (isEdit && id) {
                await updateDashboard(parseInt(id, 10), { name: dashboardName.trim(), description, config })
                navigate(`/dashboards/configure/${id}`)
            } else {
                const created = await createDashboard({ name: dashboardName.trim(), description, config })
                navigate(`/dashboards/configure/${created.id}`)
                return
            }
        } catch {
            addNotification('Failed to save dashboard. Please try again.', 'error')
        } finally {
            setSaving(false)
        }
    }

    // ---------------------------------------------------------------------------
    // Render helpers
    // ---------------------------------------------------------------------------

    function renderTemplateName(templateId: string | null) {
        if (!templateId) return 'None'
        return DASHBOARD_TEMPLATES[templateId]?.name ?? templateId
    }

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <LoadingSpinner />
            </div>
        )
    }

    return (
        <div className="p-6 flex flex-col gap-6" aria-busy={saving}>
            {/* Page Heading */}
            <h2 className="text-2xl font-bold text-gray-900">
                {isEdit ? 'Edit Dashboard' : 'Create Dashboard'}
            </h2>

            {/* Basic Information */}
            <Card>
                <div className="p-6 flex flex-col gap-4">
                    <h2 className="text-lg font-semibold text-gray-800">Dashboard Information</h2>

                    <div>
                        <label className={labelClass} htmlFor="dashboard-name">
                            Dashboard Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="dashboard-name"
                            type="text"
                            className={inputClass}
                            value={dashboardName}
                            onChange={(e) => setDashboardName(e.target.value)}
                            placeholder="Enter dashboard name"
                        />
                    </div>

                    <div>
                        <label className={labelClass} htmlFor="dashboard-description">
                            Description
                        </label>
                        <textarea
                            id="dashboard-description"
                            className={inputClass}
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <input
                                id="show-metadata"
                                type="checkbox"
                                checked={showMetadata}
                                onChange={(e) => setShowMetadata(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-brand-600"
                            />
                            <label htmlFor="show-metadata" className="text-sm text-gray-700">
                                Show Dashboard Metadata
                            </label>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                id="show-on-homepage"
                                type="checkbox"
                                checked={showOnHomepage}
                                onChange={(e) => setShowOnHomepage(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-brand-600"
                            />
                            <label htmlFor="show-on-homepage" className="text-sm text-gray-700">
                                Show on Homepage
                            </label>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Dashboard Layout */}
            <Card>
                <div className="p-6 flex flex-col gap-4">
                    <h2 className="text-lg font-semibold text-gray-800">Dashboard Layout</h2>
                    <p className="text-sm text-gray-600">
                        Configure pages and widget layout templates for this dashboard.
                    </p>

                    {pages.map((page, pageIndex) => (
                        <div
                            key={page.id}
                            className="border border-gray-200 rounded-lg p-4 flex flex-col gap-4"
                        >
                            {/* Page header */}
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-gray-700">
                                    Page {pageIndex + 1}
                                </h3>
                                {pages.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemovePage(page.id)}
                                        className="text-gray-400 hover:text-red-500"
                                        aria-label="Remove page"
                                    >
                                        <FiX size={16} />
                                    </button>
                                )}
                            </div>

                            {/* Page name */}
                            <div>
                                <label className={labelClass} htmlFor={`page-name-${page.id}`}>
                                    Page Name
                                </label>
                                <input
                                    id={`page-name-${page.id}`}
                                    type="text"
                                    className={`${inputClass} max-w-xs`}
                                    value={page.name}
                                    onChange={(e) => updatePage(page.id, { name: e.target.value })}
                                    placeholder="Page name"
                                />
                            </div>

                            {/* Enable scroll */}
                            <div className="flex items-center gap-3">
                                <input
                                    id={`scroll-${page.id}`}
                                    type="checkbox"
                                    checked={page.scrollEnabled}
                                    onChange={(e) => handleToggleScroll(page.id, e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-brand-600"
                                />
                                <label htmlFor={`scroll-${page.id}`} className="text-sm text-gray-700">
                                    Enable Page Scroll
                                </label>
                            </div>

                            {page.scrollEnabled && page.sections ? (
                                /* Scroll mode: section templates */
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <label className={labelClass} htmlFor={`section-count-${page.id}`}>
                                            Number of Sections
                                        </label>
                                        <select
                                            id={`section-count-${page.id}`}
                                            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                                            value={page.sections.length}
                                            onChange={(e) =>
                                                handleSectionCountChange(page.id, parseInt(e.target.value, 10))
                                            }
                                        >
                                            {[1, 2, 3, 4, 5].map((n) => (
                                                <option key={n} value={n}>
                                                    {n}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {page.sections.map((section, sIdx) => (
                                        <div key={section.id} className="flex items-center gap-4">
                                            <span className="text-sm text-gray-600 w-24">
                                                Section {sIdx + 1}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openTemplateSelector(page.id, section.id, section.template)
                                                }
                                                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50"
                                            >
                                                Layout Template:{' '}
                                                <span className="font-medium">
                                                    {renderTemplateName(section.template)}
                                                </span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                /* Normal mode: single page template */
                                <div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            openTemplateSelector(page.id, null, page.template)
                                        }
                                        className="px-4 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50"
                                    >
                                        Layout Template:{' '}
                                        <span className="font-medium">
                                            {renderTemplateName(page.template)}
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Add Page */}
                    <button
                        type="button"
                        onClick={handleAddPage}
                        className="flex items-center gap-2 px-4 py-2 text-sm border border-dashed border-gray-400 rounded-md text-gray-600 hover:bg-gray-50"
                    >
                        <FiPlus size={16} />
                        Add Page
                    </button>
                </div>
            </Card>
            {/* Template Selector Modal */}
            <TemplateSelector
                isOpen={showTemplateSelector}
                onClose={() => setShowTemplateSelector(false)}
                onSelectTemplate={handleTemplateSelected}
                currentTemplate={currentPreviewTemplate}
            />
        </div>
    )
}
