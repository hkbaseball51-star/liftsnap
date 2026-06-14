/**
 * Direct canvas 2D export for Side Graph (左グラフ) cards.
 *
 * Output: 1080×1920 RGBA PNG (logical 540×960, 2× physical scale).
 * Left ~50% of canvas is the glass card; right 50% is fully transparent.
 *
 * Layout: vertical Story progress report.
 *   MAX 1RM / Body Weight: line chart (dates on Y, value on X)
 *   Daily Volume:          horizontal bar chart (60 bars, auto-thinned labels)
 */

type VolBar = { label: string; value: number; isLatest: boolean; isBest: boolean }

export type SideGraphArgs = {
  metric:           'max1rm' | 'bodyweight' | 'volume'
  cardStyle:        'glass'  | 'transparent'
  graphAccentHex:   string
  graphLatestHex:   string
  areaFill:         string   // 'none' for transparent, 'rgba(r,g,b,0.12)' for glass
  isDarkBg:         boolean
  glassAccentHex:   string
  glassIsDark:      boolean
  gpBorder:         string
  badgeBg:          string
  badgeTxt:         string
  cardLang:         'en' | 'ja'

  // MAX 1RM
  exName?:          string
  bestRMDisplay?:   number
  unitLabel?:       string
  rm1Growth?:       number | null
  rm1SVGData?:      { est1rm: number }[]
  rm1Dates?:        string[]

  // Body Weight
  bwCurrentDisplay?: number
  bwStartDisplay?:   number
  bwChangeStr?:      string
  bwValues?:         number[]
  bwHistoryLen?:     number
  bwDates?:          string[]
  bwStartDate?:      string   // all-time first date (for header START section)

  // Volume
  volCardLabel?:          string
  activeVolTotalStr?:     string
  activeVolSessionCount?: number
  volBars?:               VolBar[]

  unit?: 'kg' | 'lbs'
}

// ── Canvas dimensions (logical; physical = 2×) ────────────────────────────────
const CW = 540
const CH = 960
void CH

// ── Card ──────────────────────────────────────────────────────────────────────
const CARD_X  = 18
const CARD_Y  = 70
const CARD_W  = 255
const CARD_H  = 820
const CARD_RX = 20

const CX = CARD_X + 10           // 28  — left content edge
const RX = CARD_X + CARD_W - 10  // 263 — right content edge

const BADGE_Y     = CARD_Y + 12  // 82
const BADGE_H     = 22
const BADGE_RX    = 10
const BADGE_PAD_L = 11
const BADGE_PAD_R = 10

// Bottom of chart/bar area (above footer)
const BARS_BOT = CARD_Y + CARD_H - 24  // 866

// ── Drawing helpers ───────────────────────────────────────────────────────────

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

function fmtDateLabel(dateStr: string, lang: 'en' | 'ja'): string {
  if (!dateStr) return ''
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const
  if (dateStr.length === 7) {
    const mi = parseInt(dateStr.slice(5, 7), 10) - 1
    return lang === 'ja' ? `${mi + 1}月` : (M[mi] ?? '')
  }
  const d  = new Date(dateStr + 'T00:00:00')
  const mo = d.getMonth()
  const da = d.getDate()
  return lang === 'ja' ? `${mo + 1}/${da}` : `${M[mo]!} ${da}`
}

function fmtVolLabel(v: number, unit: 'kg' | 'lbs' | undefined): string {
  const dv = unit === 'lbs' ? v * 2.20462 : v
  if (dv >= 10000) return `${Math.round(dv / 1000)}t`
  if (dv >= 1000)  return `${(dv / 1000).toFixed(1)}t`
  return `${Math.round(dv)}${unit ?? 'kg'}`
}

function drawDiv(ctx: CanvasRenderingContext2D, args: SideGraphArgs, y: number) {
  ctx.save()
  ctx.strokeStyle = args.isDarkBg ? 'rgba(255,255,255,0.12)' : 'rgba(17,24,39,0.09)'
  ctx.lineWidth   = 0.75
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(CX, y)
  ctx.lineTo(RX, y)
  ctx.stroke()
  ctx.restore()
}

function clipTxt(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1)
  return t + '…'
}

/** Parse '#RRGGBB' or '#RGB' → {r,g,b}. Returns null on failure. */
function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace('#', '')
  if (h.length === 6) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    }
  }
  return null
}

// ── Glass background ──────────────────────────────────────────────────────────

function drawGlass(ctx: CanvasRenderingContext2D, args: SideGraphArgs) {
  const hex    = args.glassAccentHex
  const isDark = args.glassIsDark
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  const baseGrad = ctx.createLinearGradient(
    CARD_X + CARD_W * 0.1, CARD_Y,
    CARD_X + CARD_W * 0.6, CARD_Y + CARD_H,
  )
  if (!isDark) {
    baseGrad.addColorStop(0, 'rgba(245,244,239,0.68)')
    baseGrad.addColorStop(1, 'rgba(237,236,229,0.68)')
  } else if (r > 200 && g > 200 && b > 200) {
    baseGrad.addColorStop(0, 'rgba(17,17,20,0.62)')
    baseGrad.addColorStop(1, 'rgba(7,7,9,0.62)')
  } else {
    const dr = Math.round(r * 0.16); const dg = Math.round(g * 0.13); const db = Math.round(b * 0.15)
    const er = Math.round(r * 0.09); const eg = Math.round(g * 0.07); const eb = Math.round(b * 0.09)
    baseGrad.addColorStop(0, `rgba(${dr},${dg},${db},0.62)`)
    baseGrad.addColorStop(1, `rgba(${er},${eg},${eb},0.62)`)
  }
  ctx.fillStyle = baseGrad
  ctx.fillRect(CARD_X, CARD_Y, CARD_W, CARD_H)

  const topGrad = ctx.createLinearGradient(0, CARD_Y, 0, CARD_Y + CARD_H * 0.10)
  topGrad.addColorStop(0, 'rgba(255,255,255,0.10)')
  topGrad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = topGrad
  ctx.fillRect(CARD_X, CARD_Y, CARD_W, CARD_H * 0.10)

  const acGlow = ctx.createRadialGradient(
    CARD_X + CARD_W * 0.12, CARD_Y + CARD_H, 0,
    CARD_X + CARD_W * 0.12, CARD_Y + CARD_H, CARD_W * 1.2,
  )
  acGlow.addColorStop(0, `rgba(${r},${g},${b},0.16)`)
  acGlow.addColorStop(1, `rgba(${r},${g},${b},0)`)
  ctx.fillStyle = acGlow
  ctx.fillRect(CARD_X, CARD_Y, CARD_W, CARD_H)

  const wGlow = ctx.createRadialGradient(
    CARD_X + CARD_W * 0.88, CARD_Y, 0,
    CARD_X + CARD_W * 0.88, CARD_Y, CARD_W * 0.6,
  )
  wGlow.addColorStop(0, 'rgba(255,255,255,0.13)')
  wGlow.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = wGlow
  ctx.fillRect(CARD_X, CARD_Y, CARD_W, CARD_H)
}

// ── REPRA badge ───────────────────────────────────────────────────────────────

function drawBadge(ctx: CanvasRenderingContext2D, args: SideGraphArgs) {
  ctx.font = fnt(14, true)
  const textW = ctx.measureText('REPRA').width
  const bw = Math.ceil(textW) + BADGE_PAD_L + BADGE_PAD_R
  rrPath(ctx, CX, BADGE_Y, bw, BADGE_H, BADGE_RX)
  ctx.fillStyle = args.badgeBg
  ctx.fill()
  ctx.fillStyle    = args.badgeTxt
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('REPRA', CX + BADGE_PAD_L, BADGE_Y + 15)
}

// ── Footer ────────────────────────────────────────────────────────────────────

function drawFooter(ctx: CanvasRenderingContext2D, args: SideGraphArgs) {
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font         = fnt(10, false)
  ctx.fillStyle    = ptxt(args.isDarkBg, 0.22)
  ctx.fillText('Made with REPRA', CX, CARD_Y + CARD_H - 10)
}

// ── Line chart (MAX 1RM / Body Weight) ────────────────────────────────────────
// Orientation: Y-axis = time (oldest at bottom, newest at top)
//              X-axis = value (min at left, max at right)
// This matches the SideLineSVG / SideBWLineSVG DOM components.

function drawLineChart(
  ctx:         CanvasRenderingContext2D,
  args:        SideGraphArgs,
  values:      number[],
  dates:       string[],
  barsTop:     number,
  formatValue: (v: number) => string,
  accentC:     string,
  latestHex:   string,
) {
  const n = values.length
  if (n === 0) return

  // Chart area layout
  const DATE_COL  = 44   // left space for date labels
  const VAL_ROW   = 20   // bottom space for value-axis labels
  const CHART_L   = CX + DATE_COL   // 72
  const CHART_R   = RX - 2          // 261
  const CHART_T   = barsTop + 6
  const CHART_B   = BARS_BOT - VAL_ROW  // 846
  const cW        = CHART_R - CHART_L   // 189
  const cH        = CHART_B - CHART_T

  const min = Math.min(...values)
  const max = Math.max(...values)
  const rng = max - min || max * 0.1 || 1

  // x: value → pixel X  (min at left, max at right)
  const px = (v: number) => CHART_L + ((v - min) / rng) * cW
  // y: index → pixel Y  (0=oldest=bottom, n-1=newest=top)
  const py = (i: number) => n === 1
    ? (CHART_T + CHART_B) / 2
    : CHART_B - (i / (n - 1)) * cH

  ctx.save()

  // ── Value-axis ticks (vertical grid lines) ──────────────────────────────────
  const raw  = rng / 2
  const mag  = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 0.01))))
  const step = [1,2,2.5,5,10].map(m => m * mag).find(s => s >= raw) ?? mag * 10
  const ticks: number[] = []
  for (let t = Math.ceil(min / step) * step; t <= max * 1.001; t = Math.round((t + step) * 1e9) / 1e9) {
    ticks.push(t); if (ticks.length >= 4) break
  }

  ticks.forEach(tick => {
    const x = px(tick)
    // Dashed grid line
    ctx.strokeStyle = args.isDarkBg ? 'rgba(255,255,255,0.10)' : 'rgba(17,24,39,0.07)'
    ctx.lineWidth   = 0.7
    ctx.setLineDash([2, 3])
    ctx.beginPath(); ctx.moveTo(x, CHART_T); ctx.lineTo(x, CHART_B); ctx.stroke()
    ctx.setLineDash([])

    // Value label below chart
    ctx.font         = fnt(8, false)
    ctx.fillStyle    = ptxt(args.isDarkBg, 0.38)
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(formatValue(tick), x, CHART_B + 5)
  })

  // ── Area fill (from line back to left axis) ─────────────────────────────────
  if (n >= 2 && args.areaFill && args.areaFill !== 'none') {
    ctx.beginPath()
    ctx.moveTo(CHART_L, py(0))
    values.forEach((v, i) => ctx.lineTo(px(v), py(i)))
    ctx.lineTo(CHART_L, py(n - 1))
    ctx.closePath()
    ctx.fillStyle = args.areaFill
    ctx.fill()
  }

  // ── Polyline ────────────────────────────────────────────────────────────────
  if (n >= 2) {
    ctx.beginPath()
    values.forEach((v, i) => {
      if (i === 0) ctx.moveTo(px(v), py(i))
      else         ctx.lineTo(px(v), py(i))
    })
    ctx.strokeStyle = accentC
    ctx.lineWidth   = 1.5
    ctx.lineJoin    = 'round'
    ctx.lineCap     = 'round'
    ctx.stroke()
  }

  // ── Date labels (left side, thinned for density) ────────────────────────────
  const labelEvery = n <= 5 ? 1 : n <= 12 ? 2 : Math.max(1, Math.floor(n / 5))
  dates.forEach((date, i) => {
    if (!date) return
    if (i !== 0 && i !== n - 1 && i % labelEvery !== 0) return
    const isNewest = i === n - 1
    ctx.font         = fnt(8, isNewest)
    ctx.fillStyle    = isNewest ? accentC : ptxt(args.isDarkBg, 0.35)
    ctx.textAlign    = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(fmtDateLabel(date, args.cardLang), CHART_L - 4, py(i))
  })

  // ── First point (oldest) — subtle dot ────────────────────────────────────────
  if (n >= 2) {
    ctx.beginPath()
    ctx.arc(px(values[0]!), py(0), 2.5, 0, Math.PI * 2)
    ctx.fillStyle = args.isDarkBg ? 'rgba(255,255,255,0.28)' : 'rgba(17,24,39,0.25)'
    ctx.fill()
  }

  // ── Latest point — glow rings + solid dot ────────────────────────────────────
  const lp = parseHex(latestHex)
  const lxPt = px(values[n - 1]!)
  const lyPt = py(n - 1)
  if (lp) {
    ctx.beginPath()
    ctx.arc(lxPt, lyPt, 9, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${lp.r},${lp.g},${lp.b},0.08)`
    ctx.fill()
    ctx.beginPath()
    ctx.arc(lxPt, lyPt, 5, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${lp.r},${lp.g},${lp.b},0.28)`
    ctx.fill()
    ctx.beginPath()
    ctx.arc(lxPt, lyPt, 3.5, 0, Math.PI * 2)
    ctx.fillStyle = latestHex
    ctx.fill()
  } else {
    ctx.beginPath()
    ctx.arc(lxPt, lyPt, 3.5, 0, Math.PI * 2)
    ctx.fillStyle = accentC
    ctx.fill()
  }

  ctx.restore()
}

// ── Horizontal bar chart (Daily Volume only) ──────────────────────────────────
// Supports up to 60 bars. Date labels and value labels are thinned automatically
// when bars are dense so the card stays readable.

type BarEntry = { value: number; date: string; isLatest: boolean; isBest: boolean }

function drawProgressBars(
  ctx:         CanvasRenderingContext2D,
  args:        SideGraphArgs,
  bars:        BarEntry[],
  barsTop:     number,
  formatValue: (v: number) => string,
  accentC:     string,
  latestHex:   string,
  normFloor = 0,
) {
  const n = bars.length
  if (!n) return
  const maxVal = Math.max(...bars.map(b => b.value))
  if (maxVal <= normFloor) return

  // Slot height cap: smaller for sparse displays so bars stay centered, not top-clustered
  const maxSlotH = n <= 7 ? 60 : n <= 14 ? 50 : n <= 30 ? 38 : 30
  const slotH    = Math.min((BARS_BOT - barsTop) / n, maxSlotH)

  // Center the used area vertically so sparse bar sets float in the middle
  const usedH  = slotH * n
  const startY = barsTop + Math.max(0, ((BARS_BOT - barsTop) - usedH) / 2)

  // Bar height by density: thick for few bars, thin for many
  let barH: number
  if      (n <= 7)  barH = Math.min(17, slotH * 0.68)
  else if (n <= 14) barH = Math.min(13, slotH * 0.62)
  else if (n <= 30) barH = Math.min(9,  slotH * 0.58)
  else              barH = Math.min(5,  slotH * 0.56)
  barH = Math.max(barH, 1.5)

  // Date labels: all for n<=7, every other for n<=14, max ~6 for dense
  const labelEvery = n <= 7 ? 1 : n <= 14 ? 2 : Math.max(1, Math.ceil(n / 6))
  const showDateLabel = (i: number) =>
    i === 0 || i === n - 1 || i % labelEvery === 0 || bars[i]!.isLatest

  // Value labels: show all for n<=14, latest/best only for dense
  const showValueLabel = (bar: BarEntry) =>
    n <= 14 || bar.isLatest || bar.isBest

  // Column layout: [date 42px][5px][bar][5px][34px value]
  const DATE_END  = CX + 42
  const BAR_X     = DATE_END + 5
  const BAR_MAX_W = RX - BAR_X - 5 - 34
  const normRange = maxVal - normFloor || 1

  bars.forEach((bar, i) => {
    const cy = startY + (i + 0.5) * slotH
    const bw = Math.max(((bar.value - normFloor) / normRange) * BAR_MAX_W, 3)

    ctx.save()

    // Date label (thinned when dense)
    if (showDateLabel(i)) {
      ctx.font         = fnt(9, bar.isLatest)
      ctx.fillStyle    = bar.isLatest ? accentC : ptxt(args.isDarkBg, 0.36)
      ctx.textAlign    = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(fmtDateLabel(bar.date, args.cardLang), DATE_END, cy)
    }

    // Horizontal bar — square corners
    ctx.globalAlpha = bar.isLatest ? 1 : bar.isBest ? 0.65 : 0.28
    ctx.fillStyle   = bar.isLatest ? latestHex : accentC
    ctx.fillRect(BAR_X, cy - barH / 2, bw, barH)
    ctx.globalAlpha = 1

    // Value label (selective when dense)
    if (showValueLabel(bar)) {
      ctx.font         = fnt(9, bar.isLatest)
      ctx.fillStyle    = bar.isLatest ? primaryText(args.isDarkBg) : ptxt(args.isDarkBg, 0.42)
      ctx.textAlign    = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(formatValue(bar.value), RX, cy)
    }

    ctx.restore()
  })
}

// ── MAX 1RM ───────────────────────────────────────────────────────────────────

function draw1RM(ctx: CanvasRenderingContext2D, args: SideGraphArgs) {
  drawBadge(ctx, args)

  const acc  = args.graphAccentHex
  const prim = primaryText(args.isDarkBg)
  const dim  = (a: number) => ptxt(args.isDarkBg, a)
  const unit = args.unitLabel ?? ''

  ctx.textAlign    = 'left'
  ctx.textBaseline = 'alphabetic'

  // Type label
  ctx.font = fnt(11, true); ctx.fillStyle = acc
  ctx.fillText(args.cardLang === 'ja' ? '1RM 推移' : '1RM PROGRESS', CX, 116)

  // Exercise name
  if (args.exName) {
    ctx.font = fnt(15, true); ctx.fillStyle = prim
    ctx.fillText(clipTxt(ctx, args.exName, RX - CX), CX, 133)
  }

  drawDiv(ctx, args, 143)

  // ── START ──
  ctx.font = fnt(8, true); ctx.fillStyle = dim(0.45)
  ctx.fillText(args.cardLang === 'ja' ? 'スタート' : 'START', CX, 154)

  const startRM   = args.rm1SVGData?.[0]?.est1rm
  const startDate = args.rm1Dates?.[0] ?? ''
  if (startRM !== undefined) {
    ctx.font = fnt(13, true); ctx.fillStyle = prim
    ctx.fillText(`${Math.round(startRM)} ${unit}`, CX, 169)
  }
  if (startDate) {
    ctx.font = fnt(9, false); ctx.fillStyle = dim(0.38)
    ctx.fillText(fmtDateLabel(startDate, args.cardLang), CX, 181)
  }

  drawDiv(ctx, args, 191)

  // ── BEST ──
  ctx.font = fnt(8, true); ctx.fillStyle = dim(0.45)
  ctx.fillText(args.cardLang === 'ja' ? 'ベスト' : 'BEST', CX, 202)

  ctx.font = fnt(42, true); ctx.fillStyle = acc
  ctx.fillText(String(args.bestRMDisplay ?? ''), CX, 248)

  ctx.font = fnt(11, false); ctx.fillStyle = dim(0.50)
  ctx.fillText(`${unit}  ${args.cardLang === 'ja' ? 'ベスト' : 'best'}`, CX, 263)

  drawDiv(ctx, args, 274)

  // ── GAIN ──
  ctx.font = fnt(8, true); ctx.fillStyle = dim(0.45)
  ctx.fillText(args.cardLang === 'ja' ? '変化' : 'GAIN', CX, 285)

  const growth = args.rm1Growth
  if (growth !== null && growth !== undefined) {
    ctx.font      = fnt(17, true)
    ctx.fillStyle = growth >= 0 ? '#4ade80' : '#f87171'
    ctx.fillText(`${growth >= 0 ? '+' : ''}${growth} ${unit}`, CX, 303)
  }

  drawDiv(ctx, args, 313)

  // ── PROGRESSION header ──
  ctx.font = fnt(8, true); ctx.fillStyle = dim(0.45)
  ctx.fillText(args.cardLang === 'ja' ? 'プログレス' : 'PROGRESSION', CX, 324)

  // ── Line chart (oldest at bottom, newest at top) ──────────────────────────
  const rawData  = args.rm1SVGData ?? []
  const rawDates = args.rm1Dates ?? []
  const values   = rawData.map(d => d.est1rm)

  if (values.length === 0) {
    ctx.font = fnt(9, false); ctx.fillStyle = dim(0.30)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(args.cardLang === 'ja' ? 'データなし' : 'No data', (CX + RX) / 2, (334 + BARS_BOT) / 2)
  } else {
    drawLineChart(
      ctx, args, values, rawDates, 334,
      v => `${Math.round(v)}`,
      acc, args.graphLatestHex,
    )
  }
}

// ── Body Weight ───────────────────────────────────────────────────────────────

function drawBW(ctx: CanvasRenderingContext2D, args: SideGraphArgs) {
  drawBadge(ctx, args)

  const acc  = args.graphAccentHex
  const prim = primaryText(args.isDarkBg)
  const dim  = (a: number) => ptxt(args.isDarkBg, a)
  const unit = args.unitLabel ?? ''

  ctx.textAlign    = 'left'
  ctx.textBaseline = 'alphabetic'

  // Type label (no exercise name for BW — more vertical space)
  ctx.font = fnt(11, true); ctx.fillStyle = acc
  ctx.fillText(args.cardLang === 'ja' ? '体重' : 'BODY WEIGHT', CX, 108)

  drawDiv(ctx, args, 118)

  // ── START ── (bwStartDate = all-time first date; bwDates[0] = first in visible window)
  ctx.font = fnt(8, true); ctx.fillStyle = dim(0.45)
  ctx.fillText(args.cardLang === 'ja' ? 'スタート' : 'START', CX, 129)

  const bwStartDate = args.bwStartDate ?? args.bwDates?.[0] ?? ''
  ctx.font = fnt(13, true); ctx.fillStyle = prim
  ctx.fillText(`${args.bwStartDisplay ?? ''} ${unit}`, CX, 144)
  if (bwStartDate) {
    ctx.font = fnt(9, false); ctx.fillStyle = dim(0.38)
    ctx.fillText(fmtDateLabel(bwStartDate, args.cardLang), CX, 156)
  }

  drawDiv(ctx, args, 166)

  // ── CURRENT ──
  ctx.font = fnt(8, true); ctx.fillStyle = dim(0.45)
  ctx.fillText(args.cardLang === 'ja' ? '現在' : 'CURRENT', CX, 177)

  ctx.font = fnt(42, true); ctx.fillStyle = acc
  ctx.fillText(String(args.bwCurrentDisplay ?? ''), CX, 223)

  ctx.font = fnt(11, false); ctx.fillStyle = dim(0.50)
  ctx.fillText(unit, CX, 238)

  drawDiv(ctx, args, 249)

  // ── CHANGE ──
  ctx.font = fnt(8, true); ctx.fillStyle = dim(0.45)
  ctx.fillText(args.cardLang === 'ja' ? '変化' : 'CHANGE', CX, 260)

  const bwChange = args.bwChangeStr ?? ''
  ctx.font = fnt(17, true); ctx.fillStyle = acc
  ctx.fillText(`${bwChange} ${unit}`, CX, 278)

  drawDiv(ctx, args, 288)

  // ── PROGRESSION header ──
  ctx.font = fnt(8, true); ctx.fillStyle = dim(0.45)
  ctx.fillText(args.cardLang === 'ja' ? 'プログレス' : 'PROGRESSION', CX, 299)

  // ── Line chart (oldest at bottom, newest at top) ──────────────────────────
  const rawValues = args.bwValues ?? []
  const rawDates  = args.bwDates ?? []

  if (rawValues.length === 0) {
    ctx.font = fnt(9, false); ctx.fillStyle = dim(0.30)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(args.cardLang === 'ja' ? 'データなし' : 'No data', (CX + RX) / 2, (309 + BARS_BOT) / 2)
  } else {
    drawLineChart(
      ctx, args, rawValues, rawDates, 309,
      v => `${Math.round(v * 10) / 10}`,
      acc, args.graphLatestHex,
    )
  }
}

// ── Daily Volume ──────────────────────────────────────────────────────────────

function drawVol(ctx: CanvasRenderingContext2D, args: SideGraphArgs) {
  drawBadge(ctx, args)

  const acc  = args.graphAccentHex
  const prim = primaryText(args.isDarkBg)
  const dim  = (a: number) => ptxt(args.isDarkBg, a)

  ctx.textAlign    = 'left'
  ctx.textBaseline = 'alphabetic'

  // Type label
  ctx.font = fnt(11, true); ctx.fillStyle = acc
  ctx.fillText(args.cardLang === 'ja' ? '総重量' : 'DAILY VOLUME', CX, 116)

  // Category / exercise name
  if (args.volCardLabel) {
    ctx.font = fnt(15, true); ctx.fillStyle = prim
    ctx.fillText(clipTxt(ctx, args.volCardLabel, RX - CX), CX, 133)
  }

  drawDiv(ctx, args, 143)

  // ── SESSIONS ──
  ctx.font = fnt(8, true); ctx.fillStyle = dim(0.45)
  ctx.fillText(args.cardLang === 'ja' ? 'セッション' : 'SESSIONS', CX, 154)

  ctx.font = fnt(17, true); ctx.fillStyle = prim
  ctx.fillText(
    `${args.activeVolSessionCount ?? 0}${args.cardLang === 'ja' ? ' セッション' : ' sessions'}`,
    CX, 171,
  )

  drawDiv(ctx, args, 181)

  // ── TOTAL (big) ──
  ctx.font = fnt(8, true); ctx.fillStyle = dim(0.45)
  ctx.fillText(args.cardLang === 'ja' ? '合計' : 'TOTAL', CX, 192)

  ctx.font = fnt(38, true); ctx.fillStyle = acc
  ctx.fillText(args.activeVolTotalStr ?? '', CX, 236)

  ctx.font = fnt(11, false); ctx.fillStyle = dim(0.50)
  ctx.fillText(args.cardLang === 'ja' ? '合計ボリューム' : 'total volume', CX, 251)

  drawDiv(ctx, args, 262)

  // ── PROGRESSION header ──
  ctx.font = fnt(8, true); ctx.fillStyle = dim(0.45)
  ctx.fillText(args.cardLang === 'ja' ? 'プログレス' : 'PROGRESSION', CX, 273)

  // ── Horizontal bars (newest at top after reverse) — square corners ──────────
  const volBars = args.volBars ?? []
  if (volBars.length) {
    const entries: BarEntry[] = volBars.map(b => ({
      value: b.value, date: b.label, isLatest: b.isLatest, isBest: b.isBest,
    }))
    entries.reverse()
    // Ensure the newest (first after reverse) is flagged as latest
    if (entries.length > 0 && !entries.some(e => e.isLatest)) {
      entries[0]!.isLatest = true
    }

    drawProgressBars(
      ctx, args, entries, 283,
      v => fmtVolLabel(v, args.unit),
      acc, args.graphLatestHex,
    )
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function exportSideGraphCard(args: SideGraphArgs): Promise<Blob> {
  await document.fonts.ready
  await new Promise<void>(r => requestAnimationFrame(() => r()))

  const canvas  = document.createElement('canvas')
  canvas.width  = CW * 2
  canvas.height = CH * 2
  const ctx     = canvas.getContext('2d', { alpha: true })
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.scale(2, 2)

  ctx.save()
  rrPath(ctx, CARD_X, CARD_Y, CARD_W, CARD_H, CARD_RX)
  ctx.clip()

  if (args.cardStyle !== 'glass') {
    ctx.clearRect(CARD_X, CARD_Y, CARD_W, CARD_H)
  }

  if (args.cardStyle === 'glass') {
    drawGlass(ctx, args)
    rrPath(ctx, CARD_X, CARD_Y, CARD_W, CARD_H, CARD_RX)
    ctx.strokeStyle = args.gpBorder
    ctx.lineWidth   = 4
    ctx.stroke()
  }

  if (args.metric === 'max1rm')          draw1RM(ctx, args)
  else if (args.metric === 'bodyweight') drawBW(ctx, args)
  else                                   drawVol(ctx, args)

  drawFooter(ctx, args)

  ctx.restore()

  const dataUrl = canvas.toDataURL('image/png')
  const blob    = await fetch(dataUrl).then(r => r.blob())
  return blob
}
