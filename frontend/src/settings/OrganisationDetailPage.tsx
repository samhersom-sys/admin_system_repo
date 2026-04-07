/**
 * Organisation Detail page — REQ-SETTINGS-ORG-F-001 through F-010
 * Requirements: settings.requirements.md §3e
 *
 * Route /settings/organisation — load org by session orgCode
 * Route /settings/organisation/new — create new org
 */

import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FiSearch } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import { getSession } from '@/shared/lib/auth-session/auth-session'
import {
    getOrgByCode,
    createOrg,
    updateOrg,
    getOrgHierarchyConfig,
    saveOrgHierarchyConfig,
    getOrgHierarchyLinks,
    saveOrgHierarchyLinks,
    getUsers,
    getGlobalHierarchyLevels,
    type OrgEntity,
    type HierarchyLevel,
    type HierarchyLink,
    type GlobalLevel,
    type User,
} from './settings.service'

type ActiveTab = 'information' | 'hierarchy' | 'users'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderHierarchyTree(levels: HierarchyLevel[], links: HierarchyLink[]) {
    if (levels.length === 0 || links.length === 0) {
        return (
            <p className="text-sm text-gray-500 text-center py-4">
                No hierarchy structure defined. Add hierarchy links to create relationships.
            </p>
        )
    }

    const levelMap = new Map<number, HierarchyLevel & { children: (HierarchyLevel & { children: any[] })[] }>()
    levels.forEach(l => levelMap.set(l.id, { ...l, children: [] }))

    links.forEach(link => {
        const parent = levelMap.get(link.parentLevelId)
        const child = levelMap.get(link.childLevelId)
        if (parent && child && !parent.children.find(c => c.id === child.id)) {
            parent.children.push(child as any)
        }
    })

    const childIds = new Set(links.map(l => l.childLevelId))
    const roots = Array.from(levelMap.values())
        .filter(l => !childIds.has(l.id))
        .sort((a, b) => a.levelOrder - b.levelOrder)

    function renderNode(level: any, depth = 0): React.ReactNode {
        return (
            <div key={level.id}>
                <div className="flex items-center py-2 px-3 hover:bg-gray-100 rounded" style={{ marginLeft: depth * 24 }}>
                    {depth > 0 && <span className="text-gray-400 mr-2">└─</span>}
                    <span className="font-medium text-gray-900">{level.levelOrder}. {level.levelName}</span>
                    {level.description && <span className="text-sm text-gray-500 ml-2">- {level.description}</span>}
                </div>
                {level.children?.sort((a: any, b: any) => a.levelOrder - b.levelOrder).map((c: any) => renderNode(c, depth + 1))}
            </div>
        )
    }

    return <>{roots.map(r => renderNode(r))}</>
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function OrganisationDetailPage() {
    const location = useLocation()
    const navigate = useNavigate()
    const { addNotification } = useNotifications()
    const session = getSession()
    const isNew = location.pathname.endsWith('/new')

    const [loading, setLoading] = useState(!isNew)
    const [orgId, setOrgId] = useState<number | null>(null)
    const [activeTab, setActiveTab] = useState<ActiveTab>('information')

    // Form data
    const [entityName, setEntityName] = useState('')
    const [entityCode, setEntityCode] = useState('')
    const [isActive, setIsActive] = useState(true)
    const [description, setDescription] = useState('')

    // Linked parties (chips)
    const [selectedParties, setSelectedParties] = useState<OrgEntity[]>([])

    // Users
    const [users, setUsers] = useState<User[]>([])
    const [assignedUsers, setAssignedUsers] = useState<number[]>([])

    // Hierarchy levels (org-specific)
    const [orgLevels, setOrgLevels] = useState<HierarchyLevel[]>([])
    const [globalLevels, setGlobalLevels] = useState<GlobalLevel[]>([])
    const [newLevelForm, setNewLevelForm] = useState({ levelId: '', description: '' })
    const [editingLevelId, setEditingLevelId] = useState<number | null>(null)

    // Hierarchy links (org-specific)
    const [orgLinks, setOrgLinks] = useState<HierarchyLink[]>([])
    const [newLinkForm, setNewLinkForm] = useState({ parentLevelId: '', childLevelId: '', description: '' })
    const [editingLinkId, setEditingLinkId] = useState<number | null>(null)
    const [parentFilter, setParentFilter] = useState('')
    const [childFilter, setChildFilter] = useState('')

    // -------------------------------------------------------------------------
    // Load on mount
    // -------------------------------------------------------------------------

    useEffect(() => {
        const orgCode = session?.user?.orgCode
        getUsers().then(data => setUsers(Array.isArray(data) ? data : []))
        getGlobalHierarchyLevels().then(data => setGlobalLevels(Array.isArray(data) ? data : []))

        if (isNew) return

        getOrgByCode(orgCode!)
            .then(async data => {
                const list = Array.isArray(data) ? data : []
                const entity = list[0]
                if (!entity) return
                setOrgId(entity.id)
                setEntityName(entity.entityName ?? '')
                setEntityCode(entity.entityCode ?? '')
                setIsActive(entity.isActive !== false)
                setDescription(entity.description ?? '')
                setAssignedUsers(entity.users ?? [])

                const [lvls, lnks] = await Promise.all([
                    getOrgHierarchyConfig(entity.id),
                    getOrgHierarchyLinks(entity.id),
                ])
                setOrgLevels(
                    (Array.isArray(lvls) ? lvls : []).map(item => ({
                        id: item.id,
                        levelId: item.levelId,
                        levelName: item.levelName,
                        levelOrder: item.levelOrder,
                        description: item.description ?? '',
                    }))
                )
                setOrgLinks(Array.isArray(lnks) ? lnks : [])
            })
            .finally(() => setLoading(false))
    }, [])

    // -------------------------------------------------------------------------
    // Save handler (also triggered by sidebar custom event)
    // -------------------------------------------------------------------------

    async function handleSave() {
        const payload = {
            entityName,
            entityCode,
            isActive,
            description,
            users: assignedUsers,
        }

        try {
            let savedId = orgId
            if (isNew) {
                const created = await createOrg(payload)
                savedId = created.id
                setOrgId(savedId)
            } else {
                await updateOrg(orgId!, payload)
            }

            // Save hierarchy config
            await saveOrgHierarchyConfig(savedId!, orgLevels.map(l => ({ ...l, levelId: l.levelId, description: l.description })))

            // Reload config to get db IDs, then save links
            const configs = await getOrgHierarchyConfig(savedId!)
            const links = orgLinks
                .map(link => {
                    const parentLevel = orgLevels.find(l => l.id === link.parentLevelId)
                    const childLevel = orgLevels.find(l => l.id === link.childLevelId)
                    const parentCfg = (Array.isArray(configs) ? configs : []).find(
                        (c: any) => c.hierarchyLevelId === parentLevel?.levelId
                    )
                    const childCfg = (Array.isArray(configs) ? configs : []).find(
                        (c: any) => c.hierarchyLevelId === childLevel?.levelId
                    )
                    return {
                        parentConfigId: parentCfg?.id,
                        childConfigId: childCfg?.id,
                        description: link.description,
                    }
                })
                .filter(l => l.parentConfigId && l.childConfigId)

            await saveOrgHierarchyLinks(savedId!, links as HierarchyLink[])

            addNotification(`Organisation ${isNew ? 'created' : 'updated'} successfully`, 'success')
            navigate('/settings')
        } catch {
            addNotification('Failed to save organisation', 'error')
        }
    }

    // Listen for sidebar save event
    useEffect(() => {
        const listener = () => handleSave()
        window.addEventListener('organisation:save', listener)
        return () => window.removeEventListener('organisation:save', listener)
    })

    // -------------------------------------------------------------------------
    // Hierarchy level management
    // -------------------------------------------------------------------------

    function handleAddLevel() {
        if (!newLevelForm.levelId) return
        const global = globalLevels.find(l => l.id === parseInt(newLevelForm.levelId))
        if (!global) return
        if (orgLevels.find(l => l.levelId === parseInt(newLevelForm.levelId))) {
            addNotification('This level is already added', 'error')
            return
        }
        setOrgLevels(prev => [
            ...prev,
            { id: Date.now(), levelId: global.id, levelName: global.levelName, levelOrder: global.levelOrder, description: newLevelForm.description },
        ])
        setNewLevelForm({ levelId: '', description: '' })
    }

    function handleEditLevel(item: HierarchyLevel) {
        setEditingLevelId(item.id)
        setNewLevelForm({ levelId: String(item.levelId), description: item.description })
    }

    function handleUpdateLevel() {
        const global = globalLevels.find(l => l.id === parseInt(newLevelForm.levelId))
        setOrgLevels(prev =>
            prev.map(l =>
                l.id === editingLevelId
                    ? { ...l, levelId: parseInt(newLevelForm.levelId), levelName: global?.levelName ?? l.levelName, levelOrder: global?.levelOrder ?? l.levelOrder, description: newLevelForm.description }
                    : l
            )
        )
        setEditingLevelId(null)
        setNewLevelForm({ levelId: '', description: '' })
    }

    function handleDeleteLevel(id: number) {
        setOrgLevels(prev => prev.filter(l => l.id !== id))
        setOrgLinks(prev => prev.filter(l => l.parentLevelId !== id && l.childLevelId !== id))
    }

    // -------------------------------------------------------------------------
    // Hierarchy link management
    // -------------------------------------------------------------------------

    function handleAddLink() {
        if (!newLinkForm.parentLevelId || !newLinkForm.childLevelId) return
        if (newLinkForm.parentLevelId === newLinkForm.childLevelId) {
            addNotification('A level cannot link to itself', 'error')
            return
        }
        const pId = parseInt(newLinkForm.parentLevelId)
        const cId = parseInt(newLinkForm.childLevelId)
        if (orgLinks.find(l => l.parentLevelId === pId && l.childLevelId === cId)) {
            addNotification('This link already exists', 'error')
            return
        }
        const parent = orgLevels.find(l => l.id === pId)
        const child = orgLevels.find(l => l.id === cId)
        if (!parent || !child) return
        setOrgLinks(prev => [
            ...prev,
            { id: Date.now(), parentLevelId: pId, childLevelId: cId, parentLevelName: parent.levelName, childLevelName: child.levelName, description: newLinkForm.description },
        ])
        setNewLinkForm({ parentLevelId: '', childLevelId: '', description: '' })
    }

    function handleDeleteLink(id: number) {
        setOrgLinks(prev => prev.filter(l => l.id !== id))
    }

    const filteredLinks = useMemo(
        () => orgLinks.filter(l => (!parentFilter || l.parentLevelId === parseInt(parentFilter)) && (!childFilter || l.childLevelId === parseInt(childFilter))),
        [orgLinks, parentFilter, childFilter]
    )

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------

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
            <div>
                <h2 className="text-2xl font-bold text-gray-900">
                    {isNew ? 'New Organisation' : entityName || 'Edit Organisation'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                    Configure organisation details, hierarchy, and user assignments
                </p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex gap-0">
                    {([
                        { key: 'information', label: 'Organisation Information' },
                        { key: 'hierarchy', label: 'Organisation Hierarchy' },
                        { key: 'users', label: 'Assigned Users' },
                    ] as const).map(tab => (
                        <button
                            key={tab.key}
                            role="tab"
                            aria-selected={activeTab === tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`py-2 px-4 border-b-2 font-medium text-sm mr-2 ${activeTab === tab.key
                                ? 'border-brand-500 text-brand-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Organisation Information tab */}
            {activeTab === 'information' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col gap-4">
                    {/* Org Name + search */}
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">Organisation Name</label>
                        <div className="flex items-center gap-2 max-w-md">
                            <input
                                type="text"
                                value={entityName}
                                onChange={e => setEntityName(e.target.value)}
                                placeholder="Search or enter name"
                                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                            />
                            <button
                                type="button"
                                aria-label="Search organisation"
                                className="p-2 rounded border border-gray-300 text-gray-500 hover:text-brand-600 hover:border-brand-500"
                            >
                                <FiSearch />
                            </button>
                        </div>
                    </div>

                    {/* Org Code + search */}
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">Organisation Code</label>
                        <div className="flex items-center gap-2 max-w-md">
                            <input
                                type="text"
                                value={entityCode}
                                onChange={e => setEntityCode(e.target.value)}
                                placeholder="Enter code"
                                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                            />
                            <button
                                type="button"
                                aria-label="Search by code"
                                className="p-2 rounded border border-gray-300 text-gray-500 hover:text-brand-600 hover:border-brand-500"
                            >
                                <FiSearch />
                            </button>
                        </div>
                    </div>

                    {/* Active */}
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            checked={isActive}
                            onChange={e => setIsActive(e.target.checked)}
                            className="w-4 h-4 text-brand-600"
                        />
                        Active
                    </label>

                    {/* Description */}
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            className="border border-gray-300 rounded px-3 py-2 text-sm resize-none max-w-md"
                        />
                    </div>

                    {/* Linked Parties */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">Linked Parties</label>
                        <div className="flex flex-wrap gap-2">
                            {selectedParties.map(p => (
                                <span
                                    key={p.id}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-brand-100 text-brand-700 text-xs rounded-full"
                                >
                                    {p.entityName}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedParties(prev => prev.filter(x => x.id !== p.id))}
                                        className="text-brand-500 hover:text-brand-700 ml-1"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                            <button
                                type="button"
                                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 border border-brand-300 rounded-full px-2 py-1"
                            >
                                <span>+ Add Party</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end mt-2">
                        <button
                            type="button"
                            onClick={handleSave}
                            className="px-6 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
                        >
                            Save
                        </button>
                    </div>
                </div>
            )}

            {/* Organisation Hierarchy tab */}
            {activeTab === 'hierarchy' && (
                <div className="flex flex-col gap-6">
                    {/* Hierarchy Levels card */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h3 className="font-semibold text-gray-800">Hierarchy Levels</h3>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            {/* Add level form */}
                            <div className="flex items-end gap-3 flex-wrap">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-gray-600">Level</label>
                                    <select
                                        value={newLevelForm.levelId}
                                        onChange={e => setNewLevelForm(prev => ({ ...prev, levelId: e.target.value }))}
                                        className="border border-gray-300 rounded px-3 py-2 text-sm min-w-[160px]"
                                    >
                                        <option value="">Select level…</option>
                                        {globalLevels.map(l => (
                                            <option key={l.id} value={String(l.id)}>{l.levelOrder}. {l.levelName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-gray-600">Description</label>
                                    <input
                                        type="text"
                                        value={newLevelForm.description}
                                        onChange={e => setNewLevelForm(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Optional description"
                                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={editingLevelId ? handleUpdateLevel : handleAddLevel}
                                    className="px-4 py-2 bg-brand-600 text-white rounded text-sm"
                                >
                                    {editingLevelId ? 'Update Hierarchy Level' : 'Add Hierarchy Level'}
                                </button>
                                {editingLevelId && (
                                    <button
                                        type="button"
                                        onClick={() => { setEditingLevelId(null); setNewLevelForm({ levelId: '', description: '' }) }}
                                        className="px-4 py-2 border border-gray-300 text-gray-600 rounded text-sm"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>

                            {/* Levels table */}
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium text-gray-700">Level Name</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-700">Order</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-700">Description</th>
                                        <th className="px-4 py-2" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {orgLevels.length === 0 ? (
                                        <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-xs">No hierarchy levels added yet.</td></tr>
                                    ) : (
                                        orgLevels.map(l => (
                                            <tr key={l.id} className="border-b border-gray-100">
                                                <td className="px-4 py-2 text-gray-900">{l.levelName}</td>
                                                <td className="px-4 py-2 text-gray-600">{l.levelOrder}</td>
                                                <td className="px-4 py-2 text-gray-600">{l.description}</td>
                                                <td className="px-4 py-2 flex gap-2">
                                                    <button type="button" onClick={() => handleEditLevel(l)} className="text-brand-500 text-xs hover:underline">Edit</button>
                                                    <button type="button" onClick={() => handleDeleteLevel(l.id)} className="text-red-500 text-xs hover:underline">Delete</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Hierarchy Links card */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h3 className="font-semibold text-gray-800">Hierarchy Links</h3>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            {/* Filters */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-gray-600">Parent Level Filter</label>
                                    <select
                                        value={parentFilter}
                                        onChange={e => setParentFilter(e.target.value)}
                                        className="border border-gray-300 rounded px-3 py-2 text-sm min-w-[140px]"
                                    >
                                        <option value="">All</option>
                                        {orgLevels.map(l => <option key={l.id} value={String(l.id)}>{l.levelOrder}. {l.levelName}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-gray-600">Child Level Filter</label>
                                    <select
                                        value={childFilter}
                                        onChange={e => setChildFilter(e.target.value)}
                                        className="border border-gray-300 rounded px-3 py-2 text-sm min-w-[140px]"
                                    >
                                        <option value="">All</option>
                                        {orgLevels.map(l => <option key={l.id} value={String(l.id)}>{l.levelOrder}. {l.levelName}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Add link form */}
                            <div className="flex items-end gap-3 flex-wrap">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-gray-600">Parent Level</label>
                                    <select
                                        value={newLinkForm.parentLevelId}
                                        onChange={e => setNewLinkForm(prev => ({ ...prev, parentLevelId: e.target.value }))}
                                        className="border border-gray-300 rounded px-3 py-2 text-sm min-w-[140px]"
                                    >
                                        <option value="">Select…</option>
                                        {orgLevels.map(l => <option key={l.id} value={String(l.id)}>{l.levelOrder}. {l.levelName}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-gray-600">Child Level</label>
                                    <select
                                        value={newLinkForm.childLevelId}
                                        onChange={e => setNewLinkForm(prev => ({ ...prev, childLevelId: e.target.value }))}
                                        className="border border-gray-300 rounded px-3 py-2 text-sm min-w-[140px]"
                                    >
                                        <option value="">Select…</option>
                                        {orgLevels.map(l => <option key={l.id} value={String(l.id)}>{l.levelOrder}. {l.levelName}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-gray-600">Description</label>
                                    <input
                                        type="text"
                                        value={newLinkForm.description}
                                        onChange={e => setNewLinkForm(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Optional"
                                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={editingLinkId ? () => {
                                        setOrgLinks(prev => prev.map(l => l.id === editingLinkId ? { ...l, parentLevelId: parseInt(newLinkForm.parentLevelId), childLevelId: parseInt(newLinkForm.childLevelId), description: newLinkForm.description } : l))
                                        setEditingLinkId(null)
                                        setNewLinkForm({ parentLevelId: '', childLevelId: '', description: '' })
                                    } : handleAddLink}
                                    className="px-4 py-2 bg-brand-600 text-white rounded text-sm"
                                >
                                    {editingLinkId ? 'Update Link' : 'Add Link'}
                                </button>
                            </div>

                            {/* Links table */}
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium text-gray-700">Parent Level</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-700">Child Level</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-700">Description</th>
                                        <th className="px-4 py-2" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLinks.length === 0 ? (
                                        <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-xs">No hierarchy links defined.</td></tr>
                                    ) : (
                                        filteredLinks.map(l => (
                                            <tr key={l.id} className="border-b border-gray-100">
                                                <td className="px-4 py-2 text-gray-700">→ {l.parentLevelName}</td>
                                                <td className="px-4 py-2 text-gray-700">← {l.childLevelName}</td>
                                                <td className="px-4 py-2 text-gray-600">{l.description}</td>
                                                <td className="px-4 py-2 flex gap-2">
                                                    <button type="button" onClick={() => { setEditingLinkId(l.id); setNewLinkForm({ parentLevelId: String(l.parentLevelId), childLevelId: String(l.childLevelId), description: l.description }) }} className="text-brand-500 text-xs hover:underline">Edit</button>
                                                    <button type="button" onClick={() => handleDeleteLink(l.id)} className="text-red-500 text-xs hover:underline">Delete</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Hierarchy Tree visualization */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="font-semibold text-gray-800">Hierarchy Tree</h3>
                        </div>
                        <div className="p-6">
                            {renderHierarchyTree(orgLevels, orgLinks)}
                        </div>
                    </div>
                </div>
            )}

            {/* Assigned Users tab */}
            {activeTab === 'users' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="font-semibold text-gray-800">Assign Users</h3>
                    </div>
                    <div className="p-6 flex flex-col gap-3">
                        {users.length === 0 ? (
                            <p className="text-sm text-gray-500">No users available.</p>
                        ) : (
                            users.map(u => (
                                <label key={u.id} className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={assignedUsers.includes(u.id)}
                                        onChange={() => setAssignedUsers(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                                        className="w-4 h-4 text-brand-600"
                                    />
                                    <span className="font-medium">{u.username}</span>
                                    <span className="text-gray-500">{u.email}</span>
                                </label>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
