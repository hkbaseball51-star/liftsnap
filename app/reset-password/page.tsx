'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// Supabase Dashboard → Authentication → URL Configuration → Redirect URLs must include:
//   http://localhost:3000/reset-password
//   https://liftsnap.vercel.app/reset-password
// Set NEXT_PUBLIC_SITE_URL=https://liftsnap.vercel.app in Vercel project settings.

type Stage = 'checking' | 'valid' | 'invalid' | 'updating' | 'done'

export default function ResetPasswordPage() {
  const [stage,       setStage]       = useState<Stage>('checking')
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [fieldError,  setFieldError]  = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const settled = useRef(false)

  useEffect(() => {
    const supabase = createClient()

    function settle(next: 'valid' | 'invalid') {
      if (settled.current) return
      settled.current = true
      setStage(next)
    }

    // Fast path: Supabase auto-exchanges the PKCE code and fires PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        settle('valid')
      }
    })

    // Safety net: if nothing resolves in 8 s the link is truly invalid
    const timeout = setTimeout(() => settle('invalid'), 8000)

    async function check() {
      try {
        // Read URL params immediately before any async work.
        // iPhone Gmail in-app browser can strip hash on navigation, so capture first.
        const rawHash      = window.location.hash
        const rawSearch    = window.location.search
        const hashParams   = new URLSearchParams(rawHash.slice(1))
        const searchParams = new URLSearchParams(rawSearch)

        // A. Explicit error in URL → definitely invalid
        if (searchParams.has('error') || hashParams.has('error')) {
          settle('invalid')
          return
        }

        // B. PKCE code flow: /reset-password?code=xxxxx
        const code = searchParams.get('code')
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          settle(error ? 'invalid' : 'valid')
          return
        }

        // C. Implicit hash flow: #access_token=...&refresh_token=...&type=recovery
        const accessToken  = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token:  accessToken,
            refresh_token: refreshToken,
          })
          settle(error ? 'invalid' : 'valid')
          return
        }

        // D. Session already established (auto-exchange completed before useEffect ran)
        const { data: { session } } = await supabase.auth.getSession()
        settle(session ? 'valid' : 'invalid')
      } catch (err) {
        console.error('[reset-password] check error', err)
        settle('invalid')
      }
    }

    check().finally(() => clearTimeout(timeout))

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFieldError(null)
    setSubmitError(null)

    if (password.length < 8) {
      setFieldError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setFieldError('Passwords do not match.')
      return
    }

    setStage('updating')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setSubmitError('Could not update password. Please try again.')
      setStage('valid')
      return
    }

    await supabase.auth.signOut()
    setStage('done')
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: '#0a0a0a' }}>
      <div className="w-full max-w-sm">

        {/* ── Logo ── */}
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

        {/* ── Checking ── */}
        {stage === 'checking' && (
          <div className="text-center">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Checking reset link…
            </p>
          </div>
        )}

        {/* ── Invalid / expired ── */}
        {stage === 'invalid' && (
          <div className="text-center flex flex-col gap-4">
            <p className="text-sm font-bold" style={{ color: '#ef4444' }}>
              This reset link is invalid or expired.
            </p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Please request a new password reset link.
            </p>
            <Link
              href="/login"
              className="h-12 rounded-xl font-black text-sm text-white tracking-widest flex items-center justify-center"
              style={{ background: '#ED742F' }}>
              BACK TO SIGN IN
            </Link>
          </div>
        )}

        {/* ── Password form ── */}
        {(stage === 'valid' || stage === 'updating') && (
          <>
            <p className="text-center text-sm font-bold mb-6" style={{ color: '#888' }}>
              Set new password
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-black tracking-widest mb-2 block" style={{ color: '#555' }}>
                  NEW PASSWORD <span style={{ color: '#333' }}>(8+ characters)</span>
                </label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-12 rounded-xl px-4 text-white text-sm outline-none"
                  style={{ background: '#171717', border: '1px solid #1e1e1e' }}
                />
              </div>

              <div>
                <label className="text-[10px] font-black tracking-widest mb-2 block" style={{ color: '#555' }}>
                  CONFIRM PASSWORD
                </label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="w-full h-12 rounded-xl px-4 text-white text-sm outline-none"
                  style={{ background: '#171717', border: '1px solid #1e1e1e' }}
                />
              </div>

              {fieldError && (
                <p className="text-sm text-center font-bold" style={{ color: '#ef4444' }}>{fieldError}</p>
              )}
              {submitError && (
                <p className="text-sm text-center font-bold" style={{ color: '#ef4444' }}>{submitError}</p>
              )}

              <button
                type="submit"
                disabled={stage === 'updating'}
                className="h-12 rounded-xl font-black text-sm mt-2 text-white tracking-widest"
                style={{ background: stage === 'updating' ? '#333' : '#ED742F' }}>
                {stage === 'updating' ? 'UPDATING…' : 'UPDATE PASSWORD'}
              </button>
            </form>

            <p className="text-center text-sm mt-6 font-bold" style={{ color: '#555' }}>
              <Link href="/login" className="font-black" style={{ color: '#ED742F' }}>
                Back to Sign In
              </Link>
            </p>
          </>
        )}

        {/* ── Success ── */}
        {stage === 'done' && (
          <div className="text-center flex flex-col gap-4">
            <p className="text-sm font-bold" style={{ color: '#22c55e' }}>
              Password updated successfully.
            </p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Please sign in again with your new password.
            </p>
            <Link
              href="/login"
              className="h-12 rounded-xl font-black text-sm text-white tracking-widest flex items-center justify-center"
              style={{ background: '#ED742F' }}>
              SIGN IN
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
