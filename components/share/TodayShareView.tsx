'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Share2, ArrowLeft } from 'lucide-react'

export type TodayData = {
  title: string
  date: string
  volume: number
  setsCount: number
  exercises: { name: string; sets: number; bestWeight: number; bestReps: number }[]
  bestLift: { name: string; weight: number } | null
  muscleFocus: string | null
}

type Theme  = 'dark' | 'transparent'
type Accent = 'orange' | 'purple' | 'dark'

const AC: Record<Accent, {
  hex: string; badgeBg: string; badgeBorder: string; badgeText: string
  cardBorder: string; topLine: string
}> = {
  orange: { hex: '#ff6b00', badgeBg: '#ff6b00', badgeBorder: 'transparent', badgeText: '#ffffff', cardBorder: 'rgba(255,107,0,0.35)', topLine: '#ff6b00' },
  purple: { hex: '#a855f7', badgeBg: '#a855f7', badgeBorder: 'transparent', badgeText: '#ffffff', cardBorder: 'rgba(168,85,247,0.35)', topLine: '#a855f7' },
  dark:   { hex: 'rgba(255,255,255,0.7)', badgeBg: 'rgba(255,255,255,0.06)', badgeBorder: 'rgba(255,255,255,0.18)', badgeText: 'rgba(255,255,255,0.65)', cardBorder: 'rgba(255,255,255,0.1)', topLine: 'rgba(255,255,255,0.18)' },
}

const CHECKER = `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.07'%3E%3Cpath d='M0 0h10v10H0V0zm10 10h10v10H10V10z'/%3E%3C/g%3E%3C/svg%3E")`

const MAX_EX_CANVAS = 5
const MAX_EX_DOM    = 4

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r)
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r)
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r)
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r)
  ctx.closePath()
}

function fmtVol(v: number): string {
  return v >= 10000 ? `${(v/1000).toFixed(1)}k` : v.toLocaleString()
}

function fmtKg(v: number): string {
  return v === Math.round(v) ? `${v}` : `${v.toFixed(1)}`
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const D = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  return `${M[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${D[d.getDay()]}`
}

async function generateCard(data: TodayData, theme: Theme, accent: Accent): Promise<Blob> {
  const W = 1080, H = 1920
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')!
  const ac = AC[accent]
  const acHex = accent === 'dark' ? '#ffffff' : ac.hex

  if (theme === 'dark') { ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, W, H) }

  ctx.fillStyle = ac.topLine; ctx.fillRect(0, 0, W, 7)

  const sh  = () => { ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 20 }
  const ns  = () => { ctx.shadowBlur = 0 }
  const divLine = (y: number) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(80, y); ctx.lineTo(W-80, y); ctx.stroke()
  }
  const font = (size: number, w: 400|500|700 = 400) =>
    `${w === 700 ? 'bold ' : w === 500 ? '500 ' : ''}${size}px system-ui,-apple-system,sans-serif`

  // Badge
  ctx.fillStyle = ac.badgeBg
  rr(ctx, 80, 100, 268, 70, 14); ctx.fill()
  if (accent === 'dark') {
    ctx.strokeStyle = ac.badgeBorder; ctx.lineWidth = 1.5
    rr(ctx, 80, 100, 268, 70, 14); ctx.stroke()
  }
  ctx.fillStyle = ac.badgeText; ctx.font = font(30, 700)
  ctx.fillText('LIFTSNAP', 112, 146)

  let cy = 222

  // Date
  sh()
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = font(34)
  ctx.fillText(fmtDate(data.date), 80, cy); cy += 56

  // Section label
  ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.font = font(26, 500)
  ctx.fillText("TODAY'S WORKOUT", 80, cy); cy += 52

  // Title
  ctx.fillStyle = '#ffffff'; ctx.font = font(84, 700)
  const titleUpper = data.title.toUpperCase()
  if (ctx.measureText(titleUpper).width > W - 160) {
    const mid = Math.ceil(titleUpper.length / 2)
    ctx.fillText(titleUpper.slice(0, mid), 80, cy); cy += 96
    ctx.fillText(titleUpper.slice(mid), 80, cy); cy += 40
  } else {
    ctx.fillText(titleUpper, 80, cy); cy += 40
  }
  ns()

  cy += 30; divLine(cy); cy += 64

  // Total Volume
  ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.font = font(28, 500)
  ctx.fillText('TOTAL VOLUME', 80, cy); cy += 60
  sh()
  ctx.fillStyle = acHex; ctx.font = font(148, 700)
  ctx.fillText(fmtVol(data.volume), 80, cy)
  const vw = ctx.measureText(fmtVol(data.volume)).width
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = font(52, 500)
  ctx.fillText(' kg', 80 + vw, cy - 10)
  cy += 76
  ns()

  ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.font = font(36)
  ctx.fillText(`${data.setsCount} SETS COMPLETED`, 80, cy); cy += 80

  cy += 10; divLine(cy); cy += 64

  // Exercises header
  ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.font = font(26, 500)
  ctx.fillText('EXERCISES', 80, cy); cy += 56

  const showEx = data.exercises.slice(0, MAX_EX_CANVAS)
  const hiddenCount = Math.max(0, data.exercises.length - MAX_EX_CANVAS)

  sh()
  showEx.forEach(ex => {
    // Exercise name
    ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.font = font(44)
    ctx.fillText(ex.name, 80, cy); cy += 54

    // Sub-line: "N sets  ·  Best Xkg × Y"
    if (ex.bestWeight > 0 && ex.bestReps > 0) {
      const prefix = `${ex.sets} sets  ·  Best `
      const suffix = `${fmtKg(ex.bestWeight)}kg × ${ex.bestReps}`
      ctx.fillStyle = 'rgba(255,255,255,0.42)'; ctx.font = font(32)
      ctx.fillText(prefix, 80, cy)
      const pw = ctx.measureText(prefix).width
      ctx.fillStyle = acHex; ctx.font = font(32, 700)
      ctx.fillText(suffix, 80 + pw, cy)
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.42)'; ctx.font = font(32)
      ctx.fillText(`${ex.sets} sets`, 80, cy)
    }
    cy += 70
  })
  ns()

  if (hiddenCount > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.font = font(32)
    ctx.fillText(`+${hiddenCount} more exercise${hiddenCount > 1 ? 's' : ''}`, 80, cy)
    cy += 52
  }

  // Muscle focus chip
  if (data.muscleFocus) {
    cy += 40
    const label = data.muscleFocus.toUpperCase()
    ctx.font = font(26, 700)
    const tw = ctx.measureText(label).width
    const chipW = tw + 48, chipH = 52, chipR = 26
    ctx.fillStyle = `${acHex === '#ffffff' ? 'rgba(255,255,255,0.08)' : acHex}22`
    rr(ctx, 80, cy - 36, chipW, chipH, chipR); ctx.fill()
    ctx.strokeStyle = `${acHex === '#ffffff' ? 'rgba(255,255,255,0.2)' : acHex}55`; ctx.lineWidth = 1.5
    rr(ctx, 80, cy - 36, chipW, chipH, chipR); ctx.stroke()
    ctx.fillStyle = acHex; ctx.fillText(label, 104, cy)
  }

  // Watermark
  ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.font = font(26)
  ctx.fillText('Made with LIFTSNAP · liftsnap.app', 80, H - 80)

  return new Promise(resolve => cv.toBlob(b => resolve(b!), 'image/png'))
}

export default function TodayShareView({ data }: { data: TodayData }) {
  const router = useRouter()
  const [theme,   setTheme]   = useState<Theme>('dark')
  const [accent,  setAccent]  = useState<Accent>('orange')
  const [sharing, setSharing] = useState(false)
  const [status,  setStatus]  = useState('')

  const handleShare = async () => {
    setSharing(true); setStatus('Generating card...')
    try {
      const blob = await generateCard(data, theme, accent)
      const file = new File([blob], 'liftsnap-today.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        setStatus('Sharing...')
        await navigator.share({ files: [file], title: "LIFTSNAP Today's Workout" })
        setStatus('')
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = 'liftsnap-today.png'; a.click()
        URL.revokeObjectURL(url)
        setStatus('Downloaded!'); setTimeout(() => setStatus(''), 2000)
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') setStatus('Error occurred')
      else setStatus('')
    } finally { setSharing(false) }
  }

  const ac = AC[accent]
  const acHex = accent === 'dark' ? '#ffffff' : ac.hex
  const volStr = fmtVol(data.volume)
  const showEx = data.exercises.slice(0, MAX_EX_DOM)
  const hiddenCount = Math.max(0, data.exercises.length - MAX_EX_DOM)

  return (
    <div className="min-h-screen pb-nav flex flex-col" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-3">
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
            background: theme === 'dark' ? '#0a0a0a' : `${CHECKER} #1a1a1a`,
            border: `1px solid ${ac.cardBorder}`,
          }}>

          {/* Top stripe */}
          <div className="absolute top-0 inset-x-0" style={{ height: 2, background: ac.topLine }} />

          <div className="relative flex flex-col h-full" style={{ padding: '12px 14px 10px' }}>

            {/* Badge */}
            <div className="inline-flex mb-2.5">
              <span className="text-[10px] font-black px-2.5 py-1 rounded-lg"
                style={{ background: ac.badgeBg, color: ac.badgeText, border: `1px solid ${ac.badgeBorder}`, letterSpacing: '0.12em' }}>
                LIFTSNAP
              </span>
            </div>

            {/* Date */}
            <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', marginBottom: 1 }}>{fmtDate(data.date)}</p>
            {/* Label */}
            <p style={{ fontSize: 7, fontWeight: 600, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em', marginBottom: 2 }}>TODAY&apos;S WORKOUT</p>
            {/* Title */}
            <p style={{ fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 5, textTransform: 'uppercase' }}>
              {data.title}
            </p>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 6 }} />

            {/* Volume */}
            <p style={{ fontSize: 7.5, fontWeight: 600, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.08em', marginBottom: 1 }}>TOTAL VOLUME</p>
            <div className="flex items-baseline" style={{ gap: 2, marginBottom: 2 }}>
              <span style={{ fontSize: 40, fontWeight: 900, lineHeight: 1, color: acHex }}>{volStr}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>kg</span>
            </div>
            <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.38)', marginBottom: 5 }}>{data.setsCount} SETS COMPLETED</p>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 6 }} />

            {/* Exercises */}
            <p style={{ fontSize: 7.5, fontWeight: 600, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.08em', marginBottom: 4 }}>EXERCISES</p>
            <div className="flex flex-col" style={{ gap: 5, marginBottom: 5 }}>
              {showEx.map(ex => (
                <div key={ex.name}>
                  <p style={{ fontSize: 9.5, fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.2, margin: 0 }}>{ex.name}</p>
                  <p style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.3, marginTop: 1, marginBottom: 0 }}>
                    {ex.sets} sets
                    {ex.bestWeight > 0 && ex.bestReps > 0 && (
                      <> · Best <span style={{ color: acHex, fontWeight: 700 }}>{fmtKg(ex.bestWeight)}kg × {ex.bestReps}</span></>
                    )}
                  </p>
                </div>
              ))}
              {hiddenCount > 0 && (
                <p style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.28)', margin: 0 }}>+{hiddenCount} more</p>
              )}
            </div>

            {/* Muscle focus chip */}
            {data.muscleFocus && (
              <span style={{
                alignSelf: 'flex-start', fontSize: 7.5, fontWeight: 700, letterSpacing: '0.08em',
                padding: '3px 8px', borderRadius: 99,
                background: `${acHex}18`, border: `1px solid ${acHex}44`, color: acHex,
                textTransform: 'uppercase',
              }}>
                {data.muscleFocus}
              </span>
            )}

            <div style={{ flex: 1 }} />
            <p style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.1)', margin: 0 }}>Made with LIFTSNAP · liftsnap.app</p>
          </div>
        </div>
      </div>

      {/* Background selector */}
      <div className="px-4 mb-3">
        <p className="text-[10px] font-bold mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>Background</p>
        <div className="flex gap-2">
          {(['dark', 'transparent'] as Theme[]).map(t => (
            <button key={t} className="flex-1 py-2.5 rounded-xl text-xs font-bold"
              style={{ background: theme === t ? '#ff6b00' : '#1a1a1a', color: theme === t ? '#fff' : '#666', border: `1px solid ${theme === t ? '#ff6b00' : '#2a2a2a'}` }}
              onClick={() => setTheme(t)}>
              {t === 'dark' ? 'Dark' : 'Transparent'}
            </button>
          ))}
        </div>
      </div>

      {/* Color selector */}
      <div className="px-4 mb-3">
        <p className="text-[10px] font-bold mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>Color</p>
        <div className="flex gap-2">
          {(['orange', 'purple', 'dark'] as Accent[]).map(a => {
            const sel = accent === a
            const bg = sel ? (a === 'orange' ? '#ff6b00' : a === 'purple' ? '#a855f7' : '#3a3a3a') : '#1a1a1a'
            return (
              <button key={a} className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{ background: bg, color: '#fff', border: `1px solid ${sel ? bg : '#2a2a2a'}` }}
                onClick={() => setAccent(a)}>
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Share button */}
      <div className="px-4 space-y-2 mb-4">
        {status && <p className="text-center text-sm" style={{ color: '#888' }}>{status}</p>}
        <button
          className="w-full py-4 rounded-2xl text-base font-black text-white flex items-center justify-center gap-2"
          style={{ background: '#ff6b00', boxShadow: '0 4px 20px rgba(255,107,0,0.3)' }}
          disabled={sharing} onClick={handleShare}>
          <Share2 size={20} />
          {sharing ? 'Generating...' : 'Share to Instagram Story'}
        </button>
        <p className="text-center text-xs" style={{ color: '#444' }}>Mobile only · Downloads as PNG on desktop</p>
      </div>
    </div>
  )
}
