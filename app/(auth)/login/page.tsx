'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { login, resetPassword } from '@/actions/auth'
import type { ResetErrorCode } from '@/actions/auth'
import AuthBackButton from '@/components/auth/AuthBackButton'

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

function resetErrorMessage(code: ResetErrorCode, devMessage?: string): string {
  switch (code) {
    case 'rate_limit':
      return 'Too many reset emails were requested. Please wait about 5 minutes before trying again.'
    case 'redirect_error':
      return devMessage
        ? `Could not send reset email. Please try again later. (dev: ${devMessage})`
        : 'Could not send reset email. Please try again later.'
    default:
      return 'Could not send reset email. Please try again later.'
  }
}

export default function LoginPage() {
  const [mode,      setMode]      = useState<Mode>('login')
  const [error,     setError]     = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [cooldown,  setCooldown]  = useState(0)

  // Restore cooldown from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COOLDOWN_STORAGE_KEY)
      if (stored) {
        const remaining = Math.ceil((parseInt(stored, 10) - Date.now()) / 1000)
        if (remaining > 0) setCooldown(remaining)
      }
    } catch {}
  }, [])

  // Countdown tick
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
        setError(resetErrorMessage(result.errorCode, result.devMessage))
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
      setError('Incorrect email or password')
      setLoading(false)
    }
  }

  const cooldownLabel = formatCooldown(cooldown)

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

      {mode === 'reset' ? (
        resetSent ? (
          /* ── Reset success ── */
          <div className="text-center">
            <p className="text-sm font-bold mb-2" style={{ color: '#22c55e' }}>
              Reset link sent. Please check your email.
            </p>
            <p className="text-sm mb-4" style={{ color: '#555' }}>
              Follow the link in your inbox to reset your password.
            </p>
            {cooldown > 0 && (
              <p className="text-xs mb-4" style={{ color: '#555' }}>
                Send again in {cooldownLabel}
              </p>
            )}
            <button
              onClick={() => { setMode('login'); setResetSent(false); setError(null) }}
              className="text-sm font-black"
              style={{ color: '#ED742F' }}>
              Back to Sign In
            </button>
          </div>
        ) : (
          /* ── Reset form ── */
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-xs font-bold" style={{ color: '#888' }}>
              Enter your email and we&apos;ll send a reset link.
            </p>
            <div>
              <label className="text-[10px] font-black tracking-widest mb-2 block" style={{ color: '#555' }}>
                EMAIL
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
                ? 'SENDING...'
                : cooldown > 0
                  ? `Send again in ${cooldownLabel}`
                  : 'SEND RESET LINK'}
            </button>

            <button
              type="button"
              onClick={() => { setMode('login'); setError(null) }}
              className="text-sm font-bold text-center"
              style={{ color: '#555' }}>
              Back to Sign In
            </button>
          </form>
        )
      ) : (
        /* ── Login form ── */
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-black tracking-widest mb-2 block" style={{ color: '#555' }}>
              EMAIL
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
                PASSWORD
              </label>
              <button
                type="button"
                onClick={() => { setMode('reset'); setError(null) }}
                className="text-[10px] font-black tracking-widest"
                style={{ color: '#ED742F' }}>
                FORGOT PASSWORD?
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
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </form>
      )}

      {mode === 'login' && (
        <p className="text-center text-sm mt-6 font-bold" style={{ color: '#555' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-black" style={{ color: '#ED742F' }}>
            Sign up
          </Link>
        </p>
      )}
    </div>
  )
}
