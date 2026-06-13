/**
 * Direct canvas 2D export for Side Graph (左グラフ) cards.
 *
 * Output: 1080×1920 RGBA PNG (logical 540×960, 2× physical scale).
 * Left ~37% of canvas contains the glass card; right 63% is fully transparent.
 *
 * Axes are swapped vs. standard charts:
 *   y-axis → date (vertical, top = oldest, bottom = newest)
 *   x-axis → value (horizontal)
 *
 * MAX 1RM / Body Weight: vertical line progression (dates top→bottom, value left→right).
 * Daily Volume: horizontal bars (each row = one date, bar extends right by value).
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

  unit?: 'kg' | 'lbs'
}

// ── Canvas dimensions (logical) ──────────────────────────────────────────────
const CW = 540   // → 1080px physical
const CH = 960   // → 1920px physical

// ── Left card dimensions ─────────────────────────────────────────────────────
const CARD_X  = 18
const CARD_Y  = 70
const CARD_W  = 200
const CARD_H  = 820
const CARD_RX = 20

// Content left edge inside card
const CX = CARD_X + 10  // 28

// Badge dimensions
const BADGE_Y  = CARD_Y + 12  // 82
const BADGE_W  = 84
const BADGE_H  = 22
const BADGE_RX = 10

// Chart area (bulk of card below header)
const CHART_X   = CARD_X + 10  // 28
const CHART_TOP = CARD_Y + 185  // 255
const CHART_W   = CARD_W - 20  // 180
const CHART_BOT = CARD_Y + CARD_H - 28  // 862
const CHART_H   = CHART_BOT - CHART_TOP  // 607

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

// ── Line chart with swapped axes (MAX 1RM / Body Weight) ─────────────────────
// x = value (horizontal), y = date index (vertical, top=oldest, bottom=newest)

function drawSideLine(ctx: CanvasRenderingContext2D, args: SideGraphArgs) {
  const values = args.metric === 'max1rm'
    ? (args.rm1SVGData ?? []).map(d => d.est1rm)
    : (args.bwValues ?? [])
  if (values.length < 2) return

  const max = Math.max(...values)
  const min = Math.min(...values)
  const rng = max - min || max * 0.1 || 1

  const padX = 8, padY = 8
  const px = (v: number) => CHART_X + padX + ((v - min) / rng) * (CHART_W - 2 * padX)
  const py = (i: number) => CHART_TOP + padY + (i / (values.length - 1)) * (CHART_H - 2 * padY)

  const pts = values.map((v, i) => [px(v), py(i)] as [number, number])
  const [fx, fy] = pts[0]!
  const [lx, ly] = pts[pts.length - 1]!

  // Area fill to the left of the line
  if (args.areaFill && args.areaFill !== 'none') {
    ctx.beginPath()
    ctx.moveTo(CHART_X + padX, pts[0]![1])
    pts.forEach(([x, y]) => ctx.lineTo(x, y))
    ctx.lineTo(CHART_X + padX, pts[pts.length - 1]![1])
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

// ── Horizontal bar chart (Daily Volume) ──────────────────────────────────────
// y = bar index (date, top=oldest), bar extends right by value

function drawSideBars(ctx: CanvasRenderingContext2D, args: SideGraphArgs) {
  const bars = args.volBars ?? []
  if (!bars.length) return
  const maxVal = Math.max(...bars.map(b => b.value))
  if (maxVal === 0) return

  const slotH = CHART_H / bars.length
  const barH  = Math.max(slotH * 0.55, 1.2)
  const rad   = Math.min(4, barH / 3)

  bars.forEach((bar, i) => {
    const bw     = Math.max((bar.value / maxVal) * (CHART_W * 0.92), 1.5)
    const by     = CHART_TOP + i * slotH + (slotH - barH) / 2
    const fill   = (bar.isLatest || bar.isBest) ? args.graphLatestHex : args.graphAccentHex
    ctx.globalAlpha = bar.isLatest ? 1 : bar.isBest ? 0.82 : 0.38
    ctx.fillStyle   = fill
    ctx.beginPath()
    ctx.moveTo(CHART_X + rad, by)
    ctx.lineTo(CHART_X + bw - rad, by)
    ctx.arcTo(CHART_X + bw, by,      CHART_X + bw, by + rad, rad)
    ctx.lineTo(CHART_X + bw, by + barH)
    ctx.lineTo(CHART_X,      by + barH)
    ctx.lineTo(CHART_X,      by + rad)
    ctx.arcTo(CHART_X,       by,      CHART_X + rad, by,       rad)
    ctx.closePath()
    ctx.fill()
  })
  ctx.globalAlpha = 1
}

// ── Header content ─────────────────────────────────────────────────────────────

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

// ── Footer ─────────────────────────────────────────────────────────────────────

function drawFooter(ctx: CanvasRenderingContext2D, args: SideGraphArgs) {
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font         = fnt(10, false)
  ctx.fillStyle    = ptxt(args.isDarkBg, 0.22)
  ctx.fillText('Made with REPRA', CX, CARD_Y + CARD_H - 10)
}

// ── Main export ────────────────────────────────────────────────────────────────

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

  // Clip to card area — right 63% of canvas stays fully transparent
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
