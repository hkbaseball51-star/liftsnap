'use client'

// TODO_PRO: This component is a draft paywall for REPRA Pro.
// When Pro launches: replace "Coming Soon" CTA with a purchase button
// and wire up StoreKit / RevenueCat / payment provider.

import { X, Crown, Sparkles, CalendarClock } from 'lucide-react'
import { useLocale } from '@/lib/useLocale'
import { PRO_FEATURE_LABELS } from '@/constants/pro'

interface ProComingSoonModalProps {
  onClose: () => void
}

export default function ProComingSoonModal({ onClose }: ProComingSoonModalProps) {
  const { locale } = useLocale()
  const isJa = locale === 'ja'
  const labels = PRO_FEATURE_LABELS[isJa ? 'ja' : 'en']

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}>
      <div
        className="w-full rounded-t-3xl"
        style={{
          background: '#141414',
          border: '1px solid rgba(255,255,255,0.12)',
          borderBottom: 'none',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 28px)',
        }}
        onClick={e => e.stopPropagation()}>

        {/* Header accent */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, #ED742F, rgba(237,116,47,0.2))', borderRadius: '16px 16px 0 0' }} />

        {/* Title row */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(237,116,47,0.14)', border: '1px solid rgba(237,116,47,0.30)' }}>
              <Crown size={18} color="#ED742F" />
            </div>
            <div>
              <p className="text-base font-black" style={{ color: '#fff', letterSpacing: '-0.01em' }}>REPRA Pro</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.40)' }}>Every rep becomes proof.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 active:opacity-70">
            <X size={18} color="rgba(255,255,255,0.40)" />
          </button>
        </div>

        {/* Planned features */}
        <div className="px-5 pb-4">
          <p className="text-[10px] font-black tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {isJa ? '準備中の機能' : 'PLANNED FEATURES'}
          </p>
          <div className="flex flex-col gap-2.5">
            {(Object.values(labels) as string[]).map((label, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(237,116,47,0.14)' }}>
                  <Sparkles size={8} color="#ED742F" />
                </div>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.72)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 30-day trial notice */}
        <div className="mx-5 mb-4 flex items-center gap-2.5 px-4 py-3 rounded-2xl"
          style={{ background: 'rgba(237,116,47,0.07)', border: '1px solid rgba(237,116,47,0.16)' }}>
          <CalendarClock size={14} color="rgba(237,116,47,0.70)" />
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(237,116,47,0.80)' }}>
            {isJa
              ? 'REPRA Pro導入時は30日間無料トライアルを予定しています。'
              : '30-day free trial planned when REPRA Pro launches.'}
          </p>
        </div>

        {/* CTA — Coming Soon only. No purchase button, no price. */}
        {/* TODO_PRO: Replace this div with a purchase button when Pro launches. */}
        <div className="px-5">
          <div
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-2"
            style={{ background: 'rgba(237,116,47,0.10)', border: '1px solid rgba(237,116,47,0.22)' }}>
            <Crown size={14} color="rgba(237,116,47,0.70)" />
            <span className="text-sm font-black tracking-widest" style={{ color: 'rgba(237,116,47,0.70)' }}>
              {isJa ? '準備中' : 'COMING SOON'}
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}
