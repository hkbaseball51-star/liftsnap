// ─── Training Milestones ─────────────────────────────────────
export type TrainingMilestoneId =
  | 'calendar'
  | 'weekly_summary'
  | 'basic_chart'
  | 'exercise_progress'
  | 'weekly_comparison'
  | 'advanced_stats'
  | 'yearly_report'

export type TrainingMilestone = {
  id: TrainingMilestoneId
  label: string
  requiredSessions: number
  description: string
}

export const TRAINING_MILESTONES: TrainingMilestone[] = [
  { id: 'calendar',          label: 'Calendar Log',      requiredSessions: 1,   description: 'Track your training history'      },
  { id: 'weekly_summary',    label: 'Weekly Summary',     requiredSessions: 3,   description: 'See your weekly training overview' },
  { id: 'basic_chart',       label: 'Basic Line Chart',   requiredSessions: 5,   description: 'Visualize your progress'           },
  { id: 'exercise_progress', label: 'Exercise Progress',  requiredSessions: 10,  description: 'Deep dive per exercise'            },
  { id: 'weekly_comparison', label: 'Weekly Comparison',  requiredSessions: 20,  description: 'Compare training weeks'            },
  { id: 'advanced_stats',    label: 'Advanced Stats',     requiredSessions: 50,  description: 'Detailed analytics preview'        },
  { id: 'yearly_report',     label: 'Yearly Report',      requiredSessions: 100, description: 'Your annual training summary'      },
]

export function getTrainingUnlocks(totalSessions: number) {
  return TRAINING_MILESTONES.map(m => ({
    ...m,
    unlocked: totalSessions >= m.requiredSessions,
    progress: Math.min(totalSessions, m.requiredSessions),
  }))
}

export function isTrainingFeatureUnlocked(id: TrainingMilestoneId, totalSessions: number): boolean {
  const m = TRAINING_MILESTONES.find(x => x.id === id)
  return m ? totalSessions >= m.requiredSessions : true
}

// ─── Exercise Graph Share ─────────────────────────────────────
export const EXERCISE_GRAPH_REQUIRED = 10

export type ExerciseGraphProgress = {
  unlocked: boolean
  current: number
  required: number
  remaining: number
}

export function getExerciseGraphProgress(logCount: number): ExerciseGraphProgress {
  return {
    unlocked: logCount >= EXERCISE_GRAPH_REQUIRED,
    current: logCount,
    required: EXERCISE_GRAPH_REQUIRED,
    remaining: Math.max(EXERCISE_GRAPH_REQUIRED - logCount, 0),
  }
}

// ─── Share Theme Milestones ───────────────────────────────────
export type ShareAccent = 'dark' | 'orange' | 'purple' | 'black'

export type ShareTheme = {
  id: string
  accent: ShareAccent
  label: string
  requiredShares: number
  description: string
}

export const SHARE_THEMES: ShareTheme[] = [
  { id: 'default', accent: 'dark',   label: 'Default',       requiredShares: 0,  description: 'Clean monochrome style'   },
  { id: 'orange',  accent: 'orange', label: 'Orange',        requiredShares: 3,  description: 'LIFTSNAP orange accent'   },
  { id: 'purple',  accent: 'purple', label: 'Purple',        requiredShares: 5,  description: 'Electric purple accent'   },
  { id: 'black',   accent: 'black',  label: 'Minimal Black', requiredShares: 10, description: 'Pure black minimal style' },
]

export function getShareThemeUnlocks(shareCount: number) {
  return SHARE_THEMES.map(t => ({
    ...t,
    unlocked: shareCount >= t.requiredShares,
  }))
}

// ─── Share count — localStorage (client-only) ─────────────────
const SHARE_COUNT_KEY = 'liftsnap_share_count'

export function getShareCount(): number {
  if (typeof window === 'undefined') return 0
  return parseInt(localStorage.getItem(SHARE_COUNT_KEY) ?? '0', 10) || 0
}

export function incrementShareCount(): number {
  if (typeof window === 'undefined') return 0
  const next = getShareCount() + 1
  localStorage.setItem(SHARE_COUNT_KEY, String(next))
  return next
}
