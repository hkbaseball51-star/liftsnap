/**
 * Proof Streak — weekly consistency metric for REPRA.
 *
 * A week (identified by its Monday) is a "Proof Week" if the user:
 *   - Completed ≥ 2 workout sessions, OR
 *   - Uploaded ≥ 1 body photo
 *
 * TODO: Also count weeks where the user exported ≥ 1 Share Story once
 *       story export dates are persisted in the database.
 *
 * Deliberate choice: weeks, not days — rest days are required for training.
 */

export function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function subtractWeek(mondayStr: string): string {
  const d = new Date(mondayStr + 'T00:00:00')
  d.setDate(d.getDate() - 7)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function buildProofWeekSet(workoutDates: string[], photoDates: string[]): Set<string> {
  const workoutsByWeek = new Map<string, number>()
  for (const d of workoutDates) {
    const w = getMondayOfWeek(d)
    workoutsByWeek.set(w, (workoutsByWeek.get(w) ?? 0) + 1)
  }

  const photosByWeek = new Map<string, number>()
  for (const d of photoDates) {
    const w = getMondayOfWeek(d)
    photosByWeek.set(w, (photosByWeek.get(w) ?? 0) + 1)
  }

  const proofWeeks = new Set<string>()
  const allWeeks = new Set([...workoutsByWeek.keys(), ...photosByWeek.keys()])
  for (const w of allWeeks) {
    if ((workoutsByWeek.get(w) ?? 0) >= 2 || (photosByWeek.get(w) ?? 0) >= 1) {
      proofWeeks.add(w)
    }
  }
  return proofWeeks
}

export function calcProofStreak(
  workoutDates: string[],
  photoDates: string[],
  todayStr: string,
): { streak: number; thisWeekDone: boolean } {
  const proofWeeks = buildProofWeekSet(workoutDates, photoDates)
  if (proofWeeks.size === 0) return { streak: 0, thisWeekDone: false }

  const thisMonday = getMondayOfWeek(todayStr)
  const thisWeekDone = proofWeeks.has(thisMonday)
  let streak = 0
  let cur = thisWeekDone ? thisMonday : subtractWeek(thisMonday)
  while (proofWeeks.has(cur)) {
    streak++
    cur = subtractWeek(cur)
  }
  return { streak, thisWeekDone }
}

export function calcBestProofStreak(workoutDates: string[], photoDates: string[]): number {
  const proofWeeks = buildProofWeekSet(workoutDates, photoDates)
  if (proofWeeks.size === 0) return 0
  const sorted = [...proofWeeks].sort()
  let best = 1, cur = 1
  for (let i = 1; i < sorted.length; i++) {
    const diffDays = Math.round(
      (new Date(sorted[i] + 'T00:00:00').getTime() - new Date(sorted[i - 1] + 'T00:00:00').getTime())
      / 86_400_000
    )
    if (diffDays === 7) { cur++; if (cur > best) best = cur }
    else cur = 1
  }
  return best
}
