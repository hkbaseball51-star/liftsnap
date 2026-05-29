'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Mail, BookOpen, FileText, Shield, UserX, AlertTriangle } from 'lucide-react'
import { deleteAccount } from '@/actions/profile'

/* ── shared tokens ─────────────────────────────────── */
const T = {
  main:      '#f5f5f5',
  secondary: 'rgba(255,255,255,0.58)',
  muted:     'rgba(255,255,255,0.42)',
  label:     'rgba(255,255,255,0.52)',
  chevron:   'rgba(255,255,255,0.28)',
  card:      { background: '#161616', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 20, overflow: 'hidden' } as const,
  divider:   '1px solid rgba(255,255,255,0.07)',
  soon: {
    background: 'rgba(255,255,255,0.07)',
    color:      'rgba(255,255,255,0.58)',
    border:     '1px solid rgba(255,255,255,0.10)',
  },
  iconWrap: {
    background: 'rgba(255,255,255,0.06)',
    border:     '1px solid rgba(255,255,255,0.09)',
  },
}

const SectionLabel = ({ text }: { text: string }) => (
  <p className="text-[10px] font-black tracking-widest mb-2 px-1" style={{ color: T.label }}>{text}</p>
)

type Row = {
  label: string
  icon: React.ComponentType<{ size: number; style: React.CSSProperties }>
  sub?: string
  href?: string
  onClick?: () => void
  danger?: boolean
  soon?: boolean
}

export default function SupportPage() {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting]               = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteAccount()
    } catch {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const renderRow = (row: Row, i: number, arr: Row[]) => {
    const Icon = row.icon
    const content = (
      <>
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={row.danger
            ? { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.16)' }
            : T.iconWrap}>
          <Icon size={14} style={{ color: row.danger ? '#f87171' : T.secondary }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: row.danger ? '#f87171' : T.main }}>
            {row.label}
          </p>
          {row.sub && (
            <p className="text-[10px] mt-0.5" style={{ color: T.secondary }}>{row.sub}</p>
          )}
        </div>
        {row.soon && (
          <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-full mr-1"
            style={T.soon}>
            SOON
          </span>
        )}
        <ChevronRight size={13} style={{ color: row.danger ? 'rgba(248,113,113,0.45)' : T.chevron }} />
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
      label: 'FAQ',
      icon:  BookOpen,
      sub:   'Frequently asked questions',
      soon:  true,
      onClick: () => {},
    },
    {
      label: 'Contact Support',
      icon:  Mail,
      sub:   'Send us a message',
      href:  'mailto:support@liftsnap.app',
    },
  ]

  const legalRows: Row[] = [
    {
      label: 'Terms of Service',
      icon:  FileText,
      sub:   'Will be published before public launch',
      soon:  true,
      onClick: () => {},
    },
    {
      label: 'Privacy Policy',
      icon:  Shield,
      sub:   'Will be published before public launch',
      soon:  true,
      onClick: () => {},
    },
  ]

  const accountRows: Row[] = [
    {
      label:   'Delete Account',
      icon:    UserX,
      sub:     'Permanently remove your account and data',
      danger:  true,
      onClick: () => setShowDeleteModal(true),
    },
  ]

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-6">
        <Link href="/profile" className="p-1 -ml-1 active:opacity-70">
          <ChevronLeft size={22} style={{ color: 'rgba(255,255,255,0.55)' }} />
        </Link>
        <h1 className="text-base font-black tracking-widest" style={{ color: T.main }}>HELP & SUPPORT</h1>
      </div>

      {/* General */}
      <div className="mx-4 mb-4">
        <SectionLabel text="GENERAL" />
        <div style={T.card}>
          {generalRows.map((row, i, arr) => renderRow(row, i, arr))}
        </div>
      </div>

      {/* Legal */}
      <div className="mx-4 mb-4">
        <SectionLabel text="LEGAL" />
        <div style={T.card}>
          {legalRows.map((row, i, arr) => renderRow(row, i, arr))}
        </div>
        <p className="text-[10px] px-1 mt-2" style={{ color: T.muted }}>
          Terms and Privacy Policy will be published before public launch.
        </p>
      </div>

      {/* Account */}
      <div className="mx-4 mb-8">
        <SectionLabel text="ACCOUNT" />
        <div style={{ ...T.card, border: '1px solid rgba(239,68,68,0.16)' }}>
          {accountRows.map((row, i, arr) => renderRow(row, i, arr))}
        </div>
        <p className="text-[10px] px-1 mt-2" style={{ color: T.muted }}>
          Deleting your account will permanently remove all workout data.
        </p>
      </div>

      {/* App version */}
      <p className="text-center text-[10px] pb-6" style={{ color: 'rgba(255,255,255,0.22)', fontFamily: 'var(--font-mono)' }}>
        LIFTSNAP v1.0.0
      </p>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: 'rgba(0,0,0,0.82)' }}
          onClick={() => !deleting && setShowDeleteModal(false)}>
          <div
            className="w-full p-5 rounded-t-3xl"
            style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex justify-center mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertTriangle size={18} style={{ color: '#f87171' }} />
              </div>
            </div>

            <p className="text-base font-black text-center mb-2" style={{ color: T.main }}>
              Delete Account?
            </p>
            <p className="text-sm text-center mb-2 leading-relaxed" style={{ color: T.secondary }}>
              This will permanently delete your account and all workout history.
            </p>
            <p className="text-xs text-center mb-6 font-bold" style={{ color: '#f87171' }}>
              This cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                className="flex-1 py-4 rounded-2xl text-sm font-black"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.62)' }}
                disabled={deleting}
                onClick={() => setShowDeleteModal(false)}>
                CANCEL
              </button>
              <button
                className="flex-1 py-4 rounded-2xl text-sm font-black"
                style={{
                  background: deleting ? 'rgba(239,68,68,0.3)' : '#dc2626',
                  color: '#fff',
                }}
                disabled={deleting}
                onClick={handleDelete}>
                {deleting ? 'DELETING...' : 'DELETE'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
