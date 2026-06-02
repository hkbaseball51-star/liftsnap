'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Dumbbell, CalendarDays, BarChart2, Share2 } from 'lucide-react'

function getTodayJST() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0]
}

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

  if (HIDE_NAV.has(pathname)) return null

  const todayJST = getTodayJST()

  const tabs = [
    { href: `/record?date=${todayJST}`, base: '/record',    icon: Dumbbell,     label: 'RECORD'   },
    { href: '/home',                    base: '/home',      icon: CalendarDays, label: 'CALENDAR' },
    { href: '/analytics',              base: '/analytics', icon: BarChart2,    label: 'STATS'    },
    { href: '/share',                  base: '/share',     icon: Share2,       label: 'SHARE'    },
  ]

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
        {tabs.map(({ href, base, icon: Icon, label }) => {
          const active = pathname.startsWith(base)
          const color  = active ? '#ED742F' : 'rgba(255,255,255,0.55)'
          return (
            <Link
              key={base}
              href={href}
              prefetch
              className="flex flex-col items-center gap-0.5 py-2 px-5 active:opacity-60 transition-opacity"
            >
              <Icon size={22} color={color} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[8px] font-black tracking-widest" style={{ color }}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
