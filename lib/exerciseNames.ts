import type { Locale } from './i18n'

// Japanese canonical name → English display name.
// Covers all system preset exercises (defaultExercises.ts) plus
// common user-entered variants and aliases.
export const JA_TO_EN: Record<string, string> = {
  // ── CHEST ────────────────────────────────────────────────────────────
  'ベンチプレス':                               'Bench Press',
  'インクラインベンチプレス':                   'Incline Bench Press',
  'ダンベルプレス':                             'Dumbbell Press',
  'ダンベルベンチプレス':                       'Dumbbell Bench Press',
  'インクラインダンベルプレス':                 'Incline Dumbbell Press',
  'フラットダンベルプレス':                     'Flat Dumbbell Press',
  'ダンベルフライ':                             'Dumbbell Fly',
  'チェストフライ':                             'Chest Fly',
  'ケーブルフライ':                             'Cable Fly',
  'ケーブルクロスオーバー':                     'Cable Crossover',
  'チェストプレス':                             'Chest Press',
  'ペックフライ':                               'Pec Fly',
  'ペックデック':                               'Pec Deck',
  'プッシュアップ':                             'Push Up',
  'ディップス':                                 'Dips',
  // ── BACK ─────────────────────────────────────────────────────────────
  'デッドリフト':                               'Deadlift',
  'ラットプルダウン':                           'Lat Pulldown',
  'チンニング':                                 'Chin Up',
  'チンアップ':                                 'Chin Up',
  '懸垂':                                       'Pull Up',
  'プルアップ':                                 'Pull Up',
  'ベントオーバーロウ':                         'Bent Over Row',
  'ベントオーバーロー':                         'Bent Over Row',
  'バーベルロウ':                               'Barbell Row',
  'ダンベルロウ':                               'Dumbbell Row',
  'ワンハンドロウ':                             'One Arm Dumbbell Row',
  'Tバーロウ':                                  'T-Bar Row',
  'シーテッドロウ':                             'Seated Row',
  'ケーブルロウ':                               'Cable Row',
  'シュラッグ':                                 'Shrug',
  'グッドモーニング':                           'Good Morning',
  // ── SHOULDERS ────────────────────────────────────────────────────────
  'ショルダープレス':                           'Shoulder Press',
  'ミリタリープレス':                           'Military Press',
  'オーバーヘッドプレス':                       'Overhead Press',
  'ダンベルショルダープレス':                   'Dumbbell Shoulder Press',
  'アーノルドプレス':                           'Arnold Press',
  'サイドレイズ':                               'Side Raise',
  'フロントレイズ':                             'Front Raise',
  'リアレイズ':                                 'Rear Raise',
  'リアデルトフライ':                           'Rear Delt Fly',
  'アップライトロウ':                           'Upright Row',
  'フェイスプル':                               'Face Pull',
  // ── BICEPS ───────────────────────────────────────────────────────────
  'バーベルカール':                             'Barbell Curl',
  'ダンベルカール':                             'Dumbbell Curl',
  'ハンマーカール':                             'Hammer Curl',
  'インクラインダンベルカール':                 'Incline Dumbbell Curl',
  'インクラインカール':                         'Incline Curl',
  'プリーチャーカール':                         'Preacher Curl',
  'ケーブルカール':                             'Cable Curl',
  'アームカール':                               'Arm Curl',
  // ── TRICEPS ──────────────────────────────────────────────────────────
  'トライセップスプレスダウン':                 'Triceps Pushdown',
  'トライセプスプッシュダウン':                 'Triceps Pushdown',
  'トライセプスエクステンション':               'Triceps Extension',
  'プッシュダウン':                             'Pushdown',
  'スカルクラッシャー':                         'Skull Crusher',
  'フレンチプレス':                             'French Press',
  'ナローベンチプレス':                         'Close Grip Bench Press',
  'オーバーヘッドトライセップスエクステンション': 'Overhead Triceps Extension',
  // ── FOREARMS ─────────────────────────────────────────────────────────
  'リストカール':                               'Wrist Curl',
  // ── QUADS ────────────────────────────────────────────────────────────
  'スクワット':                                 'Squat',
  'バーベルスクワット':                         'Barbell Squat',
  'フロントスクワット':                         'Front Squat',
  'レッグプレス':                               'Leg Press',
  'レッグエクステンション':                     'Leg Extension',
  'ブルガリアンスクワット':                     'Bulgarian Split Squat',
  'ランジ':                                     'Lunge',
  'ステップアップ':                             'Step Up',
  // ── HAMSTRINGS ───────────────────────────────────────────────────────
  'レッグカール':                               'Leg Curl',
  'ルーマニアンデッドリフト':                   'Romanian Deadlift',
  // ── GLUTES ───────────────────────────────────────────────────────────
  'ヒップスラスト':                             'Hip Thrust',
  // ── CALVES ───────────────────────────────────────────────────────────
  'カーフレイズ':                               'Calf Raise',
  // ── ABS ──────────────────────────────────────────────────────────────
  'クランチ':                                   'Crunch',
  'シットアップ':                               'Sit Up',
  'レッグレイズ':                               'Leg Raise',
  'アブローラー':                               'Ab Roller',
  'プランク':                                   'Plank',
  'ケーブルクランチ':                           'Cable Crunch',
  'ロシアンツイスト':                           'Russian Twist',
  // ── OTHER / CARDIO ───────────────────────────────────────────────────
  '有酸素':                                     'Cardio',
  'ランニング':                                 'Running',
  'ウォーキング':                               'Walking',
}

export function getDisplayName(name: string, locale: Locale): string {
  if (locale !== 'en') return name
  return JA_TO_EN[name] ?? name
}
