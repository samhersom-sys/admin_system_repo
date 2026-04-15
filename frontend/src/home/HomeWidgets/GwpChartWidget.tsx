import { useEffect, useRef, useState } from 'react'
import type { Chart as ChartJS } from 'chart.js'
import { get } from '@/shared/lib/api-client/api-client'
import { brandColors } from '@/shared/lib/design-tokens/brandColors'
import Card from '@/shared/Card/Card'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'

// Fixed 12-slot year-over-year axis — month name only, no year
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Extract 0-based month index from 'YYYY-MM'
function toMonthIndex(yearMonth: string): number {
  return parseInt(yearMonth.split('-')[1], 10) - 1
}

/**
 * GwpChartWidget � multi-line chart of monthly GWP by year.
 *
 * Uses Chart.js via canvas.  Mocked in unit tests (jsdom has no canvas).
 * Architecture rules: no hex literals, no direct fetch, no domains/ imports.
 */

type Series = { label: string; months: string[]; values: number[] }

export default function GwpChartWidget({ orgCode }: { orgCode: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chartInstanceRef = useRef<ChartJS | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [seriesData, setSeriesData] = useState<Series[]>([])

  // Effect 1: fetch data only
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    get<{ series?: Series[] }>(`/api/policies/gwp-monthly?orgCode=${orgCode}`, {})
      .then(raw => { if (!cancelled) setSeriesData(raw.series ?? []) })
      .catch(() => { if (!cancelled) setError('GWP chart data is not yet available.') })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [orgCode])

  // Effect 2: create chart after canvas is in DOM (runs after loading → false causes re-render)
  useEffect(() => {
    if (loading || error || !canvasRef.current || seriesData.length === 0) return

    let destroyed = false

    // Year-over-year: each series is mapped onto 12 fixed month slots (Jan–Dec)
    import('chart.js').then(({ Chart, registerables }) => {
      Chart.register(...registerables)
      if (destroyed || !canvasRef.current) return

      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
      }

      chartInstanceRef.current = new Chart(canvasRef.current, {
        type: 'line',
        data: {
          labels: MONTH_LABELS,
          datasets: seriesData.map((s, i) => ({
            label: s.label,
            data: MONTH_LABELS.map((_, mi) => {
              const idx = s.months.findIndex(m => toMonthIndex(m) === mi)
              return idx >= 0 ? s.values[idx] : null
            }),
            borderColor: brandColors.chart.series[i % brandColors.chart.series.length].border,
            backgroundColor: brandColors.chart.series[i % brandColors.chart.series.length].bg,
            tension: 0.3,
            fill: false,
            spanGaps: false,
          })),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } },
          scales: {
            x: { ticks: { color: brandColors.chart.axis.ticks } },
            y: { ticks: { color: brandColors.chart.axis.ticks } },
          },
        },
      })
    })

    return () => {
      destroyed = true
      chartInstanceRef.current?.destroy()
      chartInstanceRef.current = null
    }
  }, [seriesData, loading, error])

  return (
    <div data-testid="gwp-chart-widget">
      <Card title="Monthly GWP">
        {loading && (
          <div className="flex justify-center py-6">
            <LoadingSpinner label="Loading GWP chart" />
          </div>
        )}
        {!loading && error && (
          <div className="flex items-center justify-center py-8 text-sm text-gray-400">
            {error}
          </div>
        )}
        {!loading && !error && (
          <div className="h-[22vh] min-h-[140px] max-h-[320px]">
            <canvas ref={canvasRef} aria-label="Monthly GWP chart" />
          </div>
        )}
      </Card>
    </div>
  )
}
