import { getSessionForShare } from '@/actions/workout'
import { getStatsForShare } from '@/actions/analytics'
import { getTodayWorkoutForShare } from '@/actions/workout'
import ShareView from '@/components/share/ShareView'
import StatsShareView from '@/components/share/StatsShareView'
import TodayShareView from '@/components/share/TodayShareView'
import WorkoutStoryCardContent from '@/components/share/WorkoutStoryCardContent'
import type { TodayData } from '@/components/share/WorkoutStoryCardContent'
import FeatureTracker from '@/components/common/FeatureTracker'
import Link from 'next/link'
import { BarChart2, CalendarDays, ChevronRight, Lock, Crown } from 'lucide-react'
import { cookies, headers } from 'next/headers'
import { resolveServerLocale, type Locale } from '@/lib/i18n'

export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; type?: string; metric?: string; exercise?: string; date?: string }>
}) {
  const params = await searchParams

  if (params.type === 'today') {
    const date = params.date ?? ''
    if (!date) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#0a0a0a' }}>
          <p className="text-white mb-4">Date not specified</p>
          <Link href="/home" className="text-sm" style={{ color: '#ED742F' }}>Back to Home</Link>
        </div>
      )
    }
    const data = await getTodayWorkoutForShare(date)
    if (!data) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0a0a0a' }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', textAlign: 'center', marginBottom: 10, lineHeight: 1.4 }}>
            今日のワークアウト記録がありません
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', textAlign: 'center', marginBottom: 28 }}>
            まずRecordから記録してください
          </p>
          <Link
            href={`/record?date=${date}`}
            className="px-8 py-3 rounded-2xl text-sm font-black text-white"
            style={{ background: '#ED742F', boxShadow: '0 4px 20px rgba(237,116,47,0.30)' }}
          >
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
    const data = await getStatsForShare(params.metric ?? '', params.exercise)
    if (!data) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#0a0a0a' }}>
          <p className="text-white mb-4">Data not found</p>
          <Link href="/analytics" className="text-sm" style={{ color: '#ED742F' }}>Back to Analytics</Link>
        </div>
      )
    }
    return <StatsShareView data={data} />
  }

  const sessionId = params.session

  // Landing page — no type or session specified
  if (!params.type && !sessionId) {
    const todayStr = new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' })

    // Locale resolution (lightweight — no DB query)
    const [cookieStore, headerStore] = await Promise.all([cookies(), headers()])
    const cookieLang = cookieStore.get('liftsnap_lang')?.value
    const locale: Locale = resolveServerLocale(cookieLang, undefined, headerStore.get('accept-language') ?? '')
    const ja = locale === 'ja'

    // Full workout data for accurate mini preview — same React/CSS layout, no image generation
    let todayData: TodayData | null = null
    try {
      todayData = await getTodayWorkoutForShare(todayStr)
    } catch { /* silently skip — preview is optional */ }

    // Sample card shown when no workout logged yet
    const sampleData: TodayData = {
      sessionId: undefined,
      title: 'CHEST & TRI',
      date: todayStr,
      volume: 1700,
      setsCount: 9,
      exercises: [
        {
          name: 'Bench Press',
          setList: [
            { weight: 110, reps: 2 },
            { weight: 100, reps: 8 },
            { weight: 90, reps: 8 },
            { weight: 90, reps: 6 },
          ],
          setCount: 4,
          best1RM: 117,
        },
        {
          name: 'Cable Fly',
          setList: [
            { weight: 40, reps: 4 },
            { weight: 35, reps: 8 },
            { weight: 30, reps: 10 },
          ],
          setCount: 3,
          best1RM: 52,
        },
      ],
      bestLift: { name: 'Bench Press', weight: 110 },
      muscleFocus: 'chest',
      photoPath: null,
    }

    const previewData = todayData ?? sampleData
    const isSample    = !todayData

    const fmtVol = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${v}kg`

    return (
      <div className="min-h-screen pb-nav" style={{ background: '#080808' }}>

        {/* ── Header ── */}
        <div className="px-4 pt-10 pb-5">
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.36)', marginBottom: 8 }}>
            SHARE
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
            {ja ? '今日の努力を、1枚の証拠に。' : 'Create your proof.'}
          </h1>
          <p style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.48)', marginTop: 5 }}>
            {ja ? '今日のトレーニングをストーリーカードに変換する' : "Turn today's workout into a story."}
          </p>
        </div>

        <div className="px-4 flex flex-col gap-3" style={{ paddingBottom: 24 }}>

          {/* ── Featured: Today's Workout Story ── */}
          <Link href={`/share?type=today&date=${todayStr}`} className="block active:opacity-90 transition-opacity">
            <div style={{
              background: '#1A1A1A',
              border: '1px solid rgba(237,116,47,0.28)',
              borderRadius: 20,
              overflow: 'hidden',
            }}>
              {/* Orange accent top bar */}
              <div style={{ height: 2, background: 'linear-gradient(90deg, #ED742F 0%, rgba(237,116,47,0.14) 65%, transparent 100%)' }} />

              <div style={{ padding: '16px 18px 18px' }}>
                {/* Badge row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{
                    fontSize: 8, fontWeight: 800, letterSpacing: '0.14em',
                    padding: '3px 9px', borderRadius: 20,
                    background: 'rgba(237,116,47,0.14)',
                    border: '1px solid rgba(237,116,47,0.24)',
                    color: 'rgba(237,116,47,0.92)',
                  }}>FEATURED</span>
                  <ChevronRight size={14} color="rgba(237,116,47,0.55)" />
                </div>

                {/* Title + desc */}
                <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1.2, marginBottom: 4 }}>
                  Workout Story
                </p>
                <p style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.44)', marginBottom: 14, lineHeight: 1.5 }}>
                  {ja
                    ? 'トレーニングをInstagramストーリー用カードに変換'
                    : "Today's training as an Instagram story card."}
                </p>

                {/* ── Mini Story Preview — same WorkoutStoryCardContent, scaled down ── */}
                {/* No canvas / html-to-image — pure React/CSS layout */}
                <div style={{
                  position: 'relative',
                  height: 250,
                  overflow: 'hidden',
                  borderRadius: 12,
                  marginBottom: 14,
                  // Match glass card background so clipped bottom blends naturally
                  background: 'rgba(18,18,18,1)',
                }}>
                  {/* Scale wrapper: 420px card → ~70% → ~294px visual width */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%) scale(0.70)',
                    transformOrigin: 'top center',
                    width: 420,
                    pointerEvents: 'none',
                  }}>
                    <WorkoutStoryCardContent
                      data={previewData}
                      cardStyle="glass"
                      accent="white"
                      unit="kg"
                      locale={locale}
                      hasPhoto={false}
                      isPast={false}
                    />
                  </div>
                  {/* Fade-out gradient at bottom to hint at more content */}
                  <div style={{
                    position: 'absolute',
                    bottom: 0, left: 0, right: 0, height: 64,
                    background: 'linear-gradient(to top, rgba(18,18,18,1), transparent)',
                    pointerEvents: 'none',
                  }} />
                  {/* Sample badge when no real workout */}
                  {isSample && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      fontSize: 8, fontWeight: 700, letterSpacing: '0.08em',
                      padding: '3px 7px', borderRadius: 6,
                      background: 'rgba(255,255,255,0.07)',
                      color: 'rgba(255,255,255,0.36)',
                      pointerEvents: 'none',
                    }}>SAMPLE</div>
                  )}
                </div>

                {/* Stats chips (real data only) */}
                {todayData && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                    {[
                      fmtVol(todayData.volume),
                      `${todayData.setsCount} sets`,
                      `${todayData.exercises.length} exercises`,
                    ].map(chip => (
                      <span key={chip} style={{
                        fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.46)',
                        padding: '3px 9px', borderRadius: 10,
                        background: 'rgba(255,255,255,0.05)',
                      }}>{chip}</span>
                    ))}
                  </div>
                )}

                {/* CTA button */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: '#ED742F', borderRadius: 13, padding: '12px 0',
                  boxShadow: '0 4px 16px rgba(237,116,47,0.30)',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>
                    {ja ? 'Storyを作成' : 'Create Story'}
                  </span>
                  <ChevronRight size={13} color="rgba(255,255,255,0.82)" />
                </div>
              </div>
            </div>
          </Link>

          {/* ── Stats Graph Story ── */}
          <Link href="/share/stats" className="block active:opacity-70 transition-opacity">
            <div style={{
              background: '#181818',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 18,
            }}>
              <div style={{ padding: '14px 16px 14px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  flexShrink: 0, width: 46, height: 46, borderRadius: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(34,197,94,0.11)',
                }}>
                  <BarChart2 size={21} color="#22c55e" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 3, lineHeight: 1.2 }}>
                    Stats Graph Story
                  </p>
                  <p style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.46)', lineHeight: 1.4 }}>
                    {ja ? '成長グラフをシェア' : 'Share your growth chart'}
                  </p>
                  <p style={{ fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.28)', marginTop: 2, lineHeight: 1 }}>
                    MAX 1RM · Volume · Body Weight
                  </p>
                </div>
                <ChevronRight size={15} color="rgba(255,255,255,0.28)" />
              </div>
            </div>
          </Link>

          {/* ── Calendar Summary — coming soon ── */}
          <div style={{
            background: '#141414',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 18,
            opacity: 0.6,
          }}>
            <div style={{ padding: '14px 16px 14px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                flexShrink: 0, width: 46, height: 46, borderRadius: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.05)',
              }}>
                <CalendarDays size={21} color="rgba(255,255,255,0.36)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.58)', marginBottom: 3, lineHeight: 1.2 }}>
                  Calendar Summary
                </p>
                <p style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.34)', lineHeight: 1.4 }}>
                  {ja ? '月間トレーニングのまとめカード' : 'Monthly training recap'}
                </p>
                <p style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.26)', marginTop: 3, lineHeight: 1 }}>
                  Coming soon
                </p>
              </div>
              <Lock size={13} color="rgba(255,255,255,0.22)" />
            </div>
          </div>

          {/* ── Pro Templates ── locked placeholder ── */}
          <div style={{
            background: '#111111',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 18,
            marginTop: 4,
          }}>
            <div style={{ padding: '14px 16px 14px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                flexShrink: 0, width: 46, height: 46, borderRadius: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.04)',
              }}>
                <Crown size={20} color="rgba(255,255,255,0.28)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.48)', lineHeight: 1.2 }}>
                    Pro Templates
                  </p>
                  <span style={{
                    fontSize: 8, fontWeight: 700, letterSpacing: '0.08em',
                    padding: '2px 6px', borderRadius: 5,
                    background: 'rgba(255,255,255,0.07)',
                    color: 'rgba(255,255,255,0.34)',
                  }}>PRO</span>
                </div>
                <p style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.30)', lineHeight: 1.4 }}>
                  Minimal Black · Graph Pro · No Watermark
                </p>
              </div>
              <Lock size={13} color="rgba(255,255,255,0.20)" />
            </div>
          </div>

        </div>
      </div>
    )
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#0a0a0a' }}>
        <p className="text-white mb-4">セッションが見つかりません</p>
        <Link href="/home" className="text-sm" style={{ color: '#ED742F' }}>ホームへ戻る</Link>
      </div>
    )
  }

  const data = await getSessionForShare(sessionId)
  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#0a0a0a' }}>
        <p className="text-white mb-4">データが見つかりません</p>
        <Link href="/home" className="text-sm" style={{ color: '#ED742F' }}>ホームへ戻る</Link>
      </div>
    )
  }

  return <ShareView data={data} />
}
