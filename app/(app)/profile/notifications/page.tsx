'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

/* ── shared tokens ─────────────────────────────────── */
const T = {
  main:      '#f5f5f5',
  secondary: 'rgba(255,255,255,0.58)',
  muted:     'rgba(255,255,255,0.42)',
  label:     'rgba(255,255,255,0.52)',
  card:      { background: '#161616', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 20, overflow: 'hidden' } as const,
  divider:   '1px solid rgba(255,255,255,0.07)',
  soon: {
    background: 'rgba(255,255,255,0.07)',
    color:      'rgba(255,255,255,0.58)',
    border:     '1px solid rgba(255,255,255,0.10)',
  },
}

type NotifItem = { label: string; desc: string }

const PUSH_ITEMS: NotifItem[] = [
  { label: 'Workout Reminders', desc: 'Push notification support coming soon' },
  { label: 'Weekly Summary',    desc: 'Your training stats every Monday' },
  { label: 'PR Alerts',         desc: 'When you set a new personal record' },
  { label: 'Product Updates',   desc: 'New features and improvements' },
]

const Toggle = () => (
  <div className="w-11 h-6 rounded-full relative shrink-0"
    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
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
  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-6">
        <Link href="/profile" className="p-1 -ml-1 active:opacity-70">
          <ChevronLeft size={22} style={{ color: 'rgba(255,255,255,0.55)' }} />
        </Link>
        <h1 className="text-base font-black tracking-widest" style={{ color: T.main }}>NOTIFICATIONS</h1>
      </div>

      {/* Preview banner */}
      <div className="mx-4 mb-4 px-4 py-3 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-xs font-bold" style={{ color: T.muted }}>
          Notifications are shown as a preview. Push support is coming in a future update.
        </p>
      </div>

      {/* Push Notifications */}
      <div className="mx-4 mb-4">
        <p className="text-[10px] font-black tracking-widest mb-2 px-1" style={{ color: T.label }}>
          PUSH NOTIFICATIONS
        </p>
        <div style={T.card}>
          {PUSH_ITEMS.map(({ label, desc }, i) => (
            <div key={label}
              className="flex items-center gap-3 px-4 py-4"
              style={{ borderBottom: i < PUSH_ITEMS.length - 1 ? T.divider : 'none' }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: T.main }}>{label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: T.secondary }}>{desc}</p>
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
              <p className="text-[10px] mt-0.5" style={{ color: T.secondary }}>Notify when your streak is at risk</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <SoonBadge />
              <Toggle />
            </div>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-center px-8 pb-4" style={{ color: T.muted }}>
        These options are shown as a preview only.{'\n'}Actual push notifications will be available in a future update.
      </p>

    </div>
  )
}
