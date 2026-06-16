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
  cardStyle:        'glass'  | 'clear-glass' | 'transparent'
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
  bwChangeRaw?:      number
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
const BADGE_RX    = 5
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

function drawGlass(ctx: CanvasRenderingContext2D, args: SideGraphArgs, cardH = CARD_H) {
  const hex    = args.glassAccentHex
  const isDark = args.glassIsDark
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  const baseGrad = ctx.createLinearGradient(
    CARD_X + CARD_W * 0.1, CARD_Y,
    CARD_X + CARD_W * 0.6, CARD_Y + cardH,
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
  ctx.fillRect(CARD_X, CARD_Y, CARD_W, cardH)

  const topGrad = ctx.createLinearGradient(0, CARD_Y, 0, CARD_Y + cardH * 0.10)
  topGrad.addColorStop(0, 'rgba(255,255,255,0.10)')
  topGrad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = topGrad
  ctx.fillRect(CARD_X, CARD_Y, CARD_W, cardH * 0.10)

  const acGlow = ctx.createRadialGradient(
    CARD_X + CARD_W * 0.12, CARD_Y + cardH, 0,
    CARD_X + CARD_W * 0.12, CARD_Y + cardH, CARD_W * 1.2,
  )
  acGlow.addColorStop(0, `rgba(${r},${g},${b},0.16)`)
  acGlow.addColorStop(1, `rgba(${r},${g},${b},0)`)
  ctx.fillStyle = acGlow
  ctx.fillRect(CARD_X, CARD_Y, CARD_W, cardH)

  const wGlow = ctx.createRadialGradient(
    CARD_X + CARD_W * 0.88, CARD_Y, 0,
    CARD_X + CARD_W * 0.88, CARD_Y, CARD_W * 0.6,
  )
  wGlow.addColorStop(0, 'rgba(255,255,255,0.13)')
  wGlow.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = wGlow
  ctx.fillRect(CARD_X, CARD_Y, CARD_W, cardH)
}

// ── Clear glass background ────────────────────────────────────────────────────

function drawClearGlass(ctx: CanvasRenderingContext2D, _args: SideGraphArgs, cardH = CARD_H) {
  const baseGrad = ctx.createLinearGradient(
    CARD_X + CARD_W * 0.1, CARD_Y,
    CARD_X + CARD_W * 0.6, CARD_Y + cardH,
  )
  baseGrad.addColorStop(0, 'rgba(18,18,26,0.40)')
  baseGrad.addColorStop(1, 'rgba(8,8,14,0.32)')
  ctx.fillStyle = baseGrad
  ctx.fillRect(CARD_X, CARD_Y, CARD_W, cardH)

  const topGrad = ctx.createLinearGradient(0, CARD_Y, 0, CARD_Y + cardH * 0.14)
  topGrad.addColorStop(0, 'rgba(255,255,255,0.14)')
  topGrad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = topGrad
  ctx.fillRect(CARD_X, CARD_Y, CARD_W, cardH * 0.14)

  const wGlow = ctx.createRadialGradient(
    CARD_X + CARD_W * 0.88, CARD_Y, 0,
    CARD_X + CARD_W * 0.88, CARD_Y, CARD_W * 0.55,
  )
  wGlow.addColorStop(0, 'rgba(255,255,255,0.12)')
  wGlow.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = wGlow
  ctx.fillRect(CARD_X, CARD_Y, CARD_W, cardH)
}

// ── REPRA badge ───────────────────────────────────────────────────────────────

function drawBadge(ctx: CanvasRenderingContext2D, args: SideGraphArgs) {
  // Premium pill: dark bg + accent border + accent text. Fall back to light on pearl-white glass.
  const acc = args.isDarkBg ? args.graphAccentHex : 'rgba(229,231,235,0.85)'
  ctx.letterSpacing = '2px'
  ctx.font = fnt(14, true)
  const textW = ctx.measureText('REPRA').width
  const bw    = Math.ceil(textW) + BADGE_PAD_L + BADGE_PAD_R
  rrPath(ctx, CX, BADGE_Y, bw, BADGE_H, BADGE_RX)
  // Accent-tinted dark fill: 14% of the glass-mode accent color (dark card bg shows through)
  const hx = args.glassAccentHex.slice(1)
  const fr = parseInt(hx.slice(0, 2), 16), fg = parseInt(hx.slice(2, 4), 16), fb = parseInt(hx.slice(4, 6), 16)
  ctx.fillStyle = `rgba(${fr},${fg},${fb},0.14)`
  ctx.fill()
  ctx.strokeStyle = acc
  ctx.lineWidth   = 1.5
  ctx.stroke()
  ctx.fillStyle    = acc
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('REPRA', CX + BADGE_PAD_L, BADGE_Y + 15)
  ctx.letterSpacing = '0px'
}

// ── Footer ────────────────────────────────────────────────────────────────────

function drawFooter(ctx: CanvasRenderingContext2D, args: SideGraphArgs, cardH = CARD_H) {
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font         = fnt(10, false)
  ctx.fillStyle    = ptxt(args.isDarkBg, 0.22)
  ctx.fillText('Made with REPRA', CX, CARD_Y + cardH - 10)
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
  strokeW:     number = 1.5,
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
    ctx.lineWidth   = strokeW
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
  const ds = strokeW / 1.5  // dot scale relative to default stroke width
  if (n >= 2) {
    ctx.beginPath()
    ctx.arc(px(values[0]!), py(0), 2.5 * ds, 0, Math.PI * 2)
    ctx.fillStyle = args.isDarkBg ? 'rgba(255,255,255,0.28)' : 'rgba(17,24,39,0.25)'
    ctx.fill()
  }

  // ── Latest point — glow rings + solid dot ────────────────────────────────────
  const lp = parseHex(latestHex)
  const lxPt = px(values[n - 1]!)
  const lyPt = py(n - 1)
  if (lp) {
    ctx.beginPath()
    ctx.arc(lxPt, lyPt, 9 * ds, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${lp.r},${lp.g},${lp.b},0.08)`
    ctx.fill()
    ctx.beginPath()
    ctx.arc(lxPt, lyPt, 5 * ds, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${lp.r},${lp.g},${lp.b},0.28)`
    ctx.fill()
    ctx.beginPath()
    ctx.arc(lxPt, lyPt, 3.5 * ds, 0, Math.PI * 2)
    ctx.fillStyle = latestHex
    ctx.fill()
  } else {
    ctx.beginPath()
    ctx.arc(lxPt, lyPt, 3.5 * ds, 0, Math.PI * 2)
    ctx.fillStyle = accentC
    ctx.fill()
  }

  ctx.restore()
}

// ── Horizontal bar chart (Daily Volume only) ──────────────────────────────────
// Bars are top-aligned: newest entry at top, older entries cascade downward.
// Returns the Y coordinate where the last bar ends (used for dynamic card height).

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
): number /* barsEndY */ {
  const n = bars.length
  if (!n) return barsTop
  const maxVal = Math.max(...bars.map(b => b.value))
  if (maxVal <= normFloor) return barsTop

  // Target slot (barH + gap) and bar heights per density.
  // Vol graph caps at 28 bars; tiers above n=28 kept as safety fallback only.
  const targetSlotH = n <= 10 ? 24 : n <= 18 ? 22 : n <= 28 ? 24 : 11
  const targetBarH  = n <= 10 ? 20 : n <= 18 ? 18 : n <= 28 ? 20 : 8

  // Safety cap: don't overflow the full-height bar area
  const slotH = Math.min(targetSlotH, (BARS_BOT - barsTop) / Math.max(n, 1))
  const barH  = Math.max(Math.min(targetBarH, slotH * 0.85), 2)

  // TOP-ALIGNED: newest bar at top (index 0), oldest at bottom
  const startY   = barsTop
  const barsEndY = startY + n * slotH

  // Date label thinning: show all for sparse, thin for dense
  const labelEvery    = n <= 7 ? 1 : n <= 14 ? 2 : Math.max(1, Math.ceil(n / 6))
  const showDateLabel  = (i: number) =>
    i === 0 || i === n - 1 || i % labelEvery === 0 || bars[i]!.isLatest

  // Value labels: always for sparse, latest/best only when dense
  const showValueLabel = (bar: BarEntry) =>
    n <= 14 || bar.isLatest || bar.isBest

  // Column grid: CX ──[32px date]── BAR_X ──[bar ~171px]──[4px]──[28px val]── RX
  // Date labels are left-aligned at CX so they align with NOW/GAIN info text above.
  const DATE_X    = CX              // 28  — date label left edge (matches info column)
  const BAR_X     = DATE_X + 32    // 60  — bar start (date ~28px + 4px gap)
  const VAL_W     = 28              // value column width
  const VAL_GAP   = 4
  const BAR_MAX_W = RX - BAR_X - VAL_GAP - VAL_W - 16  // ≈ 155px max bar width
  const normRange = maxVal - normFloor || 1

  bars.forEach((bar, i) => {
    const cy = startY + (i + 0.5) * slotH
    const bw = Math.max(((bar.value - normFloor) / normRange) * BAR_MAX_W, 3)

    ctx.save()

    // Date label — left-aligned at DATE_X (= CX) to align with info text above
    if (showDateLabel(i)) {
      ctx.textAlign    = 'left'
      ctx.textBaseline = 'middle'
      if (bar.isLatest && slotH >= 17) {
        ctx.font = fnt(7, true); ctx.fillStyle = accentC
        ctx.fillText('NOW', DATE_X, cy - slotH * 0.25)
        ctx.font = fnt(7.5, false); ctx.fillStyle = accentC
        ctx.fillText(fmtDateLabel(bar.date, args.cardLang), DATE_X, cy + slotH * 0.22)
      } else {
        ctx.font      = fnt(9, bar.isLatest)
        ctx.fillStyle = bar.isLatest ? accentC : ptxt(args.isDarkBg, 0.36)
        ctx.fillText(fmtDateLabel(bar.date, args.cardLang), DATE_X, cy)
      }
    }

    // Horizontal bar — square corners, opacity by recency
    ctx.globalAlpha = bar.isLatest ? 1 : bar.isBest ? 0.75 : 0.50
    ctx.fillStyle   = bar.isLatest ? latestHex : accentC
    ctx.fillRect(BAR_X, cy - barH / 2, bw, barH)
    ctx.globalAlpha = 1

    // Value label — right-aligned at RX; latest uses primary text
    if (showValueLabel(bar)) {
      ctx.font         = fnt(9, bar.isLatest)
      ctx.fillStyle    = bar.isLatest ? primaryText(args.isDarkBg) : ptxt(args.isDarkBg, 0.42)
      ctx.textAlign    = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(formatValue(bar.value), RX, cy)
    }

    ctx.restore()
  })

  return barsEndY
}

// ── MAX 1RM ───────────────────────────────────────────────────────────────────

function draw1RM(ctx: CanvasRenderingContext2D, args: SideGraphArgs) {
  drawBadge(ctx, args)

  const acc  = args.graphAccentHex
  const prim = primaryText(args.isDarkBg)
  const dim  = (a: number) => ptxt(args.isDarkBg, a)
  const unit = args.unitLabel ?? ''
  const ja   = args.cardLang === 'ja'

  ctx.textAlign    = 'left'
  ctx.textBaseline = 'alphabetic'

  // ── Exercise name (primary) — badge bottom y=104, 18px top ≈ 126 → 22px gap ──
  if (args.exName) {
    ctx.font = fnt(18, true); ctx.fillStyle = prim
    ctx.fillText(clipTxt(ctx, args.exName, RX - CX), CX, 140)
  }

  // ── Type subtitle ─────────────────────────────────────────────────────────────
  ctx.font = fnt(10, true); ctx.fillStyle = acc
  ctx.fillText(ja ? '1RM 推移' : '1RM PROGRESS', CX, 153)

  drawDiv(ctx, args, 163)

  // ── START compact inline ──────────────────────────────────────────────────────
  const startRM = args.rm1SVGData?.[0]?.est1rm
  ctx.font = fnt(8, true); ctx.fillStyle = dim(0.38)
  ctx.fillText(ja ? 'スタート' : 'START', CX, 179)
  if (startRM !== undefined) {
    const startLabelW = ctx.measureText(ja ? 'スタート' : 'START').width
    ctx.font = fnt(18, true); ctx.fillStyle = prim
    ctx.fillText(`${Math.round(startRM)} ${unit}`, CX + startLabelW + 6, 179)
  }

  // ── BEST hero: label + auto-sized value on same baseline ─────────────────────
  const HERO_Y = 250
  ctx.font = fnt(9, true); ctx.fillStyle = acc
  ctx.fillText(ja ? 'ベスト' : 'BEST', CX, HERO_Y)
  const bestLabelW = ctx.measureText(ja ? 'ベスト' : 'BEST').width

  if (args.bestRMDisplay !== undefined && args.bestRMDisplay !== null) {
    const heroText   = String(args.bestRMDisplay)
    const heroMaxW   = RX - CX - bestLabelW - 6
    const heroFontSz = Math.min(65, Math.max(36,
      Math.floor(heroMaxW / Math.max(heroText.length * 0.62, 1))))
    ctx.font = fnt(heroFontSz, true); ctx.fillStyle = acc
    ctx.fillText(clipTxt(ctx, heroText, heroMaxW), CX + bestLabelW + 6, HERO_Y)
  }

  ctx.font = fnt(10, false); ctx.fillStyle = dim(0.45)
  ctx.fillText(`${unit} ${ja ? 'ベスト' : 'best'}`, CX, HERO_Y + 14)

  // ── GAIN ──────────────────────────────────────────────────────────────────────
  const growth = args.rm1Growth
  if (growth !== null && growth !== undefined) {
    ctx.font      = fnt(15, true)
    ctx.fillStyle = growth >= 0 ? '#4ade80' : '#f87171'
    ctx.fillText(`${growth >= 0 ? '+' : ''}${growth} ${unit} ${ja ? '成長' : 'GAIN'}`, CX, HERO_Y + 32)
  } else {
    ctx.font = fnt(10, false); ctx.fillStyle = dim(0.28)
    ctx.fillText('—', CX, HERO_Y + 32)
  }

  drawDiv(ctx, args, HERO_Y + 45)

  // ── PROGRESSION header ────────────────────────────────────────────────────────
  ctx.font = fnt(8, true); ctx.fillStyle = dim(0.45)
  ctx.fillText(ja ? 'プログレス' : 'PROGRESSION', CX, HERO_Y + 56)

  // ── Line chart ────────────────────────────────────────────────────────────────
  const rawData  = args.rm1SVGData ?? []
  const rawDates = args.rm1Dates ?? []
  const values   = rawData.map(d => d.est1rm)

  if (values.length === 0) {
    ctx.font = fnt(9, false); ctx.fillStyle = dim(0.30)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(ja ? 'データなし' : 'No data', (CX + RX) / 2, (HERO_Y + 67 + BARS_BOT) / 2)
  } else {
    drawLineChart(
      ctx, args, values, rawDates, HERO_Y + 67,
      v => `${Math.round(v)}`,
      acc, args.graphLatestHex, 2.0,
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
  const bwChangeRaw = args.bwChangeRaw ?? 0
  ctx.font = fnt(17, true)
  ctx.fillStyle = bwChangeRaw !== 0 ? (bwChangeRaw >= 0 ? '#4ade80' : '#f87171') : acc
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

// VOL_BARS_TOP: y-coordinate where the bar chart starts (must match computeVolCardH)
const VOL_BARS_TOP = 301

function drawVol(ctx: CanvasRenderingContext2D, args: SideGraphArgs) {
  drawBadge(ctx, args)

  const acc      = args.graphAccentHex
  const prim     = primaryText(args.isDarkBg)
  const dim      = (a: number) => ptxt(args.isDarkBg, a)
  const ja       = args.cardLang === 'ja'
  const GAIN_CLR = '#36E27A'

  ctx.textAlign    = 'left'
  ctx.textBaseline = 'alphabetic'

  const volBars  = args.volBars ?? []
  const startVal = volBars.length > 1 ? volBars[0]!.value : null
  const nowVal   = volBars.length > 0 ? volBars[volBars.length - 1]!.value : null
  const gainVal  = startVal !== null && nowVal !== null ? nowVal - startVal : null

  // ── Part name (large bold primary) ──────────────────────────────────────────
  // y=140: badge bottom is y=104; at 24px font the ascender sits ~18px above baseline,
  // so the text top lands at ~122 — giving ~18px clearance below the badge.
  if (args.volCardLabel) {
    ctx.font = fnt(24, true); ctx.fillStyle = prim
    ctx.fillText(clipTxt(ctx, args.volCardLabel, RX - CX), CX, 140)
  }

  // ── Type subtitle (small accent bold) ────────────────────────────────────────
  ctx.font = fnt(10, true); ctx.fillStyle = acc
  ctx.fillText(ja ? '総重量' : 'DAILY VOLUME', CX, 153)

  // ── START compact inline: "START" (tiny dim) + value (medium prim) same line ─
  // Mirrors reference image: "START  55kg" on one baseline.
  ctx.font = fnt(8, true); ctx.fillStyle = dim(0.38)
  ctx.fillText('START', CX, 179)
  if (startVal !== null) {
    const startLabelW = ctx.measureText('START').width
    ctx.font = fnt(20, true); ctx.fillStyle = prim
    ctx.fillText(fmtVolLabel(startVal, args.unit), CX + startLabelW + 6, 179)
  }

  // ── NOW + hero inline on same baseline ──────────────────────────────────────
  // "NOW" (small orange) at left, auto-sized hero number right of it — same baseline.
  // Font scales by string length so short "4.6t" is large, long "139.2t" is smaller.
  const HERO_Y = 230
  ctx.font = fnt(9, true); ctx.fillStyle = acc
  ctx.fillText('NOW', CX, HERO_Y)
  const nowLabelW = ctx.measureText('NOW').width

  if (nowVal !== null) {
    const heroText   = fmtVolLabel(nowVal, args.unit)
    const heroMaxW   = RX - CX - nowLabelW - 6
    const heroFontSz = Math.min(65, Math.max(36,
      Math.floor(heroMaxW / Math.max(heroText.length * 0.62, 1))))
    ctx.font = fnt(heroFontSz, true); ctx.fillStyle = acc
    ctx.fillText(clipTxt(ctx, heroText, heroMaxW), CX + nowLabelW + 6, HERO_Y)
  }

  // ── GAIN / 成長 ──────────────────────────────────────────────────────────────
  if (gainVal !== null && gainVal > 0) {
    ctx.font = fnt(15, true); ctx.fillStyle = GAIN_CLR
    ctx.fillText(
      `+${fmtVolLabel(gainVal, args.unit)} ${ja ? '成長' : 'GAIN'}`,
      CX, 252,
    )
  } else {
    ctx.font = fnt(10, false); ctx.fillStyle = dim(0.28)
    ctx.fillText('—', CX, 252)
  }

  drawDiv(ctx, args, 263)

  // ── PROGRESSION header ───────────────────────────────────────────────────────
  ctx.font = fnt(8, true); ctx.fillStyle = dim(0.45)
  ctx.fillText(ja ? 'プログレス' : 'PROGRESSION', CX, 274)

  // ── Horizontal bars: newest at top (index 0), oldest at bottom ──────────────
  if (volBars.length) {
    const entries: BarEntry[] = volBars.map(b => ({
      value: b.value, date: b.label, isLatest: b.isLatest, isBest: b.isBest,
    }))
    entries.reverse()
    if (!entries.some(e => e.isLatest)) entries[0]!.isLatest = true

    drawProgressBars(
      ctx, args, entries, VOL_BARS_TOP,
      v => fmtVolLabel(v, args.unit),
      acc, args.graphLatestHex,
    )
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

// Compute dynamic card height for volume metric based on bar count.
// For 1RM / Body Weight the card is always full height.
function computeVolCardH(n: number): number {
  if (n <= 0) return CARD_H
  const targetSlotH = n <= 10 ? 24 : n <= 18 ? 22 : 24  // vol capped at 28 bars
  const barsEnd     = VOL_BARS_TOP + n * targetSlotH
  const footerPad   = 34   // space below last bar for footer text
  const minCardH    = 430  // always tall enough to show all header sections
  return Math.max(minCardH, Math.min(CARD_H, Math.round(barsEnd - CARD_Y + footerPad)))
}

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

  // Volume metric uses a shorter card that grows with bar count (min 380, max 820)
  const effectiveCardH = args.metric === 'volume'
    ? computeVolCardH((args.volBars ?? []).length)
    : CARD_H

  ctx.save()
  rrPath(ctx, CARD_X, CARD_Y, CARD_W, effectiveCardH, CARD_RX)
  ctx.clip()

  if (args.cardStyle !== 'glass') {
    ctx.clearRect(CARD_X, CARD_Y, CARD_W, effectiveCardH)
  }

  if (args.cardStyle === 'glass') {
    drawGlass(ctx, args, effectiveCardH)
    rrPath(ctx, CARD_X, CARD_Y, CARD_W, effectiveCardH, CARD_RX)
    ctx.strokeStyle = args.gpBorder
    ctx.lineWidth   = 4
    ctx.stroke()
  }

  if (args.cardStyle === 'clear-glass') {
    drawClearGlass(ctx, args, effectiveCardH)
    rrPath(ctx, CARD_X, CARD_Y, CARD_W, effectiveCardH, CARD_RX)
    ctx.strokeStyle = args.gpBorder  // 'rgba(255,255,255,0.20)' passed from StatsShareView
    ctx.lineWidth   = 2
    ctx.stroke()
  }

  if (args.metric === 'max1rm')          draw1RM(ctx, args)
  else if (args.metric === 'bodyweight') drawBW(ctx, args)
  else                                   drawVol(ctx, args)

  drawFooter(ctx, args, effectiveCardH)

  ctx.restore()

  const dataUrl = canvas.toDataURL('image/png')
  const blob    = await fetch(dataUrl).then(r => r.blob())
  return blob
}
