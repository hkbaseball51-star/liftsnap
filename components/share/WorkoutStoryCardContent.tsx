import { toDisplayWeight, weightUnitLabel, formatVolumeWithUnit } from '@/lib/units'
import type { WeightUnit } from '@/lib/units'
import type { Locale } from '@/lib/i18n'

// ── Shared types ──────────────────────────────────────────────────────
export type TodayData = {
  sessionId?: string
  title: string
  date: string
  volume: number
  setsCount: number
  exercises: {
    name: string
    setList: { weight: number; reps: number }[]
    setCount: number
    best1RM: number
  }[]
  bestLift: { name: string; weight: number } | null
  muscleFocus: string | null
  photoPath?: string | null
}

export type CardStyle    = 'glass' | 'transparent'
export type ShadowMode   = 'none' | 'soft' | 'strong' | 'extra-strong'
export type DesignPreset = 'orange' | 'ice-blue' | 'violet' | 'mint' | 'premium-black' | 'pearl-white'

type PresetDef = {
  accentHex:        string
  accentHexTransp?: string  // transparent mode accent (defaults to accentHex)
  uiSwatch?:        string  // swatch color in picker UI (defaults to accentHex)
  badgeBg:          string
  badgeBgTransp?:   string  // transparent mode badge bg (defaults to badgeBg)
  badgeBorder:      string
  badgeText:        string
  badgeTextTransp?: string  // transparent mode badge text (defaults to badgeText)
  border:           string
  subText:          string
  subTextTransp?:   string  // transparent mode sub-text (defaults to subText)
  isDark?:          boolean  // false = light card, needs dark body text (default: true)
  defaultShadow:    ShadowMode
  bgCombined:       string
  bgFull?:          string  // glass gradient for full (9:16) layout
  bgPerEx:          string
  latestHex?:       string  // highlight for latest bar/point in glass mode
  latestHexTransp?: string  // highlight for latest bar/point in transparent mode
}

export const PRESETS: Record<DesignPreset, PresetDef> = {
  'orange': {
    accentHex:     '#F97316',
    badgeBg:       '#F97316',
    badgeBorder:   'transparent',
    badgeText:     '#ffffff',
    border:        'rgba(249,115,22,0.28)',
    subText:       'rgba(255,255,255,0.72)',
    defaultShadow: 'strong',
    bgCombined:    'linear-gradient(145deg, rgba(249,115,22,0.07) 0%, rgba(18,18,18,0.45) 100%)',
    bgPerEx:       'linear-gradient(145deg, rgba(249,115,22,0.07) 0%, rgba(18,18,18,0.52) 100%)',
  },
  'ice-blue': {
    accentHex:     '#38BDF8',
    badgeBg:       '#38BDF8',
    badgeBorder:   'transparent',
    badgeText:     '#0a1220',
    border:        'rgba(56,189,248,0.26)',
    subText:       'rgba(226,232,240,0.76)',
    defaultShadow: 'strong',
    bgCombined:    'linear-gradient(145deg, rgba(56,189,248,0.08) 0%, rgba(10,18,28,0.45) 100%)',
    bgPerEx:       'linear-gradient(145deg, rgba(56,189,248,0.08) 0%, rgba(10,18,28,0.52) 100%)',
  },
  'violet': {
    accentHex:     '#8B5CF6',
    badgeBg:       '#8B5CF6',
    badgeBorder:   'transparent',
    badgeText:     '#ffffff',
    border:        'rgba(139,92,246,0.28)',
    subText:       'rgba(237,233,254,0.72)',
    defaultShadow: 'extra-strong',
    bgCombined:    'linear-gradient(145deg, rgba(139,92,246,0.08) 0%, rgba(22,12,35,0.45) 100%)',
    bgPerEx:       'linear-gradient(145deg, rgba(139,92,246,0.08) 0%, rgba(22,12,35,0.52) 100%)',
  },
  'mint': {
    accentHex:     '#14B8A6',
    badgeBg:       '#14B8A6',
    badgeBorder:   'transparent',
    badgeText:     '#ffffff',
    border:        'rgba(20,184,166,0.26)',
    subText:       'rgba(204,251,241,0.70)',
    defaultShadow: 'strong',
    bgCombined:    'linear-gradient(145deg, rgba(20,184,166,0.07) 0%, rgba(8,26,24,0.45) 100%)',
    bgPerEx:       'linear-gradient(145deg, rgba(20,184,166,0.07) 0%, rgba(8,26,24,0.52) 100%)',
  },
  'premium-black': {
    accentHex:     '#E5E7EB',
    uiSwatch:      '#E5E7EB',
    badgeBg:       '#E5E7EB',
    badgeBorder:   'transparent',
    badgeText:     '#111827',
    border:        'rgba(255,255,255,0.18)',
    subText:       'rgba(255,255,255,0.72)',
    defaultShadow: 'strong',
    bgCombined:    'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(5,5,5,0.58) 100%)',
    bgFull:        'linear-gradient(165deg, rgba(14,14,14,0.98) 0%, rgba(3,3,3,0.99) 100%)',
    bgPerEx:       'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(5,5,5,0.65) 100%)',
    latestHex:     '#FFFFFF',
    latestHexTransp: '#FFFFFF',
  },
  'pearl-white': {
    accentHex:        '#111827',
    accentHexTransp:  '#E5E7EB',
    uiSwatch:         '#F0EFEA',
    badgeBg:          '#111827',
    badgeBgTransp:    'rgba(255,255,255,0.18)',
    badgeBorder:      'transparent',
    badgeText:        '#ffffff',
    border:           'rgba(255,255,255,0.42)',
    subText:          'rgba(17,24,39,0.66)',
    subTextTransp:    'rgba(255,255,255,0.76)',
    isDark:           false,
    defaultShadow:    'soft',
    bgCombined:       'linear-gradient(145deg, rgba(245,245,240,0.82) 0%, rgba(235,235,228,0.72) 100%)',
    bgFull:           'linear-gradient(165deg, rgba(245,245,240,0.97) 0%, rgba(230,230,225,0.95) 100%)',
    bgPerEx:          'linear-gradient(145deg, rgba(245,245,240,0.88) 0%, rgba(235,235,228,0.78) 100%)',
    latestHex:        '#000000',
    latestHexTransp:  '#FFFFFF',
  },
}

const SHADOW: Record<ShadowMode, string> = {
  none:           'none',
  soft:           '0 2px 10px rgba(0,0,0,0.55)',
  strong:         '0 2px 6px rgba(0,0,0,0.85), 0 6px 18px rgba(0,0,0,0.65)',
  'extra-strong': '0 2px 4px rgba(0,0,0,0.95), 0 6px 18px rgba(0,0,0,0.8), 0 12px 32px rgba(0,0,0,0.65)',
}

// ── Hex → rgba helper ─────────────────────────────────────────────────
// Avoids 8-char hex for html-to-image compatibility
function acRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ── Glass card background ─────────────────────────────────────────────
// Subtle checker + accent tint on a semi-transparent dark (or light) base.
// Applied to all glass-mode cards so the "transparency" aesthetic is visible
// without losing readability. backgroundSize must be applied alongside background.
export function glassCardStyle(accentHex: string, isDark: boolean): { background: string; backgroundSize: string } {
  const sq   = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.04)'
  const base = isDark ? 'rgba(10,10,10,0.84)' : 'rgba(242,242,237,0.88)'
  const r    = parseInt(accentHex.slice(1, 3), 16)
  const g    = parseInt(accentHex.slice(3, 5), 16)
  const b    = parseInt(accentHex.slice(5, 7), 16)
  return {
    background: [
      `linear-gradient(145deg, rgba(${r},${g},${b},0.07) 0%, transparent 80%)`,
      `linear-gradient(45deg, ${sq} 25%, transparent 25%)`,
      `linear-gradient(-45deg, ${sq} 25%, transparent 25%)`,
      `linear-gradient(45deg, transparent 75%, ${sq} 75%)`,
      `linear-gradient(-45deg, transparent 75%, ${sq} 75%)`,
      base,
    ].join(', '),
    backgroundSize: '100% 100%, 16px 16px, 16px 16px, 16px 16px, 16px 16px, auto',
  }
}

// ── Pure helpers ──────────────────────────────────────────────────────
const JA_EN: Record<string, string> = {
  'デッドリフト': 'Deadlift',                   'ベントオーバーロウ': 'Bent Over Row',
  'ベントオーバーロー': 'Bent Over Row',          'ラットプルダウン': 'Lat Pulldown',
  'チンニング': 'Chin-up',                        'チンアップ': 'Chin-up',
  'プルアップ': 'Pull-up',                        '懸垂': 'Pull-up',
  'ベンチプレス': 'Bench Press',                  'インクラインベンチプレス': 'Incline Bench Press',
  'ダンベルベンチプレス': 'DB Bench Press',       'インクラインダンベルプレス': 'Incline DB Press',
  'フラットダンベルプレス': 'Flat DB Press',      'ショルダープレス': 'Shoulder Press',
  'オーバーヘッドプレス': 'Overhead Press',       'ダンベルショルダープレス': 'DB Shoulder Press',
  'スクワット': 'Squat',                          'バーベルスクワット': 'Barbell Squat',
  'フロントスクワット': 'Front Squat',            'レッグプレス': 'Leg Press',
  'レッグカール': 'Leg Curl',                     'レッグエクステンション': 'Leg Extension',
  'ルーマニアンデッドリフト': 'Romanian Deadlift','アームカール': 'Arm Curl',
  'バーベルカール': 'Barbell Curl',               'ダンベルカール': 'DB Curl',
  'ハンマーカール': 'Hammer Curl',                'トライセプスエクステンション': 'Tricep Extension',
  'トライセプスプッシュダウン': 'Tricep Pushdown','プッシュダウン': 'Pushdown',
  'サイドレイズ': 'Lateral Raise',               'リアレイズ': 'Rear Delt Raise',
  'フロントレイズ': 'Front Raise',                'ダンベルロウ': 'DB Row',
  'ワンハンドロウ': 'One-Arm Row',                'ケーブルロウ': 'Cable Row',
  'シーテッドロウ': 'Seated Row',                 'プランク': 'Plank',
  'ディップス': 'Dips',                           'プッシュアップ': 'Push-up',
  'チェストフライ': 'Chest Fly',                  'ペックデック': 'Pec Deck',
  'ケーブルクロスオーバー': 'Cable Crossover',    'カーフレイズ': 'Calf Raise',
  'ヒップスラスト': 'Hip Thrust',                 'グッドモーニング': 'Good Morning',
  'バーベルロウ': 'Barbell Row',                  'ケーブルカール': 'Cable Curl',
  'フェイスプル': 'Face Pull',                    'シュラッグ': 'Shrug',
  'ランジ': 'Lunge',                              'ブルガリアンスクワット': 'Bulgarian Split Squat',
  'ケーブルフライ': 'Cable Fly',                  'インクラインカール': 'Incline Curl',
  'ステップアップ': 'Step Up',
}

export const tname = (n: string) => JA_EN[n] ?? n
export const fmtKg  = (v: number) => v === Math.round(v) ? `${v}` : `${v.toFixed(1)}`

export function fmtDate(s: string) {
  const d = new Date(s + 'T00:00:00')
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const D = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  return `${M[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${D[d.getDay()]}`
}

// ── Exercise density tiers ────────────────────────────────────────────
type Tier = 1 | 2 | 3 | 4 | 5

export function getTier(totalRows: number): Tier {
  if (totalRows <= 10) return 1
  if (totalRows <= 15) return 2
  if (totalRows <= 22) return 3
  if (totalRows <= 30) return 4
  return 5
}

export const TIER_PARAMS: Record<Tier, {
  nameSize: number; infoSize: number; setSize: number;
  exGap: number; lineGap: number; sectionGap: number; volumeSize: number;
}> = {
  1: { nameSize: 16, infoSize: 12, setSize: 18, exGap: 10, lineGap: 4, sectionGap: 11, volumeSize: 42 },
  2: { nameSize: 15, infoSize: 12, setSize: 17, exGap: 8,  lineGap: 3, sectionGap: 9,  volumeSize: 38 },
  3: { nameSize: 15, infoSize: 11, setSize: 16, exGap: 6,  lineGap: 3, sectionGap: 8,  volumeSize: 34 },
  4: { nameSize: 14, infoSize: 10, setSize: 14, exGap: 5,  lineGap: 2, sectionGap: 7,  volumeSize: 32 },
  5: { nameSize: 13, infoSize: 10, setSize: 12, exGap: 4,  lineGap: 2, sectionGap: 6,  volumeSize: 30 },
}

// ── Props ─────────────────────────────────────────────────────────────
type Props = {
  data: TodayData
  cardStyle: CardStyle
  preset: DesignPreset
  unit: WeightUnit
  locale: Locale
  isPast?: boolean
  shadowMode?: ShadowMode
}

// ── Component ─────────────────────────────────────────────────────────
// Pure presentational — no hooks. Works as Server Component and in Client context.
export default function WorkoutStoryCardContent({
  data,
  cardStyle,
  preset,
  unit,
  locale,
  isPast = false,
  shadowMode = 'none',
}: Props) {
  const p             = PRESETS[preset]
  const isTransparent = cardStyle === 'transparent'
  const isDarkBg      = isTransparent || (p.isDark !== false)
  const acHex         = isTransparent ? (p.accentHexTransp ?? p.accentHex) : p.accentHex
  const subTextColor  = isTransparent ? (p.subTextTransp ?? p.subText) : p.subText
  const badgeBgColor  = isTransparent ? (p.badgeBgTransp ?? p.badgeBg) : p.badgeBg
  const badgeTextColor = isTransparent ? (p.badgeTextTransp ?? p.badgeText) : p.badgeText
  const textPrimary   = isDarkBg ? '#fff' : '#111827'
  const rgb           = isDarkBg ? '255,255,255' : '17,24,39'
  const ptxt          = (a: number) => `rgba(${rgb},${a})`
  const unitLabel     = weightUnitLabel(unit)
  const volStr        = formatVolumeWithUnit(data.volume, unit)
  const g1rm          = data.exercises.reduce((m, ex) => Math.max(m, ex.best1RM), 0)

  const totalRows = data.exercises.reduce((sum, ex) => sum + 2 + ex.setList.length, 0)
  const tier = getTier(totalRows)
  const tp   = TIER_PARAMS[tier]

  const ts = SHADOW[shadowMode]

  const dividerColor = acRgba(acHex, isTransparent ? 0.35 : 0.25)
  const accentDot    = acRgba(acHex, 0.70)
  const accentFooter = acRgba(acHex, isTransparent ? 0.65 : 0.50)

  return (
    <div style={{
      padding: '24px 30px 14px',
      display: 'flex', flexDirection: 'column',
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden',
      isolation: 'isolate',
      borderRadius: '24px',
      textShadow: ts,
      ...(isTransparent ? { background: 'transparent' } : {
        ...glassCardStyle(p.accentHex, p.isDark !== false),
        border: `1px solid ${p.border}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16)',
      }),
    }}>

      {/* REPRA badge */}
      <div>
        <span style={{
          display: 'inline-block',
          fontSize: 10, fontWeight: 900, letterSpacing: '0.16em',
          padding: '4px 11px', borderRadius: 5,
          background: badgeBgColor, color: badgeTextColor,
          border: `1px solid ${p.badgeBorder}`,
        }}>REPRA</span>
      </div>

      {/* WORKOUT label · date · title */}
      <div style={{ marginTop: 12 }}>
        <p style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.16em',
          color: ptxt(0.42), margin: 0, lineHeight: 1,
        }}>
          {isPast ? 'WORKOUT STORY' : "TODAY'S WORKOUT"}
        </p>
        <p style={{ fontSize: 11, color: subTextColor, margin: '5px 0 0', lineHeight: 1 }}>
          {fmtDate(data.date)}
        </p>
        <p style={{
          fontSize: 16, fontWeight: 900, color: textPrimary,
          lineHeight: 1.15, margin: '4px 0 0', letterSpacing: '-0.01em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          textTransform: 'uppercase',
        }}>
          {data.title}
        </p>
      </div>

      {/* Divider */}
      <div style={{ height: 1, width: '60%', background: dividerColor, margin: `${tp.sectionGap}px 0` }} />

      {/* TOTAL VOLUME */}
      <div>
        <p style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.16em',
          color: ptxt(0.42), margin: '0 0 6px', lineHeight: 1,
        }}>
          TOTAL VOLUME
        </p>
        <p style={{
          fontSize: tp.volumeSize, fontWeight: 900, color: acHex,
          lineHeight: 1, margin: 0, letterSpacing: '-0.025em',
        }}>
          {volStr}
        </p>
        <p style={{ fontSize: 11, color: subTextColor, margin: '7px 0 0', lineHeight: 1 }}>
          {data.setsCount}&thinsp;SETS
          {g1rm > 0 && (
            <>
              {' · BEST 1RM '}
              <span style={{ color: acHex, fontWeight: 700 }}>
                {toDisplayWeight(Math.round(g1rm), unit)}{unitLabel}
              </span>
            </>
          )}
        </p>
      </div>

      {/* Divider */}
      <div style={{ height: 1, width: '60%', background: dividerColor, margin: `${tp.sectionGap}px 0` }} />

      {/* EXERCISES */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 8px' }}>
          <div style={{
            width: 2, height: 9, borderRadius: 1,
            background: accentDot, flexShrink: 0,
          }} />
          <p style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.16em',
            color: ptxt(0.42), margin: 0, lineHeight: 1,
          }}>
            EXERCISES
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: tp.exGap }}>
          {data.exercises.map((ex) => (
            <div key={ex.name} style={{ flexShrink: 0 }}>
              <p style={{
                fontSize: tp.nameSize, fontWeight: 800, color: textPrimary,
                margin: 0, lineHeight: 1.2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {tname(ex.name)}
              </p>
              <p style={{
                fontSize: tp.infoSize, color: subTextColor,
                marginTop: tp.lineGap, lineHeight: 1,
              }}>
                {ex.setCount}{locale === 'ja' ? 'セット' : ' sets'}{ex.best1RM > 0
                  ? <>{' · est. 1RM '}<span style={{ color: acHex, fontWeight: 700 }}>{fmtKg(toDisplayWeight(ex.best1RM, unit))}{unitLabel}</span></>
                  : null}
              </p>
              {ex.setList.map((s, i) => {
                const str = s.weight > 0
                  ? `${fmtKg(toDisplayWeight(s.weight, unit))}${unitLabel} × ${s.reps}`
                  : s.reps > 0 ? `BW × ${s.reps}` : null
                if (!str) return null
                return (
                  <p key={i} style={{
                    fontSize: tp.setSize, color: ptxt(0.88),
                    marginTop: tp.lineGap, lineHeight: 1.2,
                  }}>
                    {str}
                  </p>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Made with REPRA */}
      <p style={{
        fontSize: 8,
        color: isTransparent ? 'rgba(255,255,255,0.45)' : ptxt(0.22),
        textAlign: 'right', letterSpacing: '0.06em', lineHeight: 1, marginTop: 10,
      }}>
        Made with{' '}
        <span style={{ color: accentFooter, fontWeight: 700 }}>REPRA</span>
      </p>

    </div>
  )
}

// ── Per-exercise card ─────────────────────────────────────────────────
export type ExerciseCardData = {
  name: string
  setList: { weight: number; reps: number }[]
  setCount: number
  best1RM: number
  date: string
}

type ExerciseCardProps = {
  data: ExerciseCardData
  cardStyle: CardStyle
  preset: DesignPreset
  unit: WeightUnit
  locale: Locale
  isPast?: boolean
  shadowMode?: ShadowMode
}

export function ExerciseStoryCard({
  data, cardStyle, preset, unit, locale, isPast = false,
  shadowMode = 'none',
}: ExerciseCardProps) {
  const p              = PRESETS[preset]
  const isTransparent  = cardStyle === 'transparent'
  const isDarkBg       = isTransparent || (p.isDark !== false)
  const acHex          = isTransparent ? (p.accentHexTransp ?? p.accentHex) : p.accentHex
  const subTextColor   = isTransparent ? (p.subTextTransp ?? p.subText) : p.subText
  const badgeBgColor   = isTransparent ? (p.badgeBgTransp ?? p.badgeBg) : p.badgeBg
  const badgeTextColor = isTransparent ? (p.badgeTextTransp ?? p.badgeText) : p.badgeText
  const textPrimary    = isDarkBg ? '#fff' : '#111827'
  const rgb            = isDarkBg ? '255,255,255' : '17,24,39'
  const ptxt           = (a: number) => `rgba(${rgb},${a})`
  const unitLabel      = weightUnitLabel(unit)
  const ts             = SHADOW[shadowMode]
  const dividerColor   = acRgba(acHex, isTransparent ? 0.35 : 0.25)
  const accentFooter   = acRgba(acHex, isTransparent ? 0.65 : 0.50)

  return (
    <div style={{
      padding: '20px 24px 14px',
      display: 'flex', flexDirection: 'column',
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden',
      isolation: 'isolate',
      borderRadius: '24px',
      textShadow: ts,
      ...(isTransparent ? { background: 'transparent' } : {
        ...glassCardStyle(p.accentHex, p.isDark !== false),
        border: `1px solid ${p.border}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16)',
      }),
    }}>

      {/* REPRA badge */}
      <div>
        <span style={{
          display: 'inline-block',
          fontSize: 10, fontWeight: 900, letterSpacing: '0.16em',
          padding: '4px 11px', borderRadius: 5,
          background: badgeBgColor, color: badgeTextColor,
          border: `1px solid ${p.badgeBorder}`,
        }}>REPRA</span>
      </div>

      {/* Label + date */}
      <div style={{ marginTop: 10 }}>
        <p style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.16em',
          color: ptxt(0.42), margin: 0, lineHeight: 1,
        }}>
          {isPast ? 'WORKOUT STORY' : "TODAY'S WORKOUT"}
        </p>
        <p style={{ fontSize: 11, color: subTextColor, margin: '4px 0 0', lineHeight: 1 }}>
          {fmtDate(data.date)}
        </p>
      </div>

      {/* Divider */}
      <div style={{ height: 1, width: '60%', background: dividerColor, margin: '10px 0' }} />

      {/* Exercise name */}
      <p style={{
        fontSize: 20, fontWeight: 900, color: textPrimary,
        margin: 0, lineHeight: 1.15, letterSpacing: '-0.02em',
      }}>
        {tname(data.name)}
      </p>

      {/* Sets + est. 1RM */}
      <p style={{ fontSize: 12, color: subTextColor, margin: '5px 0 0', lineHeight: 1 }}>
        {data.setCount}{locale === 'ja' ? 'セット' : ' sets'}
        {data.best1RM > 0 && (
          <>
            {' · est. 1RM '}
            <span style={{ color: acHex, fontWeight: 700 }}>
              {fmtKg(toDisplayWeight(data.best1RM, unit))}{unitLabel}
            </span>
          </>
        )}
      </p>

      {/* Divider */}
      <div style={{ height: 1, width: '60%', background: dividerColor, margin: '10px 0' }} />

      {/* All set details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {data.setList.map((s, i) => {
          const str = s.weight > 0
            ? `${fmtKg(toDisplayWeight(s.weight, unit))}${unitLabel} × ${s.reps}`
            : s.reps > 0 ? `BW × ${s.reps}` : null
          if (!str) return null
          return (
            <p key={i} style={{
              fontSize: 18, color: ptxt(0.88),
              margin: 0, lineHeight: 1.2,
            }}>
              {str}
            </p>
          )
        })}
      </div>

      {/* Made with REPRA */}
      <p style={{
        fontSize: 8,
        color: isTransparent ? 'rgba(255,255,255,0.45)' : ptxt(0.22),
        textAlign: 'right', letterSpacing: '0.06em', lineHeight: 1, marginTop: 10,
      }}>
        Made with{' '}
        <span style={{ color: accentFooter, fontWeight: 700 }}>REPRA</span>
      </p>

    </div>
  )
}
