'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Share2, ArrowLeft } from 'lucide-react'
import { getShareCount, incrementShareCount, getShareThemeUnlocks, BW_CHART_REQUIRED } from '@/lib/unlocks'
import { useWeightUnit } from '@/lib/useWeightUnit'
import { useLocale } from '@/lib/useLocale'
import { toDisplayWeight, weightUnitLabel, formatVolumeWithUnit, type WeightUnit } from '@/lib/units'
import { PRESETS, glassCardStyle } from '@/components/share/WorkoutStoryCardContent'
import { captureElement, shareOrDownloadImage } from '@/lib/shareImage'
import { useExerciseNameLang } from '@/lib/useExerciseNameLang'
import { useCardLang } from '@/lib/useCardLang'
import { useTheme } from '@/lib/useTheme'

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
type GraphLayout  = 'full' | 'side' | 'mini' | 'wide'
const GRAPH_STORY_LIMITS: Record<GraphLayout, number> = { full: 60, side: 60, mini: 14, wide: 40 }
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

const CHECKER = `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M0 0h10v10H0V0zm10 10h10v10H10V10z'/%3E%3C/g%3E%3C/svg%3E")`
// Light checker — dark squares at low opacity, used as preview backing for dark-text transparent cards
const LIGHT_CHECKER = `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.04'%3E%3Cpath d='M0 0h10v10H0V0zm10 10h10v10H10V10z'/%3E%3C/g%3E%3C/svg%3E")`

const BODY_PART_DISPLAY: Record<string, string> = {
  all: 'ALL', chest: 'CHEST', back: 'BACK', legs: 'LEGS',
  shoulders: 'SHOULDERS', arms: 'ARMS', abs: 'ABS', other: 'OTHER',
}

const BODY_PART_DISPLAY_JA: Record<string, string> = {
  all: 'すべて', chest: '胸', back: '背中', legs: '脚',
  shoulders: '肩', arms: '腕', abs: '腹筋', other: 'その他',
}

const VOL_BODY_PARTS = [
  { key: 'all',       label: 'All',      labelJa: 'すべて' },
  { key: 'chest',     label: 'Chest',    labelJa: '胸' },
  { key: 'back',      label: 'Back',     labelJa: '背中' },
  { key: 'legs',      label: 'Legs',     labelJa: '脚' },
  { key: 'shoulders', label: 'Shoulder', labelJa: '肩' },
  { key: 'arms',      label: 'Arms',     labelJa: '腕' },
  { key: 'abs',       label: 'Abs',      labelJa: '腹筋' },
  { key: 'other',     label: 'Other',    labelJa: 'その他' },
]

const VOL_PPL_GROUPS = [
  { key: 'all',  label: 'All',  labelJa: 'すべて' },
  { key: 'push', label: 'Push', labelJa: 'Push' },
  { key: 'pull', label: 'Pull', labelJa: 'Pull' },
  { key: 'legs', label: 'Legs', labelJa: 'Legs' },
] as const

const GRAPH_LAYOUTS = [
  { key: 'full',   labelEn: 'Full',        labelJa: '全画面',        ratio: '9:16' },
  { key: 'side',   labelEn: 'Side Graph',  labelJa: '左サイドグラフ', ratio: ''     },
  { key: 'mini',   labelEn: 'Mini',        labelJa: 'ミニカード',     ratio: '1:1'  },
  { key: 'wide',   labelEn: 'Wide',        labelJa: 'ワイド',         ratio: '16:9' },
] as const

const PRESET_LABELS: Record<GraphPreset, string> = {
  'orange':        'REPRA Orange',
  'ice-blue':      'Ice Blue',
  'violet':        'Violet Pump',
  'mint':          'Mint Proof',
  'premium-black': 'Premium Black',
  'pearl-white':   'Pearl White',
}

const PRESET_LABELS_JA: Record<GraphPreset, string> = {
  'orange':        'REPRA オレンジ',
  'ice-blue':      'アイスブルー',
  'violet':        'バイオレットパンプ',
  'mint':          'ミントプルーフ',
  'premium-black': 'プレミアムブラック',
  'pearl-white':   'パールホワイト',
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

/* ── Even-sampling utility ───────────────────────────────── */
// Picks up to maxCount items from the full array, always including the first
// and last, with the rest selected at equal intervals. Deterministic.
function sampleEvenly<T>(items: T[], maxCount: number): T[] {
  if (maxCount <= 0) return []
  if (items.length <= maxCount) return items
  if (maxCount === 1) return [items[items.length - 1]!]
  const last = items.length - 1
  const seen = new Set<number>()
  const result: T[] = []
  for (let i = 0; i < maxCount; i++) {
    const idx = Math.round((i * last) / (maxCount - 1))
    if (!seen.has(idx)) { seen.add(idx); result.push(items[idx]!) }
  }
  return result
}

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

  const limited = limit !== null ? sampleEvenly(raw, limit) : raw
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

  rr(ctx, 80, 100, 268, 68, 14)
  ctx.fillStyle = 'rgba(12,10,8,0.75)'; ctx.fill()
  ctx.strokeStyle = ac.hex; ctx.lineWidth = 3; ctx.stroke()
  ctx.fillStyle = ac.hex; ctx.font = f(28, 700); ctx.fillText('REPRA', 112, 147)

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
    heroStr = formatVolumeWithUnit(maxVol, unit)
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
        strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"
        vectorEffect="non-scaling-stroke" />
      {sub.map((d, i) => (
        <circle key={i} cx={px(i)} cy={py(d.value)}
          r={i === sub.length - 1 ? 2.8 : 1.6}
          fill={i === sub.length - 1 ? ac.barActive : 'rgba(255,255,255,0.35)'} />
      ))}
    </svg>
  )
}

/* ── Layout thumbnail (pure SVG) ─────────────────────────── */
function LayoutThumb({ layoutKey, accentHex, selected, isBar = false, isDark = true }: {
  layoutKey: string
  accentHex: string
  selected: boolean
  isBar?: boolean
  isDark?: boolean
}) {
  const rects: Record<string, { x: number; y: number; w: number; h: number }> = {
    full:   { x: 14, y: 4,  w: 12, h: 32 },
    side:   { x: 5,  y: 4,  w: 12, h: 32 },
    mini:   { x: 8,  y: 8,  w: 24, h: 24 },
    wide:   { x: 3,  y: 10, w: 34, h: 20 },
  }
  const r = rects[layoutKey] ?? rects.full
  const stroke       = selected ? accentHex : isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.28)'
  const rectFill     = selected ? `${accentHex}18` : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
  const rectStroke   = selected ? accentHex : isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)'

  // Side Graph: distinct icon — narrow card on the left half with horizontal bars inside.
  // Right half is empty to convey "left-side only" layout.
  if (layoutKey === 'side') {
    const cx = 3, cy = 4, cw = 17, ch = 32
    const barRatios = [0.60, 0.40, 0.82, 0.52, 1.0]
    const n        = barRatios.length
    const barH     = 2.8
    const padX     = 2.5
    const maxBW    = cw - padX * 2
    const slotH    = (ch - 4) / n
    return (
      <svg viewBox="0 0 40 40" width={40} height={40} style={{ display: 'block' }}>
        <rect x={cx} y={cy} width={cw} height={ch} rx={2}
          fill={rectFill} stroke={rectStroke} strokeWidth={1.4} />
        {barRatios.map((ratio, i) => {
          const bw = maxBW * ratio
          const by = cy + 2 + i * slotH + (slotH - barH) / 2
          return (
            <rect key={i}
              x={(cx + padX).toFixed(1)} y={by.toFixed(1)}
              width={bw.toFixed(1)} height={barH.toFixed(1)}
              rx="0"
              fill={i === n - 1 ? stroke : `${stroke}70`} />
          )
        })}
      </svg>
    )
  }

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
          fill={rectFill}
          stroke={rectStroke}
          strokeWidth={1.2}
        />
        {heights.map((h, i) => {
          const bH = r.h * 0.85 * h
          const bx = r.x + 2 + i * slotW + (slotW - barW) / 2
          const by = r.y + r.h - bH - 1
          return <rect key={i} x={bx.toFixed(1)} y={by.toFixed(1)} width={barW.toFixed(1)} height={bH.toFixed(1)} rx="0" fill={i === heights.length - 1 ? stroke : stroke + '60'} />
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
        fill={rectFill}
        stroke={rectStroke}
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
function MiniLineSVG({ data, accentHex, latestHex, areaFill, isDarkBg = true }: {
  data: { est1rm: number }[]
  accentHex: string
  latestHex: string
  areaFill: string
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

  // lxPct / lyPct: position of the last point as % of the container,
  // derived from the same px/py functions used for the polyline.
  // W=H=100 so the viewBox percentage equals the value directly.
  const lxPct = lastX
  const lyPct = lastY

  return (
    // position:absolute fills the ChartWithYAxis inner div (which is position:relative).
    // Using absolute rather than relative+100% avoids ambiguous percentage-height
    // resolution inside a flex item.
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* Line/area SVG — vectorEffect="non-scaling-stroke" keeps stroke width uniform
          regardless of container aspect ratio (fixes thick/thin lines with preserveAspectRatio:none) */}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
           style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <polygon points={areaPoints} fill={areaFill} />
        <polyline
          points={linePoints} fill="none" stroke={accentHex}
          strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {/* First dot — CSS div stays a perfect circle regardless of container aspect ratio */}
      <div style={{ position: 'absolute', left: `${firstX}%`, top: `${firstY}%`,
                    transform: 'translate(-50%,-50%)', width: 5, height: 5,
                    borderRadius: '50%', background: firstDotColor, pointerEvents: 'none' }} />
      {/* Last-point glow rings — CSS border-radius:50% is always a perfect circle
          regardless of the container's aspect ratio */}
      <div style={{ position: 'absolute', left: `${lxPct}%`, top: `${lyPct}%`,
                    transform: 'translate(-50%,-50%)', width: 18, height: 18,
                    borderRadius: '50%', background: latestHex, opacity: 0.08,
                    pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: `${lxPct}%`, top: `${lyPct}%`,
                    transform: 'translate(-50%,-50%)', width: 10, height: 10,
                    borderRadius: '50%', background: latestHex, opacity: 0.28,
                    pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: `${lxPct}%`, top: `${lyPct}%`,
                    transform: 'translate(-50%,-50%)', width: 7, height: 7,
                    borderRadius: '50%', background: latestHex,
                    pointerEvents: 'none' }} />
    </div>
  )
}

/* ── Sharp polyline SVG for Body Weight card previews ─────── */
function BWLineSVG({ values, accentHex, latestHex, areaFill, isDarkBg = true }: {
  values: number[]
  accentHex: string
  latestHex: string
  areaFill: string
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

  const lxPct = lastX
  const lyPct = lastY

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
           style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {areaPoints && <polygon points={areaPoints} fill={areaFill} />}
        {values.length >= 2 && (
          <polyline
            points={linePoints} fill="none" stroke={accentHex}
            strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <div style={{ position: 'absolute', left: `${firstX}%`, top: `${firstY}%`,
                    transform: 'translate(-50%,-50%)', width: 5, height: 5,
                    borderRadius: '50%', background: firstDotColor, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: `${lxPct}%`, top: `${lyPct}%`,
                    transform: 'translate(-50%,-50%)', width: 18, height: 18,
                    borderRadius: '50%', background: latestHex, opacity: 0.08,
                    pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: `${lxPct}%`, top: `${lyPct}%`,
                    transform: 'translate(-50%,-50%)', width: 10, height: 10,
                    borderRadius: '50%', background: latestHex, opacity: 0.28,
                    pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: `${lxPct}%`, top: `${lyPct}%`,
                    transform: 'translate(-50%,-50%)', width: 7, height: 7,
                    borderRadius: '50%', background: latestHex,
                    pointerEvents: 'none' }} />
    </div>
  )
}

/* ── Bar chart SVG for Daily Volume card previews ─────────── */
function VolBarSVG({ bars, accentHex, latestHex, isTransparent = false }: {
  bars: VolBar[]
  accentHex: string
  latestHex: string
  isTransparent?: boolean
}) {
  if (!bars.length) return null
  const maxVal = Math.max(...bars.map(b => b.value))
  if (maxVal === 0) return null

  const W = 100, H = 100
  const gap = Math.max(0.4, 0.8 - bars.length * 0.005)
  const slotW = W / bars.length
  const barW = Math.max(slotW - gap, 0.5)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
      {bars.map((b, i) => {
        const bh = Math.max((b.value / maxVal) * H * 0.92, 0.6)
        const bx = (i * slotW + (slotW - barW) / 2)
        const by = H - bh
        const isHighlight = b.isLatest || b.isBest
        const fillColor = isHighlight ? latestHex : accentHex
        // Boost opacity in transparent mode so bars are visible on any background
        const opacity = b.isLatest ? 1 : b.isBest ? (isTransparent ? 0.90 : 0.82) : (isTransparent ? 0.72 : 0.38)
        return (
          <rect key={i}
            x={bx.toFixed(2)} y={by.toFixed(2)}
            width={Math.max(barW, 0.5).toFixed(2)} height={bh.toFixed(2)}
            rx="0"
            fill={fillColor} opacity={opacity}
          />
        )
      })}
    </svg>
  )
}

/* ── Side Graph SVG components (x=value, y=date, used in 'side' layout preview) ── */
/* Layout: LP=18% left for date labels, BP=12% bottom for value labels           */

function SideLineSVG({ data, accentHex, latestHex, areaFill, isDarkBg = true, dates = [] }: {
  data: { est1rm: number }[]
  accentHex: string
  latestHex: string
  areaFill: string
  isDarkBg?: boolean
  dates?: string[]
}) {
  if (data.length < 2) return null
  const LP = 16, RP = 3, TP = 1, BP = 3
  const values = data.map(d => d.est1rm)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const rng = max - min || max * 0.1 || 1

  const px = (v: number) => LP + ((v - min) / rng) * (100 - LP - RP)
  // i=0 (oldest) at bottom, i=n-1 (newest) at top
  const py = (i: number) => (100 - BP) - (i / (data.length - 1)) * (100 - TP - BP)

  const linePoints = data.map((d, i) => `${px(d.est1rm).toFixed(1)},${py(i).toFixed(1)}`).join(' ')
  const areaPoints = `${LP},${py(0).toFixed(1)} ${linePoints} ${LP},${py(data.length - 1).toFixed(1)}`

  const lastX = px(values[values.length - 1]!)
  const lastY = py(data.length - 1)   // newest → top (small y)
  const firstX = px(values[0]!)
  const firstY = py(0)                // oldest → bottom (large y)
  const firstDotColor = isDarkBg ? 'rgba(255,255,255,0.30)' : 'rgba(17,24,39,0.30)'
  const gridColor = isDarkBg ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.11)'
  const lblColor  = isDarkBg ? 'rgba(255,255,255,0.48)' : 'rgba(15,23,42,0.40)'
  const datColor  = isDarkBg ? 'rgba(255,255,255,0.40)' : 'rgba(15,23,42,0.35)'

  const raw = rng / 2
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 0.01))))
  const step = [1,2,2.5,5,10].map(m => m*mag).find(s => s >= raw) ?? mag*10
  const xTicks: number[] = []
  for (let t = Math.ceil(min/step)*step; t <= max*1.001; t = Math.round((t+step)*1e9)/1e9) {
    xTicks.push(t); if (xTicks.length >= 4) break
  }
  const filteredTicks = xTicks.filter(t => t >= min*0.999 && t <= max*1.001)

  const n = data.length
  const hasDates = dates.length >= n
  const dateIdxs = n <= 2 ? [0, n-1] : [0, Math.round(n/3), Math.round(2*n/3), n-1]

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none"
           style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {filteredTicks.map((tick, i) => (
          <line key={i} x1={px(tick).toFixed(1)} y1={TP} x2={px(tick).toFixed(1)} y2={100 - BP}
            stroke={gridColor} strokeWidth="0.7" strokeDasharray="2 3" />
        ))}
        <polygon points={areaPoints} fill={areaFill} />
        <polyline points={linePoints} fill="none" stroke={accentHex}
          strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"
          vectorEffect="non-scaling-stroke" />
      </svg>
      <div style={{ position: 'absolute', left: `${firstX}%`, top: `${firstY}%`,
                    transform: 'translate(-50%,-50%)', width: 5, height: 5,
                    borderRadius: '50%', background: firstDotColor, pointerEvents: 'none' }} />
      {hasDates && dateIdxs.map((idx, i) => {
        if (idx >= n || !dates[idx]) return null
        const d = new Date(dates[idx]! + 'T00:00:00')
        return (
          <div key={i} style={{ position: 'absolute', left: 0, top: `${py(idx)}%`,
            width: `${LP - 1}%`, transform: 'translateY(-50%)', textAlign: 'right',
            fontSize: 4.5, color: datColor, lineHeight: 1, pointerEvents: 'none',
            overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {`${d.getMonth()+1}/${d.getDate()}`}
          </div>
        )
      })}
      {filteredTicks.map((tick, i) => (
        <div key={i} style={{ position: 'absolute', left: `${px(tick)}%`, top: '97.74%',
          transform: 'translateX(-50%)', fontSize: 4, color: lblColor, lineHeight: 1,
          pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          {Math.round(tick)}
        </div>
      ))}
      <div style={{ position: 'absolute', left: `${lastX}%`, top: `${lastY}%`,
                    transform: 'translate(-50%,-50%)', width: 14, height: 14,
                    borderRadius: '50%', background: latestHex, opacity: 0.08, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: `${lastX}%`, top: `${lastY}%`,
                    transform: 'translate(-50%,-50%)', width: 8, height: 8,
                    borderRadius: '50%', background: latestHex, opacity: 0.28, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: `${lastX}%`, top: `${lastY}%`,
                    transform: 'translate(-50%,-50%)', width: 5, height: 5,
                    borderRadius: '50%', background: latestHex, pointerEvents: 'none' }} />
    </div>
  )
}

function SideBWLineSVG({ values, accentHex, latestHex, areaFill, isDarkBg = true, dates = [] }: {
  values: number[]
  accentHex: string
  latestHex: string
  areaFill: string
  isDarkBg?: boolean
  dates?: string[]
}) {
  if (values.length < 2) return null
  const LP = 16, RP = 3, TP = 1, BP = 3
  const max = Math.max(...values)
  const min = Math.min(...values)
  const rng = max - min || max * 0.1 || 1

  const px = (v: number) => LP + ((v - min) / rng) * (100 - LP - RP)
  // i=0 (oldest) at bottom, i=n-1 (newest) at top
  const py = (i: number) => (100 - BP) - (i / Math.max(values.length - 1, 1)) * (100 - TP - BP)

  const linePoints = values.map((v, i) => `${px(v).toFixed(1)},${py(i).toFixed(1)}`).join(' ')
  const areaPoints = `${LP},${py(0).toFixed(1)} ${linePoints} ${LP},${py(values.length - 1).toFixed(1)}`

  const lastX = px(values[values.length - 1]!)
  const lastY = py(values.length - 1)   // newest → top (small y)
  const firstX = px(values[0]!)
  const firstY = py(0)                  // oldest → bottom (large y)
  const firstDotColor = isDarkBg ? 'rgba(255,255,255,0.30)' : 'rgba(17,24,39,0.30)'
  const gridColor = isDarkBg ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.11)'
  const lblColor  = isDarkBg ? 'rgba(255,255,255,0.48)' : 'rgba(15,23,42,0.40)'
  const datColor  = isDarkBg ? 'rgba(255,255,255,0.40)' : 'rgba(15,23,42,0.35)'

  const raw = rng / 2
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 0.01))))
  const step = [1,2,2.5,5,10].map(m => m*mag).find(s => s >= raw) ?? mag*10
  const xTicks: number[] = []
  for (let t = Math.ceil(min/step)*step; t <= max*1.001; t = Math.round((t+step)*1e9)/1e9) {
    xTicks.push(t); if (xTicks.length >= 4) break
  }
  const filteredTicks = xTicks.filter(t => t >= min*0.999 && t <= max*1.001)

  const n = values.length
  const hasDates = dates.length >= n
  const dateIdxs = n <= 2 ? [0, n-1] : [0, Math.round(n/3), Math.round(2*n/3), n-1]

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none"
           style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {filteredTicks.map((tick, i) => (
          <line key={i} x1={px(tick).toFixed(1)} y1={TP} x2={px(tick).toFixed(1)} y2={100 - BP}
            stroke={gridColor} strokeWidth="0.7" strokeDasharray="2 3" />
        ))}
        <polygon points={areaPoints} fill={areaFill} />
        <polyline points={linePoints} fill="none" stroke={accentHex}
          strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"
          vectorEffect="non-scaling-stroke" />
      </svg>
      <div style={{ position: 'absolute', left: `${firstX}%`, top: `${firstY}%`,
                    transform: 'translate(-50%,-50%)', width: 5, height: 5,
                    borderRadius: '50%', background: firstDotColor, pointerEvents: 'none' }} />
      {hasDates && dateIdxs.map((idx, i) => {
        if (idx >= n || !dates[idx]) return null
        const d = new Date(dates[idx]! + 'T00:00:00')
        return (
          <div key={i} style={{ position: 'absolute', left: 0, top: `${py(idx)}%`,
            width: `${LP - 1}%`, transform: 'translateY(-50%)', textAlign: 'right',
            fontSize: 4.5, color: datColor, lineHeight: 1, pointerEvents: 'none',
            overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {`${d.getMonth()+1}/${d.getDate()}`}
          </div>
        )
      })}
      {filteredTicks.map((tick, i) => (
        <div key={i} style={{ position: 'absolute', left: `${px(tick)}%`, top: '97.74%',
          transform: 'translateX(-50%)', fontSize: 4, color: lblColor, lineHeight: 1,
          pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          {Math.round(tick * 10) / 10}
        </div>
      ))}
      <div style={{ position: 'absolute', left: `${lastX}%`, top: `${lastY}%`,
                    transform: 'translate(-50%,-50%)', width: 14, height: 14,
                    borderRadius: '50%', background: latestHex, opacity: 0.08, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: `${lastX}%`, top: `${lastY}%`,
                    transform: 'translate(-50%,-50%)', width: 8, height: 8,
                    borderRadius: '50%', background: latestHex, opacity: 0.28, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: `${lastX}%`, top: `${lastY}%`,
                    transform: 'translate(-50%,-50%)', width: 5, height: 5,
                    borderRadius: '50%', background: latestHex, pointerEvents: 'none' }} />
    </div>
  )
}

function SideVolBarSVG({ bars, accentHex, latestHex, isDarkBg = true }: {
  bars: VolBar[]
  accentHex: string
  latestHex: string
  isDarkBg?: boolean
}) {
  if (!bars.length) return null
  const maxVal = Math.max(...bars.map(b => b.value))
  if (maxVal === 0) return null
  const LP = 16, RP = 3, TP = 1, BP = 3
  const n = bars.length
  const slotH = (100 - TP - BP) / n
  const barH  = slotH * 0.55

  const bxOf = (v: number) => LP + (v / maxVal) * (100 - LP - RP) * 0.95
  // i=0 (oldest) at bottom, i=n-1 (newest) at top
  const byOf = (i: number) => TP + (n - 1 - i) * slotH + (slotH - barH) / 2

  const raw = maxVal / 3
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 0.01))))
  const step = [1,2,2.5,5,10].map(m => m*mag).find(s => s >= raw) ?? mag*10
  const xTicks: number[] = []
  for (let t = step; t <= maxVal*1.001; t = Math.round((t+step)*1e9)/1e9) {
    xTicks.push(t); if (xTicks.length >= 3) break
  }

  const gridColor = isDarkBg ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.11)'
  const lblColor  = isDarkBg ? 'rgba(255,255,255,0.48)' : 'rgba(15,23,42,0.40)'
  const datColor  = isDarkBg ? 'rgba(255,255,255,0.40)' : 'rgba(15,23,42,0.35)'

  const dateIdxs = n <= 2 ? [0, n-1] : [0, Math.round(n/3), Math.round(2*n/3), n-1]

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none"
           style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {xTicks.map((tick, i) => (
          <line key={i} x1={bxOf(tick).toFixed(1)} y1={TP} x2={bxOf(tick).toFixed(1)} y2={100 - BP}
            stroke={gridColor} strokeWidth="0.7" strokeDasharray="2 3" />
        ))}
        {bars.map((b, i) => {
          const bw      = Math.max(bxOf(b.value) - LP, 0.5)
          const by      = byOf(i)
          const fill    = (b.isLatest || b.isBest) ? latestHex : accentHex
          const opacity = b.isLatest ? 1 : b.isBest ? 0.82 : 0.38
          return (
            <rect key={i} x={LP} y={by.toFixed(2)} width={bw.toFixed(2)} height={barH.toFixed(2)}
              rx="0" fill={fill} opacity={opacity} />
          )
        })}
      </svg>
      {dateIdxs.map((idx, i) => {
        if (idx >= n || !bars[idx]) return null
        const s = bars[idx]!.label ?? ''
        const label = s.length === 7
          ? `${parseInt(s.slice(5,7),10)}月`
          : (() => { const d = new Date(s + 'T00:00:00'); return `${d.getMonth()+1}/${d.getDate()}` })()
        return (
          <div key={i} style={{ position: 'absolute', left: 0, top: `${byOf(idx) + barH / 2}%`,
            width: `${LP - 1}%`, transform: 'translateY(-50%)', textAlign: 'right',
            fontSize: 4.5, color: datColor, lineHeight: 1, pointerEvents: 'none',
            overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {label}
          </div>
        )
      })}
      {xTicks.map((tick, i) => (
        <div key={i} style={{ position: 'absolute', left: `${bxOf(tick)}%`, top: '97.74%',
          transform: 'translateX(-50%)', fontSize: 4, color: lblColor, lineHeight: 1,
          pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          {tick >= 10000 ? `${Math.round(tick/1000)}k` : tick >= 1000 ? `${(tick/1000).toFixed(1)}k` : Math.round(tick)}
        </div>
      ))}
    </div>
  )
}

/* ── Y-axis + X-axis overlay for graph cards ─────────────────────── */
function ChartWithYAxis({
  children, ticks, pyOf, gridColor, labelColor, formatLabel,
  xLeft, xRight, xLeftColor, xRightColor,
}: {
  children: React.ReactNode
  ticks: number[]
  pyOf: (v: number) => number
  gridColor: string
  labelColor: string
  formatLabel: (v: number) => string
  xLeft?: string
  xRight?: string
  xLeftColor?: string
  xRightColor?: string
}) {
  const vis  = ticks.filter(t => { const y = pyOf(t); return y > 2 && y < 98 })
  const hasX = !!(xLeft || xRight)
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Chart area: grid lines + chart + Y-axis labels */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%' }}>
        {/* Dashed grid lines — behind chart; horizontal lines aren't distorted by preserveAspectRatio:none */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none"
             style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {vis.map((t, i) => (
            <line key={i}
              x1="0" y1={pyOf(t).toFixed(2)} x2="100" y2={pyOf(t).toFixed(2)}
              stroke={gridColor} strokeWidth="0.55" strokeDasharray="2 3.5" />
          ))}
        </svg>
        {/* Chart — renders on top of grid */}
        {children}
        {/* Y-axis text labels — CSS % positioning avoids SVG text distortion */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {vis.map((t, i) => (
            <span key={i} style={{
              position: 'absolute',
              left: 4,
              top: `${pyOf(t)}%`,
              transform: 'translateY(-50%)',
              fontSize: 8,
              fontWeight: 600,
              color: labelColor,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
            }}>
              {formatLabel(t)}
            </span>
          ))}
        </div>
      </div>
      {/* X-axis date labels — only rendered when xLeft or xRight is provided */}
      {hasX && (
        <div style={{ display: 'flex', justifyContent: 'space-between', flexShrink: 0, padding: '2px 4px 0', pointerEvents: 'none' }}>
          <span style={{ fontSize: 8, fontWeight: 500, color: xLeftColor ?? labelColor, lineHeight: 1, whiteSpace: 'nowrap' }}>
            {xLeft ?? ''}
          </span>
          <span style={{ fontSize: 8, fontWeight: 600, color: xRightColor ?? labelColor, lineHeight: 1, whiteSpace: 'nowrap' }}>
            {xRight ?? ''}
          </span>
        </div>
      )}
    </div>
  )
}

/* ── Main component ──────────────────────────────────────── */
export default function StatsShareView({ data }: { data: StatsData }) {
  const router = useRouter()

  // MAX 1RM export refs
  const fullGraphRef = useRef<HTMLDivElement>(null)
  const miniCardRef  = useRef<HTMLDivElement>(null)
  const wideCardRef  = useRef<HTMLDivElement>(null)

  // Body Weight export refs
  const fullWeightRef = useRef<HTMLDivElement>(null)
  const miniWeightRef = useRef<HTMLDivElement>(null)
  const wideWeightRef = useRef<HTMLDivElement>(null)

  // Daily Volume export refs
  const fullVolRef = useRef<HTMLDivElement>(null)
  const miniVolRef = useRef<HTMLDivElement>(null)
  const wideVolRef = useRef<HTMLDivElement>(null)

  const { unit }   = useWeightUnit()
  const unitLabel  = weightUnitLabel(unit)
  const { locale } = useLocale()
  const ja         = locale === 'ja'
  const { theme: appTheme } = useTheme()
  const isLight = appTheme === 'light'
  const [exerciseNameLang, setExerciseNameLang] = useExerciseNameLang(locale)
  const [cardLang, setCardLang] = useCardLang(locale)
  const cl = (en: string, ja2: string) => cardLang === 'ja' ? ja2 : en

  const [theme,      setTheme]      = useState<Theme>('dark')
  const [accent,     setAccent]     = useState<Accent>('dark')
  const [chartType,  setChartType]  = useState<ChartType>('bar')
  const [sharing,    setSharing]    = useState(false)
  const [status,     setStatus]     = useState('')
  const [shareCount, setShareCount] = useState(0)

  const sidePreviewUrlRef                   = useRef<string>('')
  const sideGenRef                          = useRef(0)
  const [sidePreviewSrc, setSidePreviewSrc] = useState<string>('')

  // Graph layout controls — shared by MAX 1RM, Body Weight, Daily Volume
  const [graphLayout,  setGraphLayout]  = useState<GraphLayout>('full')
  const [graphPreset,  setGraphPreset]  = useState<GraphPreset>('orange')
  const [cardStyle,    setCardStyle]    = useState<CardStyle>('glass')
  const [shadowLevel,  setShadowLevel]  = useState<ShadowLevel>('soft')
  const [volViewType,  setVolViewType]  = useState<VolViewType>('bodypart')
  const [pplGroup,     setPplGroup]     = useState<PPLGroup>('push')

  useEffect(() => { setShareCount(getShareCount()) }, [])

  const isMax1RM = data.type === 'max1rm'
  const isBW     = data.type === 'bodyweight'
  const isVol    = data.type === 'volume'
  const gp       = PRESETS[graphPreset]
  const ac       = AC[accent]
  const acHex    = ac.hex

  // Graph card backgrounds
  const isTransparentCard = cardStyle === 'transparent'
  // transparent: premium-black → dark text (black on transparent); all others → light text (white on transparent)
  const isDarkBg  = isTransparentCard ? (graphPreset !== 'premium-black') : (gp.isDark !== false)
  const gpAccent  = isTransparentCard ? (gp.accentHexTransp ?? gp.accentHex) : gp.accentHex
  const gpLatest  = isTransparentCard ? (gp.latestHexTransp ?? gp.latestHex ?? gpAccent) : (gp.latestHex ?? gp.accentHex)
  const gpRgb     = isDarkBg ? '255,255,255' : '17,24,39'
  const ptxt      = (a: number) => `rgba(${gpRgb},${a})`
  const textPrimary  = isDarkBg ? '#fff' : '#111827'
  const gpBadgeBg    = isTransparentCard ? (gp.badgeBgTransp ?? gp.badgeBg) : gp.badgeBg
  const gpBadgeTxt   = isTransparentCard ? (gp.badgeTextTransp ?? gp.badgeText) : gp.badgeText
  // transparent mode: suppress the area-fill polygon so the saved PNG has no
  // semi-transparent color surface under the line — only the line/dots remain.
  const areaFill     = isTransparentCard ? 'none' : acRgba(gpAccent, 0.12)
  const repraLogoBadgeAccent = isDarkBg ? gpAccent : 'rgba(229,231,235,0.85)'
  const repraLogoBadgeFill   = acRgba(gp.accentHex, 0.14)

  // preview-only: premium-black + transparent uses dark text, so show a light preview backing.
  // The checker/backing is applied to the OUTER WRAPPER (outside all capture refs), so it
  // never appears in the saved PNG. Capture refs have no background in transparent mode.
  const needsLightPreviewBacking = graphPreset === 'premium-black' && isTransparentCard
  const gpGlassSt    = glassCardStyle(gp.accentHex, gp.isDark !== false)
  // transparent: explicitly clear both background shorthand AND backgroundImage.
  // iOS Safari may not reset background-image when the `background` shorthand is set to
  // 'transparent' via JS — the glass linear-gradient layer can linger in computed style.
  // html-to-image copies computed background-image to the clone (it only writes
  // backgroundColor, never backgroundImage), so an un-cleared gradient appears in the PNG.
  // Adding backgroundImage:'none' forces the computed value to none before capture.
  const cardBgProps  = isTransparentCard
    ? { background: 'transparent', backgroundImage: 'none' }
    : gpGlassSt
  const shadowValue    = SHADOW_MAP[shadowLevel]
  const glassShadow    = gp.isDark !== false
    ? `0 8px 28px rgba(0,0,0,0.62), 0 2px 8px rgba(0,0,0,0.46), 0 0 0 1px ${acRgba(gpAccent, 0.20)}, inset 0 1px 0 rgba(255,255,255,0.12)`
    : `0 4px 18px rgba(0,0,0,0.24), 0 1px 5px rgba(0,0,0,0.14), 0 0 0 1px rgba(255,255,255,0.30), inset 0 1px 0 rgba(255,255,255,0.48)`
  const cardBoxShadow  = isTransparentCard ? 'none' : glassShadow
  const textShadowVal  = isDarkBg ? SHADOW_MAP[shadowLevel] : 'none'
  const gridColor      = isDarkBg ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.11)'
  const gridLabelColor = isDarkBg ? 'rgba(255,255,255,0.50)' : 'rgba(15,23,42,0.42)'

  // ── UI button accent ──────────────────────────────────────────────────
  // rawUiAc: always a hex string (safe to pass to acRgba for background tints).
  // uiAc: the TEXT / BORDER color for selected-state UI buttons.
  //   Pearl-white (#F0EFEA) and premium-black (#E5E7EB) swatches are near-white —
  //   they disappear on light UI backgrounds. Substitute var(--text-primary) so
  //   selected button labels stay readable in both Light and Dark themes.
  // svgUiAc: the hex color for LayoutThumb SVG strokes (CSS vars don't work in SVG).
  const rawUiAc        = gp.uiSwatch ?? gp.accentHex
  const isPearlOrBlack = graphPreset === 'pearl-white' || graphPreset === 'premium-black'
  const uiAc           = isPearlOrBlack ? 'var(--text-primary)' : rawUiAc
  const svgUiAc        = isPearlOrBlack ? (isLight ? '#374151' : '#E5E7EB') : rawUiAc

  /* ── MAX 1RM data ────────────────────────────────────────── */
  const rm1FullHistory = isMax1RM ? (data as Extract<StatsData,{type:'max1rm'}>).history : []
  const bestRM         = isMax1RM ? (data as Extract<StatsData,{type:'max1rm'}>).bestRM : 0
  const exNameRaw      = isMax1RM ? (data as Extract<StatsData,{type:'max1rm'}>).exerciseName : ''
  const exNameEn       = RM_JA_EN[exNameRaw] ?? exNameRaw.toUpperCase()
  const exNameDisplay  = exerciseNameLang === 'ja' ? exNameRaw : exNameEn
  const exName         = exNameDisplay.length > 18 ? exNameDisplay.slice(0, 17) + '…' : exNameDisplay

  const rm1Growth   = rm1FullHistory.length >= 2
    ? Math.round((toDisplayWeight(bestRM, unit) - toDisplayWeight(rm1FullHistory[0].est1rm, unit)) * 10) / 10
    : null
  const rm1FirstVal = rm1FullHistory.length >= 1 ? toDisplayWeight(rm1FullHistory[0].est1rm, unit) : null
  const bestRMDisplay = toDisplayWeight(bestRM, unit)

  const rm1SVGData = rm1FullHistory.map(p => ({
    est1rm: Math.round(toDisplayWeight(p.est1rm, unit)),
  }))
  const rm1LayoutLimit = GRAPH_STORY_LIMITS[graphLayout]
  const rm1DataView    = useMemo(() => sampleEvenly(rm1SVGData, rm1LayoutLimit), [rm1SVGData, rm1LayoutLimit])
  const rm1DatesView   = useMemo(
    () => sampleEvenly(rm1FullHistory, rm1LayoutLimit).map(p => p.date),
    [rm1FullHistory, rm1LayoutLimit],
  )
  const rm1AxisMax = rm1DataView.length ? Math.max(...rm1DataView.map(d => d.est1rm)) : 0
  const rm1AxisMin = rm1DataView.length ? Math.min(...rm1DataView.map(d => d.est1rm)) : 0
  const rm1AxisRng = rm1AxisMax - rm1AxisMin || rm1AxisMax * 0.1 || 1
  const rm1Ticks   = rm1DataView.length >= 2 ? niceYTicks(rm1AxisMin, rm1AxisMax, 3) : []
  const rm1PyOf    = (v: number) => 10 + ((rm1AxisMax - v) / rm1AxisRng) * 84

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
  const bwDataView  = useMemo(() => sampleEvenly(bwValues, rm1LayoutLimit), [bwValues, rm1LayoutLimit])
  const bwDatesView = useMemo(
    () => sampleEvenly(bwHistory, rm1LayoutLimit).map(p => p.date),
    [bwHistory, rm1LayoutLimit],
  )
  const bwAxisMax = bwDataView.length ? Math.max(...bwDataView) : 0
  const bwAxisMin = bwDataView.length ? Math.min(...bwDataView) : 0
  const bwAxisRng = bwAxisMax - bwAxisMin || bwAxisMax * 0.1 || 1
  const bwTicks   = bwDataView.length >= 2 ? niceYTicks(bwAxisMin, bwAxisMax, 3) : []
  const bwPyOf    = (v: number) => 10 + ((bwAxisMax - v) / bwAxisRng) * 84
  const bwFirstDate = bwDatesView[0] ?? (bwHistory.length ? bwHistory[0].date : '')
  const bwLastDate  = bwDatesView[bwDatesView.length - 1] ?? (bwHistory.length ? bwHistory[bwHistory.length - 1].date : '')

  /* ── Daily Volume data ───────────────────────────────────── */
  const volRaw      = isVol ? (data as Extract<StatsData, {type:'volume'}>) : null
  const volHistory  = volRaw?.history ?? []
  const volBodyPart = volRaw?.bodyPart ?? 'all'
  const volBodyPartLabel = BODY_PART_DISPLAY[volBodyPart] ?? volBodyPart.toUpperCase()

  // Redirect from 'all' to first specific body part — 'all' is excluded from Story selector
  useEffect(() => {
    if (isVol && volBodyPart === 'all') {
      router.replace('/share?type=stats&metric=volume&bodypart=chest')
    }
  }, [isVol, volBodyPart, router])

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
  const volBars14  = useMemo(() => aggregateVolBars(activeVolHistory, 14),    [activeVolHistory])
  const vol14AxisMax = volBars14.bars.length ? Math.max(...volBars14.bars.map(b => b.value)) : 0
  const vol14Ticks   = volBars14.bars.length >= 2 ? niceYTicks(0, vol14AxisMax, 4).filter(t => t > 0) : []
  const vol14PyOf    = (v: number) => vol14AxisMax > 0 ? 100 - (v / vol14AxisMax) * 92 : 50
  const vol14XLeft   = volBars14.bars.length >= 2 ? volBars14.bars[0].label : ''
  const vol14XRight  = volBars14.bars.length >= 2 ? volBars14.bars[volBars14.bars.length - 1].label : ''
  const vol60AxisMax = volBars60.bars.length ? Math.max(...volBars60.bars.map(b => b.value)) : 0
  const vol60Ticks   = volBars60.bars.length >= 2 ? niceYTicks(0, vol60AxisMax, 4).filter(t => t > 0) : []
  const vol60PyOf    = (v: number) => vol60AxisMax > 0 ? 100 - (v / vol60AxisMax) * 92 : 50
  const vol60XLeft   = volBars60.bars.length >= 2 ? volBars60.bars[0].label : ''
  const vol60XRight  = volBars60.bars.length >= 2 ? volBars60.bars[volBars60.bars.length - 1].label : ''
  const volBars40  = useMemo(() => aggregateVolBars(activeVolHistory, 40),    [activeVolHistory])
  const vol40AxisMax = volBars40.bars.length ? Math.max(...volBars40.bars.map(b => b.value)) : 0
  const vol40Ticks   = volBars40.bars.length >= 2 ? niceYTicks(0, vol40AxisMax, 4).filter(t => t > 0) : []
  const vol40PyOf    = (v: number) => vol40AxisMax > 0 ? 100 - (v / vol40AxisMax) * 92 : 50
  const vol40XLeft   = volBars40.bars.length >= 2 ? volBars40.bars[0].label : ''
  const vol40XRight  = volBars40.bars.length >= 2 ? volBars40.bars[volBars40.bars.length - 1].label : ''

  // Side Graph uses daily granularity (max 40) regardless of total session count.
  // aggregateVolBars switches to weekly at 61+ sessions, which collapses bars to ~10-15.
  // By slicing activeVolHistory directly we always get daily density for the side card.
  const volBarsSide = useMemo((): VolBar[] => {
    const limited = sampleEvenly(activeVolHistory, 28)
    const maxVal  = limited.length ? Math.max(...limited.map(p => p.volume)) : 0
    return limited.map((p, i) => ({
      label:    p.date,
      value:    p.volume,
      isLatest: i === limited.length - 1,
      isBest:   maxVal > 0 && p.volume === maxVal,
    }))
  }, [activeVolHistory])

  const volGranLabel = volBarsAll.granularity === 'daily' ? 'DAILY'
    : volBarsAll.granularity === 'weekly' ? 'WEEKLY' : 'MONTHLY'

  const volBestBar = volBarsAll.bars.find(b => b.isBest)
  const volBestDisplay = volBestBar
    ? Math.round(toDisplayWeight(volBestBar.value, unit))
    : 0
  const volBestStr = volBestBar ? formatVolumeWithUnit(volBestBar.value, unit) : `0${unitLabel}`
  const volAxisMax = volBestBar?.value ?? 0
  const volTicks   = volBarsAll.bars.length >= 2 ? niceYTicks(0, volAxisMax, 4).filter(t => t > 0) : []
  const volPyOf    = (v: number) => volAxisMax > 0 ? 100 - (v / volAxisMax) * 92 : 50
  const volFmtAxis = (v: number) => { const dv = toDisplayWeight(v, unit); if (dv >= 10000) return `${Math.round(dv/1000)}k`; if (dv >= 1000) return `${(dv/1000).toFixed(1)}k`; return `${Math.round(dv)}${unitLabel}` }

  // Label shown on cards — changes with viewType and group/filter
  const volDisplayLabel: string = volViewType === 'ppl'
    ? (pplGroup === 'push' ? 'PUSH' : pplGroup === 'pull' ? 'PULL' : pplGroup === 'legs' ? 'LEGS' : 'ALL')
    : volBodyPartLabel

  // Card-language-aware display label
  const volCardLabel: string = volViewType === 'ppl'
    ? volDisplayLabel
    : (cardLang === 'ja' ? (BODY_PART_DISPLAY_JA[volBodyPart] ?? volBodyPart) : volBodyPartLabel)

  // Active totals — computed from active history for consistency in PPL mode
  const activeVolTotalRaw     = activeVolHistory.reduce((s, d) => s + d.volume, 0)
  const activeVolTotalDisplay = Math.round(toDisplayWeight(activeVolTotalRaw, unit))
  const activeVolTotalStr     = formatVolumeWithUnit(activeVolTotalRaw, unit)
  const activeVolSessionCount = activeVolHistory.length
  const activeVolFirstDate    = activeVolHistory.length ? activeVolHistory[0].date : ''
  const activeVolLastDate     = activeVolHistory.length ? activeVolHistory[activeVolHistory.length - 1].date : ''
  const activeVolGrowthRaw    = activeVolHistory.length >= 2
    ? activeVolHistory[activeVolHistory.length - 1].volume - activeVolHistory[0].volume
    : null
  const activeVolGrowthStr    = (activeVolGrowthRaw !== null && activeVolGrowthRaw > 0)
    ? `+${formatVolumeWithUnit(activeVolGrowthRaw, unit)}`
    : null

  /* ── Side graph canvas preview ───────────────────────────── */
  // Stable string key — prevents unstable object/array refs from re-triggering the effect.
  // String comparison is value-based, so even if arrays are recreated each render,
  // the key stays identical as long as the serialized content hasn't changed.
  const sidePreviewKey = useMemo(() => {
    if (graphLayout !== 'side') return ''
    return [
      isMax1RM ? 'rm' : isBW ? 'bw' : 'vol',
      cardStyle, gpAccent, gpLatest, areaFill,
      isDarkBg ? '1' : '0',
      gp.accentHex, String(gp.isDark), gp.border,
      gpBadgeBg, gpBadgeTxt, cardLang, unitLabel, unit,
      exName ?? '', String(bestRMDisplay ?? ''), String(rm1Growth ?? ''),
      String(bwCurrentDisplay), String(bwStartDisplay), bwChangeStr,
      volCardLabel, activeVolTotalStr, String(activeVolSessionCount),
      isMax1RM ? rm1DataView.map((d, i) => `${rm1DatesView[i] ?? ''}:${d.est1rm}`).join(',') : '',
      isBW      ? bwDataView.map((v, i) => `${bwDatesView[i] ?? ''}:${v}`).join(',') : '',
      isVol     ? volBarsSide.map(b => `${b.label}:${b.value}`).join(',') : '',
    ].join('|')
  }, [
    graphLayout, isMax1RM, isBW, isVol,
    cardStyle, gpAccent, gpLatest, areaFill, isDarkBg,
    gp.accentHex, gp.isDark, gp.border, gpBadgeBg, gpBadgeTxt,
    cardLang, unitLabel, unit,
    exName, bestRMDisplay, rm1Growth,
    bwCurrentDisplay, bwStartDisplay, bwChangeStr,
    volCardLabel, activeVolTotalStr, activeVolSessionCount,
    rm1DataView, rm1DatesView, bwDataView, bwDatesView, volBarsSide,
  ])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!sidePreviewKey) {
      if (sidePreviewUrlRef.current) { URL.revokeObjectURL(sidePreviewUrlRef.current); sidePreviewUrlRef.current = '' }
      setSidePreviewSrc('')
      return
    }
    // Generation counter: only the latest async result may update state.
    // This prevents a slow previous export from overwriting a newer one.
    const gen = ++sideGenRef.current
    const run = async () => {
      try {
        const { exportSideGraphCard } = await import('@/lib/sideGraphExport')
        const metric = isMax1RM ? 'max1rm' as const : isBW ? 'bodyweight' as const : 'volume' as const
        const blob = await exportSideGraphCard({
          metric, cardStyle,
          graphAccentHex: gpAccent, graphLatestHex: gpLatest, areaFill, isDarkBg,
          glassAccentHex: gp.accentHex, glassIsDark: gp.isDark !== false,
          gpBorder: gp.border, badgeBg: gpBadgeBg, badgeTxt: gpBadgeTxt,
          cardLang, unitLabel, unit,
          exName, bestRMDisplay, rm1Growth: rm1Growth ?? null,
          rm1SVGData: rm1DataView, rm1Dates: rm1DatesView,
          bwCurrentDisplay, bwStartDisplay, bwChangeStr, bwChangeRaw,
          bwValues: bwDataView, bwHistoryLen: bwDataView.length, bwDates: bwDatesView,
          bwStartDate: bwHistory.length ? bwHistory[0].date : undefined,
          volCardLabel, activeVolTotalStr, activeVolSessionCount, volBars: volBarsSide,
        })
        if (gen !== sideGenRef.current) return
        if (sidePreviewUrlRef.current) URL.revokeObjectURL(sidePreviewUrlRef.current)
        const url = URL.createObjectURL(blob)
        sidePreviewUrlRef.current = url
        setSidePreviewSrc(url)
      } catch (e) {
        if (gen !== sideGenRef.current) return
        console.error('[sidePreview]', e)
      }
    }
    run()
  }, [sidePreviewKey])

  /* ── Share handler ───────────────────────────────────────── */
  const handleShare = async () => {
    setSharing(true)
    setStatus('Creating image...')
    try {
      let blob: Blob
      let filename: string

      if (data.type === 'max1rm') {
        const today = new Date().toISOString().split('T')[0]
        const nameSlug = (RM_JA_EN[exNameRaw] ?? exNameRaw)
          .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 20) || 'exercise'
        filename = graphLayout === 'full'
          ? `repra-max-1rm-story-${today}-${nameSlug}.png`
          : `repra-max-1rm-card-${today}-${nameSlug}-${graphLayout}.png`

        if (graphLayout === 'side') {
          const { exportSideGraphCard } = await import('@/lib/sideGraphExport')
          blob = await exportSideGraphCard({
            metric: 'max1rm',
            cardStyle,
            graphAccentHex: gpAccent,
            graphLatestHex: gpLatest,
            areaFill,
            isDarkBg,
            glassAccentHex: gp.accentHex,
            glassIsDark: gp.isDark !== false,
            gpBorder: gp.border,
            badgeBg: gpBadgeBg,
            badgeTxt: gpBadgeTxt,
            cardLang,
            exName,
            bestRMDisplay,
            unitLabel,
            unit,
            rm1Growth: rm1Growth ?? null,
            rm1SVGData: rm1DataView,
            rm1Dates: rm1DatesView,
          })
        } else {
          const el: HTMLDivElement | null =
            graphLayout === 'full' ? fullGraphRef.current :
            graphLayout === 'mini' ? miniCardRef.current  :
                                     wideCardRef.current

          const w = el?.offsetWidth ?? 0; const h = el?.offsetHeight ?? 0
          const innerText = el?.innerText?.trim() ?? ''; const childCount = el?.children.length ?? 0

          if (!el || w === 0 || h === 0 || innerText === '' || childCount === 0) {
            setStatus('Could not create image. Please try again.')
            setTimeout(() => setStatus(''), 3000); setSharing(false); return
          }

          blob = await captureElement(el, { clearBackground: cardStyle === 'transparent' })
        }

        const r1 = await shareOrDownloadImage({ blob, filename,
          title: (graphLayout === 'full' || graphLayout === 'side') ? 'REPRA Graph Story' : 'REPRA Graph Card' })
        incrementShareCount(); setShareCount(getShareCount())
        if (r1 === 'downloaded') { setStatus('Downloaded!'); setTimeout(() => setStatus(''), 2000) } else { setStatus('') }
        return

      } else if (data.type === 'bodyweight') {
        if (bwHistory.length < BW_CHART_REQUIRED) { setSharing(false); setStatus(''); return }
        const today = new Date().toISOString().split('T')[0]
        filename = graphLayout === 'full'
          ? `repra-bodyweight-story-${today}.png`
          : `repra-bodyweight-card-${today}-${graphLayout}.png`

        if (graphLayout === 'side') {
          const { exportSideGraphCard } = await import('@/lib/sideGraphExport')
          blob = await exportSideGraphCard({
            metric: 'bodyweight',
            cardStyle,
            graphAccentHex: gpAccent,
            graphLatestHex: gpLatest,
            areaFill,
            isDarkBg,
            glassAccentHex: gp.accentHex,
            glassIsDark: gp.isDark !== false,
            gpBorder: gp.border,
            badgeBg: gpBadgeBg,
            badgeTxt: gpBadgeTxt,
            cardLang,
            unitLabel,
            unit,
            bwCurrentDisplay,
            bwStartDisplay,
            bwChangeStr,
            bwChangeRaw,
            bwValues: bwDataView,
            bwHistoryLen: bwDataView.length,
            bwDates: bwDatesView,
            bwStartDate: bwHistory.length ? bwHistory[0].date : undefined,
          })
        } else {
          const el: HTMLDivElement | null =
            graphLayout === 'full' ? fullWeightRef.current :
            graphLayout === 'mini' ? miniWeightRef.current :
                                     wideWeightRef.current

          const w = el?.offsetWidth ?? 0; const h = el?.offsetHeight ?? 0
          const innerText = el?.innerText?.trim() ?? ''; const childCount = el?.children.length ?? 0

          if (!el || w === 0 || h === 0 || innerText === '' || childCount === 0) {
            setStatus('Could not create image. Please try again.')
            setTimeout(() => setStatus(''), 3000); setSharing(false); return
          }

          blob = await captureElement(el, { clearBackground: cardStyle === 'transparent' })
        }

        const r2 = await shareOrDownloadImage({ blob, filename,
          title: (graphLayout === 'full' || graphLayout === 'side') ? 'REPRA Weight Graph Story' : 'REPRA Weight Graph Card' })
        incrementShareCount(); setShareCount(getShareCount())
        if (r2 === 'downloaded') { setStatus('Downloaded!'); setTimeout(() => setStatus(''), 2000) } else { setStatus('') }
        return

      } else {
        // Daily Volume
        const today = new Date().toISOString().split('T')[0]
        filename = graphLayout === 'full'
          ? `repra-volume-story-${today}-${volBodyPart}.png`
          : `repra-volume-card-${today}-${volBodyPart}-${graphLayout}.png`

        if (graphLayout === 'side') {
          const { exportSideGraphCard } = await import('@/lib/sideGraphExport')
          blob = await exportSideGraphCard({
            metric: 'volume',
            cardStyle,
            graphAccentHex: gpAccent,
            graphLatestHex: gpLatest,
            areaFill,
            isDarkBg,
            glassAccentHex: gp.accentHex,
            glassIsDark: gp.isDark !== false,
            gpBorder: gp.border,
            badgeBg: gpBadgeBg,
            badgeTxt: gpBadgeTxt,
            cardLang,
            unitLabel,
            unit,
            volCardLabel,
            activeVolTotalStr,
            activeVolSessionCount,
            volBars: volBarsSide,
          })
        } else {
          const el: HTMLDivElement | null =
            graphLayout === 'full' ? fullVolRef.current :
            graphLayout === 'mini' ? miniVolRef.current :
                                     wideVolRef.current

          const w = el?.offsetWidth ?? 0; const h = el?.offsetHeight ?? 0
          const innerText = el?.innerText?.trim() ?? ''; const childCount = el?.children.length ?? 0

          if (!el || w === 0 || h === 0 || innerText === '' || childCount === 0) {
            setStatus('Could not create image. Please try again.')
            setTimeout(() => setStatus(''), 3000); setSharing(false); return
          }

          blob = await captureElement(el, { clearBackground: cardStyle === 'transparent' })
        }

        const r3 = await shareOrDownloadImage({ blob, filename,
          title: (graphLayout === 'full' || graphLayout === 'side') ? 'REPRA Volume Graph Story' : 'REPRA Volume Graph Card' })
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
    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: 8 }}>{text}</p>
  )

  // Volume volume format helper
  const fmtVol = (v: number) => formatVolumeWithUnit(v, unit)

  // Whether to show bar thumb in layout selector
  const isBarType = isVol

  return (
    <div className="min-h-screen pb-nav flex flex-col" style={{ background: 'var(--app-bg)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl" style={{ background: 'var(--card-bg-primary)', border: '1px solid var(--card-border-primary)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--text-muted)' }} />
        </button>
        <h1 className="text-base font-black tracking-widest" style={{ color: 'var(--text-primary)' }}>{ja ? 'ストーリーをシェア' : 'Share Story'}</h1>
      </div>

      {/* ① GRAPH LAYOUT ──────────────────────────────────────── */}
      <div className="px-4 mb-4">
        {sectionLabel(ja ? 'レイアウト' : 'GRAPH LAYOUT')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {GRAPH_LAYOUTS.map(l => {
            const sel = graphLayout === l.key
            return (
              <button
                key={l.key}
                onClick={() => setGraphLayout(l.key as GraphLayout)}
                style={{
                  background: sel ? acRgba(gp.accentHex, 0.15) : 'var(--surface-chip)',
                  border: `1.5px solid ${sel ? gp.accentHex : 'var(--border-subtle)'}`,
                  borderRadius: 14, padding: '10px 12px',
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                  cursor: 'pointer', textAlign: 'left',
                }}>
                <LayoutThumb layoutKey={l.key} accentHex={svgUiAc} selected={sel} isBar={isBarType} isDark={!isLight} />
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: sel ? uiAc : 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                    {l.ratio ? `${l.ratio} ` : ''}{ja ? l.labelJa : l.labelEn}
                  </p>
                  {!ja && (
                    <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: '2px 0 0', lineHeight: 1.2 }}>
                      {l.labelJa}
                    </p>
                  )}
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
            {sectionLabel(ja ? '表示タイプ' : 'VIEW TYPE')}
            <div className="flex gap-2">
              {(['bodypart', 'ppl'] as VolViewType[]).map(vt => {
                const sel = volViewType === vt
                return (
                  <button key={vt} onClick={() => setVolViewType(vt)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                    style={{
                      background: sel ? acRgba(rawUiAc, 0.15) : 'var(--surface-chip)',
                      color: sel ? uiAc : 'var(--text-inactive)',
                      border: `1.5px solid ${sel ? uiAc : 'var(--border-subtle)'}`,
                    }}>
                    {vt === 'bodypart' ? (ja ? '部位別' : 'Body Part') : 'PPL'}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Body Part filter */}
          {volViewType === 'bodypart' && (
            <div className="px-4 mb-4">
              {sectionLabel(ja ? '部位' : 'BODY PART')}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {VOL_BODY_PARTS.filter(bp => bp.key !== 'all').map(bp => {
                  const sel = volBodyPart === bp.key
                  return (
                    <button key={bp.key}
                      onClick={() => router.push(`/share?type=stats&metric=volume&bodypart=${bp.key}`)}
                      style={{
                        padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        background: sel ? acRgba(rawUiAc, 0.15) : 'var(--surface-chip)',
                        color: sel ? uiAc : 'var(--text-inactive)',
                        border: `1.5px solid ${sel ? uiAc : 'var(--border-subtle)'}`,
                      }}>
                      {ja ? bp.labelJa : bp.label}
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
                {VOL_PPL_GROUPS.filter(pg => pg.key !== 'all').map(pg => {
                  const sel = pplGroup === pg.key
                  return (
                    <button key={pg.key}
                      onClick={() => setPplGroup(pg.key)}
                      style={{
                        flex: 1, padding: '8px 4px', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        background: sel ? acRgba(rawUiAc, 0.15) : 'var(--surface-chip)',
                        color: sel ? uiAc : 'var(--text-inactive)',
                        border: `1.5px solid ${sel ? uiAc : 'var(--border-subtle)'}`,
                      }}>
                      {ja ? pg.labelJa : pg.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ② CARD LANGUAGE ──────────────────────────────────── */}
      <div className="px-4 mb-3">
        {sectionLabel(ja ? 'カード表示言語' : 'CARD LANGUAGE')}
        <div className="flex gap-2">
          {([
            { value: 'en' as const, label: ja ? '英語' : 'English' },
            { value: 'ja' as const, label: '日本語' },
          ]).map(({ value, label }) => {
            const sel = cardLang === value
            return (
              <button key={value} onClick={() => setCardLang(value)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{
                  background: sel ? acRgba(rawUiAc, 0.15) : 'var(--surface-chip)',
                  color: sel ? uiAc : 'var(--text-inactive)',
                  border: `1.5px solid ${sel ? uiAc : 'var(--border-subtle)'}`,
                }}>
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ③ EXERCISE NAME LANGUAGE — MAX 1RM only ──────────── */}
      {isMax1RM && (
        <div className="px-4 mb-3">
          {sectionLabel(ja ? '種目名の表示' : 'EXERCISE NAMES')}
          <div className="flex gap-2">
            {([
              { value: 'en' as const, label: ja ? '英語' : 'English'  },
              { value: 'ja' as const, label: '日本語'    },
            ]).map(({ value, label }) => {
              const sel = exerciseNameLang === value
              return (
                <button key={value} onClick={() => setExerciseNameLang(value)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                  style={{
                    background: sel ? acRgba(rawUiAc, 0.15) : 'var(--surface-chip)',
                    color: sel ? uiAc : 'var(--text-inactive)',
                    border: `1.5px solid ${sel ? uiAc : 'var(--border-subtle)'}`,
                  }}>
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ④ CARD STYLE ───────────────────────────────────────── */}
      <div className="px-4 mb-3">
        {sectionLabel(ja ? 'カードスタイル' : 'CARD STYLE')}
        <div className="flex gap-2">
          {(['glass', 'transparent'] as CardStyle[]).map(cs => {
            const sel = cardStyle === cs
            return (
              <button key={cs} onClick={() => setCardStyle(cs)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{
                  background: sel ? acRgba(rawUiAc, 0.15) : 'var(--surface-chip)',
                  color: sel ? uiAc : 'var(--text-inactive)',
                  border: `1.5px solid ${sel ? uiAc : 'var(--border-subtle)'}`,
                }}>
                {cs === 'glass' ? (ja ? 'ガラス' : 'Glass') : (ja ? '透過' : 'Transparent')}
              </button>
            )
          })}
        </div>
      </div>

      {/* ④ DESIGN PRESET ────────────────────────────────────── */}
      <div className="px-4 mb-4">
        {sectionLabel(ja ? 'デザインプリセット' : 'DESIGN PRESET')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(['orange', 'ice-blue', 'violet', 'mint', 'premium-black', 'pearl-white'] as GraphPreset[]).map(pk => {
            const pd     = PRESETS[pk]
            const swatch = pd.uiSwatch ?? pd.accentHex
            const sel    = graphPreset === pk
            return (
              <button key={pk} onClick={() => setGraphPreset(pk)}
                style={{
                  padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                  background: sel ? acRgba(swatch, 0.15) : 'var(--surface-chip)',
                  border: `1.5px solid ${sel ? swatch : 'var(--border-subtle)'}`,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 9, flexShrink: 0,
                  background: swatch,
                  border: pk === 'pearl-white' ? '1px solid rgba(255,255,255,0.25)' : 'none',
                }} />
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.03em', textAlign: 'left',
                  color: sel ? (pk === 'pearl-white' || pk === 'premium-black' ? 'var(--text-primary)' : swatch) : 'var(--text-inactive)',
                  lineHeight: 1.3, display: 'block',
                }}>
                  {ja ? PRESET_LABELS_JA[pk] : PRESET_LABELS[pk]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ⑤ SHADOW ───────────────────────────────────────────── */}
      <div className="px-4 mb-4">
        {sectionLabel(ja ? 'シャドウ' : 'SHADOW')}
        <div className="flex gap-2">
          {(['none', 'soft', 'strong', 'extra-strong'] as ShadowLevel[]).map(sl => {
            const sel = shadowLevel === sl
            const label = ja
              ? (sl === 'none' ? 'なし' : sl === 'soft' ? '弱め' : sl === 'strong' ? '強め' : '最大')
              : (sl === 'none' ? 'None' : sl === 'soft' ? 'Soft' : sl === 'strong' ? 'Strong' : 'Extra')
            return (
              <button key={sl} onClick={() => setShadowLevel(sl)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{
                  background: sel ? acRgba(rawUiAc, 0.15) : 'var(--surface-chip)',
                  color: sel ? uiAc : 'var(--text-inactive)',
                  border: `1.5px solid ${sel ? uiAc : 'var(--border-subtle)'}`,
                }}>
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ⑦ PREVIEW ──────────────────────────────────────────── */}
      {/* Checker behind all cards (glass AND transparent) so semi-transparency is visible. */}
      {/* The checker is on the OUTER WRAPPER — outside all capture refs — so it never        */}
      {/* appears in saved PNGs. Transparent capture refs have no inline background at all.   */}
      <div className="px-4 mb-5" style={{
        backgroundColor: isTransparentCard
          ? (needsLightPreviewBacking ? '#F9FAFB' : '#1a1a1a')
          : '#111111',
        backgroundImage: needsLightPreviewBacking ? LIGHT_CHECKER : CHECKER,
        backgroundSize: '20px 20px',
      }}>

        {isMax1RM ? (

          /* ── MAX 1RM layouts ─────────────────────────────── */
          <>
            {graphLayout === 'full' && (
              <div ref={fullGraphRef} style={{
                aspectRatio: '9/16', width: '100%', ...cardBgProps, borderRadius: 24,
                position: 'relative', isolation: 'isolate', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                border: isTransparentCard ? 'none' : `1px solid ${gp.border}`,
                boxShadow: isTransparentCard ? 'none' : glassShadow, textShadow: textShadowVal,
              }}>
                <div style={{ padding: '16px 18px 0', flexShrink: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 9px', borderRadius: 7, background: repraLogoBadgeFill, color: repraLogoBadgeAccent, border: `1.5px solid ${repraLogoBadgeAccent}`, letterSpacing: '0.18em', display: 'inline-block' }}>REPRA</span>
                  <p style={{ fontSize: 8.5, fontWeight: 700, color: ptxt(0.40), letterSpacing: '0.14em', margin: '7px 0 2px' }}>{cl('MAX 1RM PROGRESS', '最大1RMの推移')}</p>
                  <p style={{ fontSize: 19, fontWeight: 900, color: textPrimary, lineHeight: 1.1, margin: 0 }}>{exName}</p>
                </div>
                <div style={{ height: 1, background: acRgba(gpAccent, 0.25), margin: '10px 18px' }} />
                <div style={{ padding: '0 18px', flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  {rm1FirstVal !== null && (
                    <>
                      <div>
                        <p style={{ fontSize: 6.5, fontWeight: 700, color: ptxt(0.38), letterSpacing: '0.1em', margin: '0 0 2px' }}>{cl('START', 'スタート')}</p>
                        <p style={{ fontSize: 17, fontWeight: 700, color: ptxt(0.70), margin: 0, lineHeight: 1 }}>{rm1FirstVal}<span style={{ fontSize: 8.5, color: ptxt(0.42), marginLeft: 1 }}>{unitLabel}</span></p>
                      </div>
                      <p style={{ fontSize: 13, color: ptxt(0.22), margin: '7px 0 0' }}>→</p>
                    </>
                  )}
                  <div>
                    <p style={{ fontSize: 6.5, fontWeight: 700, color: gpAccent, letterSpacing: '0.1em', margin: '0 0 2px' }}>{cl('BEST', 'ベスト')}</p>
                    <p style={{ fontSize: rm1FirstVal !== null ? 24 : 30, fontWeight: 900, color: gpAccent, margin: 0, lineHeight: 1 }}>
                      {bestRMDisplay}<span style={{ fontSize: 10, color: ptxt(0.50), fontWeight: 400, marginLeft: 2 }}>{unitLabel}</span>
                    </p>
                  </div>
                  {rm1Growth !== null && (
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <p style={{ fontSize: 6.5, fontWeight: 700, color: ptxt(0.38), letterSpacing: '0.1em', margin: '0 0 2px' }}>{cl('GAIN', '成長')}</p>
                      <p style={{ fontSize: 17, fontWeight: 800, color: rm1Growth >= 0 ? '#4ade80' : '#f87171', margin: 0, lineHeight: 1 }}>
                        {rm1Growth >= 0 ? '+' : ''}{rm1Growth}<span style={{ fontSize: 8.5, marginLeft: 1 }}>{unitLabel}</span>
                      </p>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minHeight: 0, padding: '12px 14px 0' }}>
                  {rm1DataView.length >= 2
                    ? <ChartWithYAxis ticks={rm1Ticks} pyOf={rm1PyOf} gridColor={gridColor} labelColor={gridLabelColor} formatLabel={v => `${Math.round(v)}${unitLabel}`}>
                        <MiniLineSVG data={rm1DataView} accentHex={gpAccent} latestHex={gpLatest} areaFill={areaFill} isDarkBg={isDarkBg} />
                      </ChartWithYAxis>
                    : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}><p style={{ fontSize: 9, color: ptxt(0.25) }}>No data yet</p></div>}
                </div>
                {rm1DataView.length >= 2 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 18px 0', flexShrink: 0 }}>
                    <span style={{ fontSize: 7.5, color: ptxt(0.35) }}>{fmtXLabel(rm1DatesView[0] ?? '')}</span>
                    <span style={{ fontSize: 7.5, color: gpAccent, fontWeight: 600 }}>{fmtXLabel(rm1DatesView[rm1DatesView.length - 1] ?? '')}</span>
                  </div>
                )}
                <p style={{ fontSize: 7.5, color: ptxt(0.28), padding: '7px 18px 14px', margin: 0, flexShrink: 0 }}>
                  Made with <span style={{ color: acRgba(gpAccent, 0.6), fontWeight: 700 }}>REPRA</span>
                </p>
              </div>
            )}

            {graphLayout === 'side' && (
              <div style={{
                aspectRatio: '9/16', width: '100%', position: 'relative',
                backgroundImage: 'repeating-conic-gradient(#c8c8c8 0% 25%, #f0f0f0 0% 50%)',
                backgroundSize: '14px 14px',
              }}>
                {sidePreviewSrc
                  ? <img src={sidePreviewSrc} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
                  : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <p style={{ margin: 0, fontSize: 9, color: 'rgba(100,100,100,0.5)' }}>Generating…</p>
                    </div>
                }
              </div>
            )}

            {graphLayout === 'mini' && (
              <div style={{ width: '72%', margin: '0 auto' }}>
                <div ref={miniCardRef} style={{
                  aspectRatio: '1/1', ...cardBgProps, borderRadius: 20,
                  position: 'relative', isolation: 'isolate', overflow: 'hidden', padding: 16, display: 'flex', flexDirection: 'column',
                  boxShadow: cardBoxShadow, border: isTransparentCard ? 'none' : `1px solid ${gp.border}`, textShadow: textShadowVal,
                }}>
                  {gpBadge}
                  <p style={{ fontSize: 13, fontWeight: 900, color: textPrimary, margin: '5px 0 1px', lineHeight: 1.1 }}>{exName}</p>
                  <p style={{ fontSize: 7.5, fontWeight: 700, color: gpAccent, letterSpacing: '0.08em', margin: 0 }}>{cl('1RM PROGRESS', '1RM推移')}</p>
                  <div style={{ flex: 1, minHeight: 0, margin: '8px 0' }}>
                    <ChartWithYAxis ticks={rm1Ticks} pyOf={rm1PyOf} gridColor={gridColor} labelColor={gridLabelColor}
                      formatLabel={v => `${Math.round(v)}${unitLabel}`}
                      xLeft={rm1DataView.length >= 2 ? fmtXLabel(rm1DatesView[0] ?? '') : undefined}
                      xRight={rm1DataView.length >= 2 ? fmtXLabel(rm1DatesView[rm1DatesView.length - 1] ?? '') : undefined}
                      xLeftColor={ptxt(0.38)} xRightColor={ptxt(0.55)}>
                      <MiniLineSVG data={rm1DataView} accentHex={gpAccent} latestHex={gpLatest} areaFill={areaFill} isDarkBg={isDarkBg} />
                    </ChartWithYAxis>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
                      <span style={{ fontSize: 34, fontWeight: 900, color: gpAccent, lineHeight: 1 }}>{bestRMDisplay}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: ptxt(0.65), paddingBottom: 2 }}>{unitLabel}</span>
                    </div>
                    {rm1Growth !== null && (
                      <p style={{ fontSize: 11, fontWeight: 700, color: rm1Growth >= 0 ? '#4ade80' : '#f87171', margin: '3px 0 0' }}>
                        {rm1Growth >= 0 ? '+' : ''}{rm1Growth}{unitLabel} {cl('GAIN', '成長')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {graphLayout === 'wide' && (
              <div ref={wideCardRef} style={{
                width: '100%', aspectRatio: '16/9', ...cardBgProps, borderRadius: 18,
                position: 'relative', isolation: 'isolate', overflow: 'hidden', display: 'flex', boxShadow: cardBoxShadow,
                border: isTransparentCard ? 'none' : `1px solid ${gp.border}`, textShadow: textShadowVal,
              }}>
                <div style={{ width: '38%', padding: '14px 10px 14px 16px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                  {gpBadge}
                  <p style={{ fontSize: 13, fontWeight: 900, color: textPrimary, margin: '6px 0 1px', lineHeight: 1.1 }}>{exName}</p>
                  <p style={{ fontSize: 7.5, fontWeight: 700, color: gpAccent, letterSpacing: '0.08em', margin: 0 }}>{cl('1RM PROGRESS', '1RM推移')}</p>
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
                  <ChartWithYAxis ticks={rm1Ticks} pyOf={rm1PyOf} gridColor={gridColor} labelColor={gridLabelColor}
                    formatLabel={v => `${Math.round(v)}${unitLabel}`}
                    xLeft={rm1DataView.length >= 2 ? fmtXLabel(rm1DatesView[0] ?? '') : undefined}
                    xRight={rm1DataView.length >= 2 ? fmtXLabel(rm1DatesView[rm1DatesView.length - 1] ?? '') : undefined}
                    xLeftColor={ptxt(0.38)} xRightColor={ptxt(0.55)}>
                    <MiniLineSVG data={rm1DataView} accentHex={gpAccent} latestHex={gpLatest} areaFill={areaFill} isDarkBg={isDarkBg} />
                  </ChartWithYAxis>
                </div>
              </div>
            )}
          </>

        ) : isBW ? (

          /* ── Body Weight layouts ──────────────────────────── */
          <>
            {graphLayout === 'full' && (
              <div ref={fullWeightRef} style={{
                aspectRatio: '9/16', width: '100%', ...cardBgProps, borderRadius: 24,
                position: 'relative', isolation: 'isolate', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                border: isTransparentCard ? 'none' : `1px solid ${gp.border}`,
                boxShadow: isTransparentCard ? 'none' : glassShadow, textShadow: textShadowVal,
              }}>
                <div style={{ padding: '16px 18px 0', flexShrink: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 9px', borderRadius: 7, background: repraLogoBadgeFill, color: repraLogoBadgeAccent, border: `1.5px solid ${repraLogoBadgeAccent}`, letterSpacing: '0.18em', display: 'inline-block' }}>REPRA</span>
                  <p style={{ fontSize: 8.5, fontWeight: 700, color: ptxt(0.40), letterSpacing: '0.14em', margin: '7px 0 0' }}>{cl('BODY WEIGHT PROGRESS', '体重の変化')}</p>
                </div>
                <div style={{ height: 1, background: acRgba(gpAccent, 0.25), margin: '10px 18px' }} />
                <div style={{ padding: '0 18px', flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  {bwHistory.length >= 2 && (
                    <>
                      <div>
                        <p style={{ fontSize: 6.5, fontWeight: 700, color: ptxt(0.38), letterSpacing: '0.1em', margin: '0 0 2px' }}>{cl('START', 'スタート')}</p>
                        <p style={{ fontSize: 17, fontWeight: 700, color: ptxt(0.70), margin: 0, lineHeight: 1 }}>{bwStartDisplay}<span style={{ fontSize: 8.5, color: ptxt(0.42), marginLeft: 1 }}>{unitLabel}</span></p>
                      </div>
                      <p style={{ fontSize: 13, color: ptxt(0.22), margin: '7px 0 0' }}>→</p>
                    </>
                  )}
                  <div>
                    <p style={{ fontSize: 6.5, fontWeight: 700, color: gpAccent, letterSpacing: '0.1em', margin: '0 0 2px' }}>{cl('CURRENT', '現在')}</p>
                    <p style={{ fontSize: bwHistory.length >= 2 ? 24 : 30, fontWeight: 900, color: gpAccent, margin: 0, lineHeight: 1 }}>
                      {bwCurrentDisplay}<span style={{ fontSize: 10, color: ptxt(0.50), fontWeight: 400, marginLeft: 2 }}>{unitLabel}</span>
                    </p>
                  </div>
                  {bwChangeRaw !== 0 && (
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <p style={{ fontSize: 6.5, fontWeight: 700, color: ptxt(0.38), letterSpacing: '0.1em', margin: '0 0 2px' }}>{cl('CHANGE', '変化')}</p>
                      <p style={{ fontSize: 17, fontWeight: 800, color: bwChangeRaw >= 0 ? '#4ade80' : '#f87171', margin: 0, lineHeight: 1 }}>
                        {bwChangeStr}<span style={{ fontSize: 8.5, marginLeft: 1 }}>{unitLabel}</span>
                      </p>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minHeight: 0, padding: '12px 14px 0' }}>
                  {bwDataView.length >= 2
                    ? <ChartWithYAxis ticks={bwTicks} pyOf={bwPyOf} gridColor={gridColor} labelColor={gridLabelColor} formatLabel={v => `${Math.round(v * 10) / 10}${unitLabel}`}>
                        <BWLineSVG values={bwDataView} accentHex={gpAccent} latestHex={gpLatest} areaFill={areaFill} isDarkBg={isDarkBg} />
                      </ChartWithYAxis>
                    : bwDataView.length === 1
                      ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                          <p style={{ fontSize: 38, fontWeight: 900, color: gpAccent, margin: 0 }}>{bwCurrentDisplay}<span style={{ fontSize: 14, color: ptxt(0.45), marginLeft: 4 }}>{unitLabel}</span></p>
                        </div>
                      : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}><p style={{ fontSize: 9, color: ptxt(0.25) }}>No data yet</p></div>}
                </div>
                {bwDataView.length >= 2 && (
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

            {graphLayout === 'side' && (
              <div style={{
                aspectRatio: '9/16', width: '100%', position: 'relative',
                backgroundImage: 'repeating-conic-gradient(#c8c8c8 0% 25%, #f0f0f0 0% 50%)',
                backgroundSize: '14px 14px',
              }}>
                {sidePreviewSrc
                  ? <img src={sidePreviewSrc} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
                  : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <p style={{ margin: 0, fontSize: 9, color: 'rgba(100,100,100,0.5)' }}>Generating…</p>
                    </div>
                }
              </div>
            )}

            {graphLayout === 'mini' && (
              <div style={{ width: '72%', margin: '0 auto' }}>
                <div ref={miniWeightRef} style={{
                  aspectRatio: '1/1', ...cardBgProps, borderRadius: 20,
                  position: 'relative', isolation: 'isolate', overflow: 'hidden', padding: 16, display: 'flex', flexDirection: 'column',
                  boxShadow: cardBoxShadow, border: isTransparentCard ? 'none' : `1px solid ${gp.border}`, textShadow: textShadowVal,
                }}>
                  {gpBadge}
                  <p style={{ fontSize: 8, fontWeight: 700, color: gpAccent, letterSpacing: '0.08em', margin: '5px 0 0' }}>{cl('BODY WEIGHT', '体重')}</p>
                  <div style={{ flex: 1, minHeight: 0, margin: '6px 0' }}>
                    <ChartWithYAxis ticks={bwTicks} pyOf={bwPyOf} gridColor={gridColor} labelColor={gridLabelColor}
                      formatLabel={v => `${Math.round(v * 10) / 10}${unitLabel}`}
                      xLeft={bwDataView.length >= 2 ? fmtXLabel(bwFirstDate) : undefined}
                      xRight={bwDataView.length >= 2 ? fmtXLabel(bwLastDate) : undefined}
                      xLeftColor={ptxt(0.38)} xRightColor={ptxt(0.55)}>
                      <BWLineSVG values={bwDataView} accentHex={gpAccent} latestHex={gpLatest} areaFill={areaFill} isDarkBg={isDarkBg} />
                    </ChartWithYAxis>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
                      <span style={{ fontSize: 34, fontWeight: 900, color: gpAccent, lineHeight: 1 }}>{bwCurrentDisplay}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: ptxt(0.65), paddingBottom: 2 }}>{unitLabel}</span>
                    </div>
                    {bwChangeRaw !== 0 && <p style={{ fontSize: 11, fontWeight: 700, color: bwChangeRaw >= 0 ? '#4ade80' : '#f87171', margin: '3px 0 0' }}>{bwChangeStr}{unitLabel} {cl('CHANGE', '変化')}</p>}
                  </div>
                </div>
              </div>
            )}

            {graphLayout === 'wide' && (
              <div ref={wideWeightRef} style={{
                width: '100%', aspectRatio: '16/9', ...cardBgProps, borderRadius: 18,
                position: 'relative', isolation: 'isolate', overflow: 'hidden', display: 'flex', boxShadow: cardBoxShadow,
                border: isTransparentCard ? 'none' : `1px solid ${gp.border}`, textShadow: textShadowVal,
              }}>
                <div style={{ width: '38%', padding: '14px 10px 14px 16px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                  {gpBadge}
                  <p style={{ fontSize: 8, fontWeight: 700, color: gpAccent, letterSpacing: '0.08em', margin: '6px 0 0' }}>{cl('BODY WEIGHT', '体重')}</p>
                  <p style={{ fontSize: 7, fontWeight: 500, color: ptxt(0.35), margin: '1px 0 0', letterSpacing: '0.1em' }}>{cl('PROGRESS', '変化')}</p>
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
                  {bwChangeRaw !== 0 && <p style={{ fontSize: 11, fontWeight: 700, color: bwChangeRaw >= 0 ? '#4ade80' : '#f87171', margin: 0 }}>{bwChangeStr}{unitLabel}</p>}
                  <div style={{ flex: 1 }} />
                  <p style={{ fontSize: 7, color: ptxt(0.30), margin: 0 }}>Made with REPRA</p>
                </div>
                <div style={{ flex: 1, minWidth: 0, padding: '14px 14px 14px 0' }}>
                  <ChartWithYAxis ticks={bwTicks} pyOf={bwPyOf} gridColor={gridColor} labelColor={gridLabelColor}
                    formatLabel={v => `${Math.round(v * 10) / 10}${unitLabel}`}
                    xLeft={bwDataView.length >= 2 ? fmtXLabel(bwFirstDate) : undefined}
                    xRight={bwDataView.length >= 2 ? fmtXLabel(bwLastDate) : undefined}
                    xLeftColor={ptxt(0.38)} xRightColor={ptxt(0.55)}>
                    <BWLineSVG values={bwDataView} accentHex={gpAccent} latestHex={gpLatest} areaFill={areaFill} isDarkBg={isDarkBg} />
                  </ChartWithYAxis>
                </div>
              </div>
            )}
          </>

        ) : (

          /* ── Daily Volume layouts ─────────────────────────── */
          <>
            {graphLayout === 'full' && (
              <div ref={fullVolRef} style={{
                aspectRatio: '9/16', width: '100%', ...cardBgProps, borderRadius: 24,
                position: 'relative', isolation: 'isolate', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                border: isTransparentCard ? 'none' : `1px solid ${gp.border}`,
                boxShadow: isTransparentCard ? 'none' : glassShadow, textShadow: textShadowVal,
              }}>
                {/* Header */}
                <div style={{ padding: '16px 18px 0', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 9px', borderRadius: 7, background: repraLogoBadgeFill, color: repraLogoBadgeAccent, border: `1.5px solid ${repraLogoBadgeAccent}`, letterSpacing: '0.18em', display: 'inline-block' }}>REPRA</span>
                    <span style={{ fontSize: 7, fontWeight: 700, color: acRgba(gpAccent, 0.6), letterSpacing: '0.12em' }}>{volGranLabel}</span>
                  </div>
                  <p style={{ fontSize: 8.5, fontWeight: 700, color: ptxt(0.40), letterSpacing: '0.14em', margin: '7px 0 2px' }}>{cl('DAILY VOLUME', '総重量')}</p>
                  <p style={{ fontSize: 19, fontWeight: 900, color: textPrimary, lineHeight: 1.1, margin: 0 }}>{volCardLabel}</p>
                </div>

                <div style={{ height: 1, background: acRgba(gpAccent, 0.25), margin: '10px 18px' }} />

                {/* Stats */}
                <div style={{ padding: '0 18px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 2 }}>
                    <span style={{ fontSize: 26, fontWeight: 900, color: gpAccent, lineHeight: 1 }}>{activeVolTotalStr}</span>
                    <span style={{ fontSize: 8, color: ptxt(0.40), paddingBottom: 3, fontWeight: 600 }}>{cl('TOTAL', '合計')}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {volBestStr && <p style={{ fontSize: 8.5, color: ptxt(0.50), margin: 0 }}>{cl('Best day:', 'ベスト:')} <span style={{ color: gpAccent, fontWeight: 700 }}>{volBestStr}</span></p>}
                    <p style={{ fontSize: 8.5, color: ptxt(0.40), margin: 0 }}>{activeVolSessionCount} {cl('sessions', 'セッション')}</p>
                  </div>
                  {activeVolGrowthStr && (
                    <p style={{ fontSize: 9, fontWeight: 700, color: '#4ade80', margin: '3px 0 0' }}>
                      {activeVolGrowthStr} {cl('GAIN', '成長')}
                    </p>
                  )}
                </div>

                {/* Bar chart */}
                <div style={{ flex: 1, minHeight: 0, padding: '10px 14px 0' }}>
                  {volBars60.bars.length > 0
                    ? <ChartWithYAxis ticks={vol60Ticks} pyOf={vol60PyOf} gridColor={gridColor} labelColor={gridLabelColor} formatLabel={volFmtAxis}>
                        <VolBarSVG bars={volBars60.bars} accentHex={gpAccent} latestHex={gpLatest} />
                      </ChartWithYAxis>
                    : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}><p style={{ fontSize: 9, color: ptxt(0.25) }}>No data yet</p></div>}
                </div>

                {/* Date range */}
                {volBars60.bars.length >= 2 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 18px 0', flexShrink: 0 }}>
                    <span style={{ fontSize: 7.5, color: ptxt(0.35) }}>
                      {vol60XLeft || undefined}
                    </span>
                    <span style={{ fontSize: 7.5, color: gpAccent, fontWeight: 600 }}>
                      {vol60XRight || undefined}
                    </span>
                  </div>
                )}

                <p style={{ fontSize: 7.5, color: ptxt(0.28), padding: '7px 18px 14px', margin: 0, flexShrink: 0 }}>
                  Made with <span style={{ color: acRgba(gpAccent, 0.6), fontWeight: 700 }}>REPRA</span>
                </p>
              </div>
            )}

            {graphLayout === 'side' && (
              <div style={{
                aspectRatio: '9/16', width: '100%', position: 'relative',
                backgroundImage: 'repeating-conic-gradient(#c8c8c8 0% 25%, #f0f0f0 0% 50%)',
                backgroundSize: '14px 14px',
              }}>
                {sidePreviewSrc
                  ? <img src={sidePreviewSrc} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
                  : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <p style={{ margin: 0, fontSize: 9, color: 'rgba(100,100,100,0.5)' }}>Generating…</p>
                    </div>
                }
              </div>
            )}

            {graphLayout === 'mini' && (
              <div style={{ width: '72%', margin: '0 auto' }}>
                <div ref={miniVolRef} style={{
                  aspectRatio: '1/1', ...cardBgProps, borderRadius: 20,
                  position: 'relative', isolation: 'isolate', overflow: 'hidden', padding: 16, display: 'flex', flexDirection: 'column',
                  boxShadow: cardBoxShadow, border: isTransparentCard ? 'none' : `1px solid ${gp.border}`, textShadow: textShadowVal,
                }}>
                  {gpBadge}
                  <p style={{ fontSize: 7.5, fontWeight: 700, color: gpAccent, letterSpacing: '0.08em', margin: '5px 0 0' }}>{cl('DAILY VOLUME', '総重量')}</p>
                  <p style={{ fontSize: 11, fontWeight: 900, color: textPrimary, margin: '2px 0 0', lineHeight: 1.1 }}>{volCardLabel}</p>
                  <div style={{ flex: 1, minHeight: 0, margin: '6px 0' }}>
                    <ChartWithYAxis ticks={vol14Ticks} pyOf={vol14PyOf} gridColor={gridColor} labelColor={gridLabelColor}
                      formatLabel={volFmtAxis}
                      xLeft={vol14XLeft || undefined} xRight={vol14XRight || undefined}
                      xLeftColor={ptxt(0.38)} xRightColor={ptxt(0.55)}>
                      <VolBarSVG bars={volBars14.bars} accentHex={gpAccent} latestHex={gpLatest} />
                    </ChartWithYAxis>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
                      <span style={{ fontSize: 28, fontWeight: 900, color: gpAccent, lineHeight: 1 }}>{activeVolTotalStr}</span>
                    </div>
                    <p style={{ fontSize: 9, color: ptxt(0.45), margin: '2px 0 0' }}>{activeVolSessionCount} {cl('sessions', 'セッション')}</p>
                    {activeVolGrowthStr && (
                      <p style={{ fontSize: 8.5, fontWeight: 700, color: '#4ade80', margin: '1px 0 0' }}>
                        {activeVolGrowthStr} {cl('GAIN', '成長')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {graphLayout === 'wide' && (
              <div ref={wideVolRef} style={{
                width: '100%', aspectRatio: '16/9', ...cardBgProps, borderRadius: 18,
                position: 'relative', isolation: 'isolate', overflow: 'hidden', display: 'flex', boxShadow: cardBoxShadow,
                border: isTransparentCard ? 'none' : `1px solid ${gp.border}`, textShadow: textShadowVal,
              }}>
                {/* Left info */}
                <div style={{ width: '34%', padding: '14px 10px 14px 16px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                  {gpBadge}
                  <p style={{ fontSize: 8, fontWeight: 700, color: gpAccent, letterSpacing: '0.08em', margin: '6px 0 0' }}>{cl('DAILY VOLUME', '総重量')}</p>
                  <p style={{ fontSize: 12, fontWeight: 900, color: textPrimary, margin: '2px 0 0', lineHeight: 1.1 }}>{volCardLabel}</p>
                  <div style={{ height: 1, background: acRgba(gpAccent, 0.25), margin: '7px 0' }} />
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, marginBottom: 3 }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: gpAccent, lineHeight: 1 }}>{activeVolTotalStr}</span>
                  </div>
                  <p style={{ fontSize: 8, color: ptxt(0.45), margin: '0 0 2px' }}>{cl('total', '合計')}</p>
                  {volBestStr && <p style={{ fontSize: 8.5, color: ptxt(0.50), margin: 0 }}>{cl('Best:', 'ベスト:')} <span style={{ color: gpAccent, fontWeight: 700 }}>{volBestStr}</span></p>}
                  <p style={{ fontSize: 8, color: ptxt(0.35), margin: '3px 0 0' }}>{activeVolSessionCount} {cl('sessions', 'セッション')}</p>
                  {activeVolGrowthStr && (
                    <p style={{ fontSize: 8.5, fontWeight: 700, color: '#4ade80', margin: '3px 0 0' }}>
                      {activeVolGrowthStr} {cl('GAIN', '成長')}
                    </p>
                  )}
                  <div style={{ flex: 1 }} />
                  <p style={{ fontSize: 7, color: ptxt(0.30), margin: 0 }}>Made with REPRA</p>
                </div>
                {/* Right chart */}
                <div style={{ flex: 1, minWidth: 0, padding: '14px 14px 14px 0' }}>
                  <ChartWithYAxis ticks={vol40Ticks} pyOf={vol40PyOf} gridColor={gridColor} labelColor={gridLabelColor}
                    formatLabel={volFmtAxis}
                    xLeft={vol40XLeft || undefined} xRight={vol40XRight || undefined}
                    xLeftColor={ptxt(0.38)} xRightColor={ptxt(0.55)}>
                    <VolBarSVG bars={volBars40.bars} accentHex={gpAccent} latestHex={gpLatest} />
                  </ChartWithYAxis>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mb-3" />

      {/* ⑦ SAVE BUTTON ──────────────────────────────────────── */}
      <div className="px-4 space-y-2 mb-6">
        {status && <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>{status}</p>}
        <button
          className="w-full py-4 rounded-2xl text-base font-black text-white flex items-center justify-center gap-2"
          style={{ background: '#ED742F', boxShadow: '0 4px 20px rgba(237, 116, 47,0.3)' }}
          disabled={sharing} onClick={handleShare}>
          <Share2 size={20} />
          {sharing
            ? (ja ? '画像を作成中...' : 'Creating image...')
            : isMax1RM
              ? ((graphLayout === 'full' || graphLayout === 'side') ? (ja ? 'グラフStoryを保存' : 'Save Graph Story') : (ja ? 'グラフカードを保存' : 'Save Graph Card'))
              : isBW
                ? ((graphLayout === 'full' || graphLayout === 'side') ? (ja ? '体重グラフStoryを保存' : 'Save Weight Graph Story') : (ja ? '体重グラフカードを保存' : 'Save Weight Graph Card'))
                : ((graphLayout === 'full' || graphLayout === 'side') ? (ja ? '総重量グラフStoryを保存' : 'Save Volume Graph Story') : (ja ? '総重量グラフカードを保存' : 'Save Volume Graph Card'))
          }
        </button>
        <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          {ja ? 'モバイルでは共有、PCではPNG保存' : 'Mobile only · Desktop downloads as PNG'}
        </p>
      </div>
      <div style={{ height: 'calc(2rem + env(safe-area-inset-bottom))', flexShrink: 0 }} />
    </div>
  )
}
