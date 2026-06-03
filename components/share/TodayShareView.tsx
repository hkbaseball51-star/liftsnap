'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, ArrowLeft } from 'lucide-react'
import { getShareCount, incrementShareCount } from '@/lib/unlocks'
import { useWeightUnit } from '@/lib/useWeightUnit'
import { useLocale } from '@/lib/useLocale'
import WorkoutStoryCardContent, { ExerciseStoryCard, tname, PRESETS } from './WorkoutStoryCardContent'
import type { TodayData, CardStyle, DesignPreset, ShadowMode } from './WorkoutStoryCardContent'

export type { TodayData }

function fmtDateShort(s: string) {
  const d = new Date(s + 'T00:00:00')
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${M[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

// Capture the workout card as a PNG blob — inner card only, natural size
// Uses toBlob() directly (avoids fetch + CSP issues with data URLs)
async function captureCard(cardEl: HTMLDivElement): Promise<Blob> {
  const { toBlob } = await import('html-to-image')
  await document.fonts.ready
  // Double rAF ensures styles are fully applied before capture
  await new Promise(r => requestAnimationFrame(r))
  await new Promise(r => requestAnimationFrame(r))
  await new Promise(r => setTimeout(r, 100))

  const W = cardEl.offsetWidth
  const H = cardEl.offsetHeight
  const rect = cardEl.getBoundingClientRect()

  if (process.env.NODE_ENV !== 'production') {
    /* eslint-disable no-console */
    console.log('[captureCard] innerText:', cardEl.innerText?.slice(0, 80))
    console.log('[captureCard] offsetW×H:', W, '×', H)
    console.log('[captureCard] boundingRect:', rect)
    /* eslint-enable no-console */
  }

  if (W === 0 || H === 0) {
    throw new Error(`Export element has zero dimensions (${W}×${H}). Check ref target.`)
  }

  const pixelRatio = Math.min(4, Math.round(1080 / W))

  const blob = await toBlob(cardEl, {
    width: W,
    height: H,
    style: { width: `${W}px`, height: `${H}px` },
    pixelRatio,
    cacheBust: true,
  })

  if (process.env.NODE_ENV !== 'production') {
    /* eslint-disable no-console */
    console.log('[captureCard] blob size:', blob?.size, 'bytes, type:', blob?.type)
    /* eslint-enable no-console */
  }

  if (!blob) throw new Error('html-to-image returned null blob')
  return blob
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

  // Share via Web Share API when available, otherwise trigger download via <a download>
  const shareOrDownload = async (blob: Blob, filename: string): Promise<'shared' | 'downloaded'> => {
    const file = new File([blob], filename, { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'REPRA Story Card' })
      return 'shared'
    }
    const url = URL.createObjectURL(blob)
    try {
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } finally {
      URL.revokeObjectURL(url)
    }
    return 'downloaded'
  }

  const handleSaveSingleExercise = async (idx: number) => {
    const cardEl = exerciseExportRefs.current[idx]
    if (!cardEl) return
    setSaving(true)
    setStatus(locale === 'ja' ? '画像を作成中...' : 'Creating image...')
    try {
      const ex = data.exercises[idx]
      const blob = await captureCard(cardEl)
      const enName = tname(ex.name).replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      const safeName = enName || `ex-${idx + 1}`
      const result = await shareOrDownload(blob, `repra-${data.date}-${safeName}.png`)
      incrementShareCount(); setShareCount(getShareCount())
      if (result === 'downloaded') {
        setStatus(locale === 'ja' ? 'ダウンロードを開始しました' : 'Download started')
        setTimeout(() => setStatus(''), 2000)
      } else {
        setStatus('')
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') {
        setStatus('')
      } else {
        setStatus(locale === 'ja'
          ? '画像を作成できませんでした。もう一度お試しください。'
          : 'Could not create image. Please try again.')
        setTimeout(() => setStatus(''), 3000)
      }
    } finally { setSaving(false) }
  }

  const handleSaveCombined = async () => {
    if (!exportRef.current) return
    setSaving(true)
    setStatus(locale === 'ja' ? '画像を作成中...' : 'Creating image...')
    try {
      const blob = await captureCard(exportRef.current)
      const filename = `repra-${data.date}-workout.png`
      const result = await shareOrDownload(blob, filename)
      incrementShareCount(); setShareCount(getShareCount())
      if (result === 'downloaded') {
        setStatus(locale === 'ja' ? 'ダウンロードを開始しました' : 'Download started')
        setTimeout(() => setStatus(''), 2000)
      } else {
        setStatus('')
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') {
        setStatus('')
      } else {
        setStatus(locale === 'ja'
          ? '画像を作成できませんでした。もう一度お試しください。'
          : 'Could not create image. Please try again.')
        setTimeout(() => setStatus(''), 3000)
      }
    } finally { setSaving(false) }
  }

  const handleSavePerExercise = async () => {
    setSaving(true)
    setStatus(locale === 'ja' ? '画像を作成中...' : 'Creating image...')
    try {
      // Build all files first
      const files: File[] = []
      for (let i = 0; i < data.exercises.length; i++) {
        const cardEl = exerciseExportRefs.current[i]
        if (!cardEl) continue
        const ex = data.exercises[i]
        const blob = await captureCard(cardEl)
        const enName = tname(ex.name).replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
        const safeName = enName || `ex-${i + 1}`
        files.push(new File([blob], `repra-${data.date}-${safeName}.png`, { type: 'image/png' }))
      }
      if (files.length === 0) return
      // Try sharing all at once; fall back to sequential download
      if (navigator.canShare?.({ files })) {
        await navigator.share({ files, title: 'REPRA Story Cards' })
        incrementShareCount(); setShareCount(getShareCount())
        setStatus('')
      } else {
        for (let i = 0; i < files.length; i++) {
          const url = URL.createObjectURL(files[i])
          const a = document.createElement('a')
          a.href = url; a.download = files[i].name
          document.body.appendChild(a); a.click(); document.body.removeChild(a)
          URL.revokeObjectURL(url)
          if (i < files.length - 1) await new Promise(r => setTimeout(r, 400))
        }
        incrementShareCount(); setShareCount(getShareCount())
        setStatus(locale === 'ja' ? `${files.length}枚保存しました` : `Downloaded ${files.length} cards`)
        setTimeout(() => setStatus(''), 2500)
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') {
        setStatus('')
      } else {
        setStatus(locale === 'ja'
          ? '画像を作成できませんでした。もう一度お試しください。'
          : 'Could not create image. Please try again.')
        setTimeout(() => setStatus(''), 3000)
      }
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
                    {ja ? 'この種目カードを保存' : 'Save This Card'}
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
              ? (ja ? '画像を作成中...' : 'Creating image...')
              : saveFormat === 'combined'
                ? (ja ? 'まとめてカードを保存' : 'Save Full Card')
                : (ja ? '種目カードを保存' : 'Save Exercise Cards')}
          </button>

          <p className="text-center text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.28)' }}>
            {ja
              ? '保存後、Instagramで写真や動画に重ねて使えます'
              : 'Save it, then layer it over your photo or video on Instagram.'}
          </p>
        </div>
      </div>

      {/* Export-only card — combined mode, positioned off-screen to the left */}
      {/* position:fixed left:-9999px keeps element in the rendering tree (not display:none) */}
      <div
        ref={exportRef}
        aria-hidden="true"
        style={{ position: 'fixed', left: -9999, top: 0, opacity: 1, visibility: 'visible', pointerEvents: 'none' }}
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

      {/* Export-only cards — per-exercise mode, each at natural (max-content) width */}
      {data.exercises.map((ex, i) => (
        <div
          key={`export-ex-${i}`}
          ref={el => { exerciseExportRefs.current[i] = el }}
          aria-hidden="true"
          style={{ position: 'fixed', left: -9999, top: 0, width: 'max-content', opacity: 1, visibility: 'visible', pointerEvents: 'none' }}
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
