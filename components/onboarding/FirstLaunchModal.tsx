'use client'

import { useState, useEffect } from 'react'
import { useLocale } from '@/lib/useLocale'
import { t } from '@/lib/i18n'

const ONBOARDING_KEY  = 'repra_onboarding_completed'
const TERMS_KEY       = 'repra_terms_accepted'
const TERMS_AT_KEY    = 'repra_terms_accepted_at'

const ACCENT  = '#ED742F'
const BG_CARD = 'rgba(255,255,255,0.04)'
const BORDER  = '1px solid rgba(255,255,255,0.10)'

function IconDumbbell() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 6.5h11M6.5 17.5h11M3 9h3v6H3zM18 9h3v6h-3zM6.5 12h11" />
    </svg>
  )
}
function IconCalendar() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
function IconTrending() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

const ICONS = [IconDumbbell, IconCalendar, IconTrending]

export default function FirstLaunchModal() {
  const { locale, mounted } = useLocale()
  const [show,     setShow]     = useState(false)
  const [page,     setPage]     = useState(0)
  const [agreed,   setAgreed]   = useState(false)
  const [warn,     setWarn]     = useState(false)

  useEffect(() => {
    if (!mounted) return
    const done = localStorage.getItem(ONBOARDING_KEY)
    if (!done) setShow(true)
  }, [mounted])

  const handleNext = () => {
    if (page < 2) { setPage(p => p + 1); setWarn(false) }
  }

  const handleBack = () => {
    if (page > 0) { setPage(p => p - 1); setWarn(false) }
  }

  const handleGetStarted = () => {
    if (!agreed) { setWarn(true); return }
    localStorage.setItem(ONBOARDING_KEY, 'true')
    localStorage.setItem(TERMS_KEY, 'true')
    localStorage.setItem(TERMS_AT_KEY, new Date().toISOString())
    setShow(false)
  }

  if (!mounted || !show) return null

  const pages = [
    { titleKey: 'onboarding.page1Title', subKey: 'onboarding.page1Sub', descKey: 'onboarding.page1Desc' },
    { titleKey: 'onboarding.page2Title', subKey: 'onboarding.page2Sub', descKey: 'onboarding.page2Desc' },
    { titleKey: 'onboarding.page3Title', subKey: 'onboarding.page3Sub', descKey: 'onboarding.page3Desc' },
  ]

  const Icon = ICONS[page]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        background: '#080808',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px env(safe-area-inset-bottom, 24px)',
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.24em', color: ACCENT }}>REPRA</p>
      </div>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 440,
        background: BG_CARD,
        border: BORDER,
        borderRadius: 24,
        padding: '32px 28px 28px',
        boxShadow: '0 0 60px rgba(237,116,47,0.07)',
      }}>
        {/* Icon */}
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'rgba(237,116,47,0.10)',
          border: '1px solid rgba(237,116,47,0.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
        }}>
          <Icon />
        </div>

        {/* Subtitle */}
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', color: 'rgba(237,116,47,0.80)', marginBottom: 8 }}>
          {t(locale, pages[page].subKey)}
        </p>

        {/* Title — whiteSpace pre-line renders \n in JA page1Title naturally */}
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.25, marginBottom: 12, whiteSpace: 'pre-line' }}>
          {t(locale, pages[page].titleKey)}
        </h2>

        {/* Description */}
        <p style={{ fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,0.58)', lineHeight: 1.65, marginBottom: 28 }}>
          {t(locale, pages[page].descKey)}
        </p>

        {/* Terms checkbox — only on last page */}
        {page === 2 && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <div
                onClick={() => { setAgreed(a => !a); setWarn(false) }}
                style={{
                  flexShrink: 0,
                  marginTop: 2,
                  width: 20, height: 20,
                  borderRadius: 6,
                  border: agreed
                    ? '1.5px solid rgba(237,116,47,0.80)'
                    : '1.5px solid rgba(255,255,255,0.25)',
                  background: agreed ? 'rgba(237,116,47,0.18)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                {agreed && (
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <polyline points="1,4.5 4,7.5 10,1.5" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.62)', lineHeight: 1.6 }}>
                {t(locale, 'onboarding.agreeLabel')}
                <a
                  href="https://app.repraworkout.com/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: ACCENT, fontWeight: 600 }}
                  onClick={e => e.stopPropagation()}
                >
                  {t(locale, 'onboarding.termsLink')}
                </a>
                {t(locale, 'onboarding.and')}
                <a
                  href="https://app.repraworkout.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: ACCENT, fontWeight: 600 }}
                  onClick={e => e.stopPropagation()}
                >
                  {t(locale, 'onboarding.privacyLink')}
                </a>
                {t(locale, 'onboarding.agreeSuffix')}
              </span>
            </label>
            {warn && (
              <p style={{ fontSize: 11, color: '#f87171', marginTop: 8, marginLeft: 30 }}>
                {t(locale, 'onboarding.agreeRequired')}
              </p>
            )}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          {page > 0 && (
            <button
              onClick={handleBack}
              style={{
                flex: '0 0 auto',
                padding: '14px 20px',
                borderRadius: 14,
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.14)',
                color: 'rgba(255,255,255,0.55)',
                fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
              }}>
              {t(locale, 'onboarding.back')}
            </button>
          )}
          {page < 2 ? (
            <button
              onClick={handleNext}
              style={{
                flex: 1,
                padding: '14px 20px',
                borderRadius: 14,
                background: ACCENT,
                border: 'none',
                color: '#fff',
                fontSize: 14, fontWeight: 800,
                letterSpacing: '0.04em',
                cursor: 'pointer',
              }}>
              {t(locale, 'onboarding.next')}
            </button>
          ) : (
            <button
              onClick={handleGetStarted}
              style={{
                flex: 1,
                padding: '14px 20px',
                borderRadius: 14,
                background: agreed ? ACCENT : 'rgba(237,116,47,0.25)',
                border: 'none',
                color: agreed ? '#fff' : 'rgba(255,255,255,0.35)',
                fontSize: 14, fontWeight: 800,
                letterSpacing: '0.04em',
                cursor: agreed ? 'pointer' : 'default',
                transition: 'all 0.2s',
              }}>
              {t(locale, 'onboarding.getStarted')}
            </button>
          )}
        </div>
      </div>

      {/* Page dots */}
      <div style={{ display: 'flex', gap: 6, marginTop: 24 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: i === page ? 20 : 6,
            height: 6,
            borderRadius: 3,
            background: i === page ? ACCENT : 'rgba(255,255,255,0.18)',
            transition: 'all 0.25s',
          }} />
        ))}
      </div>
    </div>
  )
}
