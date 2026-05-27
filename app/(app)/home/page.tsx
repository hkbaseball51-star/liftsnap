import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatVolume } from '@/lib/utils'
import { Share2, Flame } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#0a0a0a' }}>
        <p className="text-xl font-black text-white mb-2">LIFTSNAP</p>
        <p className="text-sm" style={{ color: '#555' }}>読み込み中...</p>
      </div>
    )
  }

  const [profileRes, thisWeekRes, lastSessionRes, lastWeekRes, todayWeightRes] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user.id).single(),
    supabase.from('workout_sessions')
      .select('id, total_volume_kg, trained_at')
      .eq('user_id', user.id)
      .gte('trained_at', getWeekStart())
      .not('completed_at', 'is', null),
    supabase.from('workout_sessions')
      .select('id, title, total_volume_kg, trained_at')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .order('trained_at', { ascending: false })
      .limit(1)
      .single(),
    supabase.from('workout_sessions')
      .select('total_volume_kg')
      .eq('user_id', user.id)
      .gte('trained_at', getLastWeekStart())
      .lt('trained_at', getWeekStart())
      .not('completed_at', 'is', null),
    supabase.from('body_weights')
      .select('weight_kg')
      .eq('user_id', user.id)
      .eq('recorded_at', today())
      .single(),
  ])

  const lastSession = lastSessionRes.data
  let bestSet: { exercise_name: string; weight_kg: number; reps: number } | null = null
  if (lastSession?.id) {
    const { data } = await supabase
      .from('workout_sets')
      .select('exercise_name, weight_kg, reps')
      .eq('session_id', lastSession.id)
      .eq('is_completed', true)
      .not('weight_kg', 'is', null)
      .gt('weight_kg', 0)
      .order('weight_kg', { ascending: false })
      .limit(1)
      .single()
    if (data) bestSet = data as { exercise_name: string; weight_kg: number; reps: number }
  }

  // All-time best for club progress
  let allTimeBest: { weight_kg: number; reps: number } | null = null
  const { data: atbData } = await supabase
    .from('workout_sets')
    .select('weight_kg, reps')
    .eq('is_completed', true)
    .not('weight_kg', 'is', null)
    .gt('weight_kg', 0)
    .order('weight_kg', { ascending: false })
    .limit(1)
    .single()
  if (atbData) allTimeBest = atbData as { weight_kg: number; reps: number }

  const displayName = (profileRes.data as { display_name: string | null } | null)?.display_name ?? 'ライフター'
  const thisWeekSessions = thisWeekRes.data ?? []
  const thisWeekVolume = thisWeekSessions.reduce((s, r) => s + (r.total_volume_kg ?? 0), 0)
  const lastWeekVolume = (lastWeekRes.data ?? []).reduce((s: number, r: { total_volume_kg: number | null }) => s + (r.total_volume_kg ?? 0), 0)
  const volumeDiff = lastWeekVolume > 0 ? Math.round(((thisWeekVolume - lastWeekVolume) / lastWeekVolume) * 100) : null
  const todayWeight = todayWeightRes.data?.weight_kg ?? null
  const todayWorked = thisWeekSessions.some(s => s.trained_at === today())
  const weekDays = getWeekDays()
  const workedDates = new Set(thisWeekSessions.map(s => s.trained_at))

  // 1RM & club from best set of last session
  const est1rm = bestSet
    ? bestSet.reps === 1 ? bestSet.weight_kg : Math.round(bestSet.weight_kg * (1 + bestSet.reps / 30))
    : null

  // Club progress from all-time best
  const allTimeEst1rm = allTimeBest
    ? allTimeBest.reps === 1 ? allTimeBest.weight_kg : Math.round(allTimeBest.weight_kg * (1 + allTimeBest.reps / 30))
    : null
  const club = allTimeEst1rm ? getNextClub(allTimeEst1rm) : null

  const isToday = lastSession?.trained_at === today()
  const scoreValue = est1rm && club ? Math.min(99, Math.round((est1rm / (club.target)) * 100)) : null

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-14 pb-5">
        <h1 className="text-xl font-black tracking-widest text-white">LIFTSNAP</h1>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: '#111', border: '1px solid #1e1e1e' }}>
          <Flame size={13} style={{ color: '#ff6b00' }} />
          <span className="text-xs font-black" style={{ color: '#ff6b00' }}>47連続</span>
        </div>
      </div>

      {/* ── HERO EFFORT CARD ── */}
      <div className="px-4 mb-5">
        {bestSet ? (
          <HeroCard
            exerciseName={bestSet.exercise_name}
            weightKg={bestSet.weight_kg}
            reps={bestSet.reps}
            est1rm={est1rm!}
            club={club}
            sessionId={lastSession!.id}
            isToday={isToday}
            score={scoreValue}
          />
        ) : (
          /* Empty hero */
          <div className="relative rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #130800 0%, #0f0f0f 60%)',
              border: '1px solid rgba(255,107,0,0.12)',
              boxShadow: '0 0 40px rgba(255,107,0,0.06)',
            }}>
            <div className="absolute top-0 inset-x-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,107,0,0.4), transparent)' }} />
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.2)' }}>
                <span className="text-2xl">⚡</span>
              </div>
              <p className="text-lg font-black text-white mb-1">最初の記録を作ろう</p>
              <p className="text-xs mb-6" style={{ color: '#444' }}>
                記録するとここに努力が表示されます
              </p>
              <Link href="/record"
                className="px-8 py-3.5 rounded-2xl text-sm font-black text-white"
                style={{ background: '#ff6b00' }}>
                記録を始める →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Week Strip ── */}
      <div className="px-4 mb-5">
        <div className="flex justify-between">
          {weekDays.map(({ label, date }) => {
            const worked = workedDates.has(date)
            const isT = date === today()
            return (
              <div key={date} className="flex flex-col items-center gap-1.5">
                <span className="text-[9px] font-black uppercase tracking-wide"
                  style={{ color: isT ? '#ff6b00' : '#333' }}>{label}</span>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black"
                  style={{
                    background: worked ? '#ff6b00' : 'transparent',
                    border: worked ? 'none' : isT ? '2px solid rgba(255,107,0,0.5)' : '1px solid #1e1e1e',
                    color: worked ? '#fff' : isT ? '#ff6b00' : '#333',
                    boxShadow: worked ? '0 0 12px rgba(255,107,0,0.4)' : 'none',
                  }}>
                  {worked ? '✓' : new Date(date + 'T00:00:00').getDate()}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── CTA (compact, floating) ── */}
      {!todayWorked && (
        <div className="px-4 mb-5">
          <Link href="/record">
            <div className="rounded-2xl px-5 py-4 flex items-center justify-between active:opacity-70"
              style={{
                background: '#111',
                border: '1px solid rgba(255,107,0,0.3)',
              }}>
              <div>
                <p className="text-xs font-black tracking-widest mb-0.5" style={{ color: '#ff6b00' }}>TODAY</p>
                <p className="text-base font-black text-white">トレーニングを記録する</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: '#ff6b00' }}>
                <span className="text-xl font-black text-white leading-none">＋</span>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* ── Weekly Effort ── */}
      <div className="px-4 mb-5">
        <p className="text-xs font-black tracking-widest mb-3" style={{ color: '#444' }}>WEEKLY EFFORT</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label: 'VOLUME',
              value: thisWeekVolume > 0 ? formatVolume(thisWeekVolume) : '—',
              sub: volumeDiff !== null ? `${volumeDiff >= 0 ? '+' : ''}${volumeDiff}% vs 先週` : null,
              subColor: volumeDiff !== null ? (volumeDiff >= 0 ? '#22c55e' : '#ef4444') : undefined,
              active: thisWeekVolume > 0,
            },
            {
              label: 'SESSIONS',
              value: thisWeekSessions.length > 0 ? String(thisWeekSessions.length) : '—',
              sub: '目標 3回',
              subColor: '#555' as string,
              active: thisWeekSessions.length > 0,
            },
            {
              label: 'BEST 1RM',
              value: allTimeEst1rm ? `${allTimeEst1rm}kg` : '—',
              sub: null,
              subColor: undefined,
              active: allTimeEst1rm !== null,
            },
          ].map(({ label, value, sub, subColor, active }) => (
            <div key={label} className="rounded-2xl p-3.5"
              style={{ background: '#111', border: '1px solid #1a1a1a' }}>
              <p className="text-xs font-black tracking-widest mb-2" style={{ color: '#444' }}>{label}</p>
              <p className="text-lg font-black" style={{ color: active ? '#fff' : '#2a2a2a' }}>{value}</p>
              {sub && <p className="text-xs mt-1 font-bold" style={{ color: subColor ?? '#555' }}>{sub}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* ── 100KG CLUB ── */}
      <div className="px-4 mb-5">
        <ClubCard club={club} allTimeEst1rm={allTimeEst1rm} />
      </div>

      {/* ── Body weight ── */}
      <div className="px-4">
        <div className="rounded-2xl px-4 py-3.5 flex items-center justify-between"
          style={{ background: '#111', border: '1px solid #1a1a1a' }}>
          <div>
            <p className="text-xs font-black tracking-widest mb-1" style={{ color: '#444' }}>BODY WEIGHT</p>
            {todayWeight
              ? <p className="text-xl font-black text-white">{todayWeight}<span className="text-sm ml-1" style={{ color: '#555' }}>kg</span></p>
              : <p className="text-sm" style={{ color: '#333' }}>未記録</p>
            }
          </div>
          <Link href="/analytics"
            className="px-4 py-2 rounded-xl text-xs font-black"
            style={{ background: todayWeight ? '#1a1a1a' : '#ff6b00', color: todayWeight ? '#555' : '#fff' }}>
            {todayWeight ? 'グラフ →' : '記録 ＋'}
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ─── Sub-components ──────────────────────────────────────── */

type ClubInfo = { name: string; target: number; gap: number; progress: number; prev: number }

function HeroCard({ exerciseName, weightKg, reps, est1rm, club, sessionId, isToday, score }: {
  exerciseName: string
  weightKg: number
  reps: number
  est1rm: number
  club: ClubInfo | null
  sessionId: string
  isToday: boolean
  score: number | null
}) {
  const ringRadius = 38
  const circumference = 2 * Math.PI * ringRadius
  const ringOffset = club ? circumference * (1 - club.progress / 100) : circumference

  return (
    <div className="relative rounded-3xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #150900 0%, #0f0f0f 55%, #0a0a0a 100%)',
        border: '1px solid rgba(255,107,0,0.22)',
        boxShadow: '0 0 60px rgba(255,107,0,0.12), 0 20px 60px rgba(0,0,0,0.7)',
      }}>

      {/* Top gradient line */}
      <div className="absolute top-0 inset-x-0 h-px"
        style={{ background: 'linear-gradient(90deg, #ff6b00, #7c3aed 60%, transparent)' }} />

      {/* Radial glow top-right */}
      <div className="absolute top-0 right-0 w-52 h-52 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 80% 20%, rgba(255,107,0,0.14) 0%, transparent 65%)' }} />

      <div className="relative p-5">
        {/* Label row */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-black tracking-widest px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(255,107,0,0.15)', color: '#ff6b00' }}>
            {isToday ? "TODAY'S EFFORT" : 'LAST EFFORT'}
          </span>
          <span className="text-xs font-black px-2 py-0.5 rounded-full"
            style={{ background: '#ff6b00', color: '#fff' }}>
            PR
          </span>
        </div>

        {/* Main content row */}
        <div className="flex items-start justify-between">
          {/* Left */}
          <div className="flex-1 mr-3">
            <p className="text-xs font-black tracking-widest mb-1" style={{ color: '#ff6b00' }}>
              {exerciseName.toUpperCase()}
            </p>

            {/* Big weight */}
            <div className="flex items-baseline gap-1.5 mb-3">
              <span className="font-black text-white leading-none" style={{ fontSize: 58 }}>{weightKg}</span>
              <div>
                <span className="text-xl font-bold" style={{ color: '#444' }}>kg</span>
                <p className="text-lg font-black text-white">
                  × {reps}<span className="text-xs font-bold ml-1" style={{ color: '#555' }}>reps</span>
                </p>
              </div>
            </div>

            {/* Est 1RM */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold" style={{ color: '#555' }}>Est. 1RM</span>
              <span className="text-base font-black text-white">{est1rm}kg</span>
            </div>

            {/* Club gap */}
            {club && (
              <div className="flex items-center gap-1.5">
                <span className="text-sm">⚡</span>
                <span className="text-xs font-black" style={{ color: '#22c55e' }}>
                  +{club.gap}kg で {club.name}
                </span>
              </div>
            )}
          </div>

          {/* Right: Progress ring */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
            <svg width="92" height="92" viewBox="0 0 92 92">
              {/* Track */}
              <circle cx="46" cy="46" r={ringRadius} fill="none" stroke="#1e1e1e" strokeWidth="7" />
              {/* Glow ring (blurred) */}
              <circle cx="46" cy="46" r={ringRadius} fill="none" stroke="rgba(255,107,0,0.15)" strokeWidth="12" />
              {/* Progress */}
              <circle cx="46" cy="46" r={ringRadius} fill="none" stroke="#ff6b00" strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={ringOffset}
                transform="rotate(-90 46 46)" />
              {/* Center */}
              <text x="46" y="41" textAnchor="middle" fill="white" fontSize="15" fontWeight="900"
                fontFamily="system-ui, sans-serif">
                {club ? `${club.progress}%` : '—'}
              </text>
              <text x="46" y="56" textAnchor="middle" fill="#555" fontSize="8" fontWeight="700"
                fontFamily="system-ui, sans-serif">
                {club ? 'to CLUB' : ''}
              </text>
            </svg>
          </div>
        </div>

        {/* Score + Share button */}
        <div className="flex items-center gap-3 mt-4 pt-4"
          style={{ borderTop: '1px solid rgba(255,107,0,0.1)' }}>
          {score !== null && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e1e1e' }}>
              <span className="text-xs font-black tracking-widest" style={{ color: '#555' }}>SCORE</span>
              <span className="text-base font-black" style={{ color: '#ff6b00' }}>{score}</span>
            </div>
          )}
          <Link href={`/share?session=${sessionId}`}
            className="flex-1 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-black text-white active:opacity-80"
            style={{ background: '#ff6b00', boxShadow: '0 4px 20px rgba(255,107,0,0.35)' }}>
            <Share2 size={15} />
            Storyにする ↗
          </Link>
        </div>
      </div>
    </div>
  )
}

function ClubCard({ club, allTimeEst1rm }: { club: ClubInfo | null; allTimeEst1rm: number | null }) {
  if (!club || !allTimeEst1rm) {
    return (
      <div className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid #1a1a1a' }}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xl">🏅</span>
          <div>
            <p className="text-sm font-black text-white">100KG CLUB</p>
            <p className="text-xs" style={{ color: '#444' }}>まずは記録を始めよう</p>
          </div>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: '#1a1a1a' }} />
      </div>
    )
  }

  const current = Math.min(allTimeEst1rm, club.target)
  const pct = club.progress

  return (
    <div className="rounded-2xl p-4 relative overflow-hidden"
      style={{ background: '#111', border: '1px solid #1a1a1a' }}>
      {/* Subtle glow */}
      <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 80% 20%, rgba(255,107,0,0.07) 0%, transparent 70%)' }} />

      <div className="relative flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,107,0,0.12)', border: '1px solid rgba(255,107,0,0.25)' }}>
            <span className="text-lg">🏅</span>
          </div>
          <div>
            <p className="text-sm font-black text-white">{club.name}</p>
            <p className="text-xs font-bold" style={{ color: '#22c55e' }}>あと {club.gap}kg</p>
          </div>
        </div>
        <span className="text-xs font-black px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(255,107,0,0.12)', color: '#ff6b00' }}>
          {pct}%
        </span>
      </div>

      {/* Numbers */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <span className="text-2xl font-black text-white">{current}</span>
          <span className="text-sm font-bold ml-1" style={{ color: '#555' }}>kg</span>
        </div>
        <span className="text-sm font-black" style={{ color: '#333' }}>/ {club.target}kg</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1a1a1a' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #ff6b00, #ffaa44)',
            boxShadow: '0 0 8px rgba(255,107,0,0.6)',
          }} />
      </div>
    </div>
  )
}

/* ─── Pure functions ──────────────────────────────────────── */

function getNextClub(oneRM: number): ClubInfo {
  const milestones = [60, 80, 100, 120, 150, 200]
  const target = milestones.find(m => m > oneRM) ?? 250
  const prev = milestones[milestones.indexOf(target) - 1] ?? 0
  const progress = Math.min(99, Math.round(((oneRM - prev) / (target - prev)) * 100))
  return {
    name: `${target}KG CLUB`,
    target,
    gap: Math.max(1, Math.round(target - oneRM)),
    progress,
    prev,
  }
}

function today() { return new Date().toISOString().split('T')[0] }

function getWeekStart() {
  const d = new Date()
  d.setDate(d.getDate() + (d.getDay() === 0 ? -6 : 1 - d.getDay()))
  return d.toISOString().split('T')[0]
}

function getLastWeekStart() {
  const d = new Date(getWeekStart())
  d.setDate(d.getDate() - 7)
  return d.toISOString().split('T')[0]
}

function getWeekDays() {
  const labels = ['月', '火', '水', '木', '金', '土', '日']
  const start = new Date(getWeekStart())
  return labels.map((label, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return { label, date: d.toISOString().split('T')[0] }
  })
}
