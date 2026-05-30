import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingFlow from '@/components/onboarding/OnboardingFlow'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.is_anonymous) redirect('/home')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, onboarding_completed')
    .eq('id', user.id)
    .single()

  if (profile?.onboarding_completed === true) redirect('/home')

  return (
    <OnboardingFlow initialDisplayName={profile?.display_name ?? ''} />
  )
}
