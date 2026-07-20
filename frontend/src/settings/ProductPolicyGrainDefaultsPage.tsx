import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { FiArrowLeft, FiPlus, FiSave } from 'react-icons/fi'
import Card from '@/shared/Card/Card'
import { useNotifications } from '@/shell/NotificationDock'
import {
    FIELD_OPTIONS,
    getPolicyGrainDefaultsMetadata,
    getGrainDefaults,
    saveGrainDefaults,
    getLookupClassesOfBusiness,
    getLookupCurrencies,
    getLookupLossQualifiers,
    getLookupMethodsOfPlacement,
    getLookupContractTypes,
    type LookupClassOfBusiness,
    type PolicyGrainFieldOption,
    type PolicyGrainRuleOption,
} from './settings.service'

type DefaultsRow = {
    id: number
    applicableField: string
    rule: string
    value: string
}

type LookupData = {
    classesOfBusiness: LookupClassOfBusiness[]
    currencies: string[]
    lossQualifiers: string[]
    methodsOfPlacement: string[]
    contractTypes: string[]
}

function getValueInputType(fieldValue: string): 'cob' | 'currency' | 'loss-qualifier' | 'method-of-placement' | 'contract-type' | 'number' | 'date' | 'text' {
    const f = fieldValue.toLowerCase()
    if (f.includes('class_of_business')) return 'cob'
    if (f.includes('currency')) return 'currency'
    if (f.includes('loss_qualifier')) return 'loss-qualifier'
    if (f.includes('method_of_placement')) return 'method-of-placement'
    if (f.includes('contract_type')) return 'contract-type'
    if (f.includes('premium') || f.includes('limit') || f.includes('amount') || f.includes('year')) return 'number'
    if (f.includes('date')) return 'date'
    return 'text'
}

type GrainParam = 'section' | 'coverage' | 'coverage-element'

type LocationState = {
    policyGrainLabel?: string
    sourceId?: number
} | null

function toPolicyGrainKey(grain: GrainParam): 'section' | 'coverage' | 'coverage_element' {
    if (grain === 'coverage-element') return 'coverage_element'
    return grain
}

function toPolicyGrainLabel(grain: GrainParam): string {
    if (grain === 'coverage-element') return 'Coverage Element'
    if (grain === 'coverage') return 'Coverage'
    return 'Section'
}

function buildFallbackRules(): PolicyGrainRuleOption[] {
    return [
        { value: 'default', label: 'Default' },
        { value: 'minimum_premium', label: 'Minimum Premium' },
        { value: 'maximum_premium', label: 'Maximum Premium' },
        { value: 'default_currency', label: 'Default Currency' },
        { value: 'default_loss_qualifier', label: 'Default Loss Qualifier' },
    ]
}

function buildFallbackFieldsByPolicyGrain(): {
    section: PolicyGrainFieldOption[]
    coverage: PolicyGrainFieldOption[]
    coverage_element: PolicyGrainFieldOption[]
} {
    const section = FIELD_OPTIONS
        .filter((option) => option.value.startsWith('section_'))
        .map((option) => ({ value: `section.${option.value}`, label: option.label }))

    const coverage = FIELD_OPTIONS
        .filter((option) => option.value.startsWith('coverage_') && !option.value.startsWith('coverage_detail_'))
        .map((option) => ({ value: `coverage.${option.value}`, label: option.label }))

    const coverageElement = FIELD_OPTIONS
        .filter((option) => option.value.startsWith('coverage_detail_') || option.value === 'coverage_type' || option.value === 'coverage_sub_type')
        .map((option) => ({ value: `coverage_element.${option.value}`, label: option.label }))

    return {
        section,
        coverage,
        coverage_element: coverageElement,
    }
}

export default function ProductPolicyGrainDefaultsPage() {
    const { id, grain = 'section', rowId } = useParams<{ id: string; grain: GrainParam; rowId: string }>()
    const location = useLocation()
    const { addNotification } = useNotifications()

    const state = (location.state ?? null) as LocationState
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [rules, setRules] = useState<PolicyGrainRuleOption[]>([])
    const [fieldOptions, setFieldOptions] = useState<PolicyGrainFieldOption[]>([])
    const [rows, setRows] = useState<DefaultsRow[]>([{ id: 1, applicableField: '', rule: '', value: '' }])
    const [lookups, setLookups] = useState<LookupData>({
        classesOfBusiness: [],
        currencies: [],
        lossQualifiers: [],
        methodsOfPlacement: [],
        contractTypes: [],
    })

    const grainLabel = useMemo(() => state?.policyGrainLabel ?? toPolicyGrainLabel(grain), [grain, state?.policyGrainLabel])

    // Load lookups once
    useEffect(() => {
        Promise.allSettled([
            getLookupClassesOfBusiness(),
            getLookupCurrencies(),
            getLookupLossQualifiers(),
            getLookupMethodsOfPlacement(),
            getLookupContractTypes(),
        ]).then(([cob, cur, lq, mop, ct]) => {
            setLookups({
                classesOfBusiness: cob.status === 'fulfilled' ? cob.value : [],
                currencies: cur.status === 'fulfilled' ? cur.value : [],
                lossQualifiers: lq.status === 'fulfilled' ? lq.value : [],
                methodsOfPlacement: mop.status === 'fulfilled' ? mop.value : [],
                contractTypes: ct.status === 'fulfilled' ? ct.value : [],
            })
        })
    }, [])

    useEffect(() => {
        if (!id) return
        setLoading(true)
        const numericProductId = Number(id)
        const fallbackFieldsByPolicyGrain = buildFallbackFieldsByPolicyGrain()
        const fallbackRules = buildFallbackRules()

        if (!Number.isFinite(numericProductId)) {
            const fieldKey = toPolicyGrainKey(grain)
            const nextFields = fallbackFieldsByPolicyGrain[fieldKey] ?? []
            setFieldOptions(nextFields)
            setRules(fallbackRules)
            setRows([{ id: 1, applicableField: nextFields[0]?.value ?? '', rule: fallbackRules[0]?.value ?? '', value: '' }])
            setLoading(false)
            return
        }

        getPolicyGrainDefaultsMetadata(id)
            .then((metadata) => {
                const fieldKey = toPolicyGrainKey(grain)
                const nextFields = metadata.fieldsByPolicyGrain[fieldKey] ?? []
                const allRules = [{ value: 'default', label: 'Default' }, ...(metadata.rules ?? [])]
                setFieldOptions(nextFields)
                setRules(allRules)

                // Load any previously saved rows for this grain/rowId
                const grainKey = toPolicyGrainKey(grain)
                return getGrainDefaults(id, grainKey, rowId ?? '0').then((saved) => {
                    if (saved.length > 0) {
                        setRows(saved.map((r, i) => ({
                            id: i + 1,
                            applicableField: r.applicableField,
                            rule: r.rule,
                            value: r.value ?? '',
                        })))
                    } else {
                        setRows([{
                            id: 1,
                            applicableField: nextFields[0]?.value ?? '',
                            rule: allRules[0]?.value ?? '',
                            value: '',
                        }])
                    }
                })
            })
            .catch(() => {
                const fieldKey = toPolicyGrainKey(grain)
                const nextFields = fallbackFieldsByPolicyGrain[fieldKey] ?? []
                setFieldOptions(nextFields)
                setRules(fallbackRules)
                setRows([{ id: 1, applicableField: nextFields[0]?.value ?? '', rule: fallbackRules[0]?.value ?? '', value: '' }])
                addNotification('Loaded fallback defaults metadata while backend metadata endpoint was unavailable.', 'warning')
            })
            .finally(() => setLoading(false))
    }, [id, grain, addNotification])

    function addRow() {
        setRows((current) => {
            const nextId = (current[current.length - 1]?.id ?? 0) + 1
            return [
                ...current,
                {
                    id: nextId,
                    applicableField: fieldOptions[0]?.value ?? '',
                    rule: rules[0]?.value ?? '',
                    value: '',
                },
            ]
        })
    }

    function updateRow(rowIdValue: number, patch: Partial<DefaultsRow>) {
        setRows((current) => current.map((row) => {
            if (row.id !== rowIdValue) return row
            // Clear value when field changes (new field may need different value type)
            const clearValue = 'applicableField' in patch && patch.applicableField !== row.applicableField
            return { ...row, ...patch, ...(clearValue ? { value: '' } : {}) }
        }))
    }

    async function handleSave() {
        if (!id || !Number.isFinite(Number(id))) {
            addNotification('Product must be saved before grain defaults can be persisted.', 'warning')
            return
        }
        setSaving(true)
        try {
            const grainKey = toPolicyGrainKey(grain)
            const saved = await saveGrainDefaults(id, grainKey, rowId ?? '0', rows.map((r) => ({
                applicableField: r.applicableField,
                rule: r.rule,
                value: r.value || null,
            })))
            // Update local state with backend-returned rows (preserves backend IDs and timestamps)
            setRows(saved.map((r, i) => ({
                id: i + 1,
                applicableField: r.applicableField,
                rule: r.rule,
                value: r.value ?? '',
            })))
            addNotification('Defaults saved.', 'success')
        } catch (err: unknown) {
            addNotification(err instanceof Error ? err.message : 'Failed to save defaults.', 'error')
        } finally {
            setSaving(false)
        }
    }

    function renderValueCell(row: DefaultsRow) {
        const inputType = getValueInputType(row.applicableField)
        const baseClass = 'block w-full border-0 bg-transparent px-0 py-1 text-sm text-gray-900 focus:outline-none focus:ring-0'

        if (inputType === 'cob') {
            return (
                <select value={row.value} onChange={(e) => updateRow(row.id, { value: e.target.value })} className={baseClass}>
                    <option value="">— select —</option>
                    {lookups.classesOfBusiness.map((cob) => (
                        <option key={cob.code} value={cob.code}>{cob.name}</option>
                    ))}
                </select>
            )
        }
        if (inputType === 'currency') {
            return (
                <select value={row.value} onChange={(e) => updateRow(row.id, { value: e.target.value })} className={baseClass}>
                    <option value="">— select —</option>
                    {lookups.currencies.map((c) => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            )
        }
        if (inputType === 'loss-qualifier') {
            return (
                <select value={row.value} onChange={(e) => updateRow(row.id, { value: e.target.value })} className={baseClass}>
                    <option value="">— select —</option>
                    {lookups.lossQualifiers.map((lq) => (
                        <option key={lq} value={lq}>{lq}</option>
                    ))}
                </select>
            )
        }
        if (inputType === 'method-of-placement') {
            return (
                <select value={row.value} onChange={(e) => updateRow(row.id, { value: e.target.value })} className={baseClass}>
                    <option value="">— select —</option>
                    {lookups.methodsOfPlacement.map((m) => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
            )
        }
        if (inputType === 'contract-type') {
            return (
                <select value={row.value} onChange={(e) => updateRow(row.id, { value: e.target.value })} className={baseClass}>
                    <option value="">— select —</option>
                    {lookups.contractTypes.map((ct) => (
                        <option key={ct} value={ct}>{ct}</option>
                    ))}
                </select>
            )
        }
        if (inputType === 'number') {
            return (
                <input
                    type="number"
                    value={row.value}
                    onChange={(e) => updateRow(row.id, { value: e.target.value })}
                    className={baseClass}
                    placeholder="Enter value"
                />
            )
        }
        if (inputType === 'date') {
            return (
                <input
                    type="date"
                    value={row.value}
                    onChange={(e) => updateRow(row.id, { value: e.target.value })}
                    className={baseClass}
                />
            )
        }
        return (
            <input
                type="text"
                value={row.value}
                onChange={(e) => updateRow(row.id, { value: e.target.value })}
                className={baseClass}
                placeholder="Enter value"
            />
        )
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center gap-3">
                <Link
                    to={id ? `/settings/products/${id}` : '/settings/products'}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label="Back to product configuration"
                >
                    <FiArrowLeft className="text-xl" />
                </Link>
                <div className="flex-1">
                    <h2 className="text-2xl font-semibold text-gray-900">Policy Grain Defaults</h2>
                    <p className="text-sm text-gray-500">
                        Product {id} • {grainLabel} Row {rowId}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
                >
                    <FiSave size={14} />
                    {saving ? 'Saving…' : 'Save'}
                </button>
            </div>

            <Card>
                {loading ? (
                    <div className="p-6 flex items-center justify-center">
                        <div className="animate-spin rounded-full w-10 h-10 border-b-2 border-brand-600" />
                    </div>
                ) : (
                    <div className="table-wrapper overflow-x-auto">
                        <table className="app-table w-full" style={{ tableLayout: 'fixed' }}>
                            <thead>
                                <tr>
                                    <th style={{ width: 80 }}>
                                        <button
                                            type="button"
                                            aria-label="Add default row"
                                            title="Add default row"
                                            className="text-brand-600 hover:text-brand-800"
                                            onClick={addRow}
                                        >
                                            <FiPlus size={14} />
                                        </button>
                                    </th>
                                    <th style={{ width: 90 }}>ID</th>
                                    <th>Applicable Field</th>
                                    <th style={{ width: 220 }}>Rule</th>
                                    <th>Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr key={row.id}>
                                        <td />
                                        <td>{row.id}</td>
                                        <td>
                                            <select
                                                value={row.applicableField}
                                                onChange={(e) => updateRow(row.id, { applicableField: e.target.value })}
                                                className="block w-full border-0 bg-transparent px-0 py-1 text-sm text-gray-900 focus:outline-none focus:ring-0"
                                            >
                                                {fieldOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>
                                            <select
                                                value={row.rule}
                                                onChange={(e) => updateRow(row.id, { rule: e.target.value })}
                                                className="block w-full border-0 bg-transparent px-0 py-1 text-sm text-gray-900 focus:outline-none focus:ring-0"
                                            >
                                                {rules.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>{renderValueCell(row)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    )
}
