import Link from 'next/link'
import { ChevronLeft, Lock, Globe, Users, Check } from 'lucide-react'

export default function PrivacyPage() {
  const card = {
    background: '#151515',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    overflow: 'hidden',
  } as const

  const sectionLabel = (text: string) => (
    <p className="text-[10px] font-black tracking-widest mb-2 px-1" style={{ color: '#444' }}>{text}</p>
  )

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-6">
        <Link href="/profile" className="p-1 -ml-1 active:opacity-70">
          <ChevronLeft size={22} style={{ color: '#555' }} />
        </Link>
        <h1 className="text-base font-black tracking-widest text-white">PRIVACY</h1>
      </div>

      {/* Profile Visibility */}
      <div className="mx-4 mb-4">
        {sectionLabel('PROFILE VISIBILITY')}
        <div style={card}>

          {/* Private — currently selected */}
          <div className="flex items-center gap-3 px-4 py-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,107,0,0.04)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.2)' }}>
              <Lock size={14} style={{ color: '#ff6b00' }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-white">Private</p>
              <p className="text-[10px] mt-0.5" style={{ color: '#555' }}>Only you can see your workouts</p>
            </div>
            <Check size={16} style={{ color: '#ff6b00' }} />
          </div>

          {/* Followers Only — future */}
          <div className="flex items-center gap-3 px-4 py-4 opacity-30"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: '#111', border: '1px solid #1e1e1e' }}>
              <Users size={14} style={{ color: '#444' }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-white">Followers Only</p>
                <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-full"
                  style={{ background: '#1a1a1a', color: '#333', border: '1px solid #222' }}>
                  SOON
                </span>
              </div>
              <p className="text-[10px] mt-0.5" style={{ color: '#555' }}>Visible to approved followers</p>
            </div>
          </div>

          {/* Public — future */}
          <div className="flex items-center gap-3 px-4 py-4 opacity-30">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: '#111', border: '1px solid #1e1e1e' }}>
              <Globe size={14} style={{ color: '#444' }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-white">Public</p>
                <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-full"
                  style={{ background: '#1a1a1a', color: '#333', border: '1px solid #222' }}>
                  SOON
                </span>
              </div>
              <p className="text-[10px] mt-0.5" style={{ color: '#555' }}>Anyone can view your profile</p>
            </div>
          </div>
        </div>
        <p className="text-[10px] px-1 mt-2" style={{ color: '#333' }}>
          Your profile is private by default. Public profiles will be available in a future update.
        </p>
      </div>

      {/* Data & Permissions */}
      <div className="mx-4 mb-4">
        {sectionLabel('DATA & PERMISSIONS')}
        <div style={card}>
          <div className="flex items-center justify-between px-4 py-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <p className="text-sm font-bold text-white">Analytics</p>
              <p className="text-[10px] mt-0.5" style={{ color: '#555' }}>Help improve the app with usage data</p>
            </div>
            {/* Toggle — disabled for now */}
            <div className="w-11 h-6 rounded-full relative shrink-0"
              style={{ background: '#1a1a1a', border: '1px solid #222' }}>
              <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full" style={{ background: '#2a2a2a' }} />
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <p className="text-sm font-bold text-white">Crash Reports</p>
              <p className="text-[10px] mt-0.5" style={{ color: '#555' }}>Automatically send crash logs</p>
            </div>
            <div className="w-11 h-6 rounded-full relative shrink-0"
              style={{ background: '#1a1a1a', border: '1px solid #222' }}>
              <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full" style={{ background: '#2a2a2a' }} />
            </div>
          </div>
        </div>
        <p className="text-[10px] px-1 mt-2" style={{ color: '#2e2e2e' }}>
          These settings will be functional in a future update.
        </p>
      </div>

    </div>
  )
}
