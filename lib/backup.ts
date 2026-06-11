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
  for (const [key, value] of Object.entries(data)) {
    if (isExcluded(key)) continue
    if (value === null || value === undefined) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, String(value))
    }
  }
}
