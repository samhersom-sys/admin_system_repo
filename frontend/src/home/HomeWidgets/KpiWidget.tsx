import { useEffect, useState } from 'react'
import { get } from '@/shared/lib/api-client/api-client'
import { number, currency } from '@/shared/lib/formatters/formatters'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import Card from '@/shared/Card/Card'

/**
 * KpiWidget � dual-scope key performance indicators.
 *
 * Displays both organisation-wide totals and the current user's totals
 * for open submissions, quotes, bound policies, binding authorities, and YTD GWP.
 *
 * Architecture rules:
 *   - No raw HTTP calls � uses api-client.get() for all requests.
 *   - No hardcoded hex colour values � Tailwind classes only.
 *   - No imports from domains/ or sharedmodules/.
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
            {orgValue !== null ? fmt(orgValue) : '�'}
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

    // Helper � backend returns raw arrays for list endpoints
    function arrayLen(result: PromiseSettledResult<unknown>) {
      return result.status === 'fulfilled' && Array.isArray(result.value)
        ? result.value.length
        : null
    }

    // Helper � gwp-summary returns { total: number }
    function gwpTotal(result: PromiseSettledResult<unknown>) {
      if (result.status !== 'fulfilled') return null
      const val = result.value as { total?: unknown }
      return typeof val?.total === 'number' ? val.total : null
    }

    async function fetchAll() {
      try {
        const results = await Promise.allSettled([
          get(`/api/submissions?orgCode=${orgCode}`, {}),
          get(`/api/submissions?assignedTo=${userId}`, {}),
          get(`/api/quotes?orgCode=${orgCode}`, {}),
          get(`/api/quotes?assignedTo=${userId}`, {}),
          get(`/api/policies?orgCode=${orgCode}&status=bound`, {}),
          get(`/api/policies?assignedTo=${userId}&status=bound`, {}),
          get(`/api/binding-authorities?orgCode=${orgCode}`, {}),
          get(`/api/policies/gwp-summary?orgCode=${orgCode}`, {}),
          get(`/api/policies/gwp-summary?userId=${userId}`, {}),
        ])

        const [orgSubs, userSubs, orgQts, userQts, orgPols, userPols, orgBAs, orgGwpRes, userGwpRes] = results

        const allFailed = results.every((r) => r.status === 'rejected')
        if (allFailed) {
          if (!cancelled) setError('Unable to load KPI data. Please refresh.')
          return
        }

        if (!cancelled) {
          setData({
            orgSubmissions: arrayLen(orgSubs),
            userSubmissions: arrayLen(userSubs),
            orgQuotes: arrayLen(orgQts),
            userQuotes: arrayLen(userQts),
            orgPolicies: arrayLen(orgPols),
            userPolicies: arrayLen(userPols),
            orgBindingAuthorities: arrayLen(orgBAs),
            orgGwp: gwpTotal(orgGwpRes),
            userGwp: gwpTotal(userGwpRes),
          })
        }
      } catch (err) {
        if (!cancelled) {
          setError('Unable to load KPI data. Please refresh.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAll()
    return () => { cancelled = true }
  }, [orgCode, userId])

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
