'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight,
  Ruler, Globe,
  HelpCircle, FileText,
  AlertTriangle, Shield,
  Database, Zap,
} from 'lucide-react'
import { useLocale } from '@/lib/useLocale'
import { t } from '@/lib/i18n'
import { useDemoMode } from '@/lib/useDemoMode'
import { REPRA_DEMO_USER_ID } from '@/lib/demoConstants'
import DataManagementSection from '@/components/settings/DataManagementSection'
import AppearanceSection from '@/components/settings/AppearanceSection'

/* CSS-var-based theme tokens — update immediately when data-theme changes */
const T = {
  card:     { background: 'var(--card-bg-primary)', border: '1px solid var(--card-border-primary)', borderRadius: 20, overflow: 'hidden' } as React.CSSProperties,
  divider:  '1px solid var(--card-divider)' as const,
} as const

type LiveRow = {
  label:    string
  sub?:     string
  icon:     React.ComponentType<{ size: number; style: React.CSSProperties }>
  href?:    string
  onClick?: () => void
  danger?:  boolean
  accent?:  boolean
}

const SectionLabel = ({ text }: { text: string }) => (
  <p className="text-[10px] font-black tracking-widest mb-2 px-1" style={{ color: 'var(--text-label)' }}>{text}</p>
)

function LiveRowEl({ row, last }: { row: LiveRow; last: boolean }) {
  const Icon = row.icon
  const iconStyle = row.danger
    ? { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.14)' }
    : row.accent
    ? { background: 'rgba(237,116,47,0.12)', border: '1px solid rgba(237,116,47,0.35)' }
    : { background: 'var(--card-icon-bg)', border: '1px solid var(--card-icon-border)' }
  const iconColor    = row.danger ? '#f87171' : row.accent ? '#ED742F' : 'var(--text-secondary)'
  const labelColor   = row.danger ? '#f87171' : row.accent ? '#ED742F' : 'var(--text-primary)'
  const chevronColor = row.danger ? 'rgba(248,113,113,0.4)' : row.accent ? 'rgba(237,116,47,0.4)' : 'var(--text-chevron)'

  const cls   = 'flex items-center gap-3 px-4 py-3.5 active:opacity-70 transition-opacity'
  const style = { borderBottom: last ? 'none' : '1px solid var(--card-divider)' }
  const inner = (
    <>
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={iconStyle}>
        <Icon size={14} style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: labelColor }}>{row.label}</p>
        {row.sub && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{row.sub}</p>}
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

/* ── Page ────────────────────────────────────────────── */
export default function SettingsPage() {
  const router = useRouter()
  const { locale } = useLocale()
  const { demoUserId, isDemo, enableDemo, disableDemo, mounted: demoMounted } = useDemoMode()

  // 5-tap reveal for hidden demo section
  const tapCount     = useRef(0)
  const tapTimer     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showDemo, setShowDemo] = useState(false)
  const [demoMsg,  setDemoMsg]  = useState('')

  const handleVersionTap = () => {
    if (process.env.NODE_ENV === 'production') return
    if (tapTimer.current) clearTimeout(tapTimer.current)
    tapCount.current += 1
    if (tapCount.current >= 5) {
      tapCount.current = 0
      setShowDemo(true)
    } else {
      tapTimer.current = setTimeout(() => { tapCount.current = 0 }, 3000)
    }
  }

  const activateDemo = () => {
    enableDemo(REPRA_DEMO_USER_ID)
    setDemoMsg(locale === 'ja'
      ? 'Demo Mode ON。ホームに戻るとデモデータが表示されます。'
      : 'Demo Mode ON. Navigate to Home to see demo data.')
    setTimeout(() => setDemoMsg(''), 4000)
  }

  const deactivateDemo = () => {
    disableDemo()
    setDemoMsg(locale === 'ja' ? 'Demo Mode OFF。ローカルデータに戻ります。' : 'Demo Mode OFF. Switched back to local data.')
    setTimeout(() => setDemoMsg(''), 4000)
  }

  const APP_LIVE_ROWS: LiveRow[] = [
    { label: t(locale, 'settings.language'), sub: t(locale, 'settings.languageSub'), icon: Globe, href: '/profile/language' },
    { label: t(locale, 'settings.units'),    sub: t(locale, 'settings.unitsSub'),    icon: Ruler, href: '/profile/units'    },
  ]

  const SUPPORT_LEGAL_ROWS: LiveRow[] = [
    { label: t(locale, 'settings.support'),           sub: t(locale, 'settings.supportSub'),           icon: HelpCircle,    href: '/support'    },
    { label: t(locale, 'settings.privacyPolicy'),     sub: t(locale, 'settings.privacyPolicySub'),     icon: Shield,        href: '/privacy'    },
    { label: t(locale, 'settings.termsOfUse'),        sub: t(locale, 'settings.termsSub'),             icon: FileText,      href: '/terms'      },
    { label: t(locale, 'settings.fitnessDisclaimer'), sub: t(locale, 'settings.fitnessDisclaimerSub'), icon: AlertTriangle, href: '/disclaimer' },
  ]

  return (
    <div className="min-h-screen pb-nav" style={{ background: 'var(--app-bg)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-6">
        <button onClick={() => router.back()} className="p-1 -ml-1 active:opacity-70">
          <ChevronLeft size={22} style={{ color: 'var(--text-chevron)' }} />
        </button>
        <h1 className="text-base font-black tracking-widest" style={{ color: 'var(--text-primary)' }}>{t(locale, 'settings.settingsTitle')}</h1>
      </div>

      {/* ── APP ── */}
      <div className="mx-4 mb-4">
        <SectionLabel text={t(locale, 'settings.sectionApp')} />
        <div style={T.card}>
          {APP_LIVE_ROWS.map((row, i) => (
            <LiveRowEl key={row.label} row={row} last={i === APP_LIVE_ROWS.length - 1} />
          ))}
        </div>
      </div>

      {/* ── SUPPORT & LEGAL ── */}
      <div className="mx-4 mb-4">
        <SectionLabel text={t(locale, 'settings.sectionSupportLegal')} />
        <div style={T.card}>
          {SUPPORT_LEGAL_ROWS.map((row, i) => (
            <LiveRowEl key={row.label} row={row} last={i === SUPPORT_LEGAL_ROWS.length - 1} />
          ))}
        </div>
      </div>

      {/* ── Appearance ── */}
      <AppearanceSection />

      {/* ── Data Management ── */}
      <DataManagementSection />

      {/* ── Version (tap 5× to reveal Demo Mode) ── */}
      <div className="mx-4 mb-3 flex justify-center">
        <button onClick={handleVersionTap} className="px-4 py-1.5 active:opacity-50">
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            {locale === 'ja' ? 'バージョン 1.0.0' : 'Version 1.0.0'}
          </span>
        </button>
      </div>

      {/* ── DEMO MODE (hidden — revealed by 5 taps on version label, dev only) ── */}
      {process.env.NODE_ENV !== 'production' && showDemo && demoMounted && (
        <div className="mx-4 mb-10">
          <SectionLabel text="— DEVELOPER —" />
          <div style={{ ...T.card, borderColor: isDemo ? 'rgba(237,116,47,0.45)' : undefined }}>

            {/* Status row */}
            <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: T.divider }}>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Demo Data Mode</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {locale === 'ja' ? 'デモ用のサンプルデータを読み込む' : 'Loads pre-populated demo workout records'}
                </p>
              </div>
              <div className="px-2.5 py-1 rounded-lg" style={{
                background: isDemo ? 'rgba(237,116,47,0.14)' : 'var(--surface-chip)',
                border: `1px solid ${isDemo ? 'rgba(237,116,47,0.40)' : 'var(--card-border-primary)'}`,
              }}>
                <span className="text-[10px] font-black" style={{ color: isDemo ? '#ED742F' : 'var(--text-muted)' }}>
                  {isDemo ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>

            {/* Current user ID */}
            {demoUserId && (
              <div className="px-4 py-3" style={{ borderBottom: T.divider }}>
                <p className="text-[9px] font-bold mb-1" style={{ color: 'var(--text-label)' }}>CURRENT DEMO USER ID</p>
                <p className="text-[9px] font-mono" style={{ color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                  {demoUserId}
                </p>
              </div>
            )}

            {/* Enable button */}
            <button
              onClick={activateDemo}
              className="w-full flex items-center gap-3 px-4 py-3.5 active:opacity-70 text-left"
              style={{ borderBottom: isDemo ? T.divider : 'none' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(237,116,47,0.12)', border: '1px solid rgba(237,116,47,0.30)' }}>
                <Zap size={14} style={{ color: '#ED742F' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: '#ED742F' }}>Use REPRA Demo Account</p>
                <p className="text-[9px] mt-0.5" style={{ color: 'rgba(237,116,47,0.60)' }}>{REPRA_DEMO_USER_ID.slice(0, 8)}…</p>
              </div>
            </button>

            {/* Disable button */}
            {isDemo && (
              <button
                onClick={deactivateDemo}
                className="w-full flex items-center gap-3 px-4 py-3.5 active:opacity-70 text-left">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                  <Database size={14} style={{ color: '#f87171' }} />
                </div>
                <p className="text-sm font-bold" style={{ color: '#f87171' }}>
                  {locale === 'ja' ? 'Demo Data を無効化' : 'Disable Demo Data'}
                </p>
              </button>
            )}
          </div>

          {/* Toast message */}
          {demoMsg !== '' && (
            <p className="text-[10px] mt-2 px-1 leading-relaxed" style={{ color: 'rgba(237,116,47,0.80)' }}>
              {demoMsg}
            </p>
          )}

          <p className="text-[9px] mt-2 px-1" style={{ color: 'var(--text-disabled)' }}>
            {locale === 'ja'
              ? '有効化後、ホームへ移動するとデモデータが読み込まれます。'
              : 'After enabling, navigate to Home to load demo data.'}
          </p>
        </div>
      )}

    </div>
  )
}
