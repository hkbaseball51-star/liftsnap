'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Dumbbell, CalendarDays, BarChart2, Share2 } from 'lucide-react'
import { useLocale } from '@/lib/useLocale'

function getTodayJST() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0]
}

// Full-screen pages where the bottom nav should not appear
const HIDE_NAV = new Set([
  '/record',
  '/analytics/chart',
  '/body-log',
  '/body-timeline',
  '/rewards',
  '/shop',
])

export default function BottomNav() {
  const pathname = usePathname()
  const { locale } = useLocale()
  const ja = locale === 'ja'

  if (HIDE_NAV.has(pathname)) return null

  const todayJST = getTodayJST()

  const tabs = [
    { href: `/record?date=${todayJST}`, base: '/record',    icon: Dumbbell,     label: ja ? '記録'       : 'RECORD'   },
    { href: '/home',                    base: '/home',      icon: CalendarDays, label: ja ? 'カレンダー' : 'CALENDAR' },
    { href: '/analytics',              base: '/analytics', icon: BarChart2,    label: ja ? '成長'       : 'STATS'    },
    { href: '/share',                  base: '/share',     icon: Share2,       label: ja ? 'シェア'     : 'SHARE'    },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'var(--nav-bg)',
        borderTop: '1px solid var(--nav-border)',
        paddingTop: 10,
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)',
      }}
    >
      {/* Inner row: 56px — icon (22) + gap (4) + label (10) = 36px content,
          centered with 10px headroom each side. Flex-1 links make the full
          row width tappable, satisfying the 44×44 px minimum. */}
      <div className="flex justify-around" style={{ height: 56 }}>
        {tabs.map(({ href, base, icon: Icon, label }) => {
          const active = pathname.startsWith(base)
          const color  = active ? '#ED742F' : 'var(--text-muted)'
          return (
            <Link
              key={base}
              href={href}
              prefetch
              className="flex flex-col items-center justify-center gap-1 active:opacity-60 transition-opacity"
              style={{ flex: 1, minHeight: 44 }}
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
