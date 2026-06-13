/**
 * SVG-direct → canvas → PNG export for 4:1 (bottom) graph story cards.
 *
 * html-to-image / foreignObject is unreliable on iOS Safari at extreme aspect
 * ratios: rounded-corner clipping breaks, glass gradients bleed, and the result
 * is either white-cornered or blank.  This module bypasses the DOM renderer by
 * building an SVG string, drawing it to an off-screen canvas, and returning a
 * PNG blob — no html-to-image involved.
 *
 * Only called when graphLayout === 'bottom'.  All other layouts keep captureElement.
 */

type VolBar = { label: string; value: number; isLatest: boolean; isBest: boolean }

export type FourByOneArgs = {
  metric:           'max1rm' | 'bodyweight' | 'volume'
  cardStyle:        'glass'  | 'transparent'
  graphAccentHex:   string   // gpAccent — text / graph stroke color
  graphLatestHex:   string   // gpLatest — last-point dot color
  areaFill:         string   // area polygon fill under line ('none' in transparent)
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
}

// ── Layout constants (1080 × 270) ─────────────────────────────────────────────

const W  = 1080
const H  = 270
const CY = 135

const PAD_H   = 44   // 16px CSS × 2.75
const GAP     = 38   // 14px CSS × 2.75
const LEFT_W  = 240
const RIGHT_W = 230
const LEFT_X  = PAD_H
const CTR_X   = LEFT_X + LEFT_W + GAP
const CTR_W   = W - 2 * PAD_H - 2 * GAP - LEFT_W - RIGHT_W  // ≈ 456
const RIGHT_X = CTR_X + CTR_W + GAP                           // right edge for text-anchor="end"

// ── Helpers ───────────────────────────────────────────────────────────────────

function e(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function ptxt(isDarkBg: boolean, a: number): string {
  return isDarkBg ? `rgba(255,255,255,${a})` : `rgba(17,24,39,${a})`
}

function textPrimary(isDarkBg: boolean): string {
  return isDarkBg ? '#ffffff' : '#111827'
}

function firstDotColor(isDarkBg: boolean): string {
  return isDarkBg ? 'rgba(255,255,255,0.30)' : 'rgba(17,24,39,0.30)'
}

// ── Glass gradient defs ───────────────────────────────────────────────────────

function glassDefs(accentHex: string, isDark: boolean): string {
  const r = parseInt(accentHex.slice(1, 3), 16)
  const g = parseInt(accentHex.slice(3, 5), 16)
  const b = parseInt(accentHex.slice(5, 7), 16)

  let c1: string
  let c2: string

  if (!isDark) {
    // Pearl-white: warm frosted glass
    c1 = 'rgba(245,244,239,0.68)'
    c2 = 'rgba(237,236,229,0.68)'
  } else if (r > 200 && g > 200 && b > 200) {
    // Premium-black: near-black glass
    c1 = 'rgba(17,17,20,0.62)'
    c2 = 'rgba(7,7,9,0.62)'
  } else {
    // Colored dark presets
    const dr = Math.round(r * 0.16)
    const dg = Math.round(g * 0.13)
    const db = Math.round(b * 0.15)
    const er = Math.round(r * 0.09)
    const eg = Math.round(g * 0.07)
    const eb = Math.round(b * 0.09)
    c1 = `rgba(${dr},${dg},${db},0.62)`
    c2 = `rgba(${er},${eg},${eb},0.62)`
  }

  return `
    <linearGradient id="baseGrad" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%"   stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <linearGradient id="topShimmer" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.10"/>
      <stop offset="7%"   stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="accentGlow" cx="12%" cy="100%" r="40%" gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="rgb(${r},${g},${b})" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="rgb(0,0,0)"          stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="whiteGlow" cx="88%" cy="4%" r="28%" gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.13"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>`
}

function glassRects(border: string): string {
  return `
    <rect width="${W}" height="${H}" fill="url(#baseGrad)"/>
    <rect width="${W}" height="${H}" fill="url(#topShimmer)"/>
    <rect width="${W}" height="${H}" fill="url(#accentGlow)"/>
    <rect width="${W}" height="${H}" fill="url(#whiteGlow)"/>
    <rect width="${W}" height="${H}" rx="50" ry="50" fill="none"
          stroke="${border}" stroke-width="2"/>`
}

// ── Chart SVG fragments ───────────────────────────────────────────────────────

function lineChart(
  values: number[],
  accentHex: string,
  latestHex: string,
  areaFill: string,
  isDarkBg: boolean,
): string {
  if (values.length < 2) return ''

  const chartH   = Math.round(H * 0.62)
  const y0       = CY - Math.round(chartH / 2)
  const padX     = 27
  const padYt    = 17
  const padYb    = 10

  const max = Math.max(...values)
  const min = Math.min(...values)
  const rng = max - min || max * 0.1 || 1

  const px = (i: number) =>
    CTR_X + padX + (i / (values.length - 1)) * (CTR_W - 2 * padX)
  const py = (v: number) =>
    y0 + padYt + ((max - v) / rng) * (chartH - padYt - padYb)

  const pts  = values.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`)
  const linePts  = pts.join(' ')
  const areaPts  = `${(CTR_X + padX).toFixed(1)},${(y0 + chartH)} ${linePts} ${(CTR_X + CTR_W - padX).toFixed(1)},${(y0 + chartH)}`

  const lx = px(values.length - 1)
  const ly = py(values[values.length - 1])
  const fx = px(0)
  const fy = py(values[0])

  const fdot = firstDotColor(isDarkBg)

  return `
    ${areaFill !== 'none' ? `<polygon points="${areaPts}" fill="${areaFill}"/>` : ''}
    <polyline points="${linePts}" fill="none" stroke="${accentHex}"
              stroke-width="2.5" stroke-linejoin="miter" stroke-linecap="butt"/>
    <circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="2.8" fill="${fdot}"/>
    <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="9.7" fill="${latestHex}" opacity="0.08"/>
    <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="5.5" fill="${latestHex}" opacity="0.28"/>
    <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="3.9" fill="${latestHex}"/>`
}

function barChart(
  bars: VolBar[],
  accentHex: string,
  latestHex: string,
): string {
  if (!bars.length) return ''

  const maxVal = Math.max(...bars.map(b => b.value))
  if (maxVal === 0) return ''

  const chartH = Math.round(H * 0.65)
  const yBot   = CY + Math.round(chartH / 2)

  const gap    = Math.max(0.4, 0.8 - bars.length * 0.005) * (CTR_W / 100)
  const slotW  = CTR_W / bars.length
  const barW   = Math.max(slotW - gap, 0.5)
  const rad    = Math.min(4, barW / 3)

  return bars.map((b, i) => {
    const bh      = Math.max((b.value / maxVal) * chartH * 0.92, 1.7)
    const bx      = CTR_X + i * slotW + (slotW - barW) / 2
    const by      = yBot - bh
    const isHi    = b.isLatest || b.isBest
    const fill    = isHi ? latestHex : accentHex
    const opacity = b.isLatest ? 1 : b.isBest ? 0.82 : 0.38

    return `<rect x="${bx.toFixed(2)}" y="${by.toFixed(2)}"
              width="${Math.max(barW, 0.5).toFixed(2)}" height="${bh.toFixed(2)}"
              rx="${rad.toFixed(2)}" ry="${rad.toFixed(2)}"
              fill="${fill}" opacity="${opacity}"/>`
  }).join('\n    ')
}

// ── Font string helper ────────────────────────────────────────────────────────

const FF = 'system-ui,-apple-system,sans-serif'

function txt(
  x: number, y: number, fontSize: number, fontWeight: number,
  fill: string, anchor: 'start' | 'middle' | 'end',
  content: string,
  extra = '',
): string {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}"
    font-family="${FF}" font-size="${fontSize}" font-weight="${fontWeight}"
    fill="${fill}"${extra}>${e(content)}</text>`
}

// ── Badge ─────────────────────────────────────────────────────────────────────

function badge(badgeBg: string, badgeTxt: string): string {
  const bx = LEFT_X, by = 84, bw = 82, bh = 28, rx = 7
  const tx = bx + bw / 2, ty = by + 20
  return `
    <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${rx}" ry="${rx}" fill="${badgeBg}"/>
    <text x="${tx}" y="${ty}" text-anchor="middle"
      font-family="${FF}" font-size="20" font-weight="900" fill="${badgeTxt}"
      letter-spacing="3">REPRA</text>`
}

// ── Left column per metric ────────────────────────────────────────────────────

function leftMax1RM(args: FourByOneArgs): string {
  const tp    = textPrimary(args.isDarkBg)
  const label = args.cardLang === 'ja' ? '1RM推移' : '1RM PROGRESS'
  return `
    ${badge(args.badgeBg, args.badgeTxt)}
    ${txt(LEFT_X, 152, 33, 900, tp,              'start', args.exName ?? '')}
    ${txt(LEFT_X, 180, 20, 700, args.graphAccentHex, 'start', label, ' letter-spacing="2"')}`
}

function leftBodyWeight(args: FourByOneArgs): string {
  const tp     = textPrimary(args.isDarkBg)
  const label  = args.cardLang === 'ja' ? '体重' : 'BODY WEIGHT'
  const hasBoth = (args.bwHistoryLen ?? 0) >= 2
  const valLine = hasBoth
    ? `${args.bwStartDisplay} → ${args.bwCurrentDisplay} ${args.unitLabel ?? ''}`
    : `${args.bwCurrentDisplay} ${args.unitLabel ?? ''}`
  return `
    ${badge(args.badgeBg, args.badgeTxt)}
    ${txt(LEFT_X, 138, 22, 700, args.graphAccentHex, 'start', label, ' letter-spacing="2"')}
    ${txt(LEFT_X, 172, 28, 700, tp,                  'start', valLine)}`
}

function leftVolume(args: FourByOneArgs): string {
  const tp    = textPrimary(args.isDarkBg)
  const label = args.cardLang === 'ja' ? '総重量' : 'DAILY VOLUME'
  return `
    ${badge(args.badgeBg, args.badgeTxt)}
    ${txt(LEFT_X, 138, 22, 700, args.graphAccentHex,  'start', label, ' letter-spacing="2"')}
    ${txt(LEFT_X, 178, 33, 900, tp,                   'start', args.volCardLabel ?? '')}`
}

// ── Right column per metric ───────────────────────────────────────────────────

function rightMax1RM(args: FourByOneArgs): string {
  const sec     = ptxt(args.isDarkBg, 0.50)
  const growth  = args.rm1Growth
  const growthColor = (growth !== null && growth !== undefined && growth >= 0) ? '#4ade80' : '#f87171'
  return `
    ${txt(RIGHT_X, 128, 83, 900, args.graphAccentHex, 'end', String(args.bestRMDisplay ?? ''))}
    ${txt(RIGHT_X, 158, 25, 400, sec, 'end', `${args.unitLabel ?? ''} ${args.cardLang === 'ja' ? 'ベスト' : 'best'}`)}
    ${growth !== null && growth !== undefined
      ? txt(RIGHT_X, 186, 28, 700, growthColor, 'end', `${growth >= 0 ? '+' : ''}${growth}`)
      : ''}`
}

function rightBodyWeight(args: FourByOneArgs): string {
  const sec = ptxt(args.isDarkBg, 0.50)
  return `
    ${txt(RIGHT_X, 128, 83, 900, args.graphAccentHex, 'end', String(args.bwCurrentDisplay ?? ''))}
    ${txt(RIGHT_X, 158, 25, 400, sec,                 'end', args.unitLabel ?? '')}
    ${txt(RIGHT_X, 186, 28, 700, args.graphAccentHex, 'end', `${args.bwChangeStr ?? ''}${args.unitLabel ?? ''}`)}`
}

function rightVolume(args: FourByOneArgs): string {
  const sec1 = ptxt(args.isDarkBg, 0.45)
  const sec2 = ptxt(args.isDarkBg, 0.35)
  const sessLabel = args.cardLang === 'ja' ? 'セッション' : 'sessions'
  return `
    ${txt(RIGHT_X, 130, 61, 900, args.graphAccentHex, 'end', args.activeVolTotalStr ?? '')}
    ${txt(RIGHT_X, 157, 22, 400, sec1,                'end', args.cardLang === 'ja' ? '合計' : 'total')}
    ${txt(RIGHT_X, 181, 24, 400, sec2,                'end', `${args.activeVolSessionCount ?? 0} ${sessLabel}`)}`
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function exportFourByOneCard(args: FourByOneArgs): Promise<Blob> {
  const isGlass = args.cardStyle === 'glass'

  // Defs section (gradients + clip path)
  const defs = `<defs>
    ${isGlass ? glassDefs(args.glassAccentHex, args.glassIsDark) : ''}
    <clipPath id="card">
      <rect width="${W}" height="${H}" rx="50" ry="50"/>
    </clipPath>
  </defs>`

  // Background
  const bg = isGlass ? glassRects(args.gpBorder) : ''

  // Left column
  const left =
    args.metric === 'max1rm'     ? leftMax1RM(args) :
    args.metric === 'bodyweight' ? leftBodyWeight(args) :
                                   leftVolume(args)

  // Center chart
  const chart =
    args.metric === 'volume'
      ? barChart(args.volBars ?? [], args.graphAccentHex, args.graphLatestHex)
      : lineChart(
          args.metric === 'max1rm'
            ? (args.rm1SVGData ?? []).map(d => d.est1rm)
            : (args.bwValues ?? []),
          args.graphAccentHex,
          args.graphLatestHex,
          args.areaFill,
          args.isDarkBg,
        )

  // Right column
  const right =
    args.metric === 'max1rm'     ? rightMax1RM(args) :
    args.metric === 'bodyweight' ? rightBodyWeight(args) :
                                   rightVolume(args)

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  ${defs}
  <g clip-path="url(#card)">
    ${bg}
    ${left}
    ${chart}
    ${right}
  </g>
</svg>`

  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url     = URL.createObjectURL(svgBlob)

  return new Promise<Blob>((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => {
      const canvas    = document.createElement('canvas')
      canvas.width    = W
      canvas.height   = H
      const ctx       = canvas.getContext('2d')
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('No 2D context')); return }
      ctx.drawImage(img, 0, 0, W, H)
      URL.revokeObjectURL(url)
      canvas.toBlob(
        b => b ? resolve(b) : reject(new Error('canvas.toBlob returned null')),
        'image/png',
      )
    }
    img.onerror = (err) => { URL.revokeObjectURL(url); reject(err) }
    img.src = url
  })
}
