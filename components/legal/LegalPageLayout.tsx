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

  return (
    <div className="min-h-screen pb-32" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div className="pt-14 pb-2 px-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          aria-label="戻る"
          className="p-1 -ml-1 active:opacity-70"
        >
          <ChevronLeft size={22} style={{ color: 'rgba(255,255,255,0.72)' }} />
        </button>
        <h1 className="text-base font-black tracking-widest" style={{ color: '#f5f5f5' }}>
          {title}
        </h1>
      </div>

      {/* Content */}
      <div className="px-5 max-w-2xl mx-auto">
        <p className="text-xs mb-8" style={{ color: 'rgba(255,255,255,0.35)' }}>
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
      <h2 className="text-sm font-black tracking-widest mb-3 mt-8" style={{ color: '#f5f5f5' }}>
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
      <h3 className="text-xs font-bold mb-2 mt-5" style={{ color: 'rgba(255,255,255,0.75)' }}>
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
    <ul className="flex flex-col gap-1.5 pl-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.60)' }}>
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
  note?: string
}

export function LegalContact({ operator, email, note }: LegalContactProps) {
  return (
    <div
      className="rounded-2xl"
      style={{
        background: '#111',
        border: '1px solid #222',
        padding: '16px',
      }}
    >
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.60)' }}>
        {operator}
      </p>
      <p className="text-sm leading-relaxed mt-1">
        <a href={`mailto:${email}`} style={{ color: '#ED742F' }}>
          {email}
        </a>
      </p>
      {note && (
        <p className="text-xs mt-3 leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {note}
        </p>
      )}
    </div>
  )
}
