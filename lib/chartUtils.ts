import { type Period } from './chartAggregation'

export type MetricType = 'rm' | 'bw' | 'volume'

export const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const

export function formatTooltipDate(dateStr: string): string {
  const [, mm, dd] = dateStr.split('-')
  return `${MONTH_ABBR[parseInt(mm) - 1]} ${parseInt(dd)}`
}

export function smartYAxis(values: number[], metricType: MetricType): { yMin: number; yMax: number; step: number } {
  const valid = values.filter(v => Number.isFinite(v))
  if (valid.length === 0) {
    if (metricType === 'volume') return { yMin: 0, yMax: 2000, step: 500 }
    if (metricType === 'bw') return { yMin: 55, yMax: 75, step: 5 }
    return { yMin: 60, yMax: 120, step: 10 }
  }
  const lo = Math.min(...valid)
  const hi = Math.max(...valid)
  const rawRange = hi - lo

  let step: number, minRange: number, pad: number

  if (metricType === 'rm') {
    step = 5; minRange = 15; pad = 5
  } else if (metricType === 'bw') {
    step = rawRange > 15 ? 5 : rawRange > 8 ? 2 : 1
    minRange = 5; pad = 2
  } else {
    step = hi < 2000 ? 200 : hi < 10000 ? 500 : hi < 50000 ? 2000 : 10000
    minRange = step * 3; pad = step
  }

  const safeRange = Math.max(rawRange, minRange)
  const padding = Math.max(pad, safeRange * 0.25)
  const yMin = Math.max(0, Math.floor((lo - padding) / step) * step)
  const yMax = Math.ceil((hi + padding) / step) * step
  return { yMin, yMax, step }
}

export function yAxisTicks(yMin: number, yMax: number, step: number): number[] {
  const all: number[] = []
  for (let v = yMin; v <= yMax + 1e-9; v += step) all.push(Math.round(v * 1000) / 1000)
  if (all.length <= 7) return all
  const skip = Math.ceil(all.length / 7)
  return all.filter((_, i) => i % skip === 0 || i === all.length - 1)
}

export function computeChartWidth(n: number, minWidth: number, pointWidth: number): number {
  return Math.max(minWidth, n * pointWidth + 60)
}

export function getPointWidth(period: Period, chartType: 'line' | 'bar'): number {
  if (chartType === 'bar') {
    switch (period) {
      case '30D': return 9
      case '90D': return 8
      case '6M':  return 7
      case '1Y':  return 6
      case 'All': return 5
    }
  }
  switch (period) {
    case '30D': return 20
    case '90D': return 16
    case '6M':  return 14
    case '1Y':  return 12
    case 'All': return 10
  }
}

// Selects explicit tick dates and prevents duplicate month-year labels.
// pixelsPerLabel controls density: lower = more ticks (default 88).
export function buildXAxisConfig(
  data: Array<{ date: string }>,
  chartWidth: number,
  period: Period,
  pixelsPerLabel = 88
): { ticks: string[]; formatter: (date: string) => string } {
  const n = data.length
  if (n === 0) return { ticks: [], formatter: () => '' }

  const targetCount = Math.max(3, Math.round(chartWidth / pixelsPerLabel))
  const step = Math.max(1, Math.round(n / targetCount))
  const idxSet = new Set<number>()
  for (let i = 0; i < n; i += step) idxSet.add(i)
  idxSet.add(n - 1)

  const shownDates = [...idxSet].sort((a, b) => a - b).map(i => data[i].date)

  const monthCount = new Map<string, number>()
  for (const d of shownDates) {
    const k = d.slice(0, 7)
    monthCount.set(k, (monthCount.get(k) ?? 0) + 1)
  }
  const hasDupMonth = [...monthCount.values()].some(v => v > 1)

  const formatter = (dateStr: string): string => {
    const [year, mm, dd] = dateStr.split('-')
    const mon = MONTH_ABBR[parseInt(mm) - 1]
    const day = parseInt(dd)
    const yr  = year.slice(2)
    if ((period === '1Y' || period === 'All') && !hasDupMonth) {
      return `${mon} '${yr}`
    }
    return `${mon} ${day}`
  }

  return { ticks: shownDates, formatter }
}
