import WorkoutRecorder from './WorkoutRecorder'

type InitialExercise = {
  name: string
  muscle_group: string
  note?: string | null
  sets: { id: string; set_number: number; weight_kg: number | null; reps: number | null }[]
}

type SessionData = {
  id: string
  title: string
  exercises: InitialExercise[]
} | null

type Props = {
  initialDate: string
  initialSession: SessionData
  from?: string
}

export default function RecordNavigator({ initialDate, initialSession, from }: Props) {
  return (
    <WorkoutRecorder
      date={initialDate}
      existingSessionId={initialSession?.id}
      existingExercises={initialSession?.exercises}
      existingTitle={initialSession?.title}
      from={from}
    />
  )
}
