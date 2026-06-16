'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Trophy, Check, Camera, PlusCircle } from 'lucide-react'
import {
  getTrainingUnlocks,
  getShareThemeUnlocks,
  getWorkoutBadgeUnlocks,
  getBodyLogBadgeUnlocks,
  getConsistencyBadgeUnlocks,
  getProofStreakBadgeUnlocks,
  EXERCISE_GRAPH_REQUIRED,
  getShareCount,
  type TrainingMilestoneId,
  type WorkoutBadgeId,
  type BodyLogBadgeId,
  type ConsistencyBadgeId,
  type ProofStreakBadgeId,
} from '@/lib/unlocks'
import { getRewardsData } from '@/actions/rewards'
import { useLocale } from '@/lib/useLocale'
import { t, type Locale } from '@/lib/i18n'

/* ── Constants ──────────────────────────────────────────────── */

const ALWAYS_SHOW = ['ベンチプレス', 'スクワット', 'デッドリフト']

const JA_EN: Record<string, string> = {
  'ベンチプレス': 'Bench Press',           'スクワット': 'Squat',
  'デッドリフト': 'Deadlift',              'バーベルスクワット': 'Barbell Squat',
  'フロントスクワット': 'Front Squat',     'インクラインベンチプレス': 'Incline Bench Press',
  'ダンベルベンチプレス': 'DB Bench Press','ルーマニアンデッドリフト': 'Romanian DL',
  'ショルダープレス': 'Shoulder Press',    'オーバーヘッドプレス': 'Overhead Press',
  'ラットプルダウン': 'Lat Pulldown',      'チンニング': 'Chin-up',
  'プルアップ': 'Pull-up',                '懸垂': 'Pull-up',
  'バーベルロウ': 'Barbell Row',           'ベントオーバーロウ': 'Bent Over Row',
  'レッグプレス': 'Leg Press',             'レッグカール': 'Leg Curl',
  'バーベルカール': 'Barbell Curl',        'ダンベルカール': 'DB Curl',
  'ハンマーカール': 'Hammer Curl',         'ディップス': 'Dips',
  'ヒップスラスト': 'Hip Thrust',          'ブルガリアンスクワット': 'Bulgarian Split Squat',
  'サイドレイズ': 'Lateral Raise',         'フェイスプル': 'Face Pull',
  'シュラッグ': 'Shrug',                   'ランジ': 'Lunge',
}
const toEn = (name: string) => JA_EN[name] ?? name

const THEME_DOT: Record<string, string> = {
  dark:   'rgba(255,255,255,0.28)',
  orange: '#ED742F',
  purple: '#6E38D4',
  black:  '#e0e0e0',
}

type Tab = 'overview' | 'photos' | 'streak' | 'unlocks'
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'photos',   label: 'Photos'   },
  { id: 'streak',   label: 'Streak'   },
  { id: 'unlocks',  label: 'Unlocks'  },
]

/* ── Main component ─────────────────────────────────────────── */

export default function RewardsView() {
  const { locale } = useLocale()
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const [totalSessions, setTotalSessions]       = useState(0)
  const [exercises, setExercises]               = useState<{ name: string; logCount: number }[]>([])
  const [photoCount, setPhotoCount]             = useState(0)
  const [uniqueWorkoutDays, setUniqueDays]      = useState(0)
  const [bestProofStreak, setBestProofStreak]   = useState(0)
  const [proofStreak, setProofStreak]           = useState(0)
  const [thisWeekProof, setThisWeekProof]       = useState(false)
  const [thisWeekWorkouts, setThisWeekWorkouts] = useState(0)
  const [thisWeekPhotos, setThisWeekPhotos]     = useState(0)
  const [recentPhotos, setRecentPhotos]         = useState<{ date: string; signedUrl: string }[]>([])
  const [shareCount, setShareCount]             = useState(0)
  const [dataLoaded, setDataLoaded]             = useState(false)

  useEffect(() => { setShareCount(getShareCount()) }, [])

  useEffect(() => {
    getRewardsData()
      .then(d => {
        setTotalSessions(d.totalSessions)
        setExercises(d.exercises)
        setPhotoCount(d.photoCount)
        setUniqueDays(d.uniqueWorkoutDays)
        setBestProofStreak(d.bestProofStreak)
        setProofStreak(d.proofStreak)
        setThisWeekProof(d.thisWeekProof)
        setThisWeekWorkouts(d.thisWeekWorkouts)
        setThisWeekPhotos(d.thisWeekPhotos)
        setRecentPhotos(d.recentPhotos)
      })
      .catch(err => console.error('[Proof] fetch failed', err))
      .finally(() => setDataLoaded(true))
  }, [])

  const shareThemes       = useMemo(() => getShareThemeUnlocks(shareCount), [shareCount])
  const workoutBadges     = useMemo(() => getWorkoutBadgeUnlocks(totalSessions), [totalSessions])
  const bodyLogBadges     = useMemo(() => getBodyLogBadgeUnlocks(photoCount), [photoCount])
  const consistencyBadges = useMemo(() => getConsistencyBadgeUnlocks(uniqueWorkoutDays), [uniqueWorkoutDays])
  const proofStreakBadges = useMemo(() => getProofStreakBadgeUnlocks(bestProofStreak), [bestProofStreak])

  const allExercises = useMemo(() => {
    const map = new Map<string, number>()
    exercises.forEach(e => map.set(e.name, e.logCount))
    ALWAYS_SHOW.forEach(n => { if (!map.has(n)) map.set(n, 0) })
    return Array.from(map.entries())
      .map(([name, logCount]) => ({ name, logCount }))
      .sort((a, b) => {
        const aU = a.logCount >= EXERCISE_GRAPH_REQUIRED
        const bU = b.logCount >= EXERCISE_GRAPH_REQUIRED
        if (aU !== bU) return bU ? 1 : -1
        return b.logCount - a.logCount
      })
  }, [exercises])

  const maxExerciseLogCount = useMemo(
    () => allExercises.length > 0 ? Math.max(...allExercises.map(e => e.logCount)) : 0,
    [allExercises],
  )
  const trainingUnlocks = useMemo(
    () => getTrainingUnlocks(totalSessions, maxExerciseLogCount),
    [totalSessions, maxExerciseLogCount],
  )

  // Top-2 closest locked rewards for Overview
  const nextUnlocks = useMemo(() => {
    type Candidate = { label: string; current: number; required: number; unit: string; pct: number }
    const c: Candidate[] = []
    workoutBadges.filter(b => !b.unlocked).forEach(b => c.push({
      label: b.label, current: b.progress, required: b.requiredSessions,
      unit: locale === 'ja' ? '回' : (b.requiredSessions === 1 ? 'session' : 'sessions'),
      pct: b.requiredSessions > 0 ? b.progress / b.requiredSessions : 0,
    }))
    bodyLogBadges.filter(b => !b.unlocked).forEach(b => c.push({
      label: b.label, current: b.progress, required: b.requiredPhotos,
      unit: locale === 'ja' ? '枚' : (b.requiredPhotos === 1 ? 'photo' : 'photos'),
      pct: b.requiredPhotos > 0 ? b.progress / b.requiredPhotos : 0,
    }))
    proofStreakBadges.filter(b => !b.unlocked).forEach(b => c.push({
      label: b.label, current: b.progress, required: b.requiredStreak,
      unit: locale === 'ja' ? '週' : (b.requiredStreak === 1 ? 'week' : 'weeks'),
      pct: b.requiredStreak > 0 ? b.progress / b.requiredStreak : 0,
    }))
    shareThemes.filter(th => !th.unlocked && th.requiredShares > 0).forEach(th => c.push({
      label: locale === 'ja' ? `${th.label} テーマ` : `${th.label} Theme`,
      current: shareCount, required: th.requiredShares,
      unit: locale === 'ja' ? '回' : 'shares',
      pct: th.requiredShares > 0 ? shareCount / th.requiredShares : 0,
    }))
    return c.sort((a, b) => b.pct - a.pct).slice(0, 2)
  }, [workoutBadges, bodyLogBadges, proofStreakBadges, shareThemes, shareCount, locale])

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#080808' }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="px-4 pt-14 pb-3">
        <div className="flex items-center gap-2.5 mb-1">
          <Trophy size={16} strokeWidth={2} style={{ color: '#ED742F' }} />
          <h1 className="text-xl font-black tracking-widest text-white">PROOF</h1>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.68)' }}>
          {t(locale, 'proof.subtitle')}
        </p>
      </div>

      {/* ── Tab Bar ─────────────────────────────────────────── */}
      <div className="px-4 mb-5">
        <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-shrink-0"
              style={{
                padding: '7px 16px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.01em',
                background: activeTab === tab.id ? '#ED742F' : 'rgba(255,255,255,0.09)',
                color:      activeTab === tab.id ? '#fff'    : 'rgba(255,255,255,0.60)',
                border:     activeTab === tab.id ? 'none'    : '1px solid rgba(255,255,255,0.16)',
                transition: 'background 150ms, color 150ms',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ─────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <OverviewTab
          locale={locale}
          dataLoaded={dataLoaded}
          totalSessions={totalSessions}
          photoCount={photoCount}
          proofStreak={proofStreak}
          thisWeekProof={thisWeekProof}
          thisWeekWorkouts={thisWeekWorkouts}
          thisWeekPhotos={thisWeekPhotos}
          recentPhotos={recentPhotos.slice(0, 3)}
          nextUnlocks={nextUnlocks}
          onShowPhotos={() => setActiveTab('photos')}
        />
      )}
      {activeTab === 'photos' && (
        <PhotosTab
          locale={locale}
          dataLoaded={dataLoaded}
          photoCount={photoCount}
          recentPhotos={recentPhotos}
          bodyLogBadges={bodyLogBadges}
        />
      )}
      {activeTab === 'streak' && (
        <StreakTab
          locale={locale}
          dataLoaded={dataLoaded}
          proofStreak={proofStreak}
          bestProofStreak={bestProofStreak}
          thisWeekProof={thisWeekProof}
          thisWeekWorkouts={thisWeekWorkouts}
          thisWeekPhotos={thisWeekPhotos}
          consistencyBadges={consistencyBadges}
          proofStreakBadges={proofStreakBadges}
        />
      )}
      {activeTab === 'unlocks' && (
        <UnlocksTab
          locale={locale}
          workoutBadges={workoutBadges}
          trainingUnlocks={trainingUnlocks}
          allExercises={allExercises}
          shareThemes={shareThemes}
          shareCount={shareCount}
        />
      )}

    </div>
  )
}

/* ═══ Tab: Overview ══════════════════════════════════════════ */

function OverviewTab({
  locale, dataLoaded,
  totalSessions, photoCount, proofStreak,
  thisWeekProof, thisWeekWorkouts, thisWeekPhotos,
  recentPhotos, nextUnlocks, onShowPhotos,
}: {
  locale: Locale
  dataLoaded: boolean
  totalSessions: number
  photoCount: number
  proofStreak: number
  thisWeekProof: boolean
  thisWeekWorkouts: number
  thisWeekPhotos: number
  recentPhotos: { date: string; signedUrl: string }[]
  nextUnlocks: { label: string; current: number; required: number; unit: string }[]
  onShowPhotos: () => void
}) {
  const weekDone = thisWeekProof || thisWeekWorkouts >= 2 || thisWeekPhotos >= 1

  return (
    <div className="px-4 space-y-5 pb-6">

      {/* ── Proof Summary ── */}
      <div className="rounded-2xl p-4" style={{ background: '#171717', border: '1px solid rgba(255,255,255,0.14)' }}>
        <div className="grid grid-cols-2 gap-3">
          <ProofSummaryCell
            label={t(locale, 'proof.summaryWorkouts')}
            value={dataLoaded ? String(totalSessions) : '—'}
            loading={!dataLoaded}
          />
          <ProofSummaryCell
            label={t(locale, 'proof.summaryPhotos')}
            value={dataLoaded ? String(photoCount) : '—'}
            loading={!dataLoaded}
          />
          <ProofSummaryCell
            label={t(locale, 'proof.summaryStreak')}
            value={dataLoaded
              ? `${proofStreak}${locale === 'ja'
                  ? t(locale, 'proof.summaryStreakUnit')
                  : proofStreak === 1 ? ' wk' : ' wks'}`
              : '—'}
            loading={!dataLoaded}
            accent
          />
        </div>
      </div>

      {/* ── Visible Proof (3 photos) ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black tracking-widest" style={{ color: '#ED742F' }}>
            {t(locale, 'proof.visibleProof')}
          </p>
          <button
            onClick={onShowPhotos}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <span className="text-[10px] font-bold" style={{ color: 'rgba(237, 116, 47,0.75)' }}>
              {locale === 'ja' ? 'Photosタブへ →' : 'View Photos →'}
            </span>
          </button>
        </div>

        {!dataLoaded ? (
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex-shrink-0 rounded-xl"
                style={{ width: 78, height: 78, background: '#1E1E1E' }} />
            ))}
          </div>
        ) : recentPhotos.length > 0 ? (
          <div className="flex gap-2">
            {recentPhotos.map(photo => (
              <Link key={photo.date} href={`/body-timeline?date=${photo.date}`}
                className="flex-shrink-0 active:opacity-70 transition-opacity"
                style={{ textDecoration: 'none' }}>
                <div className="relative rounded-xl overflow-hidden" style={{ width: 78, height: 106 }}>
                  <Image
                    src={photo.signedUrl} alt={photo.date}
                    fill className="object-contain" sizes="78px" unoptimized
                    style={{ background: '#171717' }}
                  />
                </div>
                <p className="text-[9px] mt-1 text-center"
                  style={{ color: 'rgba(255,255,255,0.56)', width: 78 }}>
                  {photo.date.slice(5).replace('-', '/')}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
            style={{ background: '#171717', border: '1px solid rgba(255,255,255,0.14)' }}>
            <Camera size={15} style={{ color: 'rgba(237, 116, 47,0.50)', flexShrink: 0 }} />
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.60)' }}>
              {locale === 'ja'
                ? 'まだ写真がありません。ワークアウト後に追加しよう。'
                : 'No photos yet — add one after your workout.'}
            </p>
          </div>
        )}
      </div>

      {/* ── This Week ── */}
      <div>
        <p className="text-[10px] font-black tracking-widest mb-2" style={{ color: '#ED742F' }}>
          THIS WEEK
        </p>
        <div className="rounded-2xl p-4" style={{ background: '#171717', border: '1px solid rgba(255,255,255,0.14)' }}>
          <p className="text-[10px] mb-3 leading-relaxed" style={{ color: 'rgba(255,255,255,0.60)' }}>
            {locale === 'ja'
              ? 'どれか1つ達成でProof Week完了'
              : 'Complete any one condition for a Proof Week'}
          </p>
          <div className="space-y-2.5">
            <WeekConditionRow
              label={locale === 'ja' ? 'ワークアウト' : 'Workouts'}
              current={thisWeekWorkouts} required={2}
              done={thisWeekWorkouts >= 2} loading={!dataLoaded}
            />
            <WeekConditionRow
              label={locale === 'ja' ? '体写真' : 'Body photos'}
              current={thisWeekPhotos} required={1}
              done={thisWeekPhotos >= 1} loading={!dataLoaded}
            />
            <WeekConditionRow
              label={locale === 'ja' ? 'ストーリー' : 'Stories'}
              current={0} required={1} done={false}
              loading={false} comingSoon locale={locale}
            />
          </div>
          {weekDone && (
            <div className="flex items-center gap-2 mt-3 pt-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.13)' }}>
              <Check size={13} strokeWidth={2.5} style={{ color: '#22c55e', flexShrink: 0 }} />
              <p className="text-[12px] font-black" style={{ color: '#22c55e' }}>
                {locale === 'ja' ? '今週のProof Week達成！' : 'Proof Week completed!'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Next Unlocks ── */}
      {nextUnlocks.length > 0 && (
        <div>
          <p className="text-[10px] font-black tracking-widest mb-2" style={{ color: '#ED742F' }}>
            NEXT UNLOCKS
          </p>
          <div className="rounded-2xl overflow-hidden"
            style={{ background: '#171717', border: '1px solid rgba(255,255,255,0.14)' }}>
            {nextUnlocks.map((u, i) => {
              const pct = u.required > 0 ? Math.min((u.current / u.required) * 100, 100) : 0
              return (
                <div key={u.label} className="px-4 py-3.5"
                  style={{ borderBottom: i === nextUnlocks.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[12px] font-bold" style={{ color: '#ccc' }}>{u.label}</p>
                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.56)' }}>
                      {u.current} / {u.required} {u.unit}
                    </span>
                  </div>
                  <div className="h-[3px] rounded-full" style={{ background: 'rgba(255,255,255,0.11)' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%', borderRadius: 999,
                      background: 'rgba(237, 116, 47,0.75)',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}

/* ═══ Tab: Photos ════════════════════════════════════════════ */

function PhotosTab({
  locale, dataLoaded, photoCount, recentPhotos, bodyLogBadges,
}: {
  locale: Locale
  dataLoaded: boolean
  photoCount: number
  recentPhotos: { date: string; signedUrl: string }[]
  bodyLogBadges: ReturnType<typeof getBodyLogBadgeUnlocks>
}) {
  return (
    <div className="px-4 space-y-6 pb-6">

      {/* ── Visible Proof ── */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-black tracking-widest" style={{ color: '#ED742F' }}>
            {t(locale, 'proof.visibleProof')}
          </p>
          {photoCount > 0 && (
            <Link href="/body-timeline"
              className="active:opacity-60 transition-opacity"
              style={{ textDecoration: 'none' }}>
              <span className="text-[10px] font-bold" style={{ color: 'rgba(237, 116, 47,0.75)' }}>
                {locale === 'ja' ? 'タイムラインで見る →' : 'View Timeline →'}
              </span>
            </Link>
          )}
        </div>
        <p className="text-[11px] mb-3 leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
          {t(locale, 'proof.visibleProofSub')}
        </p>

        {/* Add photo CTA */}
        <Link href="/body-log" style={{ textDecoration: 'none' }} aria-label="Add body photo">
          <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 mb-3 active:opacity-70 transition-opacity"
            style={{ background: 'rgba(237, 116, 47,0.12)', border: '1px solid rgba(237, 116, 47,0.32)' }}>
            <PlusCircle size={14} style={{ color: '#ED742F', flexShrink: 0 }} />
            <p className="text-[12px] font-bold" style={{ color: '#ED742F' }}>
              {locale === 'ja' ? '今日の体写真を追加' : "Add today's body photo"}
            </p>
          </div>
        </Link>

        {!dataLoaded ? (
          <div className="flex gap-2 overflow-hidden">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="flex-shrink-0 rounded-xl"
                style={{ width: 88, height: 120, background: '#1E1E1E' }} />
            ))}
          </div>
        ) : recentPhotos.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {recentPhotos.map(photo => (
              <Link key={photo.date} href={`/body-timeline?date=${photo.date}`}
                className="flex-shrink-0 active:opacity-70 transition-opacity"
                style={{ textDecoration: 'none' }}>
                <div className="relative rounded-xl overflow-hidden" style={{ width: 88, height: 120 }}>
                  <Image
                    src={photo.signedUrl} alt={photo.date}
                    fill className="object-contain" sizes="88px" unoptimized
                    style={{ background: '#171717' }}
                  />
                </div>
                <p className="text-[9px] mt-1 text-center"
                  style={{ color: 'rgba(255,255,255,0.56)', width: 88 }}>
                  {photo.date.slice(5).replace('-', '/')}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <Link href="/body-log" style={{ textDecoration: 'none' }}>
            <div className="flex items-center gap-3 rounded-2xl px-4 py-4 active:opacity-70 transition-opacity"
              style={{ background: '#171717', border: '1px solid rgba(255,255,255,0.14)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(237, 116, 47,0.12)', border: '1px solid rgba(237, 116, 47,0.28)' }}>
                <Camera size={18} style={{ color: 'rgba(237, 116, 47,0.60)' }} />
              </div>
              <div>
                <p className="text-[12px] font-bold" style={{ color: 'rgba(255,255,255,0.70)' }}>
                  {t(locale, 'proof.noPhotos')}
                </p>
                <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.56)' }}>
                  {t(locale, 'proof.noPhotosSub')}
                </p>
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* ── Body Log Rewards ── */}
      <RewardSection title="BODY LOG" sub={t(locale, 'rewards.sectionBodyLog')}>
        {bodyLogBadges.map((b, i) => (
          <BadgeRow
            key={b.id}
            label={b.label}
            description={t(locale, `rewards.bodyLog.${b.id as BodyLogBadgeId}`)}
            current={b.progress}
            required={b.requiredPhotos}
            unlocked={b.unlocked}
            progressUnit={locale === 'ja' ? '枚' : (b.requiredPhotos === 1 ? 'photo' : 'photos')}
            isLast={i === bodyLogBadges.length - 1}
            locale={locale}
          />
        ))}
      </RewardSection>

    </div>
  )
}

/* ═══ Tab: Streak ════════════════════════════════════════════ */

function StreakTab({
  locale, dataLoaded,
  proofStreak, bestProofStreak,
  thisWeekProof, thisWeekWorkouts, thisWeekPhotos,
  consistencyBadges, proofStreakBadges,
}: {
  locale: Locale
  dataLoaded: boolean
  proofStreak: number
  bestProofStreak: number
  thisWeekProof: boolean
  thisWeekWorkouts: number
  thisWeekPhotos: number
  consistencyBadges: ReturnType<typeof getConsistencyBadgeUnlocks>
  proofStreakBadges: ReturnType<typeof getProofStreakBadgeUnlocks>
}) {
  const weekDone = thisWeekProof || thisWeekWorkouts >= 2 || thisWeekPhotos >= 1

  return (
    <div className="px-4 space-y-6 pb-6">

      {/* ── Streak hero ── */}
      <div className="rounded-2xl p-4"
        style={{ background: '#171717', border: '1px solid rgba(237, 116, 47,0.32)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black tracking-widest mb-2"
              style={{ color: 'rgba(237, 116, 47,0.70)' }}>PROOF STREAK</p>
            <div className="flex items-baseline gap-1.5">
              <span className="font-black leading-none" style={{ fontSize: 48, color: '#ED742F' }}>
                {dataLoaded ? proofStreak : '—'}
              </span>
              <span className="text-[14px] font-bold" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {locale === 'ja' ? '週' : proofStreak === 1 ? 'week' : 'weeks'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] mb-1.5" style={{ color: 'rgba(255,255,255,0.68)' }}>
              {locale === 'ja' ? 'ベスト' : 'BEST'}
            </p>
            <p className="font-black" style={{ color: 'rgba(255,255,255,0.65)', fontSize: 22, lineHeight: 1 }}>
              {dataLoaded ? bestProofStreak : '—'}
              <span className="text-[11px] font-normal ml-1" style={{ color: 'rgba(255,255,255,0.68)' }}>
                {locale === 'ja' ? '週' : 'wks'}
              </span>
            </p>
          </div>
        </div>
        {weekDone && (
          <div className="flex items-center gap-2 mt-3 pt-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.14)' }}>
            <Check size={13} strokeWidth={2.5} style={{ color: '#22c55e', flexShrink: 0 }} />
            <p className="text-[12px] font-black" style={{ color: '#22c55e' }}>
              {locale === 'ja' ? '今週のProof Week達成！' : 'This week completed!'}
            </p>
          </div>
        )}
      </div>

      {/* ── This Week Progress ── */}
      <div>
        <p className="text-[10px] font-black tracking-widest mb-2" style={{ color: '#ED742F' }}>THIS WEEK</p>
        <div className="rounded-2xl p-4" style={{ background: '#171717', border: '1px solid rgba(255,255,255,0.14)' }}>
          <p className="text-[10px] mb-3 leading-relaxed" style={{ color: 'rgba(255,255,255,0.60)' }}>
            {locale === 'ja'
              ? 'どれか1つ達成でProof Week完了。毎日投稿は不要です。'
              : 'Complete any one. Rest days are okay — tracked weekly.'}
          </p>
          <div className="space-y-2.5">
            <WeekConditionRow
              label={locale === 'ja' ? 'ワークアウト' : 'Workouts'}
              current={thisWeekWorkouts} required={2}
              done={thisWeekWorkouts >= 2} loading={!dataLoaded}
            />
            <WeekConditionRow
              label={locale === 'ja' ? '体写真' : 'Body photos'}
              current={thisWeekPhotos} required={1}
              done={thisWeekPhotos >= 1} loading={!dataLoaded}
            />
            <WeekConditionRow
              label={locale === 'ja' ? 'ストーリー' : 'Stories'}
              current={0} required={1} done={false}
              loading={false} comingSoon locale={locale}
            />
          </div>
        </div>
      </div>

      {/* ── Proof Week Rules ── */}
      <div className="rounded-2xl px-4 py-3"
        style={{ background: 'rgba(237, 116, 47,0.10)', border: '1px solid rgba(237, 116, 47,0.28)' }}>
        <p className="text-[10px] font-black tracking-widest mb-2.5" style={{ color: 'rgba(237, 116, 47,0.70)' }}>
          {locale === 'ja' ? 'PROOF WEEKの条件（どれか1つ）' : 'PROOF WEEK — COMPLETE ANY ONE'}
        </p>
        <div className="space-y-1.5">
          {([
            { en: '2 workouts logged',  ja: 'ワークアウト2回記録' },
            { en: '1 body photo added', ja: '体写真1枚追加'       },
            { en: '1 story shared',     ja: 'ストーリー1回シェア' },
          ] as const).map(c => (
            <div key={c.en} className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full flex-shrink-0"
                style={{ background: 'rgba(237, 116, 47,0.60)' }} />
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.68)' }}>
                {locale === 'ja' ? c.ja : c.en}
              </p>
            </div>
          ))}
        </div>
        <p className="text-[10px] mt-3 pt-2.5 leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.68)', borderTop: '1px solid rgba(255,255,255,0.13)' }}>
          {locale === 'ja'
            ? '毎日投稿は不要です。週単位で判定されます。'
            : 'Rest days are okay — REPRA tracks weekly effort, not daily activity.'}
        </p>
      </div>

      {/* ── Proof Streak Badges ── */}
      <RewardSection title="PROOF STREAK BADGES" sub={t(locale, 'rewards.sectionProofStreak')}>
        {proofStreakBadges.map((b, i) => (
          <BadgeRow
            key={b.id}
            label={b.label}
            description={t(locale, `rewards.proofStreakBadge.${b.id as ProofStreakBadgeId}`)}
            current={b.progress}
            required={b.requiredStreak}
            unlocked={b.unlocked}
            progressUnit={locale === 'ja' ? '週' : (b.requiredStreak === 1 ? 'week' : 'weeks')}
            isLast={i === proofStreakBadges.length - 1}
            locale={locale}
          />
        ))}
      </RewardSection>

      {/* ── Consistency Rewards ── */}
      <RewardSection title="CONSISTENCY" sub={t(locale, 'rewards.sectionConsistency')}>
        {consistencyBadges.map((b, i) => (
          <BadgeRow
            key={b.id}
            label={b.label}
            description={t(locale, `rewards.consistency.${b.id as ConsistencyBadgeId}`)}
            current={b.progress}
            required={b.requiredDays}
            unlocked={b.unlocked}
            progressUnit={locale === 'ja' ? '日' : (b.requiredDays === 1 ? 'day' : 'days')}
            isLast={i === consistencyBadges.length - 1}
            locale={locale}
          />
        ))}
      </RewardSection>

    </div>
  )
}

/* ═══ Tab: Unlocks ═══════════════════════════════════════════ */

function UnlocksTab({
  locale, workoutBadges, trainingUnlocks, allExercises, shareThemes, shareCount,
}: {
  locale: Locale
  workoutBadges: ReturnType<typeof getWorkoutBadgeUnlocks>
  trainingUnlocks: ReturnType<typeof getTrainingUnlocks>
  allExercises: { name: string; logCount: number }[]
  shareThemes: ReturnType<typeof getShareThemeUnlocks>
  shareCount: number
}) {
  return (
    <div className="px-4 space-y-6 pb-6">

      {/* ── Workout Milestones ── */}
      <RewardSection title="WORKOUT MILESTONES" sub={t(locale, 'rewards.sectionWorkoutBadges')}>
        {workoutBadges.map((b, i) => (
          <BadgeRow
            key={b.id}
            label={b.label}
            description={t(locale, `rewards.workoutBadge.${b.id as WorkoutBadgeId}`)}
            current={b.progress}
            required={b.requiredSessions}
            unlocked={b.unlocked}
            progressUnit={locale === 'ja' ? '回' : (b.requiredSessions === 1 ? 'session' : 'sessions')}
            isLast={i === workoutBadges.length - 1}
            locale={locale}
          />
        ))}
      </RewardSection>

      {/* ── Training Milestones ── */}
      <RewardSection title="TRAINING MILESTONES" sub={t(locale, 'rewards.sectionTraining')}>
        {trainingUnlocks.map((m, i) => {
          const isNext = !m.unlocked && (i === 0 || trainingUnlocks[i - 1].unlocked)
          return (
            <MilestoneRow
              key={m.id}
              id={m.id}
              label={m.label}
              current={m.progress}
              required={m.requiredSessions}
              unlocked={m.unlocked}
              isNext={isNext}
              isLast={i === trainingUnlocks.length - 1}
              locale={locale}
            />
          )
        })}
      </RewardSection>

      {/* ── Exercise Graphs ── */}
      <RewardSection title="EXERCISE GRAPHS" sub={t(locale, 'rewards.sectionExercise')}>
        {allExercises.map((ex, i) => (
          <ExerciseRow
            key={ex.name}
            name={toEn(ex.name)}
            logCount={ex.logCount}
            locale={locale}
            isLast={i === allExercises.length - 1}
          />
        ))}
      </RewardSection>

      {/* ── Share Themes ── */}
      <RewardSection title="SHARE THEMES" sub={t(locale, 'rewards.sectionThemes')}>
        {shareThemes.map((theme, i) => (
          <ThemeRow
            key={theme.id}
            id={theme.id}
            label={theme.label}
            requiredShares={theme.requiredShares}
            unlocked={theme.unlocked}
            shareCount={shareCount}
            dotColor={THEME_DOT[theme.accent] ?? 'rgba(255,255,255,0.3)'}
            locale={locale}
            isLast={i === shareThemes.length - 1}
          />
        ))}
      </RewardSection>

    </div>
  )
}

/* ═══ Shared sub-components ══════════════════════════════════ */

function ProofSummaryCell({
  label, value, sub, loading, accent, muted,
}: {
  label: string; value: string; sub?: string
  loading: boolean; accent?: boolean; muted?: boolean
}) {
  return (
    <div className="rounded-xl p-3"
      style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.13)' }}>
      <p className="text-[8px] font-black tracking-widest mb-1.5"
        style={{ color: accent ? 'rgba(237, 116, 47,0.75)' : 'rgba(255,255,255,0.50)' }}>
        {label}
      </p>
      <p className="text-xl font-black leading-none"
        style={{
          color:      muted ? 'rgba(255,255,255,0.44)' : accent ? '#ED742F' : '#fff',
          opacity:    loading ? 0.3 : 1,
          transition: 'opacity 200ms',
        }}>
        {value}
      </p>
      {sub && (
        <p className="text-[9px] mt-1" style={{ color: 'rgba(255,255,255,0.68)' }}>{sub}</p>
      )}
    </div>
  )
}

function WeekConditionRow({
  label, current, required, done, loading, comingSoon, locale,
}: {
  label: string; current: number; required: number; done: boolean
  loading: boolean; comingSoon?: boolean; locale?: Locale
}) {
  const pct = comingSoon ? 0 : Math.min((current / required) * 100, 100)
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {done
            ? <Check size={11} strokeWidth={2.5} style={{ color: '#22c55e', flexShrink: 0 }} />
            : <div className="w-2.5 h-2.5 rounded-full border-[1.5px] flex-shrink-0"
                style={{ borderColor: comingSoon ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.28)' }} />
          }
          <p className="text-[12px] font-bold"
            style={{ color: done ? '#fff' : comingSoon ? 'rgba(255,255,255,0.50)' : 'rgba(255,255,255,0.70)' }}>
            {label}
          </p>
        </div>
        <span className="text-[10px]" style={{
          color: done ? '#22c55e' : comingSoon ? 'rgba(255,255,255,0.44)' : 'rgba(255,255,255,0.60)',
        }}>
          {comingSoon
            ? (locale === 'ja' ? '近日公開' : 'Coming soon')
            : loading ? '—' : `${Math.min(current, required)} / ${required}`}
        </span>
      </div>
      <div className="h-[2px] rounded-full overflow-hidden ml-[18px]"
        style={{ background: 'rgba(255,255,255,0.11)' }}>
        <div style={{
          width:      `${pct}%`,
          height:     '100%',
          borderRadius: 999,
          background:   done ? '#22c55e' : '#ED742F',
          transition:   'width 0.35s ease',
          opacity: (loading && !comingSoon) ? 0.4 : 1,
        }} />
      </div>
    </div>
  )
}

function RewardSection({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-black tracking-widest mb-0.5" style={{ color: '#ED742F' }}>{title}</p>
      <p className="text-[11px] mb-3 leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>{sub}</p>
      <div className="rounded-2xl overflow-hidden"
        style={{ background: '#222222', border: '1px solid rgba(255,255,255,0.15)' }}>
        {children}
      </div>
    </div>
  )
}

function MilestoneRow({ id, label, current, required, unlocked, isNext, isLast, locale }: {
  id: TrainingMilestoneId; label: string; current: number; required: number
  unlocked: boolean; isNext: boolean; isLast: boolean; locale?: Locale
}) {
  const pct       = Math.min((current / required) * 100, 100)
  const remaining = required - current
  const description  = t(locale ?? 'en', `rewards.milestone.${id}`)
  const isExProgress = id === 'exercise_progress'
  const reqLabel = locale === 'ja'
    ? `${required}回`
    : isExProgress ? `${required} logs` : `${required} sess`
  return (
    <div className="px-4 py-3.5"
      style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 mr-3">
          <p className="text-[13px] font-bold leading-snug"
            style={{ color: unlocked ? '#fff' : isNext ? '#d0d0d0' : '#666' }}>
            {label}
          </p>
          <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
            {description}
          </p>
        </div>
        {unlocked ? (
          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
            <Check size={11} strokeWidth={2.5} style={{ color: '#4ade80' }} />
            <span className="text-[10px] font-black" style={{ color: '#4ade80' }}>DONE</span>
          </div>
        ) : (
          <span className="text-[10px] font-bold flex-shrink-0 mt-0.5"
            style={{ color: 'rgba(255,255,255,0.68)' }}>
            {reqLabel}
          </span>
        )}
      </div>
      {!unlocked && (
        <div className="mt-2.5">
          <div className="h-[3px] rounded-full" style={{ background: 'rgba(255,255,255,0.11)' }}>
            <div style={{
              width: `${pct}%`, height: '100%', borderRadius: 999,
              background: isNext ? 'rgba(237, 116, 47,0.75)' : 'rgba(255,255,255,0.14)',
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.68)' }}>{current} / {required}</span>
            {remaining > 0 && (
              <span className="text-[9px]"
                style={{ color: isNext ? 'rgba(237, 116, 47,0.60)' : 'rgba(255,255,255,0.45)' }}>
                {locale === 'ja'
                  ? `あと${remaining}回`
                  : isExProgress
                    ? `${remaining} more log${remaining !== 1 ? 's' : ''}`
                    : `${remaining} more`}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ExerciseRow({ name, logCount, locale, isLast }: {
  name: string; logCount: number; locale: Locale; isLast: boolean
}) {
  const unlocked   = logCount >= EXERCISE_GRAPH_REQUIRED
  const pct        = Math.min((logCount / EXERCISE_GRAPH_REQUIRED) * 100, 100)
  const remaining  = EXERCISE_GRAPH_REQUIRED - logCount
  const lockedDesc = locale === 'ja'
    ? `あと${remaining}回記録で解放`
    : remaining === 1 ? `Unlocks after 1 more log` : `Unlocks after ${remaining} more logs`
  return (
    <div className="px-4 py-3.5"
      style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-start justify-between">
        <div className="flex-1 mr-3">
          <p className="text-[13px] font-bold" style={{ color: unlocked ? '#fff' : '#aaa' }}>{name}</p>
          <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
            {unlocked ? t(locale, 'rewards.graphAvailable') : lockedDesc}
          </p>
        </div>
        {unlocked ? (
          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
            <Check size={11} strokeWidth={2.5} style={{ color: '#4ade80' }} />
            <span className="text-[10px] font-black" style={{ color: '#4ade80' }}>DONE</span>
          </div>
        ) : (
          <span className="text-[10px] font-bold flex-shrink-0 mt-0.5"
            style={{ color: 'rgba(255,255,255,0.68)' }}>
            {logCount}/10
          </span>
        )}
      </div>
      {!unlocked && (
        <div className="mt-2.5">
          <div className="h-[3px] rounded-full" style={{ background: 'rgba(255,255,255,0.11)' }}>
            <div style={{
              width: `${pct}%`, height: '100%', borderRadius: 999,
              background: 'rgba(237, 116, 47,0.55)',
              transition: 'width 0.4s ease',
            }} />
          </div>
          <span className="text-[9px] mt-1 block" style={{ color: 'rgba(255,255,255,0.68)' }}>
            {logCount} / {EXERCISE_GRAPH_REQUIRED}
          </span>
        </div>
      )}
    </div>
  )
}

function BadgeRow({ label, description, current, required, unlocked, progressUnit, isLast, locale }: {
  label: string; description: string; current: number; required: number
  unlocked: boolean; progressUnit: string; isLast: boolean; locale: Locale
}) {
  const pct       = required > 0 ? Math.min((current / required) * 100, 100) : 100
  const remaining = Math.max(required - current, 0)
  return (
    <div className="px-4 py-3.5"
      style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 mr-3">
          <p className="text-[13px] font-bold leading-snug"
            style={{ color: unlocked ? '#fff' : '#888' }}>
            {label}
          </p>
          <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
            {description}
          </p>
        </div>
        {unlocked ? (
          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
            <Check size={11} strokeWidth={2.5} style={{ color: '#4ade80' }} />
            <span className="text-[10px] font-black" style={{ color: '#4ade80' }}>DONE</span>
          </div>
        ) : (
          <span className="text-[10px] font-bold flex-shrink-0 mt-0.5"
            style={{ color: 'rgba(255,255,255,0.68)' }}>
            {required} {progressUnit}
          </span>
        )}
      </div>
      {!unlocked && (
        <div className="mt-2.5">
          <div className="h-[3px] rounded-full" style={{ background: 'rgba(255,255,255,0.11)' }}>
            <div style={{
              width: `${pct}%`, height: '100%', borderRadius: 999,
              background: 'rgba(237, 116, 47,0.75)',
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.68)' }}>{current} / {required}</span>
            {remaining > 0 && (
              <span className="text-[9px]" style={{ color: 'rgba(237, 116, 47,0.60)' }}>
                {locale === 'ja' ? `あと${remaining}` : `${remaining} more`}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ThemeRow({ id, label, requiredShares, unlocked, shareCount, dotColor, locale, isLast }: {
  id: string; label: string; requiredShares: number
  unlocked: boolean; shareCount: number; dotColor: string; locale: Locale; isLast: boolean
}) {
  const pct       = requiredShares > 0 ? Math.min((shareCount / requiredShares) * 100, 100) : 100
  const remaining = Math.max(requiredShares - shareCount, 0)
  const description = t(locale, `rewards.theme.${id}`)
  const reqLabel    = locale === 'ja'
    ? `${requiredShares}回シェアで解放`
    : `Unlock after ${requiredShares} shares`
  return (
    <div className="px-4 py-3.5"
      style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2.5 flex-1 mr-3">
          <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 mt-[3px]"
            style={{ background: dotColor }} />
          <div>
            <p className="text-[13px] font-bold" style={{ color: unlocked ? '#fff' : '#888' }}>{label}</p>
            <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
              {description}
            </p>
          </div>
        </div>
        {unlocked ? (
          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
            <Check size={11} strokeWidth={2.5} style={{ color: '#4ade80' }} />
            <span className="text-[10px] font-black" style={{ color: '#4ade80' }}>ACTIVE</span>
          </div>
        ) : (
          <span className="text-[10px] font-bold flex-shrink-0 mt-0.5 text-right"
            style={{ color: 'rgba(255,255,255,0.68)', maxWidth: 72 }}>
            {reqLabel}
          </span>
        )}
      </div>
      {!unlocked && (
        <div className="mt-2.5">
          <div className="h-[3px] rounded-full" style={{ background: 'rgba(255,255,255,0.11)' }}>
            <div style={{
              width: `${pct}%`, height: '100%', borderRadius: 999,
              background: 'rgba(237, 116, 47,0.55)',
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.68)' }}>
              {shareCount} / {requiredShares}
            </span>
            {remaining > 0 && (
              <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {locale === 'ja' ? `あと${remaining}回` : `${remaining} more`}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
