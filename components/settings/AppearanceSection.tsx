'use client'

import { Moon, Sun } from 'lucide-react'
import { useLocale } from '@/lib/useLocale'
import { t } from '@/lib/i18n'
import { useTheme, type Theme } from '@/lib/useTheme'

const ACCENT = '#ED742F'

export default function AppearanceSection() {
  const { locale } = useLocale()
  const { theme, setTheme } = useTheme()

  const options: { value: Theme; labelKey: 'appearanceDark' | 'appearanceLight'; descKey: 'appearanceDarkDesc' | 'appearanceLightDesc'; Icon: typeof Moon }[] = [
    { value: 'dark',  labelKey: 'appearanceDark',  descKey: 'appearanceDarkDesc',  Icon: Moon },
    { value: 'light', labelKey: 'appearanceLight', descKey: 'appearanceLightDesc', Icon: Sun  },
  ]

  return (
    <div className="mx-4 mb-4">
      <p className="px-1 mb-2 text-[10px] font-black tracking-widest" style={{ color: 'var(--text-label)' }}>
        {t(locale, 'settings.sectionAppearance')}
      </p>
      <div style={{
        background: 'var(--card-bg-primary)',
        border: '1px solid var(--card-border-primary)',
        borderRadius: 20,
        overflow: 'hidden',
      }}>
        {options.map(({ value, labelKey, descKey, Icon }, i) => {
          const active = theme === value
          return (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className="w-full text-left active:opacity-70 transition-opacity"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                background: 'none',
                border: 'none',
                borderBottom: i === 0 ? '1px solid var(--card-divider)' : 'none',
                cursor: 'pointer',
              }}
            >
              {/* Icon */}
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? `rgba(237,116,47,0.12)` : 'var(--card-icon-bg)',
                border: `1px solid ${active ? 'rgba(237,116,47,0.35)' : 'var(--card-icon-border)'}`,
              }}>
                <Icon size={16} style={{ color: active ? ACCENT : 'var(--text-muted)' }} />
              </div>

              {/* Label + desc */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: active ? ACCENT : 'var(--text-primary)', lineHeight: 1.3 }}>
                  {t(locale, `settings.${labelKey}`)}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                  {t(locale, `settings.${descKey}`)}
                </p>
              </div>

              {/* Active dot */}
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: active ? ACCENT : 'var(--card-icon-bg)',
                border: `1.5px solid ${active ? ACCENT : 'var(--card-icon-border)'}`,
              }} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
