'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Share2, ArrowLeft, Camera } from 'lucide-react'
import { getShareCount, incrementShareCount } from '@/lib/unlocks'
import { useWeightUnit } from '@/lib/useWeightUnit'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from '@/lib/useLocale'
import { t } from '@/lib/i18n'
import WorkoutPhotoSheet from '@/components/photo/WorkoutPhotoSheet'
import WorkoutStoryCardContent from './WorkoutStoryCardContent'
import type { TodayData, CardStyle, Accent, ShadowMode } from './WorkoutStoryCardContent'

export type { TodayData }

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

// ── Color options — all unlocked, no Pro gate ─────────────────────────
const COLOR_OPTIONS: {
  accent: Accent
  labelJa: string
  labelEn: string
  swatch: string  // color shown when selected
}[] = [
  { accent: 'orange', labelJa: 'Orange',   labelEn: 'Orange',   swatch: '#ED742F' },
  { accent: 'purple', labelJa: 'Purple',   labelEn: 'Purple',   swatch: '#6E38D4' },
  { accent: 'teal',   labelJa: 'Teal',     labelEn: 'Teal',     swatch: '#14B8A6' },
  { accent: 'blue',   labelJa: 'Blue',     labelEn: 'Blue',     swatch: '#3B82F6' },
  { accent: 'white',  labelJa: 'White',    labelEn: 'White',    swatch: '#3a3a3a' },
  { accent: 'black',  labelJa: 'Stealth',  labelEn: 'Stealth',  swatch: '#050505' },
]

// ── Shadow options ────────────────────────────────────────────────────
const SHADOW_OPTIONS: { value: ShadowMode; labelJa: string; labelEn: string }[] = [
  { value: 'none',   labelJa: 'なし',   labelEn: 'None'   },
  { value: 'soft',   labelJa: 'ソフト', labelEn: 'Soft'   },
  { value: 'strong', labelJa: '強め',   labelEn: 'Strong' },
]

export default function TodayShareView({ data }: { data: TodayData }) {
  const router     = useRouter()
  const captureRef = useRef<HTMLDivElement>(null)
  const { unit }   = useWeightUnit()
  const { locale } = useLocale()
  const todayStr   = new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' })

  const [cardStyle,      setCardStyleState] = useState<CardStyle>('glass')
  const [accent,         setAccent]         = useState<Accent>('white')
  const [shadowMode,     setShadowMode]     = useState<ShadowMode>('none')
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

  // Switch card style; auto-enable soft shadow when going transparent
  function handleSetCardStyle(style: CardStyle) {
    setCardStyleState(style)
    if (style === 'transparent' && shadowMode === 'none') {
      setShadowMode('soft')
    }
  }

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
  const isPast        = data.date !== todayStr
  const ja            = locale === 'ja'
  const hasPhoto      = !!photoDataUrl
  const canShare      = !!data.sessionId
  const isTransparent = cardStyle === 'transparent'

  // Outer 9:16 canvas background
  const cardBg = isTransparent
    ? 'transparent'
    : hasPhoto
      ? 'transparent'
      : '#050505'

  // Preview-only checkerboard — parent of captureRef, never included in saved image
  const checkerStyle: React.CSSProperties = isTransparent ? {
    backgroundColor: '#cccccc',
    backgroundImage: [
      'linear-gradient(45deg, #aaaaaa 25%, transparent 25%)',
      'linear-gradient(-45deg, #aaaaaa 25%, transparent 25%)',
      'linear-gradient(45deg, transparent 75%, #aaaaaa 75%)',
      'linear-gradient(-45deg, transparent 75%, #aaaaaa 75%)',
    ].join(', '),
    backgroundSize: '20px 20px',
    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
    borderRadius: 20,
  } : {}

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
        <div style={{ width: 'min(94vw, 420px)', ...checkerStyle }}>
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
            {/* Transparent + photo: faint gradient to keep text legible */}
            {hasPhoto && isTransparent && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 1,
                background: 'linear-gradient(175deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.30) 100%)',
                pointerEvents: 'none',
              }} />
            )}

            {/* Card content */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 }}>
              <WorkoutStoryCardContent
                data={data}
                cardStyle={cardStyle}
                accent={accent}
                unit={unit}
                locale={locale}
                hasPhoto={hasPhoto}
                isPast={isPast}
                shadowMode={shadowMode}
              />
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
            {ja ? 'カードスタイル' : 'Card Style'}
          </p>
          <div className="flex gap-2">
            {([
              { value: 'glass',       labelJa: '半透過カード', labelEn: 'Glass Card'  },
              { value: 'transparent', labelJa: '完全透過',     labelEn: 'Transparent' },
            ] as { value: CardStyle; labelJa: string; labelEn: string }[]).map(({ value, labelJa, labelEn }) => (
              <button key={value}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{
                  background: cardStyle === value ? '#ED742F' : '#1a1a1a',
                  color:      cardStyle === value ? '#fff'    : '#666',
                  border:     `1px solid ${cardStyle === value ? '#ED742F' : '#2a2a2a'}`,
                }}
                onClick={() => handleSetCardStyle(value)}>
                {ja ? labelJa : labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* Color accent — 6 colors, 2 rows of 3, all unlocked */}
        <div className="px-4 mb-3">
          <p className="text-[10px] font-bold mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>
            {t(locale, 'story.color')}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {COLOR_OPTIONS.map(({ accent: a, labelJa, labelEn, swatch }) => {
              const sel = accent === a
              return (
                <button key={a}
                  className="py-2 rounded-xl text-[11px] font-bold"
                  style={{
                    background: sel ? swatch : '#1a1a1a',
                    color: '#fff',
                    border: `1px solid ${sel ? swatch : '#2a2a2a'}`,
                    minHeight: 40,
                  }}
                  onClick={() => setAccent(a)}>
                  {ja ? labelJa : labelEn}
                </button>
              )
            })}
          </div>
        </div>

        {/* Text Shadow selector */}
        <div className="px-4 mb-3">
          <p className="text-[10px] font-bold mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>
            {ja ? 'テキストシャドウ' : 'Text Shadow'}
          </p>
          <div className="flex gap-2">
            {SHADOW_OPTIONS.map(({ value, labelJa, labelEn }) => (
              <button key={value}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{
                  background: shadowMode === value ? '#333333' : '#1a1a1a',
                  color:      shadowMode === value ? '#fff'    : '#666',
                  border:     `1px solid ${shadowMode === value ? '#555555' : '#2a2a2a'}`,
                }}
                onClick={() => setShadowMode(value)}>
                {ja ? labelJa : labelEn}
              </button>
            ))}
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
