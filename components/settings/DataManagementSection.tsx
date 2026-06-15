'use client'

import { useRef, useState } from 'react'
import { Download, Upload, Trash2 } from 'lucide-react'
import { useLocale } from '@/lib/useLocale'
import { t } from '@/lib/i18n'
import { exportBackup, importBackup } from '@/lib/backup'

// Keys that hold user data — cleared on Reset All Data.
// Preference keys (language, theme, weight unit, card lang) are intentionally kept.
const RESET_DATA_KEYS = [
  'repra_sessions',
  'repra_sets',
  'repra_custom_exercises',
  'repra_body_weights',
  'repra_db_v2',
  'repra_db_v3_bw_id',
  'repra_db_v4_soft_delete',
  'liftsnap_share_count',
  'liftsnap_hidden_exercises',
  'repra_share_preset',
]

const CARD    = { background: 'var(--card-bg-primary)', border: '1px solid var(--card-border-primary)', borderRadius: 20, overflow: 'hidden' }
const ROW     = { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer' }
const ICON    = { width: 34, height: 34, borderRadius: 10, background: 'var(--card-icon-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
const ICON_DG = { width: 34, height: 34, borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
const DIVIDER = { height: 1, background: 'var(--card-divider)', margin: '0 16px' }
const ACCENT  = '#ED742F'

type Toast = { msg: string; ok: boolean } | null
type ResetStep = 'idle' | 'confirm1' | 'confirm2'

export default function DataManagementSection() {
  const { locale } = useLocale()
  const fileRef = useRef<HTMLInputElement>(null)
  const [toast, setToast]         = useState<Toast>(null)
  const [confirmFile, setConfirmFile] = useState<File | null>(null)
  const [resetStep, setResetStep] = useState<ResetStep>('idle')

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

  function handleConfirmReset() {
    RESET_DATA_KEYS.forEach(key => localStorage.removeItem(key))
    setResetStep('idle')
    showToast(t(locale, 'settings.resetSuccess'), true)
    setTimeout(() => window.location.reload(), 1200)
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

        <div style={DIVIDER} />

        {/* Reset All Data row */}
        <button
          onClick={() => setResetStep('confirm1')}
          style={{ ...ROW, width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
        >
          <div style={ICON_DG}>
            <Trash2 size={16} style={{ color: '#f87171' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#f87171', lineHeight: 1.3 }}>
              {t(locale, 'settings.resetData')}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
              {t(locale, 'settings.resetDataSub')}
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

      {/* Import confirm dialog */}
      {confirmFile && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.70)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 24px',
        }}>
          <div style={{
            width: '100%', maxWidth: 360,
            background: 'var(--card-bg-primary)', border: '1px solid var(--card-border-primary)',
            borderRadius: 20, padding: '28px 24px 20px',
          }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>
              {t(locale, 'settings.importConfirmTitle')}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
              {t(locale, 'settings.importConfirmBody')}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmFile(null)}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12,
                  background: 'var(--surface-chip)', border: '1px solid var(--card-border-primary)',
                  color: 'var(--text-secondary)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
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

      {/* Reset confirm dialog — step 1 */}
      {resetStep === 'confirm1' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 24px',
        }}>
          <div style={{
            width: '100%', maxWidth: 360,
            background: 'var(--card-bg-primary)', border: '1px solid rgba(239,68,68,0.30)',
            borderRadius: 20, padding: '28px 24px 20px',
          }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#f87171', marginBottom: 10 }}>
              {t(locale, 'settings.resetConfirm1Title')}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
              {t(locale, 'settings.resetConfirm1Body')}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setResetStep('idle')}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12,
                  background: 'var(--surface-chip)', border: '1px solid var(--card-border-primary)',
                  color: 'var(--text-secondary)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                {t(locale, 'settings.resetConfirmCancel')}
              </button>
              <button
                onClick={() => setResetStep('confirm2')}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12,
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.40)',
                  color: '#f87171', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                {locale === 'ja' ? '次へ' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset confirm dialog — step 2 */}
      {resetStep === 'confirm2' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.80)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 24px',
        }}>
          <div style={{
            width: '100%', maxWidth: 360,
            background: 'var(--card-bg-primary)', border: '1px solid rgba(239,68,68,0.45)',
            borderRadius: 20, padding: '28px 24px 20px',
          }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#f87171', marginBottom: 10 }}>
              {t(locale, 'settings.resetConfirm2Title')}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
              {t(locale, 'settings.resetConfirm2Body')}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setResetStep('idle')}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12,
                  background: 'var(--surface-chip)', border: '1px solid var(--card-border-primary)',
                  color: 'var(--text-secondary)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                {t(locale, 'settings.resetConfirmCancel')}
              </button>
              <button
                onClick={handleConfirmReset}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12,
                  background: '#ef4444', border: 'none',
                  color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                {t(locale, 'settings.resetConfirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
