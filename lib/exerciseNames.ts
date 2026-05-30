import type { Locale } from './i18n'

// Japanese canonical name → English display name for system preset exercises
export const JA_TO_EN: Record<string, string> = {
  // CHEST
  'ベンチプレス':               'Bench Press',
  'インクラインベンチプレス':   'Incline Bench Press',
  'ダンベルフライ':              'Dumbbell Fly',
  'ケーブルフライ':              'Cable Fly',
  'ディップス':                  'Dips',
  // BACK
  'デッドリフト':                'Deadlift',
  'ラットプルダウン':            'Lat Pulldown',
  'ベントオーバーロウ':          'Bent Over Row',
  'シーテッドロウ':              'Seated Row',
  'チンニング':                  'Pull Up',
  // SHOULDERS
  'ショルダープレス':            'Shoulder Press',
  'ダンベルショルダープレス':   'Dumbbell Shoulder Press',
  'サイドレイズ':                'Side Raise',
  'フロントレイズ':              'Front Raise',
  'リアデルトフライ':            'Rear Delt Fly',
  // BICEPS
  'バーベルカール':              'Barbell Curl',
  'ダンベルカール':              'Dumbbell Curl',
  'ハンマーカール':              'Hammer Curl',
  'インクラインダンベルカール': 'Incline Dumbbell Curl',
  // TRICEPS
  'トライセップスプレスダウン': 'Triceps Pushdown',
  'スカルクラッシャー':          'Skull Crusher',
  'オーバーヘッドトライセップスエクステンション': 'Overhead Triceps Extension',
  // FOREARMS
  'リストカール':                'Wrist Curl',
  // QUADS
  'スクワット':                  'Squat',
  'レッグプレス':                'Leg Press',
  'レッグエクステンション':      'Leg Extension',
  'ブルガリアンスクワット':      'Bulgarian Split Squat',
  // HAMSTRINGS
  'レッグカール':                'Leg Curl',
  'ルーマニアンデッドリフト':   'Romanian Deadlift',
  // GLUTES
  'ヒップスラスト':              'Hip Thrust',
  // CALVES
  'カーフレイズ':                'Calf Raise',
  // ABS
  'クランチ':                    'Crunch',
  'レッグレイズ':                'Leg Raise',
  'プランク':                    'Plank',
  'アブローラー':                'Ab Roller',
}

export function getDisplayName(name: string, locale: Locale): string {
  if (locale !== 'en') return name
  return JA_TO_EN[name] ?? name
}
