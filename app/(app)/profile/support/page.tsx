'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Mail, BookOpen, FileText, Shield, UserX, AlertTriangle } from 'lucide-react'
import { deleteAccount } from '@/actions/profile'

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

  const card = {
    background: '#151515',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    overflow: 'hidden',
  } as const

  const sectionLabel = (text: string) => (
    <p className="text-[10px] font-black tracking-widest mb-2 px-1" style={{ color: '#444' }}>{text}</p>
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

  const renderRow = (row: Row, i: number, arr: Row[]) => {
    const Icon = row.icon
    const content = (
      <>
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: row.danger ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
            border: row.danger ? '1px solid rgba(239,68,68,0.12)' : '1px solid rgba(255,255,255,0.06)',
          }}>
          <Icon size={14} style={{ color: row.danger ? '#ef4444' : '#555' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: row.danger ? '#ef4444' : '#fff' }}>{row.label}</p>
          {row.sub && <p className="text-[10px] mt-0.5" style={{ color: '#444' }}>{row.sub}</p>}
        </div>
        {row.soon && (
          <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-full mr-1"
            style={{ background: '#1a1a1a', color: '#2e2e2e', border: '1px solid #1e1e1e' }}>
            SOON
          </span>
        )}
        <ChevronRight size={13} style={{ color: row.danger ? 'rgba(239,68,68,0.4)' : '#2e2e2e' }} />
      </>
    )

    const baseClass = 'flex items-center gap-3 px-4 py-3.5 active:opacity-70 transition-opacity w-full text-left'
    const style = { borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', display: 'flex' as const, alignItems: 'center' as const, gap: '0.75rem' }

    if (row.href) {
      return (
        <Link key={row.label} href={row.href} className={baseClass} style={style}>
          {content}
        </Link>
      )
    }
    return (
      <button key={row.label} className={baseClass} style={style} onClick={row.onClick}>
        {content}
      </button>
    )
  }

  const generalRows: Row[] = [
    {
      label: 'FAQ',
      icon: BookOpen,
      sub: 'Frequently asked questions',
      soon: true,
      onClick: () => {},
    },
    {
      label: 'Contact Support',
      icon: Mail,
      sub: 'Send us a message',
      href: 'mailto:support@liftsnap.app',
    },
  ]

  const legalRows: Row[] = [
    {
      label: 'Terms of Service',
      icon: FileText,
      sub: 'Usage terms and conditions',
      soon: true,
      onClick: () => {},
    },
    {
      label: 'Privacy Policy',
      icon: Shield,
      sub: 'How we handle your data',
      soon: true,
      onClick: () => {},
    },
  ]

  const accountRows: Row[] = [
    {
      label: 'Delete Account',
      icon: UserX,
      sub: 'Permanently remove your account and data',
      danger: true,
      onClick: () => setShowDeleteModal(true),
    },
  ]

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-6">
        <Link href="/profile" className="p-1 -ml-1 active:opacity-70">
          <ChevronLeft size={22} style={{ color: '#555' }} />
        </Link>
        <h1 className="text-base font-black tracking-widest text-white">HELP & SUPPORT</h1>
      </div>

      {/* General */}
      <div className="mx-4 mb-4">
        {sectionLabel('GENERAL')}
        <div style={card}>
          {generalRows.map((row, i, arr) => renderRow(row, i, arr))}
        </div>
      </div>

      {/* Legal */}
      <div className="mx-4 mb-4">
        {sectionLabel('LEGAL')}
        <div style={card}>
          {legalRows.map((row, i, arr) => renderRow(row, i, arr))}
        </div>
        <p className="text-[10px] px-1 mt-2" style={{ color: '#2a2a2a' }}>
          Terms and Privacy Policy documents will be published before public launch.
        </p>
      </div>

      {/* Account */}
      <div className="mx-4 mb-8">
        {sectionLabel('ACCOUNT')}
        <div style={card}>
          {accountRows.map((row, i, arr) => renderRow(row, i, arr))}
        </div>
      </div>

      {/* App version */}
      <p className="text-center text-[10px] pb-6" style={{ color: '#1e1e1e', fontFamily: 'var(--font-mono)' }}>
        LIFTSNAP v1.0.0
      </p>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          onClick={() => !deleting && setShowDeleteModal(false)}>
          <div
            className="w-full p-5 rounded-t-3xl"
            style={{ background: '#111' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex justify-center mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertTriangle size={18} style={{ color: '#ef4444' }} />
              </div>
            </div>

            <p className="text-base font-black text-white text-center mb-2">Delete Account?</p>
            <p className="text-sm text-center mb-2 leading-relaxed" style={{ color: '#555' }}>
              This will permanently delete your account and all workout history.
            </p>
            <p className="text-xs text-center mb-6 font-bold" style={{ color: '#ef4444' }}>
              This cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                className="flex-1 py-4 rounded-2xl text-sm font-black"
                style={{ background: '#1a1a1a', color: '#666' }}
                disabled={deleting}
                onClick={() => setShowDeleteModal(false)}>
                CANCEL
              </button>
              <button
                className="flex-1 py-4 rounded-2xl text-sm font-black text-white"
                style={{ background: deleting ? '#333' : '#dc2626' }}
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
