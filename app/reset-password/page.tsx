'use client'

// Supabase Dashboard → Authentication → URL Configuration → Redirect URLs must include:
//   http://localhost:3000/reset-password
//   https://liftsnap-dpfso8sip-hkbaseball51-stars-projects.vercel.app/reset-password
//   (add custom domain once configured)

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Stage = 'loading' | 'invalid' | 'form' | 'done'

export default function ResetPasswordPage() {
  const [stage,       setStage]       = useState<Stage>('loading')
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [fieldError,  setFieldError]  = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting,  setSubmitting]  = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let settled = false

    const settle = (next: Stage) => {
      if (!settled) { settled = true; setStage(next) }
    }

    // Supabase browser client auto-exchanges the recovery token in the URL
    // (both hash-based implicit flow and PKCE code flow).
    // PASSWORD_RECOVERY fires once the session is established from the reset link.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        settle('form')
      } else if (event === 'INITIAL_SESSION') {
        const hasToken = typeof window !== 'undefined'
          && (window.location.hash.includes('access_token') || window.location.search.includes('code='))
        if (!hasToken) {
          // No recovery token in URL — link is missing, invalid, or already used
          settle(session ? 'form' : 'invalid')
        }
        // Token present → wait for PASSWORD_RECOVERY to fire after exchange
      }
    })

    // Safety net: if auth state event never fires in 5s, show invalid
    const timer = setTimeout(() => settle('invalid'), 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
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

    setSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      console.error('Password update error:', {
        message: error.message,
        status:  (error as { status?: number }).status,
        name:    error.name,
        code:    (error as { code?: string }).code,
      })
      setSubmitError('Could not update password. Please try again.')
      setSubmitting(false)
      return
    }

    // Sign out so the user re-authenticates fresh with the new password
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

        {/* ── Loading ── */}
        {stage === 'loading' && (
          <div className="text-center">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>Verifying reset link…</p>
          </div>
        )}

        {/* ── Invalid / expired link ── */}
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
        {stage === 'form' && (
          <>
            <p className="text-center text-sm font-bold mb-6" style={{ color: '#888' }}>
              Set new password
            </p>
            <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Enter your new password below.
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
                disabled={submitting}
                className="h-12 rounded-xl font-black text-sm mt-2 text-white tracking-widest"
                style={{ background: submitting ? '#333' : '#ED742F' }}>
                {submitting ? 'UPDATING...' : 'UPDATE PASSWORD'}
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
