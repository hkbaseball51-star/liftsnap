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

export function getTrainingUnlocks(totalSessions: number, maxExerciseLogCount = 0) {
  return TRAINING_MILESTONES.map(m => {
    if (m.id === 'exercise_progress') {
      return {
        ...m,
        unlocked: maxExerciseLogCount >= EXERCISE_PROGRESS_REQUIRED,
        progress: Math.min(maxExerciseLogCount, EXERCISE_PROGRESS_REQUIRED),
      }
    }
    return {
      ...m,
      unlocked: totalSessions >= m.requiredSessions,
      progress: Math.min(totalSessions, m.requiredSessions),
    }
  })
}

export function isTrainingFeatureUnlocked(id: TrainingMilestoneId, totalSessions: number, maxExerciseLogCount = 0): boolean {
  const m = TRAINING_MILESTONES.find(x => x.id === id)
  if (!m) return true
  if (id === 'exercise_progress') return maxExerciseLogCount >= EXERCISE_PROGRESS_REQUIRED
  return totalSessions >= m.requiredSessions
}

// ─── Exercise Graph Share ─────────────────────────────────────
export const EXERCISE_GRAPH_REQUIRED = 10
export const EXERCISE_PROGRESS_REQUIRED = 10

// ─── Chart unlock thresholds ─────────────────────────────────
export const VOLUME_CHART_SESSION_REQUIRED = 3
export const BW_CHART_REQUIRED = 2

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
  { id: 'default', accent: 'dark',   label: 'Default',       requiredShares: 0,  description: 'REPRA standard theme'      },
  { id: 'orange',  accent: 'orange', label: 'Orange',        requiredShares: 3,  description: 'Workout intensity in orange' },
  { id: 'purple',  accent: 'purple', label: 'Purple',        requiredShares: 5,  description: 'Electric purple accent'      },
  { id: 'black',   accent: 'black',  label: 'Stealth Black', requiredShares: 10, description: 'Pure black stealth style'    },
]

export function getShareThemeUnlocks(shareCount: number) {
  return SHARE_THEMES.map(t => ({
    ...t,
    unlocked: shareCount >= t.requiredShares,
  }))
}

// ─── Next Reward ─────────────────────────────────────────────
export type NextRewardResult =
  | { type: 'complete' }
  | { type: 'training';       milestone: TrainingMilestone; current: number }
  | { type: 'exercise_graph'; exerciseName: string;         current: number }
  | { type: 'share_theme';    theme: ShareTheme;            current: number }

export function getNextReward(
  totalSessions: number,
  exerciseLogCounts: { name: string; logCount: number }[],
  shareCount: number,
): NextRewardResult {
  // 1. Training Milestone — highest priority
  const nextMilestone = TRAINING_MILESTONES.find(m => totalSessions < m.requiredSessions)
  if (nextMilestone) {
    return { type: 'training', milestone: nextMilestone, current: totalSessions }
  }

  // 2. Exercise Graph — closest to unlock (highest logCount below required)
  const closest = [...exerciseLogCounts]
    .filter(e => e.logCount < EXERCISE_GRAPH_REQUIRED)
    .sort((a, b) => b.logCount - a.logCount)[0]
  if (closest) {
    return { type: 'exercise_graph', exerciseName: closest.name, current: closest.logCount }
  }

  // 3. Share Theme
  const nextTheme = SHARE_THEMES.find(t => t.requiredShares > 0 && shareCount < t.requiredShares)
  if (nextTheme) {
    return { type: 'share_theme', theme: nextTheme, current: shareCount }
  }

  return { type: 'complete' }
}

// ─── Workout Badges ───────────────────────────────────────────
export type WorkoutBadgeId = 'first_workout' | 'ten_sessions' | 'thirty_sessions'

export type WorkoutBadge = {
  id: WorkoutBadgeId
  label: string
  requiredSessions: number
  description: string
}

export const WORKOUT_BADGES: WorkoutBadge[] = [
  { id: 'first_workout',   label: 'First Workout', requiredSessions: 1,  description: 'Your first rep is in the books'  },
  { id: 'ten_sessions',    label: '10 Sessions',   requiredSessions: 10, description: 'Getting into the groove'         },
  { id: 'thirty_sessions', label: '30 Sessions',   requiredSessions: 30, description: 'One month strong'                },
]

export function getWorkoutBadgeUnlocks(totalSessions: number) {
  return WORKOUT_BADGES.map(b => ({
    ...b,
    unlocked: totalSessions >= b.requiredSessions,
    progress: Math.min(totalSessions, b.requiredSessions),
  }))
}

// ─── Body Log Badges ──────────────────────────────────────────
export type BodyLogBadgeId = 'first_photo' | 'three_photos' | 'seven_photos' | 'fourteen_photos' | 'thirty_photos'

export type BodyLogBadge = {
  id: BodyLogBadgeId
  label: string
  requiredPhotos: number
  description: string
}

export const BODY_LOG_BADGES: BodyLogBadge[] = [
  { id: 'first_photo',     label: '1 Photo',   requiredPhotos: 1,  description: 'Visual progress starts here'   },
  { id: 'three_photos',    label: '3 Photos',  requiredPhotos: 3,  description: 'Building the habit of tracking' },
  { id: 'seven_photos',    label: '7 Photos',  requiredPhotos: 7,  description: 'One week of body check-ins'     },
  { id: 'fourteen_photos', label: '14 Photos', requiredPhotos: 14, description: 'Two weeks of visual data'       },
  { id: 'thirty_photos',   label: '30 Photos', requiredPhotos: 30, description: 'A full month documented'        },
]

export function getBodyLogBadgeUnlocks(photoCount: number) {
  return BODY_LOG_BADGES.map(b => ({
    ...b,
    unlocked: photoCount >= b.requiredPhotos,
    progress: Math.min(photoCount, b.requiredPhotos),
  }))
}

// ─── Consistency Badges ───────────────────────────────────────
export type ConsistencyBadgeId = 'three_days' | 'seven_days' | 'thirty_days'

export type ConsistencyBadge = {
  id: ConsistencyBadgeId
  label: string
  requiredDays: number
  description: string
}

export const CONSISTENCY_BADGES: ConsistencyBadge[] = [
  { id: 'three_days',  label: '3 Workout Days',  requiredDays: 3,  description: '3 different training days logged' },
  { id: 'seven_days',  label: '7 Workout Days',  requiredDays: 7,  description: 'One week of gym visits'           },
  { id: 'thirty_days', label: '30 Workout Days', requiredDays: 30, description: '30 unique training days'          },
]

export function getConsistencyBadgeUnlocks(uniqueWorkoutDays: number) {
  return CONSISTENCY_BADGES.map(b => ({
    ...b,
    unlocked: uniqueWorkoutDays >= b.requiredDays,
    progress: Math.min(uniqueWorkoutDays, b.requiredDays),
  }))
}

// ─── Proof Streak Badges ──────────────────────────────────────
export type ProofStreakBadgeId =
  | 'first_proof_week'
  | 'four_week_streak'
  | 'eight_week_streak'
  | 'twelve_week_streak'

export type ProofStreakBadge = {
  id: ProofStreakBadgeId
  label: string
  requiredStreak: number
  description: string
}

export const PROOF_STREAK_BADGES: ProofStreakBadge[] = [
  { id: 'first_proof_week',   label: 'First Proof Week',    requiredStreak: 1,  description: 'Your first week of consistent effort' },
  { id: 'four_week_streak',   label: '4-Week Proof Streak', requiredStreak: 4,  description: 'One month of consistent proof'         },
  { id: 'eight_week_streak',  label: '8-Week Proof Streak', requiredStreak: 8,  description: 'Changes are starting to show'          },
  { id: 'twelve_week_streak', label: '12-Week Proof Streak',requiredStreak: 12, description: 'A real habit has formed'               },
]

export function getProofStreakBadgeUnlocks(bestProofStreak: number) {
  return PROOF_STREAK_BADGES.map(b => ({
    ...b,
    unlocked: bestProofStreak >= b.requiredStreak,
    progress: Math.min(bestProofStreak, b.requiredStreak),
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
