'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Share2, ArrowLeft } from 'lucide-react'

type RMPoint  = { date: string; label: string; est1rm: number }
type VolPoint = { date: string; label: string; volume: number }
type BWPoint  = { date: string; label: string; weight: number }

export type StatsData =
  | { type: 'max1rm';     exerciseName: string; bestRM: number; bestDate: string; bestSet: { weight: number; reps: number } | null; history: RMPoint[];  sessionCount: number }
  | { type: 'volume';     exerciseName: string; totalVolume: number; sessionCount: number; history: VolPoint[] }
  | { type: 'bodyweight'; currentWeight: number; change: number; history: BWPoint[] }

type Theme     = 'dark' | 'transparent'
type Accent    = 'orange' | 'purple' | 'dark'
type ChartType = 'bar' | 'line'

/* ── Per-accent design tokens ─────────────────────────────── */
const AC: Record<Accent, {
  hex: string; badgeBg: string; badgeBorder: string; badgeText: string
  cardBorder: string; topLine: string
  barActive: string; barInactive: string; barTrack: string
}> = {
  orange: { hex:'#ff6b00', badgeBg:'rgba(255,107,0,0.14)', badgeBorder:'rgba(255,107,0,0.3)',  badgeText:'#ff6b00', cardBorder:'rgba(255,107,0,0.35)',  topLine:'#ff6b00', barActive:'#ff6b00', barInactive:'rgba(255,107,0,0.35)',  barTrack:'rgba(255,107,0,0.06)' },
  purple: { hex:'#a855f7', badgeBg:'rgba(168,85,247,0.14)', badgeBorder:'rgba(168,85,247,0.3)', badgeText:'#a855f7', cardBorder:'rgba(168,85,247,0.35)', topLine:'#a855f7', barActive:'#a855f7', barInactive:'rgba(168,85,247,0.35)', barTrack:'rgba(168,85,247,0.06)' },
  dark:   { hex:'rgba(255,255,255,0.7)', badgeBg:'rgba(255,255,255,0.06)', badgeBorder:'rgba(255,255,255,0.18)', badgeText:'rgba(255,255,255,0.6)', cardBorder:'rgba(255,255,255,0.1)', topLine:'rgba(255,255,255,0.18)', barActive:'rgba(255,255,255,0.6)', barInactive:'rgba(255,255,255,0.18)', barTrack:'rgba(255,255,255,0.04)' },
}

const AREA_FILL: Record<Accent, string> = {
  orange: 'rgba(255,107,0,0.1)',
  purple: 'rgba(168,85,247,0.1)',
  dark:   'rgba(255,255,255,0.05)',
}

/* ── Helpers ──────────────────────────────────────────────── */
function fmtShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/* ── Canvas font shorthand ───────────────────────────────── */
function f(size: number, weight: 400 | 500 | 700 = 400): string {
  return `${weight >= 700 ? 'bold ' : weight === 500 ? '500 ' : ''}${size}px system-ui,-apple-system,sans-serif`
}

/* ── Canvas roundRect ────────────────────────────────────── */
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r)
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r)
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r)
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r)
  ctx.closePath()
}

type ChartPt = { date: string; value: number }

/* ── BAR chart (canvas) ──────────────────────────────────── */
function canvasBar(ctx: CanvasRenderingContext2D, pts: ChartPt[], x: number, y: number, w: number, h: number, ac: typeof AC[Accent]) {
  if (!pts.length) return
  const n   = Math.min(pts.length, 14)
  const sub = pts.slice(-n)
  const max = Math.max(...sub.map(d => d.value))
  const slotW = w / n
  const barW  = Math.max(Math.floor(slotW * 0.52), 22)

  sub.forEach((pt, i) => {
    const isLast = i === sub.length - 1
    const bH = max > 0 ? Math.round((pt.value / max) * h * 0.9) : 4
    const bx = x + i * slotW + Math.floor((slotW - barW) / 2)
    const by = y + h - bH

    ctx.fillStyle = ac.barTrack;    ctx.fillRect(bx, y, barW, h)
    ctx.fillStyle = isLast ? ac.barActive : ac.barInactive
    ctx.fillRect(bx, by, barW, bH)

    if (isLast) {
      ctx.fillStyle = ac.barActive
      ctx.font = f(26, 700)
      ctx.textAlign = 'center'
      ctx.fillText(pt.date ? fmtShort(pt.date) : '', bx + barW / 2, y + h + 44)
    } else if (i === 0 || i === Math.floor(n / 2)) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.font = f(22)
      ctx.textAlign = 'center'
      ctx.fillText(pt.date ? fmtShort(pt.date) : '', bx + barW / 2, y + h + 44)
    }
  })
  ctx.textAlign = 'left'
}

/* ── LINE chart (canvas) ─────────────────────────────────── */
function canvasLine(ctx: CanvasRenderingContext2D, pts: ChartPt[], x: number, y: number, w: number, h: number, ac: typeof AC[Accent], accent: Accent) {
  if (pts.length < 2) { canvasBar(ctx, pts, x, y, w, h, ac); return }
  const n    = Math.min(pts.length, 14)
  const sub  = pts.slice(-n)
  const max  = Math.max(...sub.map(d => d.value))
  const min  = Math.min(...sub.map(d => d.value))
  const rng  = max - min || max * 0.1 || 1
  const padY = h * 0.08
  const px = (i: number) => x + (i / (sub.length - 1)) * w
  const py = (v: number) => y + h - padY - ((v - min) / rng) * (h - padY * 2)

  // Area
  ctx.beginPath()
  ctx.moveTo(px(0), py(sub[0].value))
  for (let i = 1; i < sub.length; i++) ctx.lineTo(px(i), py(sub[i].value))
  ctx.lineTo(px(sub.length-1), y+h); ctx.lineTo(x, y+h); ctx.closePath()
  ctx.fillStyle = AREA_FILL[accent]; ctx.fill()

  // Line
  ctx.beginPath()
  ctx.moveTo(px(0), py(sub[0].value))
  for (let i = 1; i < sub.length; i++) ctx.lineTo(px(i), py(sub[i].value))
  ctx.strokeStyle = ac.barActive; ctx.lineWidth = 5
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke()

  // Dots
  sub.forEach((pt, i) => {
    const isLast = i === sub.length - 1
    const cx2 = px(i), cy2 = py(pt.value)
    if (isLast) {
      ctx.beginPath(); ctx.arc(cx2, cy2, 24, 0, Math.PI*2)
      ctx.strokeStyle = AREA_FILL[accent].replace('0.1','0.4').replace('0.05','0.2')
      ctx.lineWidth = 2; ctx.stroke()
    }
    ctx.beginPath(); ctx.arc(cx2, cy2, isLast ? 12 : 5, 0, Math.PI*2)
    ctx.fillStyle = isLast ? ac.barActive : 'rgba(255,255,255,0.3)'; ctx.fill()
  })

  // Minimal date labels: first, mid, last
  const show = [0, Math.floor((sub.length-1)/2), sub.length-1]
  ctx.font = f(24); ctx.textAlign = 'center'
  show.forEach(i => {
    ctx.fillStyle = i === sub.length-1 ? ac.barActive : 'rgba(255,255,255,0.22)'
    ctx.fillText(sub[i].date ? fmtShort(sub[i].date) : '', px(i), y+h+46)
  })
  ctx.textAlign = 'left'
}

/* ── Canvas card generation ──────────────────────────────── */
async function generateStatsCard(data: StatsData, theme: Theme, accent: Accent, chartType: ChartType): Promise<Blob> {
  const W = 1080, H = 1920
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')!
  const ac = AC[accent]
  const heroColor = accent === 'dark' ? '#ffffff' : ac.hex

  // Background
  ctx.fillStyle = theme === 'dark' ? '#0a0a0a' : 'rgba(10,10,10,0.82)'
  ctx.fillRect(0, 0, W, H)

  // Top accent stripe
  ctx.fillStyle = ac.topLine; ctx.fillRect(0, 0, W, 7)

  // Badge (fixed position)
  ctx.fillStyle = ac.badgeBg; rr(ctx, 80, 100, 268, 68, 14); ctx.fill()
  if (accent === 'dark') {
    ctx.strokeStyle = ac.badgeBorder; ctx.lineWidth = 1.5
    rr(ctx, 80, 100, 268, 68, 14); ctx.stroke()
  }
  ctx.fillStyle = ac.badgeText; ctx.font = f(28, 700); ctx.fillText('LIFTSNAP', 112, 147)

  const divider = (y: number) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(80, y); ctx.lineTo(W-80, y); ctx.stroke()
  }

  // ── Per-type values ───────────────────────────────────────
  let metricLabel: string
  let exerciseName: string | null = null
  let heroStr: string
  let supp1: string | null = null
  let supp2: string | null = null
  let supp2Color = 'rgba(255,255,255,0.5)'
  let chartData: ChartPt[] = []

  if (data.type === 'max1rm') {
    metricLabel = 'MAX 1RM'; exerciseName = data.exerciseName
    heroStr = String(data.bestRM)
    if (data.bestSet) supp1 = `Best Set  ${data.bestSet.weight} kg × ${data.bestSet.reps}`
    if (data.history.length >= 2) {
      const gain = Math.round((data.bestRM - data.history[0].est1rm) * 10) / 10
      supp2 = `${gain >= 0 ? '+' : ''}${gain} kg from first`
      supp2Color = gain >= 0 ? '#22c55e' : '#ef4444'
    }
    chartData = data.history.map(d => ({ date: d.date, value: d.est1rm }))
  } else if (data.type === 'volume') {
    metricLabel = 'DAILY VOLUME'; exerciseName = data.exerciseName
    const maxVol = data.history.length ? Math.max(...data.history.map(d => d.volume)) : 0
    heroStr = maxVol >= 10000 ? `${(maxVol/1000).toFixed(1)}k` : maxVol.toLocaleString()
    supp1 = `${data.totalVolume >= 10000 ? `${(data.totalVolume/1000).toFixed(1)}k` : data.totalVolume.toLocaleString()} kg accumulated`
    supp2 = `${data.sessionCount} sessions`; supp2Color = 'rgba(255,255,255,0.4)'
    chartData = data.history.map(d => ({ date: d.date, value: d.volume }))
  } else {
    metricLabel = 'BODY WEIGHT'; heroStr = String(data.currentWeight)
    if (data.change !== 0) {
      supp1 = `${data.change > 0 ? '+' : ''}${data.change} kg since start`
    }
    if (data.history.length >= 2) {
      supp2 = `${data.history[0].weight} kg → ${data.currentWeight} kg`
      supp2Color = 'rgba(255,255,255,0.35)'
    }
    chartData = data.history.map(d => ({ date: d.date, value: d.weight }))
  }

  // ── Draw with y-cursor ────────────────────────────────────
  let cy = 202

  // Metric label
  ctx.fillStyle = 'rgba(255,255,255,0.36)'; ctx.font = f(32, 500)
  ctx.fillText(metricLabel, 80, cy); cy += 78

  // Exercise name
  if (exerciseName) {
    ctx.fillStyle = '#fff'; ctx.font = f(60, 700)
    ctx.fillText(exerciseName.length > 23 ? exerciseName.slice(0,21)+'…' : exerciseName, 80, cy); cy += 84
  } else {
    cy += 28 // breathing room for bodyweight card
  }

  // Single divider separating header from metric
  cy += 22; divider(cy); cy += 52

  // Hero number — large
  cy += 106
  ctx.fillStyle = heroColor; ctx.font = f(152, 700); ctx.fillText(heroStr, 80, cy)
  const hw = ctx.measureText(heroStr).width
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = f(56, 500)
  ctx.fillText(' kg', 80 + hw + 10, cy - 12)
  cy += 72

  // Supplements (2 lines max)
  if (supp1) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = f(34)
    ctx.fillText(supp1, 80, cy)
  }
  cy += 58

  if (supp2) {
    ctx.fillStyle = supp2Color; ctx.font = f(34)
    ctx.fillText(supp2, 80, cy)
  }
  cy += 58

  // Thin divider before chart
  cy += 26; divider(cy); cy += 46

  // "PROGRESSION" micro label
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.font = f(24, 500)
  ctx.fillText('PROGRESSION', 80, cy); cy += 38

  // ── Chart: fills remaining space ──────────────────────────
  const chartTop    = cy
  const chartBottom = H - 130          // leave room for date labels + watermark
  const chartH      = chartBottom - chartTop

  if (chartType === 'line') {
    canvasLine(ctx, chartData, 80, chartTop, W-160, chartH, ac, accent)
  } else {
    canvasBar(ctx, chartData, 80, chartTop, W-160, chartH, ac)
  }

  // Watermark
  ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.font = f(26)
  ctx.fillText('Made with LIFTSNAP · liftsnap.app', 80, H - 56)

  return new Promise(resolve => cv.toBlob(b => resolve(b!), 'image/png'))
}

/* ── SVG chart for DOM preview ───────────────────────────── */
function ChartSVG({ pts, ac, accent, chartType }: {
  pts: ChartPt[]
  ac: typeof AC[Accent]
  accent: Accent
  chartType: ChartType
}) {
  const n   = Math.min(pts.length, 14)
  const sub = pts.slice(-n)
  if (!sub.length) return null

  const W = 100, H = 100
  const max = Math.max(...sub.map(d => d.value))
  const min = Math.min(...sub.map(d => d.value))
  const rng = max - min || max * 0.1 || 1

  if (chartType === 'bar') {
    const slotW = W / sub.length
    const barW  = slotW * 0.55
    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        {sub.map((pt, i) => {
          const isLast = i === sub.length - 1
          const bH  = max > 0 ? (pt.value / max) * H * 0.9 : 4
          const bx  = i * slotW + (slotW - barW) / 2
          const by  = H - bH
          return (
            <g key={i}>
              <rect x={bx} y={0} width={barW} height={H} fill={ac.barTrack} />
              <rect x={bx} y={by} width={barW} height={bH} fill={isLast ? ac.barActive : ac.barInactive} />
            </g>
          )
        })}
      </svg>
    )
  }

  // Line chart
  const padY = H * 0.08
  const px = (i: number) => (i / (sub.length - 1)) * W
  const py = (v: number) => H - padY - ((v - min) / rng) * (H - padY * 2)
  const linePoints = sub.map((d, i) => `${px(i)},${py(d.value)}`).join(' ')
  const areaPoints = `0,${H} ${linePoints} ${W},${H}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
      <polygon points={areaPoints} fill={AREA_FILL[accent]} />
      <polyline points={linePoints} fill="none" stroke={ac.barActive}
        strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      {sub.map((d, i) => (
        <circle key={i} cx={px(i)} cy={py(d.value)}
          r={i === sub.length - 1 ? 2.8 : 1.6}
          fill={i === sub.length - 1 ? ac.barActive : 'rgba(255,255,255,0.35)'} />
      ))}
    </svg>
  )
}

/* ── Main component ──────────────────────────────────────── */
export default function StatsShareView({ data }: { data: StatsData }) {
  const router = useRouter()
  const [theme,     setTheme]     = useState<Theme>('dark')
  const [accent,    setAccent]    = useState<Accent>('orange')
  const [chartType, setChartType] = useState<ChartType>(data.type === 'volume' ? 'bar' : 'line')
  const [sharing,   setSharing]   = useState(false)
  const [status,    setStatus]    = useState('')

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
  const heroColor = accent === 'dark' ? '#ffffff' : ac.hex

  // ── Preview values ─────────────────────────────────────────
  let metricLabel: string
  let exerciseName: string | null = null
  let heroNum: string
  let supp1: string | null = null
  let supp2: string | null = null
  let supp2Color = 'rgba(255,255,255,0.5)'
  let chartData: ChartPt[] = []

  if (data.type === 'max1rm') {
    metricLabel = 'MAX 1RM'; exerciseName = data.exerciseName
    heroNum = String(data.bestRM)
    if (data.bestSet) supp1 = `Best Set  ${data.bestSet.weight} × ${data.bestSet.reps}`
    if (data.history.length >= 2) {
      const gain = Math.round((data.bestRM - data.history[0].est1rm) * 10) / 10
      supp2 = `${gain >= 0 ? '+' : ''}${gain} kg from first`
      supp2Color = gain >= 0 ? '#22c55e' : '#ef4444'
    }
    chartData = data.history.map(d => ({ date: d.date, value: d.est1rm }))
  } else if (data.type === 'volume') {
    metricLabel = 'DAILY VOLUME'; exerciseName = data.exerciseName
    const maxVol = data.history.length ? Math.max(...data.history.map(d => d.volume)) : 0
    heroNum = maxVol >= 10000 ? `${(maxVol/1000).toFixed(1)}k` : maxVol.toLocaleString()
    supp1 = `${data.totalVolume >= 10000 ? `${(data.totalVolume/1000).toFixed(1)}k` : data.totalVolume.toLocaleString()} kg total`
    supp2 = `${data.sessionCount} sessions`; supp2Color = 'rgba(255,255,255,0.4)'
    chartData = data.history.map(d => ({ date: d.date, value: d.volume }))
  } else {
    metricLabel = 'BODY WEIGHT'; heroNum = String(data.currentWeight)
    if (data.change !== 0) {
      supp1 = `${data.change > 0 ? '+' : ''}${data.change} kg since start`
    }
    if (data.history.length >= 2) {
      supp2 = `${data.history[0].weight} kg → ${data.currentWeight} kg`
      supp2Color = 'rgba(255,255,255,0.35)'
    }
    chartData = data.history.map(d => ({ date: d.date, value: d.weight }))
  }

  return (
    <div className="min-h-screen pb-nav flex flex-col" style={{ background: '#0a0a0a' }}>

      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl" style={{ background: '#1a1a1a' }}>
          <ArrowLeft size={18} style={{ color: '#888' }} />
        </button>
        <h1 className="text-base font-black tracking-widest text-white">Share Story</h1>
      </div>

      {/* ── 9:16 story preview ─────────────────────────────── */}
      <div className="px-4 mb-5">
        <div className="w-full rounded-3xl overflow-hidden relative"
          style={{ aspectRatio: '9/16', background: theme === 'dark' ? '#0a0a0a' : 'rgba(10,10,10,0.82)', border: `1px solid ${ac.cardBorder}` }}>

          {theme === 'transparent' && (
            <div className="absolute inset-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M0 0h20v20H0V0zm20 20h20v20H20V20z'/%3E%3C/g%3E%3C/svg%3E")` }} />
          )}

          {/* Top accent stripe */}
          <div className="absolute top-0 inset-x-0" style={{ height: 2, background: ac.topLine }} />

          {/* ── Content: flex column, chart fills remaining ── */}
          <div className="relative flex flex-col h-full" style={{ padding: '14px 16px 10px', paddingTop: 16 }}>

            {/* Badge */}
            <div className="inline-flex mb-2.5">
              <span className="text-[10px] font-black px-2.5 py-1 rounded-lg"
                style={{ background: ac.badgeBg, color: ac.badgeText, border: `1px solid ${ac.badgeBorder}`, letterSpacing: '0.12em' }}>
                LIFTSNAP
              </span>
            </div>

            {/* Metric + exercise */}
            <p style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.1em', marginBottom: 2 }}>
              {metricLabel}
            </p>
            {exerciseName && (
              <p style={{ fontSize: 15, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 0 }}>
                {exerciseName}
              </p>
            )}

            {/* Single divider */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginTop: 7, marginBottom: 7 }} />

            {/* Hero number */}
            <div className="flex items-baseline" style={{ gap: 3, marginBottom: 1 }}>
              <span style={{ fontSize: 44, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', color: heroColor }}>
                {heroNum}
              </span>
              <span style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.25)' }}>kg</span>
            </div>

            {/* Supplements */}
            {supp1 && (
              <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.5)', marginBottom: 1.5 }}>{supp1}</p>
            )}
            {supp2 && (
              <p style={{ fontSize: 9.5, color: supp2Color, marginBottom: 0 }}>{supp2}</p>
            )}

            {/* Divider before chart */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginTop: 7, marginBottom: 5 }} />

            {/* PROGRESSION label */}
            <p style={{ fontSize: 7.5, fontWeight: 600, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.1em', marginBottom: 5 }}>
              PROGRESSION
            </p>

            {/* Chart — takes ALL remaining space */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <ChartSVG pts={chartData} ac={ac} accent={accent} chartType={chartType} />
            </div>

            {/* Watermark */}
            <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.1)', marginTop: 5 }}>
              Made with LIFTSNAP · liftsnap.app
            </p>
          </div>
        </div>
      </div>

      {/* ── Option selectors ──────────────────────────────── */}
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

      <div className="px-4 mb-3">
        <p className="text-[10px] font-bold mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>Color</p>
        <div className="flex gap-2">
          {(['orange', 'purple', 'dark'] as Accent[]).map(a => {
            const sel = accent === a
            const bg  = sel ? (a === 'orange' ? '#ff6b00' : a === 'purple' ? '#a855f7' : '#3a3a3a') : '#1a1a1a'
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
