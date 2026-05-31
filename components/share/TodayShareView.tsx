'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Share2, ArrowLeft, Camera, RotateCcw, ImageIcon } from 'lucide-react'
import { getShareCount, incrementShareCount, getShareThemeUnlocks } from '@/lib/unlocks'
import { useWeightUnit } from '@/lib/useWeightUnit'
import { toDisplayWeight, weightUnitLabel, formatVolumeWithUnit } from '@/lib/units'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from '@/lib/useLocale'
import { t } from '@/lib/i18n'
import WorkoutPhotoSheet from '@/components/photo/WorkoutPhotoSheet'

export type TodayData = {
  sessionId?: string
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
  photoPath?: string | null
}

type Theme  = 'dark' | 'transparent'
type Accent = 'orange' | 'purple' | 'dark' | 'black'

const AC: Record<Accent, {
  hex: string; badgeBg: string; badgeBorder: string; badgeText: string
  cardBorder: string; topLine: string
}> = {
  orange: { hex: '#ff6b00', badgeBg: '#ff6b00',               badgeBorder: 'transparent',            badgeText: '#ffffff',              cardBorder: 'rgba(255,107,0,0.35)',  topLine: '#ff6b00'                   },
  purple: { hex: '#6E38D4', badgeBg: '#6E38D4',               badgeBorder: 'transparent',            badgeText: '#ffffff',              cardBorder: 'rgba(110,56,212,0.35)', topLine: '#6E38D4'                   },
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

const fmtKg = (v: number) => v === Math.round(v) ? `${v}` : `${v.toFixed(1)}`
function fmtDate(s: string) {
  const d = new Date(s + 'T00:00:00')
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const D = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  return `${M[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${D[d.getDay()]}`
}

async function captureStory(captureEl: HTMLDivElement, theme: Theme, hasPhoto: boolean): Promise<Blob> {
  const { toPng } = await import('html-to-image')
  await document.fonts.ready
  await new Promise(r => requestAnimationFrame(r))
  await new Promise(r => setTimeout(r, 60))

  const W = captureEl.offsetWidth
  const H = captureEl.offsetHeight
  const pixelRatio = Math.min(4, Math.round(1080 / Math.max(W, 1)))

  const prevBg = captureEl.style.background
  if (theme === 'transparent' && !hasPhoto) captureEl.style.background = 'transparent'
  await new Promise(r => requestAnimationFrame(r))

  try {
    const dataUrl = await toPng(captureEl, {
      width: W,
      height: H,
      style: { width: `${W}px`, height: `${H}px` },
      pixelRatio,
      cacheBust: true,
      skipFonts: true,
    })
    const res = await fetch(dataUrl)
    return await res.blob()
  } finally {
    captureEl.style.background = prevBg
  }
}

export default function TodayShareView({ data }: { data: TodayData }) {
  const router     = useRouter()
  const captureRef = useRef<HTMLDivElement>(null)
  const cardRef    = useRef<HTMLDivElement>(null)
  const { unit }   = useWeightUnit()
  const { locale } = useLocale()
  const unitLabel  = weightUnitLabel(unit)

  // todayStr in Asia/Tokyo for canEdit check in WorkoutPhotoSheet
  const todayStr = new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' })

  const [theme,          setTheme]          = useState<Theme>('dark')
  const [accent,         setAccent]         = useState<Accent>('dark')
  const [sharing,        setSharing]        = useState(false)
  const [status,         setStatus]         = useState('')
  const [shareCount,     setShareCount]     = useState(0)
  const [photoDataUrl,   setPhotoDataUrl]   = useState<string | null>(null)
  const [photoLoading,   setPhotoLoading]   = useState(false)
  const [localPhotoPath, setLocalPhotoPath] = useState<string | null>(data.photoPath ?? null)
  const [showPhotoSheet, setShowPhotoSheet] = useState(false)
  const [cardPos,        setCardPos]        = useState({ x: 16, y: 180 })

  const isDragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  useEffect(() => { setShareCount(getShareCount()) }, [])

  // Load photo as data URL whenever localPhotoPath changes
  useEffect(() => {
    if (!localPhotoPath) {
      setPhotoDataUrl(null)
      setPhotoLoading(false)
      return
    }
    setPhotoDataUrl(null)
    setPhotoLoading(true)
    let cancelled = false
    async function loadPhoto() {
      const supabase = createClient()
      const { data: urlData } = await supabase.storage
        .from('workout-photos')
        .createSignedUrl(localPhotoPath!, 3600)
      if (cancelled || !urlData?.signedUrl) { if (!cancelled) setPhotoLoading(false); return }
      try {
        const res  = await fetch(urlData.signedUrl)
        const blob = await res.blob()
        const dataUrl = await new Promise<string>(resolve => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
        if (!cancelled) { setPhotoDataUrl(dataUrl); setPhotoLoading(false) }
      } catch { if (!cancelled) setPhotoLoading(false) }
    }
    loadPhoto()
    return () => { cancelled = true }
  }, [localPhotoPath])

  // Center card after initial render
  useEffect(() => {
    requestAnimationFrame(() => {
      const container = captureRef.current
      const card      = cardRef.current
      if (!container || !card) return
      const cW    = container.clientWidth
      const cH    = container.clientHeight
      const cardW = card.clientWidth
      const cardH = card.clientHeight
      if (cW === 0 || cH === 0) return
      setCardPos({
        x: (cW - cardW) / 2,
        y: Math.max(16, Math.min(cH - cardH - 16, Math.round(cH * 0.45 - cardH / 2))),
      })
    })
  }, [])

  const resetPosition = () => {
    const container = captureRef.current
    const card      = cardRef.current
    if (!container || !card) return
    const cW    = container.clientWidth
    const cH    = container.clientHeight
    const cardW = card.clientWidth
    const cardH = card.clientHeight
    setCardPos({
      x: (cW - cardW) / 2,
      y: Math.max(16, Math.min(cH - cardH - 16, Math.round(cH * 0.45 - cardH / 2))),
    })
  }

  // Called by WorkoutPhotoSheet after successful save
  const handlePhotoSaved = (imagePath: string) => {
    setLocalPhotoPath(imagePath)
    setShowPhotoSheet(false)
    setStatus(t(locale, 'story.photoSavedCreateStory'))
    setTimeout(() => setStatus(''), 3000)
  }

  // Called by WorkoutPhotoSheet after deletion
  const handlePhotoDeleted = () => {
    setLocalPhotoPath(null)
    setShowPhotoSheet(false)
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    isDragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return
    const container = captureRef.current
    if (!container) return
    const cRect = container.getBoundingClientRect()
    const cardW = e.currentTarget.offsetWidth
    const cardH = e.currentTarget.offsetHeight
    const cW    = container.offsetWidth
    const cH    = container.offsetHeight
    let newX = e.clientX - cRect.left - dragOffset.current.x
    let newY = e.clientY - cRect.top  - dragOffset.current.y
    newX = Math.max(-cardW * 0.4, Math.min(cW - cardW * 0.6, newX))
    newY = Math.max(-cardH * 0.4, Math.min(cH - cardH * 0.6, newY))
    setCardPos({ x: newX, y: newY })
  }

  const handlePointerUp = () => { isDragging.current = false }

  const handleShare = async () => {
    if (!captureRef.current) return
    setSharing(true)
    setStatus(t(locale, 'story.generating'))
    try {
      const blob = await captureStory(captureRef.current, theme, !!photoDataUrl)
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

  const ac       = AC[accent]
  const acHex    = ac.hex
  const isT      = theme === 'transparent'
  const hasPhoto = !!photoDataUrl

  const volStr       = formatVolumeWithUnit(data.volume, unit)
  const g1rm         = data.exercises.reduce((m, ex) => Math.max(m, ex.best1RM), 0)
  const dividerColor = 'rgba(255,255,255,0.22)'
  const tsh          = '0 2px 8px rgba(0,0,0,0.75)'

  const containerBg = hasPhoto
    ? '#0a0a0a'
    : isT
      ? `linear-gradient(rgba(0,0,0,0.42), rgba(0,0,0,0.48)), ${CHECKER} #1a1a1a`
      : '#0a0a0a'

  const cardBg = hasPhoto ? 'rgba(0,0,0,0.72)' : isT ? 'rgba(0,0,0,0.55)' : '#111111'

  // Main button props driven by state
  const canShare        = !!data.sessionId
  const mainBtnLoading  = sharing || photoLoading
  const mainBtnIsAdd    = !localPhotoPath && !hasPhoto

  return (
    <div className="min-h-screen pb-nav flex flex-col" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-12 pb-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg" style={{ background: '#1a1a1a' }}>
          <ArrowLeft size={16} style={{ color: '#777' }} />
        </button>
        <h1 className="text-sm font-black tracking-widest text-white">{t(locale, 'story.title')}</h1>
      </div>

      {/* ── 9:16 Story preview ──────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px 8px' }}>
        <div style={{ width: 'min(94vw, 420px)' }}>
          <div
            ref={captureRef}
            style={{
              position: 'relative',
              aspectRatio: '9/16',
              overflow: 'hidden',
              borderRadius: 24,
              background: containerBg,
            }}
          >
            {/* Photo background */}
            {photoDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoDataUrl}
                alt=""
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* Gradient overlay (photo mode only) */}
            {photoDataUrl && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.52) 100%)',
                pointerEvents: 'none',
              }} />
            )}

            {/* Draggable record card */}
            <div
              ref={cardRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              style={{
                position: 'absolute',
                left: cardPos.x,
                top: cardPos.y,
                width: 'calc(100% - 32px)',
                touchAction: 'none',
                userSelect: 'none',
                cursor: 'grab',
                background: cardBg,
                border: `1px solid ${ac.cardBorder}`,
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              <div style={{ height: 2, background: ac.topLine }} />

              <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', textShadow: tsh }}>

                <div style={{ display: 'inline-flex', marginBottom: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 900, padding: '4px 10px', borderRadius: 8,
                    background: ac.badgeBg, color: ac.badgeText,
                    border: `1px solid ${ac.badgeBorder}`, letterSpacing: '0.12em',
                  }}>LIFTSNAP</span>
                </div>

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

                <p style={{ fontSize: 8, fontWeight: 600, color: '#EDEDED', letterSpacing: '0.08em', margin: '0 0 2px', lineHeight: 1.2 }}>
                  TOTAL VOLUME
                </p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, margin: '0 0 3px', lineHeight: 1 }}>
                  <span style={{ fontSize: 42, fontWeight: 900, color: acHex, lineHeight: 1 }}>{volStr}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 10px', flexWrap: 'nowrap' }}>
                  <span style={{ fontSize: 9, color: '#F2F2F2', lineHeight: 1.4, whiteSpace: 'nowrap' }}>{data.setsCount} SETS</span>
                  {g1rm > 0 && (
                    <span style={{ fontSize: 9, color: '#EDEDED', lineHeight: 1.4, whiteSpace: 'nowrap' }}>
                      · BEST 1RM <span style={{ color: acHex, fontWeight: 700 }}>{toDisplayWeight(Math.round(g1rm), unit)}{unitLabel}</span>
                    </span>
                  )}
                </div>

                <div style={{ height: 1, background: dividerColor, margin: '0 0 8px' }} />

                <p style={{ fontSize: 8, fontWeight: 600, color: '#EDEDED', letterSpacing: '0.08em', margin: '0 0 10px', lineHeight: 1.2 }}>
                  EXERCISES
                </p>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {data.exercises.map((ex, idx) => {
                    const visibleSets = ex.setList.filter(s => s.weight > 0 || s.reps > 0)
                    return (
                      <div key={ex.name}>
                        <p style={{ fontSize: 14, fontWeight: 800, color: '#ffffff', margin: '0 0 8px', letterSpacing: '0.005em', lineHeight: 1.1 }}>
                          {tname(ex.name)}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 12px', flexWrap: 'nowrap', lineHeight: 1.1 }}>
                          <span style={{ fontSize: 10, color: '#EDEDED', fontWeight: 500, lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                            {ex.setCount} sets
                          </span>
                          {ex.best1RM > 0 && (
                            <>
                              <span style={{ fontSize: 9, color: '#EDEDED', lineHeight: 1.1 }}>·</span>
                              <span style={{ fontSize: 10, color: '#F2F2F2', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                                est. 1RM&nbsp;
                                <span style={{ color: acHex, fontWeight: 700 }}>{toDisplayWeight(Math.round(ex.best1RM), unit)}{unitLabel}</span>
                              </span>
                            </>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {visibleSets.map((s, si) => (
                            <p key={si} style={{ fontSize: 13, lineHeight: 1.3, margin: 0, fontWeight: 500 }}>
                              <span style={{ color: '#F0F0F0' }}>
                                {s.weight > 0 ? `${fmtKg(toDisplayWeight(s.weight, unit))}${unitLabel}` : 'BW'}
                              </span>
                              <span style={{ color: '#F2F2F2' }}> × {s.reps}</span>
                            </p>
                          ))}
                        </div>
                        {idx < data.exercises.length - 1 && (
                          <div style={{ height: 1, background: 'rgba(255,255,255,0.18)', margin: '10px 0' }} />
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
                    textTransform: 'uppercase', lineHeight: 1.6,
                  }}>
                    {data.muscleFocus}
                  </span>
                )}

                <p style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.50)', marginTop: 12, lineHeight: 1.4, textShadow: 'none' }}>
                  Made with LIFTSNAP · liftsnap.app
                </p>

              </div>
            </div>{/* /draggable card */}
          </div>{/* /captureRef */}
        </div>
      </div>

      {/* ── Photo loading indicator ── */}
      {photoLoading && !photoDataUrl && (
        <p className="text-center text-[11px] mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {t(locale, 'story.loadingPhoto')}
        </p>
      )}

      {/* ── No-photo state: CTA with add button ── */}
      {!localPhotoPath && !photoLoading && canShare && (
        <div className="px-4 mb-3">
          <div className="rounded-2xl px-4 py-3.5"
            style={{ background: 'rgba(255,107,0,0.06)', border: '1px solid rgba(255,107,0,0.16)' }}>
            <div className="flex items-center gap-2.5 mb-3">
              <Camera size={14} style={{ color: '#ff6b00', flexShrink: 0 }} />
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {t(locale, 'story.addPhotoForBetterStory')}
              </p>
            </div>
            <button
              className="w-full py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2"
              style={{ background: '#ff6b00', color: '#fff' }}
              onClick={() => setShowPhotoSheet(true)}>
              <ImageIcon size={14} />
              {t(locale, 'story.addWorkoutPhoto')}
            </button>
          </div>
        </div>
      )}

      {/* ── Photo loaded: drag hint + reset + change button ── */}
      {hasPhoto && (
        <>
          <p className="text-center text-[10px] mb-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
            {t(locale, 'story.dragHint')}
          </p>
          <div className="px-4 mb-3 flex gap-2">
            <button
              className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              style={{ background: '#1a1a1a', color: '#666', border: '1px solid #2a2a2a' }}
              onClick={resetPosition}>
              <RotateCcw size={12} />
              {t(locale, 'story.resetPosition')}
            </button>
            {canShare && (
              <button
                className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                style={{ background: '#1a1a1a', color: '#666', border: '1px solid #2a2a2a' }}
                onClick={() => setShowPhotoSheet(true)}>
                <Camera size={12} />
                {t(locale, 'story.changePhoto')}
              </button>
            )}
          </div>
        </>
      )}

      {/* ── Background selector (no-photo mode only) ── */}
      {!hasPhoto && !photoLoading && (
        <div className="px-4 mb-3">
          <p className="text-[10px] font-bold mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>
            {t(locale, 'story.background')}
          </p>
          <div className="flex gap-2">
            {(['dark', 'transparent'] as Theme[]).map(th => (
              <button key={th} className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{
                  background: theme === th ? '#ff6b00' : '#1a1a1a',
                  color:      theme === th ? '#fff' : '#666',
                  border:     `1px solid ${theme === th ? '#ff6b00' : '#2a2a2a'}`,
                }}
                onClick={() => setTheme(th)}>
                {th === 'dark' ? t(locale, 'story.bgDark') : t(locale, 'story.bgTransparent')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Color accent selector ── */}
      <div className="px-4 mb-3">
        <p className="text-[10px] font-bold mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>
          {t(locale, 'story.color')}
        </p>
        <div className="flex gap-2">
          {(() => {
            const shareThemes = getShareThemeUnlocks(shareCount)
            return (['dark', 'orange', 'purple', 'black'] as Accent[]).map(a => {
              const info     = shareThemes.find(entry => entry.accent === a)!
              const unlocked = info.unlocked
              const sel      = accent === a
              const selBg    = a === 'orange' ? '#ff6b00' : a === 'purple' ? '#6E38D4' : a === 'black' ? '#050505' : '#3a3a3a'
              const bg       = sel ? selBg : '#1a1a1a'
              return (
                <button key={a}
                  className="flex-1 py-2 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-0.5"
                  style={{
                    background: bg, color: unlocked ? '#fff' : '#444',
                    border: `1px solid ${sel ? selBg : '#2a2a2a'}`,
                    opacity: unlocked ? 1 : 0.55, minHeight: 44,
                  }}
                  onClick={() => unlocked && setAccent(a)}>
                  <span>{info.label}</span>
                  {!unlocked && <span style={{ fontSize: 9, color: '#555' }}>🔒{info.requiredShares}</span>}
                </button>
              )
            })
          })()}
        </div>
      </div>

      {/* ── Main action button ── */}
      <div className="px-4 space-y-2 mb-4">
        {status && (
          <p className="text-center text-sm" style={{ color: hasPhoto ? '#ff6b00' : '#888' }}>
            {status}
          </p>
        )}

        {mainBtnIsAdd ? (
          /* State A: no photo — main button opens photo sheet */
          canShare && (
            <button
              className="w-full py-4 rounded-2xl text-base font-black text-white flex items-center justify-center gap-2"
              style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={() => setShowPhotoSheet(true)}>
              <Camera size={20} />
              {t(locale, 'story.addWorkoutPhoto')}
            </button>
          )
        ) : (
          /* State C: photo loaded — main button shares */
          <button
            className="w-full py-4 rounded-2xl text-base font-black text-white flex items-center justify-center gap-2"
            style={{
              background: mainBtnLoading ? 'rgba(255,107,0,0.4)' : '#ff6b00',
              boxShadow: mainBtnLoading ? 'none' : '0 4px 20px rgba(255,107,0,0.3)',
            }}
            disabled={mainBtnLoading}
            onClick={handleShare}>
            <Share2 size={20} />
            {sharing ? t(locale, 'story.generating') : t(locale, 'story.shareToInstagram')}
          </button>
        )}

        {/* Secondary share button when no photo (skip-photo path) */}
        {mainBtnIsAdd && (
          <button
            className="w-full py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2"
            style={{ background: 'transparent', color: '#555', border: '1px solid #222' }}
            disabled={sharing}
            onClick={handleShare}>
            <Share2 size={16} />
            {sharing ? t(locale, 'story.generating') : t(locale, 'story.shareToInstagram')}
          </button>
        )}

        <p className="text-center text-xs" style={{ color: '#444' }}>
          {t(locale, 'story.mobileOnly')}
        </p>
      </div>

      {/* ── WorkoutPhotoSheet modal ── */}
      {showPhotoSheet && data.sessionId && (
        <WorkoutPhotoSheet
          sessionId={data.sessionId}
          sessionDate={data.date}
          todayStr={todayStr}
          onClose={() => setShowPhotoSheet(false)}
          onPhotoSaved={handlePhotoSaved}
          onPhotoDeleted={handlePhotoDeleted}
          autoCloseOnSave={true}
        />
      )}

    </div>
  )
}
