'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, ArrowLeft } from 'lucide-react'
import { getShareCount, incrementShareCount } from '@/lib/unlocks'
import { useWeightUnit } from '@/lib/useWeightUnit'
import { useLocale } from '@/lib/useLocale'
import WorkoutStoryCardContent, { ExerciseStoryCard, WorkoutSummaryStoryCard, tname, PRESETS } from './WorkoutStoryCardContent'
import type { TodayData, CardStyle, DesignPreset, ShadowMode } from './WorkoutStoryCardContent'
import { captureElement, shareOrDownloadImage } from '@/lib/shareImage'
import { useCardLang } from '@/lib/useCardLang'
import { useTheme } from '@/lib/useTheme'

export type { TodayData }

function fmtDateShort(s: string) {
  const d = new Date(s + 'T00:00:00')
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${M[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

// ── Design presets ────────────────────────────────────────────────────
const PRESET_OPTIONS: { value: DesignPreset; label: string; labelJa: string; swatch: string }[] = [
  { value: 'orange',        label: 'REPRA Orange',  labelJa: 'REPRA オレンジ',    swatch: '#F97316' },
  { value: 'ice-blue',      label: 'Ice Blue',       labelJa: 'アイスブルー',       swatch: '#38BDF8' },
  { value: 'violet',        label: 'Violet Pump',    labelJa: 'バイオレットパンプ', swatch: '#8B5CF6' },
  { value: 'mint',          label: 'Mint Proof',     labelJa: 'ミントプルーフ',     swatch: '#14B8A6' },
  { value: 'premium-black', label: 'Premium Black',  labelJa: 'プレミアムブラック', swatch: '#E5E7EB' }, // TODO_PRO: Premium preset candidate
  { value: 'pearl-white',   label: 'Pearl White',    labelJa: 'パールホワイト',     swatch: '#F0EFEA' }, // TODO_PRO: Premium preset candidate
]

// ── Shadow options ────────────────────────────────────────────────────
const SHADOW_OPTIONS: { value: ShadowMode; labelJa: string; labelEn: string }[] = [
  { value: 'soft',         labelJa: '弱め', labelEn: 'Soft'  },
  { value: 'strong',       labelJa: '強め', labelEn: 'Strong' },
  { value: 'extra-strong', labelJa: '最大', labelEn: 'Extra'  },
]

export default function TodayShareView({ data }: { data: TodayData }) {
  const router   = useRouter()
  const { unit } = useWeightUnit()
  const { locale } = useLocale()
  const { theme } = useTheme()
  const isLight = theme === 'light'
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
  // summaryCardRef: capture target for the Workout Summary Story card.
  const summaryCardRef = useRef<HTMLDivElement>(null)
  // previewExRefs: one per ExerciseStoryCard in the per-exercise preview list.
  //   - Each ref wraps ONLY the ExerciseStoryCard div, NOT the checker overlay.
  const previewExRefs  = useRef<(HTMLDivElement | null)[]>([])

  const [cardStyle,     setCardStyleState] = useState<CardStyle>('glass')
  const [preset,        setPreset]         = useState<DesignPreset>(() => {
    try {
      const saved = localStorage.getItem('repra_share_preset')
      if (saved && ['orange','ice-blue','violet','mint','premium-black','pearl-white'].includes(saved)) {
        return saved as DesignPreset
      }
    } catch {}
    return 'premium-black'
  })
  const [shadowMode,    setShadowMode]     = useState<ShadowMode>('strong')
  const [saveFormat,    setSaveFormat]     = useState<'combined' | 'per-exercise'>('combined')
  const [cardLang, setCardLang] = useCardLang(locale)
  const [saving,        setSaving]         = useState(false)
  const [status,        setStatus]         = useState('')
  const [shareCount,    setShareCount]     = useState(0)
  const [contentScale,  setContentScale]   = useState(1)
  const [naturalWidth,  setNaturalWidth]   = useState(0)
  const [naturalHeight, setNaturalHeight]  = useState(0)

  // Measure natural (max-content) card dimensions.
  // content.style.width = 'max-content' forces shrink-to-fit before reading offsetWidth,
  // so naturalWidth reflects the card's content-driven width, not the container width.
  useLayoutEffect(() => {
    const content = contentRef.current
    if (!content) return
    content.style.width = 'max-content'
    const contentW = content.offsetWidth
    const contentH = content.scrollHeight
    setContentScale(1)
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
    try { localStorage.setItem('repra_share_preset', p) } catch {}
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

  // Save the summary-only card
  const handleSaveSummary = async () => {
    const cardEl = summaryCardRef.current
    if (!cardEl) return
    setSaving(true)
    setStatus(locale === 'ja' ? '画像を作成中...' : 'Creating image...')
    try {
      const blob = await captureElement(cardEl, { clearBackground: cardStyle === 'transparent' })
      const filename = `repra-${data.date}-summary.png`
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

  const handleSave = saveFormat === 'combined' ? handleSaveCombined : handleSavePerExercise

  // ── Derived ──────────────────────────────────────────────────────────
  const isPast        = data.date !== todayStr
  const ja            = locale === 'ja'
  const isTransparent = cardStyle === 'transparent'
  const isClearGlass  = cardStyle === 'clear-glass'

  const checkerBg = [
    'linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%)',
    'linear-gradient(-45deg, rgba(255,255,255,0.04) 25%, transparent 25%)',
    'linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.04) 75%)',
    'linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.04) 75%)',
  ].join(', ')

  // premium-black + transparent has dark text, so show a light preview backing.
  // The checker div is OUTSIDE the capture target — this does NOT affect saved images.
  const needsLightPreviewBacking = preset === 'premium-black' && isTransparent
  const lightCheckerBg = [
    'linear-gradient(45deg, rgba(0,0,0,0.03) 25%, transparent 25%)',
    'linear-gradient(-45deg, rgba(0,0,0,0.03) 25%, transparent 25%)',
    'linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.03) 75%)',
    'linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.03) 75%)',
  ].join(', ')

  return (
    <div className="min-h-screen pb-nav flex flex-col" style={{ background: 'var(--app-bg)' }}>

      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-12 pb-3 flex-shrink-0">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg" style={{ background: 'var(--card-bg-primary)', border: '1px solid var(--card-border-primary)' }}>
          <ArrowLeft size={16} style={{ color: 'var(--text-muted)' }} />
        </button>
        <div>
          <h1 className="text-sm font-black tracking-widest" style={{ color: 'var(--text-primary)' }}>
            {isPast
              ? (ja ? 'この日のワークアウトStory' : 'Workout Story')
              : (ja ? '今日のワークアウトStory' : "Today's Workout Story")}
          </h1>
          {isPast && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {fmtDateShort(data.date)}
            </p>
          )}
        </div>
      </div>

      {/* ── Settings sections ─────────────────────────────────────────── */}

      {/* Display Language */}
      <div className="px-4 mb-3">
        <p className="text-[10px] font-bold mb-2" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
          {ja ? '表示言語' : 'Display Language'}
        </p>
        <div className="flex gap-2">
          {([
            { value: 'en' as const, labelJa: '英語', labelEn: 'English' },
            { value: 'ja' as const, labelJa: '日本語', labelEn: 'Japanese' },
          ]).map(({ value, labelJa, labelEn }) => (
            <button key={value}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold"
              style={{
                background: cardLang === value ? '#ED742F' : 'var(--surface-chip)',
                color:      cardLang === value ? '#fff'    : 'var(--text-secondary)',
                border:     `1px solid ${cardLang === value ? '#ED742F' : 'var(--border-subtle)'}`,
              }}
              onClick={() => setCardLang(value)}>
              {ja ? labelJa : labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Save Format */}
      <div className="px-4 mb-3">
        <p className="text-[10px] font-bold mb-2" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
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
                background: saveFormat === value ? '#ED742F' : 'var(--surface-chip)',
                color:      saveFormat === value ? '#fff'    : 'var(--text-secondary)',
                border:     `1px solid ${saveFormat === value ? '#ED742F' : 'var(--border-subtle)'}`,
              }}
              onClick={() => setSaveFormat(value)}>
              {ja ? labelJa : labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Card Style */}
      <div className="px-4 mb-3">
        <p className="text-[10px] font-bold mb-2" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
          {ja ? 'カードスタイル' : 'Card Style'}
        </p>
        <div className="flex gap-2">
          {([
            { value: 'glass',       labelJa: 'ガラス',     labelEn: 'Glass'       },
            { value: 'clear-glass', labelJa: '透明ガラス', labelEn: 'Clear Glass' },
            { value: 'transparent', labelJa: '透過',       labelEn: 'Transparent' },
          ] as { value: CardStyle; labelJa: string; labelEn: string }[]).map(({ value, labelJa, labelEn }) => (
            <button key={value}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold"
              style={{
                background: cardStyle === value ? '#ED742F' : 'var(--surface-chip)',
                color:      cardStyle === value ? '#fff'    : 'var(--text-secondary)',
                border:     `1px solid ${cardStyle === value ? '#ED742F' : 'var(--border-subtle)'}`,
              }}
              onClick={() => handleSetCardStyle(value)}>
              {ja ? labelJa : labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Design Preset */}
      <div className="px-4 mb-3">
        <p className="text-[10px] font-bold mb-2" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
          {ja ? 'デザインプリセット' : 'Design Preset'}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESET_OPTIONS.map(({ value, label, labelJa, swatch }) => {
            const sel = preset === value
            return (
              <button key={value}
                className="py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                style={{
                  background: sel ? `${swatch}22` : 'var(--surface-chip)',
                  color: sel
                    ? (value === 'pearl-white' || value === 'premium-black' ? 'var(--text-primary)' : swatch)
                    : 'var(--text-secondary)',
                  border: `1px solid ${sel ? swatch : 'var(--border-subtle)'}`,
                  minHeight: 44,
                }}
                onClick={() => handleSetPreset(value)}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: swatch, flexShrink: 0,
                  boxShadow: sel ? `0 0 6px ${swatch}` : 'none',
                }} />
                {ja ? labelJa : label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Text Shadow */}
      <div className="px-4 mb-4">
        <p className="text-[10px] font-bold mb-2" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
          {ja ? 'テキストシャドウ' : 'Text Shadow'}
        </p>
        <div className="flex gap-2">
          {SHADOW_OPTIONS.map(({ value, labelJa, labelEn }) => (
            <button key={value}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold"
              style={{
                background: shadowMode === value ? '#ED742F' : 'var(--surface-chip)',
                color:      shadowMode === value ? '#fff'    : 'var(--text-secondary)',
                border:     `1px solid ${shadowMode === value ? '#ED742F' : 'var(--border-subtle)'}`,
              }}
              onClick={() => setShadowMode(value)}>
              {ja ? labelJa : labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* ── Preview area ─────────────────────────────────────────────── */}
      {saveFormat === 'combined' ? (

        /* Combined: variable-height card — capture target is previewCardRef */
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px 16px' }}>
          <div style={{
            width: 'fit-content',
            maxWidth: 'min(94vw, 420px)',
            background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.05)',
            border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)',
            borderRadius: 30,
            boxShadow: isLight ? '0 18px 50px rgba(15,23,42,0.10)' : '0 4px 20px rgba(0,0,0,0.30)',
            padding: 12,
          }}>
            <div
              ref={captureRef}
              style={{
                position: 'relative',
                borderRadius: 24,
                background: 'transparent',
                width: 'max-content',
                maxWidth: 'min(360px, calc(100vw - 40px))',
              }}
            >
              {/* Transparent/Glass card: checker fills card background via inset:0 */}
              {(isTransparent || cardStyle === 'glass' || isClearGlass) && (
                <div
                  style={{
                    position: 'absolute', inset: 0,
                    backgroundColor: needsLightPreviewBacking ? '#F9FAFB' : (isTransparent || isClearGlass ? '#222228' : '#161616'),
                    backgroundImage: needsLightPreviewBacking ? lightCheckerBg : checkerBg,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                    borderRadius: 24,
                    zIndex: 1,
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* contentRef: pass-through wrapper — card grows vertically to fit all content */}
              <div style={{ position: 'relative', zIndex: 2 }}>
                <div
                  ref={contentRef}
                  style={{ width: naturalWidth > 0 ? `${naturalWidth}px` : 'max-content', maxWidth: '100%' }}
                >
                  {/*
                    previewCardRef: the ACTUAL capture target.
                    overflow:hidden + borderRadius clip the capture region to the card shape
                    so WebKit correctly produces transparent corners in the PNG.
                  */}
                  <div ref={previewCardRef} style={{ overflow: 'hidden', borderRadius: 24 }}>
                    <WorkoutStoryCardContent
                      data={data}
                      cardStyle={cardStyle}
                      preset={preset}
                      unit={unit}
                      locale={cardLang}
                      isPast={isPast}
                      shadowMode={shadowMode}
                      exerciseNameLang={cardLang}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      ) : (

        /* Per-exercise: list of visible cards — previewExRefs[i] are capture targets */
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── Summary card (top) ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{
                background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.05)',
                border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: 28,
                boxShadow: isLight ? '0 8px 24px rgba(0,0,0,0.10)' : '0 4px 16px rgba(0,0,0,0.20)',
                padding: 12,
              }}>
                <div style={{ position: 'relative' }}>
                  {(isTransparent || cardStyle === 'glass') && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      backgroundColor: needsLightPreviewBacking ? '#F9FAFB' : (isTransparent ? '#2a2a2a' : '#161616'),
                      backgroundImage: needsLightPreviewBacking ? lightCheckerBg : checkerBg,
                      backgroundSize: '20px 20px',
                      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                      borderRadius: 24,
                      pointerEvents: 'none',
                    }} />
                  )}
                  <div ref={summaryCardRef} style={{ position: 'relative', zIndex: 1, borderRadius: 24, overflow: 'hidden' }}>
                    <WorkoutSummaryStoryCard
                      data={data}
                      cardStyle={cardStyle}
                      preset={preset}
                      unit={unit}
                      locale={cardLang}
                      isPast={isPast}
                      shadowMode={shadowMode}
                    />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleSaveSummary}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl text-xs font-bold active:opacity-70 transition-opacity"
                  style={{
                    padding: '8px 14px',
                    background: 'var(--surface-chip)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <Download size={13} />
                  {ja ? 'サマリーカードを保存' : 'Save Summary Card'}
                </button>
              </div>
            </div>

            {data.exercises.map((ex, i) => (
              <div key={`preview-${i}`} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{
                  background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.05)',
                  border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 28,
                  boxShadow: isLight ? '0 8px 24px rgba(0,0,0,0.10)' : '0 4px 16px rgba(0,0,0,0.20)',
                  padding: 12,
                }}>
                <div style={{ position: 'relative' }}>
                  {/* Transparent/Glass card: checker is a sibling of the capture target — NOT inside previewExRefs */}
                  {(isTransparent || cardStyle === 'glass') && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      backgroundColor: needsLightPreviewBacking ? '#F9FAFB' : (isTransparent ? '#2a2a2a' : '#161616'),
                      backgroundImage: needsLightPreviewBacking ? lightCheckerBg : checkerBg,
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
                      locale={cardLang}
                      isPast={isPast}
                      shadowMode={shadowMode}
                      exerciseNameLang={cardLang}
                    />
                  </div>
                </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleSaveSingleExercise(i)}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-xl text-xs font-bold active:opacity-70 transition-opacity"
                    style={{
                      padding: '8px 14px',
                      background: 'var(--surface-chip)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
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
        <p className="text-center text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {ja
            ? '保存後、Instagramで写真や動画に重ねて使えます'
            : 'Save it, then layer it over your photo or video on Instagram.'}
        </p>
      </div>

      <div style={{ height: 'calc(2rem + env(safe-area-inset-bottom))', flexShrink: 0 }} />

    </div>
  )
}
