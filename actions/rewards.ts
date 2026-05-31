'use server'

import { createClient } from '@/lib/supabase/server'
import { calcProofStreak, calcBestProofStreak, getMondayOfWeek } from '@/lib/proofStreak'

export type RewardsData = {
  totalSessions: number
  exercises: { name: string; logCount: number }[]
  photoCount: number
  uniqueWorkoutDays: number
  proofStreak: number
  bestProofStreak: number
  thisWeekProof: boolean
  thisWeekWorkouts: number
  thisWeekPhotos: number
  recentPhotos: { date: string; signedUrl: string }[]
}

export async function getRewardsData(): Promise<RewardsData> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return {
    totalSessions: 0, exercises: [], photoCount: 0, uniqueWorkoutDays: 0,
    proofStreak: 0, bestProofStreak: 0, thisWeekProof: false,
    thisWeekWorkouts: 0, thisWeekPhotos: 0, recentPhotos: [],
  }

  const [sessionsResult, setsResult, datesResult, photosResult] = await Promise.allSettled([
    supabase
      .from('workout_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('completed_at', 'is', null),
    supabase
      .from('workout_sets')
      .select('exercise_name, session_id')
      .eq('is_completed', true),
    supabase
      .from('workout_sessions')
      .select('trained_at')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null),
    supabase
      .from('workout_photo_logs')
      .select('workout_date, image_path')
      .eq('user_id', user.id)
      .order('workout_date', { ascending: false }),
  ])

  const totalSessions =
    sessionsResult.status === 'fulfilled' ? (sessionsResult.value.count ?? 0) : 0

  const exercises: { name: string; logCount: number }[] = []
  if (setsResult.status === 'fulfilled' && setsResult.value.data?.length) {
    const map = new Map<string, Set<string>>()
    setsResult.value.data.forEach(s => {
      if (!map.has(s.exercise_name)) map.set(s.exercise_name, new Set())
      if (s.session_id) map.get(s.exercise_name)!.add(String(s.session_id))
    })
    map.forEach((sessions, name) => exercises.push({ name, logCount: sessions.size }))
  }

  const workoutDates: string[] =
    datesResult.status === 'fulfilled' && datesResult.value.data
      ? datesResult.value.data.map((r: { trained_at: string }) => r.trained_at.slice(0, 10))
      : []

  const uniqueWorkoutDays = new Set(workoutDates).size

  type PhotoRow = { workout_date: string; image_path: string }
  const allPhotos: PhotoRow[] =
    photosResult.status === 'fulfilled' && photosResult.value.data
      ? photosResult.value.data as PhotoRow[]
      : []

  const photoDates = allPhotos.map(r => r.workout_date)
  const photoCount = photoDates.length

  // Generate signed URLs for the latest 5 photos
  const top5 = allPhotos.slice(0, 5)
  const signedUrlResults = await Promise.allSettled(
    top5.map(p => supabase.storage.from('workout-photos').createSignedUrl(p.image_path, 3600))
  )
  const recentPhotos = top5
    .map((p, i) => ({
      date: p.workout_date,
      signedUrl: signedUrlResults[i].status === 'fulfilled'
        ? (signedUrlResults[i].value.data?.signedUrl ?? '')
        : '',
    }))
    .filter(p => p.signedUrl !== '')

  const todayStr = new Date()
    .toLocaleString('en-CA', { timeZone: 'Asia/Tokyo' })
    .slice(0, 10)

  const weekStart = getMondayOfWeek(todayStr)
  const thisWeekWorkouts = workoutDates.filter(d => d >= weekStart).length
  const thisWeekPhotos   = photoDates.filter(d => d >= weekStart).length

  const { streak: proofStreak, thisWeekDone: thisWeekProof } =
    calcProofStreak(workoutDates, photoDates, todayStr)
  const bestProofStreak = calcBestProofStreak(workoutDates, photoDates)

  return {
    totalSessions, exercises, photoCount, uniqueWorkoutDays,
    proofStreak, bestProofStreak, thisWeekProof,
    thisWeekWorkouts, thisWeekPhotos, recentPhotos,
  }
}
