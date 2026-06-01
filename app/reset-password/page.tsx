'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// Supabase Dashboard → Authentication → URL Configuration → Redirect URLs must include:
//   http://localhost:3000/reset-password
//   https://liftsnap.vercel.app/reset-password
// Set NEXT_PUBLIC_SITE_URL=https://liftsnap.vercel.app in Vercel project settings.

type Stage = 'checking' | 'valid' | 'invalid' | 'updating' | 'done'

// ── DEBUG: remove this block after diagnosis ──────────────────────────────────
type DebugInfo = {
  hrefHasCode:          boolean
  search:               string
  hashExists:           boolean
  codeExists:           boolean
  urlError:             string
  urlErrorCode:         string
  exchangeAttempted:    boolean
  exchangeSuccess:      boolean
  exchangeError:        string
  getSessionAttempted:  boolean
  getSessionSuccess:    boolean
  authEvent:            string
  finalStatus:          string
  invalidReason:        string
}
const emptyDebug: DebugInfo = {
  hrefHasCode:          false,
  search:               '',
  hashExists:           false,
  codeExists:           false,
  urlError:             '',
  urlErrorCode:         '',
  exchangeAttempted:    false,
  exchangeSuccess:      false,
  exchangeError:        '',
  getSessionAttempted:  false,
  getSessionSuccess:    false,
  authEvent:            '',
  finalStatus:          '',
  invalidReason:        '',
}
// ─────────────────────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  const [stage,       setStage]       = useState<Stage>('checking')
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [fieldError,  setFieldError]  = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const settled    = useRef(false)
  // DEBUG: remove after diagnosis
  const [dbg, setDbg] = useState<DebugInfo>(emptyDebug)
  const dbgRef = useRef<DebugInfo>(emptyDebug)
  function patchDbg(patch: Partial<DebugInfo>) {
    dbgRef.current = { ...dbgRef.current, ...patch }
    setDbg({ ...dbgRef.current })
  }

  useEffect(() => {
    const supabase = createClient()

    function settle(next: 'valid' | 'invalid', reason = '') {
      if (settled.current) return
      settled.current = true
      patchDbg({ finalStatus: next, invalidReason: reason })
      setStage(next)
    }

    // Fast path: Supabase auto-exchanges the PKCE code and fires PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      patchDbg({ authEvent: event })
      if (event === 'PASSWORD_RECOVERY' && session) {
        settle('valid')
      }
    })

    // Safety net: if nothing resolves in 8 s the link is truly invalid
    const timeout = setTimeout(() => settle('invalid', 'timeout_8s'), 8000)

    async function check() {
      try {
        // Read URL params immediately — iPhone Gmail in-app browser can strip hash
        const rawHash      = window.location.hash
        const rawSearch    = window.location.search
        const hashParams   = new URLSearchParams(rawHash.slice(1))
        const searchParams = new URLSearchParams(rawSearch)

        const urlErrorParam = searchParams.get('error') ?? hashParams.get('error') ?? ''
        const urlErrorCode  = searchParams.get('error_code') ?? hashParams.get('error_code') ?? ''
        const code          = searchParams.get('code') ?? ''

        patchDbg({
          hrefHasCode: window.location.href.includes('code='),
          search:      rawSearch.slice(0, 120),   // truncate for display, no token values
          hashExists:  rawHash.length > 1,
          codeExists:  !!code,
          urlError:    urlErrorParam,
          urlErrorCode,
        })

        // A. Explicit error in URL → invalid (only truly expired/denied links have this)
        if (urlErrorParam) {
          settle('invalid', `url_error:${urlErrorCode || urlErrorParam}`)
          return
        }

        // B. PKCE code flow: /reset-password?code=xxxxx
        if (code) {
          patchDbg({ exchangeAttempted: true })
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          patchDbg({
            exchangeSuccess: !!data?.session,
            exchangeError:   error?.message ?? '',
          })
          if (data?.session) {
            settle('valid')
            return
          }
          // Exchange failed — @supabase/ssr may have auto-consumed the code.
          // Fall through to getSession() which will find the established session.
        }

        // C. Implicit hash flow: #access_token=...&refresh_token=...&type=recovery
        // NOTE: we intentionally do NOT log token values
        const hasHashTokens = hashParams.has('access_token') && hashParams.has('refresh_token')
        if (hasHashTokens) {
          const at = hashParams.get('access_token')!
          const rt = hashParams.get('refresh_token')!
          const { error } = await supabase.auth.setSession({ access_token: at, refresh_token: rt })
          if (error) {
            settle('invalid', 'set_session_failed')
          } else {
            settle('valid')
          }
          return
        }

        // D. Session established via auto-exchange or PASSWORD_RECOVERY
        patchDbg({ getSessionAttempted: true })
        const { data: { session } } = await supabase.auth.getSession()
        patchDbg({ getSessionSuccess: !!session })
        if (session) {
          settle('valid')
        } else {
          const reason = code
            ? 'exchange_failed_no_session'
            : 'no_code_no_hash_no_session'
          settle('invalid', reason)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        patchDbg({ exchangeError: msg })
        settle('invalid', 'exception')
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

  // DEBUG panel — remove after diagnosis ──────────────────────────────────────
  const DebugPanel = () => (
    <div style={{
      marginTop: 32,
      padding: '10px 12px',
      borderRadius: 8,
      background: '#111',
      border: '1px solid #222',
      maxWidth: '90%',
      margin: '32px auto 0',
      wordBreak: 'break-all',
    }}>
      <p style={{ fontSize: 9, color: '#555', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}>
        DEBUG (remove after diagnosis)
      </p>
      {[
        ['hrefHasCode',         String(dbg.hrefHasCode)],
        ['search',              dbg.search || '(empty)'],
        ['hashExists',          String(dbg.hashExists)],
        ['codeExists',          String(dbg.codeExists)],
        ['urlError',            dbg.urlError        || '—'],
        ['urlErrorCode',        dbg.urlErrorCode    || '—'],
        ['exchangeAttempted',   String(dbg.exchangeAttempted)],
        ['exchangeSuccess',     String(dbg.exchangeSuccess)],
        ['exchangeError',       dbg.exchangeError   || '—'],
        ['getSessionAttempted', String(dbg.getSessionAttempted)],
        ['getSessionSuccess',   String(dbg.getSessionSuccess)],
        ['authEvent',           dbg.authEvent       || '(none yet)'],
        ['finalStatus',         dbg.finalStatus     || 'pending'],
        ['invalidReason',       dbg.invalidReason   || '—'],
      ].map(([k, v]) => (
        <div key={k} style={{ display: 'flex', gap: 6, fontSize: 10, lineHeight: 1.7 }}>
          <span style={{ color: '#555', minWidth: 140, flexShrink: 0 }}>{k}:</span>
          <span style={{ color: '#888' }}>{v}</span>
        </div>
      ))}
    </div>
  )
  // ─────────────────────────────────────────────────────────────────────────────

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

        {/* DEBUG: show on checking + invalid so we can see what happened — remove after diagnosis */}
        {(stage === 'checking' || stage === 'invalid') && <DebugPanel />}

      </div>
    </div>
  )
}
