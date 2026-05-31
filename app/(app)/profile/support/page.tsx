'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Mail, BookOpen, FileText, Shield, UserX, AlertTriangle, Check } from 'lucide-react'
import { deleteAccount } from '@/actions/profile'
import { useLocale } from '@/lib/useLocale'
import { t } from '@/lib/i18n'

/* ── shared tokens ─────────────────────────────────── */
const T = {
  main:      '#f5f5f5',
  secondary: 'rgba(255,255,255,0.58)',
  muted:     'rgba(255,255,255,0.42)',
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
  label: string
  icon: React.ComponentType<{ size: number; style: React.CSSProperties }>
  sub?: string
  href?: string
  onClick?: () => void
  danger?: boolean
  soon?: boolean
}

type DeleteStep = 'closed' | 'confirm' | 'type'

export default function SupportPage() {
  const { locale } = useLocale()
  const [deleteStep, setDeleteStep] = useState<DeleteStep>('closed')
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting]       = useState(false)

  const handleDelete = async () => {
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

  const closeModal = () => {
    if (deleting) return
    setDeleteStep('closed')
    setDeleteInput('')
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
            {t(locale, 'support.soonBadge')}
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
      label: t(locale, 'support.faqLabel'),
      icon:  BookOpen,
      sub:   t(locale, 'support.faqSub'),
      soon:  true,
      onClick: () => {},
    },
    {
      label: t(locale, 'support.contactLabel'),
      icon:  Mail,
      sub:   t(locale, 'support.contactSub'),
      href:  'mailto:support@repra.app',
    },
  ]

  const legalRows: Row[] = [
    {
      label: t(locale, 'support.termsLabel'),
      icon:  FileText,
      sub:   t(locale, 'support.termsSub'),
      soon:  true,
      onClick: () => {},
    },
    {
      label: t(locale, 'support.privacyLabel'),
      icon:  Shield,
      sub:   t(locale, 'support.privacySub'),
      soon:  true,
      onClick: () => {},
    },
  ]

  const accountRows: Row[] = [
    {
      label:   t(locale, 'support.deleteLabel'),
      icon:    UserX,
      sub:     t(locale, 'support.deleteSub'),
      danger:  true,
      onClick: () => setDeleteStep('confirm'),
    },
  ]

  const dataItems = [
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
        <h1 className="text-base font-black tracking-widest" style={{ color: T.main }}>{t(locale, 'support.title')}</h1>
      </div>

      {/* General */}
      <div className="mx-4 mb-4">
        <SectionLabel text={t(locale, 'support.sectionGeneral')} />
        <div style={T.card}>
          {generalRows.map((row, i, arr) => renderRow(row, i, arr))}
        </div>
      </div>

      {/* Legal */}
      <div className="mx-4 mb-4">
        <SectionLabel text={t(locale, 'support.sectionLegal')} />
        <div style={T.card}>
          {legalRows.map((row, i, arr) => renderRow(row, i, arr))}
        </div>
        <p className="text-[10px] px-1 mt-2" style={{ color: T.muted }}>
          {t(locale, 'support.legalNote')}
        </p>
      </div>

      {/* Account */}
      <div className="mx-4 mb-8">
        <SectionLabel text={t(locale, 'support.sectionAccount')} />
        <div style={{ ...T.card, border: '1px solid rgba(239,68,68,0.16)' }}>
          {accountRows.map((row, i, arr) => renderRow(row, i, arr))}
        </div>
        <p className="text-[10px] px-1 mt-2" style={{ color: T.muted }}>
          {t(locale, 'support.deleteNote')}
        </p>
      </div>

      {/* App version */}
      <p className="text-center text-[10px] pb-6" style={{ color: 'rgba(255,255,255,0.65)', fontFamily: 'var(--font-mono)' }}>
        REPRA v1.0.0
      </p>

      {/* Delete Account Modal — Step 1: data list */}
      {deleteStep === 'confirm' && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: 'rgba(0,0,0,0.82)' }}
          onClick={closeModal}>
          <div
            className="w-full p-5 rounded-t-3xl pb-10"
            style={{ background: '#1D1D1D', border: '1px solid rgba(255,255,255,0.15)', borderBottom: 'none' }}
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
              {dataItems.map(item => (
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
                onClick={closeModal}>
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

      {/* Delete Account Modal — Step 2: type DELETE */}
      {deleteStep === 'type' && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: 'rgba(0,0,0,0.82)' }}
          onClick={closeModal}>
          <div
            className="w-full p-5 rounded-t-3xl pb-10"
            style={{ background: '#1D1D1D', border: '1px solid rgba(255,255,255,0.15)', borderBottom: 'none' }}
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
