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
}

export async function deleteAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  await Promise.all([
    supabase.from('workout_sessions').delete().eq('user_id', user.id),
    supabase.from('user_badges').delete().eq('user_id', user.id),
    supabase.from('exercises').delete().eq('user_id', user.id).eq('is_custom', true),
  ])
  await supabase.from('profiles').delete().eq('id', user.id)
  await supabase.auth.signOut()

  redirect('/login')
}
