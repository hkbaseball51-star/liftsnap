'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Share2, ArrowLeft } from 'lucide-react'

type RMPoint  = { date: string; label: string; est1rm: number }
type VolPoint = { date: string; label: string; volume: number }
type BWPoint  = { date: string; label: string; weight: number }

export type StatsData =
  | { type: 'max1rm';    exerciseName: string; bestRM: number; bestDate: string; bestSet: { weight: number; reps: number } | null; history: RMPoint[];  sessionCount: number }
  | { type: 'volume';    exerciseName: string; totalVolume: number; sessionCount: number; history: VolPoint[] }
  | { type: 'bodyweight'; currentWeight: number; change: number; history: BWPoint[] }

type Theme     = 'dark' | 'transparent'
type Accent    = 'orange' | 'purple' | 'dark'
type ChartType = 'bar' | 'line'

/* ── Per-accent tokens ─────────────────────────────────────── */
const AC: Record<Accent, {
  hex: string; badgeBg: string; badgeBorder: string; badgeText: string
  cardBorder: string; topLine: string
  barActive: string; barInactive: string; barTrack: string
}> = {
  orange: { hex: '#ff6b00', badgeBg: 'rgba(255,107,0,0.14)', badgeBorder: 'rgba(255,107,0,0.3)',  badgeText: '#ff6b00', cardBorder: 'rgba(255,107,0,0.35)',  topLine: '#ff6b00', barActive: '#ff6b00', barInactive: 'rgba(255,107,0,0.38)',  barTrack: 'rgba(255,107,0,0.07)' },
  purple: { hex: '#a855f7', badgeBg: 'rgba(168,85,247,0.14)', badgeBorder: 'rgba(168,85,247,0.3)', badgeText: '#a855f7', cardBorder: 'rgba(168,85,247,0.35)', topLine: '#a855f7', barActive: '#a855f7', barInactive: 'rgba(168,85,247,0.38)', barTrack: 'rgba(168,85,247,0.07)' },
  dark:   { hex: 'rgba(255,255,255,0.7)', badgeBg: 'rgba(255,255,255,0.06)', badgeBorder: 'rgba(255,255,255,0.18)', badgeText: 'rgba(255,255,255,0.6)', cardBorder: 'rgba(255,255,255,0.1)', topLine: 'rgba(255,255,255,0.18)', barActive: 'rgba(255,255,255,0.6)', barInactive: 'rgba(255,255,255,0.18)', barTrack: 'rgba(255,255,255,0.04)' },
}

const AREA_FILL: Record<Accent, string> = {
  orange: 'rgba(255,107,0,0.09)',
  purple: 'rgba(168,85,247,0.09)',
  dark:   'rgba(255,255,255,0.04)',
}

/* ── Helpers ───────────────────────────────────────────────── */
function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/* ── Canvas helpers ────────────────────────────────────────── */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function f(size: number, weight: 400 | 500 | 600 | 700 = 400): string {
  const w = weight >= 700 ? 'bold ' : weight === 400 ? '' : `${weight} `
  return `${w}${size}px system-ui, -apple-system, sans-serif`
}

type ChartPoint = { date: string; value: number }

function drawBarChart(
  ctx: CanvasRenderingContext2D,
  data: ChartPoint[], x: number, y: number, w: number, h: number,
  ac: typeof AC[Accent]
) {
  if (!data.length) return
  const maxVal = Math.max(...data.map(d => d.value))
  const n = Math.min(data.length, 12)
  const subset = data.slice(-n)
  const slotW = Math.floor(w / subset.length)
  const barW = Math.max(Math.floor(slotW * 0.55), 24)

  subset.forEach((point, i) => {
    const isLast = i === subset.length - 1
    const barH = maxVal > 0 ? Math.round((point.value / maxVal) * h * 0.88) : 4
    const bx = x + i * slotW + Math.floor((slotW - barW) / 2)
    const by = y + h - barH

    ctx.fillStyle = ac.barTrack; ctx.fillRect(bx, y, barW, h)
    ctx.fillStyle = isLast ? ac.barActive : ac.barInactive
    ctx.fillRect(bx, by, barW, barH)

    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    ctx.font = f(22); ctx.textAlign = 'center'
    ctx.fillText(fmtShort(point.date), bx + barW / 2, y + h + 40)
  })
  ctx.textAlign = 'left'
}

function drawLineChart(
  ctx: CanvasRenderingContext2D,
  data: ChartPoint[], x: number, y: number, w: number, h: number,
  ac: typeof AC[Accent], accent: Accent
) {
  if (data.length < 2) { drawBarChart(ctx, data, x, y, w, h, ac); return }

  const n = Math.min(data.length, 12)
  const subset = data.slice(-n)
  const maxVal = Math.max(...subset.map(d => d.value))
  const minVal = Math.min(...subset.map(d => d.value))
  const range  = maxVal - minVal || maxVal * 0.1 || 1
  const padY   = h * 0.1

  const px = (i: number) => x + (i / (subset.length - 1)) * w
  const py = (v: number) => y + h - padY - ((v - minVal) / range) * (h - padY * 2)

  // Area fill
  ctx.beginPath()
  ctx.moveTo(px(0), py(subset[0].value))
  for (let i = 1; i < subset.length; i++) ctx.lineTo(px(i), py(subset[i].value))
  ctx.lineTo(px(subset.length - 1), y + h); ctx.lineTo(x, y + h); ctx.closePath()
  ctx.fillStyle = AREA_FILL[accent]; ctx.fill()

  // Line
  ctx.beginPath()
  ctx.moveTo(px(0), py(subset[0].value))
  for (let i = 1; i < subset.length; i++) ctx.lineTo(px(i), py(subset[i].value))
  ctx.strokeStyle = ac.barActive; ctx.lineWidth = 5
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke()

  // Dots + glow on last
  subset.forEach((point, i) => {
    const isLast = i === subset.length - 1
    const cx = px(i), cy2 = py(point.value)
    if (isLast) {
      ctx.beginPath(); ctx.arc(cx, cy2, 22, 0, Math.PI * 2)
      ctx.strokeStyle = AREA_FILL[accent].replace('0.09', '0.35')
      ctx.lineWidth = 3; ctx.stroke()
    }
    ctx.beginPath(); ctx.arc(cx, cy2, isLast ? 11 : 5, 0, Math.PI * 2)
    ctx.fillStyle = isLast ? ac.barActive : 'rgba(255,255,255,0.35)'; ctx.fill()
  })

  // Date labels
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.font = f(22); ctx.textAlign = 'center'
  subset.forEach((point, i) => ctx.fillText(fmtShort(point.date), px(i), y + h + 40))
  ctx.textAlign = 'left'
}

/* ── Canvas card generation ────────────────────────────────── */
async function generateStatsCard(
  data: StatsData, theme: Theme, accent: Accent, chartType: ChartType
): Promise<Blob> {
  const W = 1080, H = 1920
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!
  const ac = AC[accent]
  const heroColor = accent === 'dark' ? '#ffffff' : ac.hex

  // Background
  ctx.fillStyle = theme === 'dark' ? '#0a0a0a' : 'rgba(10,10,10,0.8)'
  ctx.fillRect(0, 0, W, H)

  // Top accent line (3px, more premium feel)
  ctx.fillStyle = ac.topLine; ctx.fillRect(0, 0, W, 6)

  // Badge
  ctx.fillStyle = ac.badgeBg
  roundRect(ctx, 80, 100, 268, 68, 14); ctx.fill()
  if (accent === 'dark') {
    ctx.strokeStyle = ac.badgeBorder; ctx.lineWidth = 1.5
    roundRect(ctx, 80, 100, 268, 68, 14); ctx.stroke()
  }
  ctx.fillStyle = ac.badgeText; ctx.font = f(28, 700)
  ctx.fillText('LIFTSNAP', 112, 147)

  const divLine = (y: number) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(80, y); ctx.lineTo(W - 80, y); ctx.stroke()
  }

  // ── Derive per-type values ──────────────────────────────────
  let metricLabel: string
  let exerciseName: string | null = null
  let subLabel: string
  let heroStr: string
  let supp1: string | null = null
  let supp2: string | null = null
  let supp2Color = 'rgba(255,255,255,0.55)'
  let bestDateStr: string | null = null
  let chartData: ChartPoint[] = []
  let sessionCountLabel: string
  let historyRows: { label: string; value: string; highlight: boolean }[] = []

  if (data.type === 'max1rm') {
    metricLabel = 'MAX 1RM'
    exerciseName = data.exerciseName
    subLabel = 'ESTIMATED 1RM'
    heroStr = String(data.bestRM)
    if (data.bestSet) supp1 = `Best Set  ${data.bestSet.weight} kg × ${data.bestSet.reps} reps`
    if (data.history.length >= 2) {
      const gain = Math.round((data.bestRM - data.history[0].est1rm) * 10) / 10
      supp2 = gain > 0 ? `+${gain} kg from first session` : `${gain} kg from first session`
      supp2Color = gain > 0 ? '#22c55e' : 'rgba(255,255,255,0.4)'
    }
    bestDateStr = fmtDate(data.bestDate)
    chartData = data.history.map(d => ({ date: d.date, value: d.est1rm }))
    sessionCountLabel = `${data.sessionCount} SESSIONS LOGGED`
    historyRows = data.history.slice(-5).reverse().map(d => ({
      label: fmtShort(d.date), value: `${d.est1rm} kg`, highlight: d.est1rm === data.bestRM,
    }))
  } else if (data.type === 'volume') {
    metricLabel = 'DAILY VOLUME'
    exerciseName = data.exerciseName
    subLabel = 'MAX SESSION'
    const maxVol = data.history.length ? Math.max(...data.history.map(d => d.volume)) : 0
    heroStr = maxVol >= 10000 ? `${(maxVol / 1000).toFixed(1)}k` : maxVol.toLocaleString()
    supp1 = `${data.totalVolume >= 10000 ? `${(data.totalVolume / 1000).toFixed(1)}k` : data.totalVolume.toLocaleString()} kg total accumulated`
    supp2 = `${data.sessionCount} sessions`
    supp2Color = 'rgba(255,255,255,0.45)'
    if (data.history.length) bestDateStr = fmtDate(data.history[data.history.length - 1].date)
    chartData = data.history.map(d => ({ date: d.date, value: d.volume }))
    sessionCountLabel = `${data.sessionCount} SESSIONS`
    historyRows = data.history.slice(-5).reverse().map(d => ({
      label: fmtShort(d.date),
      value: d.volume >= 1000 ? `${(d.volume / 1000).toFixed(1)}k` : `${d.volume.toLocaleString()} kg`,
      highlight: false,
    }))
  } else {
    metricLabel = 'BODY WEIGHT'
    subLabel = 'CURRENT WEIGHT'
    heroStr = String(data.currentWeight)
    if (data.change !== 0) {
      supp1 = `${data.change > 0 ? '+' : ''}${data.change} kg since start`
    }
    if (data.history.length >= 2) {
      supp2 = `${data.history[0].weight} kg → ${data.currentWeight} kg`
      supp2Color = 'rgba(255,255,255,0.35)'
    }
    if (data.history.length) bestDateStr = fmtDate(data.history[data.history.length - 1].date)
    chartData = data.history.map(d => ({ date: d.date, value: d.weight }))
    sessionCountLabel = `${data.history.length} RECORDS`
    historyRows = data.history.slice(-5).reverse().map(d => ({
      label: fmtShort(d.date), value: `${d.weight} kg`, highlight: false,
    }))
  }

  // ── Draw content with y-cursor ──────────────────────────────
  let cy = 228

  ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.font = f(32, 500)
  ctx.fillText(metricLabel, 80, cy); cy += 80

  if (exerciseName) {
    ctx.fillStyle = '#fff'; ctx.font = f(62, 700)
    const ex = exerciseName.length > 22 ? exerciseName.slice(0, 20) + '…' : exerciseName
    ctx.fillText(ex, 80, cy); cy += 88
  } else {
    cy += 32 // extra breathing room for body weight card
  }

  cy += 14; divLine(cy); cy += 58

  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = f(26, 500)
  ctx.fillText(subLabel, 80, cy); cy += 36

  cy += 108  // room for large number

  // Hero number
  ctx.fillStyle = heroColor; ctx.font = f(168, 700)
  ctx.fillText(heroStr, 80, cy)
  const heroW = ctx.measureText(heroStr).width
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = f(58, 500)
  ctx.fillText(' kg', 80 + heroW + 12, cy - 14)
  cy += 80

  if (supp1) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = f(34)
    ctx.fillText(supp1, 80, cy)
  }
  cy += 62

  if (supp2) {
    ctx.fillStyle = supp2Color; ctx.font = f(34)
    ctx.fillText(supp2, 80, cy)
  }
  cy += 62

  if (bestDateStr) {
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.font = f(28)
    ctx.fillText(bestDateStr, 80, cy)
  }
  cy += 68

  divLine(cy); cy += 52

  ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.font = f(26, 500)
  ctx.fillText('PROGRESSION', 80, cy); cy += 46

  const chartH = 252
  if (chartType === 'line') {
    drawLineChart(ctx, chartData, 80, cy, W - 160, chartH, ac, accent)
  } else {
    drawBarChart(ctx, chartData, 80, cy, W - 160, chartH, ac)
  }
  cy += chartH + 56

  divLine(cy); cy += 52

  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.font = f(26, 500)
  ctx.fillText(sessionCountLabel, 80, cy); cy += 60

  historyRows.forEach(row => {
    ctx.fillStyle = 'rgba(255,255,255,0.32)'; ctx.font = f(34)
    ctx.fillText(row.label, 80, cy)
    ctx.fillStyle = row.highlight ? heroColor : 'rgba(255,255,255,0.65)'
    ctx.font = f(34, 700)
    ctx.fillText(row.value, W - 80 - ctx.measureText(row.value).width, cy)
    cy += 66
  })

  // Watermark
  ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.font = f(26)
  ctx.fillText('Made with LIFTSNAP · liftsnap.app', 80, H - 72)

  return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/png'))
}

/* ── SVG line chart for DOM preview ───────────────────────── */
function LinePreview({
  data, ac, accent,
}: {
  data: { date: string; value: number }[]
  ac: typeof AC[Accent]
  accent: Accent
}) {
  if (data.length < 2) return null
  const n = Math.min(data.length, 12)
  const subset = data.slice(-n)
  const W = 100, H = 38
  const maxVal = Math.max(...subset.map(d => d.value))
  const minVal = Math.min(...subset.map(d => d.value))
  const range = maxVal - minVal || maxVal * 0.1 || 1
  const padY = H * 0.1
  const px = (i: number) => (i / (subset.length - 1)) * W
  const py = (v: number) => H - padY - ((v - minVal) / range) * (H - padY * 2)
  const pts = subset.map((d, i) => `${px(i)},${py(d.value)}`).join(' ')
  const area = `0,${H} ${pts} ${W},${H}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
      <polygon points={area} fill={AREA_FILL[accent]} />
      <polyline points={pts} fill="none" stroke={ac.barActive} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      {subset.map((d, i) => (
        <circle key={i} cx={px(i)} cy={py(d.value)}
          r={i === subset.length - 1 ? 2.5 : 1.4}
          fill={i === subset.length - 1 ? ac.barActive : 'rgba(255,255,255,0.38)'} />
      ))}
    </svg>
  )
}

/* ── Component ─────────────────────────────────────────────── */
export default function StatsShareView({ data }: { data: StatsData }) {
  const router = useRouter()
  const [theme, setTheme]         = useState<Theme>('dark')
  const [accent, setAccent]       = useState<Accent>('orange')
  const [chartType, setChartType] = useState<ChartType>(
    data.type === 'volume' ? 'bar' : 'line'  // smart default
  )
  const [sharing, setSharing] = useState(false)
  const [status, setStatus]   = useState('')

  const handleShare = async () => {
    setSharing(true); setStatus('Generating card...')
    try {
      const blob = await generateStatsCard(data, theme, accent, chartType)
      const file = new File([blob], 'liftsnap-stats.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        setStatus('Sharing...')
        await navigator.share({ files: [file], title: 'LIFTSNAP Stats' })
        setStatus('')
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = 'liftsnap-stats.png'; a.click()
        URL.revokeObjectURL(url)
        setStatus('Downloaded!'); setTimeout(() => setStatus(''), 2000)
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') setStatus('Error occurred')
      else setStatus('')
    } finally { setSharing(false) }
  }

  const ac = AC[accent]

  // ── Preview computed values ─────────────────────────────────
  let metricLabel: string
  let exerciseName: string | null = null
  let subLabel: string
  let heroNum: string
  let supp1: string | null = null
  let supp2: string | null = null
  let supp2Color = 'rgba(255,255,255,0.55)'
  let bestDateStr: string | null = null
  let chartData: { date: string; value: number }[] = []
  let historyRows: { label: string; value: string; highlight: boolean }[] = []

  if (data.type === 'max1rm') {
    metricLabel = 'MAX 1RM'; exerciseName = data.exerciseName; subLabel = 'ESTIMATED 1RM'
    heroNum = `${data.bestRM} kg`
    if (data.bestSet) supp1 = `Best Set  ${data.bestSet.weight} × ${data.bestSet.reps} reps`
    if (data.history.length >= 2) {
      const gain = Math.round((data.bestRM - data.history[0].est1rm) * 10) / 10
      supp2 = gain > 0 ? `+${gain} kg from first` : `${gain} kg from first`
      supp2Color = gain > 0 ? '#22c55e' : 'rgba(255,255,255,0.45)'
    }
    bestDateStr = fmtDate(data.bestDate)
    chartData = data.history.map(d => ({ date: d.date, value: d.est1rm }))
    historyRows = data.history.slice(-5).reverse().map(d => ({ label: fmtShort(d.date), value: `${d.est1rm} kg`, highlight: d.est1rm === data.bestRM }))
  } else if (data.type === 'volume') {
    metricLabel = 'DAILY VOLUME'; exerciseName = data.exerciseName; subLabel = 'MAX SESSION'
    const maxVol = data.history.length ? Math.max(...data.history.map(d => d.volume)) : 0
    heroNum = `${maxVol >= 10000 ? `${(maxVol / 1000).toFixed(1)}k` : maxVol.toLocaleString()} kg`
    supp1 = `${data.totalVolume >= 10000 ? `${(data.totalVolume / 1000).toFixed(1)}k` : data.totalVolume.toLocaleString()} kg total`
    supp2 = `${data.sessionCount} sessions`; supp2Color = 'rgba(255,255,255,0.4)'
    if (data.history.length) bestDateStr = fmtDate(data.history[data.history.length - 1].date)
    chartData = data.history.map(d => ({ date: d.date, value: d.volume }))
    historyRows = data.history.slice(-5).reverse().map(d => ({ label: fmtShort(d.date), value: d.volume >= 1000 ? `${(d.volume / 1000).toFixed(1)}k` : `${d.volume.toLocaleString()} kg`, highlight: false }))
  } else {
    metricLabel = 'BODY WEIGHT'; subLabel = 'CURRENT WEIGHT'
    heroNum = `${data.currentWeight} kg`
    if (data.change !== 0) { supp1 = `${data.change > 0 ? '+' : ''}${data.change} kg since start`; supp2Color = data.change <= 0 ? '#22c55e' : '#ef4444' }
    if (data.history.length >= 2) { supp2 = `${data.history[0].weight} → ${data.currentWeight} kg`; supp2Color = 'rgba(255,255,255,0.35)' }
    if (data.history.length) bestDateStr = fmtDate(data.history[data.history.length - 1].date)
    chartData = data.history.map(d => ({ date: d.date, value: d.weight }))
    historyRows = data.history.slice(-5).reverse().map(d => ({ label: fmtShort(d.date), value: `${d.weight} kg`, highlight: false }))
  }

  const maxVal = chartData.length ? Math.max(...chartData.map(d => d.value)) : 1
  const heroColor = accent === 'dark' ? '#ffffff' : ac.hex

  return (
    <div className="min-h-screen pb-nav flex flex-col" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl" style={{ background: '#1a1a1a' }}>
          <ArrowLeft size={18} style={{ color: '#888' }} />
        </button>
        <h1 className="text-base font-black tracking-widest text-white">Share Story</h1>
      </div>

      {/* ── 9:16 Preview ───────────────────────────────────────── */}
      <div className="px-4 mb-5">
        <div className="w-full rounded-3xl overflow-hidden relative"
          style={{ aspectRatio: '9/16', background: theme === 'dark' ? '#0a0a0a' : 'rgba(10,10,10,0.8)', border: `1px solid ${ac.cardBorder}` }}>
          {theme === 'transparent' && (
            <div className="absolute inset-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M0 0h20v20H0V0zm20 20h20v20H20V20z'/%3E%3C/g%3E%3C/svg%3E")` }} />
          )}
          {/* Top accent stripe */}
          <div className="absolute top-0 inset-x-0" style={{ height: 2, background: ac.topLine }} />

          <div className="relative flex flex-col h-full" style={{ padding: '14px 16px 10px' }}>
            {/* Badge */}
            <div className="inline-flex mb-3">
              <span className="text-[10px] font-black px-2.5 py-1 rounded-lg"
                style={{ background: ac.badgeBg, color: ac.badgeText, border: `1px solid ${ac.badgeBorder}`, letterSpacing: '0.12em' }}>
                LIFTSNAP
              </span>
            </div>

            {/* Metric + Exercise */}
            <p style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.1em', marginBottom: 3 }}>
              {metricLabel}
            </p>
            {exerciseName && (
              <p style={{ fontSize: 15, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 6 }}>
                {exerciseName}
              </p>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 8 }} />

            {/* Sub-label */}
            <p style={{ fontSize: 8, fontWeight: 500, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em', marginBottom: 4 }}>
              {subLabel}
            </p>

            {/* Hero number */}
            <div className="flex items-baseline gap-1 mb-1">
              <span style={{ fontSize: 40, fontWeight: 900, color: heroColor, lineHeight: 1, letterSpacing: '-0.02em' }}>
                {heroNum.replace(' kg', '').replace('kg', '')}
              </span>
              <span style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.25)' }}>kg</span>
            </div>

            {/* Supplements */}
            {supp1 && <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginBottom: 1.5 }}>{supp1}</p>}
            {supp2 && <p style={{ fontSize: 9, color: supp2Color, marginBottom: 1.5 }}>{supp2}</p>}
            {bestDateStr && <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.22)', marginBottom: 6 }}>{bestDateStr}</p>}

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 5 }} />

            {/* Chart label */}
            <p style={{ fontSize: 7, fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', marginBottom: 4 }}>
              PROGRESSION
            </p>

            {/* Chart */}
            <div style={{ height: 46, marginBottom: 8 }}>
              {chartType === 'line' ? (
                <LinePreview data={chartData} ac={ac} accent={accent} />
              ) : (
                <div className="flex items-end gap-0.5 h-full">
                  {chartData.slice(-10).map((bar, i, arr) => (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end gap-px">
                      <div className="w-full rounded-sm"
                        style={{
                          height: `${Math.max(3, Math.round((bar.value / maxVal) * 40))}px`,
                          background: i === arr.length - 1 ? ac.barActive : ac.barInactive,
                        }} />
                      <span style={{ fontSize: 5.5, color: 'rgba(255,255,255,0.2)' }}>{fmtShort(bar.date)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 5 }} />

            {/* History rows */}
            <div className="flex-1 flex flex-col gap-1">
              {historyRows.map((row, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.3)' }}>{row.label}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: row.highlight ? heroColor : 'rgba(255,255,255,0.65)', fontFamily: 'var(--font-mono)' }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Watermark */}
            <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.1)', marginTop: 5 }}>
              Made with LIFTSNAP · liftsnap.app
            </p>
          </div>
        </div>
      </div>

      {/* ── Option selectors ───────────────────────────────────── */}
      {/* Background */}
      <div className="px-4 mb-3">
        <p className="text-[10px] font-bold mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>Background</p>
        <div className="flex gap-2">
          {(['dark', 'transparent'] as Theme[]).map(t => (
            <button key={t} className="flex-1 py-2.5 rounded-xl text-xs font-bold"
              style={{ background: theme === t ? '#ff6b00' : '#1a1a1a', color: theme === t ? '#fff' : '#666', border: `1px solid ${theme === t ? '#ff6b00' : '#2a2a2a'}` }}
              onClick={() => setTheme(t)}>
              {t === 'dark' ? 'Dark' : 'Transparent'}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div className="px-4 mb-3">
        <p className="text-[10px] font-bold mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>Color</p>
        <div className="flex gap-2">
          {(['orange', 'purple', 'dark'] as Accent[]).map(a => {
            const sel = accent === a
            const bg = sel ? (a === 'orange' ? '#ff6b00' : a === 'purple' ? '#a855f7' : '#3a3a3a') : '#1a1a1a'
            return (
              <button key={a} className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{ background: bg, color: '#fff', border: `1px solid ${sel ? bg : '#2a2a2a'}` }}
                onClick={() => setAccent(a)}>
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Chart Type */}
      <div className="px-4 mb-6">
        <p className="text-[10px] font-bold mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>Chart Type</p>
        <div className="flex gap-2">
          {(['bar', 'line'] as ChartType[]).map(ct => (
            <button key={ct} className="flex-1 py-2.5 rounded-xl text-xs font-bold"
              style={{ background: chartType === ct ? '#ff6b00' : '#1a1a1a', color: chartType === ct ? '#fff' : '#666', border: `1px solid ${chartType === ct ? '#ff6b00' : '#2a2a2a'}` }}
              onClick={() => setChartType(ct)}>
              {ct === 'bar' ? 'Bar' : 'Line'}
            </button>
          ))}
        </div>
      </div>

      {/* Share button */}
      <div className="px-4 space-y-2">
        {status && <p className="text-center text-sm" style={{ color: '#888' }}>{status}</p>}
        <button
          className="w-full py-4 rounded-2xl text-base font-black text-white flex items-center justify-center gap-2"
          style={{ background: '#ff6b00', boxShadow: '0 4px 20px rgba(255,107,0,0.3)' }}
          disabled={sharing} onClick={handleShare}>
          <Share2 size={20} />
          {sharing ? 'Generating...' : 'Share to Instagram Story'}
        </button>
        <p className="text-center text-xs" style={{ color: '#444' }}>
          Mobile only · Desktop downloads as PNG
        </p>
      </div>
    </div>
  )
}
