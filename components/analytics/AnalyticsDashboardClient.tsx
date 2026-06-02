'use client'

import dynamic from 'next/dynamic'

type WeightPoint = { date: string; label: string; weight: number }
type Exercise = { name: string; muscle_group: string; logCount: number }

type Props = {
  bodyWeightData: WeightPoint[]
  exercises: Exercise[]
  totalSessions: number
}

const AnalyticsDashboard = dynamic(
  () => import('@/components/analytics/AnalyticsDashboard'),
  {
    ssr: false,
    loading: () => <div className="min-h-screen" style={{ background: '#0a0a0a' }} />,
  }
)

export default function AnalyticsDashboardClient(props: Props) {
  return <AnalyticsDashboard {...props} />
}
