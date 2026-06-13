/**
 * Direct canvas 2D export for Side Graph (左グラフ) cards.
 *
 * Output: 1080×1920 RGBA PNG (logical 540×960, 2× physical scale).
 * Left ~50% of canvas is the glass card; right 50% is fully transparent.
 *
 * Axes are swapped vs. standard charts:
 *   y-axis → date (vertical, top = oldest, bottom = newest)
 *   x-axis → value (horizontal)
 *
 * MAX 1RM / Body Weight: vertical line progression (dates top→bottom, value left→right).
 * Daily Volume: horizontal bars (each row = one date, bar extends right by value).
 *
 * Chart area layout (logical coordinates):
 *   DATE_LABEL_W (44px) on the left for y-axis date labels
 *   X_LABEL_H   (20px) at the bottom for x-axis value ticks
 */

type VolBar = { label: string; value: number; isLatest: boolean; isBest: boolean }

export type SideGraphArgs = {
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

  // MAX 1RM
  exName?:           string
  bestRMDisplay?:    number
  unitLabel?:        string
  rm1Growth?:        number | null
  rm1SVGData?:       { est1rm: number }[]
  rm1Dates?:         string[]   // ISO date strings for each rm1SVGData point

  // Body Weight
  bwCurrentDisplay?: number
  bwStartDisplay?:   number
  bwChangeStr?:      string
  bwValues?:         number[]
  bwHistoryLen?:     number
  bwDates?:          string[]   // ISO date strings for each bwValues entry

  // Volume
  volCardLabel?:          string
  activeVolTotalStr?:     string
  activeVolSessionCount?: number
  volBars?:               VolBar[]

  unit?: 'kg' | 'lbs'
}

// ── Canvas dimensions (logical; physical = 2×) ────────────────────────────────
const CW = 540   // → 1080px physical
const CH = 960   // → 1920px physical

// ── Left card — widened to ~50% of story width ────────────────────────────────
const CARD_X  = 18
const CARD_Y  = 70
const CARD_W  = 255  // physical right edge: (18+255)*2 = 546px ≈ 50.6% of 1080
const CARD_H  = 820
const CARD_RX = 20

// Content left edge inside card
const CX = CARD_X + 10  // 28

// Badge
const BADGE_Y  = CARD_Y + 12  // 82
const BADGE_W  = 84
const BADGE_H  = 22
const BADGE_RX = 10

// Chart total area (header above, footer below)
const CHART_TOP = CARD_Y + 185   // 255
const CHART_BOT = CARD_Y + CARD_H - 22  // 868

// Y-axis date label column (left of plot)
const DATE_LABEL_W = 44

// X-axis value label row (below plot)
const X_LABEL_H = 20

// Plot bounds — where lines/bars actually render
const PLOT_X   = CARD_X + 10 + DATE_LABEL_W  // 72
const PLOT_W   = CARD_X + CARD_W - 8 - PLOT_X  // 18+255-8-72 = 193
const PLOT_TOP = CHART_TOP + 8   // 263
const PLOT_BOT = CHART_BOT - X_LABEL_H  // 848
const PLOT_H   = PLOT_BOT - PLOT_TOP   // 585

// X-axis label baseline (below plot)
const XLBL_Y = PLOT_BOT + 5  // 853

// suppress unused warning for CH (canvas height is set via CH*2)
void CH

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

// ── Axis helpers ──────────────────────────────────────────────────────────────

/** Pick up to `count` nice tick values within [min, max]. */
function niceXTicks(min: number, max: number, count = 3): number[] {
  if (max <= min || count < 2) return [max]
  const rng  = max - min
  const raw  = rng / (count - 1)
  const mag  = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) ?? mag * 10
  const lo   = Math.ceil(min / step) * step
  const ticks: number[] = []
  for (let t = lo; t <= max * 1.001; t = Math.round((t + step) * 1e9) / 1e9) {
    ticks.push(t)
    if (ticks.length >= count + 1) break
  }
  return ticks.filter(t => t >= min * 0.999 && t <= max * 1.001)
}

/** Pick `count` evenly-spaced non-zero ticks from 0..maxVal. */
function niceVolTicks(maxVal: number, count = 3): number[] {
  if (maxVal === 0) return []
  const thirds = Array.from({ length: count }, (_, i) => maxVal * (i + 1) / count)
  const mag    = Math.pow(10, Math.floor(Math.log10(maxVal / count)))
  const round  = (v: number) => Math.round(v / mag) * mag
  return [...new Set(thirds.map(round))].filter(t => t > 0 && t <= maxVal * 1.05)
}

/** Return up to `maxCount` evenly-spaced indices from 0..n-1. */
function sampleIndices(n: number, maxCount: number): number[] {
  if (n <= 0) return []
  const k = Math.min(maxCount, n)
  if (k === 1) return [0]
  return Array.from({ length: k }, (_, i) => Math.round(i * (n - 1) / (k - 1)))
}

/** Format an ISO date string as a compact axis label. */
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
  return lang === 'ja' ? `${mo + 1}/${da}` : `${M[mo]} ${da}`
}

function fmtWeightLabel(v: number, unitLabel: string): string {
  return `${Math.round(v * 10) / 10}${unitLabel}`
}

function fmtVolLabel(v: number, unit: 'kg' | 'lbs' | undefined): string {
  const dv = unit === 'lbs' ? v * 2.20462 : v
  if (dv >= 10000) return `${Math.round(dv / 1000)}t`
  if (dv >= 1000)  return `${(dv / 1000).toFixed(1)}t`
  return `${Math.round(dv)}${unit ?? 'kg'}`
}

// ── Glass background (fills within active clip = card area only) ──────────────

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
  rrPath(ctx, CX, BADGE_Y, BADGE_W, BADGE_H, BADGE_RX)
  ctx.fillStyle = args.badgeBg
  ctx.fill()
  ctx.font         = fnt(14, true)
  ctx.fillStyle    = args.badgeTxt
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('REPRA', CX + 12, BADGE_Y + 15)
}

// ── Line chart (MAX 1RM / Body Weight) ───────────────────────────────────────
// x = value (horizontal), y = date index (top=oldest, bottom=newest)

function drawSideLine(ctx: CanvasRenderingContext2D, args: SideGraphArgs) {
  const values = args.metric === 'max1rm'
    ? (args.rm1SVGData ?? []).map(d => d.est1rm)
    : (args.bwValues ?? [])
  const dates  = args.metric === 'max1rm' ? (args.rm1Dates ?? []) : (args.bwDates ?? [])
  const n = values.length
  if (n < 2) return

  const max = Math.max(...values)
  const min = Math.min(...values)
  const rng = max - min || max * 0.1 || 1

  const padX = 8, padY = 6
  const px = (v: number) => PLOT_X + padX + ((v - min) / rng) * (PLOT_W - 2 * padX)
  const py = (i: number) => PLOT_TOP + padY + (i / (n - 1)) * (PLOT_H - 2 * padY)

  const xTicks   = niceXTicks(min, max, 3)
  const dateIdxs = sampleIndices(n, 4)

  const gridC = args.isDarkBg ? 'rgba(255,255,255,0.13)' : 'rgba(15,23,42,0.09)'
  const lblC  = args.isDarkBg ? 'rgba(255,255,255,0.50)' : 'rgba(15,23,42,0.42)'
  const datC  = args.isDarkBg ? 'rgba(255,255,255,0.42)' : 'rgba(15,23,42,0.38)'

  // 1. Vertical dashed grid lines at x-tick positions
  ctx.save()
  ctx.setLineDash([4, 6])
  ctx.strokeStyle = gridC
  ctx.lineWidth   = 1
  xTicks.forEach(tick => {
    const gx = px(tick)
    ctx.beginPath()
    ctx.moveTo(gx, PLOT_TOP)
    ctx.lineTo(gx, PLOT_BOT)
    ctx.stroke()
  })
  ctx.restore()

  // 2. X-axis value labels (below plot)
  ctx.save()
  ctx.font         = fnt(10, false)
  ctx.fillStyle    = lblC
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'top'
  xTicks.forEach(tick => {
    ctx.fillText(fmtWeightLabel(tick, args.unitLabel ?? ''), px(tick), XLBL_Y)
  })
  ctx.restore()

  // 3. Y-axis date labels (right-aligned, left of plot area)
  if (dates.length >= n) {
    ctx.save()
    ctx.font         = fnt(9, false)
    ctx.fillStyle    = datC
    ctx.textAlign    = 'right'
    ctx.textBaseline = 'middle'
    dateIdxs.forEach(idx => {
      if (idx < n && dates[idx]) {
        ctx.fillText(fmtDateLabel(dates[idx]!, args.cardLang), PLOT_X - 4, py(idx))
      }
    })
    ctx.restore()
  }

  // 4. Area fill (to left of the line)
  if (args.areaFill && args.areaFill !== 'none') {
    ctx.beginPath()
    ctx.moveTo(PLOT_X + padX, py(0))
    values.forEach((v, i) => ctx.lineTo(px(v), py(i)))
    ctx.lineTo(PLOT_X + padX, py(n - 1))
    ctx.closePath()
    ctx.fillStyle = args.areaFill
    ctx.fill()
  }

  // 5. Line
  const pts = values.map((v, i) => [px(v), py(i)] as [number, number])
  ctx.beginPath()
  ctx.moveTo(pts[0]![0], pts[0]![1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1])
  ctx.strokeStyle = args.graphAccentHex
  ctx.lineWidth   = 2.5
  ctx.lineJoin    = 'round'
  ctx.lineCap     = 'round'
  ctx.stroke()

  // 6. First dot (oldest data point)
  const [fx, fy] = pts[0]!
  const fdot = args.isDarkBg ? 'rgba(255,255,255,0.30)' : 'rgba(17,24,39,0.30)'
  ctx.beginPath(); ctx.arc(fx, fy, 2.8, 0, Math.PI * 2)
  ctx.fillStyle = fdot; ctx.fill()

  // 7. Latest dot with glow rings
  const [lx, ly] = pts[pts.length - 1]!
  ctx.fillStyle = args.graphLatestHex
  ctx.globalAlpha = 0.08; ctx.beginPath(); ctx.arc(lx, ly, 9.7, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 0.28; ctx.beginPath(); ctx.arc(lx, ly, 5.5, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 1.00; ctx.beginPath(); ctx.arc(lx, ly, 3.9, 0, Math.PI * 2); ctx.fill()
}

// ── Horizontal bar chart (Daily Volume) ──────────────────────────────────────
// y = bar index (date, top=oldest), bar extends right from PLOT_X by value

function drawSideBars(ctx: CanvasRenderingContext2D, args: SideGraphArgs) {
  const bars = args.volBars ?? []
  if (!bars.length) return
  const maxVal = Math.max(...bars.map(b => b.value))
  if (maxVal === 0) return
  const n = bars.length

  const xTicks   = niceVolTicks(maxVal, 3)
  const dateIdxs = sampleIndices(n, 4)

  const slotH = PLOT_H / n
  const barH  = Math.max(slotH * 0.52, 1.2)
  const rad   = Math.min(4, barH / 3)

  const gridC = args.isDarkBg ? 'rgba(255,255,255,0.13)' : 'rgba(15,23,42,0.09)'
  const lblC  = args.isDarkBg ? 'rgba(255,255,255,0.50)' : 'rgba(15,23,42,0.42)'
  const datC  = args.isDarkBg ? 'rgba(255,255,255,0.42)' : 'rgba(15,23,42,0.38)'

  // Bar right edge at value v
  const bxOf = (v: number) => PLOT_X + (v / maxVal) * PLOT_W * 0.92

  // 1. Vertical dashed grid lines
  ctx.save()
  ctx.setLineDash([4, 6])
  ctx.strokeStyle = gridC
  ctx.lineWidth   = 1
  xTicks.forEach(tick => {
    const gx = bxOf(tick)
    ctx.beginPath()
    ctx.moveTo(gx, PLOT_TOP)
    ctx.lineTo(gx, PLOT_BOT)
    ctx.stroke()
  })
  ctx.restore()

  // 2. X-axis value labels (below plot)
  ctx.save()
  ctx.font         = fnt(10, false)
  ctx.fillStyle    = lblC
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'top'
  xTicks.forEach(tick => {
    ctx.fillText(fmtVolLabel(tick, args.unit), bxOf(tick), XLBL_Y)
  })
  ctx.restore()

  // 3. Y-axis date labels (right-aligned, left of bars)
  ctx.save()
  ctx.font         = fnt(9, false)
  ctx.fillStyle    = datC
  ctx.textAlign    = 'right'
  ctx.textBaseline = 'middle'
  dateIdxs.forEach(idx => {
    if (idx < n && bars[idx]) {
      const gy = PLOT_TOP + (idx + 0.5) * slotH
      ctx.fillText(fmtDateLabel(bars[idx]!.label, args.cardLang), PLOT_X - 4, gy)
    }
  })
  ctx.restore()

  // 4. Draw bars
  bars.forEach((bar, i) => {
    const bw    = Math.max((bar.value / maxVal) * PLOT_W * 0.92, 1.5)
    const by    = PLOT_TOP + i * slotH + (slotH - barH) / 2
    const fill  = (bar.isLatest || bar.isBest) ? args.graphLatestHex : args.graphAccentHex
    ctx.globalAlpha = bar.isLatest ? 1 : bar.isBest ? 0.82 : 0.38
    ctx.fillStyle   = fill
    ctx.beginPath()
    ctx.moveTo(PLOT_X + rad, by)
    ctx.lineTo(PLOT_X + bw - rad, by)
    ctx.arcTo(PLOT_X + bw, by,           PLOT_X + bw, by + rad,   rad)
    ctx.lineTo(PLOT_X + bw, by + barH)
    ctx.lineTo(PLOT_X,      by + barH)
    ctx.lineTo(PLOT_X,      by + rad)
    ctx.arcTo(PLOT_X,       by,           PLOT_X + rad, by,        rad)
    ctx.closePath()
    ctx.fill()
  })
  ctx.globalAlpha = 1
}

// ── Header content ────────────────────────────────────────────────────────────

function drawHeader1RM(ctx: CanvasRenderingContext2D, args: SideGraphArgs) {
  drawBadge(ctx, args)
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'alphabetic'

  ctx.font      = fnt(13, true)
  ctx.fillStyle = args.graphAccentHex
  ctx.fillText(args.cardLang === 'ja' ? '1RM推移' : '1RM PROGRESS', CX, BADGE_Y + 40)

  ctx.font      = fnt(17, true)
  ctx.fillStyle = primaryText(args.isDarkBg)
  ctx.fillText(args.exName ?? '', CX, BADGE_Y + 64)

  ctx.font      = fnt(36, true)
  ctx.fillStyle = args.graphAccentHex
  ctx.fillText(String(args.bestRMDisplay ?? ''), CX, BADGE_Y + 112)

  ctx.font      = fnt(12, false)
  ctx.fillStyle = ptxt(args.isDarkBg, 0.50)
  ctx.fillText(`${args.unitLabel ?? ''} ${args.cardLang === 'ja' ? 'ベスト' : 'best'}`, CX, BADGE_Y + 132)

  const growth = args.rm1Growth
  if (growth !== null && growth !== undefined) {
    ctx.font      = fnt(14, true)
    ctx.fillStyle = growth >= 0 ? '#4ade80' : '#f87171'
    ctx.fillText(`${growth >= 0 ? '+' : ''}${growth}${args.unitLabel ?? ''}`, CX, BADGE_Y + 154)
  }
}

function drawHeaderBW(ctx: CanvasRenderingContext2D, args: SideGraphArgs) {
  drawBadge(ctx, args)
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'alphabetic'

  ctx.font      = fnt(13, true)
  ctx.fillStyle = args.graphAccentHex
  ctx.fillText(args.cardLang === 'ja' ? '体重' : 'BODY WEIGHT', CX, BADGE_Y + 40)

  const hasBoth = (args.bwHistoryLen ?? 0) >= 2
  if (hasBoth) {
    ctx.font      = fnt(13, false)
    ctx.fillStyle = ptxt(args.isDarkBg, 0.55)
    ctx.fillText(`${args.bwStartDisplay ?? ''} → ${args.bwCurrentDisplay ?? ''}`, CX, BADGE_Y + 62)
  }

  ctx.font      = fnt(36, true)
  ctx.fillStyle = args.graphAccentHex
  ctx.fillText(String(args.bwCurrentDisplay ?? ''), CX, hasBoth ? BADGE_Y + 106 : BADGE_Y + 92)

  ctx.font      = fnt(12, false)
  ctx.fillStyle = ptxt(args.isDarkBg, 0.50)
  ctx.fillText(args.unitLabel ?? '', CX, hasBoth ? BADGE_Y + 126 : BADGE_Y + 112)

  ctx.font      = fnt(14, true)
  ctx.fillStyle = args.graphAccentHex
  ctx.fillText(`${args.bwChangeStr ?? ''}${args.unitLabel ?? ''}`, CX, hasBoth ? BADGE_Y + 150 : BADGE_Y + 134)
}

function drawHeaderVol(ctx: CanvasRenderingContext2D, args: SideGraphArgs) {
  drawBadge(ctx, args)
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'alphabetic'

  ctx.font      = fnt(13, true)
  ctx.fillStyle = args.graphAccentHex
  ctx.fillText(args.cardLang === 'ja' ? '総重量' : 'DAILY VOLUME', CX, BADGE_Y + 40)

  ctx.font      = fnt(17, true)
  ctx.fillStyle = primaryText(args.isDarkBg)
  ctx.fillText(args.volCardLabel ?? '', CX, BADGE_Y + 64)

  ctx.font      = fnt(30, true)
  ctx.fillStyle = args.graphAccentHex
  ctx.fillText(args.activeVolTotalStr ?? '', CX, BADGE_Y + 108)

  ctx.font      = fnt(12, false)
  ctx.fillStyle = ptxt(args.isDarkBg, 0.45)
  ctx.fillText(args.cardLang === 'ja' ? '合計' : 'total', CX, BADGE_Y + 128)

  ctx.font      = fnt(11, false)
  ctx.fillStyle = ptxt(args.isDarkBg, 0.35)
  ctx.fillText(
    `${args.activeVolSessionCount ?? 0} ${args.cardLang === 'ja' ? 'セッション' : 'sessions'}`,
    CX, BADGE_Y + 148,
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function drawFooter(ctx: CanvasRenderingContext2D, args: SideGraphArgs) {
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font         = fnt(10, false)
  ctx.fillStyle    = ptxt(args.isDarkBg, 0.22)
  ctx.fillText('Made with REPRA', CX, CARD_Y + CARD_H - 10)
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function exportSideGraphCard(args: SideGraphArgs): Promise<Blob> {
  await document.fonts.ready
  await new Promise<void>(r => requestAnimationFrame(() => r()))

  const canvas   = document.createElement('canvas')
  canvas.width   = CW * 2   // 1080px physical
  canvas.height  = CH * 2   // 1920px physical
  const ctx      = canvas.getContext('2d', { alpha: true })
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.scale(2, 2)

  // Clip to card area — right ~50% of canvas stays fully transparent
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

  if (args.metric === 'max1rm')          drawHeader1RM(ctx, args)
  else if (args.metric === 'bodyweight') drawHeaderBW(ctx, args)
  else                                   drawHeaderVol(ctx, args)

  if (args.metric === 'volume') drawSideBars(ctx, args)
  else                          drawSideLine(ctx, args)

  drawFooter(ctx, args)

  ctx.restore()

  const dataUrl = canvas.toDataURL('image/png')
  const blob    = await fetch(dataUrl).then(r => r.blob())
  return blob
}
