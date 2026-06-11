import { getSessionForShare } from '@/actions/workout'
import { getStatsForShare, getExercisesWithHistory, getBodyWeightData } from '@/actions/analytics'
import { getTodayWorkoutForShare } from '@/actions/workout'
import { getDemoTodayWorkoutForShare } from '@/actions/demo'
import { REPRA_DEMO_USER_ID } from '@/lib/demoConstants'
import ShareView from '@/components/share/ShareView'
import StatsShareView from '@/components/share/StatsShareView'
import StatsShareGuestView from '@/components/share/StatsShareGuestView'
import TodayShareView from '@/components/share/TodayShareView'
import ShareGuestView from '@/components/share/ShareGuestView'
import ShareLandingView from '@/components/share/ShareLandingView'
import type { TodayData } from '@/components/share/WorkoutStoryCardContent'
import FeatureTracker from '@/components/common/FeatureTracker'
import Link from 'next/link'
import { cookies, headers } from 'next/headers'
import { resolveServerLocale, type Locale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'

export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; type?: string; metric?: string; exercise?: string; date?: string; bodypart?: string; demoUserId?: string }>
}) {
  const params = await searchParams
  const demoUserId = params.demoUserId === REPRA_DEMO_USER_ID ? params.demoUserId : null

  if (params.type === 'today') {
    const date = params.date ?? ''
    if (!date) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--app-bg)' }}>
          <p style={{ color: 'var(--text-primary)', marginBottom: 16 }}>Date not specified</p>
          <Link href="/home" className="text-sm" style={{ color: '#ED742F' }}>Back to Home</Link>
        </div>
      )
    }

    // Demo mode: use demo user's Supabase data directly (no auth required)
    if (demoUserId) {
      const data = await getDemoTodayWorkoutForShare(demoUserId, date)
      if (!data) {
        return (
          <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: 'var(--app-bg)' }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 10 }}>
              No workout found for this date
            </p>
            <Link href="/home" className="px-8 py-3 rounded-2xl text-sm font-black text-white"
              style={{ background: '#ED742F' }}>
              Back to Home
            </Link>
          </div>
        )
      }
      return (
        <>
          <FeatureTracker feature="story" />
          <TodayShareView data={data} />
        </>
      )
    }

    // In local-only mode, load from localStorage via client component
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return (
        <>
          <FeatureTracker feature="story" />
          <ShareGuestView date={date} />
        </>
      )
    }
    const data = await getTodayWorkoutForShare(date)
    if (!data) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: 'var(--app-bg)' }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 10, lineHeight: 1.4 }}>
            今日のワークアウト記録がありません
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 28 }}>
            まずRecordから記録してください
          </p>
          <Link href={`/record?date=${date}`}
            className="px-8 py-3 rounded-2xl text-sm font-black text-white"
            style={{ background: '#ED742F', boxShadow: '0 4px 20px rgba(237,116,47,0.30)' }}>
            Recordで記録する
          </Link>
        </div>
      )
    }
    return (
      <>
        <FeatureTracker feature="story" />
        <TodayShareView data={data} />
      </>
    )
  }

  if (params.type === 'stats') {
    const supabase2 = await createClient()
    const { data: { user: statsUser } } = await supabase2.auth.getUser()
    if (!statsUser) {
      return (
        <StatsShareGuestView
          metric={params.metric ?? ''}
          exercise={params.exercise}
          bodypart={params.bodypart}
        />
      )
    }
    const data = await getStatsForShare(params.metric ?? '', params.exercise, params.bodypart).catch(() => null)
    if (!data) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--app-bg)' }}>
          <p style={{ color: 'var(--text-primary)', marginBottom: 16 }}>Data not found</p>
          <Link href="/analytics" className="text-sm" style={{ color: '#ED742F' }}>Back to Analytics</Link>
        </div>
      )
    }
    return <StatsShareView data={data} />
  }

  const sessionId = params.session

  // ── Landing page ──────────────────────────────────────────────────
  if (!params.type && !sessionId) {
    const todayStr = new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' })

    const [cookieStore, headerStore] = await Promise.all([cookies(), headers()])
    const cookieLang = cookieStore.get('liftsnap_lang')?.value
    const locale: Locale = resolveServerLocale(cookieLang, undefined, headerStore.get('accept-language') ?? '')
    const ja = locale === 'ja'

    const [todayData, exercisesData, bwData] = await Promise.all([
      getTodayWorkoutForShare(todayStr).catch((): TodayData | null => null),
      getExercisesWithHistory().catch(() => [] as { name: string; muscle_group: string; logCount: number }[]),
      getBodyWeightData().catch(() => [] as { date: string; label: string; weight: number }[]),
    ])
    const hasExercises  = exercisesData.length > 0
    const hasBodyWeight = bwData.length > 0

    const sampleData: TodayData = {
      sessionId: undefined,
      title: 'CHEST & TRI',
      date: todayStr,
      volume: 1700,
      setsCount: 9,
      exercises: [
        {
          name: 'Bench Press',
          setList: [{ weight: 110, reps: 2 }, { weight: 100, reps: 8 }, { weight: 90, reps: 8 }, { weight: 90, reps: 6 }],
          setCount: 4, best1RM: 117,
        },
        {
          name: 'Cable Fly',
          setList: [{ weight: 40, reps: 4 }, { weight: 35, reps: 8 }, { weight: 30, reps: 10 }],
          setCount: 3, best1RM: 52,
        },
      ],
      bestLift: { name: 'Bench Press', weight: 110 },
      muscleFocus: 'chest',
      photoPath: null,
    }

    const previewData = todayData ?? sampleData
    const isSample    = !todayData

    return (
      <>
        <FeatureTracker feature="share" />
        <ShareLandingView
          previewData={previewData}
          isSample={isSample}
          locale={locale}
          ja={ja}
          todayData={todayData}
          hasExercises={hasExercises}
          hasBodyWeight={hasBodyWeight}
          todayStr={todayStr}
        />
      </>
    )
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--app-bg)' }}>
        <p style={{ color: 'var(--text-primary)', marginBottom: 16 }}>セッションが見つかりません</p>
        <Link href="/home" className="text-sm" style={{ color: '#ED742F' }}>ホームへ戻る</Link>
      </div>
    )
  }

  const data = await getSessionForShare(sessionId)
  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--app-bg)' }}>
        <p style={{ color: 'var(--text-primary)', marginBottom: 16 }}>データが見つかりません</p>
        <Link href="/home" className="text-sm" style={{ color: '#ED742F' }}>ホームへ戻る</Link>
      </div>
    )
  }

  return <ShareView data={data} />
}
