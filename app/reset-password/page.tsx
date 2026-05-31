'use client'

// Supabase Dashboard → Authentication → URL Configuration → Redirect URLs must include:
//   http://localhost:3000/reset-password
//   https://<your-production-domain>/reset-password

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

    function settle(next: Stage) {
      if (settled) return
      settled = true
      console.log('[reset-password] settle →', next)
      setStage(next)
    }

    // Capture URL params immediately.
    // iPhone Gmail in-app browser can strip the hash on navigation,
    // so we read hash/search before any async work.
    const rawHash   = window.location.hash
    const rawSearch = window.location.search
    const hashParams   = new URLSearchParams(rawHash.slice(1))
    const searchParams = new URLSearchParams(rawSearch)

    const hasCode        = searchParams.has('code')
    const code           = searchParams.get('code') ?? ''
    const hasAccessToken = hashParams.has('access_token')
    const hasHashError   = hashParams.has('error')
    const hashType       = hashParams.get('type') ?? ''
    // Implicit flow:  #access_token=...&type=recovery
    const isRecoveryHash = hasAccessToken && hashType === 'recovery'
    // Any signal that this might be a valid recovery link
    const hasRecoverySignal =
      hasCode ||
      isRecoveryHash ||
      rawSearch.includes('type=recovery') ||
      rawHash.includes('type=recovery')

    console.log('[reset-password] url state', {
      hasCode,
      hasAccessToken,
      hasHashError,
      hashType,
      isRecoveryHash,
      hasRecoverySignal,
      search: rawSearch,
      hash:   rawHash.substring(0, 100),
    })

    // Supabase returns #error=... when the link is genuinely expired/invalid
    if (hasHashError) {
      console.error('[reset-password] hash error', {
        error: hashParams.get('error'),
        desc:  hashParams.get('error_description'),
      })
      settle('invalid')
      return
    }

    // ── onAuthStateChange ──────────────────────────────────────────────────
    // PASSWORD_RECOVERY fires after Supabase exchanges the recovery token
    // (both implicit hash flow and PKCE code flow).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[reset-password] auth event', { event, hasSession: !!session })

      if (event === 'PASSWORD_RECOVERY') {
        // Recovery session is established — show the password form
        settle('form')
        return
      }

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        if (!hasRecoverySignal) {
          // No recovery params in URL → bare page visit or already-used link
          settle('invalid')
        }
        // Recovery signal present → keep loading; wait for PASSWORD_RECOVERY
        // or the explicit exchange fallback below
      }
    })

    // ── Explicit PKCE ?code= exchange fallback ─────────────────────────────
    // When the user opens the reset link in Gmail's in-app browser on iPhone,
    // the PKCE code-verifier cookie set in the original browser is absent.
    // createBrowserClient tries to exchange the code automatically, but may
    // fail silently, so PASSWORD_RECOVERY never fires.
    // After giving onAuthStateChange 1.5 s to handle it, we try explicitly.
    let exchangeAttempted = false
    const exchangeTimer = hasCode
      ? setTimeout(async () => {
          if (settled || exchangeAttempted) return
          exchangeAttempted = true
          console.log('[reset-password] explicit exchangeCodeForSession')
          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code)
            if (error) {
              console.error('[reset-password] exchangeCodeForSession error', {
                message: error.message,
                status:  (error as { status?: number }).status,
              })
              // Don't settle invalid yet — let the hard timeout decide.
              // (The auto-exchange via onAuthStateChange might still succeed.)
            } else if (data?.session) {
              console.log('[reset-password] explicit exchange ok')
              // PASSWORD_RECOVERY should fire through onAuthStateChange.
              // If it hasn't arrived within 500 ms, settle form directly.
              setTimeout(() => settle('form'), 500)
            }
          } catch (err) {
            console.error('[reset-password] exchangeCodeForSession threw', err)
          }
        }, 1500)
      : null

    // ── Hard timeout ───────────────────────────────────────────────────────
    // If nothing settles in 10 s (no PASSWORD_RECOVERY, no explicit exchange
    // success), the link is truly invalid or expired.
    const timeout = setTimeout(() => {
      console.log('[reset-password] hard timeout, hasRecoverySignal:', hasRecoverySignal)
      settle('invalid')
    }, 10000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
      if (exchangeTimer) clearTimeout(exchangeTimer)
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
      console.error('[reset-password] updateUser error', {
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
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Checking reset link…
            </p>
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
                {submitting ? 'UPDATING…' : 'UPDATE PASSWORD'}
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
