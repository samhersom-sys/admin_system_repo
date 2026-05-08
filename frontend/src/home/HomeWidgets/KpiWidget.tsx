import { useEffect, useState } from 'react'
import { get } from '@/shared/lib/api-client/api-client'
import { number, currency } from '@/shared/lib/formatters/formatters'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import Card from '@/shared/Card/Card'

/**
 * KpiWidget — dual-scope key performance indicators.
 *
 * Displays both organisation-wide totals and the current user's totals
 * for submissions, quotes, active policies, binding authorities, and YTD GWP.
 *
 * Architecture rules:
 *   - No raw HTTP calls — uses api-client.get() for all requests.
 *   - No hardcoded hex colour values — Tailwind classes only.
 *   - No imports from domains/ or sharedmodules/.
 *   - Single API call to GET /api/home/kpi-summary (REQ-HOME-F-020).
 *     Count predicates on the backend are resolved from the field-mappings
 *     semantic layer (REQ-HOME-F-019) so measure changes propagate here automatically.
 */

interface KpiData {
  orgSubmissions: number | null
  userSubmissions: number | null
  orgQuotes: number | null
  userQuotes: number | null
  orgPolicies: number | null
  userPolicies: number | null
  orgBindingAuthorities: number | null
  orgGwp: number | null
  userGwp: number | null
}

const initialData: KpiData = {
  orgSubmissions: null,
  userSubmissions: null,
  orgQuotes: null,
  userQuotes: null,
  orgPolicies: null,
  userPolicies: null,
  orgBindingAuthorities: null,
  orgGwp: null,
  userGwp: null,
}

function MetricBlock({ label, orgValue, userValue, format = 'number' }: { label: string; orgValue: number | null; userValue: number | null; format?: string }) {
  const fmt = format === 'currency' ? currency : number
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-gray-500">
        {label}
      </p>
      <dl className="mt-2 flex items-end justify-between gap-4">
        <div>
          <dt className="text-xs text-gray-400">Total</dt>
          <dd className="text-xl font-bold text-gray-900">
            {orgValue !== null ? fmt(orgValue) : '—'}
          </dd>
        </div>
        {userValue !== null && (
          <div>
            <dt className="text-xs text-gray-400">Mine</dt>
            <dd className="text-base font-semibold text-gray-700">
              {fmt(userValue)}
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}

function BindingAuthorityBlock({ count }: { count: number | null }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-gray-500">
        Binding Authorities
      </p>
      <dl className="mt-2">
        <div>
          <dt className="text-xs text-gray-400">Active</dt>
          <dd className="text-xl font-bold text-gray-900">
            {count !== null ? number(count) : '�'}
          </dd>
        </div>
      </dl>
    </div>
  )
}

export default function KpiWidget({ orgCode, userId }: { orgCode: string; userId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState(initialData)

  useEffect(() => {
    let cancelled = false

    async function fetchAll() {
      try {
        // REQ-HOME-F-020 — single call; scope derived from JWT on the backend
        const summary = await get('/api/home/kpi-summary', {}) as {
          submissions: { org: number; user: number }
          quotes: { org: number; user: number }
          policies: { org: number; user: number }
          bindingAuthorities: { org: number }
          gwp: { org: number; user: number }
        }

        if (!cancelled) {
          setData({
            orgSubmissions: summary?.submissions?.org ?? null,
            userSubmissions: summary?.submissions?.user ?? null,
            orgQuotes: summary?.quotes?.org ?? null,
            userQuotes: summary?.quotes?.user ?? null,
            orgPolicies: summary?.policies?.org ?? null,
            userPolicies: summary?.policies?.user ?? null,
            orgBindingAuthorities: summary?.bindingAuthorities?.org ?? null,
            orgGwp: summary?.gwp?.org ?? null,
            userGwp: summary?.gwp?.user ?? null,
          })
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load KPI data. Please refresh.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAll()
    return () => { cancelled = true }
  }, [])

  return (
    <div data-testid="kpi-widget">
      <Card title="Key Metrics">
        {loading && (
          <div className="flex justify-center py-6">
            <LoadingSpinner label="Loading KPIs" />
          </div>
        )}

        {!loading && error && (
          <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            <MetricBlock
              label="Submissions"
              orgValue={data.orgSubmissions}
              userValue={data.userSubmissions}
            />
            <MetricBlock
              label="Quotes"
              orgValue={data.orgQuotes}
              userValue={data.userQuotes}
            />
            <MetricBlock
              label="Bound Policies"
              orgValue={data.orgPolicies}
              userValue={data.userPolicies}
            />
            <BindingAuthorityBlock count={data.orgBindingAuthorities} />
            <MetricBlock
              label="YTD GWP"
              orgValue={data.orgGwp}
              userValue={data.userGwp}
              format="currency"
            />
          </div>
        )}
      </Card>
    </div>
  )
}
