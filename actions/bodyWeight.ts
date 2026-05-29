'use server'

import { createClient } from '@/lib/supabase/server'

export type WeightPoint = {
  date: string
  label: string
  weight: number
}

export function getJstDateString(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0]
}

function labelFromDate(dateStr: string): string {
  const [, mm, dd] = dateStr.split('-')
  return `${parseInt(mm)}/${parseInt(dd)}`
}

export async function getBodyWeightHistory(days = 90): Promise<WeightPoint[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const cutoff = new Date(Date.now() + 9 * 3600 * 1000)
  cutoff.setDate(cutoff.getDate() - days)
  const startDate = cutoff.toISOString().split('T')[0]

  const { data } = await supabase
    .from('body_weights')
    .select('weight_kg, recorded_at')
    .eq('user_id', user.id)
    .gte('recorded_at', startDate)
    .order('recorded_at')

  return (data ?? []).map(r => ({
    date: r.recorded_at,
    label: labelFromDate(r.recorded_at),
    weight: r.weight_kg,
  }))
}

export async function upsertBodyWeight(weightKg: number): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const today = getJstDateString()
  const { error } = await supabase.from('body_weights').upsert(
    { user_id: user.id, weight_kg: weightKg, recorded_at: today },
    { onConflict: 'user_id,recorded_at' }
  )
  if (error) throw error
}
