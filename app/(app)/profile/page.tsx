import { createClient } from '@/lib/supabase/server'
import { logout } from '@/actions/auth'
import Link from 'next/link'
import { Settings, ChevronRight } from 'lucide-react'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen pb-nav flex flex-col items-center justify-center px-4" style={{ background: '#0a0a0a' }}>
        <p className="text-4xl mb-4">👤</p>
        <p className="text-lg font-black text-white mb-2 tracking-widest">NO ACCOUNT</p>
        <p className="text-sm text-center mb-8" style={{ color: '#555' }}>
          Create an account to save your data and sync across devices
        </p>
        <Link href="/signup"
          className="w-full max-w-xs py-4 rounded-2xl text-center text-sm font-black text-white block tracking-widest"
          style={{ background: '#ff6b00', boxShadow: '0 4px 20px rgba(255,107,0,0.35)' }}>
          CREATE ACCOUNT
        </Link>
        <Link href="/login" className="mt-4 text-sm font-bold" style={{ color: '#444' }}>
          Already have an account? Sign in →
        </Link>
      </div>
    )
  }

  const [profileRes, badgesRes, sessionCountRes] = await Promise.all([
    supabase.from('profiles').select('display_name, plan').eq('id', user.id).single(),
    supabase.from('user_badges').select('badge_key').eq('user_id', user.id),
    supabase.from('workout_sessions').select('*', { count: 'exact', head: true }).eq('user_id', user.id).not('completed_at', 'is', null),
  ])

  const profile = profileRes.data
  const badges = badgesRes.data
  const sessionCount = sessionCountRes.count

  const displayName = (profile?.display_name as string | null) ?? 'USER'

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-14 pb-4">
        <h1 className="text-xl font-black tracking-widest text-white">PROFILE</h1>
        <button className="p-2 rounded-xl" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
          <Settings size={18} style={{ color: '#555' }} />
        </button>
      </div>

      {/* Avatar + Name */}
      <div className="flex flex-col items-center py-6">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black mb-3"
          style={{
            background: 'linear-gradient(135deg, #ff6b00 0%, #7c3aed 100%)',
            boxShadow: '0 0 30px rgba(255,107,0,0.25)',
          }}>
          {displayName[0].toUpperCase()}
        </div>
        <p className="text-xl font-black text-white tracking-widest">{displayName}</p>
        {user.email && (
          <p className="text-xs mt-1" style={{ color: '#444', fontFamily: 'var(--font-mono)' }}>{user.email}</p>
        )}
      </div>

      {/* Rank Card */}
      <div className="mx-4 rounded-2xl p-4 mb-4 relative overflow-hidden"
        style={{ background: '#111', border: '1px solid #1e1e1e' }}>
        <div className="absolute top-0 inset-x-0 h-px"
          style={{ background: 'linear-gradient(90deg, #ff6b00, #7c3aed, transparent)' }} />
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[9px] font-black tracking-widest mb-1" style={{ color: '#444' }}>CURRENT RANK</p>
            <p className="text-lg font-black" style={{ color: '#ff6b00' }}>🔥 BEAST</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black tracking-widest mb-1" style={{ color: '#444' }}>TOTAL VOLUME</p>
            <p className="text-base font-black text-white" style={{ fontFamily: 'var(--font-mono)' }}>
              1,240,000<span className="text-xs font-bold ml-1" style={{ color: '#555' }}>kg</span>
            </p>
          </div>
        </div>
        <div className="h-1.5 rounded-full mb-1.5" style={{ background: '#1a1a1a' }}>
          <div className="h-full rounded-full" style={{ width: '62%', background: 'linear-gradient(90deg, #ff6b00, #ffaa44)' }} />
        </div>
        <p className="text-[10px] font-bold" style={{ color: '#444' }}>760,000 kg to ELITE</p>
      </div>

      {/* Stats */}
      <div className="mx-4 grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'SESSIONS', value: String(sessionCount ?? 0) },
          { label: 'BADGES',   value: String(badges?.length ?? 0) },
          { label: 'PLAN',     value: profile?.plan === 'pro' ? 'PRO' : 'FREE' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl p-3.5 text-center"
            style={{ background: '#111', border: '1px solid #1e1e1e' }}>
            <p className="text-xl font-black text-white" style={{ fontFamily: 'var(--font-mono)' }}>{value}</p>
            <p className="text-[9px] font-black tracking-widest mt-1" style={{ color: '#444' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Upgrade Banner */}
      {profile?.plan !== 'pro' && (
        <div className="mx-4 rounded-2xl p-4 mb-4 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #ff6b00 0%, #7c3aed 100%)' }}>
          <p className="font-black text-white mb-1 tracking-wide">🏆 UPGRADE TO PRO</p>
          <p className="text-xs text-white mb-3" style={{ opacity: 0.7 }}>
            No watermark · Custom color themes · Detailed analytics
          </p>
          <div className="flex gap-2">
            <button className="flex-1 py-2.5 rounded-xl text-sm font-black"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
              ¥480 / mo
            </button>
            <button className="flex-1 py-2.5 rounded-xl text-sm font-black"
              style={{ background: '#fff', color: '#ff6b00' }}>
              ¥2,980 / yr ★
            </button>
          </div>
        </div>
      )}

      {/* Settings Menu */}
      <div className="mx-4 rounded-2xl overflow-hidden mb-5"
        style={{ background: '#111', border: '1px solid #1e1e1e' }}>
        {[
          { label: 'Notifications' },
          { label: 'Edit Profile' },
          { label: 'Privacy' },
          { label: 'Help & Support' },
        ].map(({ label }, i, arr) => (
          <button key={label}
            className="w-full flex items-center justify-between px-4 py-4 active:opacity-70"
            style={{ borderBottom: i < arr.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
            <span className="text-sm font-bold text-white">{label}</span>
            <ChevronRight size={15} style={{ color: '#444' }} />
          </button>
        ))}
      </div>

      {/* Sign Out */}
      <form action={logout} className="mx-4">
        <button type="submit"
          className="w-full py-4 rounded-2xl text-sm font-black tracking-widest"
          style={{ background: '#111', color: '#ef4444', border: '1px solid #1e1e1e' }}>
          SIGN OUT
        </button>
      </form>
    </div>
  )
}
