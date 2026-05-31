'use server'

import { createClient } from '@/lib/supabase/server'

export type TimelinePhoto = {
  date: string       // YYYY-MM-DD
  signedUrl: string
  imagePath: string
}

// Fetch up to LIMIT body photos ordered newest-first.
// Increase LIMIT or add cursor-based pagination in the future.
const LIMIT = 50

export async function getBodyTimelinePhotos(): Promise<TimelinePhoto[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: rows } = await supabase
    .from('workout_photo_logs')
    .select('workout_date, image_path')
    .eq('user_id', user.id)
    .order('workout_date', { ascending: false })
    .limit(LIMIT)

  if (!rows || rows.length === 0) return []

  type Row = { workout_date: string; image_path: string }
  const photos = rows as Row[]

  const signedResults = await Promise.allSettled(
    photos.map(r =>
      supabase.storage
        .from('workout-photos')
        .createSignedUrl(r.image_path, 3600)
    )
  )

  return photos
    .map((r, i) => ({
      date:      r.workout_date,
      imagePath: r.image_path,
      signedUrl:
        signedResults[i].status === 'fulfilled'
          ? (signedResults[i].value.data?.signedUrl ?? '')
          : '',
    }))
    .filter(p => p.signedUrl !== '')
}
