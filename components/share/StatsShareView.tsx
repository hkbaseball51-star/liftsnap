'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Share2, ArrowLeft } from 'lucide-react'

type RMPoint = { date: string; label: string; est1rm: number }
type VolPoint = { date: string; label: string; volume: number }
type BWPoint = { date: string; label: string; weight: number }

export type StatsData =
  | { type: 'max1rm'; exerciseName: string; bestRM: number; bestDate: string; bestSet: { weight: number; reps: number } | null; history: RMPoint[]; sessionCount: number }
  | { type: 'volume'; exerciseName: string; totalVolume: number; sessionCount: number; history: VolPoint[] }
  | { type: 'bodyweight'; currentWeight: number; change: number; history: BWPoint[] }

type Theme = 'dark' | 'transparent'
type Accent = 'orange' | 'purple' | 'dark'

/* ── Per-accent design tokens ─────────────────────────────── */
const AC: Record<Accent, {
  hex: string
  badgeBg: string
  badgeBorder: string
  badgeText: string
  cardBorder: string
  topLine: string
  barActive: string
  barInactive: string
  barTrack: string
}> = {
  orange: {
    hex: '#ff6b00',
    badgeBg: 'rgba(255,107,0,0.14)',
    badgeBorder: 'rgba(255,107,0,0.3)',
    badgeText: '#ff6b00',
    cardBorder: 'rgba(255,107,0,0.35)',
    topLine: '#ff6b00',
    barActive: '#ff6b00',
    barInactive: 'rgba(255,107,0,0.42)',
    barTrack: 'rgba(255,107,0,0.08)',
  },
  purple: {
    hex: '#a855f7',
    badgeBg: 'rgba(168,85,247,0.14)',
    badgeBorder: 'rgba(168,85,247,0.3)',
    badgeText: '#a855f7',
    cardBorder: 'rgba(168,85,247,0.35)',
    topLine: '#a855f7',
    barActive: '#a855f7',
    barInactive: 'rgba(168,85,247,0.42)',
    barTrack: 'rgba(168,85,247,0.08)',
  },
  dark: {
    hex: 'rgba(255,255,255,0.65)',
    badgeBg: 'rgba(255,255,255,0.06)',
    badgeBorder: 'rgba(255,255,255,0.18)',
    badgeText: 'rgba(255,255,255,0.6)',
    cardBorder: 'rgba(255,255,255,0.1)',
    topLine: 'rgba(255,255,255,0.18)',
    barActive: 'rgba(255,255,255,0.55)',
    barInactive: 'rgba(255,255,255,0.18)',
    barTrack: 'rgba(255,255,255,0.04)',
  },
}

/* ── Canvas helpers ───────────────────────────────────────── */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function drawBars(
  ctx: CanvasRenderingContext2D,
  data: { label: string; value: number }[],
  x: number, y: number, w: number, h: number,
  ac: typeof AC[Accent]
) {
  if (!data.length) return
  const maxVal = Math.max(...data.map(d => d.value))
  const slotW = Math.floor(w / data.length)
  const barW = Math.max(slotW - 16, 20)
  data.forEach((point, i) => {
    const barH = maxVal > 0 ? Math.round((point.value / maxVal) * h * 0.88) : 4
    const bx = x + i * slotW + Math.floor((slotW - barW) / 2)
    ctx.fillStyle = ac.barTrack
    ctx.fillRect(bx, y, barW, h)
    ctx.fillStyle = i === data.length - 1 ? ac.barActive : ac.barInactive
    ctx.fillRect(bx, y + h - barH, barW, barH)
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    ctx.font = '24px system-ui, -apple-system, sans-serif'
    const lbl = point.label.replace(/[A-Za-z]+ /, '')
    const lw = ctx.measureText(lbl).width
    ctx.fillText(lbl, bx + (barW - lw) / 2, y + h + 42)
  })
}

/* ── Canvas card generation ───────────────────────────────── */
async function generateStatsCard(data: StatsData, theme: Theme, accent: Accent): Promise<Blob> {
  const W = 1080, H = 1920
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!
  const ac = AC[accent]
  const heroColor = accent === 'dark' ? '#ffffff' : ac.hex
  const font = (size: number, weight = 400) =>
    `${weight > 400 ? `bold ` : weight === 400 ? '' : `${weight} `}${size}px system-ui, -apple-system, sans-serif`

  // Background
  ctx.fillStyle = theme === 'dark' ? '#0a0a0a' : 'rgba(12,12,12,0.76)'
  ctx.fillRect(0, 0, W, H)

  // Top accent line
  ctx.fillStyle = ac.topLine
  ctx.fillRect(0, 0, W, 8)

  // Badge
  ctx.fillStyle = ac.badgeBg
  roundRect(ctx, 80, 80, 280, 68, 12)
  ctx.fill()
  if (accent === 'dark') {
    ctx.strokeStyle = ac.badgeBorder
    ctx.lineWidth = 2
    roundRect(ctx, 80, 80, 280, 68, 12)
    ctx.stroke()
  }
  ctx.fillStyle = ac.badgeText
  ctx.font = font(28, 700)
  ctx.fillText('LIFTSNAP', 110, 126)

  const divider = (y: number) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(80, y); ctx.lineTo(W - 80, y); ctx.stroke()
  }

  if (data.type === 'max1rm') {
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = font(36, 500); ctx.fillText('MAX 1RM', 80, 260)
    ctx.fillStyle = '#fff'; ctx.font = font(74, 700)
    ctx.fillText(data.exerciseName.length > 20 ? data.exerciseName.slice(0, 18) + '…' : data.exerciseName, 80, 380)
    ctx.fillStyle = heroColor; ctx.font = font(168, 700)
    const rmStr = String(data.bestRM)
    ctx.fillText(rmStr, 80, 600)
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = font(60, 700)
    ctx.fillText('kg', 80 + ctx.measureText(rmStr).width + 20, 590)
    if (data.bestSet) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = font(38)
      ctx.fillText(`Best Set  ${data.bestSet.weight} × ${data.bestSet.reps} reps`, 80, 680)
    }
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.font = font(30); ctx.fillText(data.bestDate, 80, 740)
    divider(800)
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = font(30, 500); ctx.fillText('1RM PROGRESSION', 80, 860)
    drawBars(ctx, data.history.map(d => ({ label: d.label, value: d.est1rm })), 80, 900, W - 160, 260, ac)
    divider(1230)
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = font(30); ctx.fillText(`${data.sessionCount} SESSIONS LOGGED`, 80, 1290)
    data.history.slice(-5).reverse().forEach((point, i) => {
      const iy = 1370 + i * 86
      ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.font = font(36); ctx.fillText(point.label, 80, iy)
      const val = `${point.est1rm} kg`
      ctx.fillStyle = point.est1rm === data.bestRM ? heroColor : 'rgba(255,255,255,0.65)'
      ctx.font = font(36, 700); ctx.fillText(val, W - 80 - ctx.measureText(val).width, iy)
    })
  }

  if (data.type === 'volume') {
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = font(36, 500); ctx.fillText('DAILY VOLUME', 80, 260)
    ctx.fillStyle = '#fff'; ctx.font = font(74, 700)
    ctx.fillText(data.exerciseName.length > 20 ? data.exerciseName.slice(0, 18) + '…' : data.exerciseName, 80, 380)
    const volStr = data.totalVolume >= 10000 ? `${(data.totalVolume / 1000).toFixed(1)}k` : data.totalVolume.toLocaleString()
    ctx.fillStyle = heroColor; ctx.font = font(168, 700); ctx.fillText(volStr, 80, 600)
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = font(60, 700)
    ctx.fillText(data.totalVolume >= 10000 ? '' : 'kg', 80 + ctx.measureText(volStr).width + 20, 590)
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = font(38); ctx.fillText('TOTAL ACCUMULATED VOLUME', 80, 670)
    divider(740)
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = font(30, 500); ctx.fillText('DAILY VOLUME HISTORY', 80, 810)
    drawBars(ctx, data.history.map(d => ({ label: d.label, value: d.volume })), 80, 850, W - 160, 260, ac)
    divider(1180)
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = font(30); ctx.fillText(`${data.sessionCount} SESSIONS`, 80, 1240)
    data.history.slice(-5).reverse().forEach((point, i) => {
      const iy = 1320 + i * 86
      ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.font = font(36); ctx.fillText(point.label, 80, iy)
      const v = point.volume >= 1000 ? `${(point.volume / 1000).toFixed(1)}k` : `${point.volume.toLocaleString()} kg`
      ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = font(36, 700); ctx.fillText(v, W - 80 - ctx.measureText(v).width, iy)
    })
  }

  if (data.type === 'bodyweight') {
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = font(36, 500); ctx.fillText('BODY WEIGHT', 80, 260)
    const cwStr = String(data.currentWeight)
    ctx.fillStyle = heroColor; ctx.font = font(168, 700); ctx.fillText(cwStr, 80, 500)
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = font(60, 700)
    ctx.fillText('kg', 80 + ctx.measureText(cwStr).width + 20, 490)
    if (data.change !== 0) {
      ctx.fillStyle = data.change <= 0 ? '#22c55e' : '#ef4444'; ctx.font = font(42)
      ctx.fillText(`${data.change > 0 ? '+' : ''}${data.change} kg since start`, 80, 590)
    }
    divider(660)
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = font(30, 500); ctx.fillText('WEIGHT TREND', 80, 730)
    drawBars(ctx, data.history.map(d => ({ label: d.label, value: d.weight })), 80, 780, W - 160, 260, ac)
    divider(1110)
    data.history.slice(-5).reverse().forEach((point, i) => {
      const iy = 1190 + i * 86
      ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.font = font(36); ctx.fillText(point.label, 80, iy)
      const v = `${point.weight} kg`
      ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = font(36, 700); ctx.fillText(v, W - 80 - ctx.measureText(v).width, iy)
    })
  }

  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.font = font(28)
  ctx.fillText('Made with LIFTSNAP · liftsnap.app', 80, H - 70)

  return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/png'))
}

/* ── Component ────────────────────────────────────────────── */
export default function StatsShareView({ data }: { data: StatsData }) {
  const router = useRouter()
  const [theme, setTheme] = useState<Theme>('dark')
  const [accent, setAccent] = useState<Accent>('orange')
  const [sharing, setSharing] = useState(false)
  const [status, setStatus] = useState('')

  const handleShare = async () => {
    setSharing(true)
    setStatus('Generating card...')
    try {
      const blob = await generateStatsCard(data, theme, accent)
      const file = new File([blob], 'liftsnap-stats.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        setStatus('Sharing...')
        await navigator.share({ files: [file], title: 'LIFTSNAP Stats' })
        setStatus('')
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = 'liftsnap-stats.png'; a.click()
        URL.revokeObjectURL(url)
        setStatus('Downloaded!')
        setTimeout(() => setStatus(''), 2000)
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') setStatus('Error occurred')
      else setStatus('')
    } finally {
      setSharing(false)
    }
  }

  const ac = AC[accent]

  /* Preview-derived values */
  const metricLabel =
    data.type === 'max1rm' ? 'MAX 1RM' :
    data.type === 'volume' ? 'DAILY VOLUME' : 'BODY WEIGHT'

  const heroNumber =
    data.type === 'max1rm' ? `${data.bestRM} kg` :
    data.type === 'volume'
      ? data.totalVolume >= 10000 ? `${(data.totalVolume / 1000).toFixed(1)}k kg` : `${data.totalVolume.toLocaleString()} kg`
      : `${data.currentWeight} kg`

  const subText =
    data.type === 'max1rm'
      ? [data.bestSet ? `Best Set  ${data.bestSet.weight} × ${data.bestSet.reps} reps` : null, data.bestDate, `${data.sessionCount} sessions`].filter(Boolean).join('  ·  ')
      : data.type === 'volume' ? `${data.sessionCount} sessions`
      : data.change !== 0 ? `${data.change > 0 ? '+' : ''}${data.change} kg since start`
      : undefined

  const chartData =
    data.type === 'max1rm' ? data.history.map(d => ({ label: d.label.split(' ')[1] ?? d.label, value: d.est1rm })) :
    data.type === 'volume' ? data.history.map(d => ({ label: d.label.split(' ')[1] ?? d.label, value: d.volume })) :
    data.history.map(d => ({ label: d.label.split(' ')[1] ?? d.label, value: d.weight }))

  const maxVal = chartData.length ? Math.max(...chartData.map(d => d.value)) : 1

  const historyRows =
    data.type === 'max1rm'
      ? data.history.slice(-5).reverse().map(d => ({ label: d.label, value: `${d.est1rm} kg`, highlight: d.est1rm === data.bestRM }))
      : data.type === 'volume'
        ? data.history.slice(-5).reverse().map(d => ({ label: d.label, value: d.volume >= 1000 ? `${(d.volume / 1000).toFixed(1)}k` : `${d.volume.toLocaleString()} kg`, highlight: false }))
        : data.history.slice(-5).reverse().map(d => ({ label: d.label, value: `${d.weight} kg`, highlight: false }))

  return (
    <div className="min-h-screen pb-nav flex flex-col" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-4">
        <button onClick={() => router.back()} className="p-2 rounded-xl" style={{ background: '#1a1a1a' }}>
          <ArrowLeft size={18} style={{ color: '#888' }} />
        </button>
        <h1 className="text-base font-black tracking-widest text-white">Share Story</h1>
      </div>

      {/* 9:16 preview */}
      <div className="px-4 mb-5">
        <div className="w-full rounded-3xl overflow-hidden relative"
          style={{
            aspectRatio: '9/16',
            background: theme === 'dark' ? '#0a0a0a' : 'rgba(12,12,12,0.76)',
            border: `1px solid ${ac.cardBorder}`,
          }}>
          {/* Checkered hint for transparent mode */}
          {theme === 'transparent' && (
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M0 0h20v20H0V0zm20 20h20v20H20V20z'/%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          )}
          {/* Top accent line */}
          <div className="absolute top-0 inset-x-0 h-1" style={{ background: ac.topLine }} />

          <div className="relative p-5 flex flex-col h-full pt-6">
            {/* Badge */}
            <div className="inline-flex mb-4">
              <span className="px-3 py-1.5 rounded-lg text-xs font-black"
                style={{
                  background: ac.badgeBg,
                  color: ac.badgeText,
                  letterSpacing: '0.1em',
                  border: `1px solid ${ac.badgeBorder}`,
                }}>
                LIFTSNAP
              </span>
            </div>

            <p className="text-[11px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>
              {metricLabel}
            </p>

            {data.type !== 'bodyweight' && (
              <p className="font-black text-white leading-tight mb-2" style={{ fontSize: 18 }}>
                {data.exerciseName}
              </p>
            )}

            <p className="font-black leading-none mb-1"
              style={{ fontSize: 40, color: accent === 'dark' ? '#ffffff' : ac.hex }}>
              {heroNumber}
            </p>

            {subText && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>{subText}</p>
            )}

            <div className="mb-3" style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />

            {/* Mini bar chart */}
            {chartData.length > 0 && (
              <div className="mb-3">
                <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>
                  {data.type === 'max1rm' ? '1RM PROGRESSION' : data.type === 'volume' ? 'DAILY VOLUME' : 'WEIGHT TREND'}
                </p>
                <div className="flex items-end gap-1" style={{ height: 48 }}>
                  {chartData.map((bar, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5">
                      <div className="w-full rounded-sm"
                        style={{
                          height: `${Math.max(4, Math.round((bar.value / maxVal) * 44))}px`,
                          background: i === chartData.length - 1 ? ac.barActive : ac.barInactive,
                        }} />
                      <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)' }}>{bar.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-2" style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />

            <div className="flex-1 flex flex-col gap-1.5">
              {historyRows.map((row, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{row.label}</span>
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: row.highlight ? (accent === 'dark' ? '#ffffff' : ac.hex) : 'rgba(255,255,255,0.7)',
                    fontFamily: 'var(--font-mono)',
                  }}>{row.value}</span>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.12)', marginTop: 8 }}>
              Made with LIFTSNAP · liftsnap.app
            </p>
          </div>
        </div>
      </div>

      {/* Background selector */}
      <div className="px-4 mb-3">
        <p className="text-xs font-bold mb-2" style={{ color: '#666', letterSpacing: '0.06em' }}>Background</p>
        <div className="flex gap-2">
          {(['dark', 'transparent'] as Theme[]).map(t => (
            <button key={t}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold"
              style={{
                background: theme === t ? '#ff6b00' : '#1a1a1a',
                color: theme === t ? '#fff' : '#666',
                border: `1px solid ${theme === t ? '#ff6b00' : '#2a2a2a'}`,
              }}
              onClick={() => setTheme(t)}>
              {t === 'dark' ? 'Dark' : 'Transparent'}
            </button>
          ))}
        </div>
      </div>

      {/* Color selector */}
      <div className="px-4 mb-6">
        <p className="text-xs font-bold mb-2" style={{ color: '#666', letterSpacing: '0.06em' }}>Color</p>
        <div className="flex gap-2">
          {(['orange', 'purple', 'dark'] as Accent[]).map(a => {
            const isSelected = accent === a
            const selectedBg = a === 'orange' ? '#ff6b00' : a === 'purple' ? '#a855f7' : '#3a3a3a'
            return (
              <button key={a}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{
                  background: isSelected ? selectedBg : '#1a1a1a',
                  color: isSelected ? '#fff' : '#666',
                  border: `1px solid ${isSelected ? selectedBg : '#2a2a2a'}`,
                }}
                onClick={() => setAccent(a)}>
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Share button */}
      <div className="px-4 space-y-2">
        {status && (
          <p className="text-center text-sm" style={{ color: '#888' }}>{status}</p>
        )}
        <button
          className="w-full py-4 rounded-2xl text-base font-black text-white flex items-center justify-center gap-2"
          style={{ background: '#ff6b00', boxShadow: '0 4px 20px rgba(255,107,0,0.3)' }}
          disabled={sharing}
          onClick={handleShare}>
          <Share2 size={20} />
          {sharing ? 'Generating...' : 'Share to Instagram Story'}
        </button>
        <p className="text-center text-xs" style={{ color: '#444' }}>
          Mobile only · Desktop downloads as PNG
        </p>
      </div>
    </div>
  )
}
