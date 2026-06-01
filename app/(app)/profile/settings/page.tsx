'use client'

import { useEffect, useState } from 'react'
import { logout } from '@/actions/auth'
import { deleteAccount } from '@/actions/profile'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight,
  User, Shield, Bell,
  Ruler, Palette, Globe,
  Crown, CreditCard,
  HelpCircle, FileText, UserX,
  LogOut, Database, LogIn, UserPlus,
  AlertTriangle, Check,
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
  card:     { background: '#1D1D1D', border: '1px solid rgba(255,255,255,0.17)', borderRadius: 20, overflow: 'hidden' } as const,
  divider:  '1px solid rgba(255,255,255,0.07)',
  iconWrap: { background: 'rgba(255,255,255,0.11)', border: '1px solid rgba(255,255,255,0.15)' } as const,
  soon:     { background: 'rgba(255,255,255,0.40)', color: 'rgba(255,255,255,0.58)', border: '1px solid rgba(255,255,255,0.17)' } as const,
}

type LiveRow = {
  label:    string
  sub?:     string
  icon:     React.ComponentType<{ size: number; style: React.CSSProperties }>
  href?:    string
  onClick?: () => void
  danger?:  boolean
  accent?:  boolean
}

type SoonRow = {
  label: string
  sub:   string
  icon:  React.ComponentType<{ size: number; style: React.CSSProperties }>
}

type DeleteStep = 'closed' | 'confirm' | 'type'

const SectionLabel = ({ text }: { text: string }) => (
  <p className="text-[10px] font-black tracking-widest mb-2 px-1" style={{ color: T.label }}>{text}</p>
)

function LiveRowEl({ row, last }: { row: LiveRow; last: boolean }) {
  const Icon = row.icon
  const iconStyle = row.danger
    ? { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.14)' }
    : row.accent
    ? { background: 'rgba(237,116,47,0.12)', border: '1px solid rgba(237,116,47,0.35)' }
    : T.iconWrap
  const iconColor    = row.danger ? '#f87171' : row.accent ? '#ED742F' : T.secondary
  const labelColor   = row.danger ? '#f87171' : row.accent ? '#ED742F' : T.main
  const chevronColor = row.danger ? 'rgba(248,113,113,0.4)' : row.accent ? 'rgba(237,116,47,0.4)' : T.chevron

  const cls   = 'flex items-center gap-3 px-4 py-3.5 active:opacity-70 transition-opacity'
  const style = { borderBottom: last ? 'none' : T.divider }
  const inner = (
    <>
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={iconStyle}>
        <Icon size={14} style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: labelColor }}>{row.label}</p>
        {row.sub && <p className="text-[10px] mt-0.5" style={{ color: T.secondary }}>{row.sub}</p>}
      </div>
      <ChevronRight size={13} style={{ color: chevronColor }} />
    </>
  )

  if (row.onClick) {
    return (
      <button onClick={row.onClick} className={cls + ' w-full text-left'} style={style}>
        {inner}
      </button>
    )
  }
  return (
    <Link href={row.href!} className={cls} style={style}>
      {inner}
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
        <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.65)' }}>{row.label}</p>
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
  const [authReady,        setAuthReady]        = useState(false)
  const [isPro,            setIsPro]            = useState(false)
  const [email,            setEmail]            = useState<string | null>(null)
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const [signingOut,       setSigningOut]       = useState(false)
  const [deleteStep,       setDeleteStep]       = useState<DeleteStep>('closed')
  const [deleteInput,      setDeleteInput]      = useState('')
  const [deleting,         setDeleting]         = useState(false)

  // authReady=true means getUser() has returned (user may or may not be logged in)
  const isLoggedIn = authReady && !!email

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      // Anonymous users (auto-signed in) have no email — treat as guest
      if (user?.email) {
        setEmail(user.email)
        supabase.from('profiles').select('plan').eq('id', user.id).single()
          .then(({ data }) => { if (data?.plan === 'pro') setIsPro(true) })
      }
      setAuthReady(true)
    })
  }, [])

  async function handleSignOut() {
    setSigningOut(true)
    await logout()
  }

  async function handleDelete() {
    if (deleteInput !== 'DELETE') return
    setDeleting(true)
    try {
      await deleteAccount()
    } catch {
      setDeleting(false)
      setDeleteStep('closed')
      setDeleteInput('')
    }
  }

  function closeDeleteModal() {
    if (deleting) return
    setDeleteStep('closed')
    setDeleteInput('')
  }

  /* ── Row definitions ── */

  const ACCOUNT_ROWS: LiveRow[] = [
    { label: t(locale, 'settings.editProfile'),   sub: t(locale, 'settings.accountEditSub'),   icon: User,   href: '/profile/edit' },
    { label: t(locale, 'settings.privacy'),       sub: t(locale, 'settings.privacySub'),       icon: Shield, href: '/profile/privacy-settings' },
    { label: t(locale, 'settings.notifications'), sub: t(locale, 'settings.notificationsSub'), icon: Bell,   href: '/profile/notifications' },
  ]

  // Shown in ACCOUNT section when user is NOT logged in
  const GUEST_ROWS: LiveRow[] = [
    {
      label:  t(locale, 'settings.guestSignIn'),
      sub:    t(locale, 'settings.guestSignInSub'),
      icon:   LogIn,
      href:   '/login',
      accent: true,
    },
    {
      label: t(locale, 'settings.guestCreateAccount'),
      sub:   t(locale, 'settings.guestCreateAccountSub'),
      icon:  UserPlus,
      href:  '/signup',
    },
  ]

  const APP_LIVE_ROWS: LiveRow[] = [
    { label: t(locale, 'settings.language'), sub: t(locale, 'settings.languageSub'), icon: Globe, href: '/profile/language' },
    { label: t(locale, 'settings.units'),    sub: t(locale, 'settings.unitsSub'),    icon: Ruler, href: '/profile/units'    },
  ]

  const APP_ROWS: SoonRow[] = [
    { label: t(locale, 'settings.theme'), sub: t(locale, 'settings.themeSub'), icon: Palette },
  ]

  const SUPPORT_ROWS: LiveRow[] = [
    { label: t(locale, 'settings.helpSupport'), sub: t(locale, 'settings.helpSub'), icon: HelpCircle, href: '/profile/support' },
  ]

  const LEGAL_ROWS: LiveRow[] = [
    { label: t(locale, 'settings.termsOfService'), sub: t(locale, 'settings.termsSub'),         icon: FileText, href: '/profile/terms'   },
    { label: t(locale, 'settings.privacyPolicy'),  sub: t(locale, 'settings.privacyPolicySub'), icon: Shield,   href: '/profile/privacy' },
  ]

  const deleteDataItems = [
    t(locale, 'support.deleteDataWorkouts'),
    t(locale, 'support.deleteDataBodyWeight'),
    t(locale, 'support.deleteDataPhotos'),
    t(locale, 'support.deleteDataBadges'),
    t(locale, 'support.deleteDataCustomEx'),
    t(locale, 'support.deleteDataProfile'),
  ]

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-6">
        <Link href="/profile" className="p-1 -ml-1 active:opacity-70">
          <ChevronLeft size={22} style={{ color: 'rgba(255,255,255,0.72)' }} />
        </Link>
        <h1 className="text-base font-black tracking-widest" style={{ color: T.main }}>{t(locale, 'settings.settingsTitle')}</h1>
      </div>

      {/* ── ACCOUNT ── */}
      {/* Shows sign-in/create-account for guests; edit-profile etc. for logged-in users */}
      {authReady && (
        <div className="mx-4 mb-4">
          <SectionLabel text={t(locale, 'settings.sectionAccount')} />
          <div style={T.card}>
            {(isLoggedIn ? ACCOUNT_ROWS : GUEST_ROWS).map((row, i, arr) => (
              <LiveRowEl key={row.label} row={row} last={i === arr.length - 1} />
            ))}
          </div>
        </div>
      )}

      {/* ── APP ── */}
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

      {/* ── PLAN — logged-in only ── */}
      {isLoggedIn && (
        <div className="mx-4 mb-4">
          <SectionLabel text={t(locale, 'settings.sectionPlan')} />
          {isPro ? (
            <div style={T.card}>
              <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: T.divider }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(237, 116, 47,0.14)', border: '1px solid rgba(237, 116, 47,0.35)' }}>
                  <Crown size={14} style={{ color: '#ED742F' }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: T.main }}>Pro</p>
                  <p className="text-[10px] mt-0.5" style={{ color: T.secondary }}>{t(locale, 'settings.proActive')}</p>
                </div>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(237, 116, 47,0.14)', color: '#ED742F', border: '1px solid rgba(237, 116, 47,0.35)' }}>
                  ACTIVE
                </span>
              </div>
              <SoonRowEl row={{ label: t(locale, 'settings.manageSubscription'), sub: t(locale, 'settings.manageSubscriptionSub'), icon: CreditCard }} last={true} soonLabel={t(locale, 'settings.soonBadge')} />
            </div>
          ) : (
            <>
              <div className="rounded-2xl p-4 mb-2"
                style={{ background: '#1D1D1D', border: '1px solid rgba(237, 116, 47,0.35)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-sm font-black" style={{ color: T.main }}>{t(locale, 'settings.upgradeTitle')}</p>
                    <p className="text-xs mt-0.5" style={{ color: T.secondary }}>{t(locale, 'settings.upgradeSub')}</p>
                  </div>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 mt-0.5"
                    style={{ background: 'rgba(237, 116, 47,0.14)', color: '#ED742F', border: '1px solid rgba(237, 116, 47,0.35)' }}>
                    PRO
                  </span>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 py-2.5 rounded-xl text-xs font-black"
                    style={{ background: 'rgba(255,255,255,0.11)', color: T.secondary, border: '1px solid rgba(255,255,255,0.40)' }}>
                    ¥480 / mo
                  </button>
                  <button className="flex-1 py-2.5 rounded-xl text-xs font-black text-white"
                    style={{ background: '#ED742F' }}>
                    ¥2,980 / yr ★
                  </button>
                </div>
              </div>
              <div style={T.card}>
                <SoonRowEl row={{ label: t(locale, 'settings.manageSubscription'), sub: t(locale, 'settings.manageSubscriptionSub'), icon: CreditCard }} last={true} soonLabel={t(locale, 'settings.soonBadge')} />
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SUPPORT ── */}
      <div className="mx-4 mb-4">
        <SectionLabel text={t(locale, 'settings.sectionSupport')} />
        <div style={T.card}>
          {SUPPORT_ROWS.map((row, i) => (
            <LiveRowEl key={row.label} row={row} last={i === SUPPORT_ROWS.length - 1} />
          ))}
        </div>
      </div>

      {/* ── LEGAL ── */}
      <div className="mx-4 mb-4">
        <SectionLabel text={t(locale, 'settings.sectionLegal')} />
        <div style={T.card}>
          {LEGAL_ROWS.map((row, i) => (
            <LiveRowEl key={row.label} row={row} last={i === LEGAL_ROWS.length - 1} />
          ))}
        </div>
      </div>

      {/* ── SESSION — logged-in only ── */}
      {isLoggedIn && (
        <div className="mx-4 mb-4">
          <SectionLabel text={t(locale, 'settings.sectionSession')} />
          <div style={T.card}>
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
            {/* Delete Account */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3.5 active:opacity-70 transition-opacity text-left"
              style={{ borderBottom: T.divider }}
              onClick={() => setDeleteStep('confirm')}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.12)' }}>
                <UserX size={14} style={{ color: '#f87171' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: '#f87171' }}>{t(locale, 'settings.deleteAccount')}</p>
                <p className="text-[10px] mt-0.5" style={{ color: T.secondary }}>{t(locale, 'settings.deleteAccountSub')}</p>
              </div>
              <ChevronRight size={13} style={{ color: 'rgba(248,113,113,0.4)' }} />
            </button>
            {/* Sign Out */}
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
      )}

      {/* ── Your data note — logged-in only ── */}
      {isLoggedIn && (
        <div className="mx-4 mb-10">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.14)' }}>
            <Database size={12} style={{ color: 'rgba(255,255,255,0.58)', flexShrink: 0 }} />
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.58)' }}>
              {t(locale, 'settings.yourDataSaved')}
            </p>
          </div>
        </div>
      )}

      {/* ── Sign Out Confirmation Modal ── */}
      {showSignOutModal && (
        <div
          className="fixed inset-0 z-[60] flex items-end"
          style={{ background: 'rgba(0,0,0,0.82)' }}
          onClick={() => !signingOut && setShowSignOutModal(false)}>
          <div
            className="w-full p-5 rounded-t-3xl"
            style={{
              background: '#1D1D1D',
              border: '1px solid rgba(255,255,255,0.15)',
              borderBottom: 'none',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
            }}
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
                style={{ background: 'rgba(255,255,255,0.40)', color: 'rgba(255,255,255,0.62)' }}
                disabled={signingOut}
                onClick={() => setShowSignOutModal(false)}>
                {t(locale, 'settings.signOutConfirmCancel')}
              </button>
              <button
                className="flex-1 py-4 rounded-2xl text-sm font-black"
                style={{ background: signingOut ? 'rgba(239,68,68,0.3)' : '#dc2626', color: '#fff' }}
                disabled={signingOut}
                onClick={handleSignOut}>
                {signingOut ? '...' : t(locale, 'settings.signOutConfirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Account Modal — Step 1: data list ── */}
      {deleteStep === 'confirm' && (
        <div
          className="fixed inset-0 z-[60] flex items-end"
          style={{ background: 'rgba(0,0,0,0.82)' }}
          onClick={closeDeleteModal}>
          <div
            className="w-full p-5 rounded-t-3xl"
            style={{
              background: '#1D1D1D',
              border: '1px solid rgba(255,255,255,0.15)',
              borderBottom: 'none',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
            }}
            onClick={e => e.stopPropagation()}>

            <div className="flex justify-center mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertTriangle size={18} style={{ color: '#f87171' }} />
              </div>
            </div>

            <p className="text-base font-black text-center mb-3" style={{ color: T.main }}>
              {t(locale, 'support.deleteStep1Title')}
            </p>
            <p className="text-sm text-center mb-4" style={{ color: T.secondary }}>
              {t(locale, 'support.deleteStep1Body')}
            </p>

            <div className="rounded-2xl p-4 mb-6 space-y-2.5"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.14)' }}>
              {deleteDataItems.map(item => (
                <div key={item} className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(239,68,68,0.15)' }}>
                    <Check size={9} style={{ color: '#f87171' }} />
                  </div>
                  <p className="text-xs font-bold" style={{ color: '#f87171' }}>{item}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                className="flex-1 py-4 rounded-2xl text-sm font-black"
                style={{ background: 'rgba(255,255,255,0.40)', color: 'rgba(255,255,255,0.62)' }}
                onClick={closeDeleteModal}>
                {t(locale, 'support.deleteModalCancel')}
              </button>
              <button
                className="flex-1 py-4 rounded-2xl text-sm font-black"
                style={{ background: '#dc2626', color: '#fff' }}
                onClick={() => setDeleteStep('type')}>
                {t(locale, 'support.deleteStep1Next')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Account Modal — Step 2: type DELETE ── */}
      {deleteStep === 'type' && (
        <div
          className="fixed inset-0 z-[60] flex items-end"
          style={{ background: 'rgba(0,0,0,0.82)' }}
          onClick={closeDeleteModal}>
          <div
            className="w-full p-5 rounded-t-3xl"
            style={{
              background: '#1D1D1D',
              border: '1px solid rgba(255,255,255,0.15)',
              borderBottom: 'none',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
            }}
            onClick={e => e.stopPropagation()}>

            <div className="flex justify-center mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <UserX size={18} style={{ color: '#f87171' }} />
              </div>
            </div>

            <p className="text-base font-black text-center mb-1" style={{ color: T.main }}>
              {t(locale, 'support.deleteStep2Title')}
            </p>
            <p className="text-sm text-center mb-5" style={{ color: T.secondary }}>
              {t(locale, 'support.deleteStep2Body')}
            </p>

            <input
              type="text"
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder={t(locale, 'support.deleteInputPlaceholder')}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="w-full px-4 py-3.5 rounded-2xl text-sm font-black outline-none mb-5 text-center tracking-[0.25em]"
              style={{
                background: '#222222',
                border: deleteInput === 'DELETE' ? '1px solid rgba(239,68,68,0.55)' : '1px solid rgba(255,255,255,0.12)',
                color: deleteInput === 'DELETE' ? '#f87171' : T.main,
              }}
            />

            <div className="flex gap-3">
              <button
                className="flex-1 py-4 rounded-2xl text-sm font-black"
                style={{ background: 'rgba(255,255,255,0.40)', color: 'rgba(255,255,255,0.62)' }}
                disabled={deleting}
                onClick={() => { setDeleteStep('confirm'); setDeleteInput('') }}>
                {t(locale, 'support.deleteStep2Cancel')}
              </button>
              <button
                className="flex-1 py-4 rounded-2xl text-sm font-black"
                style={{
                  background: deleteInput === 'DELETE' && !deleting ? '#dc2626' : 'rgba(239,68,68,0.18)',
                  color: deleteInput === 'DELETE' && !deleting ? '#fff' : 'rgba(255,255,255,0.56)',
                }}
                disabled={deleteInput !== 'DELETE' || deleting}
                onClick={handleDelete}>
                {deleting ? t(locale, 'support.deleteModalDeleting') : t(locale, 'support.deleteStep2Btn')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
