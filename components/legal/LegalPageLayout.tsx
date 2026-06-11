'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

/* ── LegalPageLayout ─────────────────────────────────── */

interface LegalPageLayoutProps {
  title: string
  updatedDate: string
  children: React.ReactNode
}

export default function LegalPageLayout({ title, updatedDate, children }: LegalPageLayoutProps) {
  const router = useRouter()

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push('/profile/settings')
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: 'var(--app-bg)' }}>
      {/* Header */}
      <div className="pt-14 pb-3 px-4 flex items-center gap-3">
        <button
          onClick={handleBack}
          aria-label="戻る"
          className="p-1 -ml-1 active:opacity-70"
        >
          <ChevronLeft size={22} style={{ color: 'var(--text-chevron)' }} />
        </button>
        <h1 className="text-base font-black tracking-widest" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h1>
      </div>

      {/* Content */}
      <div className="px-5 max-w-2xl mx-auto">
        <p className="text-xs mb-8 mt-1" style={{ color: 'var(--text-muted)' }}>
          {updatedDate}
        </p>
        {children}
      </div>
    </div>
  )
}

/* ── LegalSection ────────────────────────────────────── */

interface LegalSectionProps {
  title: string
  children: React.ReactNode
}

export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section>
      <h2 className="text-sm font-black tracking-widest mb-3 mt-8" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

/* ── LegalSubSection ─────────────────────────────────── */

interface LegalSubSectionProps {
  title: string
  children: React.ReactNode
}

export function LegalSubSection({ title, children }: LegalSubSectionProps) {
  return (
    <div>
      <h3 className="text-xs font-bold mb-2 mt-5" style={{ color: 'var(--text-secondary)' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

/* ── LegalList ───────────────────────────────────────── */

interface LegalListProps {
  items: string[]
}

export function LegalList({ items }: LegalListProps) {
  return (
    <ul className="flex flex-col gap-2 pl-2 mb-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: '#ED742F', flexShrink: 0 }}>·</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

/* ── LegalContact ────────────────────────────────────── */

interface LegalContactProps {
  operator: string
  email: string
}

export function LegalContact({ operator, email }: LegalContactProps) {
  return (
    <div
      className="rounded-2xl"
      style={{
        background: 'var(--card-bg-primary)',
        border: '1px solid var(--card-border-primary)',
        padding: '16px 18px',
      }}
    >
      <p className="text-xs font-black tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
        運営者
      </p>
      <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
        {operator}
      </p>
      <p className="text-xs font-black tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
        メールアドレス
      </p>
      <a href={`mailto:${email}`} className="text-sm font-bold break-all" style={{ color: '#ED742F' }}>
        {email}
      </a>
    </div>
  )
}
