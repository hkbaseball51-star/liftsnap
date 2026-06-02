/**
 * seed-demo-photos.ts
 *
 * Re-registers body-progress demo photos for two target users.
 * Safe to run multiple times — fully idempotent.
 *
 * Run: npx tsx scripts/seed-demo-photos.ts
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// ── Config ────────────────────────────────────────────────────────

const SUPABASE_URL     = 'https://obdceykzebheplnjszox.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iZGNleWt6ZWJoZXBsbmpzem94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg2MTI2NSwiZXhwIjoyMDk1NDM3MjY1fQ.VgXfaD5wKJtEOSAeOMrP15LhYT1Xitik3xswFugOuuw'
const BUCKET           = 'workout-photos'
const ASSETS_DIR       = path.join(process.cwd(), 'assets', 'images')

const TARGET_USERS = [
  '2322e1d9-567d-4f4f-913a-1accac66b5eb',
  '7bfae6d3-4036-43cd-9811-50d8f766526a',
]

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Types ─────────────────────────────────────────────────────────

type ExerciseRow = {
  name:      string
  muscle:    string
  weight_kg: number
  reps:      number
  sets:      number
}

type DemoSession = {
  date:      string   // YYYY-MM-DD
  title:     string
  imageFile: string
  exercises: ExerciseRow[]
}

// ── Demo data ─────────────────────────────────────────────────────

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

// ── Steps (per user) ──────────────────────────────────────────────

async function uploadImage(userId: string, filename: string): Promise<string> {
  const localPath  = path.join(ASSETS_DIR, filename)
  const remotePath = `${userId}/${filename}`

  if (!fs.existsSync(localPath)) {
    throw new Error(`Image not found: ${localPath}`)
  }

  const buffer = fs.readFileSync(localPath)

  // upsert:true overwrites if exists — safe for re-runs
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(remotePath, buffer, { contentType: 'image/png', upsert: true })

  if (error) throw new Error(`Storage upload failed (${remotePath}): ${error.message}`)
  console.log(`    ↑ uploaded: ${remotePath}`)
  return remotePath
}

async function upsertSession(userId: string, demo: DemoSession): Promise<string> {
  // Priority 1: same title on same date (was created by this script before)
  const { data: byTitle } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('trained_at', demo.date)
    .eq('title', demo.title)
    .maybeSingle()

  if (byTitle) {
    console.log(`    ✓ session (by title): "${demo.title}" → ${byTitle.id}`)
    return byTitle.id as string
  }

  // Priority 2: any completed session on that date
  const { data: byDate } = await supabase
    .from('workout_sessions')
    .select('id, title')
    .eq('user_id', userId)
    .eq('trained_at', demo.date)
    .not('completed_at', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (byDate) {
    console.log(`    ✓ session (by date, title="${byDate.title}"): → ${byDate.id}`)
    return byDate.id as string
  }

  // Priority 3: any session on that date (even incomplete)
  const { data: anySession } = await supabase
    .from('workout_sessions')
    .select('id, title')
    .eq('user_id', userId)
    .eq('trained_at', demo.date)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (anySession) {
    console.log(`    ✓ session (any, title="${anySession.title}"): → ${anySession.id}`)
    return anySession.id as string
  }

  // No session found — create one
  const volume = computeVolume(demo.exercises)

  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({
      user_id:          userId,
      title:            demo.title,
      trained_at:       demo.date,
      total_volume_kg:  volume,
      completed_at:     `${demo.date}T12:00:00.000Z`,
      duration_seconds: 3600,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Session insert failed (${demo.date}): ${error.message}`)
  console.log(`    + session created: "${demo.title}" → ${data.id}`)
  return data.id as string
}

async function upsertSets(sessionId: string, exercises: ExerciseRow[]): Promise<void> {
  // Skip if sets already exist — preserves real user data
  const { count } = await supabase
    .from('workout_sets')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)

  if (count && count > 0) {
    console.log(`    ✓ ${count} sets already exist, skipping`)
    return
  }

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
  console.log(`    + ${rows.length} sets inserted`)
}

async function upsertPhotoLog(
  userId:    string,
  sessionId: string,
  date:      string,
  imagePath: string,
): Promise<void> {
  // Try with thumbnail_path; if migration 008 not yet applied, omit it
  const payload: Record<string, unknown> = {
    user_id:            userId,
    workout_session_id: sessionId,
    workout_date:       date,
    image_path:         imagePath,
    thumbnail_path:     imagePath,   // same path — sufficient for display
    updated_at:         new Date().toISOString(),
  }

  let { error } = await supabase
    .from('workout_photo_logs')
    .upsert(payload, { onConflict: 'user_id,workout_session_id' })

  if (error?.code === '42703' || error?.code === 'PGRST204') {
    // thumbnail_path column doesn't exist yet (migration 008 pending)
    const { thumbnail_path: _omit, ...payloadNoThumb } = payload
    void _omit
    const res2 = await supabase
      .from('workout_photo_logs')
      .upsert(payloadNoThumb, { onConflict: 'user_id,workout_session_id' })
    error = res2.error
  }

  if (error) throw new Error(`Photo log upsert failed (${date}): ${error.message}`)
  console.log(`    + photo log upserted: ${date} → ${imagePath}`)
}

// ── Verify ────────────────────────────────────────────────────────

async function verifyUser(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('workout_photo_logs')
    .select('workout_date, image_path, workout_session_id')
    .eq('user_id', userId)
    .in('workout_date', DEMOS.map(d => d.date))
    .order('workout_date', { ascending: true })

  if (error) {
    console.log(`  ✗ verify failed: ${error.message}`)
    return
  }

  console.log(`  Photo log records (${data?.length ?? 0} found):`)
  for (const row of (data ?? [])) {
    console.log(`    ${row.workout_date}  session=${row.workout_session_id}  path=${row.image_path}`)
  }
}

// ── Main ──────────────────────────────────────────────────────────

async function run() {
  console.log('=== REPRA Demo Photos Seed ===')
  console.log(`Bucket: ${BUCKET}`)
  console.log(`Users : ${TARGET_USERS.join('\n         ')}`)
  console.log()

  for (const userId of TARGET_USERS) {
    console.log(`\n━━ User: ${userId} ━━\n`)

    for (const demo of DEMOS) {
      console.log(`  ── ${demo.date} "${demo.title}"`)

      const imagePath = await uploadImage(userId, demo.imageFile)
      const sessionId = await upsertSession(userId, demo)
      await upsertSets(sessionId, demo.exercises)
      await upsertPhotoLog(userId, sessionId, demo.date, imagePath)
      console.log()
    }

    console.log(`  ── Verify ──`)
    await verifyUser(userId)
  }

  console.log('\n=== Done ===')
}

run().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
