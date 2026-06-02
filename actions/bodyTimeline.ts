'use server'

import { createClient } from '@/lib/supabase/server'

export type TimelinePhoto = {
  date: string       // YYYY-MM-DD
  signedUrl: string       // full-size image
  thumbnailUrl: string    // thumbnail (fallback to signedUrl if no thumbnail)
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
    .select('workout_date, image_path, thumbnail_path')
    .eq('user_id', user.id)
    .order('workout_date', { ascending: false })
    .limit(LIMIT)

  if (!rows || rows.length === 0) return []

  type Row = { workout_date: string; image_path: string; thumbnail_path: string | null }
  const photos = rows as Row[]

  // Batch fetch full-size signed URLs
  const { data: fullBatch } = await supabase.storage
    .from('workout-photos')
    .createSignedUrls(photos.map(r => r.image_path), 3600)

  const fullUrlMap = new Map<string, string>()
  if (fullBatch) {
    for (const item of fullBatch) {
      if (item.signedUrl && !item.error && item.path) {
        fullUrlMap.set(item.path, item.signedUrl)
      }
    }
  }

  // Batch fetch thumbnail signed URLs (only for photos that have a thumbnail_path)
  const thumbPhotos = photos.filter(r => r.thumbnail_path)
  const thumbUrlMap = new Map<string, string>()
  if (thumbPhotos.length > 0) {
    const { data: thumbBatch } = await supabase.storage
      .from('workout-photos')
      .createSignedUrls(thumbPhotos.map(r => r.thumbnail_path!), 3600)
    if (thumbBatch) {
      for (const item of thumbBatch) {
        if (item.signedUrl && !item.error && item.path) {
          thumbUrlMap.set(item.path, item.signedUrl)
        }
      }
    }
  }

  return photos
    .map(r => {
      const signedUrl = fullUrlMap.get(r.image_path) ?? ''
      const thumbnailUrl = r.thumbnail_path
        ? (thumbUrlMap.get(r.thumbnail_path) ?? signedUrl)
        : signedUrl
      return {
        date:         r.workout_date,
        imagePath:    r.image_path,
        signedUrl,
        thumbnailUrl,
      }
    })
    .filter(p => p.signedUrl !== '')
}
