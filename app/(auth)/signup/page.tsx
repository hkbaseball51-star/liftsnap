'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { signup } from '@/actions/auth'
import AuthBackButton from '@/components/auth/AuthBackButton'
import { useLocale } from '@/lib/useLocale'
import { t } from '@/lib/i18n'
import type { LangPref } from '@/lib/i18n'

const SIGNUP_RATE_LIMIT_COOLDOWN_SEC = 600
const COOLDOWN_STORAGE_KEY           = 'repra_signup_cooldown_until'

function isRateLimitError(msg: string): boolean {
  const lower = msg.toLowerCase()
  return (
    lower.includes('email rate limit') ||
    lower.includes('rate limit')       ||
    lower.includes('too many')         ||
    lower.includes('for security purposes') ||
    lower.includes('please wait')
  )
}

function formatCooldown(secs: number): string {
  if (secs <= 0) return ''
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0
    ? `${m}:${String(s).padStart(2, '0')}`
    : `${s}s`
}

export default function SignupPage() {
  const { locale, langPref, setLangPref, mounted } = useLocale()
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [cooldown, setCooldown] = useState(0)

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
    const result = await signup(new FormData(e.currentTarget))
    if (result?.error) {
      if (isRateLimitError(result.error)) {
        setError(t(locale, 'auth.signupRateLimit'))
        startCooldown(SIGNUP_RATE_LIMIT_COOLDOWN_SEC)
      } else {
        setError(result.error)
      }
      setLoading(false)
    }
  }

  const cooldownLabel   = formatCooldown(cooldown)
  const buttonDisabled  = loading || cooldown > 0
  const buttonBg        = buttonDisabled ? '#333' : '#ED742F'
  const buttonLabel     = loading
    ? t(locale, 'auth.creating')
    : cooldown > 0
      ? `${t(locale, 'auth.sendAgainIn')} ${cooldownLabel}`
      : t(locale, 'auth.createAccount')

  if (!mounted) return null

  return (
    <div className="w-full max-w-sm">
      <AuthBackButton />
      {/* Logo */}
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
      <p className="text-center text-sm mb-6 font-bold" style={{ color: '#555', marginTop: 20 }}>
        {t(locale, 'auth.createYourAccount')}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-[10px] font-black tracking-widest mb-2 block" style={{ color: '#555' }}>
            {t(locale, 'auth.displayNameLabel')}
          </label>
          <input
            name="display_name"
            type="text"
            required
            placeholder={t(locale, 'auth.displayNamePlaceholder')}
            className="w-full h-12 rounded-xl px-4 text-white text-sm outline-none placeholder:text-[#333]"
            style={{ background: '#171717', border: '1px solid #1e1e1e' }}
          />
        </div>
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
          <label className="text-[10px] font-black tracking-widest mb-2 block" style={{ color: '#555' }}>
            {t(locale, 'auth.passwordLabel')}{' '}
            <span style={{ color: '#333' }}>{t(locale, 'auth.passwordMin')}</span>
          </label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full h-12 rounded-xl px-4 text-white text-sm outline-none"
            style={{ background: '#171717', border: '1px solid #1e1e1e' }}
          />
        </div>

        {error && (
          <p className="text-sm text-center font-bold" style={{ color: '#ef4444' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={buttonDisabled}
          className="h-12 rounded-xl font-black text-sm mt-2 text-white tracking-widest"
          style={{ background: buttonBg }}>
          {buttonLabel}
        </button>
      </form>

      <p className="text-center text-sm mt-6 font-bold" style={{ color: '#555' }}>
        {t(locale, 'auth.haveAccount')}{' '}
        <Link href="/login" className="font-black" style={{ color: '#ED742F' }}>
          {t(locale, 'auth.signInLink')}
        </Link>
      </p>

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
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', textAlign: 'center', lineHeight: 1.6 }}>
          {t(locale, 'auth.agreePrefix')}{' '}
          <Link href="/terms" style={{ color: 'rgba(255,255,255,0.50)' }}>{t(locale, 'auth.termsOfUse')}</Link>
          {' '}{t(locale, 'auth.and')}{' '}
          <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.50)' }}>{t(locale, 'auth.privacyPolicy')}</Link>
          {t(locale, 'auth.agreeSuffix')}
        </p>
      </div>
    </div>
  )
}
