/**
 * Rating Profile detail page â€” REQ-SETTINGS-RATING-F-004 through F-008,
 * F-014 through F-016, F-020 through F-023, F-024 through F-031
 * Requirements: settings.requirements.md Â§3b
 */

import { Fragment, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { FiChevronDown, FiChevronUp, FiPlus, FiSave, FiSearch, FiTrash2 } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import { useSidebarSection } from '@/shell/SidebarContext'
import Card from '@/shared/Card/Card'
import FieldGroup from '@/shared/components/FieldGroup/FieldGroup'
import TabsNav from '@/shared/components/TabsNav/TabsNav'
import type { TabItem } from '@/shared/components/TabsNav/TabsNav'
import type { AuditEvent } from '@/shared/lib/hooks/useAudit'
import { useAudit } from '@/shared/lib/hooks/useAudit'
import {
    FIELD_OPTIONS,
    OPERATOR_OPTIONS,
    getLookupClassesOfBusiness,
    getLookupContractTypes,
    getLookupCurrencies,
    getLookupLossQualifiers,
    getLookupMethodsOfPlacement,
    getRatingSchedule,
    getRatingRules,
    getRatingScheduleVersions,
    saveRatingSchedule,
    type RatingCondition,
    type RatingGroup,
    type RatingSchedule,
    type RatingScheduleVersion,
} from './settings.service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(value: string | null | undefined) {
    if (!value) return 'â€”'
    const d = new Date(value)
    return isNaN(d.getTime()) ? value : d.toLocaleDateString()
}

function normalizeDateForInput(value: string | null | undefined): string {
    if (!value) return ''
    const raw = String(value).trim()
    if (!raw) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
    if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
        const parsedIso = new Date(raw)
        if (!isNaN(parsedIso.getTime())) {
            const y = parsedIso.getFullYear()
            const m = String(parsedIso.getMonth() + 1).padStart(2, '0')
            const d = String(parsedIso.getDate()).padStart(2, '0')
            return `${y}-${m}-${d}`
        }
        return raw.slice(0, 10)
    }
    const dmy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`
    const parsed = new Date(raw)
    if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear()
        const m = String(parsed.getMonth() + 1).padStart(2, '0')
        const d = String(parsed.getDate()).padStart(2, '0')
        return `${y}-${m}-${d}`
    }
    return ''
}

function normalizeTimeForInput(value: string | null | undefined): string {
    if (!value) return ''
    const raw = String(value).trim()
    if (!raw) return ''
    if (/^\d{2}:\d{2}$/.test(raw)) return raw
    if (/^\d{2}:\d{2}:\d{2}$/.test(raw)) return raw.slice(0, 5)
    const parsed = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
    if (parsed) {
        const h = String(parsed[1]).padStart(2, '0')
        return `${h}:${parsed[2]}`
    }
    return ''
}

const DEFAULT_EFFECTIVE_TIME = '00:00'
const DEFAULT_EXPIRY_TIME = '23:59'

function formatAuditDate(value: string | null | undefined) {
    if (!value) return '—'
    const d = new Date(value)
    return isNaN(d.getTime()) ? value : d.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' })
}

type FlatRule = ReturnType<typeof flattenGroupsForSave>[0]

function groupRulesFromApi(rules: { id: number; group_number?: number; rule_group?: string; group_name?: string; sequence_in_group?: number; logical_operator?: 'AND' | 'OR' | null; field_name: string; operator: string; field_value: string; rate_percentage: number }[]): RatingGroup[] {
    const groupMap = new Map<number, RatingGroup>()
    for (const rule of rules) {
        const gn = rule.group_number ?? 1
        if (!groupMap.has(gn)) {
            groupMap.set(gn, {
                id: gn,
                name: rule.rule_group ?? rule.group_name ?? `Group ${gn}`,
                group_number: gn,
                rate_percentage: rule.rate_percentage ?? 0,
                conditions: [],
            })
        }
        groupMap.get(gn)!.conditions.push({
            id: rule.id,
            logical_operator: rule.logical_operator ?? null,
            field_name: rule.field_name,
            operator: rule.operator,
            field_value: rule.field_value,
        })
    }
    return Array.from(groupMap.values()).sort((a, b) => a.group_number - b.group_number)
}

function flattenGroupsForSave(groups: RatingGroup[]) {
    return groups.flatMap((group, gi) =>
        group.conditions.map((cond, ci) => ({
            group_number: gi + 1,
            group_name: group.name,
            sequence_in_group: ci + 1,
            logical_operator: ci === 0 ? null : cond.logical_operator,
            field_name: cond.field_name,
            operator: cond.operator,
            field_value: cond.field_value,
            rate_percentage: group.rate_percentage,
        }))
    )
}

type SelectOption = { value: string; label: string }

function ensureOptionPresent(options: SelectOption[], value: string): SelectOption[] {
    const trimmed = String(value ?? '').trim()
    if (!trimmed) return options
    if (options.some(option => option.value === trimmed)) return options
    return [{ value: trimmed, label: trimmed }, ...options]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RatingRulesDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const location = useLocation()
    const { addNotification } = useNotifications()

    const [schedule, setSchedule] = useState<RatingSchedule | null>(null)
    const [groups, setGroups] = useState<RatingGroup[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [dirty, setDirty] = useState(false)
    const [activeTab, setActiveTab] = useState('rules')
    const [dateErrors, setDateErrors] = useState({ effective: false, expiry: false })
    const [timeErrors, setTimeErrors] = useState({ effective: false, expiry: false })
    const [auditSortKey, setAuditSortKey] = useState<'action' | 'user' | 'date' | 'effective' | 'effectiveTime' | 'expiry' | 'expiryTime' | 'version' | 'details'>('date')
    const [auditSortDir, setAuditSortDir] = useState<'asc' | 'desc'>('desc')
    const [latestVersion, setLatestVersion] = useState<number | null>(null)
    const [valueOptionsByField, setValueOptionsByField] = useState<Record<string, SelectOption[]>>({})

    const navState = (location.state ?? {}) as {
        prefillEffectiveDate?: string | null
        prefillEffectiveTime?: string | null
        prefillExpiryDate?: string | null
        prefillExpiryTime?: string | null
        openedFromAudit?: boolean
    }
    const openedFromAudit = navState.openedFromAudit === true

    const { audit, loading: auditLoading, error: auditError, getAudit } = useAudit({
        entityType: 'Rating Schedule',
        entityId: schedule?.id ?? null,
        apiBase: '/api/rating-schedules',
        trackVisits: false,
    })

    useEffect(() => {
        if (!id) return
        Promise.all([
            getRatingSchedule(id),
            getRatingRules(id),
            getRatingScheduleVersions(id).catch(() => [] as RatingScheduleVersion[]),
        ])
            .then(([sch, rls, versions]) => {
                const prefillEffectiveDate = normalizeDateForInput(navState.prefillEffectiveDate)
                const prefillEffectiveTime = normalizeTimeForInput(navState.prefillEffectiveTime)
                const prefillExpiryDate = normalizeDateForInput(navState.prefillExpiryDate)
                const prefillExpiryTime = normalizeTimeForInput(navState.prefillExpiryTime)

                const resolvedLatestVersion = Array.isArray(versions) && versions.length > 0
                    ? Math.max(...versions.map(v => Number(v.version) || 0))
                    : Number(sch?.version) || null

                const normalizedEffectiveDate = normalizeDateForInput(sch?.effective_date) || prefillEffectiveDate
                const normalizedEffectiveTime = normalizeTimeForInput(sch?.effective_time) || prefillEffectiveTime || DEFAULT_EFFECTIVE_TIME
                const normalizedExpiryDate = normalizeDateForInput(sch?.expiry_date) || prefillExpiryDate
                const normalizedExpiryTime = normalizeTimeForInput(sch?.expiry_time) || prefillExpiryTime || DEFAULT_EXPIRY_TIME

                const normalized = {
                    ...sch,
                    effective_date: normalizedEffectiveDate,
                    effective_time: normalizedEffectiveTime,
                    expiry_date: normalizedExpiryDate,
                    expiry_time: normalizedExpiryTime,
                }
                setSchedule(normalized)
                setGroups(groupRulesFromApi(Array.isArray(rls) ? rls : []))
                setLatestVersion(resolvedLatestVersion)
                setDirty(false)
                setDateErrors({
                    effective: !normalizedEffectiveDate,
                    expiry: !normalizedExpiryDate,
                })
                setTimeErrors({
                    effective: !normalizedEffectiveTime,
                    expiry: !normalizedExpiryTime,
                })
            })
            .finally(() => setLoading(false))
    }, [id, navState.prefillEffectiveDate, navState.prefillEffectiveTime, navState.prefillExpiryDate, navState.prefillExpiryTime])

    useEffect(() => {
        Promise.all([
            getLookupClassesOfBusiness().catch(() => [] as Array<{ code: string; name: string }>),
            getLookupCurrencies().catch(() => [] as string[]),
            getLookupMethodsOfPlacement().catch(() => [] as string[]),
            getLookupContractTypes().catch(() => [] as string[]),
            getLookupLossQualifiers().catch(() => [] as string[]),
        ]).then(([classesOfBusiness, currencies, methodsOfPlacement, contractTypes, lossQualifiers]) => {
            const classOfBusinessOptions: SelectOption[] = classesOfBusiness.map(item => ({
                value: item.name,
                label: item.name,
            }))
            const currencyOptions: SelectOption[] = currencies.map(item => ({ value: item, label: item }))
            const methodOptions: SelectOption[] = methodsOfPlacement.map(item => ({ value: item, label: item }))
            const contractTypeOptions: SelectOption[] = contractTypes.map(item => ({ value: item, label: item }))
            const lossQualifierOptions: SelectOption[] = lossQualifiers.map(item => ({ value: item, label: item }))

            setValueOptionsByField({
                section_class_of_business: classOfBusinessOptions,
                coverage_class_of_business: classOfBusinessOptions,
                quote_policy_method_of_placement: methodOptions,
                quote_policy_contract_type: contractTypeOptions,
                section_limit_currency: currencyOptions,
                section_excess_currency: currencyOptions,
                section_sum_insured_currency: currencyOptions,
                section_premium_currency: currencyOptions,
                coverage_limit_currency: currencyOptions,
                coverage_excess_currency: currencyOptions,
                coverage_sum_insured_currency: currencyOptions,
                coverage_premium_currency: currencyOptions,
                coverage_detail_currency: currencyOptions,
                section_limit_loss_qualifier: lossQualifierOptions,
                section_excess_loss_qualifier: lossQualifierOptions,
            })
        })
    }, [])

    // REQ-SETTINGS-RATING-F-017: warn on browser close/refresh when dirty
    useEffect(() => {
        if (!dirty) return
        const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [dirty])

    function markDirty() { setDirty(true) }

    function updateScheduleField<K extends keyof RatingSchedule>(key: K, value: RatingSchedule[K]) {
        const normalizedValue = (key === 'effective_date' || key === 'expiry_date')
            ? (normalizeDateForInput(String(value ?? '')) as RatingSchedule[K])
            : (key === 'effective_time' || key === 'expiry_time')
                ? (normalizeTimeForInput(String(value ?? '')) as RatingSchedule[K])
                : value
        setSchedule(prev => prev ? { ...prev, [key]: normalizedValue } : prev)
        if (key === 'effective_date') {
            setDateErrors(prev => ({ ...prev, effective: !normalizeDateForInput(String(value ?? '')) }))
        }
        if (key === 'expiry_date') {
            setDateErrors(prev => ({ ...prev, expiry: !normalizeDateForInput(String(value ?? '')) }))
        }
        if (key === 'effective_time') {
            setTimeErrors(prev => ({ ...prev, effective: !normalizeTimeForInput(String(value ?? '')) }))
        }
        if (key === 'expiry_time') {
            setTimeErrors(prev => ({ ...prev, expiry: !normalizeTimeForInput(String(value ?? '')) }))
        }
        markDirty()
    }

    function validateRequiredDates(s: RatingSchedule): boolean {
        const missingEffective = !normalizeDateForInput(s.effective_date)
        const missingExpiry = !normalizeDateForInput(s.expiry_date)
        const missingEffectiveTime = !normalizeTimeForInput(s.effective_time)
        const missingExpiryTime = !normalizeTimeForInput(s.expiry_time)
        setDateErrors({ effective: missingEffective, expiry: missingExpiry })
        setTimeErrors({ effective: missingEffectiveTime, expiry: missingExpiryTime })
        return !(missingEffective || missingExpiry || missingEffectiveTime || missingExpiryTime)
    }

    // ---- Group mutations ----

    function addGroup() {
        const nextNum = groups.length + 1
        setGroups(prev => [...prev, {
            id: Date.now(),
            name: `Group ${nextNum}`,
            group_number: nextNum,
            rate_percentage: 0,
            conditions: [{
                id: Date.now() + 1,
                logical_operator: null,
                field_name: 'section_class_of_business',
                operator: '=',
                field_value: '',
            }],
        }])
        markDirty()
    }

    function deleteGroup(groupId: number) {
        setGroups(prev => prev.filter(g => g.id !== groupId))
        markDirty()
    }

    function moveGroup(groupId: number, dir: 'up' | 'down') {
        setGroups(prev => {
            const idx = prev.findIndex(g => g.id === groupId)
            if (idx < 0) return prev
            const newIdx = dir === 'up' ? idx - 1 : idx + 1
            if (newIdx < 0 || newIdx >= prev.length) return prev
            const next = [...prev];
            [next[idx], next[newIdx]] = [next[newIdx], next[idx]]
            return next
        })
        markDirty()
    }

    function updateGroup(groupId: number, patch: Partial<Pick<RatingGroup, 'name' | 'rate_percentage'>>) {
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, ...patch } : g))
        markDirty()
    }

    // ---- Condition mutations ----

    function addCondition(groupId: number) {
        setGroups(prev => prev.map(g => g.id !== groupId ? g : {
            ...g,
            conditions: [...g.conditions, {
                id: Date.now(),
                logical_operator: 'AND' as const,
                field_name: 'section_class_of_business',
                operator: '=',
                field_value: '',
            }],
        }))
        markDirty()
    }

    function deleteCondition(groupId: number, condId: number) {
        setGroups(prev => prev.map(g => g.id !== groupId ? g : {
            ...g,
            conditions: g.conditions.filter(c => c.id !== condId),
        }))
        markDirty()
    }

    function moveCondition(groupId: number, condId: number, dir: 'up' | 'down') {
        setGroups(prev => prev.map(g => {
            if (g.id !== groupId) return g
            const idx = g.conditions.findIndex(c => c.id === condId)
            if (idx < 0) return g
            const newIdx = dir === 'up' ? idx - 1 : idx + 1
            if (newIdx < 0 || newIdx >= g.conditions.length) return g
            const next = [...g.conditions];
            [next[idx], next[newIdx]] = [next[newIdx], next[idx]]
            return { ...g, conditions: next }
        }))
        markDirty()
    }

    function updateCondition(groupId: number, condId: number, patch: Partial<RatingCondition>) {
        setGroups(prev => prev.map(g => {
            if (g.id !== groupId) return g
            return {
                ...g,
                conditions: g.conditions.map((c, i) => {
                    if (c.id !== condId) return c
                    const updated = { ...c, ...patch }
                    if (i === 0) updated.logical_operator = null  // first condition is always IF
                    return updated
                }),
            }
        }))
        markDirty()
    }

    // ---- Save ----

    async function handleSave() {
        if (!schedule || !id) return
        if (!validateRequiredDates(schedule)) {
            addNotification('Effective/Expiry date and time are required before saving.', 'error')
            return
        }

        setSaving(true)
        try {
            const currentVersion = schedule.version ?? null
            const submittedEffectiveDate = normalizeDateForInput(schedule.effective_date)
            const submittedEffectiveTime = normalizeTimeForInput(schedule.effective_time) || DEFAULT_EFFECTIVE_TIME
            const submittedExpiryDate = normalizeDateForInput(schedule.expiry_date)
            const submittedExpiryTime = normalizeTimeForInput(schedule.expiry_time) || DEFAULT_EXPIRY_TIME
            const updated = await saveRatingSchedule(id, {
                name: schedule.name,
                effective_date: submittedEffectiveDate,
                effective_time: submittedEffectiveTime,
                expiry_date: submittedExpiryDate,
                expiry_time: submittedExpiryTime,
                is_active: schedule.is_active,
                rules: flattenGroupsForSave(groups),
            })
            const updatedEffectiveDate = normalizeDateForInput(updated.effective_date) || submittedEffectiveDate
            const updatedEffectiveTime = normalizeTimeForInput(updated.effective_time) || submittedEffectiveTime
            const updatedExpiryDate = normalizeDateForInput(updated.expiry_date) || submittedExpiryDate
            const updatedExpiryTime = normalizeTimeForInput(updated.expiry_time) || submittedExpiryTime
            setSchedule({
                ...updated,
                effective_date: updatedEffectiveDate,
                effective_time: updatedEffectiveTime,
                expiry_date: updatedExpiryDate,
                expiry_time: updatedExpiryTime,
            })
            setDirty(false)
            if (String(updated.id ?? id) !== String(id)) {
                navigate(`/settings/rating-rules/${updated.id}`, {
                    replace: true,
                    state: {
                        prefillEffectiveDate: updatedEffectiveDate,
                        prefillEffectiveTime: updatedEffectiveTime,
                        prefillExpiryDate: updatedExpiryDate,
                        prefillExpiryTime: updatedExpiryTime,
                    },
                })
            }
            setLatestVersion(Number(updated.version) || latestVersion)
            if ((updated.version ?? currentVersion ?? 0) > (currentVersion ?? 0)) {
                addNotification(`Rating profile saved as version ${updated.version}.`, 'success')
            } else {
                addNotification('Rating profile saved successfully', 'success')
            }
            void getAudit()
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save rating profile.'
            addNotification(message, 'error')
        } finally {
            setSaving(false)
        }
    }

    // Sidebar section — REQ-SETTINGS-RATING-F-016
    const sidebarSection = useMemo(() => ({
        title: 'Rating Profiles',
        items: [
            { label: 'Save', icon: FiSave, event: 'rating-schedule:save' },
        ],
    }), [])

    useSidebarSection(sidebarSection)

    // Listen for sidebar save â€” always latest handleSave
    useEffect(() => {
        const handler = () => { void handleSave() }
        window.addEventListener('rating-schedule:save', handler)
        return () => window.removeEventListener('rating-schedule:save', handler)
    }) // intentionally no deps

    // ---- Tab definitions ----

    const TABS: TabItem[] = [
        { key: 'rules', label: 'Rules' },
        { key: 'audit', label: 'Audit' },
    ]

    async function openVersionFromAudit(event: AuditEvent) {
        const rawVersion = event.changes?.version?.new
        const targetVersion = Number(rawVersion)
        if (!schedule?.id || !Number.isFinite(targetVersion)) {
            addNotification('Version snapshot is not available for this audit row.', 'warning')
            return
        }
        try {
            const versions = await getRatingScheduleVersions(String(schedule.id))
            const target = Array.isArray(versions)
                ? versions.find(v => Number(v.version) === targetVersion)
                : null
            if (!target?.id) {
                addNotification(`Could not find rating profile version ${targetVersion}.`, 'error')
                return
            }
            navigate(`/settings/rating-rules/${target.id}`, {
                state: {
                    openedFromAudit: true,
                },
            })
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to open rating profile version.'
            addNotification(message, 'error')
        }
    }

    function auditFieldValue(event: AuditEvent, key: 'effective_date' | 'expiry_date'): string {
        const direct = event.changes?.[key]?.new
        if (!direct || !String(direct).trim()) return '—'
        const normalized = normalizeDateForInput(String(direct))
        if (!normalized) return String(direct)
        return formatDate(normalized)
    }

    function handleAuditSort(key: 'action' | 'user' | 'date' | 'effective' | 'effectiveTime' | 'expiry' | 'expiryTime' | 'version' | 'details') {
        if (auditSortKey === key) {
            setAuditSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
            return
        }
        setAuditSortKey(key)
        setAuditSortDir(key === 'date' ? 'desc' : 'asc')
    }

    const sortedAudit = useMemo(() => {
        const rows = [...audit]
        rows.sort((a, b) => {
            const av = auditSortKey === 'action'
                ? String(a.action ?? '').toLowerCase()
                : auditSortKey === 'user'
                    ? String(a.user ?? '').toLowerCase()
                    : auditSortKey === 'date'
                        ? String(a.date ?? '')
                        : auditSortKey === 'effective'
                            ? String(auditFieldValue(a, 'effective_date')).toLowerCase()
                            : auditSortKey === 'effectiveTime'
                                ? String(normalizeTimeForInput(a.changes?.effective_time?.new as string | null | undefined)).toLowerCase()
                                : auditSortKey === 'expiry'
                                    ? String(auditFieldValue(a, 'expiry_date')).toLowerCase()
                                    : auditSortKey === 'expiryTime'
                                        ? String(normalizeTimeForInput(a.changes?.expiry_time?.new as string | null | undefined)).toLowerCase()
                                        : auditSortKey === 'version'
                                            ? String(a.changes?.version?.new ?? '')
                                            : String(a.details ?? '').toLowerCase()

            const bv = auditSortKey === 'action'
                ? String(b.action ?? '').toLowerCase()
                : auditSortKey === 'user'
                    ? String(b.user ?? '').toLowerCase()
                    : auditSortKey === 'date'
                        ? String(b.date ?? '')
                        : auditSortKey === 'effective'
                            ? String(auditFieldValue(b, 'effective_date')).toLowerCase()
                            : auditSortKey === 'effectiveTime'
                                ? String(normalizeTimeForInput(b.changes?.effective_time?.new as string | null | undefined)).toLowerCase()
                                : auditSortKey === 'expiry'
                                    ? String(auditFieldValue(b, 'expiry_date')).toLowerCase()
                                    : auditSortKey === 'expiryTime'
                                        ? String(normalizeTimeForInput(b.changes?.expiry_time?.new as string | null | undefined)).toLowerCase()
                                        : auditSortKey === 'version'
                                            ? String(b.changes?.version?.new ?? '')
                                            : String(b.details ?? '').toLowerCase()

            const cmp = av < bv ? -1 : av > bv ? 1 : 0
            return auditSortDir === 'asc' ? cmp : -cmp
        })
        return rows
    }, [audit, auditSortDir, auditSortKey])

    // Load audit history when tab becomes active
    useEffect(() => {
        if (activeTab === 'audit' && schedule?.id) {
            void getAudit()
        }
    }, [activeTab, schedule?.id]) // eslint-disable-line react-hooks/exhaustive-deps

    // ---- Render ----

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
            </div>
        )
    }

    return (
        <div className="p-6 flex flex-col gap-6">

            {/* Header - REQ-SETTINGS-RATING-F-021/F-022 */}
            <h2 className="text-2xl font-semibold text-gray-900">
                Rating Profile: {schedule?.name ?? ''}
            </h2>

            {/* Schedule metadata - Card + FieldGroup matching quotes page style */}
            <Card>
                <div className="flex flex-col gap-4">
                    {/* REQ-SETTINGS-RATING-F-020 */}
                    <div className="text-sm text-gray-500">
                        <span className="font-medium text-gray-700">Schedule ID: </span>
                        <span className="font-mono">{schedule?.id ?? '-'}</span>
                    </div>

                    <FieldGroup title="Schedule Details">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-700" htmlFor="schedule-name">Schedule Name</label>
                                <input
                                    id="schedule-name"
                                    type="text"
                                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                                    value={schedule?.name ?? ''}
                                    onChange={e => updateScheduleField('name', e.target.value)}
                                />
                            </div>
                            <div className="flex items-end pb-2">
                                <label className="flex items-center gap-2 text-sm text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={schedule?.is_active ?? false}
                                        onChange={e => updateScheduleField('is_active', e.target.checked)}
                                        className="w-4 h-4 text-brand-600"
                                    />
                                    Active
                                </label>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-700">Latest Version</label>
                                <div className="rounded border border-gray-200 bg-slate-50 px-3 py-2 text-sm text-gray-700">
                                    {latestVersion ?? schedule?.version ?? '—'}
                                </div>
                            </div>
                            {!openedFromAudit && (
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-gray-700">Creating Version</label>
                                    <div className="rounded border border-gray-200 bg-slate-50 px-3 py-2 text-sm text-gray-700">
                                        {latestVersion !== null ? latestVersion + 1 : '—'}
                                    </div>
                                </div>
                            )}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-700">Currency</label>
                                <div className="rounded border border-gray-200 bg-slate-50 px-3 py-2 text-sm text-gray-700">
                                    {schedule?.currency ?? '—'}
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-700">Organisation</label>
                                <div className="rounded border border-gray-200 bg-slate-50 px-3 py-2 text-sm text-gray-700">
                                    {schedule?.org_name ?? schedule?.org_code ?? '—'}
                                </div>
                            </div>
                        </div>
                    </FieldGroup>

                    <FieldGroup title="Effective Period">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            {/* REQ-SETTINGS-RATING-F-014 */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-700" htmlFor="effective-from">Effective From</label>
                                <input
                                    id="effective-from"
                                    type="date"
                                    className={`border rounded px-3 py-2 text-sm ${dateErrors.effective ? 'app-input-invalid' : 'border-gray-300'}`}
                                    aria-invalid={dateErrors.effective ? 'true' : 'false'}
                                    value={normalizeDateForInput(schedule?.effective_date)}
                                    onChange={e => updateScheduleField('effective_date', e.target.value)}
                                    onBlur={() => {
                                        if (schedule) {
                                            setDateErrors(prev => ({ ...prev, effective: !normalizeDateForInput(schedule.effective_date) }))
                                        }
                                    }}
                                />
                                {dateErrors.effective && (
                                    <p className="text-xs text-red-600">Effective From is required.</p>
                                )}
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-700" htmlFor="effective-time">Effective From Time</label>
                                <input
                                    id="effective-time"
                                    type="time"
                                    className={`border rounded px-3 py-2 text-sm ${timeErrors.effective ? 'app-input-invalid' : 'border-gray-300'}`}
                                    aria-invalid={timeErrors.effective ? 'true' : 'false'}
                                    value={normalizeTimeForInput(schedule?.effective_time)}
                                    onChange={e => updateScheduleField('effective_time', e.target.value)}
                                />
                                {timeErrors.effective && (
                                    <p className="text-xs text-red-600">Effective From Time is required.</p>
                                )}
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-700" htmlFor="expiry-date">Expiry Date</label>
                                <input
                                    id="expiry-date"
                                    type="date"
                                    className={`border rounded px-3 py-2 text-sm ${dateErrors.expiry ? 'app-input-invalid' : 'border-gray-300'}`}
                                    aria-invalid={dateErrors.expiry ? 'true' : 'false'}
                                    value={normalizeDateForInput(schedule?.expiry_date)}
                                    onChange={e => updateScheduleField('expiry_date', e.target.value || null as unknown as string)}
                                    onBlur={() => {
                                        if (schedule) {
                                            setDateErrors(prev => ({ ...prev, expiry: !normalizeDateForInput(schedule.expiry_date) }))
                                        }
                                    }}
                                />
                                {dateErrors.expiry && (
                                    <p className="text-xs text-red-600">Expiry Date is required.</p>
                                )}
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-700" htmlFor="expiry-time">Expiry Time</label>
                                <input
                                    id="expiry-time"
                                    type="time"
                                    className={`border rounded px-3 py-2 text-sm ${timeErrors.expiry ? 'app-input-invalid' : 'border-gray-300'}`}
                                    aria-invalid={timeErrors.expiry ? 'true' : 'false'}
                                    value={normalizeTimeForInput(schedule?.expiry_time)}
                                    onChange={e => updateScheduleField('expiry_time', e.target.value)}
                                />
                                {timeErrors.expiry && (
                                    <p className="text-xs text-red-600">Expiry Time is required.</p>
                                )}
                            </div>
                        </div>
                    </FieldGroup>
                </div>
            </Card>

            {/* Tabs */}
            <TabsNav tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />

            {/* Rules tab - REQ-SETTINGS-RATING-F-024 through F-031 */}
            {activeTab === 'rules' && (
                <div className="table-wrapper rounded-lg shadow-sm">
                    <table className="app-table">
                        <thead>
                            <tr>
                                <th style={{ width: 72 }}>
                                    <button
                                        type="button"
                                        aria-label="Add group"
                                        title="Add group"
                                        onClick={addGroup}
                                        className="text-brand-600 hover:text-brand-800"
                                    >
                                        <FiPlus size={14} />
                                    </button>
                                </th>
                                <th>Group / Logic</th>
                                <th>Ratable Factor</th>
                                <th>Operator</th>
                                <th>Value</th>
                                <th style={{ width: 120 }}>Rate (%)</th>
                                <th style={{ width: 40 }} />
                            </tr>
                        </thead>
                        <tbody>
                            {groups.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center text-gray-500 py-8">
                                        No groups defined. Click + to create one.
                                    </td>
                                </tr>
                            ) : (
                                groups.map((group, gi) => (
                                    <Fragment key={`grp-${group.id}`}>
                                        {/* Group header row */}
                                        <tr className="bg-gray-50">
                                            <td>
                                                <div className="flex items-center gap-0.5">
                                                    <button type="button" aria-label="Add condition" title="Add condition"
                                                        onClick={() => addCondition(group.id)}
                                                        className="text-brand-600 hover:text-brand-800">
                                                        <FiPlus size={12} />
                                                    </button>
                                                    <button type="button" aria-label="Move group up" disabled={gi === 0}
                                                        onClick={() => moveGroup(group.id, 'up')}
                                                        className="text-gray-400 hover:text-gray-700 disabled:opacity-25">
                                                        <FiChevronUp size={12} />
                                                    </button>
                                                    <button type="button" aria-label="Move group down" disabled={gi === groups.length - 1}
                                                        onClick={() => moveGroup(group.id, 'down')}
                                                        className="text-gray-400 hover:text-gray-700 disabled:opacity-25">
                                                        <FiChevronDown size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td colSpan={3}>
                                                <input type="text" aria-label="Group name"
                                                    value={group.name}
                                                    onChange={e => updateGroup(group.id, { name: e.target.value })}
                                                    className="w-full border border-gray-300 rounded px-2 py-0.5 text-sm bg-white font-medium" />
                                            </td>
                                            <td />
                                            <td>
                                                <input type="number" aria-label="Group rate" step="0.000001"
                                                    key={`rate-${group.id}`}
                                                    defaultValue={Number(group.rate_percentage).toFixed(6)}
                                                    onBlur={e => updateGroup(group.id, { rate_percentage: parseFloat(e.target.value) || 0 })}
                                                    className="w-full border border-gray-300 rounded px-2 py-0.5 text-sm bg-white font-mono" />
                                            </td>
                                            <td>
                                                <button type="button" aria-label="Delete group" title="Delete group"
                                                    onClick={() => deleteGroup(group.id)}
                                                    className="text-red-500 hover:text-red-700">
                                                    <FiTrash2 size={13} />
                                                </button>
                                            </td>
                                        </tr>

                                        {/* Condition rows */}
                                        {group.conditions.map((cond, ci) => (
                                            <tr key={`c-${cond.id}`} className="bg-white">
                                                <td>
                                                    <div className="flex items-center gap-0.5 pl-4">
                                                        <button type="button" aria-label="Move condition up" disabled={ci === 0}
                                                            onClick={() => moveCondition(group.id, cond.id, 'up')}
                                                            className="text-gray-400 hover:text-gray-700 disabled:opacity-25">
                                                            <FiChevronUp size={12} />
                                                        </button>
                                                        <button type="button" aria-label="Move condition down"
                                                            disabled={ci === group.conditions.length - 1}
                                                            onClick={() => moveCondition(group.id, cond.id, 'down')}
                                                            className="text-gray-400 hover:text-gray-700 disabled:opacity-25">
                                                            <FiChevronDown size={12} />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td>
                                                    {ci === 0 ? (
                                                        <span className="text-xs font-semibold text-brand-700 px-2 py-0.5 bg-brand-50 rounded">IF</span>
                                                    ) : (
                                                        <select aria-label="Logical operator"
                                                            value={cond.logical_operator ?? 'AND'}
                                                            onChange={e => updateCondition(group.id, cond.id, { logical_operator: e.target.value as 'AND' | 'OR' })}
                                                            className="border border-gray-300 rounded px-2 py-0.5 text-sm">
                                                            <option value="AND">AND</option>
                                                            <option value="OR">OR</option>
                                                        </select>
                                                    )}
                                                </td>
                                                <td>
                                                    <select aria-label="Ratable Factor"
                                                        value={cond.field_name}
                                                        onChange={e => updateCondition(group.id, cond.id, { field_name: e.target.value })}
                                                        className="w-full border border-gray-300 rounded px-2 py-0.5 text-sm">
                                                        {FIELD_OPTIONS.map(o => (
                                                            <option key={o.value} value={o.value}>{o.label}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td>
                                                    <select aria-label="Operator"
                                                        value={cond.operator}
                                                        onChange={e => updateCondition(group.id, cond.id, { operator: e.target.value })}
                                                        className="w-full border border-gray-300 rounded px-2 py-0.5 text-sm">
                                                        {OPERATOR_OPTIONS.map(o => (
                                                            <option key={o.value} value={o.value}>{o.label}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td>
                                                    {(valueOptionsByField[cond.field_name]?.length ?? 0) > 0 ? (
                                                        <select
                                                            aria-label="Value"
                                                            value={cond.field_value}
                                                            onChange={e => updateCondition(group.id, cond.id, { field_value: e.target.value })}
                                                            className="w-full border border-gray-300 rounded px-2 py-0.5 text-sm"
                                                        >
                                                            <option value="">Select value</option>
                                                            {ensureOptionPresent(valueOptionsByField[cond.field_name] ?? [], cond.field_value).map(option => (
                                                                <option key={`${cond.field_name}-${option.value}`} value={option.value}>{option.label}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <input type="text" aria-label="Value"
                                                            value={cond.field_value}
                                                            onChange={e => updateCondition(group.id, cond.id, { field_value: e.target.value })}
                                                            className="w-full border border-gray-300 rounded px-2 py-0.5 text-sm"
                                                            placeholder="e.g. SW1, UK, 1000000" />
                                                    )}
                                                </td>
                                                <td />
                                                <td>
                                                    <button type="button" aria-label="Delete condition"
                                                        onClick={() => deleteCondition(group.id, cond.id)}
                                                        className="text-red-400 hover:text-red-600">
                                                        <FiTrash2 size={13} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Audit tab */}
            {activeTab === 'audit' && (
                <div className="overflow-x-auto">
                    {auditLoading ? (
                        <p className="text-sm text-gray-400 py-4 text-center">Loading audit history…</p>
                    ) : auditError ? (
                        <p className="text-sm text-red-600 py-4">{auditError}</p>
                    ) : (
                        <table className="app-table w-full">
                            <thead>
                                <tr>
                                    <th style={{ width: 56 }}>Open</th>
                                    <th onClick={() => handleAuditSort('action')} className="cursor-pointer select-none" style={{ resize: 'horizontal', overflow: 'auto' }}>Action</th>
                                    <th onClick={() => handleAuditSort('user')} className="cursor-pointer select-none" style={{ resize: 'horizontal', overflow: 'auto' }}>User</th>
                                    <th onClick={() => handleAuditSort('date')} className="cursor-pointer select-none" style={{ resize: 'horizontal', overflow: 'auto' }}>Date &amp; Time</th>
                                    <th onClick={() => handleAuditSort('effective')} className="cursor-pointer select-none" style={{ resize: 'horizontal', overflow: 'auto' }}>Effective From</th>
                                    <th onClick={() => handleAuditSort('effectiveTime')} className="cursor-pointer select-none" style={{ resize: 'horizontal', overflow: 'auto' }}>Effective From Time</th>
                                    <th onClick={() => handleAuditSort('expiry')} className="cursor-pointer select-none" style={{ resize: 'horizontal', overflow: 'auto' }}>Expiry Date</th>
                                    <th onClick={() => handleAuditSort('expiryTime')} className="cursor-pointer select-none" style={{ resize: 'horizontal', overflow: 'auto' }}>Expiry Time</th>
                                    <th onClick={() => handleAuditSort('version')} className="cursor-pointer select-none" style={{ resize: 'horizontal', overflow: 'auto' }}>Version</th>
                                    <th onClick={() => handleAuditSort('details')} className="cursor-pointer select-none" style={{ resize: 'horizontal', overflow: 'auto' }}>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedAudit.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="text-center text-gray-400 py-10 text-sm italic">
                                            No audit history available for this Rating Profile.
                                        </td>
                                    </tr>
                                ) : (
                                    sortedAudit.map((event, idx) => (
                                        <tr key={`${event.date}-${idx}`}>
                                            <td>
                                                <button
                                                    type="button"
                                                    aria-label="Open this version"
                                                    title="Open this version"
                                                    onClick={() => { void openVersionFromAudit(event) }}
                                                    className="text-brand-600 hover:text-brand-800"
                                                >
                                                    <FiSearch size={14} />
                                                </button>
                                            </td>
                                            <td className="font-medium">{event.action}</td>
                                            <td>{event.user ?? '—'}</td>
                                            <td>{formatAuditDate(event.date)}</td>
                                            <td>{auditFieldValue(event, 'effective_date')}</td>
                                            <td>{normalizeTimeForInput(event.changes?.effective_time?.new as string | null | undefined) || '—'}</td>
                                            <td>{auditFieldValue(event, 'expiry_date')}</td>
                                            <td>{normalizeTimeForInput(event.changes?.expiry_time?.new as string | null | undefined) || '—'}</td>
                                            <td>{event.changes?.version?.new ?? '—'}</td>
                                            <td>{event.details ?? '—'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    )
}
