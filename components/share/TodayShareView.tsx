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
// Tier 1: 1–4   two-line, spacious
// Tier 2: 5–7   two-line, compact
// Tier 3: 8–11  one-line, condensed
// Tier 4: 12–15 one-line, dense
// Tier 5: 16+   one-line, ultra-dense
type Tier = 1 | 2 | 3 | 4 | 5

function getTier(count: number): Tier {
  if (count <= 4)  return 1
  if (count <= 7)  return 2
  if (count <= 11) return 3
  if (count <= 15) return 4
  return 5
}

const TIER_PARAMS: Record<Tier, {
  nameSize: number
  infoSize: number
  rowGap: number
  twoLine: boolean
  sectionGap: number
  volumeSize: number
}> = {
  1: { nameSize: 15, infoSize: 12, rowGap: 16, twoLine: true,  sectionGap: 18, volumeSize: 52 },
  2: { nameSize: 14, infoSize: 11, rowGap: 11, twoLine: true,  sectionGap: 15, volumeSize: 48 },
  3: { nameSize: 13, infoSize: 11, rowGap: 8,  twoLine: false, sectionGap: 13, volumeSize: 44 },
  4: { nameSize: 12, infoSize: 10, rowGap: 6,  twoLine: false, sectionGap: 12, volumeSize: 42 },
  5: { nameSize: 11, infoSize: 10, rowGap: 4,  twoLine: false, sectionGap: 11, volumeSize: 40 },
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
  const ac       = AC[accent]
  const acHex    = ac.hex
  const hasPhoto = !!photoDataUrl
  const canShare = !!data.sessionId

  const volStr = formatVolumeWithUnit(data.volume, unit)
  const g1rm   = data.exercises.reduce((m, ex) => Math.max(m, ex.best1RM), 0)

  const tier   = getTier(data.exercises.length)
  const tp     = TIER_PARAMS[tier]

  const isTransparent = cardStyle === 'transparent'
  const cardBg = isTransparent
    ? 'transparent'
    : (hasPhoto ? '#0a0a0a' : '#0d0d0d')

  // text-shadow is CSS-inherited — set once on wrapper, all children pick it up
  const ts = isTransparent
    ? '0 1px 8px rgba(0,0,0,0.95), 0 2px 24px rgba(0,0,0,0.7), 0 0 48px rgba(0,0,0,0.5)'
    : 'none'

  const dividerColor = isTransparent ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.09)'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-12 pb-3 flex-shrink-0">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg" style={{ background: '#1a1a1a' }}>
          <ArrowLeft size={16} style={{ color: '#777' }} />
        </button>
        <h1 className="text-sm font-black tracking-widest text-white">{t(locale, 'story.title')}</h1>
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
            {/* Dark overlay for photo — glass mode only */}
            {photoDataUrl && !isTransparent && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.78) 55%, rgba(0,0,0,0.92) 100%)',
                pointerEvents: 'none',
              }} />
            )}

            {/* ── Card content ── */}
            <div style={{
              position: 'relative', zIndex: 1,
              padding: '34px 26px 26px',
              height: '100%',
              display: 'flex', flexDirection: 'column',
              boxSizing: 'border-box',
              textShadow: ts,
            }}>

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

              {/* TODAY'S WORKOUT · date · title */}
              <div style={{ marginTop: 16 }}>
                <p style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.16em',
                  color: 'rgba(255,255,255,0.42)', margin: 0, lineHeight: 1,
                }}>
                  TODAY&apos;S WORKOUT
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

              {/* EXERCISES — all exercises shown, no truncation */}
              <div style={{ flexShrink: 0 }}>
                <p style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.16em',
                  color: 'rgba(255,255,255,0.42)', margin: '0 0 12px', lineHeight: 1,
                }}>
                  EXERCISES
                </p>

                {/* Exercise rows — ALL exercises, adaptive density via tier */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: tp.rowGap }}>
                  {data.exercises.map((ex) => {
                    const bestSet = ex.setList.reduce<{ weight: number; reps: number }>(
                      (best, s) => (s.weight * s.reps > best.weight * best.reps ? s : best),
                      ex.setList[0] ?? { weight: 0, reps: 0 }
                    )
                    const bestStr = bestSet.weight > 0
                      ? `${fmtKg(toDisplayWeight(bestSet.weight, unit))}${unitLabel} × ${bestSet.reps}`
                      : bestSet.reps > 0
                        ? `BW × ${bestSet.reps}`
                        : `${ex.setCount} sets`

                    if (tp.twoLine) {
                      return (
                        <div key={ex.name}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                            <p style={{
                              fontSize: tp.nameSize, fontWeight: 800, color: '#fff',
                              margin: 0, flex: 1, minWidth: 0,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {tname(ex.name)}
                            </p>
                            <p style={{
                              fontSize: tp.nameSize, color: acHex, fontWeight: 700,
                              margin: 0, flexShrink: 0, whiteSpace: 'nowrap',
                            }}>
                              {bestStr}
                            </p>
                          </div>
                          <p style={{
                            fontSize: tp.infoSize, color: 'rgba(255,255,255,0.36)',
                            margin: '2px 0 0', lineHeight: 1,
                          }}>
                            {ex.setCount} sets
                          </p>
                        </div>
                      )
                    }

                    // One-line: name left, "Ns · bestStr" right
                    return (
                      <div key={ex.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <p style={{
                          fontSize: tp.nameSize, fontWeight: 700, color: '#fff',
                          margin: 0, flex: 1, minWidth: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {tname(ex.name)}
                        </p>
                        <p style={{
                          fontSize: tp.infoSize, color: 'rgba(255,255,255,0.55)',
                          margin: 0, flexShrink: 0, whiteSpace: 'nowrap', lineHeight: 1,
                        }}>
                          {ex.setCount}s&thinsp;·&thinsp;<span style={{ color: acHex, fontWeight: 700 }}>{bestStr}</span>
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Spacer pushes "Made with REPRA" to bottom */}
              <div style={{ flex: 1, minHeight: 8 }} />

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
