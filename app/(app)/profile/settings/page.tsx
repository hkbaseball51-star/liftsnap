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
  LogOut, Database,
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

function SoonRowEl({ row, last, soonLabel }: { row: SoonRow; last: boolean; soonLabel: string }) {
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
        {soonLabel}
      </span>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────── */
export default function SettingsPage() {
  const { locale } = useLocale()
  const [isPro, setIsPro]               = useState(false)
  const [email, setEmail]               = useState<string | null>(null)
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const [signingOut, setSigningOut]     = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? null)
      supabase.from('profiles').select('plan').eq('id', user.id).single()
        .then(({ data }) => { if (data?.plan === 'pro') setIsPro(true) })
    })
  }, [])

  async function handleSignOut() {
    setSigningOut(true)
    await logout()
  }

  const ACCOUNT_ROWS: LiveRow[] = [
    { label: t(locale, 'settings.editProfile'),   sub: t(locale, 'settings.accountEditSub'),   icon: User,   href: '/profile/edit' },
    { label: t(locale, 'settings.privacy'),       sub: t(locale, 'settings.privacySub'),       icon: Shield, href: '/profile/privacy' },
    { label: t(locale, 'settings.notifications'), sub: t(locale, 'settings.notificationsSub'), icon: Bell,   href: '/profile/notifications' },
  ]

  const APP_LIVE_ROWS: LiveRow[] = [
    { label: t(locale, 'settings.language'), sub: t(locale, 'settings.languageSub'), icon: Globe, href: '/profile/language' },
    { label: t(locale, 'settings.units'),    sub: t(locale, 'settings.unitsSub'),    icon: Ruler, href: '/profile/units'    },
  ]

  const APP_ROWS: SoonRow[] = [
    { label: t(locale, 'settings.theme'), sub: t(locale, 'settings.themeSub'), icon: Palette },
  ]

  const SUPPORT_ROWS: LiveRow[] = [
    { label: t(locale, 'settings.helpSupport'),    sub: t(locale, 'settings.helpSub'),          icon: HelpCircle, href: '/profile/support' },
    { label: t(locale, 'settings.termsOfService'), sub: t(locale, 'settings.termsSub'),         icon: FileText,   href: '/profile/support' },
    { label: t(locale, 'settings.privacyPolicy'),  sub: t(locale, 'settings.privacyPolicySub'), icon: Shield,     href: '/profile/support' },
    { label: t(locale, 'settings.deleteAccount'),  sub: t(locale, 'settings.deleteAccountSub'), icon: UserX,      href: '/profile/support', danger: true },
  ]

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-6">
        <Link href="/profile" className="p-1 -ml-1 active:opacity-70">
          <ChevronLeft size={22} style={{ color: 'rgba(255,255,255,0.55)' }} />
        </Link>
        <h1 className="text-base font-black tracking-widest" style={{ color: T.main }}>{t(locale, 'settings.settingsTitle')}</h1>
      </div>

      {/* ACCOUNT */}
      <div className="mx-4 mb-4">
        <SectionLabel text={t(locale, 'settings.sectionAccount')} />
        <div style={T.card}>
          {ACCOUNT_ROWS.map((row, i) => (
            <LiveRowEl key={row.label} row={row} last={i === ACCOUNT_ROWS.length - 1} />
          ))}
        </div>
      </div>

      {/* APP */}
      <div className="mx-4 mb-4">
        <SectionLabel text={t(locale, 'settings.sectionApp')} />
        <div style={T.card}>
          {APP_LIVE_ROWS.map((row, i) => (
            <LiveRowEl key={row.label} row={row} last={APP_ROWS.length === 0 && i === APP_LIVE_ROWS.length - 1} />
          ))}
          {APP_ROWS.map((row, i) => (
            <SoonRowEl key={row.label} row={row} last={i === APP_ROWS.length - 1} soonLabel={t(locale, 'settings.soonBadge')} />
          ))}
        </div>
      </div>

      {/* PLAN */}
      <div className="mx-4 mb-4">
        <SectionLabel text={t(locale, 'settings.sectionPlan')} />
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
            <SoonRowEl row={{ label: t(locale, 'settings.manageSubscription'), sub: t(locale, 'settings.manageSubscriptionSub'), icon: CreditCard }} last={true} soonLabel={t(locale, 'settings.soonBadge')} />
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
              <SoonRowEl row={{ label: t(locale, 'settings.manageSubscription'), sub: t(locale, 'settings.manageSubscriptionSub'), icon: CreditCard }} last={true} soonLabel={t(locale, 'settings.soonBadge')} />
            </div>
          </>
        )}
      </div>

      {/* SUPPORT */}
      <div className="mx-4 mb-4">
        <SectionLabel text={t(locale, 'settings.sectionSupport')} />
        <div style={T.card}>
          {SUPPORT_ROWS.map((row, i) => (
            <LiveRowEl key={row.label} row={row} last={i === SUPPORT_ROWS.length - 1} />
          ))}
        </div>
      </div>

      {/* SESSION */}
      <div className="mx-4 mb-4">
        <SectionLabel text={t(locale, 'settings.sectionSession')} />
        <div style={T.card}>
          {/* Signed in as */}
          {email && (
            <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: T.divider }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={T.iconWrap}>
                <User size={14} style={{ color: T.secondary }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black tracking-widest" style={{ color: T.label }}>
                  {t(locale, 'settings.signedInAs').toUpperCase()}
                </p>
                <p className="text-sm font-bold truncate mt-0.5" style={{ color: T.main }}>{email}</p>
              </div>
            </div>
          )}
          {/* Sign out */}
          <button
            className="w-full flex items-center gap-3 px-4 py-3.5 active:opacity-70 transition-opacity text-left"
            onClick={() => setShowSignOutModal(true)}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.12)' }}>
              <LogOut size={14} style={{ color: '#f87171' }} />
            </div>
            <span className="flex-1 text-sm font-bold" style={{ color: '#f87171' }}>{t(locale, 'settings.signOut')}</span>
          </button>
        </div>
      </div>

      {/* Your data note */}
      <div className="mx-4 mb-10">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Database size={12} style={{ color: 'rgba(255,255,255,0.38)', flexShrink: 0 }} />
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.38)' }}>
            {t(locale, 'settings.yourDataSaved')}
          </p>
        </div>
      </div>

      {/* Sign Out Confirmation Modal */}
      {showSignOutModal && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: 'rgba(0,0,0,0.82)' }}
          onClick={() => !signingOut && setShowSignOutModal(false)}>
          <div
            className="w-full p-5 rounded-t-3xl pb-10"
            style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex justify-center mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.16)' }}>
                <LogOut size={18} style={{ color: '#f87171' }} />
              </div>
            </div>

            <p className="text-base font-black text-center mb-2" style={{ color: T.main }}>
              {t(locale, 'settings.signOutConfirmTitle')}
            </p>
            <p className="text-sm text-center mb-6 leading-relaxed" style={{ color: T.secondary }}>
              {t(locale, 'settings.signOutConfirmBody')}
            </p>

            <div className="flex gap-3">
              <button
                className="flex-1 py-4 rounded-2xl text-sm font-black"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.62)' }}
                disabled={signingOut}
                onClick={() => setShowSignOutModal(false)}>
                {t(locale, 'settings.signOutConfirmCancel')}
              </button>
              <button
                className="flex-1 py-4 rounded-2xl text-sm font-black"
                style={{
                  background: signingOut ? 'rgba(239,68,68,0.3)' : '#dc2626',
                  color: '#fff',
                }}
                disabled={signingOut}
                onClick={handleSignOut}>
                {signingOut ? '...' : t(locale, 'settings.signOutConfirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
