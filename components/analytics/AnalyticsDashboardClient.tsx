'use client'

import dynamic from 'next/dynamic'

type WeightPoint = { date: string; label: string; weight: number }
type Exercise = { name: string; muscle_group: string; logCount: number }

type Props = {
  bodyWeightData?: WeightPoint[]
  exercises?: Exercise[]
  totalSessions?: number
  useLocalDB?: boolean
}

// Skeleton shown while recharts and the full dashboard JS hydrate.
// Matches the approximate visual structure so there is no blank flash.
function AnalyticsSkeleton() {
  const shimmer = {
    background: 'linear-gradient(90deg, var(--skeleton-bg) 25%, var(--skeleton-highlight) 50%, var(--skeleton-bg) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s ease-in-out infinite',
  } as React.CSSProperties

  return (
    <div className="min-h-screen" style={{ background: 'var(--app-bg)' }}>
      {/* Header area */}
      <div style={{ padding: '48px 16px 20px' }}>
        <div style={{ ...shimmer, height: 16, width: 120, borderRadius: 6, marginBottom: 8 }} />
        <div style={{ ...shimmer, height: 12, width: 200, borderRadius: 6 }} />
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px' }}>
        {['MAX 1RM', 'DAILY VOLUME', 'BODY WEIGHT'].map((label, i) => (
          <div key={label} style={{
            flex: 1, height: 36, borderRadius: 10,
            background: i === 0 ? 'rgba(237,116,47,0.12)' : 'var(--skeleton-bg)',
            border: `1px solid ${i === 0 ? 'rgba(237,116,47,0.22)' : 'var(--skeleton-border)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              height: 9, width: i === 0 ? 56 : 72, borderRadius: 4,
              background: i === 0 ? 'rgba(237,116,47,0.35)' : 'var(--skeleton-highlight)',
            }} />
          </div>
        ))}
      </div>

      {/* Muscle filter chips */}
      <div style={{ display: 'flex', gap: 6, padding: '0 16px 14px', overflowX: 'auto' }}>
        {[60, 32, 40, 56, 48, 36, 30].map((w, i) => (
          <div key={i} style={{
            flexShrink: 0, height: 28, width: w, borderRadius: 20,
            background: i === 0 ? 'rgba(237,116,47,0.14)' : 'var(--skeleton-bg)',
            border: '1px solid var(--skeleton-border)',
          }} />
        ))}
      </div>

      {/* Chart area */}
      <div style={{ margin: '0 16px 16px', ...shimmer, height: 200, borderRadius: 16 }} />

      {/* Period selector */}
      <div style={{ display: 'flex', gap: 6, padding: '0 16px 20px' }}>
        {[40, 40, 36, 32, 36].map((w, i) => (
          <div key={i} style={{
            height: 30, width: w, borderRadius: 8,
            background: 'var(--skeleton-bg)', border: '1px solid var(--skeleton-border)',
          }} />
        ))}
      </div>

      {/* Exercise list placeholders */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            ...shimmer, height: 52, borderRadius: 12,
            opacity: 1 - i * 0.15,
          }} />
        ))}
      </div>

    </div>
  )
}

const AnalyticsDashboard = dynamic(
  () => import('@/components/analytics/AnalyticsDashboard'),
  {
    ssr: false,
    loading: () => <AnalyticsSkeleton />,
  }
)

export default function AnalyticsDashboardClient(props: Props) {
  return <AnalyticsDashboard {...props} useLocalDB={props.useLocalDB} />
}
