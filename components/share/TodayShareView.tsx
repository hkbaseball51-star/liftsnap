'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Share2, ArrowLeft } from 'lucide-react'

export type TodayData = {
  title: string
  date: string
  volume: number
  setsCount: number
  exercises: {
    name: string
    setList: { weight: number; reps: number }[]
    setCount: number
    best1RM: number
  }[]
  bestLift: { name: string; weight: number } | null
  muscleFocus: string | null
}

type Theme  = 'dark' | 'transparent'
type Accent = 'orange' | 'purple' | 'dark'

const AC: Record<Accent, {
  hex: string; badgeBg: string; badgeBorder: string; badgeText: string
  cardBorder: string; topLine: string
}> = {
  orange: { hex: '#ff6b00', badgeBg: '#ff6b00', badgeBorder: 'transparent',          badgeText: '#ffffff',              cardBorder: 'rgba(255,107,0,0.35)',   topLine: '#ff6b00'                  },
  purple: { hex: '#a855f7', badgeBg: '#a855f7', badgeBorder: 'transparent',          badgeText: '#ffffff',              cardBorder: 'rgba(168,85,247,0.35)', topLine: '#a855f7'                  },
  dark:   { hex: '#ffffff', badgeBg: 'rgba(255,255,255,0.06)', badgeBorder: 'rgba(255,255,255,0.18)', badgeText: 'rgba(255,255,255,0.75)', cardBorder: 'rgba(255,255,255,0.1)', topLine: 'rgba(255,255,255,0.25)' },
}

const CHECKER = `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.07'%3E%3Cpath d='M0 0h10v10H0V0zm10 10h10v10H10V10z'/%3E%3C/g%3E%3C/svg%3E")`

const JA_EN: Record<string, string> = {
  'デッドリフト': 'Deadlift',                   'ベントオーバーロウ': 'Bent Over Row',
  'ベントオーバーロー': 'Bent Over Row',          'ラットプルダウン': 'Lat Pulldown',
  'チンニング': 'Chin-up',                        'チンアップ': 'Chin-up',
  'プルアップ': 'Pull-up',                        '懸垂': 'Pull-up',
  'ベンチプレス': 'Bench Press',                  'インクラインベンチプレス': 'Incline Bench Press',
  'ダンベルベンチプレス': 'DB Bench Press',       'インクラインダンベルプレス': 'Incline DB Press',
  'フラットダンベルプレス': 'Flat DB Press',      'ショルダープレス': 'Shoulder Press',
  'オーバーヘッドプレス': 'Overhead Press',       'ダンベルショルダープレス': 'DB Shoulder Press',
  'スクワット': 'Squat',                          'バーベルスクワット': 'Barbell Squat',
  'フロントスクワット': 'Front Squat',            'レッグプレス': 'Leg Press',
  'レッグカール': 'Leg Curl',                     'レッグエクステンション': 'Leg Extension',
  'ルーマニアンデッドリフト': 'Romanian Deadlift','アームカール': 'Arm Curl',
  'バーベルカール': 'Barbell Curl',               'ダンベルカール': 'DB Curl',
  'ハンマーカール': 'Hammer Curl',                'トライセプスエクステンション': 'Tricep Extension',
  'トライセプスプッシュダウン': 'Tricep Pushdown','プッシュダウン': 'Pushdown',
  'サイドレイズ': 'Lateral Raise',               'リアレイズ': 'Rear Delt Raise',
  'フロントレイズ': 'Front Raise',                'ダンベルロウ': 'DB Row',
  'ワンハンドロウ': 'One-Arm Row',                'ケーブルロウ': 'Cable Row',
  'シーテッドロウ': 'Seated Row',                 'プランク': 'Plank',
  'ディップス': 'Dips',                           'プッシュアップ': 'Push-up',
  'チェストフライ': 'Chest Fly',                  'ペックデック': 'Pec Deck',
  'ケーブルクロスオーバー': 'Cable Crossover',    'カーフレイズ': 'Calf Raise',
  'ヒップスラスト': 'Hip Thrust',                 'グッドモーニング': 'Good Morning',
  'バーベルロウ': 'Barbell Row',                  'ケーブルカール': 'Cable Curl',
  'フェイスプル': 'Face Pull',                    'シュラッグ': 'Shrug',
  'ランジ': 'Lunge',                              'ブルガリアンスクワット': 'Bulgarian Split Squat',
  'ケーブルフライ': 'Cable Fly',                  'インクラインカール': 'Incline Curl',
  'ステップアップ': 'Step Up',
}
const tname = (n: string) => JA_EN[n] ?? n

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r)
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r)
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r)
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r)
  ctx.closePath()
}

const fmtVol = (v: number) => v >= 10000 ? `${(v/1000).toFixed(1)}k` : v.toLocaleString()
const fmtKg  = (v: number) => v === Math.round(v) ? `${v}` : `${v.toFixed(1)}`
function fmtDate(s: string) {
  const d = new Date(s + 'T00:00:00')
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const D = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  return `${M[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${D[d.getDay()]}`
}

function estimateH(data: TodayData): number {
  let cy = 172
  cy += 38 + 50        // label + date
  cy += 84 + 84 + 30   // title worst-case 2 lines
  cy += 24 + 48        // gap + divider
  cy += 32 + 122 + 46  // stats
  cy += 20 + 44        // gap + divider
  cy += 36             // EXERCISES header
  data.exercises.forEach((ex, i) => {
    const vis = ex.setList.filter(s => s.weight > 0 || s.reps > 0).length
    cy += 54             // exercise name
    cy += 44             // meta row (sets · est.1RM)
    cy += vis * 48       // set rows
    if (i < data.exercises.length - 1) cy += 42  // gap + divider + gap
  })
  if (data.muscleFocus) cy += 70
  cy += 140
  return Math.max(1920, cy + 60)
}

async function generateCard(data: TodayData, theme: Theme, accent: Accent): Promise<Blob> {
  // Wait for fonts before any measureText / fillText to avoid metric drift
  await document.fonts.ready

  const W = 1080
  const H = estimateH(data)
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')!
  const ac = AC[accent]
  const acHex = accent === 'dark' ? '#ffffff' : ac.hex
  const isT = theme === 'transparent'

  if (!isT) { ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, W, H) }
  ctx.fillStyle = ac.topLine; ctx.fillRect(0, 0, W, 6)

  const f  = (sz: number, w: 400|500|700 = 400) =>
    `${w === 700 ? 'bold ' : w === 500 ? '500 ' : ''}${sz}px system-ui,-apple-system,sans-serif`

  // sh = strong shadow for headlines; ns = base shadow (always on in transparent)
  const sh = () => { ctx.shadowColor = 'rgba(0,0,0,0.92)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 2 }
  const ns = () => {
    if (isT) { ctx.shadowColor = 'rgba(0,0,0,0.96)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 1 }
    else     { ctx.shadowBlur = 0; ctx.shadowOffsetY = 0 }
  }
  const divLine = (x1: number, x2: number, y: number, alpha: number) => {
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke()
    ns()
  }

  ns()

  // ── Badge ──────────────────────────────────────────
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
  ctx.fillStyle = ac.badgeBg
  rr(ctx, 80, 90, 268, 62, 12); ctx.fill()
  if (accent === 'dark') {
    ctx.strokeStyle = ac.badgeBorder; ctx.lineWidth = 1.5
    rr(ctx, 80, 90, 268, 62, 12); ctx.stroke()
  }
  ns()
  ctx.fillStyle = ac.badgeText; ctx.font = f(28, 700)
  ctx.fillText('LIFTSNAP', 110, 132)

  let cy = 174

  // TODAY'S WORKOUT + date
  ctx.fillStyle = 'rgba(255,255,255,0.58)'; ctx.font = f(22, 500)
  ctx.fillText("TODAY'S WORKOUT", 80, cy); cy += 38
  ctx.fillStyle = 'rgba(255,255,255,0.78)'; ctx.font = f(32)
  ctx.fillText(fmtDate(data.date), 80, cy); cy += 50

  // Title
  ctx.fillStyle = '#ffffff'; ctx.font = f(76, 700)
  const tu = data.title.toUpperCase()
  if (ctx.measureText(tu).width > W - 160) {
    const words = tu.split(' ')
    let l1 = '', i2 = 0
    while (i2 < words.length && ctx.measureText((l1 ? l1 + ' ' : '') + words[i2]).width <= W - 160)
      l1 = (l1 ? l1 + ' ' : '') + words[i2++]
    sh(); ctx.fillStyle = '#ffffff'; ctx.font = f(76, 700)
    ctx.fillText(l1, 80, cy); cy += 84
    ctx.fillText(words.slice(i2).join(' '), 80, cy); cy += 30
  } else {
    sh(); ctx.fillStyle = '#ffffff'; ctx.font = f(76, 700)
    ctx.fillText(tu, 80, cy); cy += 30
  }
  ns()

  cy += 24; divLine(80, W - 80, cy, isT ? 0.22 : 0.12); cy += 48

  // TOTAL VOLUME
  ctx.fillStyle = 'rgba(255,255,255,0.62)'; ctx.font = f(22, 500)
  ctx.fillText('TOTAL VOLUME', 80, cy); cy += 32

  const vs = fmtVol(data.volume)
  sh()
  ctx.fillStyle = acHex; ctx.font = f(112, 700)
  ctx.fillText(vs, 80, cy)
  const vsW = ctx.measureText(vs).width  // measure while font is still 112px bold
  ctx.fillStyle = 'rgba(255,255,255,0.68)'; ctx.font = f(44, 500)
  ctx.fillText(' kg', 80 + vsW, cy - 8)
  cy += 122; ns()

  const g1rm = data.exercises.reduce((m, ex) => Math.max(m, ex.best1RM), 0)
  ctx.fillStyle = 'rgba(255,255,255,0.78)'; ctx.font = f(32, 700)
  ctx.fillText(`${data.setsCount}`, 80, cy)
  const numW = ctx.measureText(`${data.setsCount}`).width  // measure with bold font
  ctx.fillStyle = 'rgba(255,255,255,0.62)'; ctx.font = f(32)
  ctx.fillText(' SETS', 80 + numW, cy)
  if (g1rm > 0) {
    const setsTextW = ctx.measureText(' SETS').width          // regular font width
    const sfw = numW + setsTextW                              // accurate total
    const sep = '  ·  '
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = f(32)
    ctx.fillText(sep, 80 + sfw, cy)
    const sepW = ctx.measureText(sep).width
    ctx.fillStyle = 'rgba(255,255,255,0.62)'; ctx.font = f(32)
    const lbl = 'BEST 1RM  '
    ctx.fillText(lbl, 80 + sfw + sepW, cy)
    const lblW = ctx.measureText(lbl).width
    ctx.fillStyle = acHex; ctx.font = f(32, 700)
    ctx.fillText(`${Math.round(g1rm)}kg`, 80 + sfw + sepW + lblW, cy)
  }
  cy += 46

  cy += 20; divLine(80, W - 80, cy, isT ? 0.22 : 0.12); cy += 44

  // EXERCISES header
  ctx.fillStyle = 'rgba(255,255,255,0.62)'; ctx.font = f(22, 500)
  ctx.fillText('EXERCISES', 80, cy); cy += 36

  // ── Exercise list (no card backgrounds) ────────────
  data.exercises.forEach((ex, i) => {
    const visibleSets = ex.setList.filter(s => s.weight > 0 || s.reps > 0)
    if (cy > H - 120) return

    // Name — large, prominent
    sh()
    ctx.fillStyle = '#ffffff'; ctx.font = f(46, 700)
    ctx.fillText(tname(ex.name), 80, cy); cy += 54; ns()

    // Meta row: N sets · est. 1RM
    ctx.fillStyle = 'rgba(255,255,255,0.58)'; ctx.font = f(28, 500)
    const setsLbl = `${ex.setCount} sets`
    ctx.fillText(setsLbl, 80, cy)
    if (ex.best1RM > 0) {
      const slw = ctx.measureText(setsLbl).width
      const sep = '  ·  '
      ctx.fillStyle = 'rgba(255,255,255,0.30)'; ctx.font = f(28)
      ctx.fillText(sep, 80 + slw, cy)
      const spw = ctx.measureText(sep).width
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = f(28)
      const lbl = 'est. 1RM  '
      ctx.fillText(lbl, 80 + slw + spw, cy)
      const lblW = ctx.measureText(lbl).width  // measure while font is still f(28)
      ctx.fillStyle = acHex; ctx.font = f(28, 700)
      ctx.fillText(`${Math.round(ex.best1RM)}kg`, 80 + slw + spw + lblW, cy)
    }
    cy += 44

    // Set rows — hero data, readable
    visibleSets.forEach(s => {
      if (cy > H - 120) return
      const kg = s.weight > 0 ? `${fmtKg(s.weight)}kg` : 'BW'
      ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = f(38, 500)
      ctx.fillText(kg, 80, cy)
      const kgW = ctx.measureText(kg).width  // measure while font is still f(38,500)
      ctx.fillStyle = 'rgba(255,255,255,0.50)'; ctx.font = f(38)
      ctx.fillText(` × ${s.reps}`, 80 + kgW, cy)
      cy += 48
    })

    // Thin separator between exercises
    if (i < data.exercises.length - 1) {
      cy += 16
      divLine(80, W - 80, cy, isT ? 0.14 : 0.08)
      cy += 26
    }
  })

  if (data.muscleFocus) {
    cy += 22
    const lbl = data.muscleFocus.toUpperCase()
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
    ctx.font = f(24, 700)
    const tw = ctx.measureText(lbl).width
    ctx.fillStyle = `${acHex}1a`
    rr(ctx, 80, cy - 32, tw + 44, 48, 24); ctx.fill()
    ctx.strokeStyle = `${acHex}44`; ctx.lineWidth = 1.5
    rr(ctx, 80, cy - 32, tw + 44, 48, 24); ctx.stroke()
    ns()
    ctx.fillStyle = acHex; ctx.fillText(lbl, 102, cy)
  }

  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.font = f(26)
  ctx.fillText('Made with LIFTSNAP · liftsnap.app', 80, H - 80)

  return new Promise(resolve => cv.toBlob(b => resolve(b!), 'image/png'))
}

export default function TodayShareView({ data }: { data: TodayData }) {
  const router  = useRouter()
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

  const ac    = AC[accent]
  const acHex = accent === 'dark' ? '#ffffff' : ac.hex
  const volStr = fmtVol(data.volume)
  const g1rm   = data.exercises.reduce((m, ex) => Math.max(m, ex.best1RM), 0)
  const isT    = theme === 'transparent'

  const dividerColor = isT ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.10)'
  // text-shadow inherited by all children; subtle glow in dark, strong in transparent
  const tsh = isT
    ? '0 1px 8px rgba(0,0,0,1), 0 0 16px rgba(0,0,0,0.9)'
    : '0 1px 4px rgba(0,0,0,0.7)'

  return (
    <div className="min-h-screen pb-nav flex flex-col" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-12 pb-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg" style={{ background: '#1a1a1a' }}>
          <ArrowLeft size={16} style={{ color: '#777' }} />
        </button>
        <h1 className="text-sm font-black tracking-widest text-white">Share Story</h1>
      </div>

      {/* ── Story preview ────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px 16px' }}>
        <div style={{ width: 'min(94vw, 420px)' }}>
          <div style={{
            maxHeight: '76vh', overflowY: 'auto', overflowX: 'hidden',
            borderRadius: 24, position: 'relative',
            background: isT
              ? `linear-gradient(rgba(0,0,0,0.42), rgba(0,0,0,0.48)), ${CHECKER} #1a1a1a`
              : '#0a0a0a',
            border: `1px solid ${ac.cardBorder}`,
          }}>
            <div style={{ position: 'sticky', top: 0, left: 0, right: 0, height: 2, background: ac.topLine, zIndex: 2 }} />

            {/* textShadow cascades to all children */}
            <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', textShadow: tsh }}>

              {/* Badge */}
              <div style={{ display: 'inline-flex', marginBottom: 8 }}>
                <span style={{
                  fontSize: 10, fontWeight: 900, padding: '4px 10px', borderRadius: 8,
                  background: ac.badgeBg, color: ac.badgeText,
                  border: `1px solid ${ac.badgeBorder}`, letterSpacing: '0.12em',
                }}>LIFTSNAP</span>
              </div>

              <p style={{ fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,0.58)', letterSpacing: '0.1em', margin: '0 0 2px' }}>
                TODAY&apos;S WORKOUT
              </p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.78)', margin: '0 0 3px' }}>{fmtDate(data.date)}</p>
              <p style={{ fontSize: 20, fontWeight: 900, color: '#fff', lineHeight: 1.1, textTransform: 'uppercase', margin: '0 0 10px' }}>
                {data.title}
              </p>

              <div style={{ height: 1, background: dividerColor, margin: '0 0 8px' }} />

              <p style={{ fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,0.62)', letterSpacing: '0.08em', margin: '0 0 2px' }}>TOTAL VOLUME</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, margin: '0 0 3px' }}>
                <span style={{ fontSize: 42, fontWeight: 900, lineHeight: 1, color: acHex }}>{volStr}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.65)' }}>kg</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 10px' }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.78)' }}>{data.setsCount} SETS</span>
                {g1rm > 0 && (
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.62)' }}>
                    · BEST 1RM <span style={{ color: acHex, fontWeight: 700 }}>{Math.round(g1rm)}kg</span>
                  </span>
                )}
              </div>

              <div style={{ height: 1, background: dividerColor, margin: '0 0 8px' }} />

              <p style={{ fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,0.62)', letterSpacing: '0.08em', margin: '0 0 10px' }}>EXERCISES</p>

              {/* ── Exercise list — flat, no card bg ── */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {data.exercises.map((ex, idx) => {
                  const visibleSets = ex.setList.filter(s => s.weight > 0 || s.reps > 0)
                  return (
                    <div key={ex.name}>
                      {/* Exercise name — large */}
                      <p style={{ fontSize: 14, fontWeight: 800, color: '#ffffff', margin: '0 0 2px', letterSpacing: '0.005em' }}>
                        {tname(ex.name)}
                      </p>

                      {/* Meta row: N sets · est. 1RM — right under name */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, margin: '0 0 5px' }}>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.58)', fontWeight: 500 }}>
                          {ex.setCount} sets
                        </span>
                        {ex.best1RM > 0 && (
                          <>
                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)' }}>·</span>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>
                              est. 1RM&nbsp;
                              <span style={{ color: acHex, fontWeight: 700 }}>{Math.round(ex.best1RM)}kg</span>
                            </span>
                          </>
                        )}
                      </div>

                      {/* Set rows — hero data */}
                      {visibleSets.map((s, si) => (
                        <p key={si} style={{ fontSize: 13, lineHeight: 1.65, margin: 0, fontWeight: 500 }}>
                          <span style={{ color: 'rgba(255,255,255,0.92)' }}>
                            {s.weight > 0 ? `${fmtKg(s.weight)}kg` : 'BW'}
                          </span>
                          <span style={{ color: 'rgba(255,255,255,0.50)' }}> × {s.reps}</span>
                        </p>
                      ))}

                      {/* Thin divider between exercises — not after last */}
                      {idx < data.exercises.length - 1 && (
                        <div style={{ height: 1, background: isT ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)', margin: '10px 0' }} />
                      )}
                    </div>
                  )
                })}
              </div>

              {data.muscleFocus && (
                <span style={{
                  alignSelf: 'flex-start', fontSize: 8, fontWeight: 700, letterSpacing: '0.08em',
                  padding: '3px 8px', borderRadius: 99, marginTop: 12,
                  background: `${acHex}18`, border: `1px solid ${acHex}44`, color: acHex,
                  textTransform: 'uppercase',
                }}>
                  {data.muscleFocus}
                </span>
              )}

              <p style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.18)', marginTop: 12, textShadow: 'none' }}>
                Made with LIFTSNAP · liftsnap.app
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Options ──────────────────────────────── */}
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

      <div className="px-4 mb-3">
        <p className="text-[10px] font-bold mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>Color</p>
        <div className="flex gap-2">
          {(['orange', 'purple', 'dark'] as Accent[]).map(a => {
            const sel = accent === a
            const bg  = sel ? (a === 'orange' ? '#ff6b00' : a === 'purple' ? '#a855f7' : '#3a3a3a') : '#1a1a1a'
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
