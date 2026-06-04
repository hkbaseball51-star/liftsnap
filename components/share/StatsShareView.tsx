'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Share2, ArrowLeft } from 'lucide-react'
import { getShareCount, incrementShareCount, getShareThemeUnlocks } from '@/lib/unlocks'
import { useWeightUnit } from '@/lib/useWeightUnit'
import { toDisplayWeight, weightUnitLabel, type WeightUnit } from '@/lib/units'
import { PRESETS } from '@/components/share/WorkoutStoryCardContent'
import { captureElement, shareOrDownloadImage } from '@/lib/shareImage'

type RMPoint  = { date: string; label: string; est1rm: number }
type VolPoint = { date: string; label: string; volume: number }
type BWPoint  = { date: string; label: string; weight: number }

type VolPPLData = {
  push:  VolPoint[]
  pull:  VolPoint[]
  legs:  VolPoint[]
  other: VolPoint[]
}

export type StatsData =
  | { type: 'max1rm';     exerciseName: string; bestRM: number; bestDate: string; bestSet: { weight: number; reps: number } | null; history: RMPoint[];  sessionCount: number }
  | { type: 'volume';     bodyPart: string; totalVolume: number; sessionCount: number; history: VolPoint[]; pplData: VolPPLData }
  | { type: 'bodyweight'; currentWeight: number; change: number; history: BWPoint[] }

type Theme     = 'dark' | 'transparent'
type Accent    = 'orange' | 'purple' | 'dark' | 'black'
type ChartType = 'bar' | 'line'
type GraphLayout  = 'full' | 'bottom' | 'mini' | 'wide'
// TODO_PRO: premiumDesignPresets — 'premium-black' and 'pearl-white' are candidates for Pro-only presets.
type GraphPreset  = 'orange' | 'ice-blue' | 'violet' | 'mint' | 'premium-black' | 'pearl-white'
type CardStyle    = 'glass' | 'transparent'
type ShadowLevel  = 'none' | 'soft' | 'strong' | 'extra-strong'
type VolViewType  = 'bodypart' | 'ppl'
type PPLGroup     = 'all' | 'push' | 'pull' | 'legs'

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
  all: 'ALL', chest: 'CHEST', back: 'BACK', legs: 'LEGS',
  shoulders: 'SHOULDERS', arms: 'ARMS', abs: 'ABS', other: 'OTHER',
}

const VOL_BODY_PARTS = [
  { key: 'all',       label: 'All'  },
  { key: 'chest',     label: 'Chest' },
  { key: 'back',      label: 'Back'  },
  { key: 'legs',      label: 'Legs'  },
  { key: 'shoulders', label: 'Shoulder' },
  { key: 'arms',      label: 'Arms'  },
  { key: 'abs',       label: 'Abs'   },
  { key: 'other',     label: 'Other' },
]

const VOL_PPL_GROUPS = [
  { key: 'all',  label: 'All'  },
  { key: 'push', label: 'Push' },
  { key: 'pull', label: 'Pull' },
  { key: 'legs', label: 'Legs' },
] as const

const GRAPH_LAYOUTS = [
  { key: 'full',   labelEn: 'Full',   labelJa: '全画面',   ratio: '9:16' },
  { key: 'bottom', labelEn: 'Bottom', labelJa: '下部バー', ratio: '4:1'  },
  { key: 'mini',   labelEn: 'Mini',   labelJa: 'ミニカード', ratio: '1:1' },
  { key: 'wide',   labelEn: 'Wide',   labelJa: 'ワイド',   ratio: '16:9' },
] as const

const PRESET_LABELS: Record<GraphPreset, string> = {
  'orange':        'REPRA Orange',
  'ice-blue':      'Ice Blue',
  'violet':        'Violet Pump',
  'mint':          'Mint Proof',
  'premium-black': 'Premium Black',
  'pearl-white':   'Pearl White',
}

/* ── Helpers ─────────────────────────────────────────────── */
function fmtXLabel(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${M[d.getMonth()]} ${d.getDate()}`
}

function fmtMonthLabel(key: string): string {
  // key is YYYY-MM
  const [y, m] = key.split('-')
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${M[parseInt(m) - 1]} '${y?.slice(2)}`
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

/* ── Volume bar aggregation ───────────────────────────────── */
type VolBar = { label: string; value: number; isLatest: boolean; isBest: boolean }

function aggregateVolBars(
  history: VolPoint[],
  limit: number | null,
): { bars: VolBar[]; granularity: 'daily' | 'weekly' | 'monthly' } {
  const n = history.length
  if (n === 0) return { bars: [], granularity: 'daily' }

  const gran: 'daily' | 'weekly' | 'monthly' = n <= 60 ? 'daily' : n <= 180 ? 'weekly' : 'monthly'

  let raw: { label: string; value: number }[]

  if (gran === 'daily') {
    raw = history.map(p => ({ label: p.date, value: p.volume }))
  } else if (gran === 'weekly') {
    const map = new Map<string, number>()
    const order: string[] = []
    history.forEach(p => {
      const d = new Date(p.date + 'T00:00:00')
      const day = d.getDay()
      const diff = day === 0 ? -6 : 1 - day
      const mon = new Date(d)
      mon.setDate(d.getDate() + diff)
      const key = mon.toISOString().slice(0, 10)
      if (!map.has(key)) { map.set(key, 0); order.push(key) }
      map.set(key, (map.get(key) ?? 0) + p.volume)
    })
    raw = order.map(k => ({ label: k, value: map.get(k) ?? 0 }))
  } else {
    const map = new Map<string, number>()
    const order: string[] = []
    history.forEach(p => {
      const key = p.date.slice(0, 7)
      if (!map.has(key)) { map.set(key, 0); order.push(key) }
      map.set(key, (map.get(key) ?? 0) + p.volume)
    })
    raw = order.map(k => ({ label: k, value: map.get(k) ?? 0 }))
  }

  const limited = limit !== null ? raw.slice(-limit) : raw
  const maxVal = limited.length ? Math.max(...limited.map(b => b.value)) : 0

  return {
    bars: limited.map((b, i) => ({
      label: b.label,
      value: b.value,
      isLatest: i === limited.length - 1,
      isBest: maxVal > 0 && b.value === maxVal,
    })),
    granularity: gran,
  }
}

/* ── Canvas card generator (no longer used for volume/BW, kept for potential fallback) ── */
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
  ctx.fillStyle = ac.badgeText; ctx.font = f(28, 700); ctx.fillText('REPRA', 112, 147)

  const divider = (y: number) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(80, y); ctx.lineTo(W-80, y); ctx.stroke()
  }

  const canvasUnitLabel = weightUnitLabel(unit)
  let metricLabel = 'DAILY VOLUME'
  let exerciseName: string | null = null
  let heroStr = ''
  let chartData: ChartPt[] = []

  if (data.type === 'volume') {
    exerciseName = BODY_PART_DISPLAY[data.bodyPart] ?? data.bodyPart.toUpperCase()
    const maxVol = data.history.length ? Math.max(...data.history.map(d => d.volume)) : 0
    const maxVolDisplay = Math.round(toDisplayWeight(maxVol, unit))
    heroStr = maxVolDisplay >= 1000 ? `${(maxVolDisplay/1000).toFixed(1)}t` : `${maxVolDisplay.toLocaleString()}${canvasUnitLabel}`
    chartData = data.history.map(d => ({ date: d.date, value: Math.round(toDisplayWeight(d.volume, unit)) }))
  } else {
    metricLabel = 'BODY WEIGHT'
    const bw = data as Extract<StatsData, {type:'bodyweight'}>
    heroStr = String(toDisplayWeight(bw.currentWeight, unit))
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
  cy += 72

  cy += 26; divider(cy); cy += 46
  ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = f(24, 500)
  ctx.fillText('PROGRESSION', 80, cy); cy += 38

  const chartTop    = cy
  const chartBottom = H - 170
  const chartH      = chartBottom - chartTop
  const chartX      = 200
  const chartW      = W - chartX - 80

  // Simple bar fallback
  const max = chartData.length ? Math.max(...chartData.map(d => d.value)) : 0
  const n = Math.min(chartData.length, 14)
  const sub = chartData.slice(-n)
  const slotW = chartW / n
  const barW = Math.max(Math.floor(slotW * 0.52), 22)
  sub.forEach((pt, i) => {
    const bH = max > 0 ? Math.round((pt.value / max) * chartH * 0.9) : 4
    const bx = chartX + i * slotW + Math.floor((slotW - barW) / 2)
    const by = chartTop + chartH - bH
    ctx.fillStyle = i === sub.length - 1 ? heroColor : `${heroColor}60`
    ctx.fillRect(bx, by, barW, bH)
  })

  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = f(26)
  ctx.fillText('Made with REPRA · repra.app', 80, H - 56)

  return new Promise(resolve => cv.toBlob(b => resolve(b!), 'image/png'))
}

/* ── SVG chart for volume DOM preview ────────────────────── */
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
function LayoutThumb({ layoutKey, accentHex, selected, isBar = false }: {
  layoutKey: string
  accentHex: string
  selected: boolean
  isBar?: boolean
}) {
  const rects: Record<string, { x: number; y: number; w: number; h: number }> = {
    full:   { x: 14, y: 4,  w: 12, h: 32 },
    bottom: { x: 3,  y: 15, w: 34, h: 9  },
    mini:   { x: 8,  y: 8,  w: 24, h: 24 },
    wide:   { x: 3,  y: 10, w: 34, h: 20 },
  }
  const r = rects[layoutKey] ?? rects.full
  const stroke = selected ? accentHex : 'rgba(255,255,255,0.35)'

  // Bar chart thumb
  if (isBar) {
    const barCount = 7
    const innerW = r.w - 4
    const slotW = innerW / barCount
    const barW = slotW * 0.6
    const heights = [0.4, 0.6, 0.45, 0.8, 0.55, 0.7, 1.0]
    return (
      <svg viewBox="0 0 40 40" width={40} height={40} style={{ display: 'block' }}>
        <rect
          x={r.x} y={r.y} width={r.w} height={r.h} rx={2}
          fill={selected ? `${accentHex}18` : 'rgba(255,255,255,0.06)'}
          stroke={selected ? accentHex : 'rgba(255,255,255,0.2)'}
          strokeWidth={1.2}
        />
        {heights.map((h, i) => {
          const bH = r.h * 0.85 * h
          const bx = r.x + 2 + i * slotW + (slotW - barW) / 2
          const by = r.y + r.h - bH - 1
          return <rect key={i} x={bx.toFixed(1)} y={by.toFixed(1)} width={barW.toFixed(1)} height={bH.toFixed(1)} rx="0.5" fill={i === heights.length - 1 ? stroke : stroke + '60'} />
        })}
      </svg>
    )
  }

  // Line chart thumb
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
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

/* ── Sharp polyline SVG for MAX 1RM card previews ─────────── */
function MiniLineSVG({ data, accentHex, latestHex, areaFill, strokeWidth = 0.75, isDarkBg = true }: {
  data: { est1rm: number }[]
  accentHex: string
  latestHex: string
  areaFill: string
  strokeWidth?: number
  isDarkBg?: boolean
}) {
  if (data.length < 2) return null
  const W = 100, H = 100
  const values = data.map(d => d.est1rm)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const rng = max - min || max * 0.1 || 1

  const padX  = 6
  const padYt = 10
  const padYb = 6

  const px = (i: number) => padX + (i / (data.length - 1)) * (W - 2 * padX)
  const py = (v: number) => padYt + ((max - v) / rng) * (H - padYt - padYb)

  const linePoints = data.map((d, i) => `${px(i).toFixed(1)},${py(d.est1rm).toFixed(1)}`).join(' ')
  const areaPoints = `${padX},${H} ${linePoints} ${(W - padX).toFixed(1)},${H}`

  const lastX  = px(data.length - 1)
  const lastY  = py(data[data.length - 1].est1rm)
  const firstX = px(0)
  const firstY = py(data[0].est1rm)
  const firstDotColor = isDarkBg ? 'rgba(255,255,255,0.30)' : 'rgba(17,24,39,0.30)'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
      <polygon points={areaPoints} fill={areaFill} />
      <polyline
        points={linePoints} fill="none" stroke={accentHex}
        strokeWidth={strokeWidth} strokeLinejoin="miter" strokeLinecap="butt"
      />
      <circle cx={firstX.toFixed(1)} cy={firstY.toFixed(1)} r="1.0" fill={firstDotColor} />
      <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r="3.5" fill={latestHex} opacity="0.08" />
      <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r="2.0" fill={latestHex} opacity="0.28" />
      <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r="1.4" fill={latestHex} />
    </svg>
  )
}

/* ── Sharp polyline SVG for Body Weight card previews ─────── */
function BWLineSVG({ values, accentHex, latestHex, areaFill, strokeWidth = 0.75, isDarkBg = true }: {
  values: number[]
  accentHex: string
  latestHex: string
  areaFill: string
  strokeWidth?: number
  isDarkBg?: boolean
}) {
  if (values.length < 1) return null
  const W = 100, H = 100
  const max = Math.max(...values)
  const min = Math.min(...values)
  const rng = max - min || max * 0.1 || 1

  const padX  = 6
  const padYt = 10
  const padYb = 6

  const px = (i: number) => padX + (i / Math.max(values.length - 1, 1)) * (W - 2 * padX)
  const py = (v: number) => padYt + ((max - v) / rng) * (H - padYt - padYb)

  const linePoints = values.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ')
  const areaPoints = values.length > 1
    ? `${padX},${H} ${linePoints} ${(W - padX).toFixed(1)},${H}`
    : ''

  const lastX  = px(values.length - 1)
  const lastY  = py(values[values.length - 1])
  const firstX = px(0)
  const firstY = py(values[0])
  const firstDotColor = isDarkBg ? 'rgba(255,255,255,0.30)' : 'rgba(17,24,39,0.30)'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
      {areaPoints && <polygon points={areaPoints} fill={areaFill} />}
      {values.length >= 2 && (
        <polyline
          points={linePoints} fill="none" stroke={accentHex}
          strokeWidth={strokeWidth} strokeLinejoin="miter" strokeLinecap="butt"
        />
      )}
      <circle cx={firstX.toFixed(1)} cy={firstY.toFixed(1)} r="1.0" fill={firstDotColor} />
      <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r="3.5" fill={latestHex} opacity="0.08" />
      <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r="2.0" fill={latestHex} opacity="0.28" />
      <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r="1.4" fill={latestHex} />
    </svg>
  )
}

/* ── Bar chart SVG for Daily Volume card previews ─────────── */
function VolBarSVG({ bars, accentHex, latestHex }: {
  bars: VolBar[]
  accentHex: string
  latestHex: string
}) {
  if (!bars.length) return null
  const maxVal = Math.max(...bars.map(b => b.value))
  if (maxVal === 0) return null

  const W = 100, H = 100
  const gap = Math.max(0.4, 0.8 - bars.length * 0.005)
  const slotW = W / bars.length
  const barW = Math.max(slotW - gap, 0.5)
  const rad = Math.min(1.5, barW / 3)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
      {bars.map((b, i) => {
        const bh = Math.max((b.value / maxVal) * H * 0.92, 0.6)
        const bx = (i * slotW + (slotW - barW) / 2)
        const by = H - bh
        const isHighlight = b.isLatest || b.isBest
        const fillColor = isHighlight ? latestHex : accentHex
        const opacity = b.isLatest ? 1 : b.isBest ? 0.82 : 0.38
        return (
          <rect key={i}
            x={bx.toFixed(2)} y={by.toFixed(2)}
            width={Math.max(barW, 0.5).toFixed(2)} height={bh.toFixed(2)}
            rx={rad.toFixed(2)} ry={rad.toFixed(2)}
            fill={fillColor} opacity={opacity}
          />
        )
      })}
    </svg>
  )
}

/* ── Main component ──────────────────────────────────────── */
export default function StatsShareView({ data }: { data: StatsData }) {
  const router = useRouter()

  // MAX 1RM export refs
  const fullGraphRef  = useRef<HTMLDivElement>(null)
  const bottomCardRef = useRef<HTMLDivElement>(null)
  const miniCardRef   = useRef<HTMLDivElement>(null)
  const wideCardRef   = useRef<HTMLDivElement>(null)

  // Body Weight export refs
  const fullWeightRef   = useRef<HTMLDivElement>(null)
  const bottomWeightRef = useRef<HTMLDivElement>(null)
  const miniWeightRef   = useRef<HTMLDivElement>(null)
  const wideWeightRef   = useRef<HTMLDivElement>(null)

  // Daily Volume export refs
  const fullVolRef   = useRef<HTMLDivElement>(null)
  const bottomVolRef = useRef<HTMLDivElement>(null)
  const miniVolRef   = useRef<HTMLDivElement>(null)
  const wideVolRef   = useRef<HTMLDivElement>(null)

  const { unit }   = useWeightUnit()
  const unitLabel  = weightUnitLabel(unit)

  const [theme,      setTheme]      = useState<Theme>('dark')
  const [accent,     setAccent]     = useState<Accent>('dark')
  const [chartType,  setChartType]  = useState<ChartType>('bar')
  const [sharing,    setSharing]    = useState(false)
  const [status,     setStatus]     = useState('')
  const [shareCount, setShareCount] = useState(0)

  // Graph layout controls — shared by MAX 1RM, Body Weight, Daily Volume
  const [graphLayout,  setGraphLayout]  = useState<GraphLayout>('full')
  const [graphPreset,  setGraphPreset]  = useState<GraphPreset>('orange')
  const [cardStyle,    setCardStyle]    = useState<CardStyle>('glass')
  const [shadowLevel,  setShadowLevel]  = useState<ShadowLevel>('soft')
  const [volViewType,  setVolViewType]  = useState<VolViewType>('bodypart')
  const [pplGroup,     setPplGroup]     = useState<PPLGroup>('all')

  useEffect(() => { setShareCount(getShareCount()) }, [])

  const isMax1RM = data.type === 'max1rm'
  const isBW     = data.type === 'bodyweight'
  const isVol    = data.type === 'volume'
  const gp       = PRESETS[graphPreset]
  const ac       = AC[accent]
  const acHex    = ac.hex

  // Graph card backgrounds
  const isTransparentCard = cardStyle === 'transparent'
  const isDarkBg  = isTransparentCard || (gp.isDark !== false)
  const gpAccent  = isTransparentCard ? (gp.accentHexTransp ?? gp.accentHex) : gp.accentHex
  const gpLatest  = isTransparentCard ? (gp.latestHexTransp ?? gp.latestHex ?? gpAccent) : (gp.latestHex ?? gp.accentHex)
  const gpRgb     = isDarkBg ? '255,255,255' : '17,24,39'
  const ptxt      = (a: number) => `rgba(${gpRgb},${a})`
  const textPrimary  = isDarkBg ? '#fff' : '#111827'
  const gpBadgeBg    = isTransparentCard ? (gp.badgeBgTransp ?? gp.badgeBg) : gp.badgeBg
  const gpBadgeTxt   = isTransparentCard ? (gp.badgeTextTransp ?? gp.badgeText) : gp.badgeText
  const areaFill     = acRgba(gpAccent, 0.12)
  const fullGlassBg  = gp.bgFull
    ? gp.bgFull
    : `linear-gradient(165deg, ${acRgba(gp.accentHex, 0.09)} 0%, #080808 55%)`
  const fullBg       = isTransparentCard
    ? `linear-gradient(rgba(0,0,0,0.42), rgba(0,0,0,0.48)), ${CHECKER} #1a1a1a`
    : fullGlassBg
  const cardStyleBg  = isTransparentCard
    ? `linear-gradient(rgba(0,0,0,0.42), rgba(0,0,0,0.48)), ${CHECKER} #1a1a1a`
    : gp.bgCombined
  const shadowValue    = SHADOW_MAP[shadowLevel]
  const glassShadow    = `inset 0 1px 0 rgba(255,255,255,0.16)${shadowLevel !== 'none' ? `, ${shadowValue}` : ''}`
  const cardBoxShadow  = isTransparentCard ? shadowValue : glassShadow
  const textShadowVal  = isDarkBg ? SHADOW_MAP[shadowLevel] : 'none'

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

  const rm1SVGData = rm1FullHistory.map(p => ({
    est1rm: Math.round(toDisplayWeight(p.est1rm, unit)),
  }))

  /* ── Body Weight data ────────────────────────────────────── */
  const bwRaw          = isBW ? (data as Extract<StatsData, {type:'bodyweight'}>) : null
  const bwHistory      = bwRaw?.history ?? []
  const bwCurrentDisplay = bwRaw
    ? Math.round(toDisplayWeight(bwRaw.currentWeight, unit) * 10) / 10
    : 0
  const bwStartDisplay = bwHistory.length
    ? Math.round(toDisplayWeight(bwHistory[0].weight, unit) * 10) / 10
    : bwCurrentDisplay
  const bwChangeRaw    = bwRaw ? Math.round(toDisplayWeight(bwRaw.change, unit) * 10) / 10 : 0
  const bwChangeStr    = bwChangeRaw === 0
    ? '±0.0'
    : bwChangeRaw > 0
      ? `+${bwChangeRaw.toFixed(1)}`
      : `${bwChangeRaw.toFixed(1)}`
  const bwValues       = bwHistory.map(d => Math.round(toDisplayWeight(d.weight, unit) * 10) / 10)
  const bwFirstDate    = bwHistory.length ? bwHistory[0].date : ''
  const bwLastDate     = bwHistory.length ? bwHistory[bwHistory.length - 1].date : ''

  /* ── Daily Volume data ───────────────────────────────────── */
  const volRaw      = isVol ? (data as Extract<StatsData, {type:'volume'}>) : null
  const volHistory  = volRaw?.history ?? []
  const volBodyPart = volRaw?.bodyPart ?? 'all'
  const volBodyPartLabel = BODY_PART_DISPLAY[volBodyPart] ?? volBodyPart.toUpperCase()

  // PPL data — all groups fetched server-side, filtered client-side with useMemo
  const pplDataPush  = volRaw?.pplData?.push  ?? []
  const pplDataPull  = volRaw?.pplData?.pull  ?? []
  const pplDataLegs  = volRaw?.pplData?.legs  ?? []
  const pplDataOther = volRaw?.pplData?.other ?? []

  const pplAllHistory = useMemo((): VolPoint[] => {
    const combined = new Map<string, number>()
    ;[pplDataPush, pplDataPull, pplDataLegs, pplDataOther].forEach(group =>
      group.forEach(p => combined.set(p.date, (combined.get(p.date) ?? 0) + p.volume))
    )
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return Array.from(combined.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, volume]) => {
        const d = new Date(date + 'T00:00:00')
        return { date, label: `${M[d.getMonth()]} ${d.getDate()}`, volume: Math.round(volume) }
      })
  }, [pplDataPush, pplDataPull, pplDataLegs, pplDataOther])

  const activePPLHistory: VolPoint[] = useMemo(() => {
    if (pplGroup === 'push') return pplDataPush
    if (pplGroup === 'pull') return pplDataPull
    if (pplGroup === 'legs') return pplDataLegs
    return pplAllHistory
  }, [pplGroup, pplDataPush, pplDataPull, pplDataLegs, pplAllHistory])

  // Active history: body-part mode uses server-fetched history; PPL mode uses client-computed
  const activeVolHistory: VolPoint[] = volViewType === 'ppl' ? activePPLHistory : volHistory

  // Aggregated bars for each layout — derived from whichever history is active
  const volBarsAll = useMemo(() => aggregateVolBars(activeVolHistory, null),  [activeVolHistory])
  const volBars60  = useMemo(() => aggregateVolBars(activeVolHistory, 60),    [activeVolHistory])
  const volBars30  = useMemo(() => aggregateVolBars(activeVolHistory, 30),    [activeVolHistory])
  const volBars14  = useMemo(() => aggregateVolBars(activeVolHistory, 14),    [activeVolHistory])

  const volGranLabel = volBarsAll.granularity === 'daily' ? 'DAILY'
    : volBarsAll.granularity === 'weekly' ? 'WEEKLY' : 'MONTHLY'

  const volBestBar = volBarsAll.bars.find(b => b.isBest)
  const volBestDisplay = volBestBar
    ? Math.round(toDisplayWeight(volBestBar.value, unit))
    : 0
  const volBestStr = volBestDisplay >= 1000
    ? `${(volBestDisplay / 1000).toFixed(1)}t`
    : `${volBestDisplay.toLocaleString()}${unitLabel}`

  // Label shown on cards — changes with viewType and group/filter
  const volDisplayLabel: string = volViewType === 'ppl'
    ? (pplGroup === 'push' ? 'PUSH' : pplGroup === 'pull' ? 'PULL' : pplGroup === 'legs' ? 'LEGS' : 'ALL')
    : volBodyPartLabel

  // Active totals — computed from active history for consistency in PPL mode
  const activeVolTotalRaw     = activeVolHistory.reduce((s, d) => s + d.volume, 0)
  const activeVolTotalDisplay = Math.round(toDisplayWeight(activeVolTotalRaw, unit))
  const activeVolTotalStr     = activeVolTotalDisplay >= 1000
    ? `${(activeVolTotalDisplay / 1000).toFixed(1)}t`
    : `${activeVolTotalDisplay.toLocaleString()}${unitLabel}`
  const activeVolSessionCount = activeVolHistory.length
  const activeVolFirstDate    = activeVolHistory.length ? activeVolHistory[0].date : ''
  const activeVolLastDate     = activeVolHistory.length ? activeVolHistory[activeVolHistory.length - 1].date : ''

  /* ── Share handler ───────────────────────────────────────── */
  const handleShare = async () => {
    setSharing(true)
    setStatus('Creating image...')
    try {
      let blob: Blob
      let filename: string

      if (data.type === 'max1rm') {
        const el: HTMLDivElement | null =
          graphLayout === 'full'   ? fullGraphRef.current  :
          graphLayout === 'bottom' ? bottomCardRef.current :
          graphLayout === 'mini'   ? miniCardRef.current   :
                                     wideCardRef.current

        const w = el?.offsetWidth ?? 0; const h = el?.offsetHeight ?? 0
        const innerText = el?.innerText?.trim() ?? ''; const childCount = el?.children.length ?? 0

        if (!el || w === 0 || h === 0 || innerText === '' || childCount === 0) {
          setStatus('Could not create image. Please try again.')
          setTimeout(() => setStatus(''), 3000); setSharing(false); return
        }

        blob = await captureElement(el, { clearBackground: cardStyle === 'transparent' })
        const today = new Date().toISOString().split('T')[0]
        const nameSlug = (RM_JA_EN[exNameRaw] ?? exNameRaw)
          .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 20) || 'exercise'
        filename = graphLayout === 'full'
          ? `repra-max-1rm-story-${today}-${nameSlug}.png`
          : `repra-max-1rm-card-${today}-${nameSlug}-${graphLayout}.png`

        const r1 = await shareOrDownloadImage({ blob, filename,
          title: graphLayout === 'full' ? 'REPRA Graph Story' : 'REPRA Graph Card' })
        incrementShareCount(); setShareCount(getShareCount())
        if (r1 === 'downloaded') { setStatus('Downloaded!'); setTimeout(() => setStatus(''), 2000) } else { setStatus('') }
        return

      } else if (data.type === 'bodyweight') {
        const el: HTMLDivElement | null =
          graphLayout === 'full'   ? fullWeightRef.current   :
          graphLayout === 'bottom' ? bottomWeightRef.current :
          graphLayout === 'mini'   ? miniWeightRef.current   :
                                     wideWeightRef.current

        const w = el?.offsetWidth ?? 0; const h = el?.offsetHeight ?? 0
        const innerText = el?.innerText?.trim() ?? ''; const childCount = el?.children.length ?? 0

        if (!el || w === 0 || h === 0 || innerText === '' || childCount === 0) {
          setStatus('Could not create image. Please try again.')
          setTimeout(() => setStatus(''), 3000); setSharing(false); return
        }

        blob = await captureElement(el, { clearBackground: cardStyle === 'transparent' })
        const today = new Date().toISOString().split('T')[0]
        filename = graphLayout === 'full'
          ? `repra-bodyweight-story-${today}.png`
          : `repra-bodyweight-card-${today}-${graphLayout}.png`

        const r2 = await shareOrDownloadImage({ blob, filename,
          title: graphLayout === 'full' ? 'REPRA Weight Graph Story' : 'REPRA Weight Graph Card' })
        incrementShareCount(); setShareCount(getShareCount())
        if (r2 === 'downloaded') { setStatus('Downloaded!'); setTimeout(() => setStatus(''), 2000) } else { setStatus('') }
        return

      } else {
        // Daily Volume — DOM capture path
        const el: HTMLDivElement | null =
          graphLayout === 'full'   ? fullVolRef.current   :
          graphLayout === 'bottom' ? bottomVolRef.current :
          graphLayout === 'mini'   ? miniVolRef.current   :
                                     wideVolRef.current

        const w = el?.offsetWidth ?? 0; const h = el?.offsetHeight ?? 0
        const innerText = el?.innerText?.trim() ?? ''; const childCount = el?.children.length ?? 0

        if (!el || w === 0 || h === 0 || innerText === '' || childCount === 0) {
          setStatus('Could not create image. Please try again.')
          setTimeout(() => setStatus(''), 3000); setSharing(false); return
        }

        blob = await captureElement(el, { clearBackground: cardStyle === 'transparent' })
        const today = new Date().toISOString().split('T')[0]
        filename = graphLayout === 'full'
          ? `repra-volume-story-${today}-${volBodyPart}.png`
          : `repra-volume-card-${today}-${volBodyPart}-${graphLayout}.png`

        const r3 = await shareOrDownloadImage({ blob, filename,
          title: graphLayout === 'full' ? 'REPRA Volume Graph Story' : 'REPRA Volume Graph Card' })
        incrementShareCount(); setShareCount(getShareCount())
        if (r3 === 'downloaded') { setStatus('Downloaded!'); setTimeout(() => setStatus(''), 2000) } else { setStatus('') }
        return
      }

    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        setStatus('Could not save image. Please try again.')
        setTimeout(() => setStatus(''), 3000)
      } else {
        setStatus('')
      }
    } finally {
      setSharing(false)
    }
  }

  /* ── Shared UI helpers ───────────────────────────────────── */
  const gpBadge = (
    <span style={{
      fontSize: 8, fontWeight: 900, padding: '2px 7px', borderRadius: 5,
      background: gpBadgeBg, color: gpBadgeTxt, border: '1px solid transparent',
      letterSpacing: '0.16em', display: 'inline-block',
    }}>REPRA</span>
  )

  const sectionLabel = (text: string) => (
    <p style={{ fontSize: 10, fontWeight: 700, color: '#555', letterSpacing: '0.08em', marginBottom: 8 }}>{text}</p>
  )

  // Volume volume format helper
  const fmtVol = (v: number) => {
    const d = Math.round(toDisplayWeight(v, unit))
    return d >= 1000 ? `${(d/1000).toFixed(1)}t` : `${d.toLocaleString()}${unitLabel}`
  }

  // Whether to show bar thumb in layout selector
  const isBarType = isVol

  return (
    <div className="min-h-screen pb-nav flex flex-col" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl" style={{ background: '#1a1a1a' }}>
          <ArrowLeft size={18} style={{ color: '#888' }} />
        </button>
        <h1 className="text-base font-black tracking-widest text-white">Share Story</h1>
      </div>

      {/* ① GRAPH LAYOUT ──────────────────────────────────────── */}
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
                  borderRadius: 14, padding: '10px 12px',
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                  cursor: 'pointer', textAlign: 'left',
                }}>
                <LayoutThumb layoutKey={l.key} accentHex={gp.uiSwatch ?? gp.accentHex} selected={sel} isBar={isBarType} />
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: sel ? (gp.uiSwatch ?? gp.accentHex) : '#fff', margin: 0, lineHeight: 1.2 }}>
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

      {/* ② VIEW TYPE + FILTER (Volume only) ───────────────── */}
      {isVol && (
        <>
          {/* View Type switcher */}
          <div className="px-4 mb-3">
            {sectionLabel('VIEW TYPE')}
            <div className="flex gap-2">
              {(['bodypart', 'ppl'] as VolViewType[]).map(vt => {
                const sel = volViewType === vt
                const uiAc = gp.uiSwatch ?? gp.accentHex
                return (
                  <button key={vt} onClick={() => setVolViewType(vt)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                    style={{
                      background: sel ? acRgba(uiAc, 0.15) : '#1a1a1a',
                      color: sel ? uiAc : '#666',
                      border: `1.5px solid ${sel ? uiAc : '#2a2a2a'}`,
                    }}>
                    {vt === 'bodypart' ? 'Body Part' : 'PPL'}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Body Part filter */}
          {volViewType === 'bodypart' && (
            <div className="px-4 mb-4">
              {sectionLabel('BODY PART')}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {VOL_BODY_PARTS.map(bp => {
                  const sel = volBodyPart === bp.key
                  const uiAc = gp.uiSwatch ?? gp.accentHex
                  return (
                    <button key={bp.key}
                      onClick={() => router.push(`/share?type=stats&metric=volume&bodypart=${bp.key}`)}
                      style={{
                        padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        background: sel ? acRgba(uiAc, 0.15) : 'rgba(255,255,255,0.04)',
                        color: sel ? uiAc : '#666',
                        border: `1.5px solid ${sel ? uiAc : 'rgba(255,255,255,0.08)'}`,
                      }}>
                      {bp.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* PPL filter */}
          {volViewType === 'ppl' && (
            <div className="px-4 mb-4">
              {sectionLabel('PPL')}
              <div style={{ display: 'flex', gap: 6 }}>
                {VOL_PPL_GROUPS.map(pg => {
                  const sel = pplGroup === pg.key
                  const uiAc = gp.uiSwatch ?? gp.accentHex
                  return (
                    <button key={pg.key}
                      onClick={() => setPplGroup(pg.key)}
                      style={{
                        flex: 1, padding: '8px 4px', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        background: sel ? acRgba(uiAc, 0.15) : 'rgba(255,255,255,0.04)',
                        color: sel ? uiAc : '#666',
                        border: `1.5px solid ${sel ? uiAc : 'rgba(255,255,255,0.08)'}`,
                      }}>
                      {pg.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ③ CARD STYLE ───────────────────────────────────────── */}
      <div className="px-4 mb-3">
        {sectionLabel('CARD STYLE')}
        <div className="flex gap-2">
          {(['glass', 'transparent'] as CardStyle[]).map(cs => {
            const sel = cardStyle === cs
            const uiAc = gp.uiSwatch ?? gp.accentHex
            return (
              <button key={cs} onClick={() => setCardStyle(cs)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{
                  background: sel ? acRgba(uiAc, 0.15) : '#1a1a1a',
                  color: sel ? uiAc : '#666',
                  border: `1.5px solid ${sel ? uiAc : '#2a2a2a'}`,
                }}>
                {cs === 'glass' ? 'Glass' : 'Transparent'}
              </button>
            )
          })}
        </div>
      </div>

      {/* ④ DESIGN PRESET ────────────────────────────────────── */}
      <div className="px-4 mb-4">
        {sectionLabel('DESIGN PRESET')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(['orange', 'ice-blue', 'violet', 'mint', 'premium-black', 'pearl-white'] as GraphPreset[]).map(pk => {
            const pd     = PRESETS[pk]
            const swatch = pd.uiSwatch ?? pd.accentHex
            const sel    = graphPreset === pk
            return (
              <button key={pk} onClick={() => setGraphPreset(pk)}
                style={{
                  padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                  background: sel ? acRgba(swatch, 0.15) : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${sel ? swatch : 'rgba(255,255,255,0.08)'}`,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 9, flexShrink: 0,
                  background: swatch,
                  border: pk === 'pearl-white' ? '1px solid rgba(255,255,255,0.25)' : 'none',
                }} />
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.03em', textAlign: 'left',
                  color: sel ? swatch : '#666', lineHeight: 1.3, display: 'block',
                }}>
                  {PRESET_LABELS[pk]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ⑤ SHADOW ───────────────────────────────────────────── */}
      <div className="px-4 mb-4">
        {sectionLabel('SHADOW')}
        <div className="flex gap-2">
          {(['none', 'soft', 'strong', 'extra-strong'] as ShadowLevel[]).map(sl => {
            const sel = shadowLevel === sl
            const uiAc = gp.uiSwatch ?? gp.accentHex
            const label = sl === 'none' ? 'None' : sl === 'soft' ? 'Soft' : sl === 'strong' ? 'Strong' : 'Extra'
            return (
              <button key={sl} onClick={() => setShadowLevel(sl)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{
                  background: sel ? acRgba(uiAc, 0.15) : '#1a1a1a',
                  color: sel ? uiAc : '#666',
                  border: `1.5px solid ${sel ? uiAc : '#2a2a2a'}`,
                }}>
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ⑥ PREVIEW ──────────────────────────────────────────── */}
      <div className="px-4 mb-5">

        {isMax1RM ? (

          /* ── MAX 1RM layouts ─────────────────────────────── */
          <>
            {graphLayout === 'full' && (
              <div ref={fullGraphRef} style={{
                aspectRatio: '9/16', width: '100%', background: fullBg, borderRadius: 24,
                position: 'relative', isolation: 'isolate', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                border: isTransparentCard ? 'none' : `1px solid ${gp.border}`,
                boxShadow: isTransparentCard ? 'none' : glassShadow, textShadow: textShadowVal,
              }}>
                <div style={{ padding: '16px 18px 0', flexShrink: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 8px', borderRadius: 5, background: gpBadgeBg, color: gpBadgeTxt, border: '1px solid transparent', letterSpacing: '0.12em', display: 'inline-block' }}>REPRA</span>
                  <p style={{ fontSize: 8.5, fontWeight: 700, color: ptxt(0.40), letterSpacing: '0.14em', margin: '7px 0 2px' }}>MAX 1RM PROGRESS</p>
                  <p style={{ fontSize: 19, fontWeight: 900, color: textPrimary, lineHeight: 1.1, margin: 0 }}>{exName}</p>
                </div>
                <div style={{ height: 1, background: acRgba(gpAccent, 0.25), margin: '10px 18px' }} />
                <div style={{ padding: '0 18px', flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  {rm1FirstVal !== null && (
                    <>
                      <div>
                        <p style={{ fontSize: 6.5, fontWeight: 700, color: ptxt(0.38), letterSpacing: '0.1em', margin: '0 0 2px' }}>START</p>
                        <p style={{ fontSize: 17, fontWeight: 700, color: ptxt(0.70), margin: 0, lineHeight: 1 }}>{rm1FirstVal}<span style={{ fontSize: 8.5, color: ptxt(0.42), marginLeft: 1 }}>{unitLabel}</span></p>
                      </div>
                      <p style={{ fontSize: 13, color: ptxt(0.22), margin: '7px 0 0' }}>→</p>
                    </>
                  )}
                  <div>
                    <p style={{ fontSize: 6.5, fontWeight: 700, color: gpAccent, letterSpacing: '0.1em', margin: '0 0 2px' }}>BEST</p>
                    <p style={{ fontSize: rm1FirstVal !== null ? 24 : 30, fontWeight: 900, color: gpAccent, margin: 0, lineHeight: 1 }}>
                      {bestRMDisplay}<span style={{ fontSize: 10, color: ptxt(0.50), fontWeight: 400, marginLeft: 2 }}>{unitLabel}</span>
                    </p>
                  </div>
                  {rm1Growth !== null && (
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <p style={{ fontSize: 6.5, fontWeight: 700, color: ptxt(0.38), letterSpacing: '0.1em', margin: '0 0 2px' }}>GAIN</p>
                      <p style={{ fontSize: 17, fontWeight: 800, color: rm1Growth >= 0 ? '#4ade80' : '#f87171', margin: 0, lineHeight: 1 }}>
                        {rm1Growth >= 0 ? '+' : ''}{rm1Growth}<span style={{ fontSize: 8.5, marginLeft: 1 }}>{unitLabel}</span>
                      </p>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minHeight: 0, padding: '12px 14px 0' }}>
                  {rm1SVGData.length >= 2
                    ? <MiniLineSVG data={rm1SVGData} accentHex={gpAccent} latestHex={gpLatest} areaFill={areaFill} strokeWidth={0.8} isDarkBg={isDarkBg} />
                    : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}><p style={{ fontSize: 9, color: ptxt(0.25) }}>No data yet</p></div>}
                </div>
                {rm1FullHistory.length >= 2 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 18px 0', flexShrink: 0 }}>
                    <span style={{ fontSize: 7.5, color: ptxt(0.35) }}>{fmtXLabel(rm1FullHistory[0].date)}</span>
                    <span style={{ fontSize: 7.5, color: gpAccent, fontWeight: 600 }}>{fmtXLabel(rm1FullHistory[rm1FullHistory.length - 1].date)}</span>
                  </div>
                )}
                <p style={{ fontSize: 7.5, color: ptxt(0.28), padding: '7px 18px 14px', margin: 0, flexShrink: 0 }}>
                  Made with <span style={{ color: acRgba(gpAccent, 0.6), fontWeight: 700 }}>REPRA</span>
                </p>
              </div>
            )}

            {graphLayout === 'bottom' && (
              <div ref={bottomCardRef} style={{
                width: '100%', aspectRatio: '4/1', background: cardStyleBg, borderRadius: 18,
                position: 'relative', isolation: 'isolate', overflow: 'hidden', display: 'flex', alignItems: 'center', padding: '0 16px',
                boxShadow: cardBoxShadow, gap: 14,
                border: isTransparentCard ? 'none' : `1px solid ${gp.border}`, textShadow: textShadowVal,
              }}>
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {gpBadge}
                  <p style={{ fontSize: 12, fontWeight: 900, color: textPrimary, margin: '4px 0 1px', lineHeight: 1.1 }}>{exName}</p>
                  <p style={{ fontSize: 7.5, fontWeight: 700, color: gpAccent, letterSpacing: '0.08em', margin: 0 }}>1RM PROGRESS</p>
                </div>
                <div style={{ flex: 1, minWidth: 0, height: '62%' }}>
                  <MiniLineSVG data={rm1SVGData} accentHex={gpAccent} latestHex={gpLatest} areaFill={areaFill} strokeWidth={0.65} isDarkBg={isDarkBg} />
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <p style={{ fontSize: 30, fontWeight: 900, color: gpAccent, margin: 0, lineHeight: 1 }}>{bestRMDisplay}</p>
                  <p style={{ fontSize: 9, color: ptxt(0.50), margin: '2px 0 0', fontWeight: 500 }}>{unitLabel} best</p>
                  {rm1Growth !== null && (
                    <p style={{ fontSize: 10, fontWeight: 700, color: rm1Growth >= 0 ? '#4ade80' : '#f87171', margin: '3px 0 0' }}>
                      {rm1Growth >= 0 ? '+' : ''}{rm1Growth}
                    </p>
                  )}
                </div>
              </div>
            )}

            {graphLayout === 'mini' && (
              <div style={{ width: '72%', margin: '0 auto' }}>
                <div ref={miniCardRef} style={{
                  aspectRatio: '1/1', background: cardStyleBg, borderRadius: 20,
                  position: 'relative', isolation: 'isolate', overflow: 'hidden', padding: 16, display: 'flex', flexDirection: 'column',
                  boxShadow: cardBoxShadow, border: isTransparentCard ? 'none' : `1px solid ${gp.border}`, textShadow: textShadowVal,
                }}>
                  {gpBadge}
                  <p style={{ fontSize: 13, fontWeight: 900, color: textPrimary, margin: '5px 0 1px', lineHeight: 1.1 }}>{exName}</p>
                  <p style={{ fontSize: 7.5, fontWeight: 700, color: gpAccent, letterSpacing: '0.08em', margin: 0 }}>1RM PROGRESS</p>
                  <div style={{ flex: 1, minHeight: 0, margin: '8px 0' }}>
                    <MiniLineSVG data={rm1SVGData} accentHex={gpAccent} latestHex={gpLatest} areaFill={areaFill} strokeWidth={0.6} isDarkBg={isDarkBg} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
                      <span style={{ fontSize: 34, fontWeight: 900, color: gpAccent, lineHeight: 1 }}>{bestRMDisplay}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: ptxt(0.65), paddingBottom: 2 }}>{unitLabel}</span>
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

            {graphLayout === 'wide' && (
              <div ref={wideCardRef} style={{
                width: '100%', aspectRatio: '16/9', background: cardStyleBg, borderRadius: 18,
                position: 'relative', isolation: 'isolate', overflow: 'hidden', display: 'flex', boxShadow: cardBoxShadow,
                border: isTransparentCard ? 'none' : `1px solid ${gp.border}`, textShadow: textShadowVal,
              }}>
                <div style={{ width: '38%', padding: '14px 10px 14px 16px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                  {gpBadge}
                  <p style={{ fontSize: 13, fontWeight: 900, color: textPrimary, margin: '6px 0 1px', lineHeight: 1.1 }}>{exName}</p>
                  <p style={{ fontSize: 7.5, fontWeight: 700, color: gpAccent, letterSpacing: '0.08em', margin: 0 }}>1RM PROGRESS</p>
                  <div style={{ height: 1, background: acRgba(gpAccent, 0.25), margin: '8px 0' }} />
                  {rm1FirstVal !== null && (
                    <p style={{ fontSize: 8.5, color: ptxt(0.45), margin: '0 0 3px' }}>
                      {rm1FirstVal}{unitLabel} → <span style={{ color: gpAccent, fontWeight: 700 }}>{bestRMDisplay}{unitLabel}</span>
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, marginBottom: rm1Growth !== null ? 3 : 0 }}>
                    <span style={{ fontSize: 28, fontWeight: 900, color: gpAccent, lineHeight: 1 }}>{bestRMDisplay}</span>
                    <span style={{ fontSize: 10, fontWeight: 500, color: ptxt(0.60), paddingBottom: 2 }}>{unitLabel}</span>
                  </div>
                  {rm1Growth !== null && (
                    <p style={{ fontSize: 11, fontWeight: 700, color: rm1Growth >= 0 ? '#4ade80' : '#f87171', margin: 0 }}>
                      {rm1Growth >= 0 ? '+' : ''}{rm1Growth}{unitLabel}
                    </p>
                  )}
                  <div style={{ flex: 1 }} />
                  <p style={{ fontSize: 7, color: ptxt(0.30), margin: 0 }}>Made with REPRA</p>
                </div>
                <div style={{ flex: 1, minWidth: 0, padding: '14px 14px 14px 0' }}>
                  <MiniLineSVG data={rm1SVGData} accentHex={gpAccent} latestHex={gpLatest} areaFill={areaFill} strokeWidth={0.7} isDarkBg={isDarkBg} />
                </div>
              </div>
            )}
          </>

        ) : isBW ? (

          /* ── Body Weight layouts ──────────────────────────── */
          <>
            {graphLayout === 'full' && (
              <div ref={fullWeightRef} style={{
                aspectRatio: '9/16', width: '100%', background: fullBg, borderRadius: 24,
                position: 'relative', isolation: 'isolate', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                border: isTransparentCard ? 'none' : `1px solid ${gp.border}`,
                boxShadow: isTransparentCard ? 'none' : glassShadow, textShadow: textShadowVal,
              }}>
                <div style={{ padding: '16px 18px 0', flexShrink: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 8px', borderRadius: 5, background: gpBadgeBg, color: gpBadgeTxt, border: '1px solid transparent', letterSpacing: '0.12em', display: 'inline-block' }}>REPRA</span>
                  <p style={{ fontSize: 8.5, fontWeight: 700, color: ptxt(0.40), letterSpacing: '0.14em', margin: '7px 0 0' }}>BODY WEIGHT PROGRESS</p>
                </div>
                <div style={{ height: 1, background: acRgba(gpAccent, 0.25), margin: '10px 18px' }} />
                <div style={{ padding: '0 18px', flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  {bwHistory.length >= 2 && (
                    <>
                      <div>
                        <p style={{ fontSize: 6.5, fontWeight: 700, color: ptxt(0.38), letterSpacing: '0.1em', margin: '0 0 2px' }}>START</p>
                        <p style={{ fontSize: 17, fontWeight: 700, color: ptxt(0.70), margin: 0, lineHeight: 1 }}>{bwStartDisplay}<span style={{ fontSize: 8.5, color: ptxt(0.42), marginLeft: 1 }}>{unitLabel}</span></p>
                      </div>
                      <p style={{ fontSize: 13, color: ptxt(0.22), margin: '7px 0 0' }}>→</p>
                    </>
                  )}
                  <div>
                    <p style={{ fontSize: 6.5, fontWeight: 700, color: gpAccent, letterSpacing: '0.1em', margin: '0 0 2px' }}>LATEST</p>
                    <p style={{ fontSize: bwHistory.length >= 2 ? 24 : 30, fontWeight: 900, color: gpAccent, margin: 0, lineHeight: 1 }}>
                      {bwCurrentDisplay}<span style={{ fontSize: 10, color: ptxt(0.50), fontWeight: 400, marginLeft: 2 }}>{unitLabel}</span>
                    </p>
                  </div>
                  {bwChangeRaw !== 0 && (
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <p style={{ fontSize: 6.5, fontWeight: 700, color: ptxt(0.38), letterSpacing: '0.1em', margin: '0 0 2px' }}>CHANGE</p>
                      <p style={{ fontSize: 17, fontWeight: 800, color: gpAccent, margin: 0, lineHeight: 1 }}>
                        {bwChangeStr}<span style={{ fontSize: 8.5, marginLeft: 1 }}>{unitLabel}</span>
                      </p>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minHeight: 0, padding: '12px 14px 0' }}>
                  {bwValues.length >= 2
                    ? <BWLineSVG values={bwValues} accentHex={gpAccent} latestHex={gpLatest} areaFill={areaFill} strokeWidth={0.8} isDarkBg={isDarkBg} />
                    : bwValues.length === 1
                      ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                          <p style={{ fontSize: 38, fontWeight: 900, color: gpAccent, margin: 0 }}>{bwCurrentDisplay}<span style={{ fontSize: 14, color: ptxt(0.45), marginLeft: 4 }}>{unitLabel}</span></p>
                        </div>
                      : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}><p style={{ fontSize: 9, color: ptxt(0.25) }}>No data yet</p></div>}
                </div>
                {bwHistory.length >= 2 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 18px 0', flexShrink: 0 }}>
                    <span style={{ fontSize: 7.5, color: ptxt(0.35) }}>{fmtXLabel(bwFirstDate)}</span>
                    <span style={{ fontSize: 7.5, color: gpAccent, fontWeight: 600 }}>{fmtXLabel(bwLastDate)}</span>
                  </div>
                )}
                <p style={{ fontSize: 7.5, color: ptxt(0.28), padding: '7px 18px 14px', margin: 0, flexShrink: 0 }}>
                  Made with <span style={{ color: acRgba(gpAccent, 0.6), fontWeight: 700 }}>REPRA</span>
                </p>
              </div>
            )}

            {graphLayout === 'bottom' && (
              <div ref={bottomWeightRef} style={{
                width: '100%', aspectRatio: '4/1', background: cardStyleBg, borderRadius: 18,
                position: 'relative', isolation: 'isolate', overflow: 'hidden', display: 'flex', alignItems: 'center', padding: '0 16px',
                boxShadow: cardBoxShadow, gap: 14,
                border: isTransparentCard ? 'none' : `1px solid ${gp.border}`, textShadow: textShadowVal,
              }}>
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {gpBadge}
                  <p style={{ fontSize: 8, fontWeight: 700, color: gpAccent, letterSpacing: '0.08em', margin: '4px 0 1px' }}>BODY WEIGHT</p>
                  <p style={{ fontSize: 10, fontWeight: 700, color: textPrimary, margin: 0, lineHeight: 1.2 }}>
                    {bwHistory.length >= 2
                      ? <>{bwStartDisplay}<span style={{ fontSize: 7, color: ptxt(0.46), marginLeft: 1 }}>{unitLabel}</span><span style={{ color: ptxt(0.30), margin: '0 3px' }}>→</span><span style={{ color: gpAccent }}>{bwCurrentDisplay}</span><span style={{ fontSize: 7, color: ptxt(0.46), marginLeft: 1 }}>{unitLabel}</span></>
                      : <><span style={{ color: gpAccent }}>{bwCurrentDisplay}</span><span style={{ fontSize: 7, color: ptxt(0.46), marginLeft: 1 }}>{unitLabel}</span></>
                    }
                  </p>
                </div>
                <div style={{ flex: 1, minWidth: 0, height: '62%' }}>
                  <BWLineSVG values={bwValues} accentHex={gpAccent} latestHex={gpLatest} areaFill={areaFill} strokeWidth={0.65} isDarkBg={isDarkBg} />
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <p style={{ fontSize: 30, fontWeight: 900, color: gpAccent, margin: 0, lineHeight: 1 }}>{bwCurrentDisplay}</p>
                  <p style={{ fontSize: 9, color: ptxt(0.50), margin: '2px 0 0', fontWeight: 500 }}>{unitLabel}</p>
                  <p style={{ fontSize: 10, fontWeight: 700, color: gpAccent, margin: '3px 0 0' }}>{bwChangeStr}{unitLabel}</p>
                </div>
              </div>
            )}

            {graphLayout === 'mini' && (
              <div style={{ width: '72%', margin: '0 auto' }}>
                <div ref={miniWeightRef} style={{
                  aspectRatio: '1/1', background: cardStyleBg, borderRadius: 20,
                  position: 'relative', isolation: 'isolate', overflow: 'hidden', padding: 16, display: 'flex', flexDirection: 'column',
                  boxShadow: cardBoxShadow, border: isTransparentCard ? 'none' : `1px solid ${gp.border}`, textShadow: textShadowVal,
                }}>
                  {gpBadge}
                  <p style={{ fontSize: 8, fontWeight: 700, color: gpAccent, letterSpacing: '0.08em', margin: '5px 0 0' }}>BODY WEIGHT</p>
                  <div style={{ flex: 1, minHeight: 0, margin: '6px 0' }}>
                    <BWLineSVG values={bwValues} accentHex={gpAccent} latestHex={gpLatest} areaFill={areaFill} strokeWidth={0.6} isDarkBg={isDarkBg} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
                      <span style={{ fontSize: 34, fontWeight: 900, color: gpAccent, lineHeight: 1 }}>{bwCurrentDisplay}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: ptxt(0.65), paddingBottom: 2 }}>{unitLabel}</span>
                    </div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: gpAccent, margin: '3px 0 0' }}>{bwChangeStr}{unitLabel}</p>
                  </div>
                </div>
              </div>
            )}

            {graphLayout === 'wide' && (
              <div ref={wideWeightRef} style={{
                width: '100%', aspectRatio: '16/9', background: cardStyleBg, borderRadius: 18,
                position: 'relative', isolation: 'isolate', overflow: 'hidden', display: 'flex', boxShadow: cardBoxShadow,
                border: isTransparentCard ? 'none' : `1px solid ${gp.border}`, textShadow: textShadowVal,
              }}>
                <div style={{ width: '38%', padding: '14px 10px 14px 16px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                  {gpBadge}
                  <p style={{ fontSize: 8, fontWeight: 700, color: gpAccent, letterSpacing: '0.08em', margin: '6px 0 0' }}>BODY WEIGHT</p>
                  <p style={{ fontSize: 7, fontWeight: 500, color: ptxt(0.35), margin: '1px 0 0', letterSpacing: '0.1em' }}>PROGRESS</p>
                  <div style={{ height: 1, background: acRgba(gpAccent, 0.25), margin: '7px 0' }} />
                  {bwHistory.length >= 2 && (
                    <p style={{ fontSize: 8.5, color: ptxt(0.45), margin: '0 0 4px' }}>
                      {bwStartDisplay}{unitLabel} → <span style={{ color: gpAccent, fontWeight: 700 }}>{bwCurrentDisplay}{unitLabel}</span>
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, marginBottom: 3 }}>
                    <span style={{ fontSize: 28, fontWeight: 900, color: gpAccent, lineHeight: 1 }}>{bwCurrentDisplay}</span>
                    <span style={{ fontSize: 10, fontWeight: 500, color: ptxt(0.60), paddingBottom: 2 }}>{unitLabel}</span>
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: gpAccent, margin: 0 }}>{bwChangeStr}{unitLabel}</p>
                  <div style={{ flex: 1 }} />
                  <p style={{ fontSize: 7, color: ptxt(0.30), margin: 0 }}>Made with REPRA</p>
                </div>
                <div style={{ flex: 1, minWidth: 0, padding: '14px 14px 14px 0' }}>
                  <BWLineSVG values={bwValues} accentHex={gpAccent} latestHex={gpLatest} areaFill={areaFill} strokeWidth={0.7} isDarkBg={isDarkBg} />
                </div>
              </div>
            )}
          </>

        ) : (

          /* ── Daily Volume layouts ─────────────────────────── */
          <>
            {graphLayout === 'full' && (
              <div ref={fullVolRef} style={{
                aspectRatio: '9/16', width: '100%', background: fullBg, borderRadius: 24,
                position: 'relative', isolation: 'isolate', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                border: isTransparentCard ? 'none' : `1px solid ${gp.border}`,
                boxShadow: isTransparentCard ? 'none' : glassShadow, textShadow: textShadowVal,
              }}>
                {/* Header */}
                <div style={{ padding: '16px 18px 0', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 8px', borderRadius: 5, background: gpBadgeBg, color: gpBadgeTxt, border: '1px solid transparent', letterSpacing: '0.12em', display: 'inline-block' }}>REPRA</span>
                    <span style={{ fontSize: 7, fontWeight: 700, color: acRgba(gpAccent, 0.6), letterSpacing: '0.12em' }}>{volGranLabel}</span>
                  </div>
                  <p style={{ fontSize: 8.5, fontWeight: 700, color: ptxt(0.40), letterSpacing: '0.14em', margin: '7px 0 2px' }}>DAILY VOLUME</p>
                  <p style={{ fontSize: 19, fontWeight: 900, color: textPrimary, lineHeight: 1.1, margin: 0 }}>{volDisplayLabel}</p>
                </div>

                <div style={{ height: 1, background: acRgba(gpAccent, 0.25), margin: '10px 18px' }} />

                {/* Stats */}
                <div style={{ padding: '0 18px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 2 }}>
                    <span style={{ fontSize: 26, fontWeight: 900, color: gpAccent, lineHeight: 1 }}>{activeVolTotalStr}</span>
                    <span style={{ fontSize: 8, color: ptxt(0.40), paddingBottom: 3, fontWeight: 600 }}>TOTAL</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {volBestStr && <p style={{ fontSize: 8.5, color: ptxt(0.50), margin: 0 }}>Best day: <span style={{ color: gpAccent, fontWeight: 700 }}>{volBestStr}</span></p>}
                    <p style={{ fontSize: 8.5, color: ptxt(0.40), margin: 0 }}>{activeVolSessionCount} sessions</p>
                  </div>
                </div>

                {/* Bar chart */}
                <div style={{ flex: 1, minHeight: 0, padding: '10px 14px 0' }}>
                  {volBarsAll.bars.length > 0
                    ? <VolBarSVG bars={volBarsAll.bars} accentHex={gpAccent} latestHex={gpLatest} />
                    : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}><p style={{ fontSize: 9, color: ptxt(0.25) }}>No data yet</p></div>}
                </div>

                {/* Date range */}
                {activeVolHistory.length >= 2 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 18px 0', flexShrink: 0 }}>
                    <span style={{ fontSize: 7.5, color: ptxt(0.35) }}>
                      {volBarsAll.granularity === 'monthly' ? fmtMonthLabel(volBarsAll.bars[0]?.label ?? '') : fmtXLabel(activeVolFirstDate)}
                    </span>
                    <span style={{ fontSize: 7.5, color: gpAccent, fontWeight: 600 }}>
                      {volBarsAll.granularity === 'monthly' ? fmtMonthLabel(volBarsAll.bars[volBarsAll.bars.length - 1]?.label ?? '') : fmtXLabel(activeVolLastDate)}
                    </span>
                  </div>
                )}

                <p style={{ fontSize: 7.5, color: ptxt(0.28), padding: '7px 18px 14px', margin: 0, flexShrink: 0 }}>
                  Made with <span style={{ color: acRgba(gpAccent, 0.6), fontWeight: 700 }}>REPRA</span>
                </p>
              </div>
            )}

            {graphLayout === 'bottom' && (
              <div ref={bottomVolRef} style={{
                width: '100%', aspectRatio: '4/1', background: cardStyleBg, borderRadius: 18,
                position: 'relative', isolation: 'isolate', overflow: 'hidden', display: 'flex', alignItems: 'center', padding: '0 16px',
                boxShadow: cardBoxShadow, gap: 14,
                border: isTransparentCard ? 'none' : `1px solid ${gp.border}`, textShadow: textShadowVal,
              }}>
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {gpBadge}
                  <p style={{ fontSize: 8, fontWeight: 700, color: gpAccent, letterSpacing: '0.08em', margin: '4px 0 1px' }}>DAILY VOLUME</p>
                  <p style={{ fontSize: 12, fontWeight: 900, color: textPrimary, margin: 0, lineHeight: 1.1 }}>{volDisplayLabel}</p>
                </div>
                <div style={{ flex: 1, minWidth: 0, height: '65%' }}>
                  <VolBarSVG bars={volBars30.bars} accentHex={gpAccent} latestHex={gpLatest} />
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <p style={{ fontSize: 22, fontWeight: 900, color: gpAccent, margin: 0, lineHeight: 1 }}>{activeVolTotalStr}</p>
                  <p style={{ fontSize: 8, color: ptxt(0.45), margin: '2px 0 0', fontWeight: 500 }}>total</p>
                  <p style={{ fontSize: 8.5, color: ptxt(0.35), margin: '3px 0 0' }}>{activeVolSessionCount} sessions</p>
                </div>
              </div>
            )}

            {graphLayout === 'mini' && (
              <div style={{ width: '72%', margin: '0 auto' }}>
                <div ref={miniVolRef} style={{
                  aspectRatio: '1/1', background: cardStyleBg, borderRadius: 20,
                  position: 'relative', isolation: 'isolate', overflow: 'hidden', padding: 16, display: 'flex', flexDirection: 'column',
                  boxShadow: cardBoxShadow, border: isTransparentCard ? 'none' : `1px solid ${gp.border}`, textShadow: textShadowVal,
                }}>
                  {gpBadge}
                  <p style={{ fontSize: 7.5, fontWeight: 700, color: gpAccent, letterSpacing: '0.08em', margin: '5px 0 0' }}>DAILY VOLUME</p>
                  <p style={{ fontSize: 11, fontWeight: 900, color: textPrimary, margin: '2px 0 0', lineHeight: 1.1 }}>{volDisplayLabel}</p>
                  <div style={{ flex: 1, minHeight: 0, margin: '6px 0' }}>
                    <VolBarSVG bars={volBars14.bars} accentHex={gpAccent} latestHex={gpLatest} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
                      <span style={{ fontSize: 28, fontWeight: 900, color: gpAccent, lineHeight: 1 }}>{activeVolTotalStr}</span>
                    </div>
                    <p style={{ fontSize: 9, color: ptxt(0.45), margin: '2px 0 0' }}>{activeVolSessionCount} sessions</p>
                  </div>
                </div>
              </div>
            )}

            {graphLayout === 'wide' && (
              <div ref={wideVolRef} style={{
                width: '100%', aspectRatio: '16/9', background: cardStyleBg, borderRadius: 18,
                position: 'relative', isolation: 'isolate', overflow: 'hidden', display: 'flex', boxShadow: cardBoxShadow,
                border: isTransparentCard ? 'none' : `1px solid ${gp.border}`, textShadow: textShadowVal,
              }}>
                {/* Left info */}
                <div style={{ width: '34%', padding: '14px 10px 14px 16px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                  {gpBadge}
                  <p style={{ fontSize: 8, fontWeight: 700, color: gpAccent, letterSpacing: '0.08em', margin: '6px 0 0' }}>DAILY VOLUME</p>
                  <p style={{ fontSize: 12, fontWeight: 900, color: textPrimary, margin: '2px 0 0', lineHeight: 1.1 }}>{volDisplayLabel}</p>
                  <div style={{ height: 1, background: acRgba(gpAccent, 0.25), margin: '7px 0' }} />
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, marginBottom: 3 }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: gpAccent, lineHeight: 1 }}>{activeVolTotalStr}</span>
                  </div>
                  <p style={{ fontSize: 8, color: ptxt(0.45), margin: '0 0 2px' }}>total</p>
                  {volBestStr && <p style={{ fontSize: 8.5, color: ptxt(0.50), margin: 0 }}>Best: <span style={{ color: gpAccent, fontWeight: 700 }}>{volBestStr}</span></p>}
                  <p style={{ fontSize: 8, color: ptxt(0.35), margin: '3px 0 0' }}>{activeVolSessionCount} sessions</p>
                  <div style={{ flex: 1 }} />
                  <p style={{ fontSize: 7, color: ptxt(0.30), margin: 0 }}>Made with REPRA</p>
                </div>
                {/* Right chart */}
                <div style={{ flex: 1, minWidth: 0, padding: '14px 14px 14px 0' }}>
                  <VolBarSVG bars={volBars60.bars} accentHex={gpAccent} latestHex={gpLatest} />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mb-3" />

      {/* ⑦ SAVE BUTTON ──────────────────────────────────────── */}
      <div className="px-4 space-y-2 mb-6">
        {status && <p className="text-center text-sm" style={{ color: '#888' }}>{status}</p>}
        <button
          className="w-full py-4 rounded-2xl text-base font-black text-white flex items-center justify-center gap-2"
          style={{ background: '#ED742F', boxShadow: '0 4px 20px rgba(237, 116, 47,0.3)' }}
          disabled={sharing} onClick={handleShare}>
          <Share2 size={20} />
          {sharing ? 'Creating image...' : isMax1RM
            ? (graphLayout === 'full' ? 'Save Graph Story' : 'Save Graph Card')
            : isBW
              ? (graphLayout === 'full' ? 'Save Weight Graph Story' : 'Save Weight Graph Card')
              : (graphLayout === 'full' ? 'Save Volume Graph Story' : 'Save Volume Graph Card')
          }
        </button>
        <p className="text-center text-xs" style={{ color: '#444' }}>
          Mobile only · Desktop downloads as PNG
        </p>
      </div>
    </div>
  )
}
