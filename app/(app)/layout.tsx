import BottomNav from '@/components/nav/BottomNav'
import AutoAuthClient from '@/components/AutoAuthClient'
import LocaleSync from '@/components/locale/LocaleSync'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <AutoAuthClient />
      <LocaleSync />
      <main className="flex-1 pb-nav overflow-y-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
