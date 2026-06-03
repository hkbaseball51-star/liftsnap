import { getExercise1RMData, getExerciseDailyVolumeData, getBodyPartDailyVolumeData, getBodyWeightData } from '@/actions/analytics'
import { getStartDate } from '@/lib/chartAggregation'
import { type Period } from '@/lib/chartAggregation'
import FullScreenChart from '@/components/analytics/FullScreenChart'
import FeatureTracker from '@/components/common/FeatureTracker'

type PageProps = {
  searchParams: Promise<{ metric?: string; range?: string; exercise?: string; bodypart?: string }>
}

function rangeToperiod(range: string | undefined): Period {
  return (({ '30d':'30D','90d':'90D','6m':'6M','1y':'1Y','all':'All' } as Record<string, Period>)[
    (range ?? '').toLowerCase()
  ] ?? '90D')
}

const BODY_PART_LABELS: Record<string, string> = {
  all: 'ALL', chest: 'CHEST', back: 'BACK', legs: 'LEGS',
  shoulders: 'SHOULDERS', arms: 'ARMS', abs: 'ABS', other: 'OTHER',
}

export default async function AnalyticsChartPage({ searchParams }: PageProps) {
  const params   = await searchParams
  const metric   = params.metric   ?? 'max1rm'
  const range    = params.range    ?? '90d'
  const exercise = params.exercise ?? ''
  const bodypart = params.bodypart ?? 'all'

  const period    = rangeToperiod(range)
  const startDate = getStartDate(period) ?? undefined

  const [rmData, volData, bwData] = await Promise.all([
    metric === 'max1rm'       && exercise ? getExercise1RMData(exercise, startDate)           : Promise.resolve([]),
    metric === 'daily-volume'             ? getBodyPartDailyVolumeData(bodypart, startDate)   : Promise.resolve([]),
    metric === 'body-weight'              ? getBodyWeightData()                                : Promise.resolve([]),
  ])

  const exerciseLabel = metric === 'daily-volume'
    ? (BODY_PART_LABELS[bodypart] ?? bodypart.toUpperCase())
    : exercise

  return (
    <>
      <FeatureTracker feature="fullscreen_chart" />
      <FullScreenChart
        metric={metric}
        range={range}
        exercise={exerciseLabel}
        initialRmData={rmData  as Awaited<ReturnType<typeof getExercise1RMData>>}
        initialVolData={volData as Awaited<ReturnType<typeof getExerciseDailyVolumeData>>}
        initialBwData={bwData  as Awaited<ReturnType<typeof getBodyWeightData>>}
      />
    </>
  )
}
