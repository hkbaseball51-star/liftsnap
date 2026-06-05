'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, ArrowLeft } from 'lucide-react'
import { getShareCount, incrementShareCount } from '@/lib/unlocks'
import { useWeightUnit } from '@/lib/useWeightUnit'
import { useLocale } from '@/lib/useLocale'
import WorkoutStoryCardContent, { ExerciseStoryCard, tname, PRESETS } from './WorkoutStoryCardContent'
import type { TodayData, CardStyle, DesignPreset, ShadowMode } from './WorkoutStoryCardContent'
import { captureElement, shareOrDownloadImage } from '@/lib/shareImage'

export type { TodayData }

function fmtDateShort(s: string) {
  const d = new Date(s + 'T00:00:00')
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${M[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

// ── Design presets ────────────────────────────────────────────────────
const PRESET_OPTIONS: { value: DesignPreset; label: string; swatch: string }[] = [
  { value: 'orange',        label: 'REPRA Orange',  swatch: '#F97316' },
  { value: 'ice-blue',      label: 'Ice Blue',       swatch: '#38BDF8' },
  { value: 'violet',        label: 'Violet Pump',    swatch: '#8B5CF6' },
  { value: 'mint',          label: 'Mint Proof',     swatch: '#14B8A6' },
  { value: 'premium-black', label: 'Premium Black',  swatch: '#E5E7EB' }, // TODO_PRO: Premium preset candidate
  { value: 'pearl-white',   label: 'Pearl White',    swatch: '#F0EFEA' }, // TODO_PRO: Premium preset candidate
]

// ── Shadow options ────────────────────────────────────────────────────
const SHADOW_OPTIONS: { value: ShadowMode; labelJa: string; labelEn: string }[] = [
  { value: 'soft',         labelJa: '標準',       labelEn: 'Soft'         },
  { value: 'strong',       labelJa: '強め',       labelEn: 'Strong'       },
  { value: 'extra-strong', labelJa: 'かなり強め', labelEn: 'Extra Strong' },
]

export default function TodayShareView({ data }: { data: TodayData }) {
  const router   = useRouter()
  const { unit } = useWeightUnit()
  const { locale } = useLocale()
  const todayStr = new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' })

  // ── Layout measurement refs (not capture targets) ──
  const captureRef = useRef<HTMLDivElement>(null)  // 9:16 canvas — layout measurement only
  const contentRef = useRef<HTMLDivElement>(null)  // scale wrapper — layout measurement only

  // ── Capture target refs — VISIBLE on-screen elements ──
  // Capturing visible elements ensures correct CSS computed styles.
  // previewCardRef: inner wrapper around WorkoutStoryCardContent in combined preview.
  //   - Has NO transform applied (transform is on parent contentRef), so html-to-image
  //     captures at natural (full) resolution even when preview is scaled down.
  const previewCardRef = useRef<HTMLDivElement>(null)
  // previewExRefs: one per ExerciseStoryCard in the per-exercise preview list.
  //   - Each ref wraps ONLY the ExerciseStoryCard div, NOT the checker overlay.
  const previewExRefs  = useRef<(HTMLDivElement | null)[]>([])

  const [cardStyle,     setCardStyleState] = useState<CardStyle>('glass')
  const [preset,        setPreset]         = useState<DesignPreset>('orange')
  const [shadowMode,    setShadowMode]     = useState<ShadowMode>('strong')
  const [saveFormat,    setSaveFormat]     = useState<'combined' | 'per-exercise'>('combined')
  const [saving,        setSaving]         = useState(false)
  const [status,        setStatus]         = useState('')
  const [shareCount,    setShareCount]     = useState(0)
  const [contentScale,  setContentScale]   = useState(1)
  const [naturalWidth,  setNaturalWidth]   = useState(0)
  const [naturalHeight, setNaturalHeight]  = useState(0)

  // Measure natural card dimensions, compute scale-down ratio if card overflows 9:16.
  // Runs before paint (useLayoutEffect) so there's no visible flash.
  useLayoutEffect(() => {
    const canvas  = captureRef.current
    const content = contentRef.current
    if (!canvas || !content) return

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

  // Save the combined (all-in-one) card — captures the visible preview card
  const handleSaveCombined = async () => {
    const cardEl = previewCardRef.current
    if (!cardEl) return
    setSaving(true)
    setStatus(locale === 'ja' ? '画像を作成中...' : 'Creating image...')
    try {
      const blob = await captureElement(cardEl, { clearBackground: cardStyle === 'transparent' })
      const filename = `repra-${data.date}-workout.png`
      const result = await shareOrDownloadImage({ blob, filename })
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

  // TODO_PRO: unlimitedExerciseCardSave — currently free; may become Pro-only.
  // Save a single exercise card — captures the visible preview card for that exercise
  const handleSaveSingleExercise = async (idx: number) => {
    const cardEl = previewExRefs.current[idx]
    if (!cardEl) return
    // Pre-save validation: element must be fully rendered and non-empty
    if (!cardEl.offsetWidth || !cardEl.offsetHeight || !cardEl.innerText?.trim() || !cardEl.children.length) return
    setSaving(true)
    setStatus(locale === 'ja' ? '画像を作成中...' : 'Creating image...')
    try {
      const ex = data.exercises[idx]
      const blob = await captureElement(cardEl, { clearBackground: cardStyle === 'transparent' })
      const enName = tname(ex.name).replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      const safeName = enName || `ex-${idx + 1}`
      const result = await shareOrDownloadImage({ blob, filename: `repra-${data.date}-${safeName}.png` })
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

  // TODO_PRO: bulkExerciseCardSave — currently free; may become Pro-only.
  // Save all exercise cards — captures each visible preview card in sequence
  const handleSavePerExercise = async () => {
    setSaving(true)
    setStatus(locale === 'ja' ? '画像を作成中...' : 'Creating image...')
    try {
      const files: File[] = []
      for (let i = 0; i < data.exercises.length; i++) {
        const cardEl = previewExRefs.current[i]
        if (!cardEl || !cardEl.offsetWidth || !cardEl.offsetHeight || !cardEl.innerText?.trim() || !cardEl.children.length) continue
        const ex = data.exercises[i]
        const blob = await captureElement(cardEl, { clearBackground: cardStyle === 'transparent' })
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

  const checkerBg = [
    'linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%)',
    'linear-gradient(-45deg, rgba(255,255,255,0.04) 25%, transparent 25%)',
    'linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.04) 75%)',
    'linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.04) 75%)',
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

      {/* ── Preview area ─────────────────────────────────────────────── */}
      {saveFormat === 'combined' ? (

        /* Combined: 9:16 canvas with inner card — capture target is previewCardRef (no transform) */
        <div className="flex-shrink-0" style={{ display: 'flex', justifyContent: 'center', padding: '0 16px 12px' }}>
          <div style={{ width: 'min(94vw, 420px)' }}>
            <div
              ref={captureRef}
              style={{
                position: 'relative',
                aspectRatio: '9/16',
                overflow: 'hidden',
                borderRadius: 24,
                background: 'transparent',
              }}
            >
              {/* Transparent/Glass card: show checker sized to card footprint */}
              {(isTransparent || cardStyle === 'glass') && naturalWidth > 0 && naturalHeight > 0 && (
                <div
                  style={{
                    position: 'absolute', top: 0, left: 0,
                    width: `${naturalWidth}px`,
                    height: `${Math.round(naturalHeight * contentScale)}px`,
                    backgroundColor: isTransparent ? '#2a2a2a' : '#161616',
                    backgroundImage: checkerBg,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                    borderRadius: 24,
                    zIndex: 1,
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* contentRef: scale wrapper for layout measurement */}
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
                  {/*
                    previewCardRef: the ACTUAL capture target.
                    This div has NO transform — its parent (contentRef) has the scale transform,
                    but getComputedStyle() on THIS element returns no transform.
                    html-to-image therefore captures it at full natural resolution.
                    overflow:hidden + borderRadius clip the capture region to the card shape
                    so WebKit correctly produces transparent corners in the PNG.
                  */}
                  <div ref={previewCardRef} style={{ overflow: 'hidden', borderRadius: 24 }}>
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
        </div>

      ) : (

        /* Per-exercise: scrollable list of visible cards — previewExRefs[i] are capture targets */
        <div className="flex-shrink-0 overflow-y-auto" style={{ maxHeight: '55vh', padding: '0 16px 12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {data.exercises.map((ex, i) => (
              <div key={`preview-${i}`} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ position: 'relative' }}>
                  {/* Transparent/Glass card: checker is a sibling of the capture target — NOT inside previewExRefs */}
                  {(isTransparent || cardStyle === 'glass') && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      backgroundColor: isTransparent ? '#2a2a2a' : '#161616',
                      backgroundImage: checkerBg,
                      backgroundSize: '20px 20px',
                      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                      borderRadius: 24,
                      pointerEvents: 'none',
                    }} />
                  )}
                  {/*
                    previewExRefs[i]: capture target for this exercise card.
                    Wraps ONLY ExerciseStoryCard — the checker above is a sibling div,
                    so it is NOT captured in the saved PNG.
                    position:relative + zIndex:1 ensures this element paints ABOVE the
                    absolutely-positioned checker overlay (which has z-index:auto ≈ 0).
                  */}
                  <div ref={el => { previewExRefs.current[i] = el }} style={{ position: 'relative', zIndex: 1, borderRadius: 24, overflow: 'hidden' }}>
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
        {/* Card Style */}
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

        {/* Design Preset */}
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

        {/* Text Shadow */}
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

        {/* Save Format */}
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

    </div>
  )
}
