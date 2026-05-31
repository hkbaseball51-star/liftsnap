'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updateProfile } from '@/actions/profile'
import { useLocale } from '@/lib/useLocale'
import { t } from '@/lib/i18n'

const TRAINING_STYLES = ['PPL', 'Push/Pull', 'Strength', 'Hypertrophy', 'HIIT', 'General']

const soonBadgeStyle = {
  background: 'rgba(255,255,255,0.12)',
  color: 'rgba(255,255,255,0.52)',
  border:     '1px solid rgba(255,255,255,0.15)',
} as const

const labelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.58)',
}

function normalizeUsername(raw: string): string | null {
  let u = raw.trim()
  if (u.startsWith('@')) u = u.slice(1)
  u = u.toLowerCase()
  return u || null
}

function isValidUsername(u: string): boolean {
  return /^[a-z0-9_]{3,20}$/.test(u)
}

export default function EditProfilePage() {
  const router = useRouter()
  const { locale } = useLocale()

  const [loading, setLoading]           = useState(true)
  const [displayName, setName]          = useState('')
  const [username, setUsername]         = useState('')
  const [saving, setSaving]             = useState(false)
  const [saved, setSaved]               = useState(false)
  const [nameFocused, setNameFocused]   = useState(false)
  const [userFocused, setUserFocused]   = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [saveError, setSaveError]       = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase.from('profiles').select('display_name, username').eq('id', user.id).single()
        .then(({ data }) => {
          setName((data?.display_name as string | null) ?? '')
          setUsername((data?.username as string | null) ?? '')
          setLoading(false)
        })
    })
  }, [router])

  const handleUsernameChange = (raw: string) => {
    // Normalize in real-time: strip @, lowercase, allow only valid chars
    let v = raw
    if (v.startsWith('@')) v = v.slice(1)
    v = v.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setUsername(v)
    setUsernameError(null)
  }

  const handleSave = async () => {
    if (!displayName.trim()) return
    setSaveError(null)
    setUsernameError(null)

    const normalized = normalizeUsername(username)

    // Validate only if non-empty
    if (normalized !== null && !isValidUsername(normalized)) {
      setUsernameError(t(locale, 'profileEdit.usernameInvalid'))
      return
    }

    setSaving(true)
    try {
      await updateProfile(displayName, normalized)
      setSaved(true)
      // Navigate back after brief success state; revalidatePath('/profile') was called
      // in the server action so the profile page will fetch fresh data on arrival.
      setTimeout(() => router.push('/profile'), 800)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'USERNAME_TAKEN') {
        setUsernameError(t(locale, 'profileEdit.usernameTaken'))
      } else {
        setSaveError(t(locale, 'profileEdit.profileUpdateFailed'))
      }
    } finally {
      setSaving(false)
    }
  }

  const canSave = !saving && !!displayName.trim()

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-6">
        <Link href="/profile" className="p-1 -ml-1 active:opacity-70">
          <ChevronLeft size={22} style={{ color: 'rgba(255,255,255,0.72)' }} />
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
              <div className="h-12 rounded-2xl" style={{ background: '#222222' }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 space-y-5">

          {/* Display Name */}
          <div>
            <label className="block text-[10px] font-black tracking-widest mb-2 px-1" style={labelStyle}>
              {t(locale, 'profileEdit.displayNameLabel')}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setName(e.target.value)}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              maxLength={50}
              className="w-full px-4 py-3.5 rounded-2xl text-sm font-bold outline-none placeholder:text-white/40"
              style={{
                background:  '#1E1E1E',
                border:      nameFocused ? '1px solid #ED742F' : '1px solid rgba(255,255,255,0.15)',
                boxShadow:   nameFocused ? '0 0 0 1px rgba(237, 116, 47,0.28)' : 'none',
                color:       '#f5f5f5',
                transition:  'border-color 140ms, box-shadow 140ms',
              }}
              placeholder={t(locale, 'profileEdit.namePlaceholder')}
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-[10px] font-black tracking-widest mb-2 px-1" style={labelStyle}>
              {t(locale, 'profileEdit.usernameLabel')}
            </label>
            <div
              className="flex items-center rounded-2xl overflow-hidden"
              style={{
                background: '#1E1E1E',
                border:     userFocused
                  ? `1px solid ${usernameError ? '#ef4444' : '#ED742F'}`
                  : `1px solid ${usernameError ? 'rgba(239,68,68,0.55)' : 'rgba(255,255,255,0.15)'}`,
                boxShadow:  userFocused && !usernameError ? '0 0 0 1px rgba(237, 116, 47,0.28)' : 'none',
                transition: 'border-color 140ms, box-shadow 140ms',
              }}>
              <span className="pl-4 pr-1 text-sm font-bold select-none" style={{ color: 'rgba(255,255,255,0.65)' }}>
                @
              </span>
              <input
                type="text"
                value={username}
                onChange={e => handleUsernameChange(e.target.value)}
                onFocus={() => setUserFocused(true)}
                onBlur={() => setUserFocused(false)}
                maxLength={20}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="flex-1 pr-4 py-3.5 bg-transparent text-sm font-bold outline-none placeholder:text-white/30"
                style={{ color: '#f5f5f5' }}
                placeholder="username"
              />
            </div>

            {usernameError ? (
              <p className="text-xs font-bold mt-1.5 px-1" style={{ color: '#ef4444' }}>
                {usernameError}
              </p>
            ) : (
              <div className="mt-1.5 px-1 space-y-0.5">
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.62)' }}>
                  {t(locale, 'profileEdit.usernameDescriptionLine1')}
                </p>
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.52)' }}>
                  {t(locale, 'profileEdit.usernameDescriptionLine2')}
                </p>
              </div>
            )}
          </div>

          {/* Bio / Goal */}
          <div>
            <div className="flex items-center mb-2 px-1">
              <span className="text-[10px] font-black tracking-widest" style={labelStyle}>{t(locale, 'profileEdit.bioLabel')}</span>
              <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-full ml-1.5" style={soonBadgeStyle}>
                {t(locale, 'profileEdit.soonBadge')}
              </span>
            </div>
            <textarea
              disabled
              rows={3}
              placeholder={t(locale, 'profileEdit.bioPlaceholder')}
              className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none resize-none placeholder:text-white/35"
              style={{
                background: '#222222',
                border:     '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.58)',
              }}
            />
          </div>

          {/* Training Style */}
          <div>
            <div className="flex items-center mb-2 px-1">
              <span className="text-[10px] font-black tracking-widest" style={labelStyle}>{t(locale, 'profileEdit.trainingStyleLabel')}</span>
              <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-full ml-1.5" style={soonBadgeStyle}>
                {t(locale, 'profileEdit.soonBadge')}
              </span>
            </div>
            <div className="flex flex-wrap gap-2" style={{ opacity: 0.6 }}>
              {TRAINING_STYLES.map(s => (
                <button key={s} disabled
                  className="px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider"
                  style={{
                    background: '#222222',
                    color: 'rgba(255,255,255,0.62)',
                    border:     '1px solid rgba(255,255,255,0.15)',
                    cursor:     'not-allowed',
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Save error */}
          {saveError && (
            <p className="text-xs font-bold px-1" style={{ color: '#ef4444' }}>{saveError}</p>
          )}

          {/* Saved confirmation */}
          {saved && (
            <p className="text-xs font-bold px-1" style={{ color: '#22c55e' }}>
              {t(locale, 'profileEdit.profileUpdated')}
            </p>
          )}

          {/* Save button */}
          <button
            className="w-full py-4 rounded-2xl text-sm font-black tracking-widest transition-all"
            style={{
              background: canSave ? '#ED742F' : 'rgba(237, 116, 47,0.22)',
              color:      canSave ? '#ffffff' : 'rgba(255,255,255,0.62)',
              marginTop:  8,
              boxShadow:  canSave ? '0 4px 18px rgba(237, 116, 47,0.28)' : 'none',
            }}
            disabled={!canSave}
            onClick={handleSave}>
            {saving ? t(locale, 'profileEdit.savingBtn') : t(locale, 'profileEdit.saveChanges')}
          </button>

          <p className="text-center text-[10px] pb-4" style={{ color: 'rgba(255,255,255,0.44)' }}>
            {t(locale, 'profileEdit.moreFieldsSoon')}
          </p>

        </div>
      )}
    </div>
  )
}
