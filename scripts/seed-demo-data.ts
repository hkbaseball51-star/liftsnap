/**
 * Seed demo data for REPRA Instagram video content.
 * Target user: 2322e1d9-567d-4f4f-913a-1accac66b5eb
 *
 * Run: npx tsx scripts/seed-demo-data.ts
 *
 * Idempotent — safe to run multiple times.
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// ── Config ────────────────────────────────────────────────────────

const SUPABASE_URL       = 'https://obdceykzebheplnjszox.supabase.co'
const SERVICE_ROLE_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iZGNleWt6ZWJoZXBsbmpzem94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg2MTI2NSwiZXhwIjoyMDk1NDM3MjY1fQ.VgXfaD5wKJtEOSAeOMrP15LhYT1Xitik3xswFugOuuw'
const USER_ID            = '2322e1d9-567d-4f4f-913a-1accac66b5eb'
const BUCKET             = 'workout-photos'
const ASSETS_DIR         = path.join(process.cwd(), 'assets', 'images')

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Demo data ─────────────────────────────────────────────────────

type ExerciseRow = {
  name:       string
  muscle:     string
  weight_kg:  number
  reps:       number
  sets:       number
}

type DemoSession = {
  date:      string      // YYYY-MM-DD
  title:     string
  imageFile: string
  exercises: ExerciseRow[]
}

const DEMOS: DemoSession[] = [
  {
    date:      '2025-06-02',
    title:     'Beginner Push & Pull',
    imageFile: 'body-progress_2322e1d9_2025-06-02_week-01-start.png',
    exercises: [
      { name: 'Bench Press',             muscle: 'CHEST',     weight_kg: 40, reps: 10, sets: 3 },
      { name: 'Lat Pulldown',            muscle: 'BACK',      weight_kg: 35, reps: 10, sets: 3 },
      { name: 'Dumbbell Shoulder Press', muscle: 'SHOULDERS', weight_kg: 10, reps: 10, sets: 3 },
    ],
  },
  {
    date:      '2025-06-16',
    title:     'Week 3 Progress',
    imageFile: 'body-progress_2322e1d9_2025-06-16_week-03-slight-change.png',
    exercises: [
      { name: 'Bench Press',             muscle: 'CHEST',     weight_kg: 45, reps: 10, sets: 3 },
      { name: 'Lat Pulldown',            muscle: 'BACK',      weight_kg: 40, reps: 10, sets: 3 },
      { name: 'Dumbbell Shoulder Press', muscle: 'SHOULDERS', weight_kg: 12, reps: 10, sets: 3 },
    ],
  },
  {
    date:      '2025-07-07',
    title:     'Week 6 Progress',
    imageFile: 'body-progress_2322e1d9_2025-07-07_week-06-getting-clear.png',
    exercises: [
      { name: 'Bench Press',             muscle: 'CHEST',     weight_kg: 50, reps:  8, sets: 3 },
      { name: 'Lat Pulldown',            muscle: 'BACK',      weight_kg: 45, reps: 10, sets: 3 },
      { name: 'Dumbbell Shoulder Press', muscle: 'SHOULDERS', weight_kg: 14, reps: 10, sets: 3 },
      { name: 'Cable Row',               muscle: 'BACK',      weight_kg: 40, reps: 10, sets: 3 },
    ],
  },
  {
    date:      '2025-12-02',
    title:     'Month 6 Progress',
    imageFile: 'body-progress_2322e1d9_2025-12-02_month-06-visible-progress.png',
    exercises: [
      { name: 'Bench Press',             muscle: 'CHEST',     weight_kg: 70, reps:  8, sets: 3 },
      { name: 'Lat Pulldown',            muscle: 'BACK',      weight_kg: 60, reps: 10, sets: 3 },
      { name: 'Dumbbell Shoulder Press', muscle: 'SHOULDERS', weight_kg: 22, reps:  8, sets: 3 },
      { name: 'Cable Row',               muscle: 'BACK',      weight_kg: 55, reps: 10, sets: 3 },
      { name: 'Squat',                   muscle: 'QUADS',     weight_kg: 80, reps:  8, sets: 3 },
    ],
  },
]

// ── Helpers ───────────────────────────────────────────────────────

function computeVolume(exercises: ExerciseRow[]): number {
  return exercises.reduce((sum, e) => sum + e.weight_kg * e.reps * e.sets, 0)
}

function storagePath(filename: string): string {
  return `${USER_ID}/${filename}`
}

// ── Steps ─────────────────────────────────────────────────────────

async function uploadImage(filename: string): Promise<string> {
  const localPath   = path.join(ASSETS_DIR, filename)
  const remotePath  = storagePath(filename)

  if (!fs.existsSync(localPath)) {
    throw new Error(`Image not found: ${localPath}`)
  }

  const buffer = fs.readFileSync(localPath)

  // Check if already exists
  const { data: existing } = await supabase.storage
    .from(BUCKET)
    .list(USER_ID, { search: filename })

  if (existing && existing.some(f => f.name === filename)) {
    console.log(`  ✓ image already in storage: ${remotePath}`)
    return remotePath
  }

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(remotePath, buffer, { contentType: 'image/png', upsert: true })

  if (error) throw new Error(`Storage upload failed (${filename}): ${error.message}`)
  console.log(`  ↑ uploaded: ${remotePath}`)
  return remotePath
}

async function upsertSession(demo: DemoSession): Promise<string> {
  // Check if session already exists for this user + date + title
  const { data: existing } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', USER_ID)
    .eq('trained_at', demo.date)
    .eq('title', demo.title)
    .maybeSingle()

  if (existing) {
    console.log(`  ✓ session exists: ${demo.date} "${demo.title}" → ${existing.id}`)
    return existing.id as string
  }

  const volume = computeVolume(demo.exercises)

  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({
      user_id:          USER_ID,
      title:            demo.title,
      trained_at:       demo.date,
      total_volume_kg:  volume,
      completed_at:     `${demo.date}T12:00:00.000Z`,
      duration_seconds: 3600,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Session insert failed (${demo.date}): ${error.message}`)
  console.log(`  + session created: ${demo.date} "${demo.title}" → ${data.id}`)
  return data.id as string
}

async function upsertSets(sessionId: string, exercises: ExerciseRow[]): Promise<void> {
  // Delete existing sets for this session (idempotent reset)
  await supabase
    .from('workout_sets')
    .delete()
    .eq('session_id', sessionId)

  const rows: object[] = []
  for (const ex of exercises) {
    for (let setNum = 1; setNum <= ex.sets; setNum++) {
      rows.push({
        session_id:    sessionId,
        exercise_name: ex.name,
        muscle_group:  ex.muscle,
        set_number:    setNum,
        weight_kg:     ex.weight_kg,
        reps:          ex.reps,
        is_completed:  true,
      })
    }
  }

  const { error } = await supabase.from('workout_sets').insert(rows)
  if (error) throw new Error(`Sets insert failed (${sessionId}): ${error.message}`)
  console.log(`  + ${rows.length} sets inserted for session ${sessionId}`)
}

async function upsertPhotoLog(sessionId: string, date: string, imagePath: string): Promise<void> {
  const { error } = await supabase
    .from('workout_photo_logs')
    .upsert(
      {
        user_id:            USER_ID,
        workout_session_id: sessionId,
        workout_date:       date,
        image_path:         imagePath,
        updated_at:         new Date().toISOString(),
      },
      { onConflict: 'user_id,workout_session_id' },
    )

  if (error) throw new Error(`Photo log upsert failed (${date}): ${error.message}`)
  console.log(`  + photo log upserted: ${date} → ${imagePath}`)
}

// ── Main ──────────────────────────────────────────────────────────

async function run() {
  console.log('=== REPRA Demo Data Seed ===')
  console.log(`User  : ${USER_ID}`)
  console.log(`Bucket: ${BUCKET}`)
  console.log()

  for (const demo of DEMOS) {
    console.log(`── ${demo.date} "${demo.title}" ──`)

    // 1. Upload image
    const imagePath = await uploadImage(demo.imageFile)

    // 2. Session
    const sessionId = await upsertSession(demo)

    // 3. Sets
    await upsertSets(sessionId, demo.exercises)

    // 4. Photo log
    await upsertPhotoLog(sessionId, demo.date, imagePath)

    console.log()
  }

  console.log('=== Done ===')
}

run().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
