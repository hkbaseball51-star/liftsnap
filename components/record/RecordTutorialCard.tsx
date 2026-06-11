'use client'

import { useState, useEffect } from 'react'
import { useLocale } from '@/lib/useLocale'
import { t } from '@/lib/i18n'

const TUTORIAL_KEY = 'repra_record_tutorial_dismissed'
const ACCENT = '#ED742F'

const STEPS = ['tutorialStep1', 'tutorialStep2', 'tutorialStep3'] as const

export default function RecordTutorialCard() {
  const { locale, mounted } = useLocale()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!mounted) return
    if (!localStorage.getItem(TUTORIAL_KEY)) setVisible(true)
  }, [mounted])

  const dismiss = () => {
    localStorage.setItem(TUTORIAL_KEY, 'true')
    setVisible(false)
  }

  if (!mounted || !visible) return null

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderLeft: `3px solid ${ACCENT}`,
        borderRadius: 14,
        padding: '14px 16px 12px',
        marginBottom: 2,
      }}
    >
      {/* Title */}
      <p style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 6, lineHeight: 1.3 }}>
        {t(locale, 'record.tutorialTitle')}
      </p>

      {/* Description */}
      <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.48)', lineHeight: 1.55, marginBottom: 12 }}>
        {t(locale, 'record.tutorialDesc')}
      </p>

      {/* Steps */}
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        {STEPS.map((key, i) => (
          <li key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              flexShrink: 0,
              width: 18, height: 18,
              borderRadius: '50%',
              background: 'rgba(237,116,47,0.14)',
              border: '1px solid rgba(237,116,47,0.30)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 900, color: ACCENT,
            }}>
              {i + 1}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.70)' }}>
              {t(locale, `record.${key}`)}
            </span>
          </li>
        ))}
      </ol>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={dismiss}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 10,
            background: ACCENT,
            border: 'none',
            color: '#fff',
            fontSize: 12, fontWeight: 800,
            cursor: 'pointer',
            letterSpacing: '0.02em',
          }}
        >
          {t(locale, 'record.tutorialStart')}
        </button>
        <button
          onClick={dismiss}
          style={{
            flex: '0 0 auto',
            padding: '10px 14px',
            borderRadius: 10,
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.40)',
            fontSize: 12, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {t(locale, 'record.tutorialDismiss')}
        </button>
      </div>
    </div>
  )
}
