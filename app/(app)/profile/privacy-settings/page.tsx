'use client'

import Link from 'next/link'
import { ChevronLeft, Lock, Globe, Users, Check } from 'lucide-react'
import { useLocale } from '@/lib/useLocale'
import { t } from '@/lib/i18n'

/* ── shared tokens ─────────────────────────────────── */
const T = {
  main:      '#f5f5f5',
  secondary: 'rgba(255,255,255,0.58)',
  muted:     'rgba(255,255,255,0.42)',
  dim:       'rgba(255,255,255,0.34)',
  label:     'rgba(255,255,255,0.52)',
  card:      { background: '#1D1D1D', border: '1px solid rgba(255,255,255,0.17)', borderRadius: 20, overflow: 'hidden' } as const,
  divider:   '1px solid rgba(255,255,255,0.07)',
  soon: {
    background: 'rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.58)',
    border:     '1px solid rgba(255,255,255,0.17)',
  },
  toggle: {
    track: { background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.17)' } as const,
    knob:  { background: 'rgba(255,255,255,0.22)' } as const,
  },
}

const SectionLabel = ({ text }: { text: string }) => (
  <p className="text-[10px] font-black tracking-widest mb-2 px-1" style={{ color: T.label }}>{text}</p>
)

const SoonBadge = () => (
  <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-full"
    style={T.soon}>
    SOON
  </span>
)

const Toggle = () => (
  <div className="w-11 h-6 rounded-full relative shrink-0" style={T.toggle.track}>
    <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full" style={T.toggle.knob} />
  </div>
)

export default function PrivacySettingsPage() {
  const { locale } = useLocale()

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-6">
        <Link href="/profile/settings" className="p-1 -ml-1 active:opacity-70">
          <ChevronLeft size={22} style={{ color: 'rgba(255,255,255,0.72)' }} />
        </Link>
        <h1 className="text-base font-black tracking-widest" style={{ color: T.main }}>PRIVACY</h1>
      </div>

      {/* Profile Visibility */}
      <div className="mx-4 mb-4">
        <SectionLabel text="PROFILE VISIBILITY" />
        <div style={T.card}>

          {/* Private — selected */}
          <div className="flex items-center gap-3 px-4 py-4"
            style={{ borderBottom: T.divider, background: 'rgba(237, 116, 47,0.05)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(237, 116, 47,0.15)', border: '1px solid rgba(237, 116, 47,0.42)' }}>
              <Lock size={14} style={{ color: '#ED742F' }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black" style={{ color: T.main }}>{t(locale, 'privacy.privateOption')}</p>
              <p className="text-[10px] mt-0.5" style={{ color: T.secondary }}>{t(locale, 'privacy.privateSub')}</p>
            </div>
            <Check size={16} style={{ color: '#ED742F' }} />
          </div>

          {/* Followers Only — coming soon */}
          <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: T.divider }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: '#222222', border: '1px solid rgba(255,255,255,0.15)' }}>
              <Users size={14} style={{ color: 'rgba(255,255,255,0.68)' }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-black" style={{ color: 'rgba(255,255,255,0.52)' }}>{t(locale, 'privacy.followersOption')}</p>
                <SoonBadge />
              </div>
              <p className="text-[10px] mt-0.5" style={{ color: T.dim }}>
                {t(locale, 'privacy.followersSub')}
              </p>
            </div>
          </div>

          {/* Public — coming soon */}
          <div className="flex items-center gap-3 px-4 py-4">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: '#222222', border: '1px solid rgba(255,255,255,0.15)' }}>
              <Globe size={14} style={{ color: 'rgba(255,255,255,0.68)' }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-black" style={{ color: 'rgba(255,255,255,0.52)' }}>{t(locale, 'privacy.publicOption')}</p>
                <SoonBadge />
              </div>
              <p className="text-[10px] mt-0.5" style={{ color: T.dim }}>
                {t(locale, 'privacy.publicSub')}
              </p>
            </div>
          </div>
        </div>
        <p className="text-[10px] px-1 mt-2" style={{ color: T.muted }}>
          {t(locale, 'privacy.visibilityNote')}
        </p>
      </div>

      {/* Data & Permissions */}
      <div className="mx-4 mb-4">
        <SectionLabel text="DATA & PERMISSIONS" />
        <div style={T.card}>
          <div className="flex items-center justify-between gap-3 px-4 py-4" style={{ borderBottom: T.divider }}>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: T.main }}>Analytics</p>
              <p className="text-[10px] mt-0.5" style={{ color: T.secondary }}>{t(locale, 'privacy.analyticsSub')}</p>
            </div>
            <Toggle />
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-4">
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: T.main }}>Crash Reports</p>
              <p className="text-[10px] mt-0.5" style={{ color: T.secondary }}>{t(locale, 'privacy.crashSub')}</p>
            </div>
            <Toggle />
          </div>
        </div>
        <p className="text-[10px] px-1 mt-2" style={{ color: T.muted }}>
          {t(locale, 'privacy.dataNote')}
        </p>
      </div>

    </div>
  )
}
