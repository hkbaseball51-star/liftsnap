'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import Link from 'next/link'
import { Share2, Lock } from 'lucide-react'
import { getExercise1RMData, getExerciseDailyVolumeData } from '@/actions/analytics'
import { upsertBodyWeight } from '@/actions/bodyWeight'
import { parseFlexibleNumber } from '@/lib/number'
import { useLocale } from '@/lib/useLocale'
import { useWeightUnit } from '@/lib/useWeightUnit'
import { toDisplayWeight, weightUnitLabel } from '@/lib/units'
import { t, type Locale } from '@/lib/i18n'
import { EXERCISE_GRAPH_REQUIRED, isTrainingFeatureUnlocked } from '@/lib/unlocks'

type WeightPoint = { date: string; label: string; weight: number }
type Exercise = { name: string; muscle_group: string; logCount: number }
type RMPoint = { date: string; label: string; est1rm: number }
type VolPoint = { date: string; label: string; volume: number }

type Props = {
  bodyWeightData: WeightPoint[]
  exercises: Exercise[]
  totalSessions: number
}

const TABS = ['MAX 1RM', 'DAILY VOLUME', 'BODY WEIGHT'] as const
type Tab = typeof TABS[number]

const MUSCLE_GROUPS = ['ALL', 'CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS', 'ABS'] as const
type MuscleGroup = typeof MUSCLE_GROUPS[number]

function matchesMuscleGroup(mg: string, filter: MuscleGroup): boolean {
  if (filter === 'ALL') return true
  const m = mg.toLowerCase()
  switch (filter) {
    case 'CHEST':     return m.includes('chest')
    case 'BACK':      return m.includes('back')
    case 'LEGS':      return m.includes('leg') || m.includes('lower') || m.includes('glute')
    case 'SHOULDERS': return m.includes('shoulder')
    case 'ARMS':      return m.includes('arm') || m.includes('bicep') || m.includes('tricep')
    case 'ABS':       return m.includes('abs') || m.includes('core')
    default:          return true
  }
}

const CARD = {
  background: 'linear-gradient(135deg, rgba(255,107,0,0.05), rgba(255,255,255,0.01) 40%, rgba(255,107,0,0.03))',
  border: '1px solid rgba(255,107,0,0.22)',
  boxShadow: '0 0 30px rgba(255,107,0,0.04)',
  borderRadius: 18,
} as const

const tooltipStyle = {
  contentStyle: { background: '#111', border: '1px solid rgba(255,107,0,0.22)', borderRadius: 12, color: '#fff' },
  labelStyle: { color: '#555', fontSize: 10 },
  itemStyle: { color: '#ff6b00', fontWeight: 'bold' as const },
  cursor: { stroke: '#1a1a1a' },
}

export default function AnalyticsDashboard({ bodyWeightData, exercises, totalSessions }: Props) {
  const { locale } = useLocale()
  const { unit } = useWeightUnit()
  const unitLabel = weightUnitLabel(unit)
  const [tab, setTab] = useState<Tab>('MAX 1RM')
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup>('ALL')
  const [selectedExercise, setSelectedExercise] = useState(exercises[0]?.name ?? '')

  const [rmData, setRmData] = useState<RMPoint[]>([])
  const [rmLoading, startRmTransition] = useTransition()

  const [volData, setVolData] = useState<VolPoint[]>([])
  const [volLoading, startVolTransition] = useTransition()

  const [bwData, setBwData]   = useState(bodyWeightData)
  const [bwInput, setBwInput] = useState(() => {
    const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0]
    const entry = bodyWeightData.find(p => p.date === today)
    return entry ? String(entry.weight) : ''
  })
  const [bwSaving, setBwSaving] = useState(false)
  const [bwToast, setBwToast]   = useState<{ msg: string; ok: boolean } | null>(null)

  const filteredExercises = exercises.filter(e => matchesMuscleGroup(e.muscle_group, muscleFilter))

  // Auto-load data when tab or selected exercise changes
  useEffect(() => {
    if (!selectedExercise) return
    if (tab === 'MAX 1RM') {
      setRmData([])
      startRmTransition(async () => {
        const data = await getExercise1RMData(selectedExercise)
        setRmData(data)
      })
    } else if (tab === 'DAILY VOLUME') {
      setVolData([])
      startVolTransition(async () => {
        const data = await getExerciseDailyVolumeData(selectedExercise)
        setVolData(data)
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selectedExercise])

  const handleMuscleFilter = (mg: MuscleGroup) => {
    setMuscleFilter(mg)
    const newFiltered = exercises.filter(e => matchesMuscleGroup(e.muscle_group, mg))
    if (newFiltered.length > 0 && !newFiltered.find(e => e.name === selectedExercise)) {
      setSelectedExercise(newFiltered[0].name)
    }
  }

  const showBwToast = (msg: string, ok: boolean) => {
    setBwToast({ msg, ok })
    setTimeout(() => setBwToast(null), 2500)
  }

  const saveBW = async () => {
    const v = parseFlexibleNumber(bwInput)
    if (v === null || v < 20 || v > 300) return
    if (bwSaving) return
    setBwSaving(true)
    try {
      await upsertBodyWeight(v)
      const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0]
      const [, mm, dd] = today.split('-')
      const label = `${parseInt(mm)}/${parseInt(dd)}`
      setBwData(prev => {
        const filtered = prev.filter(p => p.date !== today)
        return [...filtered, { date: today, label, weight: v }].sort((a, b) => a.date.localeCompare(b.date))
      })
      showBwToast(t(locale, 'analytics.weightLogged'), true)
    } catch {
      showBwToast(t(locale, 'analytics.weightError'), false)
    } finally {
      setBwSaving(false)
    }
  }

  const todayJST     = new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0]
  const todaySaved   = bwData.some(p => p.date === todayJST)
  const bwParsed     = bwInput !== '' ? parseFlexibleNumber(bwInput) : null
  const bwInputValid = bwParsed !== null && bwParsed >= 20 && bwParsed <= 300
  const latestWeight = bwData.length > 0 ? bwData[bwData.length - 1].weight : null
  const bestRM = rmData.length > 0 ? Math.max(...rmData.map(p => p.est1rm)) : null
  const totalVol = volData.reduce((s, p) => s + p.volume, 0)

  // Display-unit converted data for charts
  const rmDataDisplay = rmData.map(p => ({ ...p, est1rm: Math.round(toDisplayWeight(p.est1rm, unit)) }))
  const volDataDisplay = volData.map(p => ({ ...p, volume: Math.round(toDisplayWeight(p.volume, unit)) }))
  const showExerciseSelector = tab !== 'BODY WEIGHT' && exercises.length > 0

  const exerciseLogCount      = exercises.find(e => e.name === selectedExercise)?.logCount ?? 0
  const exerciseShareUnlocked = exerciseLogCount >= EXERCISE_GRAPH_REQUIRED
  const lineChartUnlocked     = isTrainingFeatureUnlocked('basic_chart', totalSessions)
  const exerciseProgressUnlocked = isTrainingFeatureUnlocked('exercise_progress', totalSessions)

  return (
    <div className="min-h-screen px-4 pt-14 pb-nav" style={{ background: '#0a0a0a' }}>
      <h1 className="text-xl font-black tracking-widest text-white mb-5">ANALYTICS</h1>

      {/* Tab bar */}
      <div className="flex gap-1 mb-4 p-1 rounded-2xl" style={{ background: '#111', border: '1px solid rgba(255,107,0,0.1)' }}>
        {TABS.map(t => (
          <button key={t}
            className="flex-1 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all"
            style={{
              background: tab === t ? '#ff6b00' : 'transparent',
              color: tab === t ? '#fff' : '#555',
            }}
            onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab description */}
      <p className="text-[11px] mb-4 leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
        {tab === 'MAX 1RM'
          ? t(locale, 'analytics.tab1RMDesc')
          : tab === 'DAILY VOLUME'
            ? t(locale, 'analytics.tabVolumeDesc')
            : t(locale, 'analytics.tabBWDesc')}
      </p>

      {/* Muscle group + exercise selector */}
      {showExerciseSelector && (
        <>
          {/* Muscle group filter */}
          <div className="overflow-x-auto no-scrollbar mb-3">
            <div className="flex gap-1.5 pb-1">
              {MUSCLE_GROUPS.map(mg => (
                <button key={mg}
                  className="shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider transition-all"
                  style={{
                    background: muscleFilter === mg ? 'rgba(255,107,0,0.14)' : '#111',
                    color: muscleFilter === mg ? '#FF6B00' : '#444',
                    border: muscleFilter === mg ? '1px solid rgba(255,107,0,0.35)' : '1px solid #1e1e1e',
                  }}
                  onClick={() => handleMuscleFilter(mg)}>
                  {mg}
                </button>
              ))}
            </div>
          </div>

          {/* Exercise chips */}
          {filteredExercises.length === 0 ? (
            <p className="text-xs font-bold mb-4" style={{ color: '#444' }}>{t(locale, 'analytics.noGroupData')}</p>
          ) : (
            <div className="overflow-x-auto no-scrollbar mb-4">
              <div className="flex gap-2 pb-1">
                {filteredExercises.map(e => (
                  <button key={e.name}
                    className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide transition-all"
                    style={{
                      background: selectedExercise === e.name ? '#FF6B00' : '#111',
                      color: selectedExercise === e.name ? '#fff' : '#555',
                      border: selectedExercise === e.name ? 'none' : '1px solid #1e1e1e',
                    }}
                    onClick={() => setSelectedExercise(e.name)}>
                    {e.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* MAX 1RM Tab */}
      {tab === 'MAX 1RM' && (
        <div>
          {!exerciseProgressUnlocked ? (
            !lineChartUnlocked
              ? <MilestoneLock label="LINE CHART" current={totalSessions} required={5} locale={locale} />
              : <MilestoneLock label="EXERCISE PROGRESS" current={totalSessions} required={10} locale={locale} />
          ) : exercises.length === 0 ? (
            <EmptyState />
          ) : filteredExercises.length === 0 ? (
            <NoGroupData />
          ) : (
            <>
              {/* Summary card */}
              <div className="rounded-2xl p-4 mb-3 flex items-center justify-between" style={CARD}>
                <div>
                  <p className="text-[10px] font-black tracking-widest mb-1.5" style={{ color: '#FF6B00' }}>BEST 1RM</p>
                  {rmLoading ? (
                    <p style={{ fontSize: 28, fontWeight: 900, color: '#333', fontFamily: 'var(--font-mono)' }}>...</p>
                  ) : bestRM !== null ? (
                    <div className="flex items-baseline gap-1">
                      <span style={{ fontSize: 36, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em', lineHeight: 1 }}>{toDisplayWeight(bestRM, unit)}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>{unitLabel}</span>
                    </div>
                  ) : (
                    <p style={{ fontSize: 28, fontWeight: 900, color: '#333', fontFamily: 'var(--font-mono)' }}>—</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>SESSIONS</p>
                  <p style={{ fontSize: 36, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {rmLoading ? '...' : rmData.length > 0 ? rmData.length : '—'}
                  </p>
                </div>
              </div>

              {/* 1RM chart */}
              <div className="rounded-2xl p-4 mb-3" style={CARD}>
                <p className="text-[10px] font-black tracking-widest mb-4" style={{ color: '#FF6B00' }}>1RM PROGRESSION</p>
                {rmLoading ? (
                  <LoadingChart />
                ) : rmData.length === 0 ? (
                  <ChartEmpty />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={rmDataDisplay} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                      <XAxis dataKey="label" tick={{ fill: '#444', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#444', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} ${unitLabel}`, 'Est. 1RM']} />
                      <Line type="monotone" dataKey="est1rm" stroke="#ff6b00" strokeWidth={2.5}
                        dot={{ fill: '#ff6b00', r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: '#ff6b00' }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* History list */}
              {rmData.length > 0 && (
                <>
                  <div className="rounded-2xl overflow-hidden" style={CARD}>
                    <div className="px-4 pt-4 pb-2">
                      <p className="text-[10px] font-black tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>SESSION HISTORY</p>
                    </div>
                    {[...rmDataDisplay].reverse().slice(0, 6).map((p, i) => {
                      const origEst1rm = [...rmData].reverse()[i]?.est1rm
                      return (
                        <div key={p.date} className="flex items-center justify-between px-4 py-2.5"
                          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                          <span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>{p.label}</span>
                          <div className="flex items-baseline gap-1">
                            <span style={{ fontSize: 16, fontWeight: 700, color: bestRM !== null && origEst1rm === bestRM ? '#FF6B00' : '#fff', fontFamily: 'var(--font-mono)' }}>{p.est1rm}</span>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{unitLabel}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {exerciseShareUnlocked ? (
                    <Link
                      href={`/share?type=stats&metric=max1rm&exercise=${encodeURIComponent(selectedExercise)}`}
                      className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl"
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: 13,
                        fontWeight: 500,
                      }}>
                      <Share2 size={14} strokeWidth={1.5} />
                      Share Story
                    </Link>
                  ) : (
                    <div className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl"
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.04)',
                        color: '#333',
                        fontSize: 13,
                        fontWeight: 500,
                      }}>
                      <Lock size={13} strokeWidth={1.5} />
                      Share Story · {exerciseLogCount}/{EXERCISE_GRAPH_REQUIRED} {t(locale, 'analytics.shareLogsUnit')}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* DAILY VOLUME Tab */}
      {tab === 'DAILY VOLUME' && (
        <div>
          {!exerciseProgressUnlocked ? (
            !lineChartUnlocked
              ? <MilestoneLock label="LINE CHART" current={totalSessions} required={5} locale={locale} />
              : <MilestoneLock label="EXERCISE PROGRESS" current={totalSessions} required={10} locale={locale} />
          ) : exercises.length === 0 ? (
            <EmptyState />
          ) : filteredExercises.length === 0 ? (
            <NoGroupData />
          ) : (
            <>
              {/* Summary card */}
              <div className="rounded-2xl p-4 mb-3 flex items-center justify-between" style={CARD}>
                <div>
                  <p className="text-[10px] font-black tracking-widest mb-1.5" style={{ color: '#FF6B00' }}>TOTAL VOLUME</p>
                  {volLoading ? (
                    <p style={{ fontSize: 28, fontWeight: 900, color: '#333', fontFamily: 'var(--font-mono)' }}>...</p>
                  ) : totalVol > 0 ? (
                    (() => {
                      const displayTotalVol = Math.round(toDisplayWeight(totalVol, unit))
                      const threshold = 10000
                      const volStr = displayTotalVol >= threshold ? `${(displayTotalVol / 1000).toFixed(1)}k` : displayTotalVol.toLocaleString()
                      const volSuffix = displayTotalVol >= threshold ? '' : unitLabel
                      return (
                        <div className="flex items-baseline gap-1">
                          <span style={{ fontSize: 36, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                            {volStr}
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>
                            {volSuffix}
                          </span>
                        </div>
                      )
                    })()
                  ) : (
                    <p style={{ fontSize: 28, fontWeight: 900, color: '#333', fontFamily: 'var(--font-mono)' }}>—</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>SESSIONS</p>
                  <p style={{ fontSize: 36, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {volLoading ? '...' : volData.length > 0 ? volData.length : '—'}
                  </p>
                </div>
              </div>

              {/* Volume chart */}
              <div className="rounded-2xl p-4 mb-3" style={CARD}>
                <p className="text-[10px] font-black tracking-widest mb-4" style={{ color: '#FF6B00' }}>DAILY VOLUME</p>
                {volLoading ? (
                  <LoadingChart />
                ) : volData.length === 0 ? (
                  <ChartEmpty />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={volDataDisplay} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: '#444', fontSize: 9 }} tickLine={false} axisLine={false}
                        interval={Math.max(0, Math.floor(volDataDisplay.length / 5) - 1)} />
                      <YAxis tick={{ fill: '#444', fontSize: 10 }} tickLine={false} axisLine={false}
                        tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                      <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v.toLocaleString()} ${unitLabel}`, 'Volume']} />
                      <Bar dataKey="volume" fill="#ff6b00" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Volume history list */}
              {volData.length > 0 && (
                <>
                  <div className="rounded-2xl overflow-hidden" style={CARD}>
                    <div className="px-4 pt-4 pb-2">
                      <p className="text-[10px] font-black tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>SESSION HISTORY</p>
                    </div>
                    {[...volDataDisplay].reverse().slice(0, 8).map(p => (
                      <div key={p.date} className="flex items-center justify-between px-4 py-2.5"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>{p.label}</span>
                        <div className="flex items-baseline gap-1">
                          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                            {p.volume >= 1000 ? `${(p.volume / 1000).toFixed(1)}k` : p.volume.toLocaleString()}
                          </span>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{unitLabel}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {exerciseShareUnlocked ? (
                    <Link
                      href={`/share?type=stats&metric=volume&exercise=${encodeURIComponent(selectedExercise)}`}
                      className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl"
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: 13,
                        fontWeight: 500,
                      }}>
                      <Share2 size={14} strokeWidth={1.5} />
                      Share Story
                    </Link>
                  ) : (
                    <div className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl"
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.04)',
                        color: '#333',
                        fontSize: 13,
                        fontWeight: 500,
                      }}>
                      <Lock size={13} strokeWidth={1.5} />
                      Share Story · {exerciseLogCount}/{EXERCISE_GRAPH_REQUIRED} {t(locale, 'analytics.shareLogsUnit')}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* BODY WEIGHT Tab */}
      {tab === 'BODY WEIGHT' && (
        <div>
          {/* Toast */}
          {bwToast && (
            <div style={{
              position: 'fixed',
              bottom: 88,
              left: '50%',
              transform: 'translateX(-50%)',
              background: bwToast.ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
              border: `1px solid ${bwToast.ok ? '#22c55e' : '#ef4444'}`,
              borderRadius: 999,
              padding: '8px 20px',
              fontSize: 12,
              fontWeight: 700,
              color: bwToast.ok ? '#22c55e' : '#ef4444',
              zIndex: 999,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}>
              {bwToast.msg}
            </div>
          )}

          <div className="rounded-2xl p-4 mb-4 flex items-center gap-3" style={CARD}>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-[10px] font-black tracking-widest" style={{ color: '#FF6B00' }}>TODAY&apos;S WEIGHT</p>
                {todaySaved && (
                  <span className="text-[9px] font-black tracking-wider" style={{ color: '#22c55e' }}>SAVED</span>
                )}
              </div>
              <div className="flex items-baseline gap-1.5">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={latestWeight ? String(latestWeight) : '70.0'}
                  value={bwInput}
                  onChange={e => setBwInput(e.target.value)}
                  className="w-20 bg-transparent text-white text-xl font-black outline-none"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
                <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>kg</span>
              </div>
              {bwInput && !bwInputValid && (
                <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{t(locale, 'analytics.bwInputError')}</p>
              )}
            </div>
            <button
              className="px-5 py-3 rounded-xl text-xs font-black tracking-widest transition-opacity"
              style={{
                background: bwInputValid ? '#ff6b00' : 'rgba(255,255,255,0.04)',
                color: bwInputValid ? '#fff' : '#444',
                border: bwInputValid ? 'none' : '1px solid rgba(255,255,255,0.06)',
                opacity: bwSaving ? 0.6 : 1,
              }}
              disabled={!bwInputValid || bwSaving}
              onClick={saveBW}>
              {bwSaving ? '...' : 'LOG'}
            </button>
          </div>

          {latestWeight && (
            <div className="rounded-2xl p-4 mb-4 flex items-center justify-between" style={CARD}>
              <div>
                <p className="text-[10px] font-black tracking-widest mb-1.5" style={{ color: '#FF6B00' }}>LATEST</p>
                <div className="flex items-baseline gap-1">
                  <span style={{ fontSize: 36, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em', lineHeight: 1 }}>{latestWeight}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, marginLeft: 3, color: 'rgba(255,255,255,0.3)' }}>kg</span>
                </div>
              </div>
              {bwData.length >= 2 && (() => {
                const diff = bwData[bwData.length - 1].weight - bwData[0].weight
                return (
                  <div className="text-right">
                    <p className="text-[10px] font-black tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>CHANGE</p>
                    <div className="flex items-baseline gap-1 justify-end">
                      <span style={{ fontSize: 28, fontWeight: 900, color: diff <= 0 ? '#22c55e' : '#ef4444', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>kg</span>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          <div className="rounded-2xl p-4" style={CARD}>
            <p className="text-[10px] font-black tracking-widest mb-4" style={{ color: '#FF6B00' }}>BODY WEIGHT (90 DAYS)</p>
            {bwData.length < 2 ? (
              <div className="h-48 flex items-center justify-center">
                <p className="text-xs font-bold" style={{ color: '#555' }}>{t(locale, 'analytics.bwChartEmpty')}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={bwData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                  <XAxis dataKey="label" tick={{ fill: '#444', fontSize: 10 }} tickLine={false} axisLine={false}
                    interval={Math.floor(bwData.length / 6)} />
                  <YAxis tick={{ fill: '#444', fontSize: 10 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} kg`, 'Weight']} />
                  <ReferenceLine y={bwData[0]?.weight} stroke="#222" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="weight" stroke="#9B72E8" strokeWidth={2.5}
                    dot={{ fill: '#9B72E8', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#9B72E8' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          {bwData.length > 0 && (
            <Link
              href="/share?type=stats&metric=bodyweight"
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl"
              style={{
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.4)',
                fontSize: 13,
                fontWeight: 500,
              }}>
              <Share2 size={14} strokeWidth={1.5} />
              Share Story
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  const { locale } = useLocale()
  return (
    <div className="rounded-2xl p-10 text-center" style={{
      background: 'linear-gradient(135deg, rgba(255,107,0,0.05), rgba(255,255,255,0.01) 40%, rgba(255,107,0,0.03))',
      border: '1px solid rgba(255,107,0,0.22)',
      borderRadius: 18,
    }}>
      <p style={{ fontSize: 32, marginBottom: 12 }}>📊</p>
      <p className="text-base font-bold text-white mb-2">{t(locale, 'analytics.noDataYet')}</p>
      <p className="text-sm font-bold" style={{ color: '#555' }}>{t(locale, 'analytics.logFirstSet')}</p>
    </div>
  )
}

function NoGroupData() {
  const { locale } = useLocale()
  return (
    <div className="rounded-2xl p-8 text-center" style={{
      background: '#111',
      border: '1px solid rgba(255,107,0,0.22)',
      borderRadius: 18,
    }}>
      <p className="text-sm font-bold" style={{ color: '#555' }}>{t(locale, 'analytics.noGroupData')}</p>
    </div>
  )
}

function LoadingChart() {
  return (
    <div className="h-48 flex items-center justify-center">
      <p className="text-xs font-black tracking-widest" style={{ color: '#444' }}>LOADING...</p>
    </div>
  )
}

function ChartEmpty() {
  const { locale } = useLocale()
  return (
    <div className="h-48 flex items-center justify-center flex-col gap-2">
      <p className="text-sm font-bold" style={{ color: '#555' }}>{t(locale, 'analytics.noDataYet')}</p>
      <p className="text-xs font-bold" style={{ color: '#333' }}>{t(locale, 'analytics.chartNoData')}</p>
    </div>
  )
}

function MilestoneLock({ label, current, required, locale }: {
  label: string; current: number; required: number; locale: Locale
}) {
  const pct       = Math.min((current / required) * 100, 100)
  const remaining = Math.max(required - current, 0)
  const unlockText = locale === 'ja'
    ? `${required}${t(locale, 'analytics.lockSessions')}`
    : `${t(locale, 'analytics.lockUnlockAt')} ${required} ${t(locale, 'analytics.lockSessions')}`
  const remainingText = locale === 'ja'
    ? `あと${remaining}${t(locale, 'analytics.lockRemaining')}`
    : `${remaining} more session${remaining !== 1 ? 's' : ''} to go`
  return (
    <div className="rounded-2xl p-6" style={{ background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Lock size={13} strokeWidth={1.5} style={{ color: '#444' }} />
        <p className="text-[10px] font-black tracking-widest" style={{ color: '#444' }}>{label}</p>
      </div>
      <p className="text-sm font-bold mb-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>{unlockText}</p>
      <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.40)' }}>{remainingText}</p>
      <div className="h-1 rounded-full mb-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: 'rgba(255,107,0,0.55)', transition: 'width 0.4s ease' }} />
      </div>
      <p className="text-[10px] text-right" style={{ color: '#3a3a3a' }}>{current} / {required}</p>
    </div>
  )
}
