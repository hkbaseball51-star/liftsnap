'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { signup } from '@/actions/auth'
import AuthBackButton from '@/components/auth/AuthBackButton'

const SIGNUP_RATE_LIMIT_COOLDOWN_SEC = 600   // 10 minutes
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
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [cooldown, setCooldown] = useState(0)

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
    const result = await signup(new FormData(e.currentTarget))
    if (result?.error) {
      if (isRateLimitError(result.error)) {
        setError('Too many email requests. Please wait about 10 minutes before trying again.')
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
    ? 'CREATING...'
    : cooldown > 0
      ? `Try again in ${cooldownLabel}`
      : 'CREATE ACCOUNT'

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
      <p className="text-center text-sm mb-6 font-bold" style={{ color: '#555', marginTop: 20 }}>Create your account</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-[10px] font-black tracking-widest mb-2 block" style={{ color: '#555' }}>
            DISPLAY NAME
          </label>
          <input
            name="display_name"
            type="text"
            required
            placeholder="e.g. Kenichi"
            className="w-full h-12 rounded-xl px-4 text-white text-sm outline-none placeholder:text-[#333]"
            style={{ background: '#171717', border: '1px solid #1e1e1e' }}
          />
        </div>
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
          <label className="text-[10px] font-black tracking-widest mb-2 block" style={{ color: '#555' }}>
            PASSWORD <span style={{ color: '#333' }}>(8+ characters)</span>
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
        Already have an account?{' '}
        <Link href="/login" className="font-black" style={{ color: '#ED742F' }}>
          Sign in
        </Link>
      </p>
    </div>
  )
}
