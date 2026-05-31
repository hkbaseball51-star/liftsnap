'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useLocale } from '@/lib/useLocale'
import { t } from '@/lib/i18n'

/* ── shared tokens ─────────────────────────────────── */
const T = {
  main:      '#f5f5f5',
  secondary: 'rgba(255,255,255,0.58)',
  muted:     'rgba(255,255,255,0.42)',
  label:     'rgba(255,255,255,0.52)',
  card:      { background: '#1D1D1D', border: '1px solid rgba(255,255,255,0.17)', borderRadius: 20, overflow: 'hidden' } as const,
  divider:   '1px solid rgba(255,255,255,0.07)',
  soon: {
    background: 'rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.58)',
    border:     '1px solid rgba(255,255,255,0.17)',
  },
}

type NotifItem = { label: string; descKey: string }

const PUSH_ITEMS: NotifItem[] = [
  { label: 'Workout Reminders', descKey: 'notifications.workoutRemindersSub' },
  { label: 'Weekly Summary',    descKey: 'notifications.weeklySummarySub' },
  { label: 'PR Alerts',         descKey: 'notifications.prAlertsSub' },
  { label: 'Product Updates',   descKey: 'notifications.productUpdatesSub' },
]

const Toggle = () => (
  <div className="w-11 h-6 rounded-full relative shrink-0"
    style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.17)' }}>
    <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full"
      style={{ background: 'rgba(255,255,255,0.22)' }} />
  </div>
)

const SoonBadge = () => (
  <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-full"
    style={T.soon}>
    SOON
  </span>
)

export default function NotificationsPage() {
  const { locale } = useLocale()

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-6">
        <Link href="/profile" className="p-1 -ml-1 active:opacity-70">
          <ChevronLeft size={22} style={{ color: 'rgba(255,255,255,0.72)' }} />
        </Link>
        <h1 className="text-base font-black tracking-widest" style={{ color: T.main }}>NOTIFICATIONS</h1>
      </div>

      {/* Preview banner */}
      <div className="mx-4 mb-4 px-4 py-3 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.15)' }}>
        <p className="text-xs font-bold" style={{ color: T.muted }}>
          {t(locale, 'notifications.previewBanner')}
        </p>
      </div>

      {/* Push Notifications */}
      <div className="mx-4 mb-4">
        <p className="text-[10px] font-black tracking-widest mb-2 px-1" style={{ color: T.label }}>
          PUSH NOTIFICATIONS
        </p>
        <div style={T.card}>
          {PUSH_ITEMS.map(({ label, descKey }, i) => (
            <div key={label}
              className="flex items-center gap-3 px-4 py-4"
              style={{ borderBottom: i < PUSH_ITEMS.length - 1 ? T.divider : 'none' }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: T.main }}>{label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: T.secondary }}>{t(locale, descKey)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <SoonBadge />
                <Toggle />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* In-App */}
      <div className="mx-4 mb-6">
        <p className="text-[10px] font-black tracking-widest mb-2 px-1" style={{ color: T.label }}>
          IN-APP
        </p>
        <div style={T.card}>
          <div className="flex items-center gap-3 px-4 py-4">
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: T.main }}>Workout Streak</p>
              <p className="text-[10px] mt-0.5" style={{ color: T.secondary }}>{t(locale, 'notifications.workoutStreakSub')}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <SoonBadge />
              <Toggle />
            </div>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-center px-8 pb-4" style={{ color: T.muted }}>
        {t(locale, 'notifications.footerNote')}{'\n'}{t(locale, 'notifications.footerNote2')}
      </p>

    </div>
  )
}
