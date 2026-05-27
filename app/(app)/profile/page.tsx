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
        <p className="text-lg font-black text-white mb-2">アカウント未登録</p>
        <p className="text-sm text-center mb-8" style={{ color: '#888' }}>アカウントを登録するとデータをクラウドに保存できます</p>
        <Link href="/signup" className="w-full max-w-xs py-4 rounded-2xl text-center text-sm font-black text-white block"
          style={{ background: '#ff6b00' }}>
          無料でアカウント登録
        </Link>
        <Link href="/login" className="mt-3 text-sm" style={{ color: '#888' }}>
          すでにアカウントをお持ちの方
        </Link>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, plan')
    .eq('id', user.id)
    .single()

  const { data: badges } = await supabase
    .from('user_badges')
    .select('badge_key')
    .eq('user_id', user.id)

  const { count: sessionCount } = await supabase
    .from('workout_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .not('completed_at', 'is', null)

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-14 pb-4">
        <h1 className="text-xl font-black tracking-widest text-white">PROFILE</h1>
        <button className="p-2 rounded-xl" style={{ background: '#1a1a1a' }}>
          <Settings size={20} style={{ color: '#888' }} />
        </button>
      </div>

      {/* Avatar + Name */}
      <div className="flex flex-col items-center py-6">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black mb-3"
          style={{ background: '#ff6b00' }}>
          {(profile?.display_name ?? 'U')[0].toUpperCase()}
        </div>
        <p className="text-xl font-bold text-white">{profile?.display_name ?? 'ユーザー'}</p>
        <p className="text-sm mt-1" style={{ color: '#888' }}>{user.email}</p>
      </div>

      {/* Rank Card */}
      <div className="mx-4 rounded-2xl p-4 mb-4" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs mb-0.5" style={{ color: '#888' }}>現在のランク</p>
            <p className="text-lg font-black" style={{ color: '#ff6b00' }}>🔥 BEAST</p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: '#888' }}>累計ボリューム</p>
            <p className="text-base font-bold text-white">1,240,000 kg</p>
          </div>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: '#2a2a2a' }}>
          <div className="h-full rounded-full" style={{ width: '62%', background: '#ff6b00' }} />
        </div>
        <p className="text-xs mt-1.5" style={{ color: '#555' }}>ELITE まで あと 760,000 kg</p>
      </div>

      {/* Stats */}
      <div className="mx-4 grid grid-cols-3 gap-3 mb-4">
        {[
          { label: '記録数', value: `${sessionCount ?? 0}回` },
          { label: 'バッジ', value: `${badges?.length ?? 0}個` },
          { label: 'プラン', value: profile?.plan === 'pro' ? 'PRO' : 'FREE' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl p-3 text-center" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <p className="text-lg font-bold text-white">{value}</p>
            <p className="text-xs mt-0.5" style={{ color: '#888' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Upgrade Banner (Free only) */}
      {profile?.plan !== 'pro' && (
        <div className="mx-4 rounded-2xl p-4 mb-4"
          style={{ background: 'linear-gradient(135deg, #ff6b00 0%, #7c3aed 100%)' }}>
          <p className="font-bold text-white mb-1">🏆 PROにアップグレード</p>
          <p className="text-xs text-white opacity-80 mb-3">透かしなし・カラーテーマ・詳細グラフ</p>
          <div className="flex gap-2">
            <button className="flex-1 py-2 rounded-xl text-sm font-bold"
              style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
              ¥480/月
            </button>
            <button className="flex-1 py-2 rounded-xl text-sm font-bold"
              style={{ background: '#fff', color: '#ff6b00' }}>
              ¥2,980/年 ★
            </button>
          </div>
        </div>
      )}

      {/* Settings Menu */}
      <div className="mx-4 rounded-2xl overflow-hidden mb-6" style={{ border: '1px solid #2a2a2a' }}>
        {[
          { label: '通知の設定', href: '#' },
          { label: 'プロフィール編集', href: '#' },
          { label: 'プライバシー設定', href: '#' },
          { label: 'ヘルプ・お問い合わせ', href: '#' },
        ].map(({ label }, i, arr) => (
          <button key={label}
            className="w-full flex items-center justify-between px-4 py-4"
            style={{
              background: '#1a1a1a',
              borderBottom: i < arr.length - 1 ? '1px solid #2a2a2a' : 'none',
            }}>
            <span className="text-sm text-white">{label}</span>
            <ChevronRight size={16} style={{ color: '#555' }} />
          </button>
        ))}
      </div>

      {/* Logout */}
      <form action={logout} className="mx-4">
        <button type="submit"
          className="w-full py-4 rounded-2xl text-sm font-bold"
          style={{ background: '#1a1a1a', color: '#ef4444', border: '1px solid #2a2a2a' }}>
          ログアウト
        </button>
      </form>
    </div>
  )
}
