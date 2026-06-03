'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Share2, ArrowLeft, Camera } from 'lucide-react'
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

type CardStyle = 'glass' | 'transparent'
type Accent    = 'orange' | 'purple' | 'dark' | 'black'

const AC: Record<Accent, { hex: string; badgeBg: string; badgeBorder: string; badgeText: string }> = {
  orange: { hex: '#ED742F', badgeBg: '#ED742F',               badgeBorder: 'transparent',            badgeText: '#ffffff'               },
  purple: { hex: '#6E38D4', badgeBg: '#6E38D4',               badgeBorder: 'transparent',            badgeText: '#ffffff'               },
  dark:   { hex: '#ffffff', badgeBg: 'rgba(255,255,255,0.08)', badgeBorder: 'rgba(255,255,255,0.20)', badgeText: 'rgba(255,255,255,0.80)' },
  black:  { hex: '#ffffff', badgeBg: 'transparent',            badgeBorder: 'rgba(255,255,255,0.28)', badgeText: '#ffffff'               },
}


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

function fmtDateShort(s: string) {
  const d = new Date(s + 'T00:00:00')
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${M[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

async function captureStory(captureEl: HTMLDivElement, transparent: boolean): Promise<Blob> {
  const { toPng } = await import('html-to-image')
  await document.fonts.ready
  await new Promise(r => requestAnimationFrame(r))
  await new Promise(r => setTimeout(r, 80))

  const W = captureEl.offsetWidth
  const H = captureEl.offsetHeight
  const pixelRatio = Math.min(4, Math.round(1080 / Math.max(W, 1)))

  const prevBg = captureEl.style.background
  if (transparent) captureEl.style.background = 'transparent'
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

// ── Exercise density tiers ────────────────────────────────────────────
// totalRows = exercises × 2 header rows + sum of all set rows
// Tier 1: ≤10  spacious   Tier 2: ≤15  compact
// Tier 3: ≤22  condensed  Tier 4: ≤30  dense   Tier 5: 31+  ultra-dense
type Tier = 1 | 2 | 3 | 4 | 5

function getTier(totalRows: number): Tier {
  if (totalRows <= 10) return 1
  if (totalRows <= 15) return 2
  if (totalRows <= 22) return 3
  if (totalRows <= 30) return 4
  return 5
}

const TIER_PARAMS: Record<Tier, {
  nameSize: number
  infoSize: number
  setSize: number
  exGap: number
  lineGap: number
  sectionGap: number
  volumeSize: number
}> = {
  1: { nameSize: 13, infoSize: 11, setSize: 11, exGap: 12, lineGap: 3, sectionGap: 16, volumeSize: 46 },
  2: { nameSize: 12, infoSize: 11, setSize: 11, exGap: 9,  lineGap: 2, sectionGap: 13, volumeSize: 42 },
  3: { nameSize: 11, infoSize: 10, setSize: 10, exGap: 7,  lineGap: 2, sectionGap: 11, volumeSize: 38 },
  4: { nameSize: 11, infoSize: 9,  setSize: 9,  exGap: 5,  lineGap: 1, sectionGap: 9,  volumeSize: 36 },
  5: { nameSize: 10, infoSize: 9,  setSize: 8,  exGap: 4,  lineGap: 1, sectionGap: 8,  volumeSize: 34 },
}

export default function TodayShareView({ data }: { data: TodayData }) {
  const router     = useRouter()
  const captureRef = useRef<HTMLDivElement>(null)
  const { unit }   = useWeightUnit()
  const { locale } = useLocale()
  const unitLabel  = weightUnitLabel(unit)
  const todayStr   = new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' })

  const [cardStyle,      setCardStyle]      = useState<CardStyle>('glass')
  const [accent,         setAccent]         = useState<Accent>('dark')
  const [sharing,        setSharing]        = useState(false)
  const [status,         setStatus]         = useState('')
  const [shareCount,     setShareCount]     = useState(0)
  const [photoDataUrl,   setPhotoDataUrl]   = useState<string | null>(null)
  const [photoLoading,   setPhotoLoading]   = useState(false)
  const [localPhotoPath, setLocalPhotoPath] = useState<string | null>(data.photoPath ?? null)
  const [showPhotoSheet, setShowPhotoSheet] = useState(false)

  useEffect(() => { setShareCount(getShareCount()) }, [])

  useEffect(() => {
    if (!localPhotoPath) { setPhotoDataUrl(null); setPhotoLoading(false); return }
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
        const res     = await fetch(urlData.signedUrl)
        const blob    = await res.blob()
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

  const handlePhotoSaved = (imagePath: string) => {
    setLocalPhotoPath(imagePath)
    setShowPhotoSheet(false)
    setStatus(t(locale, 'story.photoSavedCreateStory'))
    setTimeout(() => setStatus(''), 3000)
  }
  const handlePhotoDeleted = () => { setLocalPhotoPath(null); setShowPhotoSheet(false) }

  const handleShare = async () => {
    if (!captureRef.current) return
    setSharing(true)
    setStatus(t(locale, 'story.generating'))
    try {
      const transparentCapture = isTransparent && !photoDataUrl
      const blob = await captureStory(captureRef.current, transparentCapture)
      const file = new File([blob], 'repra-today.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        setStatus('Sharing...')
        await navigator.share({ files: [file], title: "REPRA Today's Workout" })
        const next = incrementShareCount(); setShareCount(next)
        setStatus('')
      } else {
        const url = URL.createObjectURL(blob)
        const a   = document.createElement('a')
        a.href = url; a.download = 'repra-today.png'; a.click()
        URL.revokeObjectURL(url)
        const next = incrementShareCount(); setShareCount(next)
        setStatus('Downloaded!'); setTimeout(() => setStatus(''), 2000)
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') setStatus('Error occurred')
      else setStatus('')
    } finally { setSharing(false) }
  }

  // ── Derived ──────────────────────────────────────────────────────────
  /*
   * Future monetization:
   *   Free: Story for today + last 7 days (gate: data.date < todayStr - 7 days)
   *   Pro:  Unlimited history, watermark removal, Pro templates
   * Currently: all dates unrestricted.
   */
  const isPast   = data.date !== todayStr
  const ja       = locale === 'ja'
  const ac       = AC[accent]
  const acHex    = ac.hex
  const hasPhoto = !!photoDataUrl
  const canShare = !!data.sessionId

  const volStr = formatVolumeWithUnit(data.volume, unit)
  const g1rm   = data.exercises.reduce((m, ex) => Math.max(m, ex.best1RM), 0)

  const totalRows = data.exercises.reduce((sum, ex) => sum + 2 + ex.setList.length, 0)
  const tier   = getTier(totalRows)
  const tp     = TIER_PARAMS[tier]

  const isTransparent = cardStyle === 'transparent'

  // Outer 9:16 card background — glass+photo and transparent both use transparent
  // so the photo or page bg shows; glass+no-photo uses near-black canvas
  const cardBg = isTransparent
    ? 'transparent'
    : hasPhoto
      ? 'transparent'
      : '#050505'

  // text-shadow for transparent mode (inherited by all children via wrapper)
  const ts = isTransparent
    ? '0 1px 8px rgba(0,0,0,0.95), 0 2px 24px rgba(0,0,0,0.7), 0 0 48px rgba(0,0,0,0.5)'
    : 'none'

  const dividerColor = isTransparent ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.09)'

  // glass: content is an inset semi-transparent panel floating inside the card
  // transparent: content fills the full card area directly with text-shadow
  const contentStyle: React.CSSProperties = isTransparent
    ? {
        position: 'absolute', inset: 0, zIndex: 2,
        padding: '34px 26px 26px',
        display: 'flex', flexDirection: 'column',
        boxSizing: 'border-box',
        textShadow: ts,
      }
    : {
        position: 'absolute',
        inset: hasPhoto ? 14 : 8,
        zIndex: 2,
        padding: hasPhoto ? '22px 20px 18px' : '28px 24px 22px',
        display: 'flex', flexDirection: 'column',
        boxSizing: 'border-box',
        background: hasPhoto ? 'rgba(8,8,8,0.82)' : 'rgba(26,26,26,0.98)',
        border: '1px solid rgba(255,255,255,0.11)',
        borderRadius: 16,
        overflow: 'hidden',
        textShadow: 'none',
      }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-12 pb-3 flex-shrink-0">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg" style={{ background: '#1a1a1a' }}>
          <ArrowLeft size={16} style={{ color: '#777' }} />
        </button>
        <div>
          <h1 className="text-sm font-black tracking-widest text-white">
            {isPast
              ? (ja ? '過去のワークアウトStory' : 'Workout Story')
              : (ja ? '今日のワークアウトStory' : "Today's Workout Story")}
          </h1>
          {isPast && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 2 }}>
              {fmtDateShort(data.date)}
            </p>
          )}
        </div>
      </div>

      {/* 9:16 Story card */}
      <div className="flex-shrink-0" style={{ display: 'flex', justifyContent: 'center', padding: '0 16px 12px' }}>
        <div style={{ width: 'min(94vw, 420px)' }}>
          <div
            ref={captureRef}
            style={{
              position: 'relative',
              aspectRatio: '9/16',
              overflow: 'hidden',
              borderRadius: 20,
              background: cardBg,
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
                  objectFit: 'cover', pointerEvents: 'none',
                }}
              />
            )}
            {/* Transparent + photo: subtle gradient for text readability */}
            {hasPhoto && isTransparent && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 1,
                background: 'linear-gradient(175deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.34) 100%)',
                pointerEvents: 'none',
              }} />
            )}

            {/* ── Card content: glass = inset panel, transparent = full-area direct ── */}
            <div style={contentStyle}>

              {/* REPRA badge */}
              <div>
                <span style={{
                  display: 'inline-block',
                  fontSize: 10, fontWeight: 900, letterSpacing: '0.16em',
                  padding: '4px 11px', borderRadius: 5,
                  background: ac.badgeBg, color: ac.badgeText,
                  border: `1px solid ${ac.badgeBorder}`,
                }}>REPRA</span>
              </div>

              {/* WORKOUT label · date · title */}
              <div style={{ marginTop: 16 }}>
                <p style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.16em',
                  color: 'rgba(255,255,255,0.42)', margin: 0, lineHeight: 1,
                }}>
                  {isPast ? 'WORKOUT STORY' : "TODAY'S WORKOUT"}
                </p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.52)', margin: '5px 0 0', lineHeight: 1 }}>
                  {fmtDate(data.date)}
                </p>
                <p style={{
                  fontSize: 24, fontWeight: 900, color: '#fff',
                  lineHeight: 1.1, margin: '7px 0 0', letterSpacing: '-0.01em',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  textTransform: 'uppercase',
                }}>
                  {data.title}
                </p>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: dividerColor, margin: `${tp.sectionGap}px 0` }} />

              {/* TOTAL VOLUME */}
              <div>
                <p style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.16em',
                  color: 'rgba(255,255,255,0.42)', margin: '0 0 6px', lineHeight: 1,
                }}>
                  TOTAL VOLUME
                </p>
                <p style={{
                  fontSize: tp.volumeSize, fontWeight: 900, color: acHex,
                  lineHeight: 1, margin: 0, letterSpacing: '-0.025em',
                }}>
                  {volStr}
                </p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.48)', margin: '7px 0 0', lineHeight: 1 }}>
                  {data.setsCount}&thinsp;SETS
                  {g1rm > 0 && (
                    <>
                      {' · BEST 1RM '}
                      <span style={{ color: acHex, fontWeight: 700 }}>
                        {toDisplayWeight(Math.round(g1rm), unit)}{unitLabel}
                      </span>
                    </>
                  )}
                </p>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: dividerColor, margin: `${tp.sectionGap}px 0` }} />

              {/* EXERCISES — all sets per exercise, flex:1 fills remaining card height */}
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <p style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.16em',
                  color: 'rgba(255,255,255,0.42)', margin: '0 0 10px', lineHeight: 1, flexShrink: 0,
                }}>
                  EXERCISES
                </p>

                {/* One block per exercise: name → info → every set row */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: tp.exGap, overflow: 'hidden' }}>
                  {data.exercises.map((ex) => (
                    <div key={ex.name} style={{ flexShrink: 0 }}>
                      <p style={{
                        fontSize: tp.nameSize, fontWeight: 800, color: '#fff',
                        margin: 0, lineHeight: 1.2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {tname(ex.name)}
                      </p>
                      <p style={{
                        fontSize: tp.infoSize, color: 'rgba(255,255,255,0.40)',
                        marginTop: tp.lineGap, lineHeight: 1,
                      }}>
                        {ex.setCount} sets{ex.best1RM > 0
                          ? <>{' · est. 1RM '}<span style={{ color: acHex, fontWeight: 700 }}>{fmtKg(toDisplayWeight(ex.best1RM, unit))}{unitLabel}</span></>
                          : null}
                      </p>
                      {ex.setList.map((s, i) => {
                        const str = s.weight > 0
                          ? `${fmtKg(toDisplayWeight(s.weight, unit))}${unitLabel} × ${s.reps}`
                          : s.reps > 0 ? `BW × ${s.reps}` : null
                        if (!str) return null
                        return (
                          <p key={i} style={{
                            fontSize: tp.setSize, color: 'rgba(255,255,255,0.60)',
                            marginTop: tp.lineGap, lineHeight: 1.1,
                          }}>
                            {str}
                          </p>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* 8px min gap before footer */}
              <div style={{ flexShrink: 0, minHeight: 8 }} />

              {/* Made with REPRA */}
              <p style={{
                fontSize: 8, color: 'rgba(255,255,255,0.24)',
                textAlign: 'right', letterSpacing: '0.06em', lineHeight: 1, flexShrink: 0,
              }}>
                Made with REPRA
              </p>

            </div>
          </div>
        </div>
      </div>

      {/* ── Controls panel ── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
        {photoLoading && !photoDataUrl && (
          <p className="text-center text-[11px] mb-3" style={{ color: 'rgba(255,255,255,0.52)' }}>
            {t(locale, 'story.loadingPhoto')}
          </p>
        )}

        {/* Card Style selector */}
        <div className="px-4 mb-3">
          <p className="text-[10px] font-bold mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>
            {locale === 'ja' ? 'カードスタイル' : 'Card Style'}
          </p>
          <div className="flex gap-2">
            {([
              { value: 'glass',       labelJa: '半透過カード', labelEn: 'Glass Card'   },
              { value: 'transparent', labelJa: '完全透過',     labelEn: 'Transparent'  },
            ] as { value: CardStyle; labelJa: string; labelEn: string }[]).map(({ value, labelJa, labelEn }) => (
              <button key={value}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{
                  background: cardStyle === value ? '#ED742F' : '#1a1a1a',
                  color:      cardStyle === value ? '#fff'    : '#666',
                  border:     `1px solid ${cardStyle === value ? '#ED742F' : '#2a2a2a'}`,
                }}
                onClick={() => setCardStyle(value)}>
                {locale === 'ja' ? labelJa : labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* Color accent */}
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
                const selBg    = a === 'orange' ? '#ED742F' : a === 'purple' ? '#6E38D4' : a === 'black' ? '#050505' : '#3a3a3a'
                return (
                  <button key={a}
                    className="flex-1 py-2 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-0.5"
                    style={{
                      background: sel ? selBg : '#1a1a1a',
                      color:      unlocked ? '#fff' : '#444',
                      border:     `1px solid ${sel ? selBg : '#2a2a2a'}`,
                      opacity:    unlocked ? 1 : 0.55,
                      minHeight:  44,
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

        {/* Action buttons */}
        <div className="px-4 space-y-2 mb-4">
          {status && (
            <p className="text-center text-sm" style={{ color: '#ED742F' }}>
              {status}
            </p>
          )}

          <button
            className="w-full py-4 rounded-2xl text-base font-black text-white flex items-center justify-center gap-2"
            style={{
              background: (sharing || photoLoading) ? 'rgba(237,116,47,0.40)' : '#ED742F',
              boxShadow:  (sharing || photoLoading) ? 'none' : '0 4px 20px rgba(237,116,47,0.28)',
            }}
            disabled={sharing || photoLoading}
            onClick={handleShare}>
            <Share2 size={20} />
            {sharing ? t(locale, 'story.generating') : t(locale, 'story.shareToInstagram')}
          </button>

          {canShare && (
            <button
              className="w-full py-2.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2"
              style={{ background: 'transparent', color: '#444', border: '1px solid #1e1e1e' }}
              onClick={() => setShowPhotoSheet(true)}>
              <Camera size={14} />
              {hasPhoto ? t(locale, 'story.changePhoto') : t(locale, 'story.addWorkoutPhoto')}
            </button>
          )}

          <p className="text-center text-xs" style={{ color: '#444' }}>
            {t(locale, 'story.mobileOnly')}
          </p>
        </div>
      </div>

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
