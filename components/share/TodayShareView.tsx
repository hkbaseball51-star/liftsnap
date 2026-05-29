'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Share2, ArrowLeft } from 'lucide-react'
import { getShareCount, incrementShareCount, getShareThemeUnlocks } from '@/lib/unlocks'

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
type Accent = 'orange' | 'purple' | 'dark' | 'black'

const AC: Record<Accent, {
  hex: string; badgeBg: string; badgeBorder: string; badgeText: string
  cardBorder: string; topLine: string
}> = {
  orange: { hex: '#ff6b00', badgeBg: '#ff6b00',               badgeBorder: 'transparent',            badgeText: '#ffffff',              cardBorder: 'rgba(255,107,0,0.35)',  topLine: '#ff6b00'                   },
  purple: { hex: '#a855f7', badgeBg: '#a855f7',               badgeBorder: 'transparent',            badgeText: '#ffffff',              cardBorder: 'rgba(168,85,247,0.35)', topLine: '#a855f7'                   },
  dark:   { hex: '#ffffff', badgeBg: 'rgba(255,255,255,0.06)', badgeBorder: 'rgba(255,255,255,0.18)', badgeText: 'rgba(255,255,255,0.75)',cardBorder: 'rgba(255,255,255,0.1)', topLine: 'rgba(255,255,255,0.25)'   },
  black:  { hex: '#ffffff', badgeBg: 'transparent',            badgeBorder: 'rgba(255,255,255,0.28)', badgeText: '#ffffff',              cardBorder: 'rgba(255,255,255,0.04)', topLine: 'rgba(255,255,255,0.08)'   },
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

const fmtVol = (v: number) => v >= 10000 ? `${(v/1000).toFixed(1)}k` : v.toLocaleString()
const fmtKg  = (v: number) => v === Math.round(v) ? `${v}` : `${v.toFixed(1)}`
function fmtDate(s: string) {
  const d = new Date(s + 'T00:00:00')
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const D = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  return `${M[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${D[d.getDay()]}`
}

// Capture the preview DOM directly with html-to-image.
// Temporarily unclips the scroll container so the full content height is captured.
async function captureCard(captureEl: HTMLDivElement, theme: Theme): Promise<Blob> {
  const { toPng } = await import('html-to-image')

  // 1. Fonts must be fully loaded before measuring
  await document.fonts.ready
  // 2. Wait for layout to settle
  await new Promise(r => requestAnimationFrame(r))
  await new Promise(r => setTimeout(r, 60))

  const scrollParent = captureEl.parentElement as HTMLElement

  // Temporarily unclip the scroll container so the full content is captured
  const prevMaxH    = scrollParent.style.maxHeight
  const prevOvflow  = scrollParent.style.overflow
  scrollParent.style.maxHeight = 'none'
  scrollParent.style.overflow  = 'visible'

  // For transparent mode: remove the checker preview bg so the PNG has true alpha
  const prevBg = captureEl.style.background
  captureEl.style.background = theme === 'transparent' ? 'transparent' : '#0a0a0a'

  // One more frame for the layout change to propagate
  await new Promise(r => requestAnimationFrame(r))

  // Measure AFTER layout settles with scroll container unclipped
  const W = captureEl.offsetWidth
  // scrollHeight = full content height (not clipped by maxHeight)
  const H = captureEl.scrollHeight
  const pixelRatio = Math.min(4, Math.round(1080 / Math.max(W, 1)))

  try {
    const dataUrl = await toPng(captureEl, {
      width:  W,
      height: H,
      // Force the clone to the measured width so the inherited ancestor
      // width constraint (min(94vw,420px)) is not lost in html-to-image's
      // cloning context. Without this, flex/text layout can reflow to 0.
      style: {
        width:     `${W}px`,
        maxHeight: 'none',
        overflow:  'visible',
      },
      pixelRatio,
      cacheBust: true,
      skipFonts: true,
    })
    const res = await fetch(dataUrl)
    return await res.blob()
  } finally {
    // Always restore DOM state
    captureEl.style.background   = prevBg
    scrollParent.style.maxHeight = prevMaxH
    scrollParent.style.overflow  = prevOvflow
  }
}

export default function TodayShareView({ data }: { data: TodayData }) {
  const router     = useRouter()
  const captureRef = useRef<HTMLDivElement>(null)

  const [theme,      setTheme]      = useState<Theme>('dark')
  const [accent,     setAccent]     = useState<Accent>('dark')
  const [sharing,    setSharing]    = useState(false)
  const [status,     setStatus]     = useState('')
  const [shareCount, setShareCount] = useState(0)

  useEffect(() => { setShareCount(getShareCount()) }, [])

  const handleShare = async () => {
    if (!captureRef.current) return
    setSharing(true); setStatus('Generating card...')
    try {
      const blob = await captureCard(captureRef.current, theme)
      const file = new File([blob], 'liftsnap-today.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        setStatus('Sharing...')
        await navigator.share({ files: [file], title: "LIFTSNAP Today's Workout" })
        const next = incrementShareCount(); setShareCount(next)
        setStatus('')
      } else {
        const url = URL.createObjectURL(blob)
        const a   = document.createElement('a')
        a.href = url; a.download = 'liftsnap-today.png'; a.click()
        URL.revokeObjectURL(url)
        const next = incrementShareCount(); setShareCount(next)
        setStatus('Downloaded!'); setTimeout(() => setStatus(''), 2000)
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') setStatus('Error occurred')
      else setStatus('')
    } finally { setSharing(false) }
  }

  const ac    = AC[accent]
  const acHex = ac.hex
  const isT   = theme === 'transparent'

  const volStr       = fmtVol(data.volume)
  const g1rm         = data.exercises.reduce((m, ex) => Math.max(m, ex.best1RM), 0)
  const dividerColor = 'rgba(255,255,255,0.22)'
  // text-shadow cascades to all children; natural shadow keeps white readable over photos
  const tsh = '0 2px 8px rgba(0,0,0,0.75)'
  // Preview background (checker for transparent to indicate alpha)
  const previewBg = isT
    ? `linear-gradient(rgba(0,0,0,0.42), rgba(0,0,0,0.48)), ${CHECKER} #1a1a1a`
    : '#0a0a0a'

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

          {/*
            Outer: scroll container for preview UX (clips to maxHeight, rounded corners).
            Does NOT hold the background — captureRef does.
          */}
          <div style={{
            maxHeight: '76vh', overflowY: 'auto', overflowX: 'hidden',
            borderRadius: 24, position: 'relative',
          }}>
            {/*
              captureRef: this is the element html-to-image captures.
              Background lives here so the export picks it up.
              No maxHeight / overflow — full content height is always rendered.
            */}
            <div ref={captureRef} style={{ background: previewBg }}>

              {/* All card content — textShadow inherited by every child */}
              <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', textShadow: tsh }}>

                {/* Badge */}
                <div style={{ display: 'inline-flex', marginBottom: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 900, padding: '4px 10px', borderRadius: 8,
                    background: ac.badgeBg, color: ac.badgeText,
                    border: `1px solid ${ac.badgeBorder}`, letterSpacing: '0.12em',
                  }}>LIFTSNAP</span>
                </div>

                {/* Header labels */}
                <p style={{ fontSize: 8, fontWeight: 600, color: '#EDEDED', letterSpacing: '0.1em', margin: '0 0 2px', lineHeight: 1.2 }}>
                  TODAY&apos;S WORKOUT
                </p>
                <p style={{ fontSize: 10, color: '#F2F2F2', margin: '0 0 3px', lineHeight: 1.4 }}>
                  {fmtDate(data.date)}
                </p>
                <p style={{ fontSize: 20, fontWeight: 900, color: '#fff', lineHeight: 1.1, textTransform: 'uppercase', margin: '0 0 10px' }}>
                  {data.title}
                </p>

                <div style={{ height: 1, background: dividerColor, margin: '0 0 8px' }} />

                {/* TOTAL VOLUME */}
                <p style={{ fontSize: 8, fontWeight: 600, color: '#EDEDED', letterSpacing: '0.08em', margin: '0 0 2px', lineHeight: 1.2 }}>
                  TOTAL VOLUME
                </p>
                {/* flex keeps the number and unit on the same line — no absolute positioning */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, margin: '0 0 3px', lineHeight: 1 }}>
                  <span style={{ fontSize: 42, fontWeight: 900, color: acHex, lineHeight: 1 }}>{volStr}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#F2F2F2', lineHeight: 1, paddingBottom: 2 }}>kg</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 10px', flexWrap: 'nowrap' }}>
                  <span style={{ fontSize: 9, color: '#F2F2F2', lineHeight: 1.4, whiteSpace: 'nowrap' }}>{data.setsCount} SETS</span>
                  {g1rm > 0 && (
                    <span style={{ fontSize: 9, color: '#EDEDED', lineHeight: 1.4, whiteSpace: 'nowrap' }}>
                      · BEST 1RM <span style={{ color: acHex, fontWeight: 700 }}>{Math.round(g1rm)}kg</span>
                    </span>
                  )}
                </div>

                <div style={{ height: 1, background: dividerColor, margin: '0 0 8px' }} />

                {/* Exercises */}
                <p style={{ fontSize: 8, fontWeight: 600, color: '#EDEDED', letterSpacing: '0.08em', margin: '0 0 10px', lineHeight: 1.2 }}>
                  EXERCISES
                </p>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {data.exercises.map((ex, idx) => {
                    const visibleSets = ex.setList.filter(s => s.weight > 0 || s.reps > 0)
                    return (
                      <div key={ex.name}>
                        {/* Exercise name */}
                        <p style={{ fontSize: 14, fontWeight: 800, color: '#ffffff', margin: '0 0 8px', letterSpacing: '0.005em', lineHeight: 1.1 }}>
                          {tname(ex.name)}
                        </p>

                        {/* Meta row: N sets · est. 1RM — single line, no wrap */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 12px', flexWrap: 'nowrap', lineHeight: 1.1 }}>
                          <span style={{ fontSize: 10, color: '#EDEDED', fontWeight: 500, lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                            {ex.setCount} sets
                          </span>
                          {ex.best1RM > 0 && (
                            <>
                              <span style={{ fontSize: 9, color: '#EDEDED', lineHeight: 1.1 }}>·</span>
                              <span style={{ fontSize: 10, color: '#F2F2F2', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                                est. 1RM&nbsp;
                                <span style={{ color: acHex, fontWeight: 700 }}>{Math.round(ex.best1RM)}kg</span>
                              </span>
                            </>
                          )}
                        </div>

                        {/* Set rows — hero data */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {visibleSets.map((s, si) => (
                            <p key={si} style={{ fontSize: 13, lineHeight: 1.3, margin: 0, fontWeight: 500 }}>
                              <span style={{ color: '#F0F0F0' }}>
                                {s.weight > 0 ? `${fmtKg(s.weight)}kg` : 'BW'}
                              </span>
                              <span style={{ color: '#F2F2F2' }}> × {s.reps}</span>
                            </p>
                          ))}
                        </div>

                        {/* Thin divider between exercises, not after last */}
                        {idx < data.exercises.length - 1 && (
                          <div style={{ height: 1, background: 'rgba(255,255,255,0.18)', margin: '10px 0' }} />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Muscle chip */}
                {data.muscleFocus && (
                  <span style={{
                    alignSelf: 'flex-start', fontSize: 8, fontWeight: 700, letterSpacing: '0.08em',
                    padding: '3px 8px', borderRadius: 99, marginTop: 12,
                    background: `${acHex}18`, border: `1px solid ${acHex}44`, color: acHex,
                    textTransform: 'uppercase', lineHeight: 1.6,
                  }}>
                    {data.muscleFocus}
                  </span>
                )}

                {/* Watermark — opt-out of inherited text-shadow to keep it subtle */}
                <p style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.50)', marginTop: 12, lineHeight: 1.4, textShadow: 'none' }}>
                  Made with LIFTSNAP · liftsnap.app
                </p>

              </div>{/* /content */}
            </div>{/* /captureRef */}
          </div>{/* /scroll container */}
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
          {(() => {
            const shareThemes = getShareThemeUnlocks(shareCount)
            return (['dark', 'orange', 'purple', 'black'] as Accent[]).map(a => {
              const info     = shareThemes.find(t => t.accent === a)!
              const unlocked = info.unlocked
              const sel      = accent === a
              const selBg    = a === 'orange' ? '#ff6b00' : a === 'purple' ? '#a855f7' : a === 'black' ? '#050505' : '#3a3a3a'
              const bg       = sel ? selBg : '#1a1a1a'
              return (
                <button key={a} className="flex-1 py-2 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-0.5"
                  style={{ background: bg, color: unlocked ? '#fff' : '#444', border: `1px solid ${sel ? selBg : '#2a2a2a'}`, opacity: unlocked ? 1 : 0.55, minHeight: 44 }}
                  onClick={() => unlocked && setAccent(a)}>
                  <span>{info.label}</span>
                  {!unlocked && <span style={{ fontSize: 9, color: '#555' }}>🔒{info.requiredShares}</span>}
                </button>
              )
            })
          })()}
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
