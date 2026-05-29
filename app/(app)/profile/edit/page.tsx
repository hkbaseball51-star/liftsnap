'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updateDisplayName } from '@/actions/profile'

const TRAINING_STYLES = ['PPL', 'Push/Pull', 'Strength', 'Hypertrophy', 'HIIT', 'General']

const soonBadge = (
  <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-full ml-1.5"
    style={{
      background: 'rgba(255,255,255,0.07)',
      color:      'rgba(255,255,255,0.52)',
      border:     '1px solid rgba(255,255,255,0.08)',
    }}>
    SOON
  </span>
)

const labelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.58)',
}

export default function EditProfilePage() {
  const router = useRouter()
  const [loading, setLoading]   = useState(true)
  const [displayName, setName]  = useState('')
  const [email, setEmail]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [focused, setFocused]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setEmail(user.email ?? '')
      supabase.from('profiles').select('display_name').eq('id', user.id).single()
        .then(({ data }) => {
          setName((data?.display_name as string | null) ?? '')
          setLoading(false)
        })
    })
  }, [router])

  const handleSave = async () => {
    if (!displayName.trim()) return
    setSaving(true)
    setError(null)
    try {
      await updateDisplayName(displayName)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const derivedUsername = '@' + email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
  const canSave = !saving && !!displayName.trim()

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-6">
        <Link href="/profile" className="p-1 -ml-1 active:opacity-70">
          <ChevronLeft size={22} style={{ color: 'rgba(255,255,255,0.55)' }} />
        </Link>
        <h1 className="flex-1 text-base font-black tracking-widest" style={{ color: '#f5f5f5' }}>
          EDIT PROFILE
        </h1>
        {saved && <Check size={18} style={{ color: '#22c55e' }} />}
      </div>

      {loading ? (
        <div className="px-4 space-y-5 animate-pulse">
          {[80, 60, 100, 80].map((w, i) => (
            <div key={i}>
              <div className="h-2.5 rounded-full mb-2" style={{ background: '#1e1e1e', width: `${w}px` }} />
              <div className="h-12 rounded-2xl" style={{ background: '#141414' }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 space-y-5">

          {/* Display Name */}
          <div>
            <label className="block text-[10px] font-black tracking-widest mb-2 px-1" style={labelStyle}>
              DISPLAY NAME
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setName(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              maxLength={50}
              className="w-full px-4 py-3.5 rounded-2xl text-sm font-bold outline-none placeholder:text-white/40"
              style={{
                background:  '#181818',
                border:      focused ? '1px solid #ff6a00' : '1px solid rgba(255,255,255,0.15)',
                boxShadow:   focused ? '0 0 0 1px rgba(255,106,0,0.28)' : 'none',
                color:       '#f5f5f5',
                transition:  'border-color 140ms, box-shadow 140ms',
              }}
              placeholder="Your name"
            />
          </div>

          {/* Username */}
          <div>
            <div className="flex items-center mb-2 px-1">
              <span className="text-[10px] font-black tracking-widest" style={labelStyle}>USERNAME</span>
              {soonBadge}
            </div>
            <div className="flex items-center justify-between px-4 py-3.5 rounded-2xl"
              style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.42)', fontFamily: 'var(--font-mono)' }}>
                {derivedUsername}
              </p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.28)' }}>Auto-generated</p>
            </div>
          </div>

          {/* Bio / Goal */}
          <div>
            <div className="flex items-center mb-2 px-1">
              <span className="text-[10px] font-black tracking-widest" style={labelStyle}>BIO / GOAL</span>
              {soonBadge}
            </div>
            <textarea
              disabled
              rows={3}
              placeholder="e.g. Chasing 120kg bench. PPL / Strength focused"
              className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none resize-none placeholder:text-white/35"
              style={{
                background: '#141414',
                border:     '1px solid rgba(255,255,255,0.08)',
                color:      'rgba(255,255,255,0.38)',
              }}
            />
          </div>

          {/* Training Style */}
          <div>
            <div className="flex items-center mb-2 px-1">
              <span className="text-[10px] font-black tracking-widest" style={labelStyle}>TRAINING STYLE</span>
              {soonBadge}
            </div>
            <div className="flex flex-wrap gap-2" style={{ opacity: 0.6 }}>
              {TRAINING_STYLES.map(s => (
                <button key={s} disabled
                  className="px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider"
                  style={{
                    background: '#141414',
                    color:      'rgba(255,255,255,0.42)',
                    border:     '1px solid rgba(255,255,255,0.08)',
                    cursor:     'not-allowed',
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs font-bold px-1" style={{ color: '#ef4444' }}>{error}</p>
          )}

          {/* Save */}
          <button
            className="w-full py-4 rounded-2xl text-sm font-black tracking-widest transition-all"
            style={{
              background: canSave ? '#ff6a00' : 'rgba(255,106,0,0.22)',
              color:      canSave ? '#ffffff' : 'rgba(255,255,255,0.42)',
              marginTop:  8,
              boxShadow:  canSave ? '0 4px 18px rgba(255,106,0,0.28)' : 'none',
            }}
            disabled={!canSave}
            onClick={handleSave}>
            {saving ? 'SAVING...' : saved ? '✓ SAVED' : 'SAVE CHANGES'}
          </button>

          <p className="text-center text-[10px] pb-4" style={{ color: 'rgba(255,255,255,0.2)' }}>
            More profile fields coming soon
          </p>

        </div>
      )}
    </div>
  )
}
