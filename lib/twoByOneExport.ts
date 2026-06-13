/**
 * Direct canvas 2D export for 2:1 banner graph cards.
 *
 * Output: 1920×960 RGBA PNG (logical 960×480, 2× physical scale).
 * Canvas starts transparent, glass fills use real alpha, rounded-rect clip
 * ensures corner pixels are never written.
 * Export via toDataURL+fetch — same path as html-to-image — to guarantee
 * RGBA colorType=6 PNG on iOS WebKit (toBlob may produce RGB colorType=2).
 *
 * Only called when graphLayout === 'banner'.  All other layouts keep captureElement.
 */

type VolBar = { label: string; value: number; isLatest: boolean; isBest: boolean }

export type TwoByOneArgs = {
  metric:           'max1rm' | 'bodyweight' | 'volume'
  cardStyle:        'glass'  | 'transparent'
  graphAccentHex:   string
  graphLatestHex:   string
  areaFill:         string
  isDarkBg:         boolean
  glassAccentHex:   string
  glassIsDark:      boolean
  gpBorder:         string
  badgeBg:          string
  badgeTxt:         string
  cardLang:         'en' | 'ja'

  exName?:           string
  bestRMDisplay?:    number
  unitLabel?:        string
  rm1Growth?:        number | null
  rm1SVGData?:       { est1rm: number }[]

  bwCurrentDisplay?: number
  bwStartDisplay?:   number
  bwChangeStr?:      string
  bwValues?:         number[]
  bwHistoryLen?:     number

  volCardLabel?:          string
  activeVolTotalStr?:     string
  activeVolSessionCount?: number
  volBars?:               VolBar[]

  xStartDate?: string
  xEndDate?:   string
  unit?:       'kg' | 'lbs'
}

// ── Canvas dimensions ────────────────────────────────────────────────────────
const CW = 960
const CH = 480
const CY = 240
const RX = 40

// ── Column layout ─────────────────────────────────────────────────────────────
const PAD_H  = 44
const LEFT_X = PAD_H        // 44
const LEFT_W = 240
const GAP_L  = 20
const CTR_X  = LEFT_X + LEFT_W + GAP_L  // 304
const CTR_W  = 420
const RIGHT_X = CW - PAD_H  // 916

// ── Helpers ───────────────────────────────────────────────────────────────────

function rrPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y,     x + w, y + r,     r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x,     y + h, x,     y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x,     y,     x + r, y,         r)
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

function lineChartGeom(args: TwoByOneArgs) {
  const values = args.metric === 'max1rm'
    ? (args.rm1SVGData ?? []).map(d => d.est1rm)
    : (args.bwValues ?? [])
  const chartH = Math.round(CH * 0.67)
  const y0     = CY - Math.round(chartH / 2)
  const padYt  = 14, padYb = 8
  const max    = values.length ? Math.max(...values) : 0
  const min    = values.length ? Math.min(...values) : 0
  const rng    = max - min || max * 0.1 || 1
  const py     = (v: number) => y0 + padYt + ((max - v) / rng) * (chartH - padYt - padYb)
  const ticks  = values.length >= 2 ? niceYTicks(min, max, 3) : []
  return { values, chartH, y0, yBot: y0 + chartH, py, ticks }
}

function barChartGeom(args: TwoByOneArgs) {
  const bars   = args.volBars ?? []
  const chartH = Math.round(CH * 0.70)
  const yBot   = CY + Math.round(chartH / 2)
  const maxVal = bars.length ? Math.max(...bars.map(b => b.value)) : 0
  const py     = (v: number) => maxVal > 0 ? yBot - (v / maxVal) * chartH * 0.92 : yBot
  const ticks  = bars.length >= 2 && maxVal > 0 ? niceYTicks(0, maxVal, 3).filter(t => t > 0) : []
  return { bars, chartH, yBot, y0: yBot - chartH, py, ticks, maxVal }
}

function drawLineGridLines(ctx: CanvasRenderingContext2D, args: TwoByOneArgs) {
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

function drawLineAxes(ctx: CanvasRenderingContext2D, args: TwoByOneArgs) {
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

function drawBarGridLines(ctx: CanvasRenderingContext2D, args: TwoByOneArgs) {
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

function drawBarAxes(ctx: CanvasRenderingContext2D, args: TwoByOneArgs) {
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

function drawGlass(ctx: CanvasRenderingContext2D, args: TwoByOneArgs) {
  const hex    = args.glassAccentHex
  const isDark = args.glassIsDark
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  const baseGrad = ctx.createLinearGradient(CW * 0.28, 0, CW * 0.72, CH)
  if (!isDark) {
    baseGrad.addColorStop(0, 'rgba(245,244,239,0.68)')
    baseGrad.addColorStop(1, 'rgba(237,236,229,0.68)')
  } else if (r > 200 && g > 200 && b > 200) {
    baseGrad.addColorStop(0, 'rgba(17,17,20,0.62)')
    baseGrad.addColorStop(1, 'rgba(7,7,9,0.62)')
  } else {
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

  const topGrad = ctx.createLinearGradient(0, 0, 0, CH * 0.10)
  topGrad.addColorStop(0, 'rgba(255,255,255,0.10)')
  topGrad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = topGrad
  ctx.fillRect(0, 0, CW, CH * 0.10)

  const acGlow = ctx.createRadialGradient(CW * 0.12, CH, 0, CW * 0.12, CH, CW * 0.38)
  acGlow.addColorStop(0, `rgba(${r},${g},${b},0.16)`)
  acGlow.addColorStop(1, `rgba(${r},${g},${b},0)`)
  ctx.fillStyle = acGlow
  ctx.fillRect(0, 0, CW, CH)

  const wGlow = ctx.createRadialGradient(CW * 0.88, 0, 0, CW * 0.88, 0, CW * 0.27)
  wGlow.addColorStop(0, 'rgba(255,255,255,0.13)')
  wGlow.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = wGlow
  ctx.fillRect(0, 0, CW, CH)
}

// ── REPRA badge ───────────────────────────────────────────────────────────────

function drawBadge(ctx: CanvasRenderingContext2D, args: TwoByOneArgs, y: number) {
  const bx = LEFT_X
  const bw = 114, bh = 32, bR = 14
  rrPath(ctx, bx, y, bw, bh, bR)
  ctx.fillStyle = args.badgeBg
  ctx.fill()
  ctx.font      = fnt(22, true)
  ctx.fillStyle = args.badgeTxt
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('REPRA', bx + 18, y + 23)
}

// ── Line chart (MAX 1RM + Body Weight) ───────────────────────────────────────

function drawLine(ctx: CanvasRenderingContext2D, args: TwoByOneArgs) {
  const values = args.metric === 'max1rm'
    ? (args.rm1SVGData ?? []).map(d => d.est1rm)
    : (args.bwValues ?? [])
  if (values.length < 2) return

  const chartH = Math.round(CH * 0.67)
  const y0     = CY - Math.round(chartH / 2)
  const yBot   = y0 + chartH
  const padX   = 12, padYt = 14, padYb = 8

  const max = Math.max(...values)
  const min = Math.min(...values)
  const rng = max - min || max * 0.1 || 1

  const px = (i: number) =>
    CTR_X + padX + (i / (values.length - 1)) * (CTR_W - 2 * padX)
  const py = (v: number) =>
    y0 + padYt + ((max - v) / rng) * (chartH - padYt - padYb)

  const pts = values.map((v, i) => [px(i), py(v)] as [number, number])
  const [fx, fy] = pts[0]!
  const [lx, ly] = pts[pts.length - 1]!

  if (args.areaFill && args.areaFill !== 'none') {
    ctx.beginPath()
    ctx.moveTo(pts[0]![0], yBot)
    pts.forEach(([x, y]) => ctx.lineTo(x, y))
    ctx.lineTo(pts[pts.length - 1]![0], yBot)
    ctx.closePath()
    ctx.fillStyle = args.areaFill
    ctx.fill()
  }

  ctx.beginPath()
  ctx.moveTo(pts[0]![0], pts[0]![1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1])
  ctx.strokeStyle = args.graphAccentHex
  ctx.lineWidth   = 2.5
  ctx.lineJoin    = 'miter'
  ctx.lineCap     = 'butt'
  ctx.stroke()

  const fdot = args.isDarkBg ? 'rgba(255,255,255,0.30)' : 'rgba(17,24,39,0.30)'
  ctx.beginPath(); ctx.arc(fx, fy, 2.8, 0, Math.PI * 2)
  ctx.fillStyle = fdot; ctx.fill()

  ctx.fillStyle = args.graphLatestHex
  ctx.globalAlpha = 0.08; ctx.beginPath(); ctx.arc(lx, ly, 9.7, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 0.28; ctx.beginPath(); ctx.arc(lx, ly, 5.5, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 1.00; ctx.beginPath(); ctx.arc(lx, ly, 3.9, 0, Math.PI * 2); ctx.fill()
}

// ── Bar chart (Daily Volume) ──────────────────────────────────────────────────

function drawBars(ctx: CanvasRenderingContext2D, args: TwoByOneArgs) {
  const bars = args.volBars ?? []
  if (!bars.length) return
  const maxVal = Math.max(...bars.map(b => b.value))
  if (maxVal === 0) return

  const chartH = Math.round(CH * 0.70)
  const yBot   = CY + Math.round(chartH / 2)
  const gap    = Math.max(0.4, 0.8 - bars.length * 0.005) * (CTR_W / 100)
  const slotW  = CTR_W / bars.length
  const barW   = Math.max(slotW - gap, 0.5)
  const rad    = Math.min(4, barW / 3)

  bars.forEach((bar, i) => {
    const bh     = Math.max((bar.value / maxVal) * chartH * 0.92, 1.7)
    const bx     = CTR_X + i * slotW + (slotW - barW) / 2
    const by     = yBot - bh
    const fill   = (bar.isLatest || bar.isBest) ? args.graphLatestHex : args.graphAccentHex
    ctx.globalAlpha = bar.isLatest ? 1 : bar.isBest ? 0.82 : 0.38
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

function drawLeft1RM(ctx: CanvasRenderingContext2D, args: TwoByOneArgs) {
  drawBadge(ctx, args, 120)
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'alphabetic'

  ctx.font      = fnt(36, true)
  ctx.fillStyle = primaryText(args.isDarkBg)
  ctx.fillText(args.exName ?? '', LEFT_X, 222)

  ctx.font      = fnt(22, true)
  ctx.fillStyle = args.graphAccentHex
  ctx.fillText(
    args.cardLang === 'ja' ? '1RM推移' : '1RM PROGRESS',
    LEFT_X, 274,
  )
}

function drawLeftBW(ctx: CanvasRenderingContext2D, args: TwoByOneArgs) {
  drawBadge(ctx, args, 130)
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'alphabetic'

  ctx.font      = fnt(24, true)
  ctx.fillStyle = args.graphAccentHex
  ctx.fillText(
    args.cardLang === 'ja' ? '体重' : 'BODY WEIGHT',
    LEFT_X, 230,
  )

  const hasBoth = (args.bwHistoryLen ?? 0) >= 2
  const valLine = hasBoth
    ? `${args.bwStartDisplay ?? ''} → ${args.bwCurrentDisplay ?? ''} ${args.unitLabel ?? ''}`
    : `${args.bwCurrentDisplay ?? ''} ${args.unitLabel ?? ''}`
  ctx.font      = fnt(30, true)
  ctx.fillStyle = primaryText(args.isDarkBg)
  ctx.fillText(valLine, LEFT_X, 274)
}

function drawLeftVol(ctx: CanvasRenderingContext2D, args: TwoByOneArgs) {
  drawBadge(ctx, args, 130)
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'alphabetic'

  ctx.font      = fnt(24, true)
  ctx.fillStyle = args.graphAccentHex
  ctx.fillText(
    args.cardLang === 'ja' ? '総重量' : 'DAILY VOLUME',
    LEFT_X, 230,
  )

  ctx.font      = fnt(36, true)
  ctx.fillStyle = primaryText(args.isDarkBg)
  ctx.fillText(args.volCardLabel ?? '', LEFT_X, 282)
}

// ── Right column ──────────────────────────────────────────────────────────────

function drawRight1RM(ctx: CanvasRenderingContext2D, args: TwoByOneArgs) {
  ctx.textAlign    = 'right'
  ctx.textBaseline = 'alphabetic'

  ctx.font      = fnt(90, true)
  ctx.fillStyle = args.graphAccentHex
  ctx.fillText(String(args.bestRMDisplay ?? ''), RIGHT_X, 254)

  ctx.font      = fnt(26, false)
  ctx.fillStyle = ptxt(args.isDarkBg, 0.50)
  ctx.fillText(
    `${args.unitLabel ?? ''} ${args.cardLang === 'ja' ? 'ベスト' : 'best'}`,
    RIGHT_X, 288,
  )

  const growth = args.rm1Growth
  if (growth !== null && growth !== undefined) {
    ctx.font      = fnt(30, true)
    ctx.fillStyle = growth >= 0 ? '#4ade80' : '#f87171'
    ctx.fillText(`${growth >= 0 ? '+' : ''}${growth}`, RIGHT_X, 324)
  }
}

function drawRightBW(ctx: CanvasRenderingContext2D, args: TwoByOneArgs) {
  ctx.textAlign    = 'right'
  ctx.textBaseline = 'alphabetic'

  ctx.font      = fnt(90, true)
  ctx.fillStyle = args.graphAccentHex
  ctx.fillText(String(args.bwCurrentDisplay ?? ''), RIGHT_X, 254)

  ctx.font      = fnt(26, false)
  ctx.fillStyle = ptxt(args.isDarkBg, 0.50)
  ctx.fillText(args.unitLabel ?? '', RIGHT_X, 288)

  ctx.font      = fnt(30, true)
  ctx.fillStyle = args.graphAccentHex
  ctx.fillText(
    `${args.bwChangeStr ?? ''}${args.unitLabel ?? ''}`,
    RIGHT_X, 324,
  )
}

function drawRightVol(ctx: CanvasRenderingContext2D, args: TwoByOneArgs) {
  ctx.textAlign    = 'right'
  ctx.textBaseline = 'alphabetic'
  const sessLabel  = args.cardLang === 'ja' ? 'セッション' : 'sessions'

  ctx.font      = fnt(68, true)
  ctx.fillStyle = args.graphAccentHex
  ctx.fillText(args.activeVolTotalStr ?? '', RIGHT_X, 246)

  ctx.font      = fnt(24, false)
  ctx.fillStyle = ptxt(args.isDarkBg, 0.45)
  ctx.fillText(args.cardLang === 'ja' ? '合計' : 'total', RIGHT_X, 278)

  ctx.font      = fnt(26, false)
  ctx.fillStyle = ptxt(args.isDarkBg, 0.35)
  ctx.fillText(
    `${args.activeVolSessionCount ?? 0} ${sessLabel}`,
    RIGHT_X, 310,
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function exportTwoByOneCard(args: TwoByOneArgs): Promise<Blob> {
  await document.fonts.ready
  await new Promise<void>(r => requestAnimationFrame(() => r()))

  const canvas    = document.createElement('canvas')
  canvas.width    = CW * 2  // 1920px
  canvas.height   = CH * 2  // 960px
  const ctx       = canvas.getContext('2d', { alpha: true })
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.scale(2, 2)

  rrPath(ctx, 0, 0, CW, CH, RX)
  ctx.clip()

  if (args.cardStyle !== 'glass') {
    ctx.clearRect(0, 0, CW, CH)
  }

  if (args.cardStyle === 'glass') {
    drawGlass(ctx, args)
    rrPath(ctx, 0, 0, CW, CH, RX)
    ctx.strokeStyle = args.gpBorder
    ctx.lineWidth   = 4
    ctx.stroke()
  }

  if (args.metric === 'max1rm')          drawLeft1RM(ctx, args)
  else if (args.metric === 'bodyweight') drawLeftBW(ctx, args)
  else                                   drawLeftVol(ctx, args)

  if (args.metric === 'volume') drawBarGridLines(ctx, args)
  else                          drawLineGridLines(ctx, args)

  if (args.metric === 'volume') drawBars(ctx, args)
  else                          drawLine(ctx, args)

  if (args.metric === 'volume') drawBarAxes(ctx, args)
  else                          drawLineAxes(ctx, args)

  if (args.metric === 'max1rm')          drawRight1RM(ctx, args)
  else if (args.metric === 'bodyweight') drawRightBW(ctx, args)
  else                                   drawRightVol(ctx, args)

  const dataUrl = canvas.toDataURL('image/png')
  const blob    = await fetch(dataUrl).then(r => r.blob())
  return blob
}
