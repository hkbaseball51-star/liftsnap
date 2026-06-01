export type Period = '30D' | '90D' | '6M' | '1Y' | 'All'
export const PERIODS: Period[] = ['30D', '90D', '6M', '1Y', 'All']

type BWPoint  = { date: string; label: string; weight: number }
type VolPoint = { date: string; label: string; volume: number }
type RMPoint  = { date: string; label: string; est1rm: number }

const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function getStartDate(period: Period): string | null {
  if (period === 'All') return null
  const d = new Date(Date.now() + 9 * 3600 * 1000)
  if (period === '30D') d.setDate(d.getDate() - 30)
  else if (period === '90D') d.setDate(d.getDate() - 90)
  else if (period === '6M') d.setMonth(d.getMonth() - 6)
  else if (period === '1Y') d.setFullYear(d.getFullYear() - 1)
  return d.toISOString().split('T')[0]
}

// Always day-precision ("Mar 2"). XAxis tickFormatter handles month-year grouping when safe.
function formatLabel(dateStr: string): string {
  const [, mm, dd] = dateStr.split('-')
  return `${M[parseInt(mm) - 1]} ${parseInt(dd)}`
}

// All functions return every raw data point — no bucketing.

export function aggregateBodyWeight(data: BWPoint[]): BWPoint[] {
  return data.map(p => ({ ...p, label: formatLabel(p.date) }))
}

export function aggregateVolume(data: VolPoint[]): VolPoint[] {
  return data.map(p => ({ ...p, label: formatLabel(p.date) }))
}

export function aggregate1RM(data: RMPoint[]): RMPoint[] {
  return data.map(p => ({ ...p, label: formatLabel(p.date) }))
}
