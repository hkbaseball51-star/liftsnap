'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TrendingUp, BarChart2, Activity, Lock, ChevronRight, Settings, Crown } from 'lucide-react'
import { useWeightUnit } from '@/lib/useWeightUnit'
import { toDisplayWeight, weightUnitLabel, formatVolumeWithUnit } from '@/lib/units'
import WorkoutStoryCardContent, { glassCardStyle } from '@/components/share/WorkoutStoryCardContent'
import type { TodayData } from '@/components/share/WorkoutStoryCardContent'
import type { Locale } from '@/lib/i18n'
import { useAppData } from '@/contexts/AppDataContext'
import { localGetTodayWorkoutForShare } from '@/lib/localDB'
import { VOLUME_CHART_SESSION_REQUIRED, BW_CHART_REQUIRED } from '@/lib/unlocks'

// ── Static sample data ────────────────────────────────────────────────
const RM_PTS  = [58,59,60,61,62,64,63,65,67,69,71,70,73,76,79,82,83,86,90,94]
const BW_PTS  = [64.0,64.2,63.8,64.6,65.1,65.4,66.0,66.3,67.0,67.4,68.1,68.5,69.0,69.6,70.0]
const VOL_H   = [0.45,0.28,0.62,0.55,0.38,0.72,0.48,0.58,0.82,0.40,0.66,0.75,0.58,0.48,0.85,0.65,0.78,0.60,0.88,0.72,0.80,0.62,0.90,0.82,1.00]

// ── Mini chart components ─────────────────────────────────────────────
function LineChart({ pts, color, areaColor }: { pts: number[]; color: string; areaColor: string }) {
  const n   = pts.length
  const min = Math.min(...pts)
  const max = Math.max(...pts)
  const rng = max - min || 1
  const px  = (i: number) => (i / (n - 1)) * 100
  const py  = (v: number) => 8 + ((max - v) / rng) * 80
  const linePoints = pts.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ')
  const areaPoints = `0,100 ${linePoints} 100,100`
  const lastX = px(n - 1)
  const lastY = py(pts[n - 1])
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
      <polygon points={areaPoints} fill={areaColor} />
      <polyline points={linePoints} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="miter" strokeLinecap="butt" />
      <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r="4" fill={color} opacity="0.15" />
      <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r="2.5" fill={color} opacity="0.4" />
      <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r="1.6" fill={color} />
    </svg>
  )
}

function BarChart({ heights, color }: { heights: number[]; color: string }) {
  const n    = heights.length
  const slot = 100 / n
  const barW = slot * 0.72
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
      {heights.map((h, i) => {
        const bH  = h * 92
        const bx  = i * slot + (slot - barW) / 2
        const by  = 100 - bH
        const isLast = i === n - 1
        const isBest = h === 1.0
        const opacity = isLast ? 1 : isBest ? 0.82 : 0.38
        return (
          <rect key={i} x={bx.toFixed(1)} y={by.toFixed(1)} width={barW.toFixed(1)} height={bH.toFixed(1)}
            rx="1.2" fill={color} opacity={opacity} />
        )
      })}
    </svg>
  )
}

function hexRGB(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

function MiniGlassCard({
  accentHex, borderAlpha = 0.28, children,
  label, metric, value, sub,
}: {
  accentHex: string
  borderAlpha?: number
  children: React.ReactNode
  label: string
  metric: string
  value: string
  sub?: string
}) {
  const gls = glassCardStyle(accentHex, true)
  return (
    <div style={{
      ...gls,
      border: `1px solid rgba(${hexRGB(accentHex)},${borderAlpha})`,
      borderRadius: 12,
      padding: '7px 8px',
      display: 'flex', flexDirection: 'column',
      height: '100%',
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06)`,
      overflow: 'hidden',
    }}>
      <span style={{
        fontSize: 6, fontWeight: 900, letterSpacing: '0.14em',
        color: accentHex, display: 'inline-block', marginBottom: 3,
      }}>REPRA</span>
      <p style={{ fontSize: 5.5, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', margin: '0 0 1px' }}>{label}</p>
      <p style={{ fontSize: 7.5, fontWeight: 900, color: '#fff', margin: '0 0 2px', lineHeight: 1.1 }}>{metric}</p>
      <p style={{ fontSize: 11, fontWeight: 900, color: accentHex, margin: '0 0 1px', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 6, color: 'rgba(255,255,255,0.45)', margin: '0 0 4px' }}>{sub}</p>}
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────
type Props = {
  previewData: TodayData
  isSample: boolean
  locale: Locale
  ja: boolean
  todayData: TodayData | null
  hasExercises: boolean
  hasBodyWeight: boolean
  todayStr: string
}

export default function ShareLandingView({
  previewData, isSample, locale, ja, todayData, hasExercises, hasBodyWeight, todayStr,
}: Props) {
  const router = useRouter()
  const { unit } = useWeightUnit()
  const unitLabel = weightUnitLabel(unit)
  const { daySummaries, totalSessions, bodyWeightHistory: ctxBwHistory } = useAppData()

  // Lazy init: synchronously read localStorage on first render when server provided sample data.
  // Server Component can't access localStorage, so local-mode users always get isSample=true
  // even when they have a real workout recorded.
  const [localTodayData] = useState<TodayData | null>(() => {
    if (typeof window === 'undefined') return null
    if (!isSample) return null
    try {
      return localGetTodayWorkoutForShare(todayStr)
    } catch {
      return null
    }
  })

  // Combine daySummaries (reactive after pathname effect) with localTodayData (sync first-render).
  // processRawSessions may skip sessions with only 0-weight sets; localGetTodayWorkoutForShare
  // only checks completed_at !== null — using both is more reliable.
  const hasTodayWorkout = Boolean(daySummaries[todayStr]) || Boolean(localTodayData)

  const displayPreviewData = localTodayData ?? previewData
  const displayIsSample    = localTodayData ? false : isSample
  const displayTodayData   = localTodayData ?? todayData

  // Volume chip formatter (raw kg input)
  const fmtVol = (v: number) => formatVolumeWithUnit(v, unit)

  // Unit-aware sample values for MiniGlassCard previews
  const sampleRM      = `${toDisplayWeight(117, unit)}${unitLabel}`
  const sampleRMSub   = `${toDisplayWeight(64, unit)} → ${toDisplayWeight(117, unit)} · +${toDisplayWeight(53, unit)}${unitLabel}`
  const sampleVol     = formatVolumeWithUnit(4100, unit)
  const sampleBW      = `${toDisplayWeight(70, unit).toFixed(1)}${unitLabel}`
  const sampleBWSub   = `${toDisplayWeight(64, unit).toFixed(1)} → ${toDisplayWeight(70, unit).toFixed(1)} · +${toDisplayWeight(6, unit).toFixed(1)}`

  const cardBase = (enabled: boolean, accentHex: string) => ({
    background: enabled ? '#191919' : '#141414',
    border: `1px solid ${enabled ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.05)'}`,
    borderRadius: 18,
    overflow: 'hidden' as const,
    opacity: enabled ? 1 : 0.45,
  })

  const iconBox = (accentHex: string, bgAlpha = 0.14) => ({
    flexShrink: 0, width: 40, height: 40, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: `rgba(${hexRGB(accentHex)},${bgAlpha})`,
  })

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#080808' }}>

      {/* Header */}
      <div className="px-4 pt-10 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.36)', marginBottom: 5 }}>
              SHARE
            </p>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.2, marginBottom: 4 }}>
              {ja ? '今日の努力を、1枚の証拠に。' : 'Create your proof.'}
            </h1>
            <p style={{ fontSize: 12.5, fontWeight: 400, color: 'rgba(255,255,255,0.40)', lineHeight: 1.5 }}>
              {ja ? '今日の努力をストーリーカードに変換する' : "Turn today's effort into a story."}
            </p>
          </div>
          <Link href="/profile/settings"
            className="w-10 h-10 flex items-center justify-center rounded-full active:opacity-70 flex-shrink-0 mt-0.5"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}>
            <Settings size={18} style={{ color: 'rgba(255,255,255,0.52)' }} />
          </Link>
        </div>
      </div>

      <div className="px-4 flex flex-col gap-4" style={{ paddingBottom: 28 }}>

        {/* ── A. Workout Story (Featured) ─────────────────── */}
        <div
          className="block active:opacity-90 transition-opacity cursor-pointer"
          onClick={() => {
            if (hasTodayWorkout) {
              router.push(`/share?type=today&date=${todayStr}`)
            } else {
              router.push(`/record?date=${todayStr}`)
            }
          }}
        >
          <div style={{
            background: '#1A1A1A',
            border: '1px solid rgba(237,116,47,0.28)',
            borderRadius: 20,
            overflow: 'hidden',
          }}>
            <div style={{ height: 2, background: 'linear-gradient(90deg, #ED742F 0%, rgba(237,116,47,0.14) 65%, transparent 100%)' }} />
            <div style={{ padding: '13px 15px 15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
                <span style={{
                  fontSize: 8, fontWeight: 800, letterSpacing: '0.14em',
                  padding: '3px 9px', borderRadius: 20,
                  background: 'rgba(237,116,47,0.14)', border: '1px solid rgba(237,116,47,0.24)',
                  color: 'rgba(237,116,47,0.92)',
                }}>
                  {ja ? 'おすすめ' : 'FEATURED'}
                </span>
                <ChevronRight size={14} color="rgba(237,116,47,0.55)" />
              </div>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1.2, marginBottom: 3 }}>
                {ja ? '今日のワークアウトStory' : "Today's Workout Story"}
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', marginBottom: 11, lineHeight: 1.5 }}>
                {ja ? 'トレーニングをInstagramストーリー用カードに変換' : "Today's training as an Instagram story card."}
              </p>
              {/* Preview — unit-aware */}
              <div style={{ position: 'relative', height: 188, overflow: 'hidden', borderRadius: 12, marginBottom: 11, background: '#121212' }}>
                <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%) scale(0.62)', transformOrigin: 'top center', width: 420, pointerEvents: 'none' }}>
                  <WorkoutStoryCardContent
                    data={displayPreviewData}
                    cardStyle="glass"
                    preset="orange"
                    unit={unit}
                    locale={locale}
                    isPast={false}
                  />
                </div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 70, background: 'linear-gradient(to top, #121212, transparent)', pointerEvents: 'none' }} />
                {displayIsSample && (
                  <div style={{ position: 'absolute', top: 7, right: 7, fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 6px', borderRadius: 5, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.34)', pointerEvents: 'none' }}>SAMPLE</div>
                )}
              </div>
              {/* Stats chips — unit-aware volume (only when today has a real workout) */}
              {hasTodayWorkout && displayTodayData && (
                <div style={{ display: 'flex', gap: 5, marginBottom: 11, flexWrap: 'wrap' }}>
                  {[fmtVol(displayTodayData.volume), `${displayTodayData.setsCount} sets`, `${displayTodayData.exercises.length} exercises`].map(chip => (
                    <span key={chip} style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.44)', padding: '3px 8px', borderRadius: 9, background: 'rgba(255,255,255,0.05)' }}>{chip}</span>
                  ))}
                </div>
              )}
              {/* CTA */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: hasTodayWorkout ? '#ED742F' : '#2a2a2a',
                borderRadius: 13, padding: '11px 0',
                boxShadow: hasTodayWorkout ? '0 4px 16px rgba(237,116,47,0.28)' : 'none',
                border: hasTodayWorkout ? 'none' : '1px solid rgba(255,255,255,0.12)',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', color: hasTodayWorkout ? '#fff' : 'rgba(255,255,255,0.60)' }}>
                  {hasTodayWorkout
                    ? (ja ? '今日のワークアウトをシェア' : "Share today's workout")
                    : (ja ? '今日のワークアウトを記録' : "Log today's workout")}
                </span>
                <ChevronRight size={13} color={hasTodayWorkout ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.32)'} />
              </div>
            </div>
          </div>
        </div>

        {/* ── B. Graph Stories ────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.36)' }}>
              GRAPH STORIES
            </p>
            <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.26)' }}>
              {ja ? '成長グラフをシェア' : 'Share your progress charts'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* ── Best 1RM ── */}
            {hasExercises ? (
              <Link href="/share/stats" className="block active:opacity-70 transition-opacity">
                <div style={cardBase(true, '#ED742F')}>
                  <div style={{ padding: '14px 15px', display: 'flex', alignItems: 'stretch', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
                          <div style={iconBox('#ED742F')}>
                            <TrendingUp size={19} color="#ED742F" />
                          </div>
                          <div>
                            <p style={{ fontSize: 13.5, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>Best 1RM</p>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', marginTop: 1 }}>
                              {ja ? 'MAX重量の成長グラフ' : 'Max strength progress'}
                            </p>
                          </div>
                        </div>
                        <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.38)', lineHeight: 1.45 }}>
                          {ja ? '種目別のBest 1RMの推移をグラフ化してシェア' : 'Share your max strength progress by exercise'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 600, color: '#ED742F' }}>{ja ? '1RM Graph Storyを作成' : 'Create 1RM Story'}</span>
                        <ChevronRight size={12} color="#ED742F" />
                      </div>
                    </div>
                    {/* Mini preview — unit-aware */}
                    <div style={{ width: 96, flexShrink: 0 }}>
                      <MiniGlassCard accentHex="#ED742F" label="MAX 1RM PROGRESS" metric="BENCH PRESS" value={sampleRM} sub={sampleRMSub}>
                        <LineChart pts={RM_PTS} color="#ED742F" areaColor="rgba(237,116,47,0.12)" />
                      </MiniGlassCard>
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div style={{ ...cardBase(false, '#ED742F'), padding: '14px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={iconBox('#888', 0.06)}>
                  <TrendingUp size={19} color="rgba(255,255,255,0.30)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 2 }}>Best 1RM</p>
                  <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)' }}>{ja ? 'ワークアウトを記録するとアンロック' : 'Log workouts to unlock'}</p>
                </div>
                <Lock size={14} color="rgba(255,255,255,0.20)" />
              </div>
            )}

            {/* ── Daily Volume ── */}
            {hasExercises && totalSessions >= VOLUME_CHART_SESSION_REQUIRED ? (
              <Link href="/share?type=stats&metric=volume&bodypart=all" className="block active:opacity-70 transition-opacity">
                <div style={cardBase(true, '#22c55e')}>
                  <div style={{ padding: '14px 15px', display: 'flex', alignItems: 'stretch', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
                          <div style={iconBox('#22c55e')}>
                            <BarChart2 size={19} color="#22c55e" />
                          </div>
                          <div>
                            <p style={{ fontSize: 13.5, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>Daily Volume</p>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', marginTop: 1 }}>
                              {ja ? '部位別・PPL別の総重量グラフ' : 'Body part / PPL volume chart'}
                            </p>
                          </div>
                        </div>
                        <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.38)', lineHeight: 1.45 }}>
                          {ja ? '部位別またはPPL別のトレーニング量の推移をシェア' : 'Share volume trends by body part or PPL'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 600, color: '#22c55e' }}>{ja ? 'Volume Graph Storyを作成' : 'Create Volume Story'}</span>
                        <ChevronRight size={12} color="#22c55e" />
                      </div>
                    </div>
                    {/* Mini preview — unit-aware */}
                    <div style={{ width: 96, flexShrink: 0 }}>
                      <MiniGlassCard accentHex="#22c55e" label="DAILY VOLUME" metric="ALL" value={sampleVol} sub="total · 94 sessions">
                        <BarChart heights={VOL_H} color="#22c55e" />
                      </MiniGlassCard>
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div style={{ ...cardBase(false, '#22c55e'), padding: '14px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={iconBox('#888', 0.06)}>
                  <BarChart2 size={19} color="rgba(255,255,255,0.30)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 2 }}>Daily Volume</p>
                  <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)' }}>
                    {ja
                      ? `ワークアウトをあと${Math.max(0, VOLUME_CHART_SESSION_REQUIRED - totalSessions)}日記録するとアンロック`
                      : `${Math.max(0, VOLUME_CHART_SESSION_REQUIRED - totalSessions)} more workout day${Math.max(0, VOLUME_CHART_SESSION_REQUIRED - totalSessions) !== 1 ? 's' : ''} to unlock`}
                  </p>
                </div>
                <Lock size={14} color="rgba(255,255,255,0.20)" />
              </div>
            )}

            {/* ── Body Weight ── */}
            {ctxBwHistory.length >= BW_CHART_REQUIRED ? (
              <Link href="/share?type=stats&metric=bodyweight" className="block active:opacity-70 transition-opacity">
                <div style={cardBase(true, '#60a5fa')}>
                  <div style={{ padding: '14px 15px', display: 'flex', alignItems: 'stretch', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
                          <div style={iconBox('#60a5fa')}>
                            <Activity size={19} color="#60a5fa" />
                          </div>
                          <div>
                            <p style={{ fontSize: 13.5, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>Body Weight</p>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', marginTop: 1 }}>
                              {ja ? '体重変化のグラフ' : 'Weight progress chart'}
                            </p>
                          </div>
                        </div>
                        <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.38)', lineHeight: 1.45 }}>
                          {ja ? '体重の変化をグラフ化してインスタにシェア' : 'Share your body weight change over time'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 600, color: '#60a5fa' }}>{ja ? 'Weight Graph Storyを作成' : 'Create Weight Story'}</span>
                        <ChevronRight size={12} color="#60a5fa" />
                      </div>
                    </div>
                    {/* Mini preview — unit-aware */}
                    <div style={{ width: 96, flexShrink: 0 }}>
                      <MiniGlassCard accentHex="#60a5fa" label="BODY WEIGHT" metric="PROGRESS" value={sampleBW} sub={sampleBWSub}>
                        <LineChart pts={BW_PTS} color="#60a5fa" areaColor="rgba(96,165,250,0.12)" />
                      </MiniGlassCard>
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div style={{ ...cardBase(false, '#60a5fa'), padding: '14px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={iconBox('#888', 0.06)}>
                  <Activity size={19} color="rgba(255,255,255,0.30)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 2 }}>Body Weight</p>
                  <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)' }}>
                    {ja
                      ? `体重をあと${Math.max(0, BW_CHART_REQUIRED - ctxBwHistory.length)}回記録するとアンロック`
                      : `${Math.max(0, BW_CHART_REQUIRED - ctxBwHistory.length)} more weight entr${Math.max(0, BW_CHART_REQUIRED - ctxBwHistory.length) !== 1 ? 'ies' : 'y'} to unlock`}
                  </p>
                </div>
                <Lock size={14} color="rgba(255,255,255,0.20)" />
              </div>
            )}

          </div>
        </div>

        {/* ── C. REPRA Pro info ───────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #181818 0%, #131313 100%)',
          border: '1px solid rgba(237,116,47,0.15)',
          borderRadius: 16,
          padding: '13px 14px',
          opacity: 0.82,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(237,116,47,0.10)', border: '1px solid rgba(237,116,47,0.18)' }}>
              <Crown size={15} color="rgba(237,116,47,0.65)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.58)' }}>REPRA Pro</p>
                <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.10em', padding: '2px 5px', borderRadius: 4, background: 'rgba(237,116,47,0.10)', color: 'rgba(237,116,47,0.60)', border: '1px solid rgba(237,116,47,0.15)' }}>
                  {ja ? '準備中' : 'COMING SOON'}
                </span>
              </div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', lineHeight: 1.5 }}>
                {ja
                  ? 'プレミアムテンプレート、透かし削除、長期グラフ共有などを準備中です。'
                  : 'Premium templates, watermark removal, and long-term graph sharing are planned.'}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
