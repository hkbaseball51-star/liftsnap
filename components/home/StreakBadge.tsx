'use client'

import { useEffect, useRef, useState } from 'react'
import { Info, Check, X } from 'lucide-react'
import type { Locale } from '@/lib/i18n'

type Props = {
  streak: number
  thisWeekDone: boolean
  locale?: Locale
  thisWeekWorkouts?: number
  thisWeekPhotos?: number
}

export default function StreakBadge({
  streak,
  thisWeekDone,
  locale = 'en',
  thisWeekWorkouts = 0,
  thisWeekPhotos = 0,
}: Props) {
  const [open, setOpen] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  const label = streak === 0 ? 'START' : `${streak}W`

  const workoutsDone = thisWeekWorkouts >= 2
  const photosDone   = thisWeekPhotos >= 1
  // TODO: Story share dates not persisted yet — always 0 until implemented
  const storiesDone  = false

  const close = () => setOpen(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      {/* ── Badge + info icon ──────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-shrink-0" style={{ marginTop: 4 }}>
        <div
          className="flex items-center gap-1"
          style={{
            background: 'rgba(237, 116, 47,0.15)',
            border: '1px solid rgba(237, 116, 47,0.42)',
            borderRadius: 999,
            paddingInline: 10,
            paddingBlock: 5,
          }}>
          <span style={{ fontSize: 12, lineHeight: 1 }}>🔥</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#ED742F', letterSpacing: '0.02em' }}>
            {label}
          </span>
        </div>

        <button
          onClick={() => setOpen(true)}
          aria-label={locale === 'ja' ? 'Proof Streakの説明を表示' : 'About Proof Streak'}
          className="flex items-center justify-center active:opacity-60 transition-opacity"
          style={{
            width: 22, height: 22, borderRadius: 999,
            background: 'rgba(237, 116, 47,0.14)',
            border: '1px solid rgba(237, 116, 47,0.35)',
          }}>
          <Info size={11} style={{ color: '#ED742F', opacity: 0.75 }} />
        </button>
      </div>

      {/* ── Bottom Sheet ──────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.78)' }}
          onClick={close}>
          <div
            ref={sheetRef}
            className="w-full flex flex-col"
            style={{
              maxWidth: 600,
              background: '#222222',
              border: '1px solid rgba(255,255,255,0.17)',
              borderBottom: 'none',
              borderRadius: '24px 24px 0 0',
              maxHeight: '80dvh',
            }}
            onClick={e => e.stopPropagation()}>

            {/* ── Fixed header ── */}
            <div className="flex-shrink-0">
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-8 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
              </div>

              {/* Title row */}
              <div className="flex items-center justify-between px-5 pt-2 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(237, 116, 47,0.15)', border: '1px solid rgba(237, 116, 47,0.38)' }}>
                    <span style={{ fontSize: 18, lineHeight: 1 }}>🔥</span>
                  </div>
                  <div>
                    <p className="text-base font-black" style={{ color: '#fff' }}>
                      {locale === 'ja' ? 'Proof Streakの仕組み' : 'How Proof Streak works'}
                    </p>
                    {streak > 0 && (
                      <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.65)' }}>
                        {locale === 'ja'
                          ? `現在 ${streak}週間継続中`
                          : `Currently ${streak} ${streak === 1 ? 'week' : 'weeks'} strong`}
                      </p>
                    )}
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={close}
                  aria-label={locale === 'ja' ? '閉じる' : 'Close'}
                  className="flex items-center justify-center w-8 h-8 rounded-full active:opacity-60 transition-opacity flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)' }}>
                  <X size={14} style={{ color: 'rgba(255,255,255,0.72)' }} />
                </button>
              </div>

              {/* Header divider */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.10)', marginInline: 20 }} />
            </div>

            {/* ── Scrollable content ── */}
            <div
              className="flex-1 overflow-y-auto px-5 pt-4"
              style={{
                WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
                paddingBottom: 'calc(116px + env(safe-area-inset-bottom))',
              }}>

              {/* Intro */}
              <p className="text-[12px] leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.72)' }}>
                {locale === 'ja'
                  ? '1週間のうち、以下のどれかを達成するとProof Weekになります。'
                  : 'A Proof Week is completed when you do at least one of these in a week:'}
              </p>

              {/* Rule bullets */}
              <div className="rounded-2xl p-4 mb-3 space-y-3"
                style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.14)' }}>
                {[
                  { en: 'Log 2 workouts',         ja: 'ワークアウトを2回記録' },
                  { en: 'Add 1 body photo',        ja: '体写真を1回追加'       },
                  { en: 'Share 1 workout story',   ja: 'ワークアウトストーリーを1回シェア' },
                ].map(rule => (
                  <div key={rule.en} className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#ED742F' }} />
                    <p className="text-[13px] font-bold" style={{ color: '#fff' }}>
                      {locale === 'ja' ? rule.ja : rule.en}
                    </p>
                  </div>
                ))}
              </div>

              {/* Rest days note */}
              <p className="text-[11px] leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.58)' }}>
                {locale === 'ja'
                  ? '毎日記録しなくても大丈夫です。REPRAは毎日のプレッシャーではなく、努力の証拠を継続できているかを記録します。'
                  : 'Rest days are okay. REPRA tracks consistent proof, not daily pressure.'}
              </p>

              {/* Divider */}
              <div className="mb-4" style={{ height: 1, background: 'rgba(255,255,255,0.12)' }} />

              {/* This week */}
              <p className="text-[10px] font-black tracking-widest mb-3"
                style={{ color: 'rgba(255,255,255,0.52)' }}>
                {locale === 'ja' ? '今週の進捗' : 'THIS WEEK'}
              </p>

              <div className="space-y-3 mb-4">
                <ProgressRow
                  label={locale === 'ja' ? 'ワークアウト' : 'Workout logs'}
                  current={thisWeekWorkouts}
                  required={2}
                  done={workoutsDone}
                />
                <ProgressRow
                  label={locale === 'ja' ? '体写真' : 'Body photos'}
                  current={thisWeekPhotos}
                  required={1}
                  done={photosDone}
                />
                <ProgressRow
                  label={locale === 'ja' ? 'ストーリー' : 'Story shares'}
                  current={0}
                  required={1}
                  done={storiesDone}
                  comingSoon
                  comingSoonLabel={locale === 'ja' ? '近日公開' : 'Coming soon'}
                />
              </div>

              {/* Proof Week status banner */}
              {thisWeekDone ? (
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl"
                  style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.22)' }}>
                  <Check size={15} strokeWidth={2.5} style={{ color: '#22c55e', flexShrink: 0 }} />
                  <p className="text-[13px] font-black" style={{ color: '#22c55e' }}>
                    {locale === 'ja' ? '今週のProof Week達成！' : 'Proof Week completed ✓'}
                  </p>
                </div>
              ) : (workoutsDone || photosDone) ? (
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl"
                  style={{ background: 'rgba(237, 116, 47,0.12)', border: '1px solid rgba(237, 116, 47,0.38)' }}>
                  <Check size={15} strokeWidth={2.5} style={{ color: '#ED742F', flexShrink: 0 }} />
                  <p className="text-[13px] font-black" style={{ color: '#ED742F' }}>
                    {locale === 'ja' ? '今週のProof Week達成！' : 'Proof Week completed ✓'}
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <div className="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 mt-0.5"
                    style={{ borderColor: 'rgba(255,255,255,0.22)' }} />
                  <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.60)' }}>
                    {locale === 'ja'
                      ? '上記のどれかを達成するとProof Week完了です。'
                      : 'Complete any condition above to finish this Proof Week.'}
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ── Progress row inside the sheet ─────────────────────────── */

function ProgressRow({
  label, current, required, done, comingSoon, comingSoonLabel,
}: {
  label: string; current: number; required: number
  done: boolean; comingSoon?: boolean; comingSoonLabel?: string
}) {
  const pct = comingSoon ? 0 : Math.min((current / required) * 100, 100)

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          {done
            ? <Check size={12} strokeWidth={2.5} style={{ color: '#22c55e', flexShrink: 0 }} />
            : <div className="w-3 h-3 rounded-full border-[1.5px] flex-shrink-0"
                style={{ borderColor: comingSoon ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.28)' }} />
          }
          <p className="text-[12px] font-bold"
            style={{ color: done ? '#fff' : comingSoon ? 'rgba(255,255,255,0.52)' : 'rgba(255,255,255,0.70)' }}>
            {label}
          </p>
        </div>
        <span className="text-[10px]" style={{
          color: done ? '#22c55e' : comingSoon ? 'rgba(255,255,255,0.44)' : 'rgba(255,255,255,0.60)',
        }}>
          {comingSoon ? (comingSoonLabel ?? 'Coming soon') : `${Math.min(current, required)} / ${required}`}
        </span>
      </div>
      <div className="h-[2px] rounded-full overflow-hidden ml-5"
        style={{ background: 'rgba(255,255,255,0.11)' }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 999,
          background: done ? '#22c55e' : '#ED742F',
          transition: 'width 0.35s ease',
        }} />
      </div>
    </div>
  )
}
