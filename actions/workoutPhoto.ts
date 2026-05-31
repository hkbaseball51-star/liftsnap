'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

export async function saveWorkoutPhotoRecord(
  sessionId: string,
  date: string,
  imagePath: string,
  width?: number,
  height?: number,
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  if (!imagePath.startsWith(user.id + '/')) throw new Error('Invalid image path')

  // Delete old Storage file if path changed (upsert may replace it)
  const { data: existing } = await supabase
    .from('workout_photo_logs')
    .select('image_path')
    .eq('user_id', user.id)
    .eq('workout_session_id', sessionId)
    .maybeSingle()

  if (existing && existing.image_path !== imagePath) {
    await supabase.storage.from('workout-photos').remove([existing.image_path])
  }

  const { error } = await supabase
    .from('workout_photo_logs')
    .upsert(
      {
        user_id: user.id,
        workout_session_id: sessionId,
        workout_date: date,
        image_path: imagePath,
        image_width: width ?? null,
        image_height: height ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,workout_session_id' }
    )

  if (error) throw new Error(error.message)
  revalidatePath('/home')
}

export async function deleteWorkoutPhoto(sessionId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: existing } = await supabase
    .from('workout_photo_logs')
    .select('image_path')
    .eq('user_id', user.id)
    .eq('workout_session_id', sessionId)
    .maybeSingle()

  if (!existing) return

  await supabase.storage.from('workout-photos').remove([existing.image_path])

  await supabase
    .from('workout_photo_logs')
    .delete()
    .eq('user_id', user.id)
    .eq('workout_session_id', sessionId)

  revalidatePath('/home')
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
