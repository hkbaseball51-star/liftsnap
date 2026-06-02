import { getExercise1RMData, getExerciseDailyVolumeData, getBodyWeightData } from '@/actions/analytics'
import { getStartDate } from '@/lib/chartAggregation'
import { type Period } from '@/lib/chartAggregation'
import FullScreenChart from '@/components/analytics/FullScreenChart'
import FeatureTracker from '@/components/common/FeatureTracker'

type PageProps = {
  searchParams: Promise<{ metric?: string; range?: string; exercise?: string }>
}

function rangeToperiod(range: string | undefined): Period {
  return (({ '30d':'30D','90d':'90D','6m':'6M','1y':'1Y','all':'All' } as Record<string, Period>)[
    (range ?? '').toLowerCase()
  ] ?? '90D')
}

export default async function AnalyticsChartPage({ searchParams }: PageProps) {
  const params   = await searchParams
  const metric   = params.metric   ?? 'max1rm'
  const range    = params.range    ?? '90d'
  const exercise = params.exercise ?? ''

  const period    = rangeToperiod(range)
  const startDate = getStartDate(period) ?? undefined

  const [rmData, volData, bwData] = await Promise.all([
    metric === 'max1rm'       && exercise ? getExercise1RMData(exercise, startDate)        : Promise.resolve([]),
    metric === 'daily-volume' && exercise ? getExerciseDailyVolumeData(exercise, startDate) : Promise.resolve([]),
    metric === 'body-weight'              ? getBodyWeightData()                              : Promise.resolve([]),
  ])

  return (
    <>
      <FeatureTracker feature="fullscreen_chart" />
      <FullScreenChart
        metric={metric}
        range={range}
        exercise={exercise}
        initialRmData={rmData  as Awaited<ReturnType<typeof getExercise1RMData>>}
        initialVolData={volData as Awaited<ReturnType<typeof getExerciseDailyVolumeData>>}
        initialBwData={bwData  as Awaited<ReturnType<typeof getBodyWeightData>>}
      />
    </>
  )
}
