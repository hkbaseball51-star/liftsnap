'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Supabase Dashboard → Authentication → URL Configuration → Redirect URLs must include:
//   http://localhost:3000/reset-password
//   https://liftsnap.vercel.app/reset-password
// Set NEXT_PUBLIC_SITE_URL=https://liftsnap.vercel.app in Vercel project settings.

type Stage = 'checking' | 'valid' | 'invalid' | 'updating' | 'done'

const DEV = process.env.NODE_ENV !== 'production'
function dbg(msg: string)    { if (DEV) console.log(`[reset-password] ${msg}`) }
function dbgErr(msg: string) { if (DEV) console.error(`[reset-password] ${msg}`) }

/** Map Supabase error messages to user-safe strings without leaking internals. */
function mapUpdateError(msg: string): string {
  const m = msg.toLowerCase()
  // Exact Supabase error strings (checked first, most specific)
  if (m.includes('auth session missing')) {
    return 'Session expired. Please request a new reset link.'
  }
  if (m.includes('new password should be different from the old password')) {
    return 'Please use a different password from your current one.'
  }
  if (m.includes('password should be at least')) {
    return 'Password must be at least 8 characters.'
  }
  // Broader fallbacks
  if (m.includes('session') || m.includes('missing') || m.includes('logged in') || m.includes('not authenticated')) {
    return 'Session expired. Please request a new reset link.'
  }
  if (m.includes('different') || m.includes('same password')) {
    return 'Please use a different password from your current one.'
  }
  if (m.includes('password') && (m.includes('weak') || m.includes('strength') || m.includes('policy'))) {
    return 'Password must be at least 8 characters.'
  }
  return 'Could not update password. Please request a new reset link.'
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [stage,       setStage]       = useState<Stage>('checking')
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [showNew,     setShowNew]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Single Supabase client shared across useEffect and handleSubmit.
  // createBrowserClient (from @supabase/ssr) stores the session in cookies,
  // but sharing one instance ensures the in-memory session is never missed.
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const settled = useRef(false)

  useEffect(() => {
    const supabase = getSupabase()

    function settle(next: 'valid' | 'invalid') {
      if (settled.current) return
      settled.current = true
      setStage(next)
    }

    // Fast path: Supabase fires PASSWORD_RECOVERY once the code is exchanged
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        dbg('session exists (PASSWORD_RECOVERY event)')
        settle('valid')
      }
    })

    // 8 s safety-net — only truly invalid/expired links need this
    const timeout = setTimeout(() => {
      dbgErr('timeout: no valid session after 8 s')
      settle('invalid')
    }, 8000)

    async function check() {
      try {
        const rawHash    = window.location.hash
        const rawSearch  = window.location.search
        const hashParams = new URLSearchParams(rawHash.slice(1))
        const srchParams = new URLSearchParams(rawSearch)

        const urlError = srchParams.get('error') ?? hashParams.get('error') ?? ''
        const code     = srchParams.get('code') ?? ''

        // A. Explicit error in URL (Supabase sets this for expired/denied links)
        if (urlError) {
          dbgErr(`url error param: ${urlError}`)
          settle('invalid')
          return
        }

        // B. PKCE code: /reset-password?code=XXXX
        if (code) {
          dbg('code exists')
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (data?.session) {
            dbg('exchange success')
            settle('valid')
            return
          }
          // Log error but do NOT settle invalid yet — getSession() is the fallback.
          // @supabase/ssr may have auto-consumed the code on the first render.
          dbgErr(`exchange error: ${error?.message ?? 'unknown'}`)
        }

        // C. Implicit / legacy hash flow: #access_token=…&refresh_token=…&type=recovery
        // (Token values are intentionally not logged)
        const at = hashParams.get('access_token')
        const rt = hashParams.get('refresh_token')
        if (at && rt) {
          const { error } = await supabase.auth.setSession({ access_token: at, refresh_token: rt })
          if (!error) {
            dbg('session exists (hash tokens)')
            settle('valid')
          } else {
            dbgErr(`set_session error: ${error.message}`)
            settle('invalid')
          }
          return
        }

        // D. Session may have been established by PASSWORD_RECOVERY event or a
        //    prior auto-exchange — check before giving up.
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          dbg('session exists (getSession fallback)')
          settle('valid')
        } else {
          dbgErr(code ? 'exchange_failed_no_session' : 'no_code_no_hash_no_session')
          settle('invalid')
        }
      } catch (err) {
        dbgErr(`exception: ${err instanceof Error ? err.message : String(err)}`)
        settle('invalid')
      }
    }

    check().finally(() => clearTimeout(timeout))

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Derived validation state ──────────────────────────────────────
  const trimmedPw   = password.trim()
  const tooShort    = trimmedPw.length > 0 && trimmedPw.length < 8
  const mismatch    = confirm.length > 0 && password !== confirm
  const bothMatch   = confirm.length > 0 && password === confirm && trimmedPw.length >= 8

  const isDisabled =
    stage === 'updating' ||
    trimmedPw.length < 8 ||
    confirm.length < 8 ||
    password !== confirm

  // ── Submit ────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitError(null)

    // Guard 1: empty fields
    if (!password || !confirm) {
      setSubmitError('Please enter your new password.')
      return
    }
    // Guard 2: too short
    if (trimmedPw.length < 8) {
      setSubmitError('Password must be at least 8 characters.')
      return
    }
    // Guard 3: mismatch — never reach updateUser
    if (password !== confirm) {
      setSubmitError('Passwords do not match.')
      return
    }

    setStage('updating')

    // Use the same client that established the recovery session (in-memory + cookie).
    const supabase = getSupabase()

    // ── Debug: URL state at submit time ──────────────────────────────
    const codeParam = new URLSearchParams(window.location.search).get('code')
    console.log('[reset-password] pathname:', window.location.pathname)
    console.log('[reset-password] code param exists:', !!codeParam)

    // Pre-flight: confirm the recovery session is still active before updating.
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('[reset-password] before update session exists:', !!session)
    console.log('[reset-password] before update user exists:', !!session?.user)
    if (sessionError) console.error('[reset-password] session error:', sessionError.message)

    if (!session) {
      dbgErr('no session before updateUser — recovery session expired or not established')
      setSubmitError('Session expired. Please request a new reset link.')
      setStage('valid')
      return
    }

    const { error } = await supabase.auth.updateUser({ password })
    console.log('[reset-password] update success:', !error)

    if (error) {
      console.error('[reset-password] update error message:', error.message)
      console.error('[reset-password] update error status:', error.status)
      console.error('[reset-password] update error name:', error.name)
      setSubmitError(mapUpdateError(error.message))
      setStage('valid')
      return
    }

    // Sign out so the recovery session is invalidated and the user starts fresh.
    await supabase.auth.signOut()
    setStage('done')
    // Give the user a moment to see the success message, then push to login
    setTimeout(() => router.push('/login?reset=success'), 1500)
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

              {/* New password */}
              <div>
                <label className="text-[10px] font-black tracking-widest mb-2 block" style={{ color: '#555' }}>
                  NEW PASSWORD <span style={{ color: '#333' }}>(8+ characters)</span>
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setSubmitError(null) }}
                    className="w-full h-12 rounded-xl text-white text-sm outline-none"
                    style={{
                      background: '#171717',
                      border: `1px solid ${tooShort ? 'rgba(239,68,68,0.50)' : '#1e1e1e'}`,
                      paddingLeft: 16,
                      paddingRight: 44,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(v => !v)}
                    aria-label={showNew ? 'Hide new password' : 'Show new password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center"
                    style={{ color: 'rgba(255,255,255,0.38)', lineHeight: 1 }}>
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {tooShort && (
                  <p className="mt-1.5 text-[11px]" style={{ color: '#ef4444' }}>
                    Password must be at least 8 characters.
                  </p>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="text-[10px] font-black tracking-widest mb-2 block" style={{ color: '#555' }}>
                  CONFIRM PASSWORD
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setSubmitError(null) }}
                    className="w-full h-12 rounded-xl text-white text-sm outline-none"
                    style={{
                      background: '#171717',
                      border: `1px solid ${mismatch ? 'rgba(239,68,68,0.50)' : '#1e1e1e'}`,
                      paddingLeft: 16,
                      paddingRight: 44,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center"
                    style={{ color: 'rgba(255,255,255,0.38)', lineHeight: 1 }}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* Inline match/mismatch hint */}
                {mismatch && (
                  <p className="mt-1.5 text-[11px]" style={{ color: '#ef4444' }}>
                    Passwords do not match.
                  </p>
                )}
                {bothMatch && (
                  <p className="mt-1.5 text-[11px]" style={{ color: '#22c55e' }}>
                    Passwords match.
                  </p>
                )}
              </div>

              {/* Submit-level error (session / updateUser errors) */}
              {submitError && (
                <p className="text-sm text-center" style={{ color: '#ef4444' }}>{submitError}</p>
              )}

              <button
                type="submit"
                disabled={isDisabled}
                className="h-12 rounded-xl font-black text-sm mt-2 tracking-widest transition-colors"
                style={{
                  background:  isDisabled ? '#222' : '#ED742F',
                  color:       isDisabled ? 'rgba(255,255,255,0.28)' : '#fff',
                  cursor:      isDisabled ? 'not-allowed' : 'pointer',
                }}>
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
              Redirecting to sign in…
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
