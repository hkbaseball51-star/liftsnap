'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BarChart2, Plus, ShoppingBag, User } from 'lucide-react'

const tabs = [
  { href: '/home', icon: Home, label: 'ホーム' },
  { href: '/analytics', icon: BarChart2, label: 'グラフ' },
  { href: '/record', icon: Plus, label: '記録', primary: true },
  { href: '/shop', icon: ShoppingBag, label: 'ショップ' },
  { href: '/profile', icon: User, label: 'プロフィール' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(10,10,10,0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid #2a2a2a',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-around h-16">
        {tabs.map(({ href, icon: Icon, label, primary }) => {
          const active = pathname.startsWith(href)
          if (primary) {
            return (
              <Link key={href} href={href} className="flex flex-col items-center -mt-5">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
                  style={{ background: '#ff6b00' }}
                >
                  <Icon size={26} color="#fff" strokeWidth={2.5} />
                </div>
              </Link>
            )
          }
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 py-1 px-3"
            >
              <Icon
                size={22}
                color={active ? '#ff6b00' : '#555'}
                strokeWidth={active ? 2.5 : 2}
              />
              <span
                className="text-[10px]"
                style={{ color: active ? '#ff6b00' : '#555' }}
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
