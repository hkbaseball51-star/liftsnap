'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Trophy, Check } from 'lucide-react'
import {
  getTrainingUnlocks,
  getShareThemeUnlocks,
  EXERCISE_GRAPH_REQUIRED,
  getShareCount,
} from '@/lib/unlocks'

type Exercise = { name: string; logCount: number }
type Props    = { totalSessions: number; exercises: Exercise[] }

// Always show these exercises even if the user hasn't logged them
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
  purple: '#a855f7',
  black:  '#e0e0e0',
}

export default function RewardsView({ totalSessions, exercises }: Props) {
  const [shareCount, setShareCount] = useState(0)
  useEffect(() => { setShareCount(getShareCount()) }, [])

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

  const unlockedExercises = allExercises.filter(e => e.logCount >= EXERCISE_GRAPH_REQUIRED)
  const unlockedThemes    = shareThemes.filter(t => t.unlocked)
  const nextMilestone     = trainingUnlocks.find(m => !m.unlocked)
  const nextTheme         = shareThemes.find(t => !t.unlocked)

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#050505' }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="px-4 pt-14 pb-5">
        <div className="flex items-center gap-2.5 mb-1">
          <Trophy size={16} strokeWidth={2} style={{ color: '#ff6b00' }} />
          <h1 className="text-xl font-black tracking-widest text-white">REWARDS</h1>
        </div>
        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.38)' }}>
          Unlock analytics and themes as you train
        </p>
      </div>

      {/* ── Summary Cards ───────────────────────────────────── */}
      <div className="px-4 mb-6 grid grid-cols-3 gap-2">
        <SummaryCard
          label="SESSIONS"
          value={nextMilestone ? `${totalSessions}/${nextMilestone.requiredSessions}` : String(totalSessions)}
          sub={nextMilestone ? `Next: ${nextMilestone.label}` : 'All unlocked'}
        />
        <SummaryCard
          label="GRAPHS"
          value={String(unlockedExercises.length)}
          sub={unlockedExercises.length > 0 ? toEn(unlockedExercises[0].name) : '10 logs each'}
        />
        <SummaryCard
          label="THEMES"
          value={`${unlockedThemes.length}/4`}
          sub={nextTheme ? `Next: ${nextTheme.label}` : 'All unlocked'}
        />
      </div>

      {/* ── Training Milestones ──────────────────────────────── */}
      <RewardSection title="TRAINING MILESTONES" sub="Log sessions to unlock analytics features">
        {trainingUnlocks.map((m, i) => {
          const isNext = !m.unlocked && (i === 0 || trainingUnlocks[i - 1].unlocked)
          return (
            <MilestoneRow
              key={m.id}
              label={m.label}
              description={m.description}
              current={m.progress}
              required={m.requiredSessions}
              unlocked={m.unlocked}
              isNext={isNext}
              isLast={i === trainingUnlocks.length - 1}
            />
          )
        })}
      </RewardSection>

      {/* ── Exercise Graphs ──────────────────────────────────── */}
      <RewardSection title="EXERCISE GRAPHS" sub="Log 10 sessions per exercise to unlock graph sharing">
        {allExercises.map((ex, i) => (
          <ExerciseRow
            key={ex.name}
            name={toEn(ex.name)}
            logCount={ex.logCount}
            isLast={i === allExercises.length - 1}
          />
        ))}
      </RewardSection>

      {/* ── Share Themes ─────────────────────────────────────── */}
      <RewardSection title="SHARE THEMES" sub="Export Story cards to unlock color themes">
        {shareThemes.map((theme, i) => (
          <ThemeRow
            key={theme.id}
            label={theme.label}
            description={theme.description}
            requiredShares={theme.requiredShares}
            unlocked={theme.unlocked}
            shareCount={shareCount}
            dotColor={THEME_DOT[theme.accent] ?? 'rgba(255,255,255,0.3)'}
            isLast={i === shareThemes.length - 1}
          />
        ))}
      </RewardSection>

    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────────── */

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl p-3" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="text-[8px] font-black tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
        {label}
      </p>
      <p className="text-xl font-black text-white leading-none mb-1.5">
        {value}
      </p>
      <p className="text-[9px] leading-snug" style={{ color: 'rgba(255,255,255,0.32)' }}>
        {sub}
      </p>
    </div>
  )
}

function RewardSection({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div className="px-4 mb-6">
      <p className="text-[10px] font-black tracking-widest mb-0.5" style={{ color: '#ff6b00' }}>{title}</p>
      <p className="text-[11px] mb-3" style={{ color: 'rgba(255,255,255,0.32)' }}>{sub}</p>
      <div className="rounded-2xl overflow-hidden" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
        {children}
      </div>
    </div>
  )
}

function MilestoneRow({ label, description, current, required, unlocked, isNext, isLast }: {
  label: string; description: string; current: number; required: number
  unlocked: boolean; isNext: boolean; isLast: boolean
}) {
  const pct       = Math.min((current / required) * 100, 100)
  const remaining = required - current
  return (
    <div className="px-4 py-3.5" style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 mr-3">
          <p className="text-[13px] font-bold leading-snug"
            style={{ color: unlocked ? '#fff' : isNext ? '#d0d0d0' : '#666' }}>
            {label}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.28)' }}>
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
            style={{ color: 'rgba(255,255,255,0.22)' }}>
            {required} sess
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
            <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>{current} / {required}</span>
            {remaining > 0 && (
              <span className="text-[9px]"
                style={{ color: isNext ? 'rgba(255,107,0,0.55)' : 'rgba(255,255,255,0.15)' }}>
                {remaining} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ExerciseRow({ name, logCount, isLast }: { name: string; logCount: number; isLast: boolean }) {
  const unlocked  = logCount >= EXERCISE_GRAPH_REQUIRED
  const pct       = Math.min((logCount / EXERCISE_GRAPH_REQUIRED) * 100, 100)
  const remaining = EXERCISE_GRAPH_REQUIRED - logCount
  return (
    <div className="px-4 py-3.5" style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-start justify-between">
        <div className="flex-1 mr-3">
          <p className="text-[13px] font-bold" style={{ color: unlocked ? '#fff' : '#aaa' }}>{name}</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.28)' }}>
            {unlocked ? 'Graph Share available' : `${remaining} more logs to unlock`}
          </p>
        </div>
        {unlocked ? (
          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
            <Check size={11} strokeWidth={2.5} style={{ color: '#4ade80' }} />
            <span className="text-[10px] font-black" style={{ color: '#4ade80' }}>DONE</span>
          </div>
        ) : (
          <span className="text-[10px] font-bold flex-shrink-0 mt-0.5"
            style={{ color: 'rgba(255,255,255,0.22)' }}>
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
          <span className="text-[9px] mt-1 block" style={{ color: 'rgba(255,255,255,0.2)' }}>
            {logCount} / {EXERCISE_GRAPH_REQUIRED}
          </span>
        </div>
      )}
    </div>
  )
}

function ThemeRow({ label, description, requiredShares, unlocked, shareCount, dotColor, isLast }: {
  label: string; description: string; requiredShares: number
  unlocked: boolean; shareCount: number; dotColor: string; isLast: boolean
}) {
  const pct       = requiredShares > 0 ? Math.min((shareCount / requiredShares) * 100, 100) : 100
  const remaining = Math.max(requiredShares - shareCount, 0)
  return (
    <div className="px-4 py-3.5" style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2.5 flex-1 mr-3">
          <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 mt-[3px]" style={{ background: dotColor }} />
          <div>
            <p className="text-[13px] font-bold" style={{ color: unlocked ? '#fff' : '#888' }}>{label}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.28)' }}>{description}</p>
          </div>
        </div>
        {unlocked ? (
          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
            <Check size={11} strokeWidth={2.5} style={{ color: '#4ade80' }} />
            <span className="text-[10px] font-black" style={{ color: '#4ade80' }}>ACTIVE</span>
          </div>
        ) : (
          <span className="text-[10px] font-bold flex-shrink-0 mt-0.5"
            style={{ color: 'rgba(255,255,255,0.22)' }}>
            {requiredShares} shares
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
            <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {shareCount} / {requiredShares}
            </span>
            {remaining > 0 && (
              <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.15)' }}>
                {remaining} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
