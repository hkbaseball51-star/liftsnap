import {
  normalizeSession,
  normalizeSet,
  normalizeExercise,
  normalizeBodyWeight,
  nowIso,
} from '@/lib/localDB'

const BACKUP_KEYS = [
  'repra_sessions',
  'repra_sets',
  'repra_custom_exercises',
  'repra_body_weights',
  'repra_locale',
  'repra_units',
  'repra_onboarding_completed',
  'repra_terms_accepted',
  'repra_terms_accepted_at',
] as const

// The 4 data collections that require timestamp normalization on import
const DATA_KEYS = {
  sessions:        'repra_sessions',
  sets:            'repra_sets',
  customExercises: 'repra_custom_exercises',
  bodyWeights:     'repra_body_weights',
} as const

// Must match the gate keys in lib/localDB.ts
const MIGRATION_V2_KEY = 'repra_db_v2'
const MIGRATION_V3_KEY = 'repra_db_v3_bw_id'

const EXCLUDED_PATTERNS = [
  'access_token',
  'refresh_token',
  'token',
  'Cookie',
  'api_key',
  'icloud',
  'cloudkit',
  'supabase',
]

function isExcluded(key: string): boolean {
  const lower = key.toLowerCase()
  return EXCLUDED_PATTERNS.some(p => lower.includes(p))
}

export interface BackupPayload {
  app: 'repra'
  type: 'backup'
  version: 1
  exported_at: string
  schema: string[]
  data: Record<string, string | null>
}

export function exportBackup(): void {
  const data: Record<string, string | null> = {}
  for (const key of BACKUP_KEYS) {
    if (!isExcluded(key)) {
      data[key] = localStorage.getItem(key)
    }
  }

  const payload: BackupPayload = {
    app: 'repra',
    type: 'backup',
    version: 1,
    exported_at: new Date().toISOString(),
    schema: BACKUP_KEYS.filter(k => !isExcluded(k)),
    data,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const date = new Date().toISOString().slice(0, 10)
  const a = document.createElement('a')
  a.href = url
  a.download = `repra-backup-${date}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Normalize and write one of the 4 data collections.
// Returns true on success; false if the value was malformed (caller falls back to raw write).
function writeNormalizedCollection(
  key: string,
  value: string,
  sessionCreatedAt: Map<string, string>,
): boolean {
  try {
    const raw = JSON.parse(value) as Record<string, unknown>[]
    if (!Array.isArray(raw)) return false

    let normalized: unknown[]

    if (key === DATA_KEYS.sessions) {
      normalized = raw.map(normalizeSession)
    } else if (key === DATA_KEYS.sets) {
      normalized = raw.map(s =>
        normalizeSet(s, sessionCreatedAt.get(s.session_id as string) ?? nowIso()),
      )
    } else if (key === DATA_KEYS.customExercises) {
      normalized = raw.map(normalizeExercise)
    } else if (key === DATA_KEYS.bodyWeights) {
      normalized = raw.map(normalizeBodyWeight)
    } else {
      return false
    }

    localStorage.setItem(key, JSON.stringify(normalized))
    return true
  } catch {
    return false
  }
}

// Build a session-id → created_at map from the backup's sessions value.
// Used so set normalization can inherit the session's created_at.
function buildSessionCreatedAtMap(sessionsValue: string | null | undefined): Map<string, string> {
  const map = new Map<string, string>()
  if (!sessionsValue) return map
  try {
    const raw = JSON.parse(sessionsValue) as Record<string, unknown>[]
    if (!Array.isArray(raw)) return map
    for (const s of raw) {
      const norm = normalizeSession(s)
      if (norm.id && norm.created_at) map.set(norm.id, norm.created_at)
    }
  } catch { /* ignore */ }
  return map
}

export async function importBackup(file: File): Promise<void> {
  const text = await file.text()
  let payload: unknown
  try {
    payload = JSON.parse(text)
  } catch {
    throw new Error('invalid_json')
  }

  if (
    typeof payload !== 'object' ||
    payload === null ||
    (payload as Record<string, unknown>).app !== 'repra' ||
    (payload as Record<string, unknown>).type !== 'backup' ||
    typeof (payload as Record<string, unknown>).data !== 'object'
  ) {
    throw new Error('invalid_format')
  }

  const { data } = payload as BackupPayload

  // Pre-build session created_at map so sets can inherit the right fallback
  const sessionCreatedAt = buildSessionCreatedAtMap(data[DATA_KEYS.sessions])

  const dataKeySet = new Set<string>(Object.values(DATA_KEYS))

  for (const [key, value] of Object.entries(data)) {
    if (isExcluded(key)) continue

    if (value === null || value === undefined) {
      localStorage.removeItem(key)
      continue
    }

    // For the 4 data collections: normalize timestamps before writing.
    // Falls back to raw write if normalization fails (malformed JSON etc.).
    if (dataKeySet.has(key)) {
      const ok = writeNormalizedCollection(key, String(value), sessionCreatedAt)
      if (ok) continue
    }

    localStorage.setItem(key, String(value))
  }

  // Safety net: clear migration gate keys so all startup migrations re-run on
  // next app load. Catches any edge case where normalization above was skipped.
  localStorage.removeItem(MIGRATION_V2_KEY)
  localStorage.removeItem(MIGRATION_V3_KEY)
}
