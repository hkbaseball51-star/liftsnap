/**
 * Direct canvas 2D export for 4:1 (bottom) graph story cards.
 *
 * Draws everything via canvas 2D API — no html-to-image, no SVG-as-image.
 * SVG images loaded via Blob URL render with a white background in WebKit,
 * making glass cards opaque and transparent cards white.  Canvas 2D avoids
 * this: the canvas starts transparent, glass fills use real alpha, and the
 * clip path enforces rounded corners so pixels outside are never written.
 *
 * Only called when graphLayout === 'bottom'.  All other layouts keep captureElement.
 */

type VolBar = { label: string; value: number; isLatest: boolean; isBest: boolean }

export type FourByOneArgs = {
  metric:           'max1rm' | 'bodyweight' | 'volume'
  cardStyle:        'glass'  | 'transparent'
  graphAccentHex:   string   // gpAccent — text / graph stroke color
  graphLatestHex:   string   // gpLatest — last-point dot color
  areaFill:         string   // area fill under line ('none' in transparent)
  isDarkBg:         boolean
  glassAccentHex:   string   // gp.accentHex — 6-char hex for glass gradient
  glassIsDark:      boolean  // gp.isDark !== false
  gpBorder:         string   // gp.border
  badgeBg:          string   // gpBadgeBg
  badgeTxt:         string   // gpBadgeTxt
  cardLang:         'en' | 'ja'

  // MAX 1RM
  exName?:          string
  bestRMDisplay?:   number
  unitLabel?:       string
  rm1Growth?:       number | null
  rm1SVGData?:      { est1rm: number }[]

  // Body Weight
  bwCurrentDisplay?: number
  bwStartDisplay?:   number
  bwChangeStr?:      string
  bwValues?:         number[]
  bwHistoryLen?:     number

  // Volume
  volCardLabel?:          string
  activeVolTotalStr?:     string
  activeVolSessionCount?: number
  volBars?:               VolBar[]

  // Axis / resolution extras
  xStartDate?: string
  xEndDate?:   string
  unit?:       'kg' | 'lbs'
}

// ── Canvas dimensions ────────────────────────────────────────────────────────
const CW  = 1080
const CH  = 270
const CY  = 135  // vertical center
const RX  = 50   // card corner radius (borderRadius:18px CSS × 2.77 ≈ 50)

// ── Column layout (horizontal) ────────────────────────────────────────────────
// Left: REPRA badge + metric label + key text
// Center: chart
// Right: main stat, secondary label, change indicator
const PAD_H  = 44     // 16px CSS × 2.77
const LEFT_X = PAD_H  // 44
const LEFT_W = 270    // left column width
const GAP_L  = 38     // 14px × 2.77
const CTR_X  = LEFT_X + LEFT_W + GAP_L   // 352
const CTR_W  = 406    // chart width; right edge at x=758
const GAP_R  = 42     // gap between chart and right column
//  Right col area: x=800..1036 (236px)
const RIGHT_X = CW - PAD_H  // 1036 — text anchor for right-aligned values

// ── Helpers ───────────────────────────────────────────────────────────────────

function rrPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y,   x + w, y + r,     r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x,   y + h, x,   y + h - r,   r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x,   y,   x + r, y,           r)
  ctx.closePath()
}

const FF = 'system-ui, -apple-system, sans-serif'

function fnt(size: number, bold: boolean): string {
  return `${bold ? 'bold ' : ''}${size}px ${FF}`
}

function ptxt(isDarkBg: boolean, a: number): string {
  return isDarkBg ? `rgba(255,255,255,${a})` : `rgba(17,24,39,${a})`
}

function primaryText(isDarkBg: boolean): string {
  return isDarkBg ? '#ffffff' : '#111827'
}

// ── Y-axis / grid helpers ─────────────────────────────────────────────────────

function niceYTicks(min: number, max: number, count = 3): number[] {
  if (max <= min) return [min]
  const range = max - min
  const raw   = range / Math.max(count - 1, 1)
  const mag   = Math.pow(10, Math.floor(Math.log10(raw)))
  const step  = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) ?? mag * 10
  const lo    = Math.ceil(min / step) * step
  const ticks: number[] = []
  for (let t = lo; t <= max * 1.001; t += step) {
    ticks.push(Math.round(t * 1e9) / 1e9)
    if (ticks.length >= count + 2) break
  }
  return ticks.filter(t => t >= min * 0.999 && t <= max * 1.001)
}

function toDisplay(v: number, unit: string | undefined): number {
  return unit === 'lbs' ? v * 2.20462 : v
}

function lineChartGeom(args: FourByOneArgs) {
  const values = args.metric === 'max1rm'
    ? (args.rm1SVGData ?? []).map(d => d.est1rm)
    : (args.bwValues ?? [])
  const chartH = Math.round(CH * 0.62)
  const y0     = CY - Math.round(chartH / 2)
  const padYt  = 14, padYb = 8
  const max    = values.length ? Math.max(...values) : 0
  const min    = values.length ? Math.min(...values) : 0
  const rng    = max - min || max * 0.1 || 1
  const py     = (v: number) => y0 + padYt + ((max - v) / rng) * (chartH - padYt - padYb)
  const ticks  = values.length >= 2 ? niceYTicks(min, max, 3) : []
  return { values, chartH, y0, yBot: y0 + chartH, py, ticks }
}

function barChartGeom(args: FourByOneArgs) {
  const bars   = args.volBars ?? []
  const chartH = Math.round(CH * 0.65)
  const yBot   = CY + Math.round(chartH / 2)
  const maxVal = bars.length ? Math.max(...bars.map(b => b.value)) : 0
  const py     = (v: number) => maxVal > 0 ? yBot - (v / maxVal) * chartH * 0.92 : yBot
  const ticks  = bars.length >= 2 && maxVal > 0 ? niceYTicks(0, maxVal, 3).filter(t => t > 0) : []
  return { bars, chartH, yBot, y0: yBot - chartH, py, ticks, maxVal }
}

function drawLineGridLines(ctx: CanvasRenderingContext2D, args: FourByOneArgs) {
  const { values, y0, yBot, py, ticks } = lineChartGeom(args)
  if (values.length < 2 || !ticks.length) return
  const gridColor = args.isDarkBg ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.10)'
  ctx.save()
  ctx.setLineDash([5, 8])
  ctx.strokeStyle = gridColor
  ctx.lineWidth   = 1.2
  ticks.forEach(tick => {
    const ty = py(tick)
    if (ty < y0 || ty > yBot) return
    ctx.beginPath()
    ctx.moveTo(CTR_X, ty); ctx.lineTo(CTR_X + CTR_W, ty)
    ctx.stroke()
  })
  ctx.restore()
}

function drawLineAxes(ctx: CanvasRenderingContext2D, args: FourByOneArgs) {
  const { values, y0, yBot, py, ticks } = lineChartGeom(args)
  if (values.length < 2) return
  const lblColor  = args.isDarkBg ? 'rgba(255,255,255,0.45)' : 'rgba(15,23,42,0.40)'
  const dateColor = args.isDarkBg ? 'rgba(255,255,255,0.38)' : 'rgba(15,23,42,0.32)'
  const unit      = args.unitLabel ?? ''
  ctx.font         = fnt(13, false)
  ctx.fillStyle    = lblColor
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'bottom'
  ticks.forEach(tick => {
    const ty = py(tick)
    if (ty < y0 || ty > yBot) return
    ctx.fillText(`${Math.round(tick * 10) / 10}${unit}`, CTR_X + 4, ty - 2)
  })
  if (args.xStartDate || args.xEndDate) {
    ctx.font         = fnt(13, false)
    ctx.fillStyle    = dateColor
    ctx.textBaseline = 'top'
    if (args.xStartDate) { ctx.textAlign = 'left';  ctx.fillText(args.xStartDate, CTR_X + 4, yBot + 4) }
    if (args.xEndDate)   { ctx.textAlign = 'right'; ctx.fillText(args.xEndDate,   CTR_X + CTR_W - 4, yBot + 4) }
  }
}

function drawBarGridLines(ctx: CanvasRenderingContext2D, args: FourByOneArgs) {
  const { bars, py, ticks, maxVal } = barChartGeom(args)
  if (!bars.length || !maxVal || !ticks.length) return
  const gridColor = args.isDarkBg ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.10)'
  ctx.save()
  ctx.setLineDash([5, 8])
  ctx.strokeStyle = gridColor
  ctx.lineWidth   = 1.2
  ticks.forEach(tick => {
    const ty = py(tick)
    ctx.beginPath()
    ctx.moveTo(CTR_X, ty); ctx.lineTo(CTR_X + CTR_W, ty)
    ctx.stroke()
  })
  ctx.restore()
}

function drawBarAxes(ctx: CanvasRenderingContext2D, args: FourByOneArgs) {
  const { bars, yBot, py, ticks, maxVal } = barChartGeom(args)
  if (!bars.length || !maxVal) return
  const lblColor  = args.isDarkBg ? 'rgba(255,255,255,0.45)' : 'rgba(15,23,42,0.40)'
  const dateColor = args.isDarkBg ? 'rgba(255,255,255,0.38)' : 'rgba(15,23,42,0.32)'
  const unit      = args.unitLabel ?? ''
  ctx.font         = fnt(13, false)
  ctx.fillStyle    = lblColor
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'bottom'
  ticks.forEach(tick => {
    const dv = toDisplay(tick, args.unit)
    let label: string
    if (dv >= 10000)     label = `${Math.round(dv / 1000)}k`
    else if (dv >= 1000) label = `${(dv / 1000).toFixed(1)}k`
    else                 label = `${Math.round(dv)}${unit}`
    ctx.fillText(label, CTR_X + 4, py(tick) - 2)
  })
  if (args.xStartDate || args.xEndDate) {
    ctx.font         = fnt(13, false)
    ctx.fillStyle    = dateColor
    ctx.textBaseline = 'top'
    if (args.xStartDate) { ctx.textAlign = 'left';  ctx.fillText(args.xStartDate, CTR_X + 4, yBot + 4) }
    if (args.xEndDate)   { ctx.textAlign = 'right'; ctx.fillText(args.xEndDate,   CTR_X + CTR_W - 4, yBot + 4) }
  }
}

// ── Glass background ──────────────────────────────────────────────────────────
// Replicates glassCardStyle() from WorkoutStoryCardContent using canvas gradients.
// All fills use alpha < 1 so the PNG retains transparency behind the card.

function drawGlass(ctx: CanvasRenderingContext2D, args: FourByOneArgs) {
  const hex    = args.glassAccentHex
  const isDark = args.glassIsDark
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  // Layer 1: base gradient (CSS linear-gradient 150deg — upper-left → lower-right diagonal)
  const baseGrad = ctx.createLinearGradient(CW * 0.28, 0, CW * 0.72, CH)
  if (!isDark) {
    // pearl-white: warm frosted glass
    baseGrad.addColorStop(0, 'rgba(245,244,239,0.68)')
    baseGrad.addColorStop(1, 'rgba(237,236,229,0.68)')
  } else if (r > 200 && g > 200 && b > 200) {
    // premium-black: near-black glass
    baseGrad.addColorStop(0, 'rgba(17,17,20,0.62)')
    baseGrad.addColorStop(1, 'rgba(7,7,9,0.62)')
  } else {
    // colored dark presets (orange, ice-blue, violet, mint)
    const dr = Math.round(r * 0.16)
    const dg = Math.round(g * 0.13)
    const db = Math.round(b * 0.15)
    const er = Math.round(r * 0.09)
    const eg = Math.round(g * 0.07)
    const eb = Math.round(b * 0.09)
    baseGrad.addColorStop(0, `rgba(${dr},${dg},${db},0.62)`)
    baseGrad.addColorStop(1, `rgba(${er},${eg},${eb},0.62)`)
  }
  ctx.fillStyle = baseGrad
  ctx.fillRect(0, 0, CW, CH)

  // Layer 2: top-edge white shimmer
  const topGrad = ctx.createLinearGradient(0, 0, 0, CH * 0.10)
  topGrad.addColorStop(0, 'rgba(255,255,255,0.10)')
  topGrad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = topGrad
  ctx.fillRect(0, 0, CW, CH * 0.10)

  // Layer 3: accent radial glow at bottom-left
  const acGlow = ctx.createRadialGradient(CW * 0.12, CH, 0, CW * 0.12, CH, CW * 0.38)
  acGlow.addColorStop(0, `rgba(${r},${g},${b},0.16)`)
  acGlow.addColorStop(1, `rgba(${r},${g},${b},0)`)
  ctx.fillStyle = acGlow
  ctx.fillRect(0, 0, CW, CH)

  // Layer 4: white radial glow at top-right
  const wGlow = ctx.createRadialGradient(CW * 0.88, 0, 0, CW * 0.88, 0, CW * 0.27)
  wGlow.addColorStop(0, 'rgba(255,255,255,0.13)')
  wGlow.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = wGlow
  ctx.fillRect(0, 0, CW, CH)
}

// ── REPRA badge ───────────────────────────────────────────────────────────────

function drawBadge(ctx: CanvasRenderingContext2D, args: FourByOneArgs, y: number) {
  const bx = LEFT_X
  const bw = 114, bh = 32, bR = 14
  rrPath(ctx, bx, y, bw, bh, bR)
  ctx.fillStyle = args.badgeBg
  ctx.fill()
  ctx.font = fnt(22, true)
  ctx.fillStyle = args.badgeTxt
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('REPRA', bx + 18, y + 23)
}

// ── Line chart (MAX 1RM + Body Weight) ───────────────────────────────────────

function drawLine(ctx: CanvasRenderingContext2D, args: FourByOneArgs) {
  const values = args.metric === 'max1rm'
    ? (args.rm1SVGData ?? []).map(d => d.est1rm)
    : (args.bwValues ?? [])
  if (values.length < 2) return

  const chartH = Math.round(CH * 0.62)  // 167px
  const y0     = CY - Math.round(chartH / 2)  // top of chart area
  const yBot   = y0 + chartH
  const padX   = 18, padYt = 14, padYb = 8

  const max = Math.max(...values)
  const min = Math.min(...values)
  const rng = max - min || max * 0.1 || 1

  const px = (i: number) =>
    CTR_X + padX + (i / (values.length - 1)) * (CTR_W - 2 * padX)
  const py = (v: number) =>
    y0 + padYt + ((max - v) / rng) * (chartH - padYt - padYb)

  const pts = values.map((v, i) => [px(i), py(v)] as [number, number])
  const [fx, fy] = pts[0]
  const [lx, ly] = pts[pts.length - 1]

  // Area fill
  if (args.areaFill && args.areaFill !== 'none') {
    ctx.beginPath()
    ctx.moveTo(pts[0][0], yBot)
    pts.forEach(([x, y]) => ctx.lineTo(x, y))
    ctx.lineTo(pts[pts.length - 1][0], yBot)
    ctx.closePath()
    ctx.fillStyle = args.areaFill
    ctx.fill()
  }

  // Line stroke
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  ctx.strokeStyle = args.graphAccentHex
  ctx.lineWidth   = 2.5
  ctx.lineJoin    = 'miter'
  ctx.lineCap     = 'butt'
  ctx.stroke()

  // First dot
  const fdot = args.isDarkBg ? 'rgba(255,255,255,0.30)' : 'rgba(17,24,39,0.30)'
  ctx.beginPath(); ctx.arc(fx, fy, 2.8, 0, Math.PI * 2)
  ctx.fillStyle = fdot; ctx.fill()

  // Last dot with glow rings
  ctx.fillStyle = args.graphLatestHex
  ctx.globalAlpha = 0.08; ctx.beginPath(); ctx.arc(lx, ly, 9.7, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 0.28; ctx.beginPath(); ctx.arc(lx, ly, 5.5, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 1.00; ctx.beginPath(); ctx.arc(lx, ly, 3.9, 0, Math.PI * 2); ctx.fill()
}

// ── Bar chart (Daily Volume) ──────────────────────────────────────────────────

function drawBars(ctx: CanvasRenderingContext2D, args: FourByOneArgs) {
  const bars = args.volBars ?? []
  if (!bars.length) return
  const maxVal = Math.max(...bars.map(b => b.value))
  if (maxVal === 0) return

  const chartH = Math.round(CH * 0.65)  // 175px
  const yBot   = CY + Math.round(chartH / 2)
  const gap    = Math.max(0.4, 0.8 - bars.length * 0.005) * (CTR_W / 100)
  const slotW  = CTR_W / bars.length
  const barW   = Math.max(slotW - gap, 0.5)
  const rad    = Math.min(4, barW / 3)

  bars.forEach((b, i) => {
    const bh     = Math.max((b.value / maxVal) * chartH * 0.92, 1.7)
    const bx     = CTR_X + i * slotW + (slotW - barW) / 2
    const by     = yBot - bh
    const fill   = (b.isLatest || b.isBest) ? args.graphLatestHex : args.graphAccentHex
    ctx.globalAlpha = b.isLatest ? 1 : b.isBest ? 0.82 : 0.38
    ctx.fillStyle   = fill
    ctx.beginPath()
    ctx.moveTo(bx + rad, by)
    ctx.lineTo(bx + barW - rad, by)
    ctx.arcTo(bx + barW, by,      bx + barW, by + rad, rad)
    ctx.lineTo(bx + barW, by + bh)
    ctx.lineTo(bx,        by + bh)
    ctx.lineTo(bx,        by + rad)
    ctx.arcTo(bx,         by,      bx + rad,  by,       rad)
    ctx.closePath()
    ctx.fill()
  })
  ctx.globalAlpha = 1
}

// ── Left column ───────────────────────────────────────────────────────────────

function drawLeft1RM(ctx: CanvasRenderingContext2D, args: FourByOneArgs) {
  drawBadge(ctx, args, 63)
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'alphabetic'

  // Exercise name
  ctx.font      = fnt(33, true)
  ctx.fillStyle = primaryText(args.isDarkBg)
  ctx.fillText(args.exName ?? '', LEFT_X, 147)

  // 1RM label
  ctx.font      = fnt(20, true)
  ctx.fillStyle = args.graphAccentHex
  ctx.fillText(
    args.cardLang === 'ja' ? '1RM推移' : '1RM PROGRESS',
    LEFT_X, 197,
  )
}

function drawLeftBW(ctx: CanvasRenderingContext2D, args: FourByOneArgs) {
  drawBadge(ctx, args, 78)
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'alphabetic'

  ctx.font      = fnt(22, true)
  ctx.fillStyle = args.graphAccentHex
  ctx.fillText(
    args.cardLang === 'ja' ? '体重' : 'BODY WEIGHT',
    LEFT_X, 152,
  )

  const hasBoth = (args.bwHistoryLen ?? 0) >= 2
  const valLine = hasBoth
    ? `${args.bwStartDisplay ?? ''} → ${args.bwCurrentDisplay ?? ''} ${args.unitLabel ?? ''}`
    : `${args.bwCurrentDisplay ?? ''} ${args.unitLabel ?? ''}`
  ctx.font      = fnt(28, true)
  ctx.fillStyle = primaryText(args.isDarkBg)
  ctx.fillText(valLine, LEFT_X, 191)
}

function drawLeftVol(ctx: CanvasRenderingContext2D, args: FourByOneArgs) {
  drawBadge(ctx, args, 75)
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'alphabetic'

  ctx.font      = fnt(22, true)
  ctx.fillStyle = args.graphAccentHex
  ctx.fillText(
    args.cardLang === 'ja' ? '総重量' : 'DAILY VOLUME',
    LEFT_X, 149,
  )

  ctx.font      = fnt(33, true)
  ctx.fillStyle = primaryText(args.isDarkBg)
  ctx.fillText(args.volCardLabel ?? '', LEFT_X, 196)
}

// ── Right column ──────────────────────────────────────────────────────────────

function drawRight1RM(ctx: CanvasRenderingContext2D, args: FourByOneArgs) {
  ctx.textAlign    = 'right'
  ctx.textBaseline = 'alphabetic'

  // Main value
  ctx.font      = fnt(83, true)
  ctx.fillStyle = args.graphAccentHex
  ctx.fillText(String(args.bestRMDisplay ?? ''), RIGHT_X, 138)

  // Unit + "best"
  ctx.font      = fnt(25, false)
  ctx.fillStyle = ptxt(args.isDarkBg, 0.50)
  ctx.fillText(
    `${args.unitLabel ?? ''} ${args.cardLang === 'ja' ? 'ベスト' : 'best'}`,
    RIGHT_X, 168,
  )

  // Growth indicator
  const growth = args.rm1Growth
  if (growth !== null && growth !== undefined) {
    ctx.font      = fnt(28, true)
    ctx.fillStyle = growth >= 0 ? '#4ade80' : '#f87171'
    ctx.fillText(`${growth >= 0 ? '+' : ''}${growth}`, RIGHT_X, 201)
  }
}

function drawRightBW(ctx: CanvasRenderingContext2D, args: FourByOneArgs) {
  ctx.textAlign    = 'right'
  ctx.textBaseline = 'alphabetic'

  ctx.font      = fnt(83, true)
  ctx.fillStyle = args.graphAccentHex
  ctx.fillText(String(args.bwCurrentDisplay ?? ''), RIGHT_X, 138)

  ctx.font      = fnt(25, false)
  ctx.fillStyle = ptxt(args.isDarkBg, 0.50)
  ctx.fillText(args.unitLabel ?? '', RIGHT_X, 168)

  ctx.font      = fnt(28, true)
  ctx.fillStyle = args.graphAccentHex
  ctx.fillText(
    `${args.bwChangeStr ?? ''}${args.unitLabel ?? ''}`,
    RIGHT_X, 201,
  )
}

function drawRightVol(ctx: CanvasRenderingContext2D, args: FourByOneArgs) {
  ctx.textAlign    = 'right'
  ctx.textBaseline = 'alphabetic'
  const sessLabel = args.cardLang === 'ja' ? 'セッション' : 'sessions'

  ctx.font      = fnt(61, true)
  ctx.fillStyle = args.graphAccentHex
  ctx.fillText(args.activeVolTotalStr ?? '', RIGHT_X, 128)

  ctx.font      = fnt(22, false)
  ctx.fillStyle = ptxt(args.isDarkBg, 0.45)
  ctx.fillText(args.cardLang === 'ja' ? '合計' : 'total', RIGHT_X, 158)

  ctx.font      = fnt(24, false)
  ctx.fillStyle = ptxt(args.isDarkBg, 0.35)
  ctx.fillText(
    `${args.activeVolSessionCount ?? 0} ${sessLabel}`,
    RIGHT_X, 187,
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function exportFourByOneCard(args: FourByOneArgs): Promise<Blob> {
  await document.fonts.ready
  await new Promise<void>(r => requestAnimationFrame(() => r()))

  const canvas    = document.createElement('canvas')
  canvas.width    = CW * 2  // 2160px — 2× logical size for sharper output
  canvas.height   = CH * 2  // 540px
  const ctx       = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  // All drawing uses the original 1080×270 coordinate system; the 2× scale
  // maps it to the 2160×540 canvas for sharper PNG output.
  ctx.scale(2, 2)

  // Clip to rounded rect — all drawing is confined inside the card corners.
  // Pixels outside the rounded rect are never written → PNG corners are transparent.
  rrPath(ctx, 0, 0, CW, CH, RX)
  ctx.clip()

  // Glass background: semi-transparent gradient layers keep alpha in the PNG.
  // Transparent mode: canvas starts transparent; nothing drawn for background.
  if (args.cardStyle === 'glass') {
    drawGlass(ctx, args)

    // Border: lineWidth 4 → 2px visible inside clip, matching the 1px CSS border at 2.77×
    rrPath(ctx, 0, 0, CW, CH, RX)
    ctx.strokeStyle = args.gpBorder
    ctx.lineWidth   = 4
    ctx.stroke()
  }

  // Left column (badge + labels)
  if (args.metric === 'max1rm')          drawLeft1RM(ctx, args)
  else if (args.metric === 'bodyweight') drawLeftBW(ctx, args)
  else                                   drawLeftVol(ctx, args)

  // Grid lines — drawn before chart so chart data renders on top
  if (args.metric === 'volume') drawBarGridLines(ctx, args)
  else                          drawLineGridLines(ctx, args)

  // Center chart
  if (args.metric === 'volume') drawBars(ctx, args)
  else                          drawLine(ctx, args)

  // Y-axis labels + X-axis dates — drawn after chart so labels sit on top
  if (args.metric === 'volume') drawBarAxes(ctx, args)
  else                          drawLineAxes(ctx, args)

  // Right column (main stat)
  if (args.metric === 'max1rm')          drawRight1RM(ctx, args)
  else if (args.metric === 'bodyweight') drawRightBW(ctx, args)
  else                                   drawRightVol(ctx, args)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('canvas.toBlob returned null'))),
      'image/png',
    )
  })
}
