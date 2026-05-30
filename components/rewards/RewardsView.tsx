'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Trophy, Check } from 'lucide-react'
import {
  getTrainingUnlocks,
  getShareThemeUnlocks,
  getNextReward,
  EXERCISE_GRAPH_REQUIRED,
  getShareCount,
  type NextRewardResult,
  type TrainingMilestoneId,
} from '@/lib/unlocks'
import { getRewardsData } from '@/actions/rewards'
import { useLocale } from '@/lib/useLocale'
import { t, type Locale } from '@/lib/i18n'

const ALWAYS_SHOW = ['ベンチプレス', 'スクワット', 'デッドリフト']

const JA_EN: Record<string, string> = {
  'ベンチプレス': 'Bench Press',          'スクワット': 'Squat',
  'デッドリフト': 'Deadlift',             'バーベルスクワット': 'Barbell Squat',
  'フロントスクワット': 'Front Squat',    'インクラインベンチプレス': 'Incline Bench Press',
  'ダンベルベンチプレス': 'DB Bench Press','ルーマニアンデッドリフト': 'Romanian DL',
  'ショルダープレス': 'Shoulder Press',   'オーバーヘッドプレス': 'Overhead Press',
  'ラットプルダウン': 'Lat Pulldown',     'チンニング': 'Chin-up',
  'プルアップ': 'Pull-up',               '懸垂': 'Pull-up',
  'バーベルロウ': 'Barbell Row',          'ベントオーバーロウ': 'Bent Over Row',
  'レッグプレス': 'Leg Press',            'レッグカール': 'Leg Curl',
  'バーベルカール': 'Barbell Curl',       'ダンベルカール': 'DB Curl',
  'ハンマーカール': 'Hammer Curl',        'ディップス': 'Dips',
  'ヒップスラスト': 'Hip Thrust',         'ブルガリアンスクワット': 'Bulgarian Split Squat',
  'サイドレイズ': 'Lateral Raise',        'フェイスプル': 'Face Pull',
  'シュラッグ': 'Shrug',                  'ランジ': 'Lunge',
}
const toEn = (name: string) => JA_EN[name] ?? name

const THEME_DOT: Record<string, string> = {
  dark:   'rgba(255,255,255,0.28)',
  orange: '#ff6b00',
  purple: '#6E38D4',
  black:  '#e0e0e0',
}

export default function RewardsView() {
  const { locale } = useLocale()
  const [totalSessions, setTotalSessions] = useState(0)
  const [exercises, setExercises]         = useState<{ name: string; logCount: number }[]>([])
  const [shareCount, setShareCount]       = useState(0)
  const [dataLoaded, setDataLoaded]       = useState(false)

  useEffect(() => {
    setShareCount(getShareCount())
  }, [])

  useEffect(() => {
    console.time('[Rewards] total')
    getRewardsData()
      .then(d => {
        setTotalSessions(d.totalSessions)
        setExercises(d.exercises)
      })
      .catch(err => console.error('[Rewards] fetch failed', err))
      .finally(() => {
        setDataLoaded(true)
        console.timeEnd('[Rewards] total')
      })
  }, [])

  const trainingUnlocks = useMemo(() => getTrainingUnlocks(totalSessions), [totalSessions])
  const shareThemes     = useMemo(() => getShareThemeUnlocks(shareCount), [shareCount])

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

  const nextReward        = useMemo(() => getNextReward(totalSessions, allExercises, shareCount), [totalSessions, allExercises, shareCount])
  const unlockedExercises = allExercises.filter(e => e.logCount >= EXERCISE_GRAPH_REQUIRED)
  const unlockedThemes    = shareThemes.filter(t => t.unlocked)
  const nextMilestone     = trainingUnlocks.find(m => !m.unlocked)

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#050505' }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="px-4 pt-14 pb-4">
        <div className="flex items-center gap-2.5 mb-1">
          <Trophy size={16} strokeWidth={2} style={{ color: '#ff6b00' }} />
          <h1 className="text-xl font-black tracking-widest text-white">REWARDS</h1>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.50)' }}>
          {t(locale, 'rewards.trainMore')}
        </p>
      </div>

      {/* ── Next Reward Card ────────────────────────────────── */}
      {dataLoaded
        ? <NextRewardCard result={nextReward} locale={locale} />
        : <NextRewardSkeleton />
      }

      {/* ── Summary row ─────────────────────────────────────── */}
      <div className="px-4 mb-6 grid grid-cols-3 gap-2">
        <SummaryCard
          label="ANALYTICS"
          value={dataLoaded
            ? (nextMilestone ? `${totalSessions}/${nextMilestone.requiredSessions}` : String(totalSessions))
            : '—'}
          sub={dataLoaded
            ? (nextMilestone
                ? `${t(locale, 'rewards.summaryNext')} ${nextMilestone.label}`
                : t(locale, 'rewards.summaryAllUnlocked'))
            : ''}
          loading={!dataLoaded}
        />
        <SummaryCard
          label="GRAPH SHARE"
          value={dataLoaded ? String(unlockedExercises.length) : '—'}
          sub={dataLoaded
            ? (unlockedExercises.length > 0 ? toEn(unlockedExercises[0].name) : t(locale, 'rewards.logsPer'))
            : ''}
          loading={!dataLoaded}
        />
        <SummaryCard
          label="THEMES"
          value={dataLoaded ? `${unlockedThemes.length}/4` : '—'}
          sub={dataLoaded ? `${4 - unlockedThemes.length} ${t(locale, 'rewards.locked')}` : ''}
          loading={!dataLoaded}
        />
      </div>

      {/* ── Training Milestones ──────────────────────────────── */}
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

      {/* ── Exercise Graphs ──────────────────────────────────── */}
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

      {/* ── Share Themes ─────────────────────────────────────── */}
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

/* ── Next Reward Skeleton ───────────────────────────────────── */

function NextRewardSkeleton() {
  return (
    <div className="px-4 mb-4">
      <div style={{
        background: '#161616',
        border: '1px solid rgba(255,106,0,0.12)',
        borderRadius: 24,
        padding: '20px',
      }}>
        <div className="h-2 w-20 rounded-full mb-4" style={{ background: '#252525' }} />
        <div className="h-6 w-40 rounded-lg mb-3" style={{ background: '#1e1e1e' }} />
        <div className="h-3 w-24 rounded-full mb-2" style={{ background: '#1a1a1a' }} />
        <div className="h-3 w-52 rounded-full mb-5" style={{ background: '#191919' }} />
        <div className="h-1.5 rounded-full mb-5" style={{ background: '#1e1e1e' }} />
        <div className="h-9 w-28 rounded-full" style={{ background: '#1e1e1e' }} />
      </div>
    </div>
  )
}

/* ── Next Reward Card ───────────────────────────────────────── */

function NextRewardCard({ result, locale }: { result: NextRewardResult; locale: Locale }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const animStyle: React.CSSProperties = {
    opacity:    visible ? 1 : 0,
    transform:  visible ? 'translateY(0px)' : 'translateY(6px)',
    transition: 'opacity 210ms ease, transform 210ms ease',
  }

  if (result.type === 'complete') {
    return (
      <div className="px-4 mb-4" style={animStyle}>
        <div style={{
          background: '#151515', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 24, padding: '20px',
        }}>
          <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.13em', color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
            NEXT REWARD
          </p>
          <p style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 8 }}>
            {t(locale, 'rewards.allUnlocked')}
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65 }}>
            {t(locale, 'rewards.allUnlockedSub')}
          </p>
        </div>
      </div>
    )
  }

  let title: string
  let current: number
  let required: number
  let progressUnit: string
  let description: string
  let ctaLabel: string
  let ctaHref: string

  if (result.type === 'training') {
    const m   = result.milestone
    const rem = m.requiredSessions - result.current
    const milestoneDesc = t(locale, `rewards.milestone.${m.id}`)
    title        = m.label
    current      = result.current
    required     = m.requiredSessions
    progressUnit = locale === 'ja' ? t(locale, 'rewards.sessionPlural') : (required === 1 ? 'session' : 'sessions')
    description  = locale === 'ja'
      ? `${milestoneDesc}\nあと${rem}回の記録で解放。`
      : rem === 1
        ? `1 more session to unlock ${m.description.toLowerCase()}.`
        : `${rem} more sessions to unlock ${m.description.toLowerCase()}.`
    ctaLabel = t(locale, 'rewards.logWorkout')
    ctaHref  = '/record'
  } else if (result.type === 'exercise_graph') {
    const name = toEn(result.exerciseName)
    const rem  = EXERCISE_GRAPH_REQUIRED - result.current
    title        = `${name} Graph Share`
    current      = result.current
    required     = EXERCISE_GRAPH_REQUIRED
    progressUnit = locale === 'ja' ? '回' : 'logs'
    description  = locale === 'ja'
      ? `${name}のグラフ共有まであと${rem}回の記録。`
      : rem === 1
        ? `1 more ${name} log to unlock graph sharing.`
        : `${rem} more ${name} logs to unlock graph sharing.`
    ctaLabel = locale === 'ja' ? `${name}${t(locale, 'rewards.logExercise')}` : `Log ${name}`
    ctaHref  = '/record'
  } else {
    const theme = result.theme
    const rem   = theme.requiredShares - result.current
    const themeDesc = t(locale, `rewards.theme.${theme.id}`)
    title        = `${theme.label} Theme`
    current      = result.current
    required     = theme.requiredShares
    progressUnit = locale === 'ja' ? '回' : 'exports'
    description  = locale === 'ja'
      ? `${themeDesc}\nあと${rem}回のShare Storyで解放。`
      : rem === 1
        ? `1 more story export to unlock this theme.`
        : `${rem} more story exports to unlock this theme.`
    ctaLabel = t(locale, 'rewards.createStory')
    ctaHref  = '/home'
  }

  const pct = required > 0 ? Math.min((current / required) * 100, 100) : 0

  return (
    <div className="px-4 mb-4" style={animStyle}>
      <div style={{
        background: '#161616',
        border: '1px solid rgba(255,106,0,0.28)',
        borderRadius: 24,
        padding: '20px',
        boxShadow: '0 0 28px rgba(255,106,0,0.06)',
      }}>

        <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.13em', color: '#ff6b00', marginBottom: 14 }}>
          NEXT REWARD
        </p>

        <p style={{ fontSize: 22, fontWeight: 900, color: '#ffffff', lineHeight: 1.1, marginBottom: 8 }}>
          {title}
        </p>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.60)', lineHeight: 1.65, marginBottom: 12, whiteSpace: 'pre-line' }}>
          {description}
        </p>

        <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.50)', marginBottom: 14 }}>
          {current} / {required} {progressUnit}
        </p>

        <div style={{
          height: 6, borderRadius: 999,
          background: 'rgba(255,255,255,0.08)',
          marginBottom: 18,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${Math.max(pct, pct > 0 ? 2 : 0)}%`,
            height: '100%',
            borderRadius: 999,
            background: '#ff6b00',
            transition: 'width 0.45s ease',
          }} />
        </div>

        <Link
          href={ctaHref}
          className="inline-flex items-center active:opacity-60 transition-opacity"
          style={{
            padding: '9px 22px',
            borderRadius: 999,
            background: '#ff6b00',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.02em',
            textDecoration: 'none',
          }}
        >
          {ctaLabel}
        </Link>

      </div>
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────────── */

function SummaryCard({ label, value, sub, loading }: { label: string; value: string; sub: string; loading: boolean }) {
  return (
    <div className="rounded-2xl p-3" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-[8px] font-black tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.30)' }}>
        {label}
      </p>
      <p className="text-lg font-black text-white leading-none mb-1.5" style={{ opacity: loading ? 0.3 : 1, transition: 'opacity 200ms' }}>
        {value}
      </p>
      <p className="text-[9px] leading-snug" style={{ color: 'rgba(255,255,255,0.50)', minHeight: 12 }}>
        {sub}
      </p>
    </div>
  )
}

function RewardSection({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div className="px-4 mb-6">
      <p className="text-[10px] font-black tracking-widest mb-0.5" style={{ color: '#ff6b00' }}>{title}</p>
      <p className="text-[11px] mb-3 leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{sub}</p>
      <div className="rounded-2xl overflow-hidden" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
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
  const description = t(locale ?? 'en', `rewards.milestone.${id}`)
  const reqLabel    = locale === 'ja' ? `${required}回` : `${required} sess`
  return (
    <div className="px-4 py-3.5" style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 mr-3">
          <p className="text-[13px] font-bold leading-snug"
            style={{ color: unlocked ? '#fff' : isNext ? '#d0d0d0' : '#666' }}>
            {label}
          </p>
          <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
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
            style={{ color: 'rgba(255,255,255,0.28)' }}>
            {reqLabel}
          </span>
        )}
      </div>
      {!unlocked && (
        <div className="mt-2.5">
          <div className="h-[3px] rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div style={{
              width: `${pct}%`, height: '100%', borderRadius: 999,
              background: isNext ? 'rgba(255,107,0,0.75)' : 'rgba(255,255,255,0.14)',
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.28)' }}>{current} / {required}</span>
            {remaining > 0 && (
              <span className="text-[9px]"
                style={{ color: isNext ? 'rgba(255,107,0,0.60)' : 'rgba(255,255,255,0.22)' }}>
                {locale === 'ja' ? `あと${remaining}回` : `${remaining} more`}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ExerciseRow({ name, logCount, locale, isLast }: { name: string; logCount: number; locale: Locale; isLast: boolean }) {
  const unlocked  = logCount >= EXERCISE_GRAPH_REQUIRED
  const pct       = Math.min((logCount / EXERCISE_GRAPH_REQUIRED) * 100, 100)
  const remaining = EXERCISE_GRAPH_REQUIRED - logCount
  const lockedDesc = locale === 'ja'
    ? `あと${remaining}${t(locale, 'rewards.graphLockedDesc')}`
    : `${remaining} more logs to unlock`
  return (
    <div className="px-4 py-3.5" style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-start justify-between">
        <div className="flex-1 mr-3">
          <p className="text-[13px] font-bold" style={{ color: unlocked ? '#fff' : '#aaa' }}>{name}</p>
          <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
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
            style={{ color: 'rgba(255,255,255,0.28)' }}>
            {logCount}/10
          </span>
        )}
      </div>
      {!unlocked && (
        <div className="mt-2.5">
          <div className="h-[3px] rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div style={{
              width: `${pct}%`, height: '100%', borderRadius: 999,
              background: 'rgba(255,107,0,0.55)',
              transition: 'width 0.4s ease',
            }} />
          </div>
          <span className="text-[9px] mt-1 block" style={{ color: 'rgba(255,255,255,0.28)' }}>
            {logCount} / {EXERCISE_GRAPH_REQUIRED}
          </span>
        </div>
      )}
    </div>
  )
}

function ThemeRow({ id, label, requiredShares, unlocked, shareCount, dotColor, locale, isLast }: {
  id: string; label: string; requiredShares: number
  unlocked: boolean; shareCount: number; dotColor: string; locale: Locale; isLast: boolean
}) {
  const pct         = requiredShares > 0 ? Math.min((shareCount / requiredShares) * 100, 100) : 100
  const remaining   = Math.max(requiredShares - shareCount, 0)
  const description = t(locale, `rewards.theme.${id}`)
  const reqLabel    = locale === 'ja'
    ? `${requiredShares}${t(locale, 'rewards.requiredSharesSuffix')}`
    : `${requiredShares} shares`
  return (
    <div className="px-4 py-3.5" style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2.5 flex-1 mr-3">
          <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 mt-[3px]" style={{ background: dotColor }} />
          <div>
            <p className="text-[13px] font-bold" style={{ color: unlocked ? '#fff' : '#888' }}>{label}</p>
            <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
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
            style={{ color: 'rgba(255,255,255,0.28)', maxWidth: 72 }}>
            {reqLabel}
          </span>
        )}
      </div>
      {!unlocked && (
        <div className="mt-2.5">
          <div className="h-[3px] rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div style={{
              width: `${pct}%`, height: '100%', borderRadius: 999,
              background: 'rgba(255,107,0,0.55)',
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
              {shareCount} / {requiredShares}
            </span>
            {remaining > 0 && (
              <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.22)' }}>
                {locale === 'ja' ? `あと${remaining}回` : `${remaining} more`}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
