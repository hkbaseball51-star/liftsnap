'use client'

// Centralised data provider for the REPRA app.
// Fetches workout + body-weight data ONCE per source change and shares it
// across all pages via context (no per-page re-fetch on navigation).
//
// Priority:  demo mode (Supabase) → local mode (localStorage)
// Refresh:   local data is re-read silently on every client-side navigation.
//            Demo data only reloads when the demo source changes.

import {
  createContext, useContext, useState, useEffect,
  useMemo, useCallback, useRef, type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import { useDemoMode } from '@/lib/useDemoMode'
import {
  localGetCalendarData,
  localGetExercisesWithHistory,
  localGetBodyWeightHistory,
  localGetTotalSessions,
  localUpsertBodyWeight,
  runLocalDBMigration,
} from '@/lib/localDB'
import {
  getDemoCalendarData,
  getDemoExercisesWithHistory,
  getDemoBodyWeightHistory,
  getDemoTotalSessions,
} from '@/actions/demo'
import { calcProofStreak } from '@/lib/proofStreak'
import { inferMuscleGroupFromExerciseName } from '@/lib/calendarLabel'
import type { CalendarSession } from '@/components/home/TrainingCalendar'
import type { DaySummary } from '@/components/home/CalendarWithSummary'

// ── Internal raw types ──────────────────────────────────────────────────────

type RawSet = {
  exercise_name: string
  muscle_group:  string | null
  weight_kg:     number | null
  reps:          number | null
  is_completed:  boolean
  note?:         string | null
}

type RawSession = {
  id:              string
  trained_at:      string
  title?:          string | null
  total_volume_kg?: number | null
  sets:            RawSet[]
}

export type BodyWeightPoint = { date: string; label: string; weight: number }
export type AppExercise    = { name: string; muscle_group: string; logCount: number }
export type WeekSession    = { id: string; trained_at: string; total_volume_kg: number }

// ── Public context type ─────────────────────────────────────────────────────

export type AppDataContextValue = {
  // For Home / Calendar
  calendarSessions:  CalendarSession[]
  daySummaries:      Record<string, DaySummary>
  bodyWeightByDate:  Record<string, number>
  thisWeekSessions:  WeekSession[]
  lastWeekVolume:    number
  allTimeEst1rm:     number | null
  weekStreak:        number
  todayStr:          string

  // For Analytics
  exercises:         AppExercise[]
  totalSessions:     number
  bodyWeightHistory: BodyWeightPoint[]

  // Status
  isLoading:         boolean
  isRefreshing:      boolean
  error:             string | null
  activeDataSource:  'local' | 'demo'

  // Actions
  refreshData:       () => Promise<void>
  addBodyWeight:     (weightKg: number, date: string) => void
}

// ── Context ─────────────────────────────────────────────────────────────────

const AppDataContext = createContext<AppDataContextValue | null>(null)

// ── Helpers ─────────────────────────────────────────────────────────────────

function jstToday(): string {
  return new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' })
}

function getWeekStart(): string {
  const d = new Date(jstToday() + 'T00:00:00')
  d.setDate(d.getDate() + (d.getDay() === 0 ? -6 : 1 - d.getDay()))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getLastWeekStart(): string {
  const d = new Date(getWeekStart() + 'T00:00:00')
  d.setDate(d.getDate() - 7)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function processRawSessions(rawSessions: RawSession[], today: string): {
  calendarSessions: CalendarSession[]
  daySummaries:     Record<string, DaySummary>
  allTimeEst1rm:    number | null
} {
  const calendarSessions: CalendarSession[]      = []
  const daySummaries: Record<string, DaySummary> = {}
  let allTimeBest = 0

  for (const session of rawSessions) {
    if (session.trained_at > today) continue
    const sets = session.sets ?? []
    const hasValid = sets.some(s =>
      s.exercise_name &&
      ((typeof s.weight_kg === 'number' && s.weight_kg > 0) ||
       (typeof s.reps    === 'number' && s.reps    > 0))
    )
    if (!hasValid) continue

    // Muscle group distribution (falls back to exercise name inference if muscle_group is absent)
    const mgMap = new Map<string, number>()
    for (const s of sets) {
      const mg = s.muscle_group?.toLowerCase() ?? inferMuscleGroupFromExerciseName(s.exercise_name)
      if (mg) mgMap.set(mg, (mgMap.get(mg) ?? 0) + 1)
    }
    const sortedMg     = mgMap.size > 0 ? [...mgMap.entries()].sort((a, b) => b[1] - a[1]) : null
    const topMuscle    = sortedMg ? sortedMg[0][0] : 'full body'
    const allMuscleGroups = sortedMg ? sortedMg.map(([mg]) => mg) : []

    calendarSessions.push({ date: session.trained_at, muscleGroup: topMuscle, allMuscleGroups })

    // Per-exercise stats
    const exMap = new Map<string, {
      volume: number; bestEst1rm: number
      bestWeight: number; bestReps: number; note: string | null
    }>()
    let totalSets   = 0
    let totalVolume = 0
    let best1rm     = 0

    for (const s of sets) {
      const w   = s.weight_kg ?? 0
      const r   = s.reps      ?? 0
      totalSets++
      totalVolume += w * r
      const est = w > 0 && r > 0 ? (r === 1 ? w : Math.round(w * (1 + r / 30))) : 0
      if (est > best1rm)     best1rm     = est
      if (est > allTimeBest) allTimeBest = est

      const ex      = exMap.get(s.exercise_name) ?? { volume: 0, bestEst1rm: 0, bestWeight: 0, bestReps: 0, note: null }
      const isBetter = est > ex.bestEst1rm
      exMap.set(s.exercise_name, {
        volume:      ex.volume + w * r,
        bestEst1rm:  isBetter ? est : ex.bestEst1rm,
        bestWeight:  isBetter ? w   : ex.bestWeight,
        bestReps:    isBetter ? r   : ex.bestReps,
        note:        ex.note ?? (s.note ?? null),
      })
    }

    const sortedEx = [...exMap.entries()].sort((a, b) => b[1].volume - a[1].volume)
    const main     = sortedEx[0]
    const second   = sortedEx[1]

    daySummaries[session.trained_at] = {
      date:                    session.trained_at,
      title:                   session.title ?? undefined,
      sessionId:               session.id,
      muscleGroup:             topMuscle,
      allMuscleGroups,
      totalSets,
      totalVolume:             Math.round(totalVolume),
      best1rm,
      mainExercise:            main   ? main[0]   : '',
      mainExerciseBestWeight:  main   ? main[1].bestWeight : 0,
      mainExerciseBestReps:    main   ? main[1].bestReps   : 0,
      mainExerciseNote:        main   ? (main[1].note ?? null) : null,
      secondExercise:          second ? second[0] : null,
      extraCount:              Math.max(0, exMap.size - 1),
    }
  }

  return { calendarSessions, daySummaries, allTimeEst1rm: allTimeBest > 0 ? allTimeBest : null }
}

// ── Provider ────────────────────────────────────────────────────────────────

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { isDemo, demoUserId, mounted: demoMounted } = useDemoMode()
  const pathname = usePathname()

  // Lazy initializers read from localStorage on the very first client render,
  // eliminating the flash of empty state between first paint and mount effects.
  // Guards against SSR (typeof window === 'undefined') and any localStorage errors.
  const [rawSessions,       setRawSessions]       = useState<RawSession[]>(() => {
    if (typeof window === 'undefined') return []
    try { return localGetCalendarData(3650).sessions } catch { return [] }
  })
  const [bodyWeightHistory, setBodyWeightHistory] = useState<BodyWeightPoint[]>(() => {
    if (typeof window === 'undefined') return []
    try { return localGetBodyWeightHistory(730) } catch { return [] }
  })
  const [exercises,         setExercises]         = useState<AppExercise[]>(() => {
    if (typeof window === 'undefined') return []
    try { return localGetExercisesWithHistory() } catch { return [] }
  })
  const [totalSessions,     setTotalSessions]     = useState(() => {
    if (typeof window === 'undefined') return 0
    try { return localGetTotalSessions() } catch { return 0 }
  })
  const [isLoading,         setIsLoading]         = useState(false)
  const [isRefreshing,      setIsRefreshing]      = useState(false)
  const [error,             setError]             = useState<string | null>(null)
  const [dataSource,        setDataSource]        = useState('')

  // Guards against double-load on first render
  const navReady = useRef(false)

  // ── Load local (synchronous, instant) ────────────────────────────────────

  const loadLocal = useCallback(() => {
    const { sessions } = localGetCalendarData(3650)
    setRawSessions(sessions)
    setExercises(localGetExercisesWithHistory())
    setTotalSessions(localGetTotalSessions())
    setBodyWeightHistory(localGetBodyWeightHistory(730))
    setIsLoading(false)
    // navReady is managed by callers, not here:
    //   - mount effect: intentionally leaves it false so pathname effect skips first run
    //   - source-change effect: sets it true after calling loadLocal()
  }, [])

  // ── Load demo (async, Supabase) ───────────────────────────────────────────

  const loadDemo = useCallback(async (userId: string, isRefresh: boolean) => {
    if (isRefresh) setIsRefreshing(true)
    else           setIsLoading(true)
    setError(null)
    try {
      const [calData, exs, bwHist, total] = await Promise.all([
        getDemoCalendarData(userId, 400),
        getDemoExercisesWithHistory(userId),
        getDemoBodyWeightHistory(userId, 730),
        getDemoTotalSessions(userId),
      ])
      setRawSessions(calData.sessions)
      setBodyWeightHistory(bwHist)
      setExercises(exs)
      setTotalSessions(total)
      navReady.current = true
    } catch (e) {
      setError('Demo data load failed. Check your connection.')
      if (process.env.NODE_ENV !== 'production') console.error('[AppDataProvider]', e)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // ── Mount-time local preload (runs before demoMounted resolves) ──────────
  // Synchronous localStorage read that fires immediately on first client render.
  // Eliminates the blank-screen window between SplashScreen hide and data ready.
  // navReady is intentionally NOT set here — the pathname effect manages that
  // for its own first-run skip guard.
  // If demo mode is detected later, loadDemo() overwrites this data.

  useEffect(() => {
    runLocalDBMigration()
    loadLocal()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // mount only

  // ── Initial / source-change load ─────────────────────────────────────────

  useEffect(() => {
    if (!demoMounted) return
    const source = isDemo ? `demo:${demoUserId}` : 'local'
    if (source === dataSource) return           // Same source → skip
    setDataSource(source)
    navReady.current = false

    if (isDemo && demoUserId) {
      loadDemo(demoUserId, false)
    } else {
      loadLocal()
      navReady.current = true  // local load is synchronous — mark ready immediately
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMounted, isDemo, demoUserId])

  // ── Silent local refresh on every client-side navigation ─────────────────
  // localStorage reads are synchronous (<1 ms) so there is no loading state.
  // This ensures Record saves are reflected immediately when returning to Home.

  useEffect(() => {
    if (!navReady.current) {
      // First invocation on mount — skip (initial load handles it)
      navReady.current = true
      return
    }
    if (isDemo || dataSource !== 'local') return
    const { sessions } = localGetCalendarData(3650)
    setRawSessions(sessions)
    setExercises(localGetExercisesWithHistory())
    setTotalSessions(localGetTotalSessions())
    setBodyWeightHistory(localGetBodyWeightHistory(730))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // ── Derived / memoised data ──────────────────────────────────────────────

  const todayStr     = useMemo(() => jstToday(),       [])
  const weekStart    = useMemo(() => getWeekStart(),    [])
  const lastWkStart  = useMemo(() => getLastWeekStart(), [])

  const { calendarSessions, daySummaries, allTimeEst1rm } = useMemo(
    () => processRawSessions(rawSessions, todayStr),
    [rawSessions, todayStr],
  )

  const bodyWeightByDate = useMemo<Record<string, number>>(() => {
    const m: Record<string, number> = {}
    for (const bw of bodyWeightHistory) m[bw.date] = bw.weight
    return m
  }, [bodyWeightHistory])

  const thisWeekSessions = useMemo<WeekSession[]>(() =>
    rawSessions
      .filter(s => s.trained_at >= weekStart && s.trained_at <= todayStr)
      .map(s => ({
        id:              s.id,
        trained_at:      s.trained_at,
        total_volume_kg: s.total_volume_kg
          ?? s.sets.reduce((sum, set) => sum + (set.weight_kg ?? 0) * (set.reps ?? 0), 0),
      })),
  [rawSessions, weekStart, todayStr])

  const lastWeekVolume = useMemo(() =>
    rawSessions
      .filter(s => s.trained_at >= lastWkStart && s.trained_at < weekStart)
      .reduce((sum, s) =>
        sum + s.sets.reduce((sv, set) => sv + (set.weight_kg ?? 0) * (set.reps ?? 0), 0), 0),
  [rawSessions, lastWkStart, weekStart])

  const weekStreak = useMemo(() => {
    const { streak } = calcProofStreak(calendarSessions.map(s => s.date), [], todayStr)
    return streak
  }, [calendarSessions, todayStr])

  // ── Actions ──────────────────────────────────────────────────────────────

  const refreshData = useCallback(async () => {
    if (isDemo && demoUserId) {
      await loadDemo(demoUserId, true)
    } else {
      setIsRefreshing(true)
      loadLocal()
      setIsRefreshing(false)
    }
  }, [isDemo, demoUserId, loadDemo, loadLocal])

  const addBodyWeight = useCallback((weightKg: number, date: string) => {
    if (isDemo) return
    localUpsertBodyWeight(weightKg, date)
    const [, mm, dd] = date.split('-')
    const label = `${parseInt(mm)}/${parseInt(dd)}`
    setBodyWeightHistory(prev => {
      const filtered = prev.filter(p => p.date !== date)
      return [...filtered, { date, label, weight: weightKg }]
        .sort((a, b) => a.date.localeCompare(b.date))
    })
  }, [isDemo])

  // ── Context value ─────────────────────────────────────────────────────────

  const value = useMemo<AppDataContextValue>(() => ({
    calendarSessions,
    daySummaries,
    bodyWeightByDate,
    thisWeekSessions,
    lastWeekVolume,
    allTimeEst1rm,
    weekStreak,
    todayStr,
    exercises,
    totalSessions,
    bodyWeightHistory,
    isLoading,
    isRefreshing,
    error,
    activeDataSource: isDemo ? 'demo' : 'local',
    refreshData,
    addBodyWeight,
  }), [
    calendarSessions, daySummaries, bodyWeightByDate,
    thisWeekSessions, lastWeekVolume, allTimeEst1rm, weekStreak, todayStr,
    exercises, totalSessions, bodyWeightHistory,
    isLoading, isRefreshing, error, isDemo,
    refreshData, addBodyWeight,
  ])

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  )
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be called inside <AppDataProvider>')
  return ctx
}
