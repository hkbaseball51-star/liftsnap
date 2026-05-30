'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

const COOKIE_KEY = 'liftsnap_lang'

export async function saveLanguage(pref: string): Promise<void> {
  // Set cookie so Server Components can read locale without a DB round-trip
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_KEY, pref, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  // Also persist to DB for cross-device sync
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
