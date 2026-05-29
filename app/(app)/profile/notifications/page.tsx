'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

type NotifItem = {
  label: string
  desc: string
}

const NOTIF_ITEMS: NotifItem[] = [
  { label: 'Workout Reminders', desc: 'Daily reminder to log your workout' },
  { label: 'Weekly Summary',    desc: 'Your training stats every Monday' },
  { label: 'PR Alerts',         desc: 'When you set a new personal record' },
  { label: 'Product Updates',   desc: 'New features and improvements' },
]

export default function NotificationsPage() {
  const card = {
    background: '#151515',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    overflow: 'hidden',
  } as const

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-6">
        <Link href="/profile" className="p-1 -ml-1 active:opacity-70">
          <ChevronLeft size={22} style={{ color: '#555' }} />
        </Link>
        <h1 className="text-base font-black tracking-widest text-white">NOTIFICATIONS</h1>
      </div>

      {/* Push Notifications */}
      <div className="mx-4 mb-4">
        <p className="text-[10px] font-black tracking-widest mb-2 px-1" style={{ color: '#444' }}>
          PUSH NOTIFICATIONS
        </p>
        <div style={card}>
          {NOTIF_ITEMS.map(({ label, desc }, i) => (
            <div key={label}
              className="flex items-center gap-3 px-4 py-4"
              style={{ borderBottom: i < NOTIF_ITEMS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{label}</p>
                <p className="text-[10px] mt-0.5 truncate" style={{ color: '#444' }}>{desc}</p>
              </div>
              {/* Toggle — disabled / coming soon */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-full"
                  style={{ background: '#1a1a1a', color: '#2e2e2e', border: '1px solid #1e1e1e' }}>
                  SOON
                </span>
                <div className="w-11 h-6 rounded-full relative"
                  style={{ background: '#1a1a1a', border: '1px solid #222' }}>
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full" style={{ background: '#252525' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* In-App Notifications */}
      <div className="mx-4 mb-6">
        <p className="text-[10px] font-black tracking-widest mb-2 px-1" style={{ color: '#444' }}>
          IN-APP
        </p>
        <div style={card}>
          <div className="flex items-center gap-3 px-4 py-4">
            <div className="flex-1">
              <p className="text-sm font-bold text-white">Workout Streak</p>
              <p className="text-[10px] mt-0.5" style={{ color: '#444' }}>Notify when your streak is at risk</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-full"
                style={{ background: '#1a1a1a', color: '#2e2e2e', border: '1px solid #1e1e1e' }}>
                SOON
              </span>
              <div className="w-11 h-6 rounded-full relative"
                style={{ background: '#1a1a1a', border: '1px solid #222' }}>
                <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full" style={{ background: '#252525' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-center px-8" style={{ color: '#2a2a2a' }}>
        Push notification support is coming in a future update.
      </p>

    </div>
  )
}
