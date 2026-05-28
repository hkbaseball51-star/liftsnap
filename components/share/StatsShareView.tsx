'use client'

import { useRef, useState } from 'react'
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

const AC: Record<Accent, {
  hex: string; badgeBg: string; badgeBorder: string; badgeText: string
  cardBorder: string; topLine: string
  barActive: string; barInactive: string; barTrack: string
}> = {
  orange: { hex:'#ff6b00', badgeBg:'rgba(255,107,0,0.14)', badgeBorder:'rgba(255,107,0,0.3)',  badgeText:'#ff6b00', cardBorder:'rgba(255,107,0,0.35)',  topLine:'#ff6b00', barActive:'#ff6b00', barInactive:'rgba(255,107,0,0.32)',  barTrack:'rgba(255,107,0,0.06)' },
  purple: { hex:'#a855f7', badgeBg:'rgba(168,85,247,0.14)', badgeBorder:'rgba(168,85,247,0.3)', badgeText:'#a855f7', cardBorder:'rgba(168,85,247,0.35)', topLine:'#a855f7', barActive:'#a855f7', barInactive:'rgba(168,85,247,0.32)', barTrack:'rgba(168,85,247,0.06)' },
  dark:   { hex:'rgba(255,255,255,0.7)', badgeBg:'rgba(255,255,255,0.06)', badgeBorder:'rgba(255,255,255,0.18)', badgeText:'rgba(255,255,255,0.6)', cardBorder:'rgba(255,255,255,0.1)', topLine:'rgba(255,255,255,0.18)', barActive:'rgba(255,255,255,0.6)', barInactive:'rgba(255,255,255,0.18)', barTrack:'rgba(255,255,255,0.04)' },
}

const AREA_FILL: Record<Accent, string> = {
  orange: 'rgba(255,107,0,0.1)',
  purple: 'rgba(168,85,247,0.1)',
  dark:   'rgba(255,255,255,0.05)',
}

const CHECKER = `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.07'%3E%3Cpath d='M0 0h10v10H0V0zm10 10h10v10H10V10z'/%3E%3C/g%3E%3C/svg%3E")`

/* ── Helpers ─────────────────────────────────────────────── */
function fmtShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function fmtXLabel(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${M[d.getMonth()]} ${d.getDate()}`
}

function fmtBarDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function fmtYLabel(v: number, isVolume: boolean): string {
  if (isVolume) {
    if (v >= 10000) return `${Math.round(v/1000)}k`
    if (v >= 1000)  return `${(v/1000).toFixed(1)}k`
  }
  return `${Math.round(v * 10) / 10}kg`
}

function niceYTicks(dataMin: number, dataMax: number, count = 4): number[] {
  if (dataMax === 0) return [0]
  const range  = dataMax - dataMin || dataMax * 0.2 || 1
  const raw    = range / (count - 1)
  const mag    = Math.pow(10, Math.floor(Math.log10(raw)))
  const step   = Math.ceil(raw / mag) * mag
  const niceMax = Math.ceil(dataMax / step) * step
  const niceMin = dataMin === 0 ? 0 : Math.floor(dataMin / step) * step
  const ticks: number[] = []
  for (let v = niceMin; v <= niceMax + step * 0.01 && ticks.length <= count + 1; v = Math.round((v + step) * 1e9) / 1e9) {
    ticks.push(v)
  }
  return ticks
}

function f(size: number, weight: 400 | 500 | 700 = 400): string {
  return `${weight >= 700 ? 'bold ' : weight === 500 ? '500 ' : ''}${size}px system-ui,-apple-system,sans-serif`
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r)
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r)
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r)
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r)
  ctx.closePath()
}

type ChartPt = { date: string; value: number }

/* ── BAR chart (canvas — used for volume/bodyweight) ──────── */
function canvasBar(ctx: CanvasRenderingContext2D, pts: ChartPt[], x: number, y: number, w: number, h: number, ac: typeof AC[Accent], isVolume = false) {
  if (!pts.length) return
  const n   = Math.min(pts.length, 14)
  const sub = pts.slice(-n)
  const max = Math.max(...sub.map(d => d.value))
  const slotW = w / n
  const barW  = Math.max(Math.floor(slotW * 0.52), 22)

  const yTicks = niceYTicks(0, max, 4)
  yTicks.forEach(tick => {
    if (tick === 0) return
    const ty = max > 0 ? y + h - Math.round((tick / max) * h * 0.9) : y
    if (ty < y - 4) return
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1
    ctx.setLineDash([6, 6])
    ctx.beginPath(); ctx.moveTo(x, ty); ctx.lineTo(x + w, ty); ctx.stroke()
    ctx.setLineDash([])
  })

  sub.forEach((pt, i) => {
    const isLast = i === sub.length - 1
    const bH = max > 0 ? Math.round((pt.value / max) * h * 0.9) : 4
    const bx = x + i * slotW + Math.floor((slotW - barW) / 2)
    const by = y + h - bH

    ctx.fillStyle = ac.barTrack;    ctx.fillRect(bx, y, barW, h)
    ctx.fillStyle = isLast ? ac.barActive : ac.barInactive
    ctx.fillRect(bx, by, barW, bH)

    if (isLast) {
      ctx.fillStyle = ac.barActive; ctx.font = f(34, 700); ctx.textAlign = 'center'
      ctx.fillText(pt.date ? fmtXLabel(pt.date) : '', bx + barW / 2, y + h + 58)
    } else if (i === 0 || i === Math.floor(n / 2)) {
      ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = f(34); ctx.textAlign = 'center'
      ctx.fillText(pt.date ? fmtXLabel(pt.date) : '', bx + barW / 2, y + h + 58)
    }
  })

  ctx.textAlign = 'right'; ctx.font = f(34)
  yTicks.forEach(tick => {
    const ty = max > 0 ? y + h - Math.round((tick / max) * h * 0.9) : y + h
    if (ty < y - 4) return
    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    ctx.fillText(fmtYLabel(tick, isVolume), x - 16, ty + 10)
  })
  ctx.textAlign = 'left'
}

/* ── LINE chart (canvas — used for volume/bodyweight) ─────── */
function canvasLine(ctx: CanvasRenderingContext2D, pts: ChartPt[], x: number, y: number, w: number, h: number, ac: typeof AC[Accent], accent: Accent, isVolume = false) {
  if (pts.length < 2) { canvasBar(ctx, pts, x, y, w, h, ac, isVolume); return }
  const n    = Math.min(pts.length, 14)
  const sub  = pts.slice(-n)
  const max  = Math.max(...sub.map(d => d.value))
  const min  = Math.min(...sub.map(d => d.value))
  const rng  = max - min || max * 0.1 || 1
  const padY = h * 0.08
  const px = (i: number) => x + (i / (sub.length - 1)) * w
  const py = (v: number) => y + h - padY - ((v - min) / rng) * (h - padY * 2)

  const yTicks = niceYTicks(min, max, 4)
  yTicks.forEach(tick => {
    const ty = py(tick)
    if (ty < y - 4 || ty > y + h + 4) return
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1
    ctx.setLineDash([6, 6])
    ctx.beginPath(); ctx.moveTo(x, ty); ctx.lineTo(x + w, ty); ctx.stroke()
    ctx.setLineDash([])
  })

  ctx.beginPath()
  ctx.moveTo(px(0), py(sub[0].value))
  for (let i = 1; i < sub.length; i++) ctx.lineTo(px(i), py(sub[i].value))
  ctx.lineTo(px(sub.length-1), y+h); ctx.lineTo(x, y+h); ctx.closePath()
  ctx.fillStyle = AREA_FILL[accent]; ctx.fill()

  ctx.beginPath()
  ctx.moveTo(px(0), py(sub[0].value))
  for (let i = 1; i < sub.length; i++) ctx.lineTo(px(i), py(sub[i].value))
  ctx.strokeStyle = ac.barActive; ctx.lineWidth = 5
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke()

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

  const show = [0, Math.floor((sub.length-1)/2), sub.length-1]
  ctx.font = f(34); ctx.textAlign = 'center'
  show.forEach(i => {
    ctx.fillStyle = i === sub.length-1 ? ac.barActive : 'rgba(255,255,255,0.65)'
    ctx.fillText(sub[i].date ? fmtXLabel(sub[i].date) : '', px(i), y+h+58)
  })
  ctx.textAlign = 'left'

  ctx.textAlign = 'right'; ctx.font = f(34)
  yTicks.forEach(tick => {
    const ty = py(tick)
    if (ty < y - 4 || ty > y + h + 4) return
    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    ctx.fillText(fmtYLabel(tick, isVolume), x - 16, ty + 10)
  })
  ctx.textAlign = 'left'
}

/* ── Canvas card (volume / bodyweight only) ──────────────── */
async function generateStatsCard(data: StatsData, theme: Theme, accent: Accent, chartType: ChartType): Promise<Blob> {
  const W = 1080, H = 1920
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')!
  const ac = AC[accent]
  const heroColor = accent === 'dark' ? '#ffffff' : ac.hex

  if (theme === 'dark') {
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, W, H)
  }

  ctx.fillStyle = ac.topLine; ctx.fillRect(0, 0, W, 7)

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

  let metricLabel: string
  let exerciseName: string | null = null
  let heroStr: string
  let supp1: string | null = null
  let supp2: string | null = null
  let supp2Color = 'rgba(255,255,255,0.5)'
  let chartData: ChartPt[] = []

  if (data.type === 'volume') {
    metricLabel = 'DAILY VOLUME'; exerciseName = data.exerciseName
    const maxVol = data.history.length ? Math.max(...data.history.map(d => d.volume)) : 0
    heroStr = maxVol >= 10000 ? `${(maxVol/1000).toFixed(1)}k` : maxVol.toLocaleString()
    supp1 = `${data.totalVolume >= 10000 ? `${(data.totalVolume/1000).toFixed(1)}k` : data.totalVolume.toLocaleString()} kg accumulated`
    supp2 = `${data.sessionCount} sessions`; supp2Color = 'rgba(255,255,255,0.4)'
    chartData = data.history.map(d => ({ date: d.date, value: d.volume }))
  } else {
    // bodyweight
    metricLabel = 'BODY WEIGHT'; heroStr = String((data as Extract<StatsData, {type:'bodyweight'}>).currentWeight)
    const bw = data as Extract<StatsData, {type:'bodyweight'}>
    if (bw.change !== 0) supp1 = `${bw.change > 0 ? '+' : ''}${bw.change} kg since start`
    if (bw.history.length >= 2) {
      supp2 = `${bw.history[0].weight} kg → ${bw.currentWeight} kg`
      supp2Color = 'rgba(255,255,255,0.35)'
    }
    chartData = bw.history.map(d => ({ date: d.date, value: d.weight }))
  }

  let cy = 202
  ctx.fillStyle = 'rgba(255,255,255,0.36)'; ctx.font = f(32, 500)
  ctx.fillText(metricLabel, 80, cy); cy += 78

  if (exerciseName) {
    ctx.fillStyle = '#fff'; ctx.font = f(60, 700)
    ctx.fillText(exerciseName.length > 23 ? exerciseName.slice(0,21)+'…' : exerciseName, 80, cy); cy += 84
  } else {
    cy += 28
  }

  cy += 22; divider(cy); cy += 52

  cy += 106
  ctx.fillStyle = heroColor; ctx.font = f(152, 700); ctx.fillText(heroStr, 80, cy)
  const hw = ctx.measureText(heroStr).width
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = f(56, 500)
  ctx.fillText(' kg', 80 + hw + 10, cy - 12)
  cy += 72

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

  cy += 26; divider(cy); cy += 46
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.font = f(24, 500)
  ctx.fillText('PROGRESSION', 80, cy); cy += 38

  const chartTop    = cy
  const chartBottom = H - 170
  const chartH      = chartBottom - chartTop
  const isVol       = data.type === 'volume'
  const chartX      = 200
  const chartW      = W - chartX - 80

  if (chartType === 'line') {
    canvasLine(ctx, chartData, chartX, chartTop, chartW, chartH, ac, accent, isVol)
  } else {
    canvasBar(ctx, chartData, chartX, chartTop, chartW, chartH, ac, isVol)
  }

  ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.font = f(26)
  ctx.fillText('Made with LIFTSNAP · liftsnap.app', 80, H - 56)

  return new Promise(resolve => cv.toBlob(b => resolve(b!), 'image/png'))
}

/* ── MAX 1RM card capture via html-to-image ──────────────── */
async function captureMax1RMCard(el: HTMLDivElement, theme: Theme): Promise<Blob> {
  const { toPng } = await import('html-to-image')
  await document.fonts.ready
  await new Promise(r => requestAnimationFrame(r))
  await new Promise(r => setTimeout(r, 60))

  const W = el.offsetWidth
  const H = el.offsetHeight
  const pixelRatio = Math.min(4, Math.round(1080 / Math.max(W, 1)))

  const prevBg = el.style.background
  el.style.background = theme === 'transparent' ? 'transparent' : '#0a0a0a'
  await new Promise(r => requestAnimationFrame(r))

  try {
    const dataUrl = await toPng(el, {
      width: W, height: H,
      style: { width: `${W}px`, height: `${H}px` },
      pixelRatio, cacheBust: true, skipFonts: true,
    })
    const res = await fetch(dataUrl)
    return await res.blob()
  } finally {
    el.style.background = prevBg
  }
}

/* ── SVG chart for DOM preview (volume / bodyweight) ──────── */
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
  const router     = useRouter()
  const captureRef = useRef<HTMLDivElement>(null)

  const [theme,     setTheme]     = useState<Theme>('dark')
  const [accent,    setAccent]    = useState<Accent>('orange')
  const [chartType, setChartType] = useState<ChartType>(data.type === 'volume' ? 'bar' : 'line')
  const [sharing,   setSharing]   = useState(false)
  const [status,    setStatus]    = useState('')

  const handleShare = async () => {
    setSharing(true); setStatus('Generating card...')
    try {
      let blob: Blob
      if (data.type === 'max1rm' && captureRef.current) {
        blob = await captureMax1RMCard(captureRef.current, theme)
      } else {
        blob = await generateStatsCard(data, theme, accent, chartType)
      }
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

  const ac       = AC[accent]
  const acHex    = accent === 'dark' ? '#ffffff' : ac.hex
  const isMax1RM = data.type === 'max1rm'
  const tsh      = '0 2px 8px rgba(0,0,0,0.75)'

  const cardBg = theme === 'dark'
    ? '#0a0a0a'
    : `linear-gradient(rgba(0,0,0,0.42), rgba(0,0,0,0.48)), ${CHECKER} #1a1a1a`

  /* ── MAX 1RM chart data ──────────────────────────────────── */
  const rm1FullHistory = isMax1RM ? (data as Extract<StatsData,{type:'max1rm'}>).history : []
  const bestRM         = isMax1RM ? (data as Extract<StatsData,{type:'max1rm'}>).bestRM : 0
  const exNameRaw      = isMax1RM ? (data as Extract<StatsData,{type:'max1rm'}>).exerciseName : ''
  const exName         = exNameRaw.length > 14 ? exNameRaw.slice(0, 13).toUpperCase() + '…' : exNameRaw.toUpperCase()

  const rm1Growth   = rm1FullHistory.length >= 2
    ? Math.round((bestRM - rm1FullHistory[0].est1rm) * 10) / 10
    : null
  const rm1FirstVal = rm1FullHistory.length >= 1 ? rm1FullHistory[0].est1rm : null

  // Sample up to 50 records: latest on top, first on bottom, middle evenly sampled
  const rm1DisplayData: RMPoint[] = (() => {
    if (!rm1FullHistory.length) return []
    const MAX_DISP = 50
    if (rm1FullHistory.length <= MAX_DISP) return [...rm1FullHistory].reverse()
    const latest = rm1FullHistory[rm1FullHistory.length - 1]
    const first  = rm1FullHistory[0]
    const middle = rm1FullHistory.slice(1, rm1FullHistory.length - 1)
    const needed = MAX_DISP - 2
    const step   = middle.length / needed
    const sampled: RMPoint[] = Array.from({ length: needed }, (_, i) =>
      middle[Math.floor(i * step)]
    )
    return [latest, ...sampled.reverse(), first]
  })()

  const n      = rm1DisplayData.length
  const rm1Max = n ? Math.max(...rm1DisplayData.map(d => d.est1rm)) : 0

  // Bar heights scale with record count so chart always looks substantial
  const chartBarH = n <= 5 ? 20 : n <= 15 ? 14 : n <= 30 ? 9 : 5
  const chartLatH = n <= 5 ? 26 : n <= 15 ? 18 : n <= 30 ? 13 : 10

  // Graduated opacity: latest = full, first = slightly elevated, middle = faded
  const getBarBg = (idx: number): string => {
    if (idx === 0) return acHex
    if (idx === n - 1) {
      const op = 0.42
      if (accent === 'orange') return `rgba(255,107,0,${op})`
      if (accent === 'purple') return `rgba(168,85,247,${op})`
      return `rgba(255,255,255,${op})`
    }
    const t  = idx / Math.max(n - 1, 1)
    const op = Math.max(0.20, 0.48 - t * 0.25)
    if (accent === 'orange') return `rgba(255,107,0,${op.toFixed(2)})`
    if (accent === 'purple') return `rgba(168,85,247,${op.toFixed(2)})`
    return `rgba(255,255,255,${op.toFixed(2)})`
  }

  /* ── Non-max1rm preview values ───────────────────────────── */
  let metricLabel = ''
  let exerciseName: string | null = null
  let heroNum = ''
  let supp1: string | null = null
  let supp2: string | null = null
  let supp2Color = 'rgba(255,255,255,0.5)'
  let chartData: ChartPt[] = []

  if (data.type === 'volume') {
    metricLabel = 'DAILY VOLUME'; exerciseName = data.exerciseName
    const maxVol = data.history.length ? Math.max(...data.history.map(d => d.volume)) : 0
    heroNum = maxVol >= 10000 ? `${(maxVol/1000).toFixed(1)}k` : maxVol.toLocaleString()
    supp1 = `${data.totalVolume >= 10000 ? `${(data.totalVolume/1000).toFixed(1)}k` : data.totalVolume.toLocaleString()} kg total`
    supp2 = `${data.sessionCount} sessions`; supp2Color = 'rgba(255,255,255,0.4)'
    chartData = data.history.map(d => ({ date: d.date, value: d.volume }))
  } else if (data.type === 'bodyweight') {
    metricLabel = 'BODY WEIGHT'; heroNum = String(data.currentWeight)
    if (data.change !== 0) supp1 = `${data.change > 0 ? '+' : ''}${data.change} kg since start`
    if (data.history.length >= 2) {
      supp2 = `${data.history[0].weight} kg → ${data.currentWeight} kg`
      supp2Color = 'rgba(255,255,255,0.35)'
    }
    chartData = data.history.map(d => ({ date: d.date, value: d.weight }))
  }

  const chartMin = chartData.length ? Math.min(...chartData.map(d => d.value)) : 0
  const chartMax = chartData.length ? Math.max(...chartData.map(d => d.value)) : 0
  const yTicks   = chartData.length ? niceYTicks(chartType === 'bar' ? 0 : chartMin, chartMax, 4) : []
  const xLabels  = (() => {
    if (!chartData.length) return [] as string[]
    const idxs = chartData.length === 1
      ? [0]
      : [0, Math.floor((chartData.length - 1) / 2), chartData.length - 1].filter((v, i, a) => a.indexOf(v) === i)
    return idxs.map(i => fmtXLabel(chartData[i].date))
  })()

  return (
    <div className="min-h-screen pb-nav flex flex-col" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl" style={{ background: '#1a1a1a' }}>
          <ArrowLeft size={18} style={{ color: '#888' }} />
        </button>
        <h1 className="text-base font-black tracking-widest text-white">Share Story</h1>
      </div>

      {/* ── Story preview ───────────────────────────────────── */}
      <div className="px-4 mb-5">

        {isMax1RM ? (
          /* ── MAX 1RM: horizontal bar chart, left 38% column ── */
          <div ref={captureRef} style={{
            aspectRatio: '9/16', width: '100%',
            background: cardBg,
            borderRadius: 24, overflow: 'hidden',
            border: `1px solid ${ac.cardBorder}`,
            position: 'relative',
          }}>
            {/* Accent stripe */}
            <div style={{ height: 2, background: ac.topLine }} />

            {/* Left content column — right 66% stays clear for background photo */}
            <div style={{
              width: '34%',
              padding: '10px 0 8px 12px',
              height: 'calc(100% - 2px)',
              display: 'flex',
              flexDirection: 'column',
              textShadow: tsh,
            }}>
              {/* LIFTSNAP badge */}
              <div style={{ display: 'inline-flex', marginBottom: 6, flexShrink: 0 }}>
                <span style={{
                  fontSize: 7, fontWeight: 900, padding: '2px 6px', borderRadius: 5,
                  background: ac.badgeBg, color: ac.badgeText,
                  border: `1px solid ${ac.badgeBorder}`, letterSpacing: '0.12em',
                  whiteSpace: 'nowrap',
                }}>LIFTSNAP</span>
              </div>

              {/* Exercise name — primary title */}
              <p style={{ fontSize: 10.5, fontWeight: 900, color: '#ffffff', lineHeight: 1.15, margin: '0 0 2px', flexShrink: 0 }}>
                {exName}
              </p>

              {/* 1RM PROGRESS subtitle */}
              <p style={{ fontSize: 7, fontWeight: 700, color: acHex, letterSpacing: '0.08em', margin: '0 0 6px', lineHeight: 1.2, flexShrink: 0 }}>
                1RM PROGRESS
              </p>

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.10)', margin: '0 0 6px', flexShrink: 0 }} />

              {/* Current max hero */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, margin: '0 0 2px', lineHeight: 1, flexShrink: 0 }}>
                <span style={{ fontSize: 32, fontWeight: 900, color: acHex, lineHeight: 1 }}>
                  {bestRM}
                </span>
                <span style={{ fontSize: 9, fontWeight: 500, color: '#C4C4C4', lineHeight: 1, paddingBottom: 2 }}>kg</span>
              </div>

              {/* Growth summary */}
              {rm1Growth !== null && rm1FirstVal !== null ? (
                <div style={{ margin: '0 0 6px', flexShrink: 0 }}>
                  <p style={{ fontSize: 7, color: '#B0B0B0', lineHeight: 1.4, margin: '0 0 1px', fontWeight: 500 }}>
                    {rm1FirstVal}kg → {bestRM}kg
                  </p>
                  <p style={{ fontSize: 8, color: rm1Growth >= 0 ? '#4ade80' : '#f87171', lineHeight: 1.3, margin: 0, fontWeight: 700 }}>
                    {rm1Growth >= 0 ? '+' : ''}{rm1Growth}kg GAIN
                  </p>
                </div>
              ) : (
                <p style={{ fontSize: 7, color: '#666', margin: '0 0 6px', lineHeight: 1.3, flexShrink: 0 }}>
                  Keep training
                </p>
              )}

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 0 5px', flexShrink: 0 }} />

              {/* PROGRESSION label */}
              <p style={{ fontSize: 6, fontWeight: 600, color: '#666', letterSpacing: '0.1em', margin: '0 0 4px', lineHeight: 1.2, flexShrink: 0 }}>
                PROGRESSION
              </p>

              {/* Chart: flex:1 fills all remaining space, space-between distributes bars top-to-bottom */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0 }}>
                {n === 0 ? (
                  <p style={{ fontSize: 7, color: '#444' }}>No data yet</p>
                ) : n === 1 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ width: 22, flexShrink: 0, fontSize: 6, fontWeight: 700, color: acHex }}>{fmtShort(rm1DisplayData[0].date)}</span>
                    <div style={{ flex: 1, height: chartLatH, background: acHex, boxShadow: `0 2px 6px ${acHex}44` }} />
                    <span style={{ width: 22, flexShrink: 0, fontSize: 7.5, fontWeight: 700, color: '#F4F4F4', textAlign: 'right' }}>{rm1DisplayData[0].est1rm}</span>
                  </div>
                ) : (
                  rm1DisplayData.map((pt, i) => {
                    const isLatest      = i === 0
                    const isFirstRecord = i === n - 1
                    const pct = rm1Max > 0 ? (pt.est1rm / rm1Max) * 100 : 0
                    const bH  = isLatest ? chartLatH : chartBarH
                    return (
                      <div key={`${pt.date}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        {/* Date/label: 2-line NOW/START for ≤20 records, else 1-line with color */}
                        {n <= 20 && (isLatest || isFirstRecord) ? (
                          <div style={{ width: 22, flexShrink: 0 }}>
                            <div style={{ fontSize: 4.5, fontWeight: 800, letterSpacing: '0.06em', lineHeight: 1.3, color: isLatest ? acHex : '#888' }}>
                              {isLatest ? 'NOW' : 'START'}
                            </div>
                            <div style={{ fontSize: 6, fontWeight: isLatest ? 700 : 500, lineHeight: 1.2, color: isLatest ? acHex : '#AAAAAA' }}>
                              {fmtShort(pt.date)}
                            </div>
                          </div>
                        ) : (
                          <span style={{
                            width: 22, flexShrink: 0, fontSize: 6, lineHeight: 1.2, whiteSpace: 'nowrap',
                            color: isLatest ? acHex : isFirstRecord ? '#AAAAAA' : '#686868',
                            fontWeight: isLatest ? 700 : isFirstRecord ? 600 : 400,
                          }}>
                            {fmtShort(pt.date)}
                          </span>
                        )}
                        {/* Bar — square, no border-radius */}
                        <div style={{ flex: 1, height: bH, position: 'relative' }}>
                          <div style={{
                            position: 'absolute', top: 0, left: 0,
                            width: `${pct}%`, height: '100%',
                            background: getBarBg(i),
                            borderRadius: 0,
                            boxShadow: isLatest ? `0 2px 6px ${acHex}44` : 'none',
                            minWidth: 2,
                          }} />
                        </div>
                        {/* Weight label — right-aligned */}
                        <span style={{
                          width: 22, flexShrink: 0,
                          fontSize: isLatest ? 7.5 : isFirstRecord ? 7 : 6,
                          fontWeight: isLatest ? 700 : isFirstRecord ? 600 : 400,
                          color: isLatest ? '#F4F4F4' : isFirstRecord ? '#D0D0D0' : '#A0A0A0',
                          textAlign: 'right', whiteSpace: 'nowrap', lineHeight: 1,
                        }}>
                          {pt.est1rm}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Watermark */}
              <p style={{ fontSize: 5.5, color: 'rgba(255,255,255,0.18)', lineHeight: 1.4, textShadow: 'none', flexShrink: 0, paddingTop: 4 }}>
                LIFTSNAP
              </p>
            </div>
          </div>

        ) : (

          /* ── Volume / bodyweight: existing vertical layout ─── */
          <div className="w-full rounded-3xl overflow-hidden relative"
            style={{
              aspectRatio: '9/16',
              background: cardBg,
              border: `1px solid ${ac.cardBorder}`,
            }}>

            <div className="absolute top-0 inset-x-0" style={{ height: 2, background: ac.topLine }} />

            <div className="relative flex flex-col h-full" style={{ padding: '14px 16px 10px', paddingTop: 16 }}>

              <div className="inline-flex mb-2.5">
                <span className="text-[10px] font-black px-2.5 py-1 rounded-lg"
                  style={{ background: ac.badgeBg, color: ac.badgeText, border: `1px solid ${ac.badgeBorder}`, letterSpacing: '0.12em' }}>
                  LIFTSNAP
                </span>
              </div>

              <p style={{ fontSize: 9, fontWeight: 600, color: '#B8B8B8', letterSpacing: '0.1em', marginBottom: 2 }}>
                {metricLabel}
              </p>
              {exerciseName && (
                <p style={{ fontSize: 15, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 0 }}>
                  {exerciseName}
                </p>
              )}

              <div style={{ height: 1, background: 'rgba(255,255,255,0.10)', marginTop: 7, marginBottom: 7 }} />

              <div className="flex items-baseline" style={{ gap: 3, marginBottom: 1 }}>
                <span style={{ fontSize: 44, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', color: acHex }}>
                  {heroNum}
                </span>
                <span style={{ fontSize: 15, fontWeight: 500, color: '#C4C4C4' }}>kg</span>
              </div>

              {supp1 && <p style={{ fontSize: 9.5, color: '#B8B8B8', marginBottom: 1.5 }}>{supp1}</p>}
              {supp2 && <p style={{ fontSize: 9.5, color: supp2Color, marginBottom: 0 }}>{supp2}</p>}

              <div style={{ height: 1, background: 'rgba(255,255,255,0.10)', marginTop: 7, marginBottom: 5 }} />

              <p style={{ fontSize: 7.5, fontWeight: 600, color: '#888', letterSpacing: '0.1em', marginBottom: 5 }}>
                PROGRESSION
              </p>

              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 3 }}>
                  <div style={{ width: 32, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 3, paddingTop: 1 }}>
                    {[...yTicks].reverse().map((v, i) => (
                      <span key={i} style={{ fontSize: 7.5, color: '#B8B8B8', textAlign: 'right', lineHeight: 1, display: 'block' }}>
                        {fmtYLabel(v, data.type === 'volume')}
                      </span>
                    ))}
                  </div>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <ChartSVG pts={chartData} ac={ac} accent={accent} chartType={chartType} />
                  </div>
                </div>
                {xLabels.length > 0 && (
                  <div style={{ height: 14, display: 'flex', justifyContent: 'space-between', paddingLeft: 35, marginTop: 3 }}>
                    {xLabels.map((lbl, i) => (
                      <span key={i} style={{ fontSize: 7.5, color: '#B8B8B8', lineHeight: 1 }}>{lbl}</span>
                    ))}
                  </div>
                )}
              </div>

              <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.20)', marginTop: 5 }}>
                Made with LIFTSNAP · liftsnap.app
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Options ─────────────────────────────────────────── */}
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

      {/* Chart Type: only for volume / bodyweight */}
      {!isMax1RM && (
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
      )}

      {/* Share button */}
      <div className="px-4 space-y-2 mb-6">
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
