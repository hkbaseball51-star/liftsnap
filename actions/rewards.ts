'use server'

import { createClient } from '@/lib/supabase/server'

export type RewardsData = {
  totalSessions: number
  exercises: { name: string; logCount: number }[]
}

export async function getRewardsData(): Promise<RewardsData> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { totalSessions: 0, exercises: [] }

  console.time('[Rewards] fetch')

  const [sessionsResult, setsResult] = await Promise.allSettled([
    supabase
      .from('workout_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('completed_at', 'is', null),
    supabase
      .from('workout_sets')
      .select('exercise_name, session_id')
      .eq('is_completed', true),
  ])

  console.timeEnd('[Rewards] fetch')

  const totalSessions =
    sessionsResult.status === 'fulfilled' ? (sessionsResult.value.count ?? 0) : 0

  const exercises: { name: string; logCount: number }[] = []
  if (setsResult.status === 'fulfilled' && setsResult.value.data?.length) {
    console.time('[Rewards] compute exercises')
    const map = new Map<string, Set<string>>()
    setsResult.value.data.forEach(s => {
      if (!map.has(s.exercise_name)) map.set(s.exercise_name, new Set())
      if (s.session_id) map.get(s.exercise_name)!.add(String(s.session_id))
    })
    map.forEach((sessions, name) => exercises.push({ name, logCount: sessions.size }))
    console.timeEnd('[Rewards] compute exercises')
  }

  return { totalSessions, exercises }
}
