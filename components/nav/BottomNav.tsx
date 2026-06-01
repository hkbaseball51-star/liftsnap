'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useTransition } from 'react'
import { Home, BarChart2, Plus, Trophy, User } from 'lucide-react'

function getTodayJST() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0]
}

const tabs = [
  { href: '/home',      icon: Home,     label: 'HOME'    },
  { href: '/analytics', icon: BarChart2, label: 'PROGRESS' },
  { href: '/record',    icon: Plus,     label: '',         primary: true },
  { href: '/rewards',   icon: Trophy,   label: 'PROOF'    },
  { href: '/profile',   icon: User,     label: 'ME'      },
]

const PREFETCH_ROUTES = ['/home', '/analytics', '/record', '/rewards', '/profile']

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (pathname === '/analytics/chart') return null

  useEffect(() => {
    PREFETCH_ROUTES.forEach(r => router.prefetch(r))
  }, [router])

  const navigate = (href: string) => {
    startTransition(() => router.push(href))
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(10,10,10,0.96)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid #1e1e1e',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-around h-16">
        {tabs.map(({ href, icon: Icon, label, primary }) => {
          const active = pathname.startsWith(href)

          if (primary) {
            // Hide FAB on record page — the page has its own "+ Exercise" CTA
            if (pathname.startsWith('/record')) {
              return <div key={href} style={{ width: 56 }} />
            }
            return (
              <button
                key={href}
                className="flex flex-col items-center -mt-5"
                style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 100ms' }}
                onClick={() => navigate(`/record?date=${getTodayJST()}`)}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                  style={{
                    background: '#ED742F',
                    boxShadow: '0 4px 20px rgba(237, 116, 47,0.45)',
                  }}
                >
                  <Icon size={26} color="#fff" strokeWidth={2.5} />
                </div>
              </button>
            )
          }

          return (
            <button
              key={href}
              className="flex flex-col items-center gap-0.5 py-1 px-3 active:opacity-60 transition-opacity"
              style={{ transform: 'translateY(-6px)' }}
              onClick={() => navigate(href)}
            >
              <Icon
                size={22}
                color={active ? '#ED742F' : 'rgba(255,255,255,0.65)'}
                strokeWidth={active ? 2.5 : 2}
              />
              {label && (
                <span
                  className="text-[8px] font-black tracking-widest"
                  style={{ color: active ? '#ED742F' : 'rgba(255,255,255,0.48)' }}
                >
                  {label}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
