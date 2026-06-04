import type { LocalExercise } from './localDB'

export const DEFAULT_EXERCISES: LocalExercise[] = [
  // CHEST
  { id: 'sys_bench',    name: 'ベンチプレス',             muscle_group: 'Chest',      equipment: 'barbell',  is_custom: false },
  { id: 'sys_incbench', name: 'インクラインベンチプレス', muscle_group: 'Chest',      equipment: 'barbell',  is_custom: false },
  { id: 'sys_dbfly',    name: 'ダンベルフライ',            muscle_group: 'Chest',      equipment: 'dumbbell', is_custom: false },
  { id: 'sys_cablefly', name: 'ケーブルフライ',            muscle_group: 'Chest',      equipment: 'cable',    is_custom: false },
  { id: 'sys_dips',     name: 'ディップス',                muscle_group: 'Chest',      equipment: 'bodyweight', is_custom: false },
  // BACK
  { id: 'sys_deadlift', name: 'デッドリフト',              muscle_group: 'Back',       equipment: 'barbell',  is_custom: false },
  { id: 'sys_latpull',  name: 'ラットプルダウン',          muscle_group: 'Back',       equipment: 'cable',    is_custom: false },
  { id: 'sys_bor',      name: 'ベントオーバーロウ',        muscle_group: 'Back',       equipment: 'barbell',  is_custom: false },
  { id: 'sys_seatedrow',name: 'シーテッドロウ',            muscle_group: 'Back',       equipment: 'cable',    is_custom: false },
  { id: 'sys_pullup',   name: 'チンニング',                muscle_group: 'Back',       equipment: 'bodyweight', is_custom: false },
  // SHOULDERS
  { id: 'sys_ohp',      name: 'ショルダープレス',          muscle_group: 'Shoulders',  equipment: 'barbell',  is_custom: false },
  { id: 'sys_dbohp',    name: 'ダンベルショルダープレス',  muscle_group: 'Shoulders',  equipment: 'dumbbell', is_custom: false },
  { id: 'sys_sideraise',name: 'サイドレイズ',              muscle_group: 'Shoulders',  equipment: 'dumbbell', is_custom: false },
  { id: 'sys_frontraise',name: 'フロントレイズ',           muscle_group: 'Shoulders',  equipment: 'dumbbell', is_custom: false },
  { id: 'sys_rearfly',  name: 'リアデルトフライ',          muscle_group: 'Shoulders',  equipment: 'dumbbell', is_custom: false },
  // BICEPS
  { id: 'sys_bbcurl',   name: 'バーベルカール',            muscle_group: 'Biceps',     equipment: 'barbell',  is_custom: false },
  { id: 'sys_dbcurl',   name: 'ダンベルカール',            muscle_group: 'Biceps',     equipment: 'dumbbell', is_custom: false },
  { id: 'sys_hammer',   name: 'ハンマーカール',            muscle_group: 'Biceps',     equipment: 'dumbbell', is_custom: false },
  { id: 'sys_inccurl',  name: 'インクラインダンベルカール', muscle_group: 'Biceps',    equipment: 'dumbbell', is_custom: false },
  // TRICEPS
  { id: 'sys_pushdown', name: 'トライセップスプレスダウン', muscle_group: 'Triceps',   equipment: 'cable',    is_custom: false },
  { id: 'sys_skull',    name: 'スカルクラッシャー',        muscle_group: 'Triceps',    equipment: 'barbell',  is_custom: false },
  { id: 'sys_ohtri',    name: 'オーバーヘッドトライセップスエクステンション', muscle_group: 'Triceps', equipment: 'dumbbell', is_custom: false },
  // FOREARMS
  { id: 'sys_wristcurl',name: 'リストカール',              muscle_group: 'Forearms',   equipment: 'dumbbell', is_custom: false },
  // QUADS
  { id: 'sys_squat',    name: 'スクワット',                muscle_group: 'Quads',      equipment: 'barbell',  is_custom: false },
  { id: 'sys_legpress', name: 'レッグプレス',              muscle_group: 'Quads',      equipment: 'machine',  is_custom: false },
  { id: 'sys_legext',   name: 'レッグエクステンション',    muscle_group: 'Quads',      equipment: 'machine',  is_custom: false },
  { id: 'sys_bss',      name: 'ブルガリアンスクワット',    muscle_group: 'Quads',      equipment: 'dumbbell', is_custom: false },
  // HAMSTRINGS
  { id: 'sys_legcurl',  name: 'レッグカール',              muscle_group: 'Hamstrings', equipment: 'machine',  is_custom: false },
  { id: 'sys_rdl',      name: 'ルーマニアンデッドリフト',  muscle_group: 'Hamstrings', equipment: 'barbell',  is_custom: false },
  // GLUTES
  { id: 'sys_hipthrust',name: 'ヒップスラスト',            muscle_group: 'Glutes',     equipment: 'barbell',  is_custom: false },
  // CALVES
  { id: 'sys_calf',     name: 'カーフレイズ',              muscle_group: 'Calves',     equipment: 'machine',  is_custom: false },
  // ABS
  { id: 'sys_crunch',   name: 'クランチ',                  muscle_group: 'Abs',        equipment: 'bodyweight', is_custom: false },
  { id: 'sys_legraise', name: 'レッグレイズ',              muscle_group: 'Abs',        equipment: 'bodyweight', is_custom: false },
  { id: 'sys_plank',    name: 'プランク',                  muscle_group: 'Abs',        equipment: 'bodyweight', is_custom: false },
  { id: 'sys_abroller', name: 'アブローラー',              muscle_group: 'Abs',        equipment: 'other',    is_custom: false },
]
