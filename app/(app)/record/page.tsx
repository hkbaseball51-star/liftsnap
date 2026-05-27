import { createClient } from '@/lib/supabase/server'
import WorkoutRecorder from '@/components/record/WorkoutRecorder'

export default async function RecordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name, muscle_group, equipment, is_custom')
    .or(user ? `user_id.is.null,user_id.eq.${user.id}` : 'user_id.is.null')
    .order('name')

  return <WorkoutRecorder exercises={exercises ?? []} />
}
