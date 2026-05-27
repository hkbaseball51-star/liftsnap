import BottomNav from '@/components/nav/BottomNav'
import AutoAuthClient from '@/components/AutoAuthClient'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <AutoAuthClient />
      <main className="flex-1 pb-nav overflow-y-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
