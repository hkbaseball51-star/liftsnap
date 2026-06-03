'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Share2, ArrowLeft } from 'lucide-react'
import { getShareCount, incrementShareCount, getShareThemeUnlocks } from '@/lib/unlocks'
import { useWeightUnit } from '@/lib/useWeightUnit'
import { toDisplayWeight, weightUnitLabel, type WeightUnit } from '@/lib/units'
import { PRESETS } from '@/components/share/WorkoutStoryCardContent'

type RMPoint  = { date: string; label: string; est1rm: number }
type VolPoint = { date: string; label: string; volume: number }
type BWPoint  = { date: string; label: string; weight: number }

export type StatsData =
  | { type: 'max1rm';     exerciseName: string; bestRM: number; bestDate: string; bestSet: { weight: number; reps: number } | null; history: RMPoint[];  sessionCount: number }
  | { type: 'volume';     bodyPart: string; totalVolume: number; sessionCount: number; history: VolPoint[] }
  | { type: 'bodyweight'; currentWeight: number; change: number; history: BWPoint[] }

type Theme     = 'dark' | 'transparent'
type Accent    = 'orange' | 'purple' | 'dark' | 'black'
type ChartType = 'bar' | 'line'
type GraphLayout = 'full' | 'bottom' | 'mini' | 'wide'
type GraphPreset = 'orange' | 'ice-blue' | 'violet' | 'mint'
type CardStyle   = 'glass' | 'transparent'
type ShadowLevel = 'none' | 'soft' | 'strong' | 'extra-strong'

const AC: Record<Accent, {
  hex: string; badgeBg: string; badgeBorder: string; badgeText: string
  cardBorder: string; topLine: string
  barActive: string; barInactive: string; barTrack: string
}> = {
  orange: { hex:'#ED742F', badgeBg:'rgba(237, 116, 47,0.14)',   badgeBorder:'rgba(237, 116, 47,0.3)',   badgeText:'#ED742F',              cardBorder:'rgba(237, 116, 47,0.35)',  topLine:'#ED742F',                barActive:'#ED742F',               barInactive:'rgba(237, 116, 47,0.32)',  barTrack:'rgba(237, 116, 47,0.06)'  },
  purple: { hex:'#6E38D4', badgeBg:'rgba(110,56,212,0.14)',  badgeBorder:'rgba(110,56,212,0.3)',  badgeText:'#6E38D4',              cardBorder:'rgba(110,56,212,0.35)', topLine:'#6E38D4',                barActive:'#6E38D4',               barInactive:'rgba(110,56,212,0.32)', barTrack:'rgba(110,56,212,0.06)' },
  dark:   { hex:'rgba(255,255,255,0.7)', badgeBg:'rgba(255,255,255,0.06)', badgeBorder:'rgba(255,255,255,0.18)', badgeText:'rgba(255,255,255,0.6)', cardBorder:'rgba(255,255,255,0.1)', topLine:'rgba(255,255,255,0.18)', barActive:'rgba(255,255,255,0.6)', barInactive:'rgba(255,255,255,0.18)', barTrack:'rgba(255,255,255,0.04)' },
  black:  { hex:'#ffffff', badgeBg:'transparent',             badgeBorder:'rgba(255,255,255,0.28)',badgeText:'#ffffff',              cardBorder:'rgba(255,255,255,0.04)', topLine:'rgba(255,255,255,0.08)', barActive:'rgba(255,255,255,0.85)', barInactive:'rgba(255,255,255,0.15)', barTrack:'rgba(255,255,255,0.03)' },
}

const AREA_FILL: Record<Accent, string> = {
  orange: 'rgba(237, 116, 47,0.1)',
  purple: 'rgba(110,56,212,0.1)',
  dark:   'rgba(255,255,255,0.05)',
  black:  'rgba(255,255,255,0.03)',
}

const CHECKER = `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.07'%3E%3Cpath d='M0 0h10v10H0V0zm10 10h10v10H10V10z'/%3E%3C/g%3E%3C/svg%3E")`

const BODY_PART_DISPLAY: Record<string, string> = {
  all: 'ALL MUSCLES', chest: 'CHEST', back: 'BACK', legs: 'LEGS',
  shoulders: 'SHOULDERS', arms: 'ARMS', abs: 'ABS', other: 'OTHER',
}

const GRAPH_LAYOUTS = [
  { key: 'full',   labelEn: 'Full',   labelJa: '全画面',   ratio: '9:16' },
  { key: 'bottom', labelEn: 'Bottom', labelJa: '下部バー', ratio: '4:1'  },
  { key: 'mini',   labelEn: 'Mini',   labelJa: 'ミニカード', ratio: '1:1' },
  { key: 'wide',   labelEn: 'Wide',   labelJa: 'ワイド',   ratio: '16:9' },
] as const

const PRESET_LABELS: Record<GraphPreset, string> = {
  'orange':   'REPRA Orange',
  'ice-blue': 'Ice Blue',
  'violet':   'Violet Pump',
  'mint':     'Mint Proof',
}

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

const RM_JA_EN: Record<string, string> = {
  'ベンチプレス': 'BENCH PRESS', 'インクラインベンチプレス': 'INCLINE BENCH',
  'ダンベルベンチプレス': 'DB BENCH PRESS', 'デッドリフト': 'DEADLIFT',
  'スクワット': 'SQUAT', 'バーベルスクワット': 'BARBELL SQUAT',
  'フロントスクワット': 'FRONT SQUAT', 'ルーマニアンデッドリフト': 'RDL',
  'ショルダープレス': 'SHOULDER PRESS', 'オーバーヘッドプレス': 'OHP',
  'ダンベルショルダープレス': 'DB SHOULDER PRESS',
  'ラットプルダウン': 'LAT PULLDOWN', 'チンニング': 'CHIN-UP',
  'プルアップ': 'PULL-UP', '懸垂': 'PULL-UP',
  'バーベルロウ': 'BARBELL ROW', 'ベントオーバーロウ': 'BENT OVER ROW',
  'ダンベルロウ': 'DB ROW', 'ケーブルロウ': 'CABLE ROW',
  'レッグプレス': 'LEG PRESS', 'レッグカール': 'LEG CURL',
  'バーベルカール': 'BARBELL CURL', 'ダンベルカール': 'DB CURL',
  'ハンマーカール': 'HAMMER CURL', 'ディップス': 'DIPS',
  'プッシュアップ': 'PUSH-UP', 'ヒップスラスト': 'HIP THRUST',
  'ブルガリアンスクワット': 'BULGARIAN SQUAT', 'サイドレイズ': 'LATERAL RAISE',
  'フェイスプル': 'FACE PULL', 'ランジ': 'LUNGE',
}

function acRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const SHADOW_MAP: Record<ShadowLevel, string> = {
  none:           'none',
  soft:           '0 2px 10px rgba(0,0,0,0.55)',
  strong:         '0 2px 6px rgba(0,0,0,0.85), 0 6px 18px rgba(0,0,0,0.65)',
  'extra-strong': '0 2px 4px rgba(0,0,0,0.95), 0 6px 18px rgba(0,0,0,0.8), 0 12px 32px rgba(0,0,0,0.65)',
}

function fmtYLabel(v: number, isVolume: boolean, unit: WeightUnit = 'kg'): string {
  if (isVolume) {
    if (v >= 10000) return `${Math.round(v/1000)}k`
    if (v >= 1000)  return `${(v/1000).toFixed(1)}k`
  }
  return `${Math.round(v * 10) / 10}${unit}`
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

/* ── BAR chart (canvas) ───────────────────────────────────── */
function canvasBar(ctx: CanvasRenderingContext2D, pts: ChartPt[], x: number, y: number, w: number, h: number, ac: typeof AC[Accent], isVolume = false, unit: WeightUnit = 'kg') {
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
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = f(34); ctx.textAlign = 'center'
      ctx.fillText(pt.date ? fmtXLabel(pt.date) : '', bx + barW / 2, y + h + 58)
    }
  })

  ctx.textAlign = 'right'; ctx.font = f(34)
  yTicks.forEach(tick => {
    const ty = max > 0 ? y + h - Math.round((tick / max) * h * 0.9) : y + h
    if (ty < y - 4) return
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.fillText(fmtYLabel(tick, isVolume, unit), x - 16, ty + 10)
  })
  ctx.textAlign = 'left'
}

/* ── LINE chart (canvas) ──────────────────────────────────── */
function canvasLine(ctx: CanvasRenderingContext2D, pts: ChartPt[], x: number, y: number, w: number, h: number, ac: typeof AC[Accent], accent: Accent, isVolume = false, unit: WeightUnit = 'kg') {
  if (pts.length < 2) { canvasBar(ctx, pts, x, y, w, h, ac, isVolume, unit); return }
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
    ctx.fillStyle = i === sub.length-1 ? ac.barActive : 'rgba(255,255,255,0.85)'
    ctx.fillText(sub[i].date ? fmtXLabel(sub[i].date) : '', px(i), y+h+58)
  })
  ctx.textAlign = 'left'

  ctx.textAlign = 'right'; ctx.font = f(34)
  yTicks.forEach(tick => {
    const ty = py(tick)
    if (ty < y - 4 || ty > y + h + 4) return
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.fillText(fmtYLabel(tick, isVolume, unit), x - 16, ty + 10)
  })
  ctx.textAlign = 'left'
}

/* ── Canvas card (volume / bodyweight only) ──────────────── */
async function generateStatsCard(data: StatsData, theme: Theme, accent: Accent, chartType: ChartType, unit: WeightUnit = 'kg'): Promise<Blob> {
  const W = 1080, H = 1920
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')!
  const ac = AC[accent]
  const heroColor = ac.hex

  if (theme === 'dark') {
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, W, H)
  }

  ctx.fillStyle = ac.badgeBg; rr(ctx, 80, 100, 268, 68, 14); ctx.fill()
  if (accent === 'dark') {
    ctx.strokeStyle = ac.badgeBorder; ctx.lineWidth = 1.5
    rr(ctx, 80, 100, 268, 68, 14); ctx.stroke()
  }
  ctx.fillStyle = ac.badgeText; ctx.font = f(28, 700); ctx.fillText('REPRA', 112, 147)

  const divider = (y: number) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(80, y); ctx.lineTo(W-80, y); ctx.stroke()
  }

  let metricLabel: string
  let exerciseName: string | null = null
  let heroStr: string
  let supp1: string | null = null
  let supp2: string | null = null
  let supp2Color = 'rgba(255,255,255,0.75)'
  let chartData: ChartPt[] = []

  const canvasUnitLabel = weightUnitLabel(unit)
  if (data.type === 'volume') {
    metricLabel = 'DAILY VOLUME'
    exerciseName = BODY_PART_DISPLAY[data.bodyPart] ?? data.bodyPart.toUpperCase()
    const maxVol = data.history.length ? Math.max(...data.history.map(d => d.volume)) : 0
    const maxVolDisplay = Math.round(toDisplayWeight(maxVol, unit))
    const fmtT = (v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}t` : `${v.toLocaleString()}${canvasUnitLabel}`
    heroStr = fmtT(maxVolDisplay)
    const totalDisplay = Math.round(toDisplayWeight(data.totalVolume, unit))
    supp1 = `${fmtT(totalDisplay)} accumulated`
    supp2 = `${data.sessionCount} sessions`; supp2Color = 'rgba(255,255,255,0.75)'
    chartData = data.history.map(d => ({ date: d.date, value: Math.round(toDisplayWeight(d.volume, unit)) }))
  } else {
    const bw = data as Extract<StatsData, {type:'bodyweight'}>
    metricLabel = 'BODY WEIGHT'
    heroStr = String(toDisplayWeight(bw.currentWeight, unit))
    if (bw.change !== 0) {
      const changeDisplay = Math.round(toDisplayWeight(bw.change, unit) * 10) / 10
      supp1 = `${changeDisplay > 0 ? '+' : ''}${changeDisplay} ${canvasUnitLabel} since start`
    }
    if (bw.history.length >= 2) {
      const startDisplay = toDisplayWeight(bw.history[0].weight, unit)
      const currDisplay = toDisplayWeight(bw.currentWeight, unit)
      supp2 = `${startDisplay} ${canvasUnitLabel} → ${currDisplay} ${canvasUnitLabel}`
      supp2Color = 'rgba(255,255,255,0.65)'
    }
    chartData = bw.history.map(d => ({ date: d.date, value: toDisplayWeight(d.weight, unit) }))
  }

  let cy = 202
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = f(32, 500)
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
  ctx.fillStyle = 'rgba(255,255,255,0.70)'; ctx.font = f(56, 500)
  ctx.fillText(' ' + canvasUnitLabel, 80 + hw + 10, cy - 12)
  cy += 72

  if (supp1) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = f(34)
    ctx.fillText(supp1, 80, cy)
  }
  cy += 58

  if (supp2) {
    ctx.fillStyle = supp2Color; ctx.font = f(34)
    ctx.fillText(supp2, 80, cy)
  }
  cy += 58

  cy += 26; divider(cy); cy += 46
  ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = f(24, 500)
  ctx.fillText('PROGRESSION', 80, cy); cy += 38

  const chartTop    = cy
  const chartBottom = H - 170
  const chartH      = chartBottom - chartTop
  const isVol       = data.type === 'volume'
  const chartX      = 200
  const chartW      = W - chartX - 80

  if (chartType === 'line') {
    canvasLine(ctx, chartData, chartX, chartTop, chartW, chartH, ac, accent, isVol, unit)
  } else {
    canvasBar(ctx, chartData, chartX, chartTop, chartW, chartH, ac, isVol, unit)
  }

  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = f(26)
  ctx.fillText('Made with REPRA · repra.app', 80, H - 56)

  return new Promise(resolve => cv.toBlob(b => resolve(b!), 'image/png'))
}

/* ── Graph card capture (html-to-image, dynamic import) ──── */
async function captureGraphElement(
  el: HTMLDivElement,
  isTransparent: boolean,
): Promise<Blob> {
  const { toPng } = await import('html-to-image')
  await document.fonts.ready
  await new Promise(r => requestAnimationFrame(r))
  await new Promise(r => setTimeout(r, 80))

  const W = el.offsetWidth
  const H = el.offsetHeight
  const pixelRatio = Math.min(4, Math.round(1080 / Math.max(W, 1)))

  const prevBg = el.style.background
  if (isTransparent) {
    // Remove checker pattern — captured PNG will have transparent bg
    el.style.background = 'transparent'
    await new Promise(r => requestAnimationFrame(r))
  }

  try {
    const dataUrl = await toPng(el, {
      width: W,
      height: H,
      style: { width: `${W}px`, height: `${H}px` },
      pixelRatio,
      cacheBust: true,
      skipFonts: true,
    })
    const res = await fetch(dataUrl)
    return await res.blob()
  } finally {
    if (isTransparent) {
      el.style.background = prevBg
    }
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

/* ── Layout thumbnail (pure SVG) ─────────────────────────── */
function LayoutThumb({ layoutKey, accentHex, selected }: {
  layoutKey: string
  accentHex: string
  selected: boolean
}) {
  const rects: Record<string, { x: number; y: number; w: number; h: number }> = {
    full:   { x: 14, y: 4,  w: 12, h: 32 },
    bottom: { x: 3,  y: 15, w: 34, h: 9  },
    mini:   { x: 8,  y: 8,  w: 24, h: 24 },
    wide:   { x: 3,  y: 10, w: 34, h: 20 },
  }
  const r = rects[layoutKey] ?? rects.full
  const pts = [
    [r.x + 2,          r.y + r.h * 0.80],
    [r.x + r.w * 0.28, r.y + r.h * 0.58],
    [r.x + r.w * 0.60, r.y + r.h * 0.32],
    [r.x + r.w - 2,    r.y + r.h * 0.14],
  ]
  const linePoints = pts.map(([lx, ly]) => `${lx!.toFixed(1)},${ly!.toFixed(1)}`).join(' ')

  return (
    <svg viewBox="0 0 40 40" width={40} height={40} style={{ display: 'block' }}>
      <rect
        x={r.x} y={r.y} width={r.w} height={r.h} rx={2}
        fill={selected ? `${accentHex}18` : 'rgba(255,255,255,0.06)'}
        stroke={selected ? accentHex : 'rgba(255,255,255,0.2)'}
        strokeWidth={1.2}
      />
      <polyline
        points={linePoints}
        fill="none"
        stroke={selected ? accentHex : 'rgba(255,255,255,0.35)'}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

/* ── Line SVG for MAX 1RM card previews ──────────────────── */
function MiniLineSVG({ data, accentHex, areaFill, strokeWidth = 2.5 }: {
  data: { est1rm: number }[]
  accentHex: string
  areaFill: string
  strokeWidth?: number
}) {
  if (data.length < 2) return null
  const W = 100, H = 100
  const values = data.map(d => d.est1rm)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const rng = max - min || max * 0.1 || 1
  const padY = H * 0.08
  const px = (i: number) => (i / (data.length - 1)) * W
  const py = (v: number) => H - padY - ((v - min) / rng) * (H - padY * 2)
  const linePoints = data.map((d, i) => `${px(i).toFixed(1)},${py(d.est1rm).toFixed(1)}`).join(' ')
  const areaPoints = `0,${H} ${linePoints} ${W},${H}`
  const lastX = px(data.length - 1)
  const lastY = py(data[data.length - 1].est1rm)
  const firstX = px(0)
  const firstY = py(data[0].est1rm)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
      <polygon points={areaPoints} fill={areaFill} />
      <polyline
        points={linePoints} fill="none" stroke={accentHex}
        strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round"
      />
      {/* Start point */}
      <circle cx={firstX.toFixed(1)} cy={firstY.toFixed(1)} r="2.2" fill="rgba(255,255,255,0.5)" />
      {/* Latest point with glow */}
      <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r="9" fill={accentHex} opacity="0.2" />
      <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r="5" fill={accentHex} opacity="0.45" />
      <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r="3" fill={accentHex} />
    </svg>
  )
}

/* ── Main component ──────────────────────────────────────── */
export default function StatsShareView({ data }: { data: StatsData }) {
  const router        = useRouter()
  const fullGraphRef  = useRef<HTMLDivElement>(null)
  const bottomCardRef = useRef<HTMLDivElement>(null)
  const miniCardRef   = useRef<HTMLDivElement>(null)
  const wideCardRef   = useRef<HTMLDivElement>(null)
  const { unit }      = useWeightUnit()
  const unitLabel  = weightUnitLabel(unit)

  const [theme,      setTheme]      = useState<Theme>('dark')
  const [accent,     setAccent]     = useState<Accent>('dark')
  const [chartType,  setChartType]  = useState<ChartType>(data.type === 'volume' ? 'bar' : 'line')
  const [sharing,    setSharing]    = useState(false)
  const [status,     setStatus]     = useState('')
  const [shareCount, setShareCount] = useState(0)

  // MAX 1RM layout controls
  const [graphLayout,  setGraphLayout]  = useState<GraphLayout>('full')
  const [graphPreset,  setGraphPreset]  = useState<GraphPreset>('orange')
  const [cardStyle,    setCardStyle]    = useState<CardStyle>('glass')
  const [shadowLevel,  setShadowLevel]  = useState<ShadowLevel>('soft')

  useEffect(() => { setShareCount(getShareCount()) }, [])

  const isMax1RM = data.type === 'max1rm'
  const gp      = PRESETS[graphPreset]
  const ac      = AC[accent]
  const acHex   = ac.hex
  const areaFill = acRgba(gp.accentHex, 0.12)

  // Non-MAX1RM backgrounds
  const cardBg = theme === 'dark'
    ? '#0a0a0a'
    : `linear-gradient(rgba(0,0,0,0.42), rgba(0,0,0,0.48)), ${CHECKER} #1a1a1a`

  // MAX 1RM card backgrounds
  const isTransparentCard = graphLayout !== 'full' && cardStyle === 'transparent'
  // Full uses dark + accent tint (Glass only — transparent is unnatural for full-bleed story)
  const fullBg      = `linear-gradient(165deg, ${acRgba(gp.accentHex, 0.09)} 0%, #080808 55%)`
  // Card layouts: glass gradient (matching Workout Story) or checker for transparent preview
  const cardStyleBg = isTransparentCard
    ? `linear-gradient(rgba(0,0,0,0.42), rgba(0,0,0,0.48)), ${CHECKER} #1a1a1a`
    : gp.bgCombined
  const shadowValue    = SHADOW_MAP[shadowLevel]
  const glassShadow    = `inset 0 1px 0 rgba(255,255,255,0.16)${shadowLevel !== 'none' ? `, ${shadowValue}` : ''}`
  const cardBoxShadow  = isTransparentCard ? shadowValue : glassShadow
  const textShadowVal  = SHADOW_MAP[shadowLevel]

  const handleShare = async () => {
    setSharing(true)
    setStatus('Generating...')
    try {
      let blob: Blob
      let filename: string

      if (data.type === 'max1rm') {
        // Select export target by layout
        const el: HTMLDivElement | null =
          graphLayout === 'full'   ? fullGraphRef.current  :
          graphLayout === 'bottom' ? bottomCardRef.current :
          graphLayout === 'mini'   ? miniCardRef.current   :
                                     wideCardRef.current

        // Pre-save validation
        const w         = el?.offsetWidth  ?? 0
        const h         = el?.offsetHeight ?? 0
        const innerText = el?.innerText?.trim() ?? ''
        const childCount = el?.children.length ?? 0

        if (process.env.NODE_ENV === 'development') {
          console.log('[REPRA export check]', {
            exportTargetExists: !!el,
            innerText: innerText.slice(0, 120),
            offsetWidth: w,
            offsetHeight: h,
            childrenLength: childCount,
            graphLayout,
            cardStyle,
            graphPreset,
          })
        }

        if (!el || w === 0 || h === 0 || innerText === '' || childCount === 0) {
          setStatus('Could not create image. Please try again.')
          setTimeout(() => setStatus(''), 3000)
          setSharing(false)
          return
        }

        // Full always dark; card layouts respect cardStyle
        const isTransparent = graphLayout !== 'full' && cardStyle === 'transparent'
        blob = await captureGraphElement(el, isTransparent)

        // Build filename
        const today    = new Date().toISOString().split('T')[0]
        const nameSlug = (RM_JA_EN[exNameRaw] ?? exNameRaw)
          .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 20) || 'exercise'
        filename = graphLayout === 'full'
          ? `repra-max-1rm-story-${today}-${nameSlug}.png`
          : `repra-max-1rm-card-${today}-${nameSlug}-${graphLayout}.png`

      } else {
        // Volume / bodyweight — keep existing Web Share API flow
        blob = await generateStatsCard(data, theme, accent, chartType, unit)
        filename = 'repra-stats.png'
        const file = new File([blob], filename, { type: 'image/png' })
        if (navigator.canShare?.({ files: [file] })) {
          setStatus('Sharing...')
          await navigator.share({ files: [file], title: 'REPRA Stats' })
          const next = incrementShareCount(); setShareCount(next)
          setStatus('')
          return
        }
      }

      // Download fallback (MAX 1RM always; non-MAX1RM when canShare is false)
      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
      const next = incrementShareCount(); setShareCount(next)
      setStatus('Downloaded!')
      setTimeout(() => setStatus(''), 2000)

    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        setStatus('Could not create image. Please try again.')
      } else {
        setStatus('')
      }
    } finally {
      setSharing(false)
    }
  }

  /* ── MAX 1RM data ────────────────────────────────────────── */
  const rm1FullHistory = isMax1RM ? (data as Extract<StatsData,{type:'max1rm'}>).history : []
  const bestRM         = isMax1RM ? (data as Extract<StatsData,{type:'max1rm'}>).bestRM : 0
  const exNameRaw      = isMax1RM ? (data as Extract<StatsData,{type:'max1rm'}>).exerciseName : ''
  const exNameEn       = RM_JA_EN[exNameRaw] ?? exNameRaw.toUpperCase()
  const exName         = exNameEn.length > 18 ? exNameEn.slice(0, 17) + '…' : exNameEn

  const rm1Growth   = rm1FullHistory.length >= 2
    ? Math.round((toDisplayWeight(bestRM, unit) - toDisplayWeight(rm1FullHistory[0].est1rm, unit)) * 10) / 10
    : null
  const rm1FirstVal = rm1FullHistory.length >= 1 ? toDisplayWeight(rm1FullHistory[0].est1rm, unit) : null
  const bestRMDisplay = toDisplayWeight(bestRM, unit)

  // SVG data: all history points, unit-converted
  const rm1SVGData = rm1FullHistory.map(p => ({
    est1rm: Math.round(toDisplayWeight(p.est1rm, unit)),
  }))

  /* ── Non-max1rm preview values ───────────────────────────── */
  let metricLabel = ''
  let exerciseName: string | null = null
  let heroNum = ''
  let supp1: string | null = null
  let supp2: string | null = null
  let supp2Color = 'rgba(255,255,255,0.75)'
  let chartData: ChartPt[] = []

  if (data.type === 'volume') {
    metricLabel = 'DAILY VOLUME'
    exerciseName = BODY_PART_DISPLAY[data.bodyPart] ?? data.bodyPart.toUpperCase()
    const maxVol = data.history.length ? Math.round(toDisplayWeight(Math.max(...data.history.map(d => d.volume)), unit)) : 0
    const fmtT = (v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}t` : `${v.toLocaleString()}${unitLabel}`
    heroNum = fmtT(maxVol)
    const displayTotal = Math.round(toDisplayWeight(data.totalVolume, unit))
    supp1 = `${fmtT(displayTotal)} total`
    supp2 = `${data.sessionCount} sessions`; supp2Color = 'rgba(255,255,255,0.75)'
    chartData = data.history.map(d => ({ date: d.date, value: Math.round(toDisplayWeight(d.volume, unit)) }))
  } else if (data.type === 'bodyweight') {
    metricLabel = 'BODY WEIGHT'
    heroNum = String(toDisplayWeight(data.currentWeight, unit))
    if (data.change !== 0) {
      const changeDisplay = Math.round(toDisplayWeight(data.change, unit) * 10) / 10
      supp1 = `${changeDisplay > 0 ? '+' : ''}${changeDisplay} ${unitLabel} since start`
    }
    if (data.history.length >= 2) {
      const startDisplay = toDisplayWeight(data.history[0].weight, unit)
      const currDisplay = toDisplayWeight(data.currentWeight, unit)
      supp2 = `${startDisplay} ${unitLabel} → ${currDisplay} ${unitLabel}`
      supp2Color = 'rgba(255,255,255,0.65)'
    }
    chartData = data.history.map(d => ({ date: d.date, value: Math.round(toDisplayWeight(d.weight, unit) * 10) / 10 }))
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

  /* ── Badge helper ─────────────────────────────────────────── */
  const gpBadge = (
    <span style={{
      fontSize: 8, fontWeight: 900, padding: '2px 7px', borderRadius: 5,
      background: gp.badgeBg, color: gp.badgeText, border: '1px solid transparent',
      letterSpacing: '0.16em', display: 'inline-block',
    }}>REPRA</span>
  )

  /* ── Section label helper ─────────────────────────────────── */
  const sectionLabel = (text: string) => (
    <p style={{ fontSize: 10, fontWeight: 700, color: '#555', letterSpacing: '0.08em', marginBottom: 8 }}>{text}</p>
  )

  return (
    <div className="min-h-screen pb-nav flex flex-col" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl" style={{ background: '#1a1a1a' }}>
          <ArrowLeft size={18} style={{ color: '#888' }} />
        </button>
        <h1 className="text-base font-black tracking-widest text-white">Share Story</h1>
      </div>

      {/* ① GRAPH LAYOUT ────────────────────────────────────── */}
      {isMax1RM && (
        <div className="px-4 mb-4">
          {sectionLabel('GRAPH LAYOUT')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {GRAPH_LAYOUTS.map(l => {
              const sel = graphLayout === l.key
              return (
                <button
                  key={l.key}
                  onClick={() => setGraphLayout(l.key as GraphLayout)}
                  style={{
                    background: sel ? acRgba(gp.accentHex, 0.15) : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${sel ? gp.accentHex : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 14,
                    padding: '10px 12px',
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                    cursor: 'pointer', textAlign: 'left',
                  }}>
                  <LayoutThumb layoutKey={l.key} accentHex={gp.accentHex} selected={sel} />
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: sel ? gp.accentHex : '#fff', margin: 0, lineHeight: 1.2 }}>
                      {l.ratio} {l.labelEn}
                    </p>
                    <p style={{ fontSize: 9, color: '#555', margin: '2px 0 0', lineHeight: 1.2 }}>
                      {l.labelJa}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ② DESIGN PRESET ────────────────────────────────────── */}
      {isMax1RM && (
        <div className="px-4 mb-4">
          {sectionLabel('DESIGN PRESET')}
          <div className="flex gap-2">
            {(['orange', 'ice-blue', 'violet', 'mint'] as GraphPreset[]).map(pk => {
              const pd  = PRESETS[pk]
              const sel = graphPreset === pk
              return (
                <button
                  key={pk}
                  onClick={() => setGraphPreset(pk)}
                  style={{
                    flex: 1, padding: '10px 4px', borderRadius: 12, cursor: 'pointer',
                    background: sel ? acRgba(pd.accentHex, 0.15) : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${sel ? pd.accentHex : 'rgba(255,255,255,0.08)'}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  }}>
                  <div style={{ width: 20, height: 20, borderRadius: 10, background: pd.accentHex }} />
                  <span style={{
                    fontSize: 8, fontWeight: 700, letterSpacing: '0.04em', textAlign: 'center',
                    color: sel ? pd.accentHex : '#666', lineHeight: 1.3, display: 'block',
                  }}>
                    {PRESET_LABELS[pk]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ③ CARD STYLE — non-Full only ────────────────────────── */}
      {isMax1RM && graphLayout !== 'full' && (
        <div className="px-4 mb-3">
          {sectionLabel('CARD STYLE')}
          <div className="flex gap-2">
            {(['glass', 'transparent'] as CardStyle[]).map(cs => {
              const sel = cardStyle === cs
              return (
                <button key={cs} onClick={() => setCardStyle(cs)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                  style={{
                    background: sel ? acRgba(gp.accentHex, 0.15) : '#1a1a1a',
                    color: sel ? gp.accentHex : '#666',
                    border: `1.5px solid ${sel ? gp.accentHex : '#2a2a2a'}`,
                  }}>
                  {cs === 'glass' ? 'Glass' : 'Transparent'}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ④ SHADOW — non-Full only ────────────────────────────── */}
      {isMax1RM && graphLayout !== 'full' && (
        <div className="px-4 mb-4">
          {sectionLabel('SHADOW')}
          <div className="flex gap-2">
            {(['none', 'soft', 'strong', 'extra-strong'] as ShadowLevel[]).map(sl => {
              const sel = shadowLevel === sl
              const label = sl === 'none' ? 'None' : sl === 'soft' ? 'Soft' : sl === 'strong' ? 'Strong' : 'Extra'
              return (
                <button key={sl} onClick={() => setShadowLevel(sl)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                  style={{
                    background: sel ? acRgba(gp.accentHex, 0.15) : '#1a1a1a',
                    color: sel ? gp.accentHex : '#666',
                    border: `1.5px solid ${sel ? gp.accentHex : '#2a2a2a'}`,
                  }}>
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ⑤ PREVIEW ──────────────────────────────────────────── */}
      <div className="px-4 mb-5">

        {isMax1RM ? (
          <>
            {/* ── Full Graph (9:16) — line chart ── */}
            {graphLayout === 'full' && (
              <div ref={fullGraphRef} style={{
                aspectRatio: '9/16',
                width: '100%',
                background: fullBg,
                borderRadius: 24,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                border: `1px solid ${gp.border}`,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
                textShadow: textShadowVal,
              }}>
                {/* Header */}
                <div style={{ padding: '16px 18px 0', flexShrink: 0 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 900, padding: '2px 8px', borderRadius: 5,
                    background: gp.badgeBg, color: gp.badgeText, border: '1px solid transparent',
                    letterSpacing: '0.12em', display: 'inline-block',
                  }}>REPRA</span>
                  <p style={{ fontSize: 8.5, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.14em', margin: '7px 0 2px' }}>
                    MAX 1RM PROGRESS
                  </p>
                  <p style={{ fontSize: 19, fontWeight: 900, color: '#fff', lineHeight: 1.1, margin: 0 }}>
                    {exName}
                  </p>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: acRgba(gp.accentHex, 0.25), margin: '10px 18px' }} />

                {/* Stats row */}
                <div style={{ padding: '0 18px', flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  {rm1FirstVal !== null && (
                    <>
                      <div>
                        <p style={{ fontSize: 6.5, fontWeight: 700, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.1em', margin: '0 0 2px' }}>START</p>
                        <p style={{ fontSize: 17, fontWeight: 700, color: '#bbb', margin: 0, lineHeight: 1 }}>
                          {rm1FirstVal}<span style={{ fontSize: 8.5, color: '#777', marginLeft: 1 }}>{unitLabel}</span>
                        </p>
                      </div>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.22)', margin: '7px 0 0' }}>→</p>
                    </>
                  )}
                  <div>
                    <p style={{ fontSize: 6.5, fontWeight: 700, color: gp.accentHex, letterSpacing: '0.1em', margin: '0 0 2px' }}>BEST</p>
                    <p style={{ fontSize: rm1FirstVal !== null ? 24 : 30, fontWeight: 900, color: gp.accentHex, margin: 0, lineHeight: 1 }}>
                      {bestRMDisplay}
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 400, marginLeft: 2 }}>{unitLabel}</span>
                    </p>
                  </div>
                  {rm1Growth !== null && (
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <p style={{ fontSize: 6.5, fontWeight: 700, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.1em', margin: '0 0 2px' }}>GAIN</p>
                      <p style={{ fontSize: 17, fontWeight: 800, color: rm1Growth >= 0 ? '#4ade80' : '#f87171', margin: 0, lineHeight: 1 }}>
                        {rm1Growth >= 0 ? '+' : ''}{rm1Growth}
                        <span style={{ fontSize: 8.5, marginLeft: 1 }}>{unitLabel}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Line chart */}
                <div style={{ flex: 1, minHeight: 0, padding: '12px 14px 0' }}>
                  {rm1SVGData.length >= 2 ? (
                    <MiniLineSVG
                      data={rm1SVGData}
                      accentHex={gp.accentHex}
                      areaFill={areaFill}
                      strokeWidth={3.5}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>No data yet</p>
                    </div>
                  )}
                </div>

                {/* Date labels */}
                {rm1FullHistory.length >= 2 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 18px 0', flexShrink: 0 }}>
                    <span style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.35)' }}>
                      {fmtXLabel(rm1FullHistory[0].date)}
                    </span>
                    <span style={{ fontSize: 7.5, color: gp.accentHex, fontWeight: 600 }}>
                      {fmtXLabel(rm1FullHistory[rm1FullHistory.length - 1].date)}
                    </span>
                  </div>
                )}

                {/* Footer */}
                <p style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.28)', padding: '7px 18px 14px', margin: 0, flexShrink: 0 }}>
                  Made with <span style={{ color: acRgba(gp.accentHex, 0.6), fontWeight: 700 }}>REPRA</span>
                </p>
              </div>
            )}

            {/* ── Bottom (4:1) ── */}
            {graphLayout === 'bottom' && (
              <div ref={bottomCardRef} style={{
                width: '100%', aspectRatio: '4/1',
                background: cardStyleBg, borderRadius: 18,
                overflow: 'hidden', display: 'flex',
                alignItems: 'center', padding: '0 16px',
                boxShadow: cardBoxShadow, gap: 14,
                border: isTransparentCard ? 'none' : `1px solid ${gp.border}`,
                textShadow: textShadowVal,
              }}>
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {gpBadge}
                  <p style={{ fontSize: 12, fontWeight: 900, color: '#fff', margin: '4px 0 1px', lineHeight: 1.1 }}>{exName}</p>
                  <p style={{ fontSize: 7.5, fontWeight: 700, color: gp.accentHex, letterSpacing: '0.08em', margin: 0 }}>1RM PROGRESS</p>
                </div>
                <div style={{ flex: 1, minWidth: 0, height: '62%' }}>
                  <MiniLineSVG data={rm1SVGData} accentHex={gp.accentHex} areaFill={areaFill} />
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <p style={{ fontSize: 30, fontWeight: 900, color: gp.accentHex, margin: 0, lineHeight: 1 }}>{bestRMDisplay}</p>
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', margin: '2px 0 0', fontWeight: 500 }}>{unitLabel} best</p>
                  {rm1Growth !== null && (
                    <p style={{ fontSize: 10, fontWeight: 700, color: rm1Growth >= 0 ? '#4ade80' : '#f87171', margin: '3px 0 0' }}>
                      {rm1Growth >= 0 ? '+' : ''}{rm1Growth}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── Mini (1:1) ── */}
            {graphLayout === 'mini' && (
              <div style={{ width: '72%', margin: '0 auto' }}>
                <div ref={miniCardRef} style={{
                  aspectRatio: '1/1',
                  background: cardStyleBg, borderRadius: 20,
                  overflow: 'hidden', padding: 16,
                  display: 'flex', flexDirection: 'column',
                  boxShadow: cardBoxShadow,
                  border: isTransparentCard ? 'none' : `1px solid ${gp.border}`,
                  textShadow: textShadowVal,
                }}>
                  {gpBadge}
                  <p style={{ fontSize: 13, fontWeight: 900, color: '#fff', margin: '5px 0 1px', lineHeight: 1.1 }}>{exName}</p>
                  <p style={{ fontSize: 7.5, fontWeight: 700, color: gp.accentHex, letterSpacing: '0.08em', margin: 0 }}>1RM PROGRESS</p>
                  <div style={{ flex: 1, minHeight: 0, margin: '8px 0' }}>
                    <MiniLineSVG data={rm1SVGData} accentHex={gp.accentHex} areaFill={areaFill} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
                      <span style={{ fontSize: 34, fontWeight: 900, color: gp.accentHex, lineHeight: 1 }}>{bestRMDisplay}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.65)', paddingBottom: 2 }}>{unitLabel}</span>
                    </div>
                    {rm1Growth !== null && (
                      <p style={{ fontSize: 11, fontWeight: 700, color: rm1Growth >= 0 ? '#4ade80' : '#f87171', margin: '3px 0 0' }}>
                        {rm1Growth >= 0 ? '+' : ''}{rm1Growth}{unitLabel} GAIN
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Wide (16:9) ── */}
            {graphLayout === 'wide' && (
              <div ref={wideCardRef} style={{
                width: '100%', aspectRatio: '16/9',
                background: cardStyleBg, borderRadius: 18,
                overflow: 'hidden', display: 'flex',
                boxShadow: cardBoxShadow,
                border: isTransparentCard ? 'none' : `1px solid ${gp.border}`,
                textShadow: textShadowVal,
              }}>
                {/* Left info column */}
                <div style={{ width: '38%', padding: '14px 10px 14px 16px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                  {gpBadge}
                  <p style={{ fontSize: 13, fontWeight: 900, color: '#fff', margin: '6px 0 1px', lineHeight: 1.1 }}>{exName}</p>
                  <p style={{ fontSize: 7.5, fontWeight: 700, color: gp.accentHex, letterSpacing: '0.08em', margin: 0 }}>1RM PROGRESS</p>
                  <div style={{ height: 1, background: acRgba(gp.accentHex, 0.25), margin: '8px 0' }} />
                  {rm1FirstVal !== null && (
                    <p style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.45)', margin: '0 0 3px' }}>
                      {rm1FirstVal}{unitLabel} → <span style={{ color: gp.accentHex, fontWeight: 700 }}>{bestRMDisplay}{unitLabel}</span>
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, marginBottom: rm1Growth !== null ? 3 : 0 }}>
                    <span style={{ fontSize: 28, fontWeight: 900, color: gp.accentHex, lineHeight: 1 }}>{bestRMDisplay}</span>
                    <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.6)', paddingBottom: 2 }}>{unitLabel}</span>
                  </div>
                  {rm1Growth !== null && (
                    <p style={{ fontSize: 11, fontWeight: 700, color: rm1Growth >= 0 ? '#4ade80' : '#f87171', margin: 0 }}>
                      {rm1Growth >= 0 ? '+' : ''}{rm1Growth}{unitLabel}
                    </p>
                  )}
                  <div style={{ flex: 1 }} />
                  <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Made with REPRA</p>
                </div>
                {/* Right chart */}
                <div style={{ flex: 1, minWidth: 0, padding: '14px 14px 14px 0' }}>
                  <MiniLineSVG data={rm1SVGData} accentHex={gp.accentHex} areaFill={areaFill} strokeWidth={3} />
                </div>
              </div>
            )}
          </>

        ) : (

          /* ── Volume / bodyweight: existing vertical layout ─── */
          <div className="w-full rounded-3xl overflow-hidden relative"
            style={{ aspectRatio: '9/16', background: cardBg }}>
            <div className="relative flex flex-col h-full" style={{ padding: '14px 16px 10px', paddingTop: 16 }}>

              <div className="inline-flex mb-2.5">
                <span className="text-[10px] font-black px-2.5 py-1 rounded-lg"
                  style={{ background: ac.badgeBg, color: ac.badgeText, border: `1px solid ${ac.badgeBorder}`, letterSpacing: '0.12em' }}>
                  REPRA
                </span>
              </div>

              <p style={{ fontSize: 9, fontWeight: 600, color: '#EDEDED', letterSpacing: '0.1em', marginBottom: 2 }}>
                {metricLabel}
              </p>
              {exerciseName && (
                <p style={{ fontSize: 15, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 0 }}>
                  {exerciseName}
                </p>
              )}

              <div style={{ height: 1, background: 'rgba(255,255,255,0.20)', marginTop: 7, marginBottom: 7 }} />

              <div className="flex items-baseline" style={{ gap: 3, marginBottom: 1 }}>
                <span style={{ fontSize: 44, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', color: acHex }}>
                  {heroNum}
                </span>
                <span style={{ fontSize: 15, fontWeight: 500, color: '#F2F2F2' }}>kg</span>
              </div>

              {supp1 && <p style={{ fontSize: 9.5, color: '#EDEDED', marginBottom: 1.5 }}>{supp1}</p>}
              {supp2 && <p style={{ fontSize: 9.5, color: supp2Color, marginBottom: 0 }}>{supp2}</p>}

              <div style={{ height: 1, background: 'rgba(255,255,255,0.20)', marginTop: 7, marginBottom: 5 }} />

              <p style={{ fontSize: 7.5, fontWeight: 600, color: '#EDEDED', letterSpacing: '0.1em', marginBottom: 5 }}>
                PROGRESSION
              </p>

              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 3 }}>
                  <div style={{ width: 32, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 3, paddingTop: 1 }}>
                    {[...yTicks].reverse().map((v, i) => (
                      <span key={i} style={{ fontSize: 7.5, color: '#EDEDED', textAlign: 'right', lineHeight: 1, display: 'block' }}>
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
                      <span key={i} style={{ fontSize: 7.5, color: '#EDEDED', lineHeight: 1 }}>{lbl}</span>
                    ))}
                  </div>
                )}
              </div>

              <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.65)', marginTop: 5 }}>
                Made with REPRA
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Non-MAX 1RM options ──────────────────────────────── */}
      {!isMax1RM && (
        <div className="px-4 mb-3">
          <p className="text-[10px] font-bold mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>Background</p>
          <div className="flex gap-2">
            {(['dark', 'transparent'] as Theme[]).map(t => (
              <button key={t} className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{ background: theme === t ? '#ED742F' : '#1a1a1a', color: theme === t ? '#fff' : '#666', border: `1px solid ${theme === t ? '#ED742F' : '#2a2a2a'}` }}
                onClick={() => setTheme(t)}>
                {t === 'dark' ? 'Dark' : 'Transparent'}
              </button>
            ))}
          </div>
        </div>
      )}

      {!isMax1RM && (
        <div className="px-4 mb-3">
          <p className="text-[10px] font-bold mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>Color</p>
          <div className="flex gap-2">
            {(() => {
              const shareThemes = getShareThemeUnlocks(shareCount)
              return (['dark', 'orange', 'purple', 'black'] as Accent[]).map(a => {
                const info     = shareThemes.find(t => t.accent === a)!
                const unlocked = info.unlocked
                const sel      = accent === a
                const selBg    = a === 'orange' ? '#ED742F' : a === 'purple' ? '#6E38D4' : a === 'black' ? '#050505' : '#3a3a3a'
                const bg       = sel ? selBg : '#1a1a1a'
                return (
                  <button key={a} className="flex-1 py-2 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-0.5"
                    style={{ background: bg, color: unlocked ? '#fff' : '#444', border: `1px solid ${sel ? selBg : '#2a2a2a'}`, opacity: unlocked ? 1 : 0.55, minHeight: 44 }}
                    onClick={() => unlocked && setAccent(a)}>
                    <span>{info.label}</span>
                    {!unlocked && <span style={{ fontSize: 9, color: '#555' }}>🔒{info.requiredShares}</span>}
                  </button>
                )
              })
            })()}
          </div>
        </div>
      )}

      {!isMax1RM && (
        <div className="px-4 mb-6">
          <p className="text-[10px] font-bold mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>Chart Type</p>
          <div className="flex gap-2">
            {(['bar', 'line'] as ChartType[]).map(ct => (
              <button key={ct} className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{ background: chartType === ct ? '#ED742F' : '#1a1a1a', color: chartType === ct ? '#fff' : '#666', border: `1px solid ${chartType === ct ? '#ED742F' : '#2a2a2a'}` }}
                onClick={() => setChartType(ct)}>
                {ct === 'bar' ? 'Bar' : 'Line'}
              </button>
            ))}
          </div>
        </div>
      )}

      {isMax1RM && <div className="mb-3" />}

      {/* ⑥ SAVE BUTTON ──────────────────────────────────────── */}
      <div className="px-4 space-y-2 mb-6">
        {status && <p className="text-center text-sm" style={{ color: '#888' }}>{status}</p>}
        <button
          className="w-full py-4 rounded-2xl text-base font-black text-white flex items-center justify-center gap-2"
          style={{ background: '#ED742F', boxShadow: '0 4px 20px rgba(237, 116, 47,0.3)' }}
          disabled={sharing} onClick={handleShare}>
          <Share2 size={20} />
          {isMax1RM
            ? (sharing ? 'Generating...' : graphLayout === 'full' ? 'Save Graph Story' : 'Save Graph Card')
            : (sharing ? 'Generating...' : 'Share to Instagram Story')
          }
        </button>
        <p className="text-center text-xs" style={{ color: '#444' }}>
          Mobile only · Desktop downloads as PNG
        </p>
      </div>
    </div>
  )
}
