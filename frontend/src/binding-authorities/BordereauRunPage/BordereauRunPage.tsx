/**
 * BordereauRunPage — /binding-authorities/:id/bordereaux/:configId/run
 *
 * Displays an illustrative run of a bordereau configuration. Shows a preview
 * table of the selected fields and provides an Export (CSV) button.
 *
 * Config is loaded from route state (passed by navigate from BAViewPage) first,
 * then falls back to the API. localStorage is no longer used here.
 *
 * Requirements: binding-authorities.requirements.md REQ-BA-FE-F-122b
 * Tests: binding-authorities/__tests__/binding-authorities.test.tsx
 */

import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { getBordereauConfigs } from '../binding-authorities.service'

interface BordereauConfig {
    id: string
    name: string
    type: string
    dataStyle: string
    fields: string[]
    createdAt: string
}

// Generate illustrative rows — one sample row per field so there is visible data.
function buildPreviewRows(fields: string[]): Record<string, string>[] {
    const SAMPLE: Record<string, string> = {
        'policy.reference': 'POL-2026-001',
        'policy.inception_date': '2026-01-01',
        'policy.expiry_date': '2027-01-01',
        'policy.premium': '12,500.00',
        'policy.currency': 'GBP',
        'policy.status': 'Active',
        'insured.name': 'Sample Insured Ltd',
        'coverholder': 'Alpha Holdings',
        'section.class_of_business': 'Marine',
        'section.line_size': '10.00%',
    }
    return [
        Object.fromEntries(fields.map(f => [f, SAMPLE[f] ?? `[${f}]`])),
        Object.fromEntries(fields.map(f => [f, '—'])),
    ]
}

function triggerCsvDownload(config: BordereauConfig, rows: Record<string, string>[]) {
    const header = config.fields.join(',')
    const body = rows.map(row => config.fields.map(f => `"${row[f] ?? ''}"`).join(',')).join('\n')
    const csv = `${header}\n${body}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const date = new Date().toISOString().slice(0, 10)
    const a = document.createElement('a')
    a.href = url
    a.download = `${config.name.replace(/\s+/g, '-')}-${date}.csv`
    a.click()
    URL.revokeObjectURL(url)
}

export default function BordereauRunPage() {
    const { id = '', configId = '' } = useParams<{ id: string; configId: string }>()
    const { state } = useLocation()

    const [config, setConfig] = useState<BordereauConfig | null>((state as any)?.config ?? null)
    const [loadError, setLoadError] = useState(false)

    useEffect(() => {
        // If config was passed via route state (navigate from BAViewPage), skip API call
        if (config) return
        if (!id) return
        getBordereauConfigs(+id)
            .then(configs => {
                const found = configs.find(c => c.config_id === configId)
                if (found) {
                    setConfig({
                        id: found.config_id,
                        name: found.name,
                        type: found.type,
                        dataStyle: found.data_style,
                        fields: found.fields,
                        createdAt: typeof found.created_at === 'string' ? found.created_at.slice(0, 10) : new Date(found.created_at).toISOString().slice(0, 10),
                    })
                } else {
                    setLoadError(true)
                }
            })
            .catch(() => setLoadError(true))
    }, [id, configId]) // eslint-disable-line react-hooks/exhaustive-deps

    const rows = useMemo(() => (config ? buildPreviewRows(config.fields) : []), [config])

    if (loadError) {
        return (
            <div className="p-6 text-sm text-red-600">
                Bordereau configuration not found.{' '}
                <Link to={`/binding-authorities/${id}`} className="text-brand-600 hover:underline ml-2">
                    ← Back to Binding Authority
                </Link>
            </div>
        )
    }

    if (!config) {
        return null
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                        {config.name}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Type: {config.type} &bull; Style: {config.dataStyle}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => triggerCsvDownload(config, rows)}
                        className="inline-flex items-center gap-1.5 rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                        Export
                    </button>
                    <Link
                        to={`/binding-authorities/${id}`}
                        className="text-sm text-brand-600 hover:underline"
                    >
                        ← Back to Binding Authority
                    </Link>
                </div>
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto rounded border border-gray-200">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr className="border-b border-gray-200">
                            {config.fields.map(f => (
                                <th
                                    key={f}
                                    scope="col"
                                    className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                                >
                                    {f}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                {config.fields.map(f => (
                                    <td key={f} className="px-4 py-2 text-gray-700 whitespace-nowrap">
                                        {row[f]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
