'use client'

import { useState } from 'react'
import Link from 'next/link'
import { login, resetPassword } from '@/actions/auth'

type Mode = 'login' | 'reset'

export default function LoginPage() {
  const [mode, setMode]       = useState<Mode>('login')
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (mode === 'reset') {
      const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value
      const result = await resetPassword(email)
      setLoading(false)
      if (result?.error) {
        setError('Could not send reset email. Please try again.')
      } else {
        setResetSent(true)
      }
      return
    }

    const result = await login(new FormData(e.currentTarget))
    if (result?.error) {
      setError('Incorrect email or password')
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
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
          <div className="text-center">
            <p className="text-sm font-bold mb-2" style={{ color: '#22c55e' }}>
              Password reset email sent.
            </p>
            <p className="text-sm mb-6" style={{ color: '#555' }}>
              Check your inbox and follow the link to reset your password.
            </p>
            <button
              onClick={() => { setMode('login'); setResetSent(false); setError(null) }}
              className="text-sm font-black"
              style={{ color: '#ED742F' }}>
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-xs font-bold" style={{ color: '#888' }}>
              Enter your email and we'll send a reset link.
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
              disabled={loading}
              className="h-12 rounded-xl font-black text-sm mt-2 text-white tracking-widest"
              style={{ background: loading ? '#333' : '#ED742F' }}>
              {loading ? 'SENDING...' : 'SEND RESET LINK'}
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
          Don't have an account?{' '}
          <Link href="/signup" className="font-black" style={{ color: '#ED742F' }}>
            Sign up
          </Link>
        </p>
      )}
    </div>
  )
}
