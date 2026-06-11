'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Camera } from 'lucide-react'
import type { TimelinePhoto } from '@/actions/bodyTimeline'
import type { Locale } from '@/lib/i18n'

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function formatDate(dateStr: string, locale: Locale): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (locale === 'ja') {
    return `${y}年${m}月${d}日`
  }
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function BodyTimeline({
  photos,
  initialIndex,
  locale,
}: {
  photos: TimelinePhoto[]
  initialIndex: number
  locale: Locale
}) {
  const router = useRouter()
  const [index, setIndex] = useState(initialIndex)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const thumbsRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)

  const current = photos[index]

  // Scroll active thumbnail into view
  useEffect(() => {
    if (!thumbsRef.current) return
    const thumb = thumbsRef.current.children[index] as HTMLElement | undefined
    thumb?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [index])

  const goTo = useCallback((i: number) => {
    if (i < 0 || i >= photos.length) return
    setIndex(i)
  }, [photos.length])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < 40) return
    if (dx < 0) goTo(index + 1) // swipe left → next (older)
    else         goTo(index - 1) // swipe right → prev (newer)
  }

  const handleSave = () => {
    if (!current) return
    if (isIOS()) {
      window.open(current.signedUrl, '_blank')
      setShowSaveModal(true)
    } else {
      const a = document.createElement('a')
      a.href = current.signedUrl
      a.download = `body-${current.date}.jpg`
      a.click()
    }
  }

  // Empty state
  if (photos.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{ background: 'var(--app-bg)' }}>
        <div className="flex flex-col items-center gap-4 px-8 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(237, 116, 47,0.12)', border: '1px solid rgba(237, 116, 47,0.32)' }}>
            <Camera size={28} style={{ color: 'rgba(237, 116, 47,0.50)' }} />
          </div>
          <p className="text-[15px] font-black text-white">
            {locale === 'ja' ? 'まだ写真がありません' : 'No photos yet'}
          </p>
          <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.60)' }}>
            {locale === 'ja'
              ? 'ワークアウト後に体写真を追加すると、ここに表示されます。'
              : 'Add a body photo after your workout to start your visible proof.'}
          </p>
          <button
            onClick={() => router.back()}
            className="mt-2 text-[12px] font-bold"
            style={{ color: 'rgba(237, 116, 47,0.75)' }}>
            {locale === 'ja' ? '← 戻る' : '← Back'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--app-bg)' }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 pt-safe"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)', paddingBottom: 12 }}>
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center active:opacity-60 transition-opacity"
            style={{ width: 36, height: 36, borderRadius: 999,
              background: 'rgba(255,255,255,0.12)' }}>
            <ArrowLeft size={18} color="#fff" />
          </button>
          <div className="text-center">
            <p className="text-[11px] font-black tracking-widest text-white">BODY TIMELINE</p>
          </div>
          <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <span className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.58)' }}>
              {index + 1} / {photos.length}
            </span>
          </div>
        </div>

        {/* ── Date ── */}
        <p className="text-center text-[12px] font-bold mb-3" style={{ color: 'rgba(255,255,255,0.72)' }}>
          {current ? formatDate(current.date, locale) : ''}
        </p>

        {/* ── Photo ── */}
        <div className="flex-1 flex items-center justify-center px-4 min-h-0">
          <div
            className="relative"
            style={{
              width: 'min(90vw, 430px)',
              height: 'min(62vh, 600px)',
              borderRadius: 24,
              overflow: 'hidden',
              background: '#171717',
              flexShrink: 0,
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {current && (
              <Image
                key={current.imagePath}
                src={current.signedUrl}
                alt={current.date}
                fill
                className="object-contain"
                sizes="min(90vw, 430px)"
                unoptimized
                priority
              />
            )}
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center justify-center gap-6 py-4 px-4">
          {/* Save */}
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 active:opacity-60 transition-opacity"
            style={{
              padding: '8px 16px', borderRadius: 999,
              background: 'rgba(237, 116, 47,0.15)',
              border: '1px solid rgba(237, 116, 47,0.42)',
            }}>
            <Download size={14} style={{ color: '#ED742F' }} />
            <span className="text-[12px] font-bold" style={{ color: '#ED742F' }}>
              {locale === 'ja' ? '保存' : 'Save'}
            </span>
          </button>

          {/* Prev / Next */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              className="flex items-center justify-center active:opacity-60 transition-opacity disabled:opacity-25"
              style={{ width: 40, height: 40, borderRadius: 999,
                background: 'rgba(255,255,255,0.12)' }}>
              <ChevronLeft size={20} color="#fff" />
            </button>
            <button
              onClick={() => goTo(index + 1)}
              disabled={index === photos.length - 1}
              className="flex items-center justify-center active:opacity-60 transition-opacity disabled:opacity-25"
              style={{ width: 40, height: 40, borderRadius: 999,
                background: 'rgba(255,255,255,0.12)' }}>
              <ChevronRight size={20} color="#fff" />
            </button>
          </div>
        </div>

        {/* ── Thumbnail strip ── */}
        <div
          ref={thumbsRef}
          className="flex gap-2 overflow-x-auto px-4 pb-safe"
          style={{
            scrollbarWidth: 'none',
            paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
          }}>
          {photos.map((p, i) => (
            <button
              key={p.imagePath}
              onClick={() => setIndex(i)}
              className="flex-shrink-0 active:opacity-70 transition-opacity"
              style={{ padding: 0, background: 'none', border: 'none' }}>
              <div
                className="relative rounded-xl overflow-hidden"
                style={{
                  width: 52, height: 72,
                  border: i === index
                    ? '2px solid #ED742F'
                    : '2px solid transparent',
                  background: '#171717',
                }}>
                <Image
                  src={p.signedUrl} alt={p.date}
                  fill className="object-cover" sizes="52px" unoptimized
                />
              </div>
            </button>
          ))}
        </div>

      </div>

      {/* ── iOS Save Modal ── */}
      {showSaveModal && (
        <div
          className="fixed inset-0 z-[60] flex items-end"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setShowSaveModal(false)}>
          <div
            className="w-full px-4 pb-safe"
            style={{
              paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
              background: '#222222',
              borderRadius: '20px 20px 0 0',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4"
              style={{ background: 'rgba(255,255,255,0.18)' }} />
            <p className="text-[14px] font-black text-white mb-1">
              {locale === 'ja' ? '写真を保存する' : 'Save Photo'}
            </p>
            <p className="text-[12px] leading-relaxed mb-5"
              style={{ color: 'rgba(255,255,255,0.68)' }}>
              {locale === 'ja'
                ? '画像を長押しして「写真に保存」を選択してください。'
                : 'Press and hold the image in the new tab, then choose "Save to Photos".'}
            </p>
            <button
              onClick={() => setShowSaveModal(false)}
              className="w-full py-3 rounded-2xl text-[14px] font-bold active:opacity-70 transition-opacity"
              style={{ background: 'rgba(255,255,255,0.13)', color: '#fff' }}>
              {locale === 'ja' ? '閉じる' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
