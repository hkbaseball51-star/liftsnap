// Calendar label helpers:
//   inferMuscleGroupFromExerciseName — name-based muscle group fallback
//   getCalendarLabelColor            — label string → hex color
//   CALENDAR_LABEL_LEGEND            — legend sections for the UI

export const CAL_COLORS = {
  push:      '#FF8A3D',
  pull:      '#5EA1FF',
  legs:      '#35E27A',
  full:      '#FF5EAD',
  chest:     '#FF8A3D',
  back:      '#5EA1FF',
  shoulders: '#A878FF',
  arms:      '#FFC247',
  abs:       '#C6FF4A',
} as const

// --- Exercise name → muscle group ----------------------------------------

// Test patterns in order — first match wins.
// Ordering matters: specific keywords must precede overlapping generic ones
// (e.g. "ルーマニアン" before "デッドリフト", "ベンチ" before generic "プレス",
//  "レッグレイズ" checked in abs before ロー could mis-fire in a wrong group).
const EXERCISE_PATTERNS: [RegExp, string][] = [
  // Abs — レッグレイズ is an abs exercise but contains "レッグ"; check FIRST
  // so it doesn't fall into the Legs rule below.
  [/leg raise|レッグレイズ|hanging leg raise|ハンギングレッグレイズ/i, 'abs'],

  // Chest — ベンチ / bench must fire before shoulders/arms catch "press"
  [/bench|ベンチ|incline.*press|インクライン|cable fly|ケーブルフライ|chest press|チェストプレス|pec|ペックフライ|ペックデック/i, 'chest'],

  // Legs — ルーマニアン must fire before back catches "deadlift"
  [/romanian|rdl|ルーマニアン|squat|スクワット|leg press|レッグプレス|leg curl|レッグカール|leg extension|レッグエクステンション|calf|カーフ|lunge|ランジ|hack squat|ハックスクワット|カーフレイズ/i, 'legs'],

  // Back — ロー (row) kept last in this group to avoid accidental partial matches
  [/deadlift|デッドリフト|lat pulldown|ラットプルダウン|ラットプル|seated row|シーテッドロウ|one.?arm row|ワンアームロウ|chin.?up|チンアップ|チンニング|懸垂|pull.?up|プルアップ|pulldown|プルダウン|t.?bar row|cable row|ローイング|ロー/i, 'back'],

  // Shoulders — check before arms catches generic "press"
  [/shoulder press|ショルダープレス|lateral raise|サイドレイズ|ラテラルレイズ|side raise|rear delt|リアデルト|face pull|フェイスプル|front raise|フロントレイズ|overhead press|オーバーヘッド/i, 'shoulders'],

  // Arms — triceps / biceps / curls
  [/tricep|トライセップ|トライセプ|pushdown|プレスダウン|skull crusher|スカルクラッシャー|curl|カール|hammer|ハンマー|dip\b|ディップ/i, 'arms'],

  // Abs — general patterns (レッグレイズ already caught above)
  [/crunch|クランチ|plank|プランク|hanging leg|ハンギング|ab(?:s|dominal)?|アブ|アブローラー|core|コア/i, 'abs'],
]

/** Infer a canonical muscle group string from an exercise name.
 *  Returns null if no pattern matches (consumer should use 'full body' as final fallback). */
export function inferMuscleGroupFromExerciseName(name: string): string | null {
  for (const [re, muscle] of EXERCISE_PATTERNS) {
    if (re.test(name)) return muscle
  }
  return null
}

// --- Label → color --------------------------------------------------------

const LABEL_COLOR_MAP: Record<string, string> = {
  PUS:  CAL_COLORS.push,
  PUL:  CAL_COLORS.pull,
  LEG:  CAL_COLORS.legs,
  FULL: CAL_COLORS.full,
  C:    CAL_COLORS.chest,
  B:    CAL_COLORS.back,
  L:    CAL_COLORS.legs,
  S:    CAL_COLORS.shoulders,
  A:    CAL_COLORS.arms,
  ABS:  CAL_COLORS.abs,
}

export function getCalendarLabelColor(label: string): string {
  return LABEL_COLOR_MAP[label] ?? '#888888'
}

// --- Legend definitions ---------------------------------------------------

// Muted palette for the MUSCLE section of the calendar legend only.
// CAL_COLORS (date cells, Story cards, Share images) is intentionally unchanged.
const LEGEND_MUSCLE_COLORS = {
  chest:     '#E86F2A',
  back:      '#4F8FE8',
  legs:      '#2FC86B',
  shoulders: '#9067E8',
  arms:      '#E8A93A',
  abs:       '#AEE83F',
} as const

export const CALENDAR_LABEL_LEGEND = {
  split: [
    { label: 'PUS',  name: 'PUSH',      color: CAL_COLORS.push },
    { label: 'PUL',  name: 'PULL',      color: CAL_COLORS.pull },
    { label: 'LEG',  name: 'LEGS',      color: CAL_COLORS.legs },
    { label: 'FULL', name: 'FULL BODY', color: CAL_COLORS.full },
  ],
  muscle: [
    { label: 'C',   name: 'CHEST',     color: LEGEND_MUSCLE_COLORS.chest     },
    { label: 'B',   name: 'BACK',      color: LEGEND_MUSCLE_COLORS.back      },
    { label: 'L',   name: 'LEGS',      color: LEGEND_MUSCLE_COLORS.legs      },
    { label: 'S',   name: 'SHOULDERS', color: LEGEND_MUSCLE_COLORS.shoulders },
    { label: 'A',   name: 'ARMS',      color: LEGEND_MUSCLE_COLORS.arms      },
    { label: 'ABS', name: 'ABS',       color: LEGEND_MUSCLE_COLORS.abs       },
  ],
} as const
