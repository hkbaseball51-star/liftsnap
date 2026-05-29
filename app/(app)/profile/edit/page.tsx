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
    style={{ background: '#1a1a1a', color: '#333', border: '1px solid #222' }}>
    SOON
  </span>
)

export default function EditProfilePage() {
  const router = useRouter()
  const [loading, setLoading]     = useState(true)
  const [displayName, setName]    = useState('')
  const [email, setEmail]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState<string | null>(null)

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

  const card = {
    background: '#151515',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
  } as const

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-6">
        <Link href="/profile" className="p-1 -ml-1 active:opacity-70">
          <ChevronLeft size={22} style={{ color: '#555' }} />
        </Link>
        <h1 className="flex-1 text-base font-black tracking-widest text-white">EDIT PROFILE</h1>
        {saved && <Check size={18} style={{ color: '#22c55e' }} />}
      </div>

      {loading ? (
        <div className="px-4 space-y-5 animate-pulse">
          {[80, 60, 100, 80].map((w, i) => (
            <div key={i}>
              <div className="h-2.5 rounded-full mb-2" style={{ background: '#1a1a1a', width: `${w}px` }} />
              <div className="h-12 rounded-2xl" style={{ background: '#111' }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 space-y-5">

          {/* Display Name */}
          <div>
            <label className="block text-[10px] font-black tracking-widest mb-2 px-1" style={{ color: '#444' }}>
              DISPLAY NAME
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setName(e.target.value)}
              maxLength={50}
              className="w-full px-4 py-3.5 rounded-2xl text-sm font-bold text-white outline-none"
              style={{ background: '#151515', border: '1px solid rgba(255,255,255,0.1)' }}
              placeholder="Your name"
            />
          </div>

          {/* Username */}
          <div>
            <div className="flex items-center mb-2 px-1">
              <span className="text-[10px] font-black tracking-widest" style={{ color: '#444' }}>USERNAME</span>
              {soonBadge}
            </div>
            <div className="flex items-center justify-between px-4 py-3.5 rounded-2xl"
              style={{ background: '#111', border: '1px solid #1a1a1a' }}>
              <p className="text-sm font-bold" style={{ color: '#2e2e2e', fontFamily: 'var(--font-mono)' }}>
                {derivedUsername}
              </p>
              <p className="text-[10px]" style={{ color: '#2a2a2a' }}>Auto-generated</p>
            </div>
          </div>

          {/* Bio / Goal */}
          <div>
            <div className="flex items-center mb-2 px-1">
              <span className="text-[10px] font-black tracking-widest" style={{ color: '#444' }}>BIO / GOAL</span>
              {soonBadge}
            </div>
            <textarea
              disabled
              rows={3}
              placeholder="e.g. Chasing 120kg bench. PPL / Strength focused"
              className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none resize-none"
              style={{ background: '#111', border: '1px solid #1a1a1a', color: '#2a2a2a' }}
            />
          </div>

          {/* Training Style */}
          <div>
            <div className="flex items-center mb-2 px-1">
              <span className="text-[10px] font-black tracking-widest" style={{ color: '#444' }}>TRAINING STYLE</span>
              {soonBadge}
            </div>
            <div className="flex flex-wrap gap-2">
              {TRAINING_STYLES.map(s => (
                <button key={s} disabled
                  className="px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider"
                  style={{ background: '#111', color: '#222', border: '1px solid #1a1a1a', cursor: 'not-allowed' }}>
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
            className="w-full py-4 rounded-2xl text-sm font-black tracking-widest transition-colors"
            style={{
              background: saving || !displayName.trim() ? '#1a1a1a' : '#ff6b00',
              color:      saving || !displayName.trim() ? '#333' : '#fff',
              marginTop: 8,
            }}
            disabled={saving || !displayName.trim()}
            onClick={handleSave}>
            {saving ? 'SAVING...' : saved ? '✓ SAVED' : 'SAVE CHANGES'}
          </button>

          <p className="text-center text-[10px] pb-4" style={{ color: '#2a2a2a' }}>
            More profile fields coming soon
          </p>

        </div>
      )}
    </div>
  )
}
