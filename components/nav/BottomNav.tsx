'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useTransition } from 'react'
import { Dumbbell, CalendarDays, BarChart2, Share2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

function getTodayJST() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0]
}

type Tab = {
  href: string
  icon: LucideIcon
  label: string
  navigateTo?: () => string
}

const TABS: Tab[] = [
  { href: '/record',    icon: Dumbbell,     label: 'RECORD',   navigateTo: () => `/record?date=${getTodayJST()}` },
  { href: '/home',      icon: CalendarDays, label: 'CALENDAR'  },
  { href: '/analytics', icon: BarChart2,    label: 'STATS'     },
  { href: '/share',     icon: Share2,       label: 'SHARE'     },
]

const PREFETCH_ROUTES = ['/home', '/analytics', '/share']

// Full-screen pages where the bottom nav should not appear
const HIDE_NAV = new Set([
  '/analytics/chart',
  '/body-log',
  '/body-timeline',
  '/rewards',
  '/shop',
])

export default function BottomNav() {
  const pathname = usePathname()
  const router   = useRouter()
  const [isPending, startTransition] = useTransition()

  // Prefetch all main routes once on mount — hooks must be called unconditionally
  useEffect(() => {
    PREFETCH_ROUTES.forEach(r => router.prefetch(r))
  }, [router])

  if (HIDE_NAV.has(pathname)) return null

  const navigate = (href: string) => startTransition(() => router.push(href))

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(10,10,10,0.96)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid #1e1e1e',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-around h-16">
        {TABS.map(({ href, icon: Icon, label, navigateTo }) => {
          const active = pathname.startsWith(href)
          const color  = active ? '#ED742F' : 'rgba(255,255,255,0.55)'

          return (
            <button
              key={href}
              className="flex flex-col items-center gap-0.5 py-2 px-5 active:opacity-60 transition-opacity"
              style={{ opacity: isPending ? 0.7 : 1 }}
              onClick={() => navigate(navigateTo ? navigateTo() : href)}
            >
              <Icon
                size={22}
                color={color}
                strokeWidth={active ? 2.5 : 2}
              />
              <span
                className="text-[8px] font-black tracking-widest"
                style={{ color }}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
