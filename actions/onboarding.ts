'use server'

import { createClient } from '@/lib/supabase/server'
import { upsertBodyWeight } from './bodyWeight'

export type OnboardingData = {
  weightUnit: 'kg' | 'lbs'
  goal: 'muscle_gain' | 'fat_loss' | 'strength' | 'endurance' | 'general'
  experience: 'beginner' | 'intermediate' | 'advanced'
  workoutFrequency: number
  bodyWeight: number | null
  displayName: string
  emailOptIn: boolean
  acquisitionSource: string | null
}

export async function completeOnboarding(data: OnboardingData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const now = new Date().toISOString()
  const { error } = await supabase.from('profiles').update({
    weight_unit: data.weightUnit,
    goal: data.goal,
    experience: data.experience,
    workout_frequency: data.workoutFrequency,
    display_name: data.displayName || null,
    email_opt_in: data.emailOptIn,
    email_opt_in_at: data.emailOptIn ? now : null,
    acquisition_source: data.acquisitionSource,
    onboarding_completed: true,
    updated_at: now,
  }).eq('id', user.id)

  if (error) throw error

  if (data.bodyWeight !== null) {
    await upsertBodyWeight(data.bodyWeight)
  }
}
