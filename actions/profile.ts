'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateDisplayName(displayName: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const trimmed = displayName.trim()
  if (!trimmed) throw new Error('Display name is required')

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: trimmed })
    .eq('id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/profile')
}

export async function updateProfile(displayName: string, username: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const trimmedName = displayName.trim()
  if (!trimmedName) throw new Error('Display name is required')

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: trimmedName, username: username ?? null })
    .eq('id', user.id)

  if (error) {
    if (error.code === '23505' || error.message.includes('unique') || error.message.includes('duplicate')) {
      throw new Error('USERNAME_TAKEN')
    }
    throw new Error(error.message)
  }
  revalidatePath('/profile')
  revalidatePath('/profile/edit')
}

export async function deleteAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Delete Storage photos first (no cascade), then DB records
  const { data: photoLogs } = await supabase
    .from('workout_photo_logs')
    .select('image_path')
    .eq('user_id', user.id)
  if (photoLogs && photoLogs.length > 0) {
    const paths = photoLogs.map((p: { image_path: string }) => p.image_path)
    await supabase.storage.from('workout-photos').remove(paths)
  }

  await Promise.all([
    supabase.from('workout_photo_logs').delete().eq('user_id', user.id),
    supabase.from('workout_sessions').delete().eq('user_id', user.id), // cascades workout_sets
    supabase.from('user_badges').delete().eq('user_id', user.id),
    supabase.from('exercises').delete().eq('user_id', user.id).eq('is_custom', true),
    supabase.from('body_weights').delete().eq('user_id', user.id),
  ])
  await supabase.from('profiles').delete().eq('id', user.id)
  await supabase.auth.signOut()

  redirect('/login')
}
