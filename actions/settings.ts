'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { WeightUnit } from '@/lib/units'

const COOKIE_KEY = 'liftsnap_lang'

// cookieLocale must be resolved ('en'|'ja') — never 'auto' — so server can read it directly
export async function saveLanguage(pref: string, cookieLocale: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_KEY, cookieLocale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

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

export async function saveWeightUnit(unit: WeightUnit): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('profiles').update({ weight_unit: unit }).eq('id', user.id)
}

export async function getUserWeightUnit(): Promise<WeightUnit> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'kg'
  const { data } = await supabase.from('profiles').select('weight_unit').eq('id', user.id).single()
  const val = (data as { weight_unit?: string | null } | null)?.weight_unit
  return val === 'lbs' ? 'lbs' : 'kg'
}
