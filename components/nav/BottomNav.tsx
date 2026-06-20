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
        boxShadow: '0 -1px 4px rgba(0,0,0,0.06)',
        paddingTop: 8,
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)',
      }}
    >
      {/* Inner row: 56px — icon pill (32) + gap (5) + label (≈18) = 55px content.
          Flex-1 links span full width, satisfying ≥56px tap target requirement. */}
      <div className="flex" style={{ height: 56 }}>
        {tabs.map(({ href, base, icon: Icon, label }) => {
          const active     = pathname.startsWith(base)
          const iconColor  = active ? '#ED742F' : 'var(--nav-inactive-icon)'
          const labelColor = active ? '#ED742F' : 'var(--nav-inactive-label)'
          return (
            <Link
              key={base}
              href={href}
              prefetch
              className="flex flex-col items-center justify-center active:opacity-60 transition-opacity"
              style={{ flex: 1, minHeight: 56, gap: 5 }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 32,
                  borderRadius: 10,
                  background: active ? 'var(--nav-active-bg)' : 'transparent',
                }}
              >
                <Icon size={28} color={iconColor} strokeWidth={active ? 2.4 : 2.2} />
              </span>
              <span
                className="font-bold leading-none whitespace-nowrap"
                style={{ fontSize: 13, color: labelColor }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
