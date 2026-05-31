'use server'

import { createClient } from '@/lib/supabase/server'

export type PBEntry = {
  est1rm: number  // kg, rounded
  weight: number  // kg — source set
  reps: number    // reps — source set
}

// Same formula as analytics.ts and WorkoutRecorder.tsx
function est1rmOf(weightKg: number, reps: number): number {
  return reps === 1 ? weightKg : Math.round(weightKg * (1 + reps / 30))
}

const BENCH_RE    = /bench|ベンチ/i
const SQUAT_RE    = /squat|スクワット/i
const DEADLIFT_RE = /deadlift|デッドリフト/i

type SetRow = { exercise_name: string; weight_kg: number; reps: number }

export async function getPersonalBests(): Promise<{
  bench:    PBEntry | null
  squat:    PBEntry | null
  deadlift: PBEntry | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { bench: null, squat: null, deadlift: null }

  // Step 1: get completed session IDs for this user (same pattern as analytics.ts)
  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', user.id)
    .not('completed_at', 'is', null)

  const sessionIds = sessions?.map(s => s.id as string) ?? []
  if (sessionIds.length === 0) return { bench: null, squat: null, deadlift: null }

  // Step 2: fetch sets matching any of the three lifts from those sessions
  const { data } = await supabase
    .from('workout_sets')
    .select('exercise_name, weight_kg, reps')
    .in('session_id', sessionIds)
    .eq('is_completed', true)
    .gt('weight_kg', 0)
    .gt('reps', 0)
    .or(
      'exercise_name.ilike.%bench%,' +
      'exercise_name.ilike.%ベンチ%,' +
      'exercise_name.ilike.%squat%,' +
      'exercise_name.ilike.%スクワット%,' +
      'exercise_name.ilike.%deadlift%,' +
      'exercise_name.ilike.%デッドリフト%'
    )

  const sets = (data ?? []) as SetRow[]

  function best(re: RegExp): PBEntry | null {
    let bestEntry: PBEntry | null = null
    let bestEst = 0
    for (const s of sets) {
      if (!re.test(s.exercise_name)) continue
      const est = est1rmOf(s.weight_kg, s.reps)
      if (est > bestEst) {
        bestEst = est
        bestEntry = { est1rm: Math.round(est), weight: s.weight_kg, reps: s.reps }
      }
    }
    return bestEntry
  }

  return {
    bench:    best(BENCH_RE),
    squat:    best(SQUAT_RE),
    deadlift: best(DEADLIFT_RE),
  }
}
