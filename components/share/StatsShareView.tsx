'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Share2, ArrowLeft } from 'lucide-react'

type RMPoint = { date: string; label: string; est1rm: number }
type VolPoint = { date: string; label: string; volume: number }
type BWPoint = { date: string; label: string; weight: number }

type StatsData =
  | {
      type: 'max1rm'
      exerciseName: string
      bestRM: number
      bestDate: string
      bestSet: { weight: number; reps: number } | null
      history: RMPoint[]
      sessionCount: number
    }
  | {
      type: 'volume'
      exerciseName: string
      totalVolume: number
      sessionCount: number
      history: VolPoint[]
    }
  | {
      type: 'bodyweight'
      currentWeight: number
      change: number
      history: BWPoint[]
    }

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

function drawBase(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#FF6B00'
  ctx.fillRect(0, 0, W, 8)
}

function drawBadge(ctx: CanvasRenderingContext2D, W: number) {
  ctx.fillStyle = 'rgba(255,107,0,0.14)'
  roundRect(ctx, 80, 80, 280, 68, 12)
  ctx.fill()
  ctx.fillStyle = '#FF6B00'
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif'
  ctx.fillText('LIFTSNAP', 110, 126)
}

function drawWatermark(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.font = '28px system-ui, -apple-system, sans-serif'
  ctx.fillText('Made with LIFTSNAP · liftsnap.app', 80, H - 70)
}

function drawMiniBarChart(
  ctx: CanvasRenderingContext2D,
  data: { label: string; value: number }[],
  x: number, y: number, w: number, h: number,
  accentColor: string
) {
  if (!data.length) return
  const maxVal = Math.max(...data.map(d => d.value))
  const slotW = Math.floor(w / data.length)
  const barW = Math.max(slotW - 16, 20)

  data.forEach((point, i) => {
    const barH = maxVal > 0 ? Math.round((point.value / maxVal) * h * 0.88) : 4
    const bx = x + i * slotW + Math.floor((slotW - barW) / 2)
    const by = y + h - barH

    ctx.fillStyle = 'rgba(255,107,0,0.12)'
    ctx.fillRect(bx, y, barW, h)

    ctx.fillStyle = i === data.length - 1 ? accentColor : 'rgba(255,107,0,0.55)'
    ctx.fillRect(bx, by, barW, barH)

    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    ctx.font = '24px system-ui, -apple-system, sans-serif'
    const lbl = point.label.replace(/[A-Za-z]+ /, '')
    const lw = ctx.measureText(lbl).width
    ctx.fillText(lbl, bx + (barW - lw) / 2, y + h + 42)
  })
}

async function generateStatsCard(data: StatsData): Promise<Blob> {
  const W = 1080, H = 1920
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!
  const accent = '#FF6B00'

  drawBase(ctx, W, H)
  drawBadge(ctx, W)

  if (data.type === 'max1rm') {
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.font = '500 36px system-ui, -apple-system, sans-serif'
    ctx.fillText('MAX 1RM', 80, 260)

    ctx.fillStyle = '#fff'
    ctx.font = 'bold 74px system-ui, -apple-system, sans-serif'
    const exLines: string[] = data.exerciseName.length > 20
      ? [data.exerciseName.slice(0, 18) + '…']
      : [data.exerciseName]
    exLines.forEach((line, i) => ctx.fillText(line, 80, 380 + i * 90))

    ctx.fillStyle = accent
    ctx.font = 'bold 168px system-ui, -apple-system, sans-serif'
    const rmStr = String(data.bestRM)
    ctx.fillText(rmStr, 80, 600)
    const rmW = ctx.measureText(rmStr).width
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = 'bold 60px system-ui, -apple-system, sans-serif'
    ctx.fillText('kg', 80 + rmW + 20, 590)

    if (data.bestSet) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '38px system-ui, -apple-system, sans-serif'
      ctx.fillText(`Best Set  ${data.bestSet.weight} × ${data.bestSet.reps} reps`, 80, 680)
    }

    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    ctx.font = '30px system-ui, -apple-system, sans-serif'
    ctx.fillText(data.bestDate, 80, 740)

    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(80, 800); ctx.lineTo(W-80, 800); ctx.stroke()

    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '500 30px system-ui, -apple-system, sans-serif'
    ctx.fillText('1RM PROGRESSION', 80, 860)

    const chartData = data.history.map(d => ({ label: d.label, value: d.est1rm }))
    drawMiniBarChart(ctx, chartData, 80, 900, W - 160, 260, accent)

    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(80, 1230); ctx.lineTo(W-80, 1230); ctx.stroke()

    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.font = '30px system-ui, -apple-system, sans-serif'
    ctx.fillText(`${data.sessionCount} SESSIONS LOGGED`, 80, 1290)

    const bestRM = data.bestRM
    data.history.slice(-5).reverse().forEach((point, i) => {
      const iy = 1370 + i * 86
      ctx.fillStyle = 'rgba(255,255,255,0.38)'
      ctx.font = '36px system-ui, -apple-system, sans-serif'
      ctx.fillText(point.label, 80, iy)
      const val = `${point.est1rm} kg`
      ctx.fillStyle = point.est1rm === bestRM ? accent : 'rgba(255,255,255,0.65)'
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif'
      ctx.fillText(val, W - 80 - ctx.measureText(val).width, iy)
    })
  }

  if (data.type === 'volume') {
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.font = '500 36px system-ui, -apple-system, sans-serif'
    ctx.fillText('DAILY VOLUME', 80, 260)

    ctx.fillStyle = '#fff'
    ctx.font = 'bold 74px system-ui, -apple-system, sans-serif'
    ctx.fillText(data.exerciseName.length > 20 ? data.exerciseName.slice(0, 18) + '…' : data.exerciseName, 80, 380)

    const volStr = data.totalVolume >= 10000
      ? `${(data.totalVolume / 1000).toFixed(1)}k`
      : data.totalVolume.toLocaleString()
    ctx.fillStyle = accent
    ctx.font = 'bold 168px system-ui, -apple-system, sans-serif'
    ctx.fillText(volStr, 80, 600)
    const volW = ctx.measureText(volStr).width
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = 'bold 60px system-ui, -apple-system, sans-serif'
    ctx.fillText(data.totalVolume >= 10000 ? '' : 'kg', 80 + volW + 20, 590)

    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '38px system-ui, -apple-system, sans-serif'
    ctx.fillText('TOTAL ACCUMULATED VOLUME', 80, 670)

    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(80, 740); ctx.lineTo(W-80, 740); ctx.stroke()

    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '500 30px system-ui, -apple-system, sans-serif'
    ctx.fillText('DAILY VOLUME HISTORY', 80, 810)

    const chartData = data.history.map(d => ({ label: d.label, value: d.volume }))
    drawMiniBarChart(ctx, chartData, 80, 850, W - 160, 260, accent)

    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(80, 1180); ctx.lineTo(W-80, 1180); ctx.stroke()

    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.font = '30px system-ui, -apple-system, sans-serif'
    ctx.fillText(`${data.sessionCount} SESSIONS`, 80, 1240)

    data.history.slice(-5).reverse().forEach((point, i) => {
      const iy = 1320 + i * 86
      ctx.fillStyle = 'rgba(255,255,255,0.38)'
      ctx.font = '36px system-ui, -apple-system, sans-serif'
      ctx.fillText(point.label, 80, iy)
      const v = point.volume >= 1000 ? `${(point.volume / 1000).toFixed(1)}k` : `${point.volume.toLocaleString()} kg`
      ctx.fillStyle = 'rgba(255,255,255,0.65)'
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif'
      ctx.fillText(v, W - 80 - ctx.measureText(v).width, iy)
    })
  }

  if (data.type === 'bodyweight') {
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.font = '500 36px system-ui, -apple-system, sans-serif'
    ctx.fillText('BODY WEIGHT', 80, 260)

    const cwStr = String(data.currentWeight)
    ctx.fillStyle = accent
    ctx.font = 'bold 168px system-ui, -apple-system, sans-serif'
    ctx.fillText(cwStr, 80, 500)
    const cwW = ctx.measureText(cwStr).width
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = 'bold 60px system-ui, -apple-system, sans-serif'
    ctx.fillText('kg', 80 + cwW + 20, 490)

    if (data.change !== 0) {
      const changeStr = `${data.change > 0 ? '+' : ''}${data.change} kg since start`
      ctx.fillStyle = data.change <= 0 ? '#22c55e' : '#ef4444'
      ctx.font = '42px system-ui, -apple-system, sans-serif'
      ctx.fillText(changeStr, 80, 590)
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(80, 660); ctx.lineTo(W-80, 660); ctx.stroke()

    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '500 30px system-ui, -apple-system, sans-serif'
    ctx.fillText('WEIGHT TREND', 80, 730)

    const chartData = data.history.map(d => ({ label: d.label, value: d.weight }))
    drawMiniBarChart(ctx, chartData, 80, 780, W - 160, 260, '#a78bfa')

    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(80, 1110); ctx.lineTo(W-80, 1110); ctx.stroke()

    data.history.slice(-5).reverse().forEach((point, i) => {
      const iy = 1190 + i * 86
      ctx.fillStyle = 'rgba(255,255,255,0.38)'
      ctx.font = '36px system-ui, -apple-system, sans-serif'
      ctx.fillText(point.label, 80, iy)
      const v = `${point.weight} kg`
      ctx.fillStyle = 'rgba(255,255,255,0.65)'
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif'
      ctx.fillText(v, W - 80 - ctx.measureText(v).width, iy)
    })
  }

  drawWatermark(ctx, W, H)

  return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/png'))
}

export default function StatsShareView({ data }: { data: StatsData }) {
  const router = useRouter()
  const [sharing, setSharing] = useState(false)
  const [status, setStatus] = useState('')

  const handleShare = async () => {
    setSharing(true)
    setStatus('Generating card...')
    try {
      const blob = await generateStatsCard(data)
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

  const metricLabel =
    data.type === 'max1rm' ? 'MAX 1RM' :
    data.type === 'volume' ? 'DAILY VOLUME' : 'BODY WEIGHT'

  const exerciseName = data.type !== 'bodyweight' ? data.exerciseName : null

  const heroNumber =
    data.type === 'max1rm' ? `${data.bestRM} kg` :
    data.type === 'volume'
      ? data.totalVolume >= 10000
        ? `${(data.totalVolume / 1000).toFixed(1)}k kg`
        : `${data.totalVolume.toLocaleString()} kg`
      : `${data.currentWeight} kg`

  const subText =
    data.type === 'max1rm'
      ? [
          data.bestSet ? `Best Set  ${data.bestSet.weight} × ${data.bestSet.reps} reps` : null,
          data.bestDate,
          `${data.sessionCount} sessions`,
        ].filter(Boolean).join('  ·  ')
      : data.type === 'volume'
        ? `${data.sessionCount} sessions`
        : data.change !== 0
          ? `${data.change > 0 ? '+' : ''}${data.change} kg since start`
          : undefined

  const chartData =
    data.type === 'max1rm' ? data.history.map(d => ({ label: d.label.split(' ')[1] ?? d.label, value: d.est1rm })) :
    data.type === 'volume' ? data.history.map(d => ({ label: d.label.split(' ')[1] ?? d.label, value: d.volume })) :
    data.history.map(d => ({ label: d.label.split(' ')[1] ?? d.label, value: d.weight }))

  const maxVal = chartData.length ? Math.max(...chartData.map(d => d.value)) : 1
  const chartAccent = data.type === 'bodyweight' ? '#a78bfa' : '#FF6B00'

  const historyRows =
    data.type === 'max1rm'
      ? data.history.slice(-5).reverse().map(d => ({ label: d.label, value: `${d.est1rm} kg`, highlight: d.est1rm === data.bestRM }))
      : data.type === 'volume'
        ? data.history.slice(-5).reverse().map(d => ({ label: d.label, value: d.volume >= 1000 ? `${(d.volume/1000).toFixed(1)}k` : `${d.volume.toLocaleString()} kg`, highlight: false }))
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

      {/* Story card preview */}
      <div className="px-4 mb-6">
        <div className="w-full rounded-3xl overflow-hidden relative"
          style={{
            aspectRatio: '9/16',
            background: '#0a0a0a',
            border: '1px solid rgba(255,107,0,0.22)',
          }}>
          {/* Top accent line */}
          <div className="absolute top-0 inset-x-0 h-1" style={{ background: '#FF6B00' }} />

          <div className="relative p-5 flex flex-col h-full pt-6">
            {/* Badge */}
            <div className="inline-flex mb-4">
              <span className="px-3 py-1.5 rounded-lg text-xs font-black text-white"
                style={{ background: 'rgba(255,107,0,0.14)', color: '#FF6B00', letterSpacing: '0.1em', border: '1px solid rgba(255,107,0,0.3)' }}>
                LIFTSNAP
              </span>
            </div>

            {/* Metric label */}
            <p className="text-[11px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>
              {metricLabel}
            </p>

            {/* Exercise name */}
            {exerciseName && (
              <p className="font-black text-white leading-tight mb-2" style={{ fontSize: 18 }}>{exerciseName}</p>
            )}

            {/* Hero number */}
            <p className="font-black leading-none mb-1" style={{ fontSize: 40, color: data.type === 'bodyweight' ? '#a78bfa' : '#FF6B00' }}>
              {heroNumber}
            </p>

            {/* Sub text */}
            {subText && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>{subText}</p>
            )}

            {/* Divider */}
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
                          background: i === chartData.length - 1 ? chartAccent : `${chartAccent}55`,
                        }} />
                      <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)' }}>{bar.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="mb-2" style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />

            {/* History rows */}
            <div className="flex-1 flex flex-col gap-1.5">
              {historyRows.map((row, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{row.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: row.highlight ? '#FF6B00' : 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono)' }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Watermark */}
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.12)', marginTop: 8 }}>
              Made with LIFTSNAP · liftsnap.app
            </p>
          </div>
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
