/**
 * Earnings Configuration page — REQ-SETTINGS-EARN-R01 through R11
 * Requirements: EarningsConfigPage.requirements.md
 *
 * Two tabs:
 *   Patterns — CRUD for earning pattern definitions (upfront / straight-line / interpolated)
 *   Rules    — CRUD for matching rules that link a pattern to policy selection criteria
 */

import { useEffect, useState, useMemo } from 'react'
import {
    FiPlus,
    FiTrash2,
    FiEdit2,
    FiChevronDown,
    FiChevronUp,
    FiInfo,
    FiXCircle,
} from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import Card from '@/shared/Card/Card'
import {
    getEarningPatterns,
    createEarningPattern,
    deactivateEarningPattern,
    getPatternPoints,
    createPatternPoint,
    deletePatternPoint,
    getEarningRules,
    createEarningRule,
    updateEarningRule,
    deactivateEarningRule,
    type EarningPattern,
    type EarningPatternPoint,
    type EarningPatternRule,
    type CreatePatternPayload,
    type CreateRulePayload,
    type PatternType,
    type EarnBy,
} from './settings.service'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PATTERN_TYPE_LABELS: Record<PatternType, string> = {
    upfront: 'Upfront',
    straight_line: 'Straight Line',
    interpolated: 'Interpolated',
}

const EARN_BY_LABELS: Record<EarnBy, string> = {
    day: 'By Day',
    period: 'By Period',
}

type Tab = 'patterns' | 'rules'

// ---------------------------------------------------------------------------
// Interpolated point editor sub-component
// ---------------------------------------------------------------------------

interface PointEditorProps {
    pattern: EarningPattern
    onClose: () => void
}

function PointEditor({ pattern, onClose }: PointEditorProps) {
    const { addNotification } = useNotifications()
    const [points, setPoints] = useState<EarningPatternPoint[]>([])
    const [loading, setLoading] = useState(true)
    const [pctThrough, setPctThrough] = useState('')
    const [pctIncrement, setPctIncrement] = useState('')
    const [adding, setAdding] = useState(false)

    const runningTotal = useMemo(
        () => points.reduce((sum, p) => sum + parseFloat(p.pctEarnedIncrement), 0),
        [points],
    )
    const isComplete = Math.abs(runningTotal - 100) < 0.0001

    useEffect(() => {
        getPatternPoints(pattern.id)
            .then(setPoints)
            .catch((err: Error) => addNotification(err.message ?? 'Failed to load points.', 'error'))
            .finally(() => setLoading(false))
    }, [pattern.id]) // eslint-disable-line react-hooks/exhaustive-deps

    async function handleAddPoint(e: React.FormEvent) {
        e.preventDefault()
        const through = parseFloat(pctThrough)
        const increment = parseFloat(pctIncrement)
        if (isNaN(through) || isNaN(increment)) {
            addNotification('Both fields are required and must be numbers.', 'error')
            return
        }
        setAdding(true)
        try {
            const added = await createPatternPoint(pattern.id, {
                pctThroughPolicy: through,
                pctEarnedIncrement: increment,
            })
            setPoints(prev =>
                [...prev, added].sort(
                    (a, b) => parseFloat(a.pctThroughPolicy) - parseFloat(b.pctThroughPolicy),
                ),
            )
            setPctThrough('')
            setPctIncrement('')
        } catch (err: unknown) {
            addNotification(err instanceof Error ? err.message : 'Failed to add point.', 'error')
        } finally {
            setAdding(false)
        }
    }

    async function handleDeletePoint(pointId: number) {
        try {
            await deletePatternPoint(pattern.id, pointId)
            setPoints(prev => prev.filter(p => p.id !== pointId))
        } catch (err: unknown) {
            addNotification(err instanceof Error ? err.message : 'Failed to remove point.', 'error')
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl mx-4">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900">Interpolation Points</h2>
                        <p className="text-xs text-gray-500 mt-0.5">{pattern.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <FiXCircle size={20} />
                    </button>
                </div>

                <div className="flex flex-col gap-4 px-6 py-4">
                    {/* Running total banner */}
                    <div
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isComplete
                                ? 'bg-green-50 text-green-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                    >
                        <FiInfo size={14} />
                        <span>
                            Running total: <strong>{runningTotal.toFixed(4)}%</strong>
                            {isComplete ? ' ✓ Complete' : ' — must reach exactly 100%'}
                        </span>
                    </div>

                    {/* Points table */}
                    {loading ? (
                        <p className="text-sm text-gray-500">Loading points…</p>
                    ) : points.length === 0 ? (
                        <p className="text-sm text-gray-500">No points defined yet.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                                    <th className="pb-2 font-medium">% Through Policy</th>
                                    <th className="pb-2 font-medium">Increment %</th>
                                    <th className="pb-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {points.map(p => (
                                    <tr key={p.id} className="border-b border-gray-50">
                                        <td className="py-1.5 text-gray-700">
                                            {parseFloat(p.pctThroughPolicy).toFixed(2)}%
                                        </td>
                                        <td className="py-1.5 text-gray-700">
                                            {parseFloat(p.pctEarnedIncrement).toFixed(4)}%
                                        </td>
                                        <td className="py-1.5 text-right">
                                            <button
                                                onClick={() => handleDeletePoint(p.id)}
                                                className="text-red-400 hover:text-red-600"
                                                aria-label="Remove point"
                                            >
                                                <FiTrash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* Add point form */}
                    <form onSubmit={handleAddPoint} className="flex gap-2 items-end">
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">
                                % Through Policy
                            </label>
                            <input
                                type="number"
                                min="0.0001"
                                max="100"
                                step="any"
                                value={pctThrough}
                                onChange={e => setPctThrough(e.target.value)}
                                placeholder="e.g. 33.33"
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                                required
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">
                                Increment %
                            </label>
                            <input
                                type="number"
                                min="0.0001"
                                step="any"
                                value={pctIncrement}
                                onChange={e => setPctIncrement(e.target.value)}
                                placeholder="e.g. 20.00"
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={adding}
                            className="px-3 py-1.5 bg-brand-600 text-white text-sm rounded hover:bg-brand-700 disabled:opacity-50"
                        >
                            Add
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Rule form sub-component
// ---------------------------------------------------------------------------

interface RuleFormProps {
    patterns: EarningPattern[]
    initial?: EarningPatternRule
    onSave: (payload: CreateRulePayload) => Promise<void>
    onCancel: () => void
}

function RuleForm({ patterns, initial, onSave, onCancel }: RuleFormProps) {
    const [patternId, setPatternId] = useState<number>(
        initial?.patternId ?? (patterns[0]?.id ?? 0),
    )
    const [priority, setPriority] = useState<string>(String(initial?.priority ?? ''))
    const [classOfBusiness, setClassOfBusiness] = useState(initial?.classOfBusiness ?? '')
    const [contractType, setContractType] = useState(initial?.contractType ?? '')
    const [includeIncepted, setIncludeIncepted] = useState(initial?.includeIncepted ?? true)
    const [saving, setSaving] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!patternId) return
        setSaving(true)
        try {
            await onSave({
                patternId,
                priority: priority !== '' ? parseInt(priority, 10) : undefined,
                classOfBusiness: classOfBusiness.trim() || null,
                contractType: contractType.trim() || null,
                includeIncepted,
            })
        } finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* Pattern */}
            <div>
                <label htmlFor="rule-pattern-select" className="block text-xs text-gray-500 mb-1">Pattern *</label>
                <select
                    id="rule-pattern-select"
                    value={patternId}
                    onChange={e => setPatternId(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    required
                >
                    <option value="">— select —</option>
                    {patterns.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.name} ({PATTERN_TYPE_LABELS[p.patternType]})
                        </option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {/* Priority */}
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Priority (0 = highest)</label>
                    <input
                        type="number"
                        min="0"
                        value={priority}
                        onChange={e => setPriority(e.target.value)}
                        placeholder="auto"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                </div>

                {/* Include incepted */}
                <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={includeIncepted}
                            onChange={e => setIncludeIncepted(e.target.checked)}
                            className="rounded border-gray-300 text-brand-600"
                        />
                        Include incepted policies
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {/* Class of business */}
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Class of Business</label>
                    <input
                        type="text"
                        value={classOfBusiness}
                        onChange={e => setClassOfBusiness(e.target.value)}
                        placeholder="Any"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                </div>

                {/* Contract type */}
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Contract Type</label>
                    <input
                        type="text"
                        value={contractType}
                        onChange={e => setContractType(e.target.value)}
                        placeholder="Any"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={saving || !patternId}
                    className="px-4 py-1.5 bg-brand-600 text-white text-sm rounded hover:bg-brand-700 disabled:opacity-50"
                >
                    {saving ? 'Saving…' : 'Save Rule'}
                </button>
            </div>
        </form>
    )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function EarningsConfigPage() {
    const { addNotification } = useNotifications()

    const [activeTab, setActiveTab] = useState<Tab>('patterns')

    // Patterns state
    const [patterns, setPatterns] = useState<EarningPattern[]>([])
    const [patternsLoading, setPatternsLoading] = useState(true)
    const [patternsError, setPatternsError] = useState<string | null>(null)
    const [showCreatePattern, setShowCreatePattern] = useState(false)
    const [newPatternName, setNewPatternName] = useState('')
    const [newPatternType, setNewPatternType] = useState<PatternType>('straight_line')
    const [newPatternEarnBy, setNewPatternEarnBy] = useState<EarnBy>('day')
    const [newPatternDesc, setNewPatternDesc] = useState('')
    const [creatingPattern, setCreatingPattern] = useState(false)
    const [pointEditorPattern, setPointEditorPattern] = useState<EarningPattern | null>(null)

    // Rules state
    const [rules, setRules] = useState<EarningPatternRule[]>([])
    const [rulesLoading, setRulesLoading] = useState(true)
    const [rulesError, setRulesError] = useState<string | null>(null)
    const [showRuleForm, setShowRuleForm] = useState(false)
    const [editingRule, setEditingRule] = useState<EarningPatternRule | null>(null)

    // Sort state for patterns table
    const [patternSortKey, setPatternSortKey] = useState<keyof EarningPattern | null>(null)
    const [patternSortDir, setPatternSortDir] = useState<'asc' | 'desc'>('asc')

    // ---------------------------------------------------------------------------
    // Load data
    // ---------------------------------------------------------------------------

    useEffect(() => {
        getEarningPatterns()
            .then(setPatterns)
            .catch((err: Error) => setPatternsError(err.message ?? 'Failed to load patterns.'))
            .finally(() => setPatternsLoading(false))
    }, [])

    useEffect(() => {
        if (activeTab !== 'rules') return
        getEarningRules()
            .then(setRules)
            .catch((err: Error) => setRulesError(err.message ?? 'Failed to load rules.'))
            .finally(() => setRulesLoading(false))
    }, [activeTab])

    // ---------------------------------------------------------------------------
    // Pattern sort
    // ---------------------------------------------------------------------------

    const sortedPatterns = useMemo(() => {
        if (!patternSortKey) return patterns
        return [...patterns].sort((a, b) => {
            const av = a[patternSortKey]
            const bv = b[patternSortKey]
            const cmp = av == null ? -1 : bv == null ? 1 : av < bv ? -1 : av > bv ? 1 : 0
            return patternSortDir === 'asc' ? cmp : -cmp
        })
    }, [patterns, patternSortKey, patternSortDir])

    function handlePatternSort(key: keyof EarningPattern) {
        if (patternSortKey === key) {
            setPatternSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
        } else {
            setPatternSortKey(key)
            setPatternSortDir('asc')
        }
    }

    function PatternSortIcon({ col }: { col: keyof EarningPattern }) {
        if (patternSortKey !== col) return <FiChevronDown size={10} className="text-gray-300 ml-1" />
        return patternSortDir === 'asc'
            ? <FiChevronUp size={10} className="text-brand-600 ml-1" />
            : <FiChevronDown size={10} className="text-brand-600 ml-1" />
    }

    // ---------------------------------------------------------------------------
    // Pattern handlers
    // ---------------------------------------------------------------------------

    function resetPatternForm() {
        setNewPatternName('')
        setNewPatternType('straight_line')
        setNewPatternEarnBy('day')
        setNewPatternDesc('')
        setShowCreatePattern(false)
    }

    async function handleCreatePattern(e: React.FormEvent) {
        e.preventDefault()
        if (!newPatternName.trim()) {
            addNotification('Pattern name is required.', 'error')
            return
        }
        setCreatingPattern(true)
        try {
            const payload: CreatePatternPayload = {
                name: newPatternName.trim(),
                patternType: newPatternType,
                earnBy: newPatternEarnBy,
                description: newPatternDesc.trim() || undefined,
            }
            const created = await createEarningPattern(payload)
            setPatterns(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
            resetPatternForm()
            addNotification(`Pattern "${created.name}" created.`, 'success')
        } catch (err: unknown) {
            addNotification(err instanceof Error ? err.message : 'Failed to create pattern.', 'error')
        } finally {
            setCreatingPattern(false)
        }
    }

    async function handleDeactivatePattern(pattern: EarningPattern) {
        try {
            await deactivateEarningPattern(pattern.id)
            setPatterns(prev => prev.filter(p => p.id !== pattern.id))
            addNotification(`Pattern "${pattern.name}" deactivated.`, 'success')
        } catch (err: unknown) {
            addNotification(err instanceof Error ? err.message : 'Failed to deactivate pattern.', 'error')
        }
    }

    // ---------------------------------------------------------------------------
    // Rule handlers
    // ---------------------------------------------------------------------------

    async function handleSaveRule(payload: CreateRulePayload) {
        try {
            if (editingRule) {
                const updated = await updateEarningRule(editingRule.id, payload)
                setRules(prev =>
                    prev.map(r => (r.id === updated.id ? updated : r)).sort(
                        (a, b) => a.priority - b.priority,
                    ),
                )
                addNotification('Rule updated.', 'success')
            } else {
                const created = await createEarningRule(payload)
                setRules(prev =>
                    [...prev, created].sort((a, b) => a.priority - b.priority),
                )
                addNotification('Rule created.', 'success')
            }
            setShowRuleForm(false)
            setEditingRule(null)
        } catch (err: unknown) {
            addNotification(err instanceof Error ? err.message : 'Failed to save rule.', 'error')
            throw err
        }
    }

    async function handleDeactivateRule(rule: EarningPatternRule) {
        try {
            await deactivateEarningRule(rule.id)
            setRules(prev => prev.filter(r => r.id !== rule.id))
            addNotification('Rule deactivated.', 'success')
        } catch (err: unknown) {
            addNotification(err instanceof Error ? err.message : 'Failed to deactivate rule.', 'error')
        }
    }

    function patternNameForId(id: number) {
        return patterns.find(p => p.id === id)?.name ?? `#${id}`
    }

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    return (
        <div className="p-6 flex flex-col gap-6">
            {/* Point editor modal */}
            {pointEditorPattern && (
                <PointEditor
                    pattern={pointEditorPattern}
                    onClose={() => setPointEditorPattern(null)}
                />
            )}

            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Earnings Configuration</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Define how written premium is earned over the policy period.
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex gap-6">
                    {(['patterns', 'rules'] as Tab[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab
                                    ? 'border-brand-500 text-brand-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {/* ------------------------------------------------------------------ */}
            {/* PATTERNS TAB                                                        */}
            {/* ------------------------------------------------------------------ */}
            {activeTab === 'patterns' && (
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-gray-600">
                            Earning patterns define the mathematical rule applied to premium over the
                            policy period. Policies with longer periods (multi-year) are supported.
                        </p>
                        <button
                            onClick={() => setShowCreatePattern(v => !v)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-sm rounded hover:bg-brand-700"
                        >
                            <FiPlus size={14} />
                            New Pattern
                        </button>
                    </div>

                    {/* Create pattern inline form */}
                    {showCreatePattern && (
                        <form
                            onSubmit={handleCreatePattern}
                            className="mb-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-slate-50 p-4"
                        >
                            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                New Pattern
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Name *</label>
                                    <input
                                        type="text"
                                        value={newPatternName}
                                        onChange={e => setNewPatternName(e.target.value)}
                                        placeholder="e.g. Standard Straight Line"
                                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Type *</label>
                                    <select
                                        value={newPatternType}
                                        onChange={e => setNewPatternType(e.target.value as PatternType)}
                                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                                    >
                                        <option value="upfront">Upfront — 100% earned at inception</option>
                                        <option value="straight_line">Straight Line — equal daily/period split</option>
                                        <option value="interpolated">Interpolated — user-defined earning curve</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Earn By *</label>
                                    <select
                                        value={newPatternEarnBy}
                                        onChange={e => setNewPatternEarnBy(e.target.value as EarnBy)}
                                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                                    >
                                        <option value="day">By Day (exact calendar-day precision)</option>
                                        <option value="period">By Period (accounting period)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Description</label>
                                    <input
                                        type="text"
                                        value={newPatternDesc}
                                        onChange={e => setNewPatternDesc(e.target.value)}
                                        placeholder="Optional"
                                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={resetPatternForm}
                                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingPattern}
                                    className="px-4 py-1.5 bg-brand-600 text-white text-sm rounded hover:bg-brand-700 disabled:opacity-50"
                                >
                                    {creatingPattern ? 'Creating…' : 'Create Pattern'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Patterns table */}
                    {patternsLoading ? (
                        <p className="text-sm text-gray-500 py-6 text-center">Loading patterns…</p>
                    ) : patternsError ? (
                        <p className="text-sm text-red-600 py-6 text-center">{patternsError}</p>
                    ) : sortedPatterns.length === 0 ? (
                        <p className="text-sm text-gray-500 py-6 text-center">
                            No earning patterns configured. Click "New Pattern" to get started.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                                        {(
                                            [
                                                { key: 'name', label: 'Name' },
                                                { key: 'patternType', label: 'Type' },
                                                { key: 'earnBy', label: 'Earn By' },
                                                { key: 'description', label: 'Description' },
                                            ] as { key: keyof EarningPattern; label: string }[]
                                        ).map(col => (
                                            <th
                                                key={col.key}
                                                className="pb-2 pr-4 font-medium cursor-pointer select-none"
                                                onClick={() => handlePatternSort(col.key)}
                                            >
                                                <span className="flex items-center">
                                                    {col.label}
                                                    <PatternSortIcon col={col.key} />
                                                </span>
                                            </th>
                                        ))}
                                        <th className="pb-2 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedPatterns.map(p => (
                                        <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="py-2 pr-4 text-gray-900 font-medium">{p.name}</td>
                                            <td className="py-2 pr-4 text-gray-700">
                                                {PATTERN_TYPE_LABELS[p.patternType]}
                                            </td>
                                            <td className="py-2 pr-4 text-gray-700">
                                                {EARN_BY_LABELS[p.earnBy]}
                                            </td>
                                            <td className="py-2 pr-4 text-gray-500">
                                                {p.description ?? '—'}
                                            </td>
                                            <td className="py-2 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    {p.patternType === 'interpolated' && (
                                                        <button
                                                            onClick={() => setPointEditorPattern(p)}
                                                            className="text-xs text-brand-600 hover:text-brand-800 flex items-center gap-1"
                                                        >
                                                            <FiEdit2 size={12} />
                                                            Points
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeactivatePattern(p)}
                                                        className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"
                                                        aria-label={`Deactivate ${p.name}`}
                                                    >
                                                        <FiTrash2 size={12} />
                                                        Deactivate
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}

            {/* ------------------------------------------------------------------ */}
            {/* RULES TAB                                                           */}
            {/* ------------------------------------------------------------------ */}
            {activeTab === 'rules' && (
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-gray-600">
                            Rules determine which earning pattern applies to a policy. Rules are
                            evaluated in priority order (lower = first match wins).
                        </p>
                        <button
                            onClick={() => {
                                setEditingRule(null)
                                setShowRuleForm(v => !v)
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-sm rounded hover:bg-brand-700"
                        >
                            <FiPlus size={14} />
                            New Rule
                        </button>
                    </div>

                    {/* Rule form */}
                    {(showRuleForm || editingRule) && (
                        <div className="mb-4 rounded-lg border border-gray-200 bg-slate-50 p-4">
                            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
                                {editingRule ? 'Edit Rule' : 'New Rule'}
                            </p>
                            <RuleForm
                                patterns={patterns}
                                initial={editingRule ?? undefined}
                                onSave={handleSaveRule}
                                onCancel={() => {
                                    setShowRuleForm(false)
                                    setEditingRule(null)
                                }}
                            />
                        </div>
                    )}

                    {/* Rules table */}
                    {rulesLoading ? (
                        <p className="text-sm text-gray-500 py-6 text-center">Loading rules…</p>
                    ) : rulesError ? (
                        <p className="text-sm text-red-600 py-6 text-center">{rulesError}</p>
                    ) : rules.length === 0 ? (
                        <p className="text-sm text-gray-500 py-6 text-center">
                            No earning rules configured. Click "New Rule" to get started.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                                        <th className="pb-2 pr-4 font-medium">Priority</th>
                                        <th className="pb-2 pr-4 font-medium">Pattern</th>
                                        <th className="pb-2 pr-4 font-medium">Class</th>
                                        <th className="pb-2 pr-4 font-medium">Contract Type</th>
                                        <th className="pb-2 pr-4 font-medium">Include Incepted</th>
                                        <th className="pb-2 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rules.map(r => (
                                        <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="py-2 pr-4 text-gray-700">{r.priority}</td>
                                            <td className="py-2 pr-4 text-gray-900 font-medium">
                                                {patternNameForId(r.patternId)}
                                            </td>
                                            <td className="py-2 pr-4 text-gray-500">
                                                {r.classOfBusiness ?? 'Any'}
                                            </td>
                                            <td className="py-2 pr-4 text-gray-500">
                                                {r.contractType ?? 'Any'}
                                            </td>
                                            <td className="py-2 pr-4 text-gray-700">
                                                {r.includeIncepted ? 'Yes' : 'No'}
                                            </td>
                                            <td className="py-2 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <button
                                                        onClick={() => {
                                                            setEditingRule(r)
                                                            setShowRuleForm(false)
                                                        }}
                                                        className="text-xs text-brand-600 hover:text-brand-800 flex items-center gap-1"
                                                    >
                                                        <FiEdit2 size={12} />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeactivateRule(r)}
                                                        className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"
                                                        aria-label={`Deactivate rule ${r.id}`}
                                                    >
                                                        <FiTrash2 size={12} />
                                                        Deactivate
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}
        </div>
    )
}
