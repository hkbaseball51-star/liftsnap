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

export type CardStyle  = 'glass' | 'transparent'
export type Accent     = 'orange' | 'purple' | 'teal' | 'blue' | 'white' | 'black'
export type ShadowMode = 'none' | 'soft' | 'strong'

export const AC: Record<Accent, { hex: string; badgeBg: string; badgeBorder: string; badgeText: string }> = {
  orange: { hex: '#ED742F', badgeBg: '#ED742F',               badgeBorder: 'transparent',            badgeText: '#ffffff'               },
  purple: { hex: '#6E38D4', badgeBg: '#6E38D4',               badgeBorder: 'transparent',            badgeText: '#ffffff'               },
  teal:   { hex: '#14B8A6', badgeBg: '#14B8A6',               badgeBorder: 'transparent',            badgeText: '#ffffff'               },
  blue:   { hex: '#3B82F6', badgeBg: '#3B82F6',               badgeBorder: 'transparent',            badgeText: '#ffffff'               },
  white:  { hex: '#ffffff', badgeBg: 'rgba(255,255,255,0.08)', badgeBorder: 'rgba(255,255,255,0.20)', badgeText: 'rgba(255,255,255,0.80)' },
  black:  { hex: '#ffffff', badgeBg: 'transparent',            badgeBorder: 'rgba(255,255,255,0.28)', badgeText: '#ffffff'               },
}

const SHADOW: Record<ShadowMode, string> = {
  none:   'none',
  soft:   '0 2px 10px rgba(0,0,0,0.45)',
  strong: '0 3px 16px rgba(0,0,0,0.75)',
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
  1: { nameSize: 13, infoSize: 11, setSize: 11, exGap: 12, lineGap: 3, sectionGap: 16, volumeSize: 46 },
  2: { nameSize: 12, infoSize: 11, setSize: 11, exGap: 9,  lineGap: 2, sectionGap: 13, volumeSize: 42 },
  3: { nameSize: 11, infoSize: 10, setSize: 10, exGap: 7,  lineGap: 2, sectionGap: 11, volumeSize: 38 },
  4: { nameSize: 11, infoSize: 9,  setSize: 9,  exGap: 5,  lineGap: 1, sectionGap: 9,  volumeSize: 36 },
  5: { nameSize: 10, infoSize: 9,  setSize: 8,  exGap: 4,  lineGap: 1, sectionGap: 8,  volumeSize: 34 },
}

// ── Props ─────────────────────────────────────────────────────────────
type Props = {
  data: TodayData
  cardStyle: CardStyle
  accent: Accent
  unit: WeightUnit
  locale: Locale
  hasPhoto?: boolean
  isPast?: boolean
  shadowMode?: ShadowMode
}

// ── Component ─────────────────────────────────────────────────────────
// Pure presentational — no hooks. Works as Server Component and in Client context.
export default function WorkoutStoryCardContent({
  data,
  cardStyle,
  accent,
  unit,
  locale,
  hasPhoto = false,
  isPast = false,
  shadowMode = 'none',
}: Props) {
  const ac          = AC[accent]
  const acHex       = ac.hex
  const isTransparent = cardStyle === 'transparent'
  const unitLabel   = weightUnitLabel(unit)
  const volStr      = formatVolumeWithUnit(data.volume, unit)
  const g1rm        = data.exercises.reduce((m, ex) => Math.max(m, ex.best1RM), 0)

  const totalRows = data.exercises.reduce((sum, ex) => sum + 2 + ex.setList.length, 0)
  const tier = getTier(totalRows)
  const tp   = TIER_PARAMS[tier]

  const ts           = SHADOW[shadowMode]
  const dividerColor = isTransparent ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.09)'

  return (
    <div style={{
      padding: '32px 24px 22px',
      display: 'flex', flexDirection: 'column',
      boxSizing: 'border-box',
      textShadow: ts,
      background: isTransparent
        ? 'transparent'
        : hasPhoto
          ? 'rgba(6,6,6,0.84)'
          : 'rgba(18,18,18,1)',
      ...(isTransparent ? {} : {
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '0 0 20px 20px',
      }),
    }}>

      {/* REPRA badge */}
      <div>
        <span style={{
          display: 'inline-block',
          fontSize: 10, fontWeight: 900, letterSpacing: '0.16em',
          padding: '4px 11px', borderRadius: 5,
          background: ac.badgeBg, color: ac.badgeText,
          border: `1px solid ${ac.badgeBorder}`,
        }}>REPRA</span>
      </div>

      {/* WORKOUT label · date · title */}
      <div style={{ marginTop: 16 }}>
        <p style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.16em',
          color: 'rgba(255,255,255,0.42)', margin: 0, lineHeight: 1,
        }}>
          {isPast ? 'WORKOUT STORY' : "TODAY'S WORKOUT"}
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.52)', margin: '5px 0 0', lineHeight: 1 }}>
          {fmtDate(data.date)}
        </p>
        <p style={{
          fontSize: 24, fontWeight: 900, color: '#fff',
          lineHeight: 1.1, margin: '7px 0 0', letterSpacing: '-0.01em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          textTransform: 'uppercase',
        }}>
          {data.title}
        </p>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: dividerColor, margin: `${tp.sectionGap}px 0` }} />

      {/* TOTAL VOLUME */}
      <div>
        <p style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.16em',
          color: 'rgba(255,255,255,0.42)', margin: '0 0 6px', lineHeight: 1,
        }}>
          TOTAL VOLUME
        </p>
        <p style={{
          fontSize: tp.volumeSize, fontWeight: 900, color: acHex,
          lineHeight: 1, margin: 0, letterSpacing: '-0.025em',
        }}>
          {volStr}
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.48)', margin: '7px 0 0', lineHeight: 1 }}>
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
      <div style={{ height: 1, background: dividerColor, margin: `${tp.sectionGap}px 0` }} />

      {/* EXERCISES — full set detail per exercise, no truncation */}
      <div>
        <p style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.16em',
          color: 'rgba(255,255,255,0.42)', margin: '0 0 10px', lineHeight: 1,
        }}>
          EXERCISES
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: tp.exGap }}>
          {data.exercises.map((ex) => (
            <div key={ex.name} style={{ flexShrink: 0 }}>
              <p style={{
                fontSize: tp.nameSize, fontWeight: 800, color: '#fff',
                margin: 0, lineHeight: 1.2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {tname(ex.name)}
              </p>
              <p style={{
                fontSize: tp.infoSize, color: 'rgba(255,255,255,0.40)',
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
                    fontSize: tp.setSize, color: 'rgba(255,255,255,0.60)',
                    marginTop: tp.lineGap, lineHeight: 1.1,
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
        fontSize: 8, color: 'rgba(255,255,255,0.24)',
        textAlign: 'right', letterSpacing: '0.06em', lineHeight: 1, marginTop: 16,
      }}>
        Made with REPRA
      </p>

    </div>
  )
}
