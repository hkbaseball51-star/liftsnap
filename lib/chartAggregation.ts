export type Period = '30D' | '90D' | '6M' | '1Y' | 'All'
export const PERIODS: Period[] = ['30D', '90D', '6M', '1Y', 'All']

type BWPoint  = { date: string; label: string; weight: number }
type VolPoint = { date: string; label: string; volume: number }
type RMPoint  = { date: string; label: string; est1rm: number }

const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function toMondayWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay() // 0=Sun
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d.toISOString().split('T')[0]
}

function weekLabel(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00')
  return `${M[d.getMonth()]} ${d.getDate()}`
}

function monthLabel(ym: string): string {
  const [year, month] = ym.split('-')
  return `${M[parseInt(month) - 1]} '${year.slice(2)}`
}

export function getStartDate(period: Period): string | null {
  if (period === 'All') return null
  const d = new Date(Date.now() + 9 * 3600 * 1000) // JST
  if (period === '30D') d.setDate(d.getDate() - 30)
  else if (period === '90D') d.setDate(d.getDate() - 90)
  else if (period === '6M') d.setMonth(d.getMonth() - 6)
  else if (period === '1Y') d.setFullYear(d.getFullYear() - 1)
  return d.toISOString().split('T')[0]
}

// ── Body Weight ────────────────────────────────────────────────
// 30D/90D: daily, 6M/1Y: weekly avg, All: monthly avg
export function aggregateBodyWeight(data: BWPoint[], period: Period): BWPoint[] {
  if (period === '30D' || period === '90D') return data

  if (period === '6M' || period === '1Y') {
    const map = new Map<string, { sum: number; n: number }>()
    for (const p of data) {
      const ws = toMondayWeekStart(p.date)
      const c = map.get(ws) ?? { sum: 0, n: 0 }
      map.set(ws, { sum: c.sum + p.weight, n: c.n + 1 })
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ws, { sum, n }]) => ({ date: ws, label: weekLabel(ws), weight: Math.round(sum / n * 10) / 10 }))
  }

  // All: monthly average
  const map = new Map<string, { sum: number; n: number }>()
  for (const p of data) {
    const key = p.date.slice(0, 7)
    const c = map.get(key) ?? { sum: 0, n: 0 }
    map.set(key, { sum: c.sum + p.weight, n: c.n + 1 })
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { sum, n }]) => ({ date: key + '-01', label: monthLabel(key), weight: Math.round(sum / n * 10) / 10 }))
}

// ── Daily Volume ───────────────────────────────────────────────
// 30D/90D: daily, 6M/1Y: weekly total, All: monthly total
export function aggregateVolume(data: VolPoint[], period: Period): VolPoint[] {
  if (period === '30D' || period === '90D') return data

  if (period === '6M' || period === '1Y') {
    const map = new Map<string, number>()
    for (const p of data) {
      const ws = toMondayWeekStart(p.date)
      map.set(ws, (map.get(ws) ?? 0) + p.volume)
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ws, volume]) => ({ date: ws, label: weekLabel(ws), volume: Math.round(volume) }))
  }

  // All: monthly total
  const map = new Map<string, number>()
  for (const p of data) {
    const key = p.date.slice(0, 7)
    map.set(key, (map.get(key) ?? 0) + p.volume)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, volume]) => ({ date: key + '-01', label: monthLabel(key), volume: Math.round(volume) }))
}

// ── Max 1RM ────────────────────────────────────────────────────
// 30D/90D: per record, 6M: weekly max, 1Y/All: monthly max
export function aggregate1RM(data: RMPoint[], period: Period): RMPoint[] {
  if (period === '30D' || period === '90D') return data

  if (period === '6M') {
    const map = new Map<string, number>()
    for (const p of data) {
      const ws = toMondayWeekStart(p.date)
      map.set(ws, Math.max(map.get(ws) ?? 0, p.est1rm))
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ws, est1rm]) => ({ date: ws, label: weekLabel(ws), est1rm }))
  }

  // 1Y and All: monthly max
  const map = new Map<string, number>()
  for (const p of data) {
    const key = p.date.slice(0, 7)
    map.set(key, Math.max(map.get(key) ?? 0, p.est1rm))
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, est1rm]) => ({ date: key + '-01', label: monthLabel(key), est1rm }))
}
