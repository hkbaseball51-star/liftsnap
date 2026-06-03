'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, ArrowLeft } from 'lucide-react'
import { getShareCount, incrementShareCount } from '@/lib/unlocks'
import { useWeightUnit } from '@/lib/useWeightUnit'
import { useLocale } from '@/lib/useLocale'
import { t } from '@/lib/i18n'
import WorkoutStoryCardContent, { ExerciseStoryCard, tname, PRESETS } from './WorkoutStoryCardContent'
import type { TodayData, CardStyle, DesignPreset, ShadowMode } from './WorkoutStoryCardContent'

export type { TodayData }

function fmtDateShort(s: string) {
  const d = new Date(s + 'T00:00:00')
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${M[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

// Capture the workout card as a PNG blob — inner card only, natural size, no outer canvas
async function captureCard(cardEl: HTMLDivElement): Promise<Blob> {
  const { toPng } = await import('html-to-image')
  await document.fonts.ready
  await new Promise(r => requestAnimationFrame(r))
  await new Promise(r => setTimeout(r, 80))

  const W = cardEl.offsetWidth
  const H = cardEl.offsetHeight
  const pixelRatio = Math.min(4, Math.round(1080 / Math.max(W, 1)))

  const dataUrl = await toPng(cardEl, {
    width: W,
    height: H,
    style: { width: `${W}px`, height: `${H}px` },
    pixelRatio,
    cacheBust: true,
    skipFonts: true,
  })
  const res = await fetch(dataUrl)
  return await res.blob()
}

// ── Design presets — Pro-only custom colors can be added here in future ──
const PRESET_OPTIONS: { value: DesignPreset; label: string; swatch: string }[] = [
  { value: 'orange',   label: 'REPRA Orange', swatch: '#F97316' },
  { value: 'ice-blue', label: 'Ice Blue',      swatch: '#38BDF8' },
  { value: 'violet',   label: 'Violet Pump',   swatch: '#8B5CF6' },
  { value: 'mint',     label: 'Mint Proof',    swatch: '#14B8A6' },
]

// ── Shadow options ────────────────────────────────────────────────────
const SHADOW_OPTIONS: { value: ShadowMode; labelJa: string; labelEn: string }[] = [
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

  const contentRef         = useRef<HTMLDivElement>(null)
  const exportRef          = useRef<HTMLDivElement>(null)
  const exerciseExportRefs = useRef<(HTMLDivElement | null)[]>([])

  const [cardStyle,  setCardStyleState] = useState<CardStyle>('glass')
  const [preset,     setPreset]         = useState<DesignPreset>('orange')
  const [shadowMode, setShadowMode]     = useState<ShadowMode>('strong')
  const [saveFormat, setSaveFormat]     = useState<'combined' | 'per-exercise'>('combined')
  const [saving,       setSaving]         = useState(false)
  const [status,       setStatus]         = useState('')
  const [shareCount,   setShareCount]     = useState(0)
  const [contentScale,  setContentScale]  = useState(1)
  const [naturalWidth,  setNaturalWidth]  = useState(0)
  const [naturalHeight, setNaturalHeight] = useState(0)

  // Measure natural content width/height, then compute scale-down if needed.
  // Using max-content so the card is exactly as wide as the text content requires.
  // Runs before paint (useLayoutEffect) — no visible flash.
  useLayoutEffect(() => {
    const canvas  = captureRef.current
    const content = contentRef.current
    if (!canvas || !content) return

    // Reset to measure at natural (max-content) dimensions
    content.style.transform = 'none'
    content.style.width     = 'max-content'

    const availH   = canvas.clientHeight
    const contentH = content.scrollHeight
    const contentW = content.offsetWidth

    const next = contentH > availH ? Math.max(0.5, availH / contentH) : 1
    setContentScale(next)
    setNaturalWidth(contentW)
    setNaturalHeight(contentH)
  }, [data])

  useEffect(() => { setShareCount(getShareCount()) }, [])

  function handleSetCardStyle(style: CardStyle) {
    setCardStyleState(style)
    if (style === 'transparent' && shadowMode === 'soft') setShadowMode('strong')
  }

  function handleSetPreset(p: DesignPreset) {
    setPreset(p)
    setShadowMode(PRESETS[p].defaultShadow)
  }

  const handleSaveSingleExercise = async (idx: number) => {
    const cardEl = exerciseExportRefs.current[idx]
    if (!cardEl) return
    setSaving(true)
    setStatus(t(locale, 'story.generating'))
    try {
      const ex = data.exercises[idx]
      const blob = await captureCard(cardEl)
      const enName = tname(ex.name).replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      const safeName = enName || `ex-${idx + 1}`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `repra-${data.date}-${safeName}.png`
      a.click()
      URL.revokeObjectURL(url)
      incrementShareCount(); setShareCount(getShareCount())
      setStatus(locale === 'ja' ? '保存しました！' : 'Saved!')
      setTimeout(() => setStatus(''), 2000)
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') setStatus('Error occurred')
      else setStatus('')
    } finally { setSaving(false) }
  }

  const handleSaveCombined = async () => {
    if (!exportRef.current) return
    setSaving(true)
    setStatus(t(locale, 'story.generating'))
    try {
      const blob = await captureCard(exportRef.current)
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

  const handleSavePerExercise = async () => {
    setSaving(true)
    setStatus(t(locale, 'story.generating'))
    let saved = 0
    try {
      for (let i = 0; i < data.exercises.length; i++) {
        const cardEl = exerciseExportRefs.current[i]
        if (!cardEl) continue
        const ex = data.exercises[i]
        const blob = await captureCard(cardEl)
        const enName = tname(ex.name).replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
        const safeName = enName || `ex-${i + 1}`
        const url = URL.createObjectURL(blob)
        const a   = document.createElement('a')
        a.href = url
        a.download = `repra-${data.date}-${safeName}.png`
        a.click()
        URL.revokeObjectURL(url)
        saved++
        if (i < data.exercises.length - 1) await new Promise(r => setTimeout(r, 400))
      }
      incrementShareCount(); setShareCount(getShareCount())
      setStatus(locale === 'ja' ? `${saved}枚保存しました！` : `Saved ${saved} cards!`)
      setTimeout(() => setStatus(''), 2500)
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') setStatus('Error occurred')
      else setStatus('')
    } finally { setSaving(false) }
  }

  const handleSave = saveFormat === 'combined' ? handleSaveCombined : handleSavePerExercise

  // ── Derived ──────────────────────────────────────────────────────────
  const isPast        = data.date !== todayStr
  const ja            = locale === 'ja'
  const isTransparent = cardStyle === 'transparent'

  // Outer 9:16 canvas is always transparent — the inner info card carries its own bg
  const canvasBg = 'transparent'

  const checkerBg = [
    'linear-gradient(45deg, #3a3a3a 25%, transparent 25%)',
    'linear-gradient(-45deg, #3a3a3a 25%, transparent 25%)',
    'linear-gradient(45deg, transparent 75%, #3a3a3a 75%)',
    'linear-gradient(-45deg, transparent 75%, #3a3a3a 75%)',
  ].join(', ')

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

      {/* Preview — switches between 9:16 canvas (combined) and card list (per-exercise) */}
      {saveFormat === 'combined' ? (
        <div className="flex-shrink-0" style={{ display: 'flex', justifyContent: 'center', padding: '0 16px 12px' }}>
          <div style={{ width: 'min(94vw, 420px)' }}>
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
              {/* Preview-only checker — sized to card footprint with rounded corners, excluded from saved PNG */}
              {isTransparent && naturalWidth > 0 && naturalHeight > 0 && (
                <div
                  data-preview-only=""
                  style={{
                    position: 'absolute', top: 0, left: 0,
                    width: `${naturalWidth}px`,
                    height: `${Math.round(naturalHeight * contentScale)}px`,
                    backgroundColor: '#2a2a2a',
                    backgroundImage: checkerBg,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                    borderRadius: 24,
                    zIndex: 1,
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* Card fits content width — no fixed % so right side stays clean */}
              <div style={{ position: 'absolute', top: 0, left: 0, maxWidth: '100%', zIndex: 2 }}>
                <div
                  ref={contentRef}
                  style={contentScale < 1 ? {
                    transform: `scale(${contentScale})`,
                    transformOrigin: 'top left',
                    width: naturalWidth > 0
                      ? `${Math.round(naturalWidth / contentScale)}px`
                      : 'max-content',
                  } : {
                    width: naturalWidth > 0 ? `${naturalWidth}px` : 'max-content',
                  }}
                >
                  <WorkoutStoryCardContent
                    data={data}
                    cardStyle={cardStyle}
                    preset={preset}
                    unit={unit}
                    locale={locale}
                    isPast={isPast}
                    shadowMode={shadowMode}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Per-exercise card previews — scrollable vertical list */
        <div className="flex-shrink-0 overflow-y-auto" style={{ maxHeight: '55vh', padding: '0 16px 12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {data.exercises.map((ex, i) => (
              <div key={`preview-${i}`} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ position: 'relative' }}>
                  {isTransparent && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      backgroundColor: '#2a2a2a',
                      backgroundImage: checkerBg,
                      backgroundSize: '20px 20px',
                      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                      borderRadius: 24,
                      pointerEvents: 'none',
                    }} />
                  )}
                  <ExerciseStoryCard
                    data={{ ...ex, date: data.date }}
                    cardStyle={cardStyle}
                    preset={preset}
                    unit={unit}
                    locale={locale}
                    isPast={isPast}
                    shadowMode={shadowMode}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleSaveSingleExercise(i)}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-xl text-xs font-bold active:opacity-70 transition-opacity"
                    style={{
                      padding: '8px 14px',
                      background: '#1a1a1a',
                      color: '#888',
                      border: '1px solid #2a2a2a',
                    }}
                  >
                    <Download size={13} />
                    {ja ? 'この種目を保存' : 'Save this card'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

        {/* Design Preset selector */}
        <div className="px-4 mb-3">
          <p className="text-[10px] font-bold mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>
            {ja ? 'デザインプリセット' : 'Design Preset'}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {PRESET_OPTIONS.map(({ value, label, swatch }) => {
              const sel = preset === value
              return (
                <button key={value}
                  className="py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                  style={{
                    background: sel ? `${swatch}22` : '#1a1a1a',
                    color:      sel ? swatch         : '#666',
                    border:     `1px solid ${sel ? swatch : '#2a2a2a'}`,
                    minHeight: 44,
                  }}
                  onClick={() => handleSetPreset(value)}>
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: swatch, flexShrink: 0,
                    boxShadow: sel ? `0 0 6px ${swatch}` : 'none',
                  }} />
                  {label}
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

        {/* Save Format selector */}
        <div className="px-4 mb-3">
          <p className="text-[10px] font-bold mb-2" style={{ color: '#555', letterSpacing: '0.08em' }}>
            {ja ? '保存形式' : 'Save Format'}
          </p>
          <div className="flex gap-2">
            {([
              { value: 'combined',     labelJa: 'まとめて1枚', labelEn: 'All-in-one'  },
              { value: 'per-exercise', labelJa: '種目ごと',    labelEn: 'By Exercise' },
            ] as { value: 'combined' | 'per-exercise'; labelJa: string; labelEn: string }[]).map(({ value, labelJa, labelEn }) => (
              <button key={value}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{
                  background: saveFormat === value ? '#ED742F' : '#1a1a1a',
                  color:      saveFormat === value ? '#fff'    : '#666',
                  border:     `1px solid ${saveFormat === value ? '#ED742F' : '#2a2a2a'}`,
                }}
                onClick={() => setSaveFormat(value)}>
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
              : saveFormat === 'combined'
                ? (ja ? 'まとめてカードを保存' : 'Save Full Card')
                : (ja ? 'すべて保存' : 'Save All')}
          </button>

          <p className="text-center text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.28)' }}>
            {ja
              ? '保存後、Instagramで写真や動画に重ねて使えます'
              : 'Save it, then layer it over your photo or video on Instagram.'}
          </p>
        </div>
      </div>

      {/* Export-only card — combined mode, off-screen at natural size */}
      <div ref={exportRef} aria-hidden="true" style={{ position: 'fixed', left: '200vw', top: 0 }}>
        <WorkoutStoryCardContent
          data={data}
          cardStyle={cardStyle}
          preset={preset}
          unit={unit}
          locale={locale}
          isPast={isPast}
          shadowMode={shadowMode}
        />
      </div>

      {/* Export-only cards — per-exercise mode, each at natural (max-content) width */}
      {data.exercises.map((ex, i) => (
        <div
          key={`export-ex-${i}`}
          ref={el => { exerciseExportRefs.current[i] = el }}
          aria-hidden="true"
          style={{ position: 'fixed', left: '200vw', top: 0, width: 'max-content' }}
        >
          <ExerciseStoryCard
            data={{ ...ex, date: data.date }}
            cardStyle={cardStyle}
            preset={preset}
            unit={unit}
            locale={locale}
            isPast={isPast}
            shadowMode={shadowMode}
          />
        </div>
      ))}

    </div>
  )
}
