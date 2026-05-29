import Link from 'next/link'
import { ChevronLeft, ChevronRight, User, Shield, Bell, Ruler, Palette, Globe, HelpCircle, FileText, UserX } from 'lucide-react'

/* ── shared tokens ─────────────────────────────────── */
const T = {
  main:     '#f5f5f5',
  secondary:'rgba(255,255,255,0.58)',
  muted:    'rgba(255,255,255,0.42)',
  dim:      'rgba(255,255,255,0.34)',
  label:    'rgba(255,255,255,0.52)',
  chevron:  'rgba(255,255,255,0.28)',
  card:     { background: '#161616', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 20, overflow: 'hidden' } as const,
  divider:  '1px solid rgba(255,255,255,0.07)',
  iconWrap: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' } as const,
  soon:     { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.58)', border: '1px solid rgba(255,255,255,0.10)' } as const,
}

type LiveRow = {
  label:  string
  sub?:   string
  icon:   React.ComponentType<{ size: number; style: React.CSSProperties }>
  href:   string
  danger?: boolean
}

type SoonRow = {
  label: string
  sub:   string
  icon:  React.ComponentType<{ size: number; style: React.CSSProperties }>
}

const SectionLabel = ({ text }: { text: string }) => (
  <p className="text-[10px] font-black tracking-widest mb-2 px-1" style={{ color: T.label }}>{text}</p>
)

function LiveRowEl({ row, last }: { row: LiveRow; last: boolean }) {
  const Icon = row.icon
  return (
    <Link
      href={row.href}
      className="flex items-center gap-3 px-4 py-3.5 active:opacity-70 transition-opacity"
      style={{ borderBottom: last ? 'none' : T.divider, display: 'flex' }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={row.danger
          ? { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.14)' }
          : T.iconWrap}>
        <Icon size={14} style={{ color: row.danger ? '#f87171' : T.secondary }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: row.danger ? '#f87171' : T.main }}>{row.label}</p>
        {row.sub && <p className="text-[10px] mt-0.5" style={{ color: T.secondary }}>{row.sub}</p>}
      </div>
      <ChevronRight size={13} style={{ color: row.danger ? 'rgba(248,113,113,0.4)' : T.chevron }} />
    </Link>
  )
}

function SoonRowEl({ row, last }: { row: SoonRow; last: boolean }) {
  const Icon = row.icon
  return (
    <div className="flex items-center gap-3 px-4 py-3.5"
      style={{ borderBottom: last ? 'none' : T.divider }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={T.iconWrap}>
        <Icon size={14} style={{ color: T.dim }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.45)' }}>{row.label}</p>
        <p className="text-[10px] mt-0.5" style={{ color: T.dim }}>{row.sub}</p>
      </div>
      <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-full shrink-0"
        style={T.soon}>
        SOON
      </span>
    </div>
  )
}

/* ── Row definitions ─────────────────────────────────── */
const ACCOUNT_ROWS: LiveRow[] = [
  { label: 'Edit Profile',   sub: 'Name, bio, training style',  icon: User,    href: '/profile/edit' },
  { label: 'Privacy',        sub: 'Profile visibility & data',   icon: Shield,  href: '/profile/privacy' },
  { label: 'Notifications',  sub: 'Push and in-app alerts',      icon: Bell,    href: '/profile/notifications' },
]

const APP_ROWS: SoonRow[] = [
  { label: 'Units',    sub: 'kg / lb toggle coming soon',             icon: Ruler },
  { label: 'Theme',    sub: 'Custom color themes coming soon',         icon: Palette },
  { label: 'Language', sub: 'English / Japanese support coming soon',  icon: Globe },
]

const SUPPORT_ROWS: LiveRow[] = [
  { label: 'Help & Support',  sub: 'FAQ and contact',          icon: HelpCircle, href: '/profile/support' },
  { label: 'Terms of Service', sub: 'Usage terms & conditions', icon: FileText,   href: '/profile/support' },
  { label: 'Privacy Policy',  sub: 'How we handle your data',  icon: Shield,     href: '/profile/support' },
  { label: 'Delete Account',  sub: 'Permanently remove account & data', icon: UserX, href: '/profile/support', danger: true },
]

/* ── Page ────────────────────────────────────────────── */
export default function SettingsPage() {
  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-6">
        <Link href="/profile" className="p-1 -ml-1 active:opacity-70">
          <ChevronLeft size={22} style={{ color: 'rgba(255,255,255,0.55)' }} />
        </Link>
        <h1 className="text-base font-black tracking-widest" style={{ color: T.main }}>SETTINGS</h1>
      </div>

      {/* ACCOUNT */}
      <div className="mx-4 mb-4">
        <SectionLabel text="ACCOUNT" />
        <div style={T.card}>
          {ACCOUNT_ROWS.map((row, i) => (
            <LiveRowEl key={row.label} row={row} last={i === ACCOUNT_ROWS.length - 1} />
          ))}
        </div>
      </div>

      {/* APP */}
      <div className="mx-4 mb-4">
        <SectionLabel text="APP" />
        <div style={T.card}>
          {APP_ROWS.map((row, i) => (
            <SoonRowEl key={row.label} row={row} last={i === APP_ROWS.length - 1} />
          ))}
        </div>
      </div>

      {/* SUPPORT */}
      <div className="mx-4 mb-8">
        <SectionLabel text="SUPPORT" />
        <div style={T.card}>
          {SUPPORT_ROWS.map((row, i) => (
            <LiveRowEl key={row.label} row={row} last={i === SUPPORT_ROWS.length - 1} />
          ))}
        </div>
      </div>

    </div>
  )
}
