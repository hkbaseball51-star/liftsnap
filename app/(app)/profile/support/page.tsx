'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight, Mail, BookOpen } from 'lucide-react'
import { useLocale } from '@/lib/useLocale'
import { t } from '@/lib/i18n'

/* ── shared tokens ─────────────────────────────────── */
const T = {
  main:      '#f5f5f5',
  secondary: 'rgba(255,255,255,0.58)',
  label:     'rgba(255,255,255,0.52)',
  chevron:   'rgba(255,255,255,0.28)',
  card:      { background: '#1D1D1D', border: '1px solid rgba(255,255,255,0.17)', borderRadius: 20, overflow: 'hidden' } as const,
  divider:   '1px solid rgba(255,255,255,0.07)',
  soon: {
    background: 'rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.58)',
    border:     '1px solid rgba(255,255,255,0.17)',
  },
  iconWrap: {
    background: 'rgba(255,255,255,0.11)',
    border:     '1px solid rgba(255,255,255,0.15)',
  },
}

const SectionLabel = ({ text }: { text: string }) => (
  <p className="text-[10px] font-black tracking-widest mb-2 px-1" style={{ color: T.label }}>{text}</p>
)

type Row = {
  label:    string
  icon:     React.ComponentType<{ size: number; style: React.CSSProperties }>
  sub?:     string
  href?:    string
  onClick?: () => void
  soon?:    boolean
}

export default function SupportPage() {
  const { locale } = useLocale()

  const renderRow = (row: Row, i: number, arr: Row[]) => {
    const Icon = row.icon
    const content = (
      <>
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={T.iconWrap}>
          <Icon size={14} style={{ color: T.secondary }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: T.main }}>{row.label}</p>
          {row.sub && (
            <p className="text-[10px] mt-0.5" style={{ color: T.secondary }}>{row.sub}</p>
          )}
        </div>
        {row.soon && (
          <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-full mr-1"
            style={T.soon}>
            {t(locale, 'support.soonBadge')}
          </span>
        )}
        <ChevronRight size={13} style={{ color: T.chevron }} />
      </>
    )

    const rowStyle = {
      borderBottom: i < arr.length - 1 ? T.divider : 'none',
      display: 'flex' as const,
      alignItems: 'center' as const,
      gap: '0.75rem',
    }
    const cls = 'flex items-center gap-3 px-4 py-3.5 active:opacity-70 transition-opacity w-full text-left'

    if (row.href) {
      return <Link key={row.label} href={row.href} className={cls} style={rowStyle}>{content}</Link>
    }
    return <button key={row.label} className={cls} style={rowStyle} onClick={row.onClick}>{content}</button>
  }

  const generalRows: Row[] = [
    {
      label:   t(locale, 'support.faqLabel'),
      icon:    BookOpen,
      sub:     t(locale, 'support.faqSub'),
      soon:    true,
      onClick: () => {},
    },
    {
      label: t(locale, 'support.contactLabel'),
      icon:  Mail,
      sub:   t(locale, 'support.contactSub'),
      href:  '/profile/support/contact',
    },
  ]

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-6">
        <Link href="/profile/settings" className="p-1 -ml-1 active:opacity-70">
          <ChevronLeft size={22} style={{ color: 'rgba(255,255,255,0.72)' }} />
        </Link>
        <h1 className="text-base font-black tracking-widest" style={{ color: T.main }}>{t(locale, 'support.title')}</h1>
      </div>

      {/* General */}
      <div className="mx-4 mb-4">
        <SectionLabel text={t(locale, 'support.sectionGeneral')} />
        <div style={T.card}>
          {generalRows.map((row, i, arr) => renderRow(row, i, arr))}
        </div>
      </div>

      {/* App version */}
      <p className="text-center text-[10px] pb-6" style={{ color: 'rgba(255,255,255,0.65)', fontFamily: 'var(--font-mono)' }}>
        REPRA v1.0.0
      </p>

    </div>
  )
}
