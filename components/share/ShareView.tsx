'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Share2, Download, ArrowLeft } from 'lucide-react'
import { shareOrDownloadImage } from '@/lib/shareImage'
import { useWeightUnit } from '@/lib/useWeightUnit'
import { formatVolumeWithUnit, type WeightUnit } from '@/lib/units'

type CardData = {
  title: string
  date: string
  volume: number
  setsCount: number
  exercises: { name: string; sets: number }[]
}

type Theme = 'clear' | 'dark'
type Accent = 'orange' | 'purple'

const ACCENT_COLOR = { orange: '#ED742F', purple: '#6E38D4' }

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

async function generateCard(data: CardData, theme: Theme, accent: Accent, unit: WeightUnit): Promise<Blob> {
  const W = 1080, H = 1920
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const accentColor = ACCENT_COLOR[accent]

  if (theme === 'dark') {
    ctx.fillStyle = 'rgba(10,10,10,0.88)'
    ctx.fillRect(0, 0, W, H)
  }

  const shadow = () => { ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 24 }
  const noShadow = () => { ctx.shadowBlur = 0 }

  // REPRA badge
  ctx.fillStyle = accentColor
  roundRect(ctx, 80, 110, 300, 80, 14)
  ctx.fill()
  ctx.fillStyle = 'white'
  ctx.font = 'bold 34px system-ui, -apple-system, sans-serif'
  ctx.fillText('REPRA', 112, 162)

  // Date
  const d = new Date(data.date + 'T00:00:00')
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const dateStr = `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${DAYS[d.getDay()]}`
  shadow()
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = '38px system-ui, -apple-system, sans-serif'
  ctx.fillText(dateStr, 80, 280)

  // Title
  ctx.fillStyle = 'white'
  ctx.font = 'bold 88px system-ui, -apple-system, sans-serif'
  const titleLines = splitText(ctx, data.title, W - 160, 'bold 88px system-ui, -apple-system, sans-serif')
  titleLines.forEach((line, i) => ctx.fillText(line, 80, 420 + i * 100))
  noShadow()

  // Divider
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.lineWidth = 2
  ctx.beginPath()
  const divY1 = 420 + titleLines.length * 100 + 40
  ctx.moveTo(80, divY1); ctx.lineTo(W - 80, divY1); ctx.stroke()

  // TOTAL VOLUME label
  shadow()
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.font = '30px system-ui, -apple-system, sans-serif'
  ctx.fillText('TOTAL VOLUME', 80, divY1 + 70)

  // Volume number — unit-aware
  const volStr = formatVolumeWithUnit(data.volume, unit)
  ctx.fillStyle = accentColor
  ctx.font = 'bold 148px system-ui, -apple-system, sans-serif'
  ctx.fillText(volStr, 80, divY1 + 220)

  // Sets
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = '36px system-ui, -apple-system, sans-serif'
  ctx.fillText(`${data.setsCount} SETS COMPLETED`, 80, divY1 + 290)
  noShadow()

  // Divider 2
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.lineWidth = 2
  ctx.beginPath()
  const divY2 = divY1 + 340
  ctx.moveTo(80, divY2); ctx.lineTo(W - 80, divY2); ctx.stroke()

  // Exercise list
  let ey = divY2 + 80
  data.exercises.slice(0, 6).forEach(ex => {
    shadow()
    ctx.fillStyle = 'rgba(255,255,255,0.88)'
    ctx.font = '46px system-ui, -apple-system, sans-serif'
    ctx.fillText(ex.name, 80, ey)
    ctx.fillStyle = accentColor
    ctx.font = 'bold 46px system-ui, -apple-system, sans-serif'
    const setsLabel = `×${ex.sets}`
    ctx.fillText(setsLabel, W - 80 - ctx.measureText(setsLabel).width, ey)
    noShadow()
    ey += 90
  })

  // Bottom watermark
  shadow()
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.font = '30px system-ui, -apple-system, sans-serif'
  ctx.fillText('repra.app', 80, H - 100)
  noShadow()

  return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/png'))
}

function splitText(ctx: CanvasRenderingContext2D, text: string, maxW: number, font: string): string[] {
  ctx.font = font
  if (ctx.measureText(text).width <= maxW) return [text]
  const mid = Math.floor(text.length / 2)
  return [text.slice(0, mid), text.slice(mid)]
}

export default function ShareView({ data }: { data: CardData }) {
  const router = useRouter()
  const { unit } = useWeightUnit()
  const [theme, setTheme] = useState<Theme>('dark')
  const [accent, setAccent] = useState<Accent>('orange')
  const [sharing, setSharing] = useState(false)
  const [status, setStatus] = useState('')

  const handleShare = async () => {
    setSharing(true)
    setStatus('Generating card...')
    try {
      const blob = await generateCard(data, theme, accent, unit)
      const result = await shareOrDownloadImage({ blob, filename: 'repra-workout.png', title: 'REPRA Workout' })
      if (result === 'downloaded') {
        setStatus('Downloaded!'); setTimeout(() => setStatus(''), 2000)
      } else {
        setStatus('')
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') setStatus('Error occurred')
      else setStatus('')
    } finally {
      setSharing(false)
    }
  }

  const d = new Date(data.date + 'T00:00:00')
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const dateLabel = `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${DAYS[d.getDay()]}`
  const volStr = formatVolumeWithUnit(data.volume, unit)
  const accentColor = ACCENT_COLOR[accent]

  return (
    <div className="min-h-screen pb-nav flex flex-col" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-4">
        <button onClick={() => router.back()} className="p-2 rounded-xl" style={{ background: '#222222' }}>
          <ArrowLeft size={18} style={{ color: '#888' }} />
        </button>
        <h1 className="text-base font-black tracking-widest text-white">Share Story</h1>
      </div>

      {/* Card preview */}
      <div className="px-4 mb-5">
        <div
          className="w-full rounded-3xl overflow-hidden relative"
          style={{
            aspectRatio: '9/16',
            background: theme === 'dark' ? 'rgba(10,10,10,0.88)' : 'linear-gradient(135deg, #1a1a1a 0%, #2a1a2a 100%)',
            border: '1px solid #2a2a2a',
          }}>
          {/* bg hint for clear mode */}
          {theme === 'clear' && (
            <div className="absolute inset-0" style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M0 0h20v20H0V0zm20 20h20v20H20V20z\'/%3E%3C/g%3E%3C/svg%3E")',
            }} />
          )}

          <div className="relative p-6 flex flex-col h-full">
            {/* Badge */}
            <div className="inline-flex mb-4">
              <span className="px-3 py-1.5 rounded-lg text-xs font-black text-white"
                style={{ background: accentColor, letterSpacing: '0.15em' }}>
                REPRA
              </span>
            </div>
            {/* Date */}
            <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.68)' }}>{dateLabel}</p>
            {/* Title */}
            <p className="text-2xl font-black text-white leading-tight mb-4">{data.title}</p>

            <div className="h-px mb-4" style={{ background: 'rgba(255,255,255,0.15)' }} />

            {/* Volume */}
            <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.60)', letterSpacing: '0.1em' }}>TOTAL VOLUME</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-5xl font-black" style={{ color: accentColor }}>{volStr}</span>
            </div>
            <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.56)' }}>
              {data.setsCount} SETS COMPLETED
            </p>

            <div className="h-px mb-4" style={{ background: 'rgba(255,255,255,0.15)' }} />

            {/* Exercises */}
            <div className="flex-1 flex flex-col justify-start gap-2">
              {data.exercises.slice(0, 5).map(ex => (
                <div key={ex.name} className="flex items-center justify-between">
                  <span className="text-sm text-white opacity-85">{ex.name}</span>
                  <span className="text-sm font-black" style={{ color: accentColor }}>×{ex.sets}</span>
                </div>
              ))}
            </div>

            {/* Watermark */}
            <p className="text-xs mt-4" style={{ color: 'rgba(255,255,255,0.44)' }}>repra.app</p>
          </div>
        </div>
      </div>

      {/* Theme options */}
      <div className="px-4 mb-3">
        <p className="text-xs font-bold mb-2" style={{ color: '#888' }}>Background</p>
        <div className="flex gap-2">
          {(['dark', 'clear'] as Theme[]).map(t => (
            <button key={t}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold"
              style={{ background: theme === t ? '#ED742F' : '#222222', color: theme === t ? '#fff' : '#888', border: '1px solid #2a2a2a' }}
              onClick={() => setTheme(t)}>
              {t === 'dark' ? 'Dark' : 'Clear'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mb-5">
        <p className="text-xs font-bold mb-2" style={{ color: '#888' }}>Color</p>
        <div className="flex gap-2">
          {(['orange', 'purple'] as Accent[]).map(a => (
            <button key={a}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold"
              style={{
                background: accent === a ? ACCENT_COLOR[a] : '#222222',
                color: '#fff',
                border: `1px solid ${accent === a ? ACCENT_COLOR[a] : '#2a2a2a'}`,
              }}
              onClick={() => setAccent(a)}>
              {a === 'orange' ? 'Orange' : 'Purple'}
            </button>
          ))}
        </div>
      </div>

      {/* Share button */}
      <div className="px-4 space-y-2">
        {status && (
          <p className="text-center text-sm" style={{ color: '#888' }}>{status}</p>
        )}
        <button
          className="w-full py-4 rounded-2xl text-base font-black text-white flex items-center justify-center gap-2"
          style={{ background: '#ED742F' }}
          disabled={sharing}
          onClick={handleShare}>
          <Share2 size={20} />
          {sharing ? 'Generating...' : 'Share to Instagram Story'}
        </button>
        <p className="text-center text-xs" style={{ color: '#444' }}>
          Mobile only · Downloads as PNG on desktop
        </p>
      </div>
    </div>
  )
}
