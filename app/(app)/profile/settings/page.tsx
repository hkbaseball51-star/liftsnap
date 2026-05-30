'use client'

import { useEffect, useState } from 'react'
import { logout } from '@/actions/auth'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight,
  User, Shield, Bell,
  Ruler, Palette, Globe,
  Crown, CreditCard,
  HelpCircle, FileText, UserX,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from '@/lib/useLocale'
import { t } from '@/lib/i18n'

/* ── shared tokens ─────────────────────────────────── */
const T = {
  main:     '#f5f5f5',
  secondary:'rgba(255,255,255,0.58)',
  muted:    'rgba(255,255,255,0.42)',
  dim:      'rgba(255,255,255,0.34)',
  label:    'rgba(255,255,255,0.52)',
  chevron:  'rgba(255,255,255,0.28)',
  card:     { background: '#161616', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 20, overflow: 'hidden' } as const,
  divider:  '1px solid rgba(255,255,255,0.07)',
  iconWrap: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' } as const,
  soon:     { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.58)', border: '1px solid rgba(255,255,255,0.10)' } as const,
}

type LiveRow = {
  label:   string
  sub?:    string
  icon:    React.ComponentType<{ size: number; style: React.CSSProperties }>
  href:    string
  danger?: boolean
}

type SoonRow = {
  label: string
  sub:   string
  icon:  React.ComponentType<{ size: number; style: React.CSSProperties }>
}

const SectionLabel = ({ text }: { text: string }) => (
  <p className="text-[10px] font-black tracking-widest mb-2 px-1" style={{ color: T.label }}>{text}</p>
)

function LiveRowEl({ row, last }: { row: LiveRow; last: boolean }) {
  const Icon = row.icon
  return (
    <Link href={row.href}
      className="flex items-center gap-3 px-4 py-3.5 active:opacity-70 transition-opacity"
      style={{ borderBottom: last ? 'none' : T.divider, display: 'flex' }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={row.danger
          ? { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.14)' }
          : T.iconWrap}>
        <Icon size={14} style={{ color: row.danger ? '#f87171' : T.secondary }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: row.danger ? '#f87171' : T.main }}>{row.label}</p>
        {row.sub && <p className="text-[10px] mt-0.5" style={{ color: T.secondary }}>{row.sub}</p>}
      </div>
      <ChevronRight size={13} style={{ color: row.danger ? 'rgba(248,113,113,0.4)' : T.chevron }} />
    </Link>
  )
}

function SoonRowEl({ row, last }: { row: SoonRow; last: boolean }) {
  const Icon = row.icon
  return (
    <div className="flex items-center gap-3 px-4 py-3.5"
      style={{ borderBottom: last ? 'none' : T.divider }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={T.iconWrap}>
        <Icon size={14} style={{ color: T.dim }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.45)' }}>{row.label}</p>
        <p className="text-[10px] mt-0.5" style={{ color: T.dim }}>{row.sub}</p>
      </div>
      <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-full shrink-0" style={T.soon}>
        SOON
      </span>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────── */
export default function SettingsPage() {
  const { locale } = useLocale()
  const [isPro, setIsPro] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('plan').eq('id', user.id).single()
        .then(({ data }) => { if (data?.plan === 'pro') setIsPro(true) })
    })
  }, [])

  const ACCOUNT_ROWS: LiveRow[] = [
    { label: 'Edit Profile',  sub: t(locale, 'settings.accountEditSub'), icon: User,   href: '/profile/edit' },
    { label: 'Privacy',       sub: t(locale, 'settings.privacySub'),     icon: Shield, href: '/profile/privacy' },
    { label: 'Notifications', sub: t(locale, 'settings.notificationsSub'), icon: Bell, href: '/profile/notifications' },
  ]

  const APP_LIVE_ROWS: LiveRow[] = [
    { label: 'Language', sub: t(locale, 'settings.languageSub'), icon: Globe, href: '/profile/language' },
  ]

  const APP_ROWS: SoonRow[] = [
    { label: 'Units', sub: t(locale, 'settings.unitsSub'), icon: Ruler },
    { label: 'Theme', sub: t(locale, 'settings.themeSub'), icon: Palette },
  ]

  const SUPPORT_ROWS: LiveRow[] = [
    { label: 'Help & Support',   sub: t(locale, 'settings.helpSub'),          icon: HelpCircle, href: '/profile/support' },
    { label: 'Terms of Service', sub: t(locale, 'settings.termsSub'),         icon: FileText,   href: '/profile/support' },
    { label: 'Privacy Policy',   sub: t(locale, 'settings.privacyPolicySub'), icon: Shield,     href: '/profile/support' },
    { label: 'Delete Account',   sub: t(locale, 'settings.deleteAccountSub'), icon: UserX,      href: '/profile/support', danger: true },
  ]

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-6">
        <Link href="/profile" className="p-1 -ml-1 active:opacity-70">
          <ChevronLeft size={22} style={{ color: 'rgba(255,255,255,0.55)' }} />
        </Link>
        <h1 className="text-base font-black tracking-widest" style={{ color: T.main }}>SETTINGS</h1>
      </div>

      {/* ACCOUNT */}
      <div className="mx-4 mb-4">
        <SectionLabel text="ACCOUNT" />
        <div style={T.card}>
          {ACCOUNT_ROWS.map((row, i) => (
            <LiveRowEl key={row.label} row={row} last={i === ACCOUNT_ROWS.length - 1} />
          ))}
        </div>
      </div>

      {/* APP */}
      <div className="mx-4 mb-4">
        <SectionLabel text="APP" />
        <div style={T.card}>
          {APP_LIVE_ROWS.map((row, i) => (
            <LiveRowEl key={row.label} row={row} last={APP_ROWS.length === 0 && i === APP_LIVE_ROWS.length - 1} />
          ))}
          {APP_ROWS.map((row, i) => (
            <SoonRowEl key={row.label} row={row} last={i === APP_ROWS.length - 1} />
          ))}
        </div>
      </div>

      {/* PLAN */}
      <div className="mx-4 mb-4">
        <SectionLabel text="PLAN" />
        {isPro ? (
          <div style={T.card}>
            {/* Pro active status */}
            <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: T.divider }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255,107,0,0.10)', border: '1px solid rgba(255,107,0,0.20)' }}>
                <Crown size={14} style={{ color: '#ff6b00' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: T.main }}>Pro</p>
                <p className="text-[10px] mt-0.5" style={{ color: T.secondary }}>{t(locale, 'settings.proActive')}</p>
              </div>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,107,0,0.10)', color: '#ff6b00', border: '1px solid rgba(255,107,0,0.20)' }}>
                ACTIVE
              </span>
            </div>
            <SoonRowEl row={{ label: t(locale, 'settings.manageSubscription'), sub: t(locale, 'settings.manageSubscriptionSub'), icon: CreditCard }} last={true} />
          </div>
        ) : (
          <>
            {/* Upgrade card */}
            <div className="rounded-2xl p-4 mb-2"
              style={{ background: '#161616', border: '1px solid rgba(255,107,0,0.20)' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-sm font-black" style={{ color: T.main }}>{t(locale, 'settings.upgradeTitle')}</p>
                  <p className="text-xs mt-0.5" style={{ color: T.secondary }}>
                    {t(locale, 'settings.upgradeSub')}
                  </p>
                </div>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 mt-0.5"
                  style={{ background: 'rgba(255,107,0,0.10)', color: '#ff6b00', border: '1px solid rgba(255,107,0,0.20)' }}>
                  PRO
                </span>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-2.5 rounded-xl text-xs font-black"
                  style={{ background: 'rgba(255,255,255,0.06)', color: T.secondary, border: '1px solid rgba(255,255,255,0.09)' }}>
                  ¥480 / mo
                </button>
                <button className="flex-1 py-2.5 rounded-xl text-xs font-black text-white"
                  style={{ background: '#ff6b00' }}>
                  ¥2,980 / yr ★
                </button>
              </div>
            </div>
            {/* Manage Subscription */}
            <div style={T.card}>
              <SoonRowEl row={{ label: t(locale, 'settings.manageSubscription'), sub: t(locale, 'settings.manageSubscriptionSub'), icon: CreditCard }} last={true} />
            </div>
          </>
        )}
      </div>

      {/* SUPPORT */}
      <div className="mx-4 mb-4">
        <SectionLabel text="SUPPORT" />
        <div style={T.card}>
          {SUPPORT_ROWS.map((row, i) => (
            <LiveRowEl key={row.label} row={row} last={i === SUPPORT_ROWS.length - 1} />
          ))}
        </div>
      </div>

      {/* SESSION */}
      <div className="mx-4 mb-10">
        <SectionLabel text="SESSION" />
        <div style={T.card}>
          <form action={logout}>
            <button type="submit"
              className="w-full flex items-center gap-3 px-4 py-3.5 active:opacity-70 transition-opacity text-left">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.12)' }}>
                <LogOut size={14} style={{ color: '#f87171' }} />
              </div>
              <span className="flex-1 text-sm font-bold" style={{ color: '#f87171' }}>Sign Out</span>
            </button>
          </form>
        </div>
      </div>

    </div>
  )
}
