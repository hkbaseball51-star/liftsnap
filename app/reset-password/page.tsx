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

function isRecoveryUser(user: { is_anonymous?: boolean; email?: string; phone?: string } | null | undefined): boolean {
  if (!user) return false
  if (user.is_anonymous) return false
  return !!(user.email || user.phone)
}

/** Map Supabase error messages to user-safe strings without leaking internals. */
function mapUpdateError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('auth session missing')) {
    return 'Session expired. Please request a new reset link.'
  }
  if (m.includes('new password should be different from the old password')) {
    return 'Please use a different password from your current one.'
  }
  if (m.includes('password should be at least')) {
    return 'Password must be at least 8 characters.'
  }
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

  // Single Supabase client shared across useEffect and handleSubmit so the
  // in-memory session established by exchangeCodeForSession is never missed.
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

    // Safety-net: truly invalid/expired links never resolve a code or session
    const timeout = setTimeout(() => {
      dbgErr('timeout: no valid recovery session after 8 s')
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

        // A. Supabase sets ?error= for expired or revoked links
        if (urlError) {
          dbgErr(`url error param: ${urlError}`)
          settle('invalid')
          return
        }

        // B. PKCE code: /reset-password?code=XXXX  (primary path)
        if (code) {
          dbg('code exists — starting exchange')

          // If an anonymous session is active it will shadow the recovery session.
          // Sign it out before exchanging so the exchange result is stored cleanly.
          const { data: existing } = await supabase.auth.getSession()
          if (existing.session?.user?.is_anonymous) {
            dbg('existing anonymous session — signing out before code exchange')
            await supabase.auth.signOut()
          }

          const { data, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)

          if (exchangeErr) {
            // @supabase/ssr middleware may have already consumed the code on first
            // render. Fall through to the getSession() check below.
            dbgErr(`exchange error: ${exchangeErr.message}`)
          }

          // Exchange returned a valid recovery session
          if (data?.session?.user) {
            const user = data.session.user
            if (!isRecoveryUser(user)) {
              console.error('[reset-password] exchange returned anonymous/no-email user')
              settle('invalid')
              return
            }
            dbg(`exchange success — user has email: ${!!user.email}`)
            settle('valid')
            return
          }

          // Exchange failed or returned no session — check if middleware already
          // established the session (getSession() picks it up from cookies).
          const { data: { session: existing2 } } = await supabase.auth.getSession()
          if (existing2?.user && isRecoveryUser(existing2.user)) {
            dbg('recovery session found via getSession fallback after exchange')
            settle('valid')
            return
          }

          dbgErr('exchange failed and no recovery session found')
          settle('invalid')
          return
        }

        // C. Legacy implicit hash flow: #access_token=…&type=recovery
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

        // D. No code, no hash — last resort: check cookie session, reject anonymous
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user && isRecoveryUser(session.user)) {
          dbg('recovery session found via getSession (no code/hash)')
          settle('valid')
        } else {
          dbgErr('no code, no hash, no recovery session')
          settle('invalid')
        }
      } catch (err) {
        dbgErr(`exception: ${err instanceof Error ? err.message : String(err)}`)
        settle('invalid')
      }
    }

    check().finally(() => clearTimeout(timeout))

    return () => { clearTimeout(timeout) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Derived validation state ──────────────────────────────────────
  const trimmedPw = password.trim()
  const tooShort  = trimmedPw.length > 0 && trimmedPw.length < 8
  const mismatch  = confirm.length > 0 && password !== confirm
  const bothMatch = confirm.length > 0 && password === confirm && trimmedPw.length >= 8

  const isDisabled =
    stage === 'updating' ||
    trimmedPw.length < 8 ||
    confirm.length < 8 ||
    password !== confirm

  // ── Submit ────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitError(null)

    // Input guards — these prevent reaching updateUser for client-side reasons
    if (!password || !confirm) {
      setSubmitError('Please enter your new password.')
      return
    }
    if (trimmedPw.length < 8) {
      setSubmitError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setSubmitError('Passwords do not match.')
      return
    }

    setStage('updating')

    const supabase = getSupabase()

    // Debug: URL state at submit time
    const codeParam = new URLSearchParams(window.location.search).get('code')
    dbg(`pathname: ${window.location.pathname}`)
    dbg(`code param exists: ${!!codeParam}`)

    // Pre-flight: verify the recovery session is still active
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    dbg(`session exists: ${!!session}`)
    dbg(`user exists: ${!!session?.user}`)
    dbg(`user has email: ${!!session?.user?.email}`)
    dbg(`user has phone: ${!!session?.user?.phone}`)
    dbg(`user is anonymous: ${!!session?.user?.is_anonymous}`)
    if (sessionError) dbgErr(`session error: ${sessionError.message}`)

    if (sessionError || !session?.user) {
      setSubmitError('Session expired. Please request a new reset link.')
      setStage('valid')
      return
    }

    // Block anonymous users — updateUser({ password }) returns 422 for them
    if (!isRecoveryUser(session.user)) {
      dbgErr('blocked: anonymous user or no email/phone')
      setSubmitError('This reset session is invalid. Please request a new reset link.')
      setStage('valid')
      return
    }

    const { error } = await supabase.auth.updateUser({ password })
    dbg(`update success: ${!error}`)

    if (error) {
      dbgErr(`update error message: ${error.message}`)
      dbgErr(`update error status: ${error.status}`)
      dbgErr(`update error name: ${error.name}`)
      setSubmitError(mapUpdateError(error.message))
      setStage('valid')
      return
    }

    // Invalidate the recovery session so it cannot be reused
    await supabase.auth.signOut()
    setStage('done')
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
                  background: isDisabled ? '#222' : '#ED742F',
                  color:      isDisabled ? 'rgba(255,255,255,0.28)' : '#fff',
                  cursor:     isDisabled ? 'not-allowed' : 'pointer',
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
