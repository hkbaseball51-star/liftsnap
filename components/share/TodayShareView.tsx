'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, ArrowLeft } from 'lucide-react'
import { getShareCount, incrementShareCount } from '@/lib/unlocks'
import { useWeightUnit } from '@/lib/useWeightUnit'
import { useLocale } from '@/lib/useLocale'
import { t } from '@/lib/i18n'
import WorkoutStoryCardContent from './WorkoutStoryCardContent'
import type { TodayData, CardStyle, Accent, ShadowMode, CardBg } from './WorkoutStoryCardContent'

export type { TodayData }

function fmtDateShort(s: string) {
  const d = new Date(s + 'T00:00:00')
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${M[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

// Capture the 9:16 card as a PNG blob — called only on save button press
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
// Future: add Pro-only colors (e.g. gold, neon) behind a tier check
const COLOR_OPTIONS: {
  accent: Accent
  labelJa: string
  labelEn: string
  swatch: string
}[] = [
  { accent: 'orange', labelJa: 'Orange', labelEn: 'Orange', swatch: '#ED742F' },
  { accent: 'purple', labelJa: 'Purple', labelEn: 'Purple', swatch: '#6E38D4' },
  { accent: 'teal',   labelJa: 'Teal',   labelEn: 'Teal',   swatch: '#14B8A6' },
  { accent: 'blue',   labelJa: 'Blue',   labelEn: 'Blue',   swatch: '#3B82F6' },
  { accent: 'red',    labelJa: 'Red',    labelEn: 'Red',    swatch: '#EF4444' },
  { accent: 'white',  labelJa: 'White',  labelEn: 'White',  swatch: '#3a3a3a' },
]

// ── Card background options (glass mode only) ─────────────────────────
const CARD_BG_OPTIONS: { value: CardBg; labelJa: string; labelEn: string; swatch: string }[] = [
  { value: 'black',  labelJa: 'ブラック', labelEn: 'Black',  swatch: 'rgba(8,8,8,0.85)'       },
  { value: 'orange', labelJa: 'オレンジ', labelEn: 'Orange', swatch: 'rgba(249,115,22,0.75)'  },
  { value: 'purple', labelJa: 'パープル', labelEn: 'Purple', swatch: 'rgba(124,58,237,0.75)'  },
  { value: 'teal',   labelJa: 'ティール', labelEn: 'Teal',   swatch: 'rgba(20,184,166,0.75)'  },
  { value: 'white',  labelJa: 'ホワイト', labelEn: 'White',  swatch: 'rgba(220,220,220,0.85)' },
]

// ── Shadow options ────────────────────────────────────────────────────
const SHADOW_OPTIONS: { value: ShadowMode; labelJa: string; labelEn: string }[] = [
  { value: 'none',         labelJa: 'なし',       labelEn: 'None'         },
  { value: 'soft',         labelJa: '標準',       labelEn: 'Soft'         },
  { value: 'strong',       labelJa: '強め',       labelEn: 'Strong'       },
  { value: 'extra-strong', labelJa: 'かなり強め', labelEn: 'Extra Strong' },
]

export default function TodayShareView({ data }: { data: TodayData }) {
  const router     = useRouter()
  const captureRef = useRef<HTMLDivElement>(null)
  const { unit }   = useWeightUnit()
  const { locale } = useLocale()
  const todayStr   = new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' })

  const contentRef = useRef<HTMLDivElement>(null)

  const [cardStyle,    setCardStyleState] = useState<CardStyle>('glass')
  const [glassBg,      setGlassBg]        = useState<CardBg>('black')
  const [accent,       setAccent]         = useState<Accent>('white')
  const [shadowMode,   setShadowMode]     = useState<ShadowMode>('soft')
  const [saving,       setSaving]         = useState(false)
  const [status,       setStatus]         = useState('')
  const [shareCount,   setShareCount]     = useState(0)
  const [contentScale, setContentScale]   = useState(1)

  // Measure content height after render and scale down if it overflows the 9:16 canvas.
  // Runs before paint (useLayoutEffect) so there's no visible flash.
  useLayoutEffect(() => {
    const canvas  = captureRef.current
    const content = contentRef.current
    if (!canvas || !content) return

    // Temporarily clear scale so we measure the natural content height
    content.style.transform = 'none'
    content.style.width     = '100%'

    const availH  = canvas.clientHeight
    const contentH = content.scrollHeight

    const next = contentH > availH ? Math.max(0.5, availH / contentH) : 1
    setContentScale(next)
  }, [data])

  useEffect(() => { setShareCount(getShareCount()) }, [])

  // Switch card style; auto-upgrade shadow when going transparent
  function handleSetCardStyle(style: CardStyle) {
    setCardStyleState(style)
    if (style === 'transparent' && (shadowMode === 'none' || shadowMode === 'soft')) {
      setShadowMode('strong')
    }
  }

  const handleSave = async () => {
    if (!captureRef.current) return
    setSaving(true)
    setStatus(t(locale, 'story.generating'))
    try {
      const blob = await captureStory(captureRef.current, isTransparent)
      const file = new File([blob], 'repra-today.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "REPRA Today's Workout" })
        incrementShareCount(); setShareCount(getShareCount())
        setStatus('')
      } else {
        const url = URL.createObjectURL(blob)
        const a   = document.createElement('a')
        a.href = url; a.download = 'repra-today.png'; a.click()
        URL.revokeObjectURL(url)
        incrementShareCount(); setShareCount(getShareCount())
        setStatus(locale === 'ja' ? '保存しました！' : 'Saved!')
        setTimeout(() => setStatus(''), 2000)
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') setStatus('Error occurred')
      else setStatus('')
    } finally { setSaving(false) }
  }

  // ── Derived ──────────────────────────────────────────────────────────
  const isPast        = data.date !== todayStr
  const ja            = locale === 'ja'
  const isTransparent = cardStyle === 'transparent'

  // Outer 9:16 canvas background (always dark; card content bg is separate)
  const canvasBg = isTransparent ? 'transparent' : '#050505'

  // Preview-only dark checkerboard behind the transparent card.
  // Dark pattern keeps white text readable while indicating transparency.
  // Applied to the PARENT of captureRef — never included in the saved PNG.
  const checkerStyle: React.CSSProperties = isTransparent ? {
    backgroundColor: '#2a2a2a',
    backgroundImage: [
      'linear-gradient(45deg, #3a3a3a 25%, transparent 25%)',
      'linear-gradient(-45deg, #3a3a3a 25%, transparent 25%)',
      'linear-gradient(45deg, transparent 75%, #3a3a3a 75%)',
      'linear-gradient(-45deg, transparent 75%, #3a3a3a 75%)',
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

      {/* 9:16 Story card preview */}
      <div className="flex-shrink-0" style={{ display: 'flex', justifyContent: 'center', padding: '0 16px 12px' }}>
        <div style={{ width: 'min(94vw, 420px)', ...checkerStyle }}>
          <div
            ref={captureRef}
            style={{
              position: 'relative',
              aspectRatio: '9/16',
              overflow: 'hidden',
              borderRadius: 20,
              background: canvasBg,
            }}
          >
            {/* Card content — scales down automatically when content exceeds canvas height */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 }}>
              <div
                ref={contentRef}
                style={contentScale < 1 ? {
                  transform: `scale(${contentScale})`,
                  transformOrigin: 'top left',
                  width: `${(100 / contentScale).toFixed(3)}%`,
                } : undefined}
              >
                <WorkoutStoryCardContent
                  data={data}
                  cardStyle={cardStyle}
                  accent={accent}
                  unit={unit}
                  locale={locale}
                  isPast={isPast}
                  shadowMode={shadowMode}
                  cardBg={glassBg}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Controls panel ── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
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

        {/* Card Background — glass mode only */}
        {cardStyle === 'glass' && (
          <div className="px-4 mb-3">
            <p className="text-[10px] font-bold mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>
              {ja ? 'カード背景' : 'Card Background'}
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {CARD_BG_OPTIONS.map(({ value, labelJa, labelEn, swatch }) => {
                const sel = glassBg === value
                return (
                  <button key={value}
                    className="py-2 rounded-xl text-[10px] font-bold"
                    style={{
                      background: sel ? swatch : '#1a1a1a',
                      color: value === 'white' ? (sel ? '#333' : '#666') : '#fff',
                      border: `1px solid ${sel ? swatch : '#2a2a2a'}`,
                      minHeight: 40,
                    }}
                    onClick={() => setGlassBg(value)}>
                    {ja ? labelJa : labelEn}
                  </button>
                )
              })}
            </div>
          </div>
        )}

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

        {/* Save CTA */}
        <div className="px-4 space-y-2 mb-4">
          {status && (
            <p className="text-center text-sm" style={{ color: '#ED742F' }}>
              {status}
            </p>
          )}

          <button
            className="w-full py-4 rounded-2xl text-base font-black text-white flex items-center justify-center gap-2"
            style={{
              background: saving ? 'rgba(237,116,47,0.40)' : '#ED742F',
              boxShadow:  saving ? 'none' : '0 4px 20px rgba(237,116,47,0.28)',
            }}
            disabled={saving}
            onClick={handleSave}>
            <Download size={20} />
            {saving
              ? t(locale, 'story.generating')
              : (ja ? 'Story用画像を保存' : 'Save Story Image')}
          </button>

          <p className="text-center text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.28)' }}>
            {ja
              ? '保存後、Instagramで写真や動画に重ねて使えます'
              : 'Save it, then layer it over your photo or video on Instagram.'}
          </p>
        </div>
      </div>

    </div>
  )
}
