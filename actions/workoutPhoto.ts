'use server'

import { createClient } from '@/lib/supabase/server'

export async function getWorkoutPhotoPath(sessionId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('workout_photo_logs')
    .select('image_path')
    .eq('user_id', user.id)
    .eq('workout_session_id', sessionId)
    .maybeSingle()

  return data?.image_path ?? null
}

export async function getWorkoutPhotoSignedUrl(imagePath: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  if (!imagePath.startsWith(user.id + '/')) return null

  const { data } = await supabase.storage
    .from('workout-photos')
    .createSignedUrl(imagePath, 3600)

  return data?.signedUrl ?? null
}

// Single round-trip: DB lookup + batch signed URL in one call
export async function getWorkoutPhotoRecord(sessionId: string): Promise<{
  imagePath: string
  thumbnailPath: string | null
  fullUrl: string | null
  thumbUrl: string | null
} | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('workout_photo_logs')
    .select('image_path, thumbnail_path')
    .eq('user_id', user.id)
    .eq('workout_session_id', sessionId)
    .maybeSingle()

  if (!data) return null

  const imagePath = data.image_path as string
  const thumbnailPath = (data.thumbnail_path as string | null) ?? null

  if (!imagePath.startsWith(user.id + '/')) return null

  const pathsToSign = thumbnailPath ? [imagePath, thumbnailPath] : [imagePath]
  const { data: urls } = await supabase.storage
    .from('workout-photos')
    .createSignedUrls(pathsToSign, 3600)

  const byPath = new Map((urls ?? []).map(u => [u.path, u]))
  const fullEntry  = byPath.get(imagePath)
  const thumbEntry = thumbnailPath ? byPath.get(thumbnailPath) : null

  const fullUrl  = fullEntry?.signedUrl  && !fullEntry.error  ? fullEntry.signedUrl  : null
  const thumbUrl = thumbEntry?.signedUrl && !thumbEntry.error ? thumbEntry.signedUrl : null

  if (process.env.NODE_ENV === 'development' && !fullUrl) {
    console.warn('[PhotoLoad] signed URL failed', { imagePath, error: fullEntry?.error })
  }

  return { imagePath, thumbnailPath, fullUrl, thumbUrl }
}

export async function saveWorkoutPhotoRecord(
  sessionId: string,
  date: string,
  imagePath: string,
  thumbnailPath: string | null,
  width?: number,
  height?: number,
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  if (!imagePath.startsWith(user.id + '/')) throw new Error('Invalid image path')

  // Delete old Storage files if paths changed (upsert may replace them)
  const { data: existing } = await supabase
    .from('workout_photo_logs')
    .select('image_path, thumbnail_path')
    .eq('user_id', user.id)
    .eq('workout_session_id', sessionId)
    .maybeSingle()

  if (existing) {
    const toRemove: string[] = []
    if (existing.image_path !== imagePath) toRemove.push(existing.image_path)
    if (existing.thumbnail_path && existing.thumbnail_path !== thumbnailPath) toRemove.push(existing.thumbnail_path)
    if (toRemove.length > 0) await supabase.storage.from('workout-photos').remove(toRemove)
  }

  const { error } = await supabase
    .from('workout_photo_logs')
    .upsert(
      {
        user_id: user.id,
        workout_session_id: sessionId,
        workout_date: date,
        image_path: imagePath,
        thumbnail_path: thumbnailPath ?? null,
        image_width: width ?? null,
        image_height: height ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,workout_session_id' }
    )

  if (error) throw new Error(error.message)
}

export async function deleteWorkoutPhoto(sessionId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: existing } = await supabase
    .from('workout_photo_logs')
    .select('image_path, thumbnail_path')
    .eq('user_id', user.id)
    .eq('workout_session_id', sessionId)
    .maybeSingle()

  if (!existing) return

  const pathsToRemove = [existing.image_path, existing.thumbnail_path].filter(Boolean) as string[]
  if (pathsToRemove.length > 0) {
    await supabase.storage.from('workout-photos').remove(pathsToRemove)
  }

  await supabase
    .from('workout_photo_logs')
    .delete()
    .eq('user_id', user.id)
    .eq('workout_session_id', sessionId)
}

export async function getPhotoDatesForRange(startDate: string): Promise<string[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('workout_photo_logs')
    .select('workout_date')
    .eq('user_id', user.id)
    .gte('workout_date', startDate)

  return (data ?? []).map((r: { workout_date: string }) => r.workout_date)
}

export async function getPhotoForDate(
  date: string,
): Promise<{ imagePath: string; sessionId: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('workout_photo_logs')
    .select('image_path, workout_session_id')
    .eq('user_id', user.id)
    .eq('workout_date', date)
    .maybeSingle()

  if (!data) return null
  return { imagePath: data.image_path, sessionId: data.workout_session_id as string }
}
