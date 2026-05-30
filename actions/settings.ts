'use server'

import { createClient } from '@/lib/supabase/server'

export async function saveLanguage(pref: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('profiles').update({ language: pref }).eq('id', user.id)
}

export async function getUserLanguage(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('language').eq('id', user.id).single()
  return data?.language ?? null
}
