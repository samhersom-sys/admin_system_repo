import { useEffect, useRef, useState } from 'react'
import type { Chart as ChartJS } from 'chart.js'
import { get } from '@/shared/lib/api-client/api-client'
import { brandColors } from '@/shared/lib/design-tokens/brandColors'
import { monthYear } from '@/shared/lib/formatters/formatters'
import Card from '@/shared/Card/Card'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'

/**
 * GwpChartWidget � multi-line chart of monthly GWP by year.
 *
 * Uses Chart.js via canvas.  Mocked in unit tests (jsdom has no canvas).
 * Architecture rules: no hex literals, no direct fetch, no domains/ imports.
 */

export default function GwpChartWidget({ orgCode }: { orgCode: string }) {
  const canvasRef            = useRef<HTMLCanvasElement | null>(null)
  const chartInstanceRef     = useRef<ChartJS | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadChart() {
      try {
        const raw = await get<{ series?: Array<{ label: string; months: string[]; values: number[] }> }>(`/api/policies/gwp-monthly?orgCode=${orgCode}`, {})
        const seriesData = raw.series ?? []

        if (!cancelled && canvasRef.current) {
          const { Chart, registerables } = await import('chart.js')
          Chart.register(...registerables)

          if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy()
          }

          chartInstanceRef.current = new Chart(canvasRef.current, {
            type: 'line',
            data: {
              labels: seriesData[0]?.months?.map(monthYear) ?? [],
              datasets: seriesData.map((s, i) => ({
                label:           s.label,
                data:            s.values,
                borderColor:     brandColors.chart.series[i % brandColors.chart.series.length].border,
                backgroundColor: brandColors.chart.series[i % brandColors.chart.series.length].bg,
                tension:         0.3,
                fill:            false,
              })),
            },
            options: {
              responsive: true,
              plugins: { legend: { position: 'top' } },
              scales: {
                x: { ticks: { color: brandColors.chart.axis.ticks } },
                y: { ticks: { color: brandColors.chart.axis.ticks } },
              },
            },
          })
        }
      } catch (err) {
        if (!cancelled) setError('GWP chart data is not yet available.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadChart()
    return () => {
      cancelled = true
      chartInstanceRef.current?.destroy()
    }
  }, [orgCode])

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
          <canvas ref={canvasRef} aria-label="Monthly GWP chart" />
        )}
      </Card>
    </div>
  )
}
