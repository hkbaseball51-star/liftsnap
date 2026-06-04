'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { login, resetPassword } from '@/actions/auth'
import type { ResetErrorCode } from '@/actions/auth'
import AuthBackButton from '@/components/auth/AuthBackButton'
import { useLocale } from '@/lib/useLocale'
import { t } from '@/lib/i18n'
import type { LangPref } from '@/lib/i18n'

type Mode = 'login' | 'reset'

const SUCCESS_COOLDOWN_SEC    = 60
const RATE_LIMIT_COOLDOWN_SEC = 300
const COOLDOWN_STORAGE_KEY    = 'repra_password_reset_cooldown_until'

function formatCooldown(secs: number): string {
  if (secs <= 0) return ''
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0
    ? `${m}:${String(s).padStart(2, '0')}`
    : `${s}s`
}

function resetErrorMessage(code: ResetErrorCode, locale: string, devMessage?: string): string {
  if (code === 'rate_limit') return t(locale as 'en' | 'ja', 'auth.resetTooMany')
  return devMessage
    ? `${t(locale as 'en' | 'ja', 'auth.resetFailed')} (dev: ${devMessage})`
    : t(locale as 'en' | 'ja', 'auth.resetFailed')
}

export default function LoginPage() {
  const { locale, langPref, setLangPref, mounted } = useLocale()
  const [mode,      setMode]      = useState<Mode>('login')
  const [error,     setError]     = useState<string | null>(null)
  const [notice,    setNotice]    = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [cooldown,  setCooldown]  = useState(0)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('reset') === 'success') {
      setNotice(t(locale, 'auth.passwordUpdated'))
    }
  }, [locale])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COOLDOWN_STORAGE_KEY)
      if (stored) {
        const remaining = Math.ceil((parseInt(stored, 10) - Date.now()) / 1000)
        if (remaining > 0) setCooldown(remaining)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  function startCooldown(secs: number) {
    try {
      localStorage.setItem(COOLDOWN_STORAGE_KEY, String(Date.now() + secs * 1000))
    } catch {}
    setCooldown(secs)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (mode === 'reset') {
      const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value
      const result = await resetPassword(email)
      setLoading(false)

      if ('errorCode' in result) {
        setError(resetErrorMessage(result.errorCode, locale, result.devMessage))
        if (result.errorCode === 'rate_limit') {
          startCooldown(RATE_LIMIT_COOLDOWN_SEC)
        }
      } else {
        setResetSent(true)
        startCooldown(SUCCESS_COOLDOWN_SEC)
      }
      return
    }

    const result = await login(new FormData(e.currentTarget))
    if (result?.error) {
      setError(t(locale, 'auth.wrongCredentials'))
      setLoading(false)
    }
  }

  const cooldownLabel = formatCooldown(cooldown)

  if (!mounted) return null

  return (
    <div className="w-full max-w-sm">
      <AuthBackButton />
      <div className="mb-3 flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/repra-wordmark-header.png"
          alt="REPRA"
          style={{ height: 40, width: 'auto', display: 'block', objectFit: 'contain' }}
        />
        <p style={{ fontSize: 12, fontWeight: 500, color: '#B8B8B8', marginTop: 10, letterSpacing: '0.02em' }}>
          Every rep becomes proof.
        </p>
      </div>
      <div style={{ height: 28 }} />

      {/* Password-reset success notice */}
      {notice && (
        <div className="mb-4 rounded-xl px-4 py-3 text-center" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <p className="text-sm font-bold" style={{ color: '#22c55e' }}>{notice}</p>
        </div>
      )}

      {mode === 'reset' ? (
        resetSent ? (
          /* ── Reset success ── */
          <div className="text-center">
            <p className="text-sm font-bold mb-2" style={{ color: '#22c55e' }}>
              {t(locale, 'auth.resetSent')}
            </p>
            <p className="text-sm mb-4" style={{ color: '#555' }}>
              {t(locale, 'auth.resetSentSub')}
            </p>
            {cooldown > 0 && (
              <p className="text-xs mb-4" style={{ color: '#555' }}>
                {t(locale, 'auth.sendAgainIn')} {cooldownLabel}
              </p>
            )}
            <button
              onClick={() => { setMode('login'); setResetSent(false); setError(null) }}
              className="text-sm font-black"
              style={{ color: '#ED742F' }}>
              {t(locale, 'auth.backToSignIn')}
            </button>
          </div>
        ) : (
          /* ── Reset form ── */
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-xs font-bold" style={{ color: '#888' }}>
              {t(locale, 'auth.resetPrompt')}
            </p>
            <div>
              <label className="text-[10px] font-black tracking-widest mb-2 block" style={{ color: '#555' }}>
                {t(locale, 'auth.emailLabel')}
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full h-12 rounded-xl px-4 text-white text-sm outline-none"
                style={{ background: '#171717', border: '1px solid #1e1e1e' }}
              />
            </div>

            {error && (
              <p className="text-sm text-center font-bold" style={{ color: '#ef4444' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || cooldown > 0}
              className="h-12 rounded-xl font-black text-sm mt-2 text-white tracking-widest"
              style={{ background: (loading || cooldown > 0) ? '#333' : '#ED742F' }}>
              {loading
                ? t(locale, 'auth.sending')
                : cooldown > 0
                  ? `${t(locale, 'auth.sendAgainIn')} ${cooldownLabel}`
                  : t(locale, 'auth.sendResetLink')}
            </button>

            <button
              type="button"
              onClick={() => { setMode('login'); setError(null) }}
              className="text-sm font-bold text-center"
              style={{ color: '#555' }}>
              {t(locale, 'auth.backToSignIn')}
            </button>
          </form>
        )
      ) : (
        /* ── Login form ── */
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-black tracking-widest mb-2 block" style={{ color: '#555' }}>
              {t(locale, 'auth.emailLabel')}
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full h-12 rounded-xl px-4 text-white text-sm outline-none"
              style={{ background: '#171717', border: '1px solid #1e1e1e' }}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black tracking-widest" style={{ color: '#555' }}>
                {t(locale, 'auth.passwordLabel')}
              </label>
              <button
                type="button"
                onClick={() => { setMode('reset'); setError(null) }}
                className="text-[10px] font-black tracking-widest"
                style={{ color: '#ED742F' }}>
                {t(locale, 'auth.forgotPassword')}
              </button>
            </div>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full h-12 rounded-xl px-4 text-white text-sm outline-none"
              style={{ background: '#171717', border: '1px solid #1e1e1e' }}
            />
          </div>

          {error && (
            <p className="text-sm text-center font-bold" style={{ color: '#ef4444' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-12 rounded-xl font-black text-sm mt-2 text-white tracking-widest"
            style={{ background: loading ? '#333' : '#ED742F' }}>
            {loading ? t(locale, 'auth.signingIn') : t(locale, 'auth.signIn')}
          </button>
        </form>
      )}

      {mode === 'login' && (
        <p className="text-center text-sm mt-6 font-bold" style={{ color: '#555' }}>
          {t(locale, 'auth.noAccount')}{' '}
          <Link href="/signup" className="font-black" style={{ color: '#ED742F' }}>
            {t(locale, 'auth.signUp')}
          </Link>
        </p>
      )}

      {/* Language toggle + legal links */}
      <div className="mt-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-1">
          {(['ja', 'en'] as LangPref[]).map((lp, i) => (
            <span key={lp} className="flex items-center gap-1">
              {i > 0 && <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11 }}>|</span>}
              <button
                onClick={() => setLangPref(lp)}
                style={{
                  fontSize: 11,
                  fontWeight: langPref === lp ? 700 : 400,
                  color: langPref === lp ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.28)',
                }}>
                {lp === 'ja' ? '日本語' : 'English'}
              </button>
            </span>
          ))}
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', textAlign: 'center' }}>
          <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.38)' }}>{t(locale, 'auth.privacyPolicy')}</Link>
          {' · '}
          <Link href="/terms" style={{ color: 'rgba(255,255,255,0.38)' }}>{t(locale, 'auth.termsOfUse')}</Link>
        </p>
      </div>
    </div>
  )
}
