/**
 * Cleanup script — delete all workout photo data from DB and Storage.
 *
 * Dry-run by default. Set DRY_RUN=false to actually delete.
 *
 * Run:
 *   npx tsx scripts/cleanup-photo-data.ts            # dry-run (count only)
 *   DRY_RUN=false npx tsx scripts/cleanup-photo-data.ts  # actually delete
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = 'https://obdceykzebheplnjszox.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iZGNleWt6ZWJoZXBsbmpzem94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg2MTI2NSwiZXhwIjoyMDk1NDM3MjY1fQ.VgXfaD5wKJtEOSAeOMrP15LhYT1Xitik3xswFugOuuw'
const BUCKET           = 'workout-photos'
const DRY_RUN          = process.env.DRY_RUN !== 'false'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function main() {
  console.log(`\n=== REPRA Photo Cleanup ===`)
  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (count only)' : 'LIVE DELETE'}\n`)

  // ── 1. Count DB records ──────────────────────────────────────────
  const { count: dbCount, error: countErr } = await supabase
    .from('workout_photo_logs')
    .select('*', { count: 'exact', head: true })

  if (countErr) {
    console.error('Error counting workout_photo_logs:', countErr.message)
  } else {
    console.log(`workout_photo_logs: ${dbCount ?? 0} records`)
  }

  // ── 2. List Storage files ────────────────────────────────────────
  let allFiles: string[] = []
  let offset = 0
  const PAGE = 100

  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list('', { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } })

    if (error) {
      console.error('Error listing storage root:', error.message)
      break
    }
    if (!data || data.length === 0) break

    // Root level may contain user-ID folders; recurse one level
    for (const item of data) {
      if (item.metadata === null) {
        // It's a folder — list contents
        let folderOffset = 0
        while (true) {
          const { data: files, error: fErr } = await supabase.storage
            .from(BUCKET)
            .list(item.name, { limit: PAGE, offset: folderOffset })
          if (fErr || !files || files.length === 0) break
          for (const f of files) {
            if (f.metadata !== null) allFiles.push(`${item.name}/${f.name}`)
          }
          if (files.length < PAGE) break
          folderOffset += PAGE
        }
      } else {
        allFiles.push(item.name)
      }
    }

    if (data.length < PAGE) break
    offset += PAGE
  }

  console.log(`${BUCKET} storage: ${allFiles.length} files`)
  if (allFiles.length > 0 && DRY_RUN) {
    console.log('  (first 5 paths:', allFiles.slice(0, 5).join(', '), ')')
  }

  if (DRY_RUN) {
    console.log(`\nDry-run complete. No data deleted.`)
    console.log(`To delete, run: DRY_RUN=false npx tsx scripts/cleanup-photo-data.ts`)
    return
  }

  // ── 3. Delete DB records ─────────────────────────────────────────
  console.log('\nDeleting workout_photo_logs...')
  const { error: delDbErr } = await supabase
    .from('workout_photo_logs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // delete all

  if (delDbErr) {
    console.error('Error deleting DB records:', delDbErr.message)
  } else {
    console.log(`  Deleted ${dbCount ?? '?'} records from workout_photo_logs`)
  }

  // ── 4. Delete Storage files ──────────────────────────────────────
  if (allFiles.length > 0) {
    console.log(`Deleting ${allFiles.length} files from ${BUCKET}...`)
    const BATCH = 100
    let deleted = 0
    for (let i = 0; i < allFiles.length; i += BATCH) {
      const batch = allFiles.slice(i, i + BATCH)
      const { error: delStorErr } = await supabase.storage.from(BUCKET).remove(batch)
      if (delStorErr) {
        console.error(`  Error deleting batch ${i / BATCH + 1}:`, delStorErr.message)
      } else {
        deleted += batch.length
      }
    }
    console.log(`  Deleted ${deleted} / ${allFiles.length} files from ${BUCKET}`)
  }

  console.log('\nCleanup complete.')
}

main().catch(err => { console.error(err); process.exit(1) })
