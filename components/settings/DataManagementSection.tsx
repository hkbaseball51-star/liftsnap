'use client'

import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { useLocale } from '@/lib/useLocale'
import { t } from '@/lib/i18n'
import { exportBackup, importBackup } from '@/lib/backup'

const CARD  = { background: 'var(--card-bg-primary)', border: '1px solid var(--card-border-primary)', borderRadius: 20, overflow: 'hidden' }
const ROW   = { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer' }
const ICON  = { width: 34, height: 34, borderRadius: 10, background: 'var(--card-icon-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
const DIVIDER = { height: 1, background: 'var(--card-divider)', margin: '0 16px' }
const ACCENT = '#ED742F'

type Toast = { msg: string; ok: boolean } | null

export default function DataManagementSection() {
  const { locale } = useLocale()
  const fileRef = useRef<HTMLInputElement>(null)
  const [toast, setToast] = useState<Toast>(null)
  const [confirmFile, setConfirmFile] = useState<File | null>(null)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  function handleExport() {
    try {
      exportBackup()
      showToast(t(locale, 'settings.backupSuccess'), true)
    } catch {
      showToast(t(locale, 'settings.backupFail'), false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setConfirmFile(file)
  }

  async function handleConfirmImport() {
    if (!confirmFile) return
    const file = confirmFile
    setConfirmFile(null)
    try {
      await importBackup(file)
      showToast(t(locale, 'settings.importSuccess'), true)
      setTimeout(() => window.location.reload(), 1200)
    } catch {
      showToast(t(locale, 'settings.importFail'), false)
    }
  }

  return (
    <div className="mx-4 mb-4">
      {/* Section label */}
      <p className="px-1 mb-2 text-[11px] font-bold tracking-widest" style={{ color: 'var(--text-label)' }}>
        {t(locale, 'settings.sectionData')}
      </p>

      <div style={CARD}>
        {/* Export row */}
        <button
          onClick={handleExport}
          style={{ ...ROW, width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
        >
          <div style={ICON}>
            <Download size={16} style={{ color: ACCENT }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
              {t(locale, 'settings.backupBtn')}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
              {t(locale, 'settings.backupDesc')}
            </p>
          </div>
        </button>

        <div style={DIVIDER} />

        {/* Import row */}
        <button
          onClick={() => fileRef.current?.click()}
          style={{ ...ROW, width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
        >
          <div style={ICON}>
            <Upload size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
              {t(locale, 'settings.importBtn')}
            </p>
          </div>
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)', left: '50%',
          transform: 'translateX(-50%)', zIndex: 9999,
          background: toast.ok ? 'rgba(34,197,94,0.92)' : 'rgba(239,68,68,0.92)',
          color: '#fff', borderRadius: 12, padding: '10px 18px',
          fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          whiteSpace: 'nowrap',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Confirm dialog */}
      {confirmFile && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.70)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 24px',
        }}>
          <div style={{
            width: '100%', maxWidth: 360,
            background: '#1D1D1D', border: '1px solid rgba(255,255,255,0.17)',
            borderRadius: 20, padding: '28px 24px 20px',
          }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 10 }}>
              {t(locale, 'settings.importConfirmTitle')}
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: 24 }}>
              {t(locale, 'settings.importConfirmBody')}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmFile(null)}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12,
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.60)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                {t(locale, 'settings.importConfirmCancel')}
              </button>
              <button
                onClick={handleConfirmImport}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12,
                  background: ACCENT, border: 'none',
                  color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                {t(locale, 'settings.importConfirmOk')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
