import { Suspense } from 'react'
import BottomNav from '@/components/nav/BottomNav'
import AutoAuthClient from '@/components/AutoAuthClient'
import LocaleSync from '@/components/locale/LocaleSync'
import SplashScreen from '@/components/SplashScreen'
import DemoModeInit from '@/components/common/DemoModeInit'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* SplashScreen lives in the layout so it mounts exactly once per full
          page load and is never re-shown when navigating between tabs. */}
      <SplashScreen />
      <AutoAuthClient />
      <LocaleSync />
      {/* Reads ?demoUserId= param and persists to localStorage (dev-only hidden feature) */}
      <Suspense><DemoModeInit /></Suspense>
      <main className="flex-1 pb-nav overflow-y-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
