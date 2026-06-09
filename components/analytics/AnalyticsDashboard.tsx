'use client'

import { useState, useEffect, useRef, useTransition, useMemo, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import Link from 'next/link'
import { Share2, Maximize2, Settings } from 'lucide-react'
import { getExercise1RMData, getBodyPartDailyVolumeData } from '@/actions/analytics'
import {
  localGetExercise1RMData,
  localGetBodyPartDailyVolumeData,
} from '@/lib/localDB'
import { useDemoMode } from '@/lib/useDemoMode'
import {
  getDemoExercise1RMData,
  getDemoBodyPartVolumeData,
} from '@/actions/demo'
import { parseFlexibleNumber } from '@/lib/number'
import { useLocale } from '@/lib/useLocale'
import { useWeightUnit } from '@/lib/useWeightUnit'
import { toDisplayWeight, fromDisplayWeight, weightUnitLabel } from '@/lib/units'
import { t, type Locale } from '@/lib/i18n'
import { BW_CHART_REQUIRED, VOLUME_CHART_SESSION_REQUIRED, EXERCISE_GRAPH_REQUIRED } from '@/lib/unlocks'
import { type Period, PERIODS, getStartDate, aggregateBodyWeight, aggregateVolume, aggregate1RM } from '@/lib/chartAggregation'
import { smartYAxis, yAxisTicks, computeChartWidth, getPointWidth, buildXAxisConfig, formatTooltipDate } from '@/lib/chartUtils'
import { useAppData } from '@/contexts/AppDataContext'

type WeightPoint = { date: string; label: string; weight: number }
type Exercise = { name: string; muscle_group: string; logCount: number }
type RMPoint = { date: string; label: string; est1rm: number }
type VolPoint = { date: string; label: string; volume: number }

// Props kept for backward compatibility but data now comes from AppDataContext.
type Props = {
  bodyWeightData?: WeightPoint[]
  exercises?: Exercise[]
  totalSessions?: number
  useLocalDB?: boolean
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
    case 'LEGS':      return m.includes('quad') || m.includes('hamstring') || m.includes('glute')
                          || m.includes('calf') || m.includes('calve') || m.includes('leg')
                          || m.includes('lower')
    case 'SHOULDERS': return m.includes('shoulder')
    case 'ARMS':      return m.includes('bicep') || m.includes('tricep') || m.includes('forearm')
    case 'ABS':       return m.includes('abs') || m.includes('core')
    default:          return true
  }
}

const VOL_BODY_PARTS = ['ALL', 'CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS', 'ABS', 'OTHER'] as const
type VolBodyPart = typeof VOL_BODY_PARTS[number]

const VOL_BODY_PART_JA: Record<VolBodyPart, string> = {
  ALL: '全体', CHEST: '胸', BACK: '背中', LEGS: '脚',
  SHOULDERS: '肩', ARMS: '腕', ABS: '腹筋', OTHER: 'その他',
}

const CARD = {
  background: 'linear-gradient(135deg, rgba(237,116,47,0.025), rgba(255,255,255,0.01) 50%, rgba(237,116,47,0.015))',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 18,
} as const

function periodToRange(p: Period): string {
  return ({ '30D':'30d','90D':'90d','6M':'6m','1Y':'1y','All':'all' } as Record<Period,string>)[p]
}

export default function AnalyticsDashboard({ useLocalDB }: Props) {
  const { locale } = useLocale()
  const ja = locale === 'ja'
  const { unit, mounted: unitMounted } = useWeightUnit()
  const { isDemo, demoUserId, mounted: demoMounted } = useDemoMode()

  // All workout + body weight data comes from the shared Provider
  const {
    exercises:         ctxExercises,
    totalSessions:     ctxTotalSessions,
    bodyWeightHistory: ctxBwHistory,
    addBodyWeight,
  } = useAppData()

  const unitLabel = weightUnitLabel(unit)
  const bwMin = unit === 'lbs' ? 44 : 20
  const bwMax = unit === 'lbs' ? 661 : 300
  const [tab, setTab] = useState<Tab>('MAX 1RM')
  const [period, setPeriod] = useState<Period>('90D')
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup>('ALL')
  const [selectedExercise, setSelectedExercise] = useState('')
  const [volBodyPart, setVolBodyPart] = useState<VolBodyPart>('ALL')

  const [rmData, setRmData] = useState<RMPoint[]>([])
  const [rmLoading, startRmTransition] = useTransition()

  const [volData, setVolData] = useState<VolPoint[]>([])
  const [volLoading, startVolTransition] = useTransition()

  const rmScrollRef  = useRef<HTMLDivElement>(null)
  const volScrollRef = useRef<HTMLDivElement>(null)
  const bwScrollRef  = useRef<HTMLDivElement>(null)

  const [bwInput, setBwInput] = useState('')
  const [bwToast, setBwToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const [innerW, setInnerW] = useState(316)

  // Auto-select first exercise when exercise list loads
  useEffect(() => {
    if (!selectedExercise && ctxExercises.length > 0) {
      setSelectedExercise(ctxExercises[0].name)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxExercises.length])

  useEffect(() => {
    let raf: ReturnType<typeof requestAnimationFrame> | null = null
    const update = () => {
      if (raf !== null) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => { setInnerW(Math.max(280, window.innerWidth - 64)) })
    }
    update()
    window.addEventListener('resize', update, { passive: true })
    return () => {
      window.removeEventListener('resize', update)
      if (raf !== null) cancelAnimationFrame(raf)
    }
  }, [])

  const activeExercises     = ctxExercises
  const activeTotalSessions = ctxTotalSessions
  const filteredExercises = useMemo(() =>
    activeExercises.filter(e => matchesMuscleGroup(e.muscle_group, muscleFilter)),
  [activeExercises, muscleFilter])

  const selectedExerciseLogCount = useMemo(
    () => activeExercises.find(e => e.name === selectedExercise)?.logCount ?? 0,
    [activeExercises, selectedExercise]
  )

  // Auto-load chart data when tab, exercise/bodypart, or period changes
  useEffect(() => {
    if (!demoMounted) return
    const startDate = getStartDate(period) ?? undefined
    if (tab === 'MAX 1RM') {
      if (!selectedExercise) return
      setRmData([])
      if (isDemo && demoUserId) {
        startRmTransition(async () => {
          const data = await getDemoExercise1RMData(demoUserId, selectedExercise, startDate)
          setRmData(data)
        })
      } else if (useLocalDB) {
        setRmData(localGetExercise1RMData(selectedExercise, startDate))
      } else {
        startRmTransition(async () => {
          const data = await getExercise1RMData(selectedExercise, startDate)
          setRmData(data)
        })
      }
    } else if (tab === 'DAILY VOLUME') {
      setVolData([])
      if (isDemo && demoUserId) {
        startVolTransition(async () => {
          const data = await getDemoBodyPartVolumeData(demoUserId, volBodyPart.toLowerCase(), startDate)
          setVolData(data)
        })
      } else if (useLocalDB) {
        setVolData(localGetBodyPartDailyVolumeData(volBodyPart.toLowerCase(), startDate))
      } else {
        startVolTransition(async () => {
          const data = await getBodyPartDailyVolumeData(volBodyPart.toLowerCase(), startDate)
          setVolData(data)
        })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selectedExercise, volBodyPart, period, useLocalDB, demoMounted, isDemo, demoUserId])

  // Sync bwInput when body weight data or unit resolves (whichever comes last)
  useEffect(() => {
    if (!unitMounted || ctxBwHistory.length === 0) return
    const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0]
    const entry = ctxBwHistory.find(p => p.date === today)
    if (entry) setBwInput(String(toDisplayWeight(entry.weight, unit)))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitMounted, ctxBwHistory.length, unit])

  // Scroll charts to show latest (rightmost) data on load or period change
  useEffect(() => {
    const refs = [rmScrollRef, volScrollRef, bwScrollRef]
    refs.forEach(r => { if (r.current) r.current.scrollLeft = r.current.scrollWidth })
  }, [period, rmData.length, volData.length, ctxBwHistory.length])

  const handleMuscleFilter = (mg: MuscleGroup) => {
    setMuscleFilter(mg)
    const newFiltered = activeExercises.filter(e => matchesMuscleGroup(e.muscle_group, mg))
    if (newFiltered.length > 0 && !newFiltered.find(e => e.name === selectedExercise)) {
      setSelectedExercise(newFiltered[0].name)
    }
  }

  const showBwToast = (msg: string, ok: boolean) => {
    setBwToast({ msg, ok })
    setTimeout(() => setBwToast(null), 2500)
  }

  const saveBW = () => {
    if (isDemo) { showBwToast('Demo mode: saving disabled', false); return }
    const v = parseFlexibleNumber(bwInput)
    if (v === null || v < bwMin || v > bwMax) return
    const vKg = fromDisplayWeight(v, unit)
    const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0]
    // addBodyWeight saves to localStorage AND updates Provider state (chart re-renders)
    addBodyWeight(vKg, today)
    showBwToast(t(locale, 'analytics.weightLogged'), true)
  }

  const todayJST     = new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0]
  const todaySaved   = useMemo(() => ctxBwHistory.some(p => p.date === todayJST), [ctxBwHistory, todayJST])
  const bwParsed     = bwInput !== '' ? parseFlexibleNumber(bwInput) : null
  const bwInputValid = bwParsed !== null && bwParsed >= bwMin && bwParsed <= bwMax
  const latestWeight = useMemo(() =>
    ctxBwHistory.length > 0 ? ctxBwHistory[ctxBwHistory.length - 1].weight : null,
  [ctxBwHistory])

  // Period-filtered + aggregated data — memoized to avoid re-computing on every render
  const bwDataDisplay = useMemo(() => {
    const start = getStartDate(period)
    const filtered = start ? ctxBwHistory.filter(p => p.date >= start) : ctxBwHistory
    return aggregateBodyWeight(filtered).map(p => ({ ...p, weight: Math.round(toDisplayWeight(p.weight, unit) * 10) / 10 }))
  }, [ctxBwHistory, period, unit])

  const rmDataDisplay = useMemo(() =>
    aggregate1RM(rmData).map(p => ({ ...p, est1rm: Math.round(toDisplayWeight(p.est1rm, unit)) })),
  [rmData, unit])

  const volDataDisplay = useMemo(() =>
    aggregateVolume(volData).map(p => ({ ...p, volume: Math.round(toDisplayWeight(p.volume, unit)) })),
  [volData, unit])

  const bestRM = useMemo(() =>
    rmData.length > 0 ? Math.max(...rmData.map(p => p.est1rm)) : null,
  [rmData])

  const totalVol = useMemo(() => volData.reduce((s, p) => s + p.volume, 0), [volData])
  const showExerciseSelector = tab === 'MAX 1RM' && activeExercises.length > 0


  const periodLabel = ja
    ? ({ '30D': '30日間', '90D': '90日間', '6M': '6ヶ月', '1Y': '1年', 'All': '全期間' } as Record<string, string>)[period] ?? period
    : ({ '30D': '30 DAYS', '90D': '90 DAYS', '6M': '6 MONTHS', '1Y': '1 YEAR', 'All': 'ALL TIME' } as Record<string, string>)[period] ?? period

  const PERIOD_BTN_LABEL_JA: Record<string, string> = {
    '30D': '30日', '90D': '90日', '6M': '6ヶ月', '1Y': '1年', 'All': '全期間',
  }
  const MUSCLE_GROUP_LABEL_JA: Record<string, string> = {
    ALL: 'すべて', CHEST: '胸', BACK: '背中', LEGS: '脚', SHOULDERS: '肩', ARMS: '腕', ABS: '腹筋',
  }

  // RM chart config — memoized
  const rmAxis   = useMemo(() => smartYAxis(rmDataDisplay.map(p => p.est1rm), 'rm'), [rmDataDisplay])
  const rmTicks  = useMemo(() => yAxisTicks(rmAxis.yMin, rmAxis.yMax, rmAxis.step), [rmAxis])
  const rmChartW = useMemo(() => computeChartWidth(rmDataDisplay.length, innerW, getPointWidth(period, 'line')), [rmDataDisplay.length, innerW, period])
  const rmGrowth = useMemo(() =>
    rmDataDisplay.length >= 2
      ? rmDataDisplay[rmDataDisplay.length - 1].est1rm - rmDataDisplay[0].est1rm
      : null,
  [rmDataDisplay])
  const rmXAxis  = useMemo(() => buildXAxisConfig(rmDataDisplay, rmChartW, period), [rmDataDisplay, rmChartW, period])

  // Volume chart config — memoized
  const volAxis   = useMemo(() => smartYAxis(volDataDisplay.map(p => p.volume), 'volume'), [volDataDisplay])
  const volTicks  = useMemo(() => yAxisTicks(0, volAxis.yMax, volAxis.step), [volAxis])
  const volChartW = useMemo(() => computeChartWidth(volDataDisplay.length, innerW, getPointWidth(period, 'bar')), [volDataDisplay.length, innerW, period])
  const volXAxis  = useMemo(() => buildXAxisConfig(volDataDisplay, volChartW, period), [volDataDisplay, volChartW, period])

  // BW chart config — memoized
  const bwAxis   = useMemo(() => smartYAxis(bwDataDisplay.map(p => p.weight), 'bw'), [bwDataDisplay])
  const bwTicks  = useMemo(() => yAxisTicks(bwAxis.yMin, bwAxis.yMax, bwAxis.step), [bwAxis])
  const bwChartW = useMemo(() => computeChartWidth(bwDataDisplay.length, innerW, getPointWidth(period, 'line')), [bwDataDisplay.length, innerW, period])
  const bwXAxis  = useMemo(() => buildXAxisConfig(bwDataDisplay, bwChartW, period), [bwDataDisplay, bwChartW, period])

  // Custom dot renderer — latest point is larger with white ring — useCallback to keep stable ref
  const rmDot = useCallback((props: any) => {
    const { cx, cy, index } = props
    if (index === rmDataDisplay.length - 1) {
      return (
        <g key="rm-dot-l">
          <circle cx={cx} cy={cy} r={9} fill="#ED742F" fillOpacity={0.12} />
          <circle cx={cx} cy={cy} r={5} fill="#ED742F" stroke="rgba(255,255,255,0.88)" strokeWidth={1.5} />
        </g>
      )
    }
    return <circle key={`rm-dot-${index}`} cx={cx} cy={cy} r={2} fill="#ED742F" fillOpacity={0.6} />
  }, [rmDataDisplay.length])

  const bwDot = useCallback((props: any) => {
    const { cx, cy, index } = props
    if (index === bwDataDisplay.length - 1) {
      return (
        <g key="bw-dot-l">
          <circle cx={cx} cy={cy} r={7} fill="#94A3B8" fillOpacity={0.15} />
          <circle cx={cx} cy={cy} r={4} fill="#94A3B8" stroke="rgba(255,255,255,0.75)" strokeWidth={1.5} />
        </g>
      )
    }
    return <circle key={`bw-dot-${index}`} cx={cx} cy={cy} r={1} fill="#94A3B8" fillOpacity={0.5} />
  }, [bwDataDisplay.length])

  const rmTooltip = (tProps: any) => {
    const { active, payload, label } = tProps
    if (!active || !payload?.length) return null
    const point = payload[0].payload as { date: string; est1rm: number }
    const idx = rmDataDisplay.findIndex(d => d.date === point.date)
    const current = point.est1rm
    const sinceFirst = idx > 0 ? current - rmDataDisplay[0].est1rm : null
    const fromPrev   = idx > 0 ? current - rmDataDisplay[idx - 1].est1rm : null
    return (
      <div style={{ background: '#0d0d0d', border: '1px solid rgba(237,116,47,0.35)', borderRadius: 10, padding: '9px 13px', pointerEvents: 'none', minWidth: 148 }}>
        <p style={{ color: '#484848', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 7 }}>{ja ? fmtDateJa(label) : formatTooltipDate(label)}</p>
        <div style={{ marginBottom: sinceFirst !== null ? 4 : 0 }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 600, letterSpacing: '0.05em' }}>{ja ? '推定1RM  ' : 'EST. 1RM  '}</span>
          <span style={{ color: '#ED742F', fontSize: 14, fontWeight: 900 }}>{current}</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9 }}> {unitLabel}</span>
        </div>
        {sinceFirst !== null && (
          <p style={{ color: sinceFirst >= 0 ? '#ED742F' : '#888', fontSize: 10, marginTop: 4 }}>
            {sinceFirst >= 0 ? '+' : ''}{sinceFirst} {unitLabel}
            <span style={{ color: 'rgba(255,255,255,0.25)', marginLeft: 4 }}>{ja ? '初回から' : 'since first'}</span>
          </p>
        )}
        {fromPrev !== null && fromPrev !== 0 && (
          <p style={{ color: fromPrev > 0 ? '#ED742F' : '#888', fontSize: 10, marginTop: 1 }}>
            {fromPrev > 0 ? '+' : ''}{fromPrev} {unitLabel}
            <span style={{ color: 'rgba(255,255,255,0.25)', marginLeft: 4 }}>{ja ? '前回から' : 'from prev'}</span>
          </p>
        )}
        {fromPrev === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.16)', fontSize: 10, marginTop: 1 }}>
            ±0 {unitLabel}<span style={{ marginLeft: 4 }}>{ja ? '前回から' : 'from prev'}</span>
          </p>
        )}
      </div>
    )
  }

  const bwTooltip = (tProps: any) => {
    const { active, payload, label } = tProps
    if (!active || !payload?.length) return null
    const point = payload[0].payload as { date: string; weight: number }
    const idx = bwDataDisplay.findIndex(d => d.date === point.date)
    const current = point.weight
    const sinceFirst = idx > 0
      ? Math.round((current - bwDataDisplay[0].weight) * 10) / 10
      : null
    return (
      <div style={{ background: '#0d0d0d', border: '1px solid rgba(148,163,184,0.3)', borderRadius: 10, padding: '9px 13px', pointerEvents: 'none', minWidth: 148 }}>
        <p style={{ color: '#484848', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 7 }}>{ja ? fmtDateJa(label) : formatTooltipDate(label)}</p>
        <div style={{ marginBottom: sinceFirst !== null ? 4 : 0 }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 600, letterSpacing: '0.05em' }}>{ja ? '体重  ' : 'BODY WEIGHT  '}</span>
          <span style={{ color: '#94A3B8', fontSize: 14, fontWeight: 900 }}>{current}</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9 }}> {unitLabel}</span>
        </div>
        {sinceFirst !== null && (
          <p style={{ color: sinceFirst <= 0 ? '#4ade80' : '#ef4444', fontSize: 10, marginTop: 4 }}>
            {sinceFirst > 0 ? '+' : ''}{sinceFirst.toFixed(1)} {unitLabel}
            <span style={{ color: 'rgba(255,255,255,0.25)', marginLeft: 4 }}>{ja ? '初回から' : 'since first'}</span>
          </p>
        )}
      </div>
    )
  }

  const fmtVolT = (v: number): string => {
    if (unit === 'lbs') {
      if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M lbs`
      if (v >= 1000) return `${(v / 1000).toFixed(1)}k lbs`
      return `${v.toLocaleString()} lbs`
    }
    if (v >= 1000) return `${(v / 1000).toFixed(1)}t`
    return `${v.toLocaleString()}kg`
  }

  const fmtDateJa = (dateStr: string) => {
    const [, mm, dd] = dateStr.split('-')
    return `${parseInt(mm)}月${parseInt(dd)}日`
  }
  const fmtDateJaYear = (dateStr: string) => {
    const [year, mm] = dateStr.split('-')
    return `${year}年${parseInt(mm)}月`
  }
  const jaAxisFmt = (base: (s: string) => string) => (dateStr: string): string => {
    const r = base(dateStr)
    return r.includes("'") ? fmtDateJaYear(dateStr) : fmtDateJa(dateStr)
  }

  const volTooltip = (tProps: any) => {
    const { active, payload, label } = tProps
    if (!active || !payload?.length) return null
    const vol = payload[0].value as number
    return (
      <div style={{ background: '#0d0d0d', border: '1px solid rgba(237,116,47,0.28)', borderRadius: 10, padding: '9px 13px', pointerEvents: 'none', minWidth: 148 }}>
        <p style={{ color: '#484848', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 7 }}>{ja ? fmtDateJa(label) : formatTooltipDate(label)}</p>
        <div>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 600, letterSpacing: '0.05em' }}>{ja ? '総重量  ' : 'VOLUME  '}</span>
          <span style={{ color: 'rgba(237,116,47,0.9)', fontSize: 14, fontWeight: 900 }}>
            {fmtVolT(vol)}
          </span>
          {vol >= 1000 && (
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9 }}> ({vol.toLocaleString()}{unitLabel})</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 pt-14 pb-nav" style={{ background: '#0a0a0a' }}>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-black tracking-widest text-white">{ja ? '成長データ' : 'ANALYTICS'}</h1>
        <Link href="/profile/settings"
          className="w-10 h-10 flex items-center justify-center rounded-full active:opacity-70 flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}>
          <Settings size={18} style={{ color: 'rgba(255,255,255,0.52)' }} />
        </Link>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-4 p-1 rounded-2xl" style={{ background: '#171717', border: '1px solid rgba(237, 116, 47,0.1)' }}>
        {TABS.map(t => (
          <button key={t}
            className="flex-1 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all"
            style={{
              background: tab === t ? '#ED742F' : 'transparent',
              color: tab === t ? '#fff' : '#555',
            }}
            onClick={() => setTab(t)}>
            {ja ? ({ 'MAX 1RM': 'MAX 1RM', 'DAILY VOLUME': '総重量', 'BODY WEIGHT': '体重' } as Record<Tab, string>)[t] : t}
          </button>
        ))}
      </div>

      {/* Tab description */}
      <p className="text-[11px] mb-4 leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
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
                    background: muscleFilter === mg ? 'rgba(237, 116, 47,0.14)' : '#171717',
                    color: muscleFilter === mg ? '#ED742F' : '#444',
                    border: muscleFilter === mg ? '1px solid rgba(237, 116, 47,0.35)' : '1px solid #1e1e1e',
                  }}
                  onClick={() => handleMuscleFilter(mg)}>
                  {ja ? (MUSCLE_GROUP_LABEL_JA[mg] ?? mg) : mg}
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
                      background: selectedExercise === e.name ? '#ED742F' : '#171717',
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

      {/* Period filter */}
      {/* TODO_PRO: longRangeStats — '1Y' and 'All' periods are candidates for Pro-only access. Currently free. */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: '#171717', border: '1px solid rgba(237, 116, 47,0.1)' }}>
        {PERIODS.map(p => (
          <button key={p}
            className="flex-1 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all"
            style={{
              background: period === p ? '#ED742F' : 'transparent',
              color: period === p ? '#fff' : '#555',
            }}
            onClick={() => setPeriod(p)}>
            {ja ? (PERIOD_BTN_LABEL_JA[p] ?? p) : p}
          </button>
        ))}
      </div>

      {/* MAX 1RM Tab */}
      {tab === 'MAX 1RM' && (
        <div>
          {activeExercises.length === 0 ? (
            <EmptyState />
          ) : filteredExercises.length === 0 ? (
            <NoGroupData />
          ) : selectedExercise && selectedExerciseLogCount < EXERCISE_GRAPH_REQUIRED ? (
            <div className="rounded-2xl p-8 text-center" style={CARD}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#555', textAlign: 'center', lineHeight: 1.8 }}>
                {locale === 'ja'
                  ? selectedExerciseLogCount === 0
                    ? `同じ種目を${EXERCISE_GRAPH_REQUIRED}回以上記録すると、MAX 1RMグラフが使えます`
                    : `あと${EXERCISE_GRAPH_REQUIRED - selectedExerciseLogCount}回の記録で、MAX 1RMグラフが使えます`
                  : `Log this exercise ${EXERCISE_GRAPH_REQUIRED - selectedExerciseLogCount} more time${EXERCISE_GRAPH_REQUIRED - selectedExerciseLogCount !== 1 ? 's' : ''} to unlock the 1RM graph`}
              </p>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#444', marginTop: 8 }}>
                {selectedExerciseLogCount} / {EXERCISE_GRAPH_REQUIRED}
              </p>
            </div>
          ) : (
            <>
              {/* Summary card */}
              <div className="rounded-2xl p-4 mb-3 flex items-center justify-between" style={CARD}>
                <div>
                  <p className="text-[10px] font-black tracking-widest mb-1.5" style={{ color: '#ED742F' }}>BEST 1RM</p>
                  {rmLoading ? (
                    <p style={{ fontSize: 28, fontWeight: 900, color: '#333', fontFamily: 'var(--font-mono)' }}>...</p>
                  ) : bestRM !== null ? (
                    <div className="flex items-baseline gap-1">
                      <span style={{ fontSize: 36, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em', lineHeight: 1 }}>{toDisplayWeight(bestRM, unit)}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.52)' }}>{unitLabel}</span>
                    </div>
                  ) : (
                    <p style={{ fontSize: 28, fontWeight: 900, color: '#333', fontFamily: 'var(--font-mono)' }}>—</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.52)' }}>{ja ? '記録日数' : 'SESSIONS'}</p>
                  <p style={{ fontSize: 36, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {rmLoading ? '...' : rmData.length > 0 ? rmData.length : '—'}
                  </p>
                </div>
              </div>

              {/* 1RM chart */}
              <div className="rounded-2xl p-4 mb-3" style={CARD}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-black tracking-widest" style={{ color: '#ED742F' }}>{ja ? '1RMの推移' : '1RM PROGRESSION'}</p>
                    {rmDataDisplay.length >= 2 && (
                      <p className="text-[9px] mt-0.5 tracking-wider" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        {ja ? `${fmtDateJa(rmDataDisplay[0].date)}から` : `Since ${rmDataDisplay[0].label}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {rmGrowth !== null && (
                      <span className="text-[11px] font-black" style={{ color: rmGrowth > 0 ? '#ED742F' : 'rgba(255,255,255,0.42)' }}>
                        {rmGrowth > 0 ? '+' : ''}{rmGrowth}{unitLabel}
                      </span>
                    )}
                    <Link
                      href={`/analytics/chart?metric=max1rm&range=${periodToRange(period)}&exercise=${encodeURIComponent(selectedExercise)}`}
                      aria-label="Open full screen chart"
                      className="p-1.5 rounded-lg active:opacity-60"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <Maximize2 size={11} style={{ color: 'rgba(255,255,255,0.32)' }} />
                    </Link>
                  </div>
                </div>
                {rmLoading ? (
                  <LoadingChart />
                ) : rmData.length === 0 ? (
                  <ChartEmpty />
                ) : (
                  <div className="relative">
                    {rmChartW > innerW && (
                      <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
                        style={{ background: 'linear-gradient(to right, rgba(10,10,10,0.9), transparent)' }} />
                    )}
                    <div ref={rmScrollRef}
                      className="overflow-x-auto overscroll-x-contain no-scrollbar"
                      style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                      <LineChart width={rmChartW} height={380} data={rmDataDisplay} margin={{ top: 10, right: 20, bottom: 5, left: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.055)" vertical={false} />
                        <XAxis dataKey="date" ticks={rmXAxis.ticks} tickFormatter={ja ? jaAxisFmt(rmXAxis.formatter) : rmXAxis.formatter}
                          tick={{ fill: '#4a4a4a', fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: '#4a4a4a', fontSize: 10 }} tickLine={false} axisLine={false}
                          width={40} domain={[rmAxis.yMin, rmAxis.yMax]} ticks={rmTicks} />
                        <Tooltip content={rmTooltip} cursor={{ stroke: 'rgba(255,255,255,0.07)' }} />
                        <Line type="linear" dataKey="est1rm" stroke="#ED742F" strokeWidth={2}
                          dot={rmDot as any}
                          activeDot={{ r: 5, fill: '#ED742F', stroke: 'rgba(255,255,255,0.75)', strokeWidth: 1.5 }}
                          isAnimationActive={true} animationDuration={400} />
                      </LineChart>
                    </div>
                  </div>
                )}
              </div>

              {/* History list */}
              {rmData.length > 0 && (
                <>
                  <div className="rounded-2xl overflow-hidden" style={CARD}>
                    <div className="px-4 pt-4 pb-2">
                      <p className="text-[10px] font-black tracking-widest" style={{ color: 'rgba(255,255,255,0.52)' }}>{ja ? '記録履歴' : 'SESSION HISTORY'}</p>
                    </div>
                    {[...rmDataDisplay].reverse().slice(0, 6).map((p, i) => {
                      const origEst1rm = [...rmData].reverse()[i]?.est1rm
                      return (
                        <div key={p.date} className="flex items-center justify-between px-4 py-2.5"
                          style={{ borderTop: '1px solid rgba(255,255,255,0.17)' }}>
                          <span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.60)' }}>{p.label}</span>
                          <div className="flex items-baseline gap-1">
                            <span style={{ fontSize: 16, fontWeight: 700, color: bestRM !== null && origEst1rm === bestRM ? '#ED742F' : '#fff', fontFamily: 'var(--font-mono)' }}>{p.est1rm}</span>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.47)' }}>{unitLabel}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <Link
                    href={`/share?type=stats&metric=max1rm&exercise=${encodeURIComponent(selectedExercise)}`}
                    className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl"
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.13)',
                      color: 'rgba(255,255,255,0.60)',
                      fontSize: 13,
                      fontWeight: 500,
                    }}>
                    <Share2 size={14} strokeWidth={1.5} />
                    Share Story
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* DAILY VOLUME Tab */}
      {tab === 'DAILY VOLUME' && (
        <div>
          {activeTotalSessions < VOLUME_CHART_SESSION_REQUIRED ? (
            <div className="rounded-2xl p-8 text-center" style={CARD}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#555', textAlign: 'center', lineHeight: 1.8 }}>
                {locale === 'ja'
                  ? activeTotalSessions === 0
                    ? `ワークアウトを${VOLUME_CHART_SESSION_REQUIRED}日記録すると、総重量グラフが使えます`
                    : `あと${VOLUME_CHART_SESSION_REQUIRED - activeTotalSessions}日の記録で、総重量グラフが使えます`
                  : `Complete ${VOLUME_CHART_SESSION_REQUIRED - activeTotalSessions} more workout day${VOLUME_CHART_SESSION_REQUIRED - activeTotalSessions !== 1 ? 's' : ''} to unlock the volume graph`}
              </p>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#444', marginTop: 8 }}>
                {activeTotalSessions} / {VOLUME_CHART_SESSION_REQUIRED}
              </p>
            </div>
          ) : (
          <>
              {/* Body part filter */}
              <div className="overflow-x-auto no-scrollbar mb-4">
                <div className="flex gap-1.5 pb-1">
                  {VOL_BODY_PARTS.map(bp => (
                    <button key={bp}
                      className="shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider transition-all"
                      style={{
                        background: volBodyPart === bp ? 'rgba(237, 116, 47,0.14)' : '#171717',
                        color: volBodyPart === bp ? '#ED742F' : '#444',
                        border: volBodyPart === bp ? '1px solid rgba(237, 116, 47,0.35)' : '1px solid #1e1e1e',
                      }}
                      onClick={() => setVolBodyPart(bp)}>
                      {locale === 'ja' ? VOL_BODY_PART_JA[bp] : bp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary card */}
              <div className="rounded-2xl p-4 mb-3 flex items-center justify-between" style={CARD}>
                <div>
                  <p className="text-[10px] font-black tracking-widest mb-1.5" style={{ color: '#ED742F' }}>{ja ? '合計' : 'TOTAL VOLUME'}</p>
                  {volLoading ? (
                    <p style={{ fontSize: 28, fontWeight: 900, color: '#333', fontFamily: 'var(--font-mono)' }}>...</p>
                  ) : totalVol > 0 ? (
                    <div className="flex items-baseline gap-1">
                      <span style={{ fontSize: 36, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                        {fmtVolT(Math.round(toDisplayWeight(totalVol, unit)))}
                      </span>
                    </div>
                  ) : (
                    <p style={{ fontSize: 28, fontWeight: 900, color: '#333', fontFamily: 'var(--font-mono)' }}>—</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.52)' }}>{ja ? '記録日数' : 'SESSIONS'}</p>
                  <p style={{ fontSize: 36, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {volLoading ? '...' : volData.length > 0 ? volData.length : '—'}
                  </p>
                </div>
              </div>

              {/* Volume chart */}
              <div className="rounded-2xl p-4 mb-3" style={CARD}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-black tracking-widest" style={{ color: '#ED742F' }}>{ja ? '総重量' : 'DAILY VOLUME'}</p>
                  <Link
                    href={`/analytics/chart?metric=daily-volume&range=${periodToRange(period)}&bodypart=${encodeURIComponent(volBodyPart.toLowerCase())}`}
                    aria-label="Open full screen chart"
                    className="p-1.5 rounded-lg active:opacity-60"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Maximize2 size={11} style={{ color: 'rgba(255,255,255,0.32)' }} />
                  </Link>
                </div>
                {volLoading ? (
                  <LoadingChart />
                ) : volData.length === 0 ? (
                  <ChartEmpty />
                ) : (
                  <div className="relative">
                    {volChartW > innerW && (
                      <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
                        style={{ background: 'linear-gradient(to right, rgba(10,10,10,0.9), transparent)' }} />
                    )}
                    <div ref={volScrollRef}
                      className="overflow-x-auto overscroll-x-contain no-scrollbar"
                      style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                      <BarChart width={volChartW} height={380} data={volDataDisplay} margin={{ top: 10, right: 20, bottom: 5, left: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.055)" vertical={false} />
                        <XAxis dataKey="date" ticks={volXAxis.ticks} tickFormatter={ja ? jaAxisFmt(volXAxis.formatter) : volXAxis.formatter}
                          tick={{ fill: '#4a4a4a', fontSize: 9 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: '#4a4a4a', fontSize: 10 }} tickLine={false} axisLine={false} width={44}
                          domain={[0, volAxis.yMax]} ticks={volTicks}
                          tickFormatter={v => fmtVolT(v)} />
                        <Tooltip content={volTooltip} cursor={{ stroke: 'rgba(255,255,255,0.05)', fill: 'rgba(255,255,255,0.02)' }} />
                        <Bar dataKey="volume" fill="rgba(237,116,47,0.62)" radius={[2, 2, 0, 0]} maxBarSize={16} />
                      </BarChart>
                    </div>
                  </div>
                )}
              </div>

              {/* Volume history list */}
              {volData.length > 0 && (
                <>
                  <div className="rounded-2xl overflow-hidden" style={CARD}>
                    <div className="px-4 pt-4 pb-2">
                      <p className="text-[10px] font-black tracking-widest" style={{ color: 'rgba(255,255,255,0.52)' }}>{ja ? '記録履歴' : 'SESSION HISTORY'}</p>
                    </div>
                    {[...volDataDisplay].reverse().slice(0, 8).map(p => (
                      <div key={p.date} className="flex items-center justify-between px-4 py-2.5"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.17)' }}>
                        <span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.60)' }}>{p.label}</span>
                        <div className="flex items-baseline gap-1">
                          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                            {fmtVolT(p.volume)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link
                    href={`/share?type=stats&metric=volume&bodypart=${encodeURIComponent(volBodyPart.toLowerCase())}`}
                    className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl"
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.13)',
                      color: 'rgba(255,255,255,0.60)',
                      fontSize: 13,
                      fontWeight: 500,
                    }}>
                    <Share2 size={14} strokeWidth={1.5} />
                    Share Story
                  </Link>
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
                <p className="text-[10px] font-black tracking-widest" style={{ color: '#ED742F' }}>{ja ? '今日の体重' : 'TODAY\'S WEIGHT'}</p>
                {todaySaved && (
                  <span className="text-[9px] font-black tracking-wider" style={{ color: '#22c55e' }}>SAVED</span>
                )}
              </div>
              <div className="flex items-baseline gap-1.5">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={latestWeight ? String(toDisplayWeight(latestWeight, unit)) : (unit === 'lbs' ? '154.0' : '70.0')}
                  value={bwInput}
                  onChange={e => setBwInput(e.target.value)}
                  className="w-20 bg-transparent text-white text-xl font-black outline-none"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
                <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.52)' }}>{unitLabel}</span>
              </div>
              {bwInput && !bwInputValid && (
                <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{t(locale, unit === 'lbs' ? 'analytics.bwInputErrorLbs' : 'analytics.bwInputError')}</p>
              )}
            </div>
            <button
              className="px-5 py-3 rounded-xl text-xs font-black tracking-widest transition-opacity"
              style={{
                background: bwInputValid ? '#ED742F' : 'rgba(255,255,255,0.04)',
                color: bwInputValid ? '#fff' : '#444',
                border: bwInputValid ? 'none' : '1px solid rgba(255,255,255,0.13)',
                opacity: 1,
              }}
              disabled={!bwInputValid}
              onClick={saveBW}>
              {ja ? '記録' : 'LOG'}
            </button>
          </div>

          {latestWeight && (
            <div className="rounded-2xl p-4 mb-4 flex items-center justify-between" style={CARD}>
              <div>
                <p className="text-[10px] font-black tracking-widest mb-1.5" style={{ color: '#ED742F' }}>{ja ? '最新' : 'LATEST'}</p>
                <div className="flex items-baseline gap-1">
                  <span style={{ fontSize: 36, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em', lineHeight: 1 }}>{latestWeight !== null ? toDisplayWeight(latestWeight, unit) : ''}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, marginLeft: 3, color: 'rgba(255,255,255,0.52)' }}>{unitLabel}</span>
                </div>
              </div>
              {bwDataDisplay.length >= 2 && (() => {
                const diff = Math.round((bwDataDisplay[bwDataDisplay.length - 1].weight - bwDataDisplay[0].weight) * 10) / 10
                return (
                  <div className="text-right">
                    <p className="text-[10px] font-black tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.52)' }}>{ja ? '変化' : 'CHANGE'}</p>
                    <div className="flex items-baseline gap-1 justify-end">
                      <span style={{ fontSize: 28, fontWeight: 900, color: diff <= 0 ? '#22c55e' : '#ef4444', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.52)' }}>{unitLabel}</span>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          <div className="rounded-2xl p-4" style={CARD}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black tracking-widest" style={{ color: '#ED742F' }}>{ja ? `体重 · ${periodLabel}` : `BODY WEIGHT · ${periodLabel}`}</p>
              <Link
                href={`/analytics/chart?metric=body-weight&range=${periodToRange(period)}`}
                aria-label="Open full screen chart"
                className="p-1.5 rounded-lg active:opacity-60"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Maximize2 size={11} style={{ color: 'rgba(255,255,255,0.32)' }} />
              </Link>
            </div>
            {ctxBwHistory.length === 0 ? (
              <div className="h-[380px] flex items-center justify-center">
                <p style={{ fontSize: 13, fontWeight: 600, color: '#555', textAlign: 'center', lineHeight: 1.6 }}>
                  {locale === 'ja'
                    ? `体重を${BW_CHART_REQUIRED}回以上記録すると、体重グラフが使えます`
                    : 'Log your body weight to see progress over time'}
                </p>
              </div>
            ) : ctxBwHistory.length < BW_CHART_REQUIRED ? (
              <div className="h-[380px] flex items-center justify-center flex-col gap-3">
                <p style={{ fontSize: 13, fontWeight: 600, color: '#555', textAlign: 'center', lineHeight: 1.6 }}>
                  {locale === 'ja'
                    ? `あと${BW_CHART_REQUIRED - ctxBwHistory.length}回の体重記録で、体重グラフが使えます`
                    : `Log ${BW_CHART_REQUIRED - ctxBwHistory.length} more weight entr${BW_CHART_REQUIRED - ctxBwHistory.length === 1 ? 'y' : 'ies'} to see your progress graph`}
                </p>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#444' }}>
                  {ctxBwHistory.length} / {BW_CHART_REQUIRED}
                </p>
              </div>
            ) : (
              <div className="relative">
                {bwChartW > innerW && (
                  <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
                    style={{ background: 'linear-gradient(to right, rgba(10,10,10,0.9), transparent)' }} />
                )}
                <div ref={bwScrollRef}
                  className="overflow-x-auto overscroll-x-contain no-scrollbar"
                  style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                  <LineChart width={bwChartW} height={380} data={bwDataDisplay} margin={{ top: 10, right: 20, bottom: 5, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.055)" vertical={false} />
                    <XAxis dataKey="date" ticks={bwXAxis.ticks} tickFormatter={ja ? jaAxisFmt(bwXAxis.formatter) : bwXAxis.formatter}
                      tick={{ fill: '#4a4a4a', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#4a4a4a', fontSize: 10 }} tickLine={false} axisLine={false} width={40}
                      domain={[bwAxis.yMin, bwAxis.yMax]} ticks={bwTicks} />
                    <Tooltip content={bwTooltip} cursor={{ stroke: 'rgba(255,255,255,0.07)' }} />
                    <ReferenceLine y={bwDataDisplay[0]?.weight} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                    <Line type="linear" dataKey="weight" stroke="#94A3B8" strokeWidth={2}
                      dot={bwDot as any}
                      activeDot={{ r: 5, fill: '#94A3B8', stroke: 'rgba(255,255,255,0.7)', strokeWidth: 1.5 }}
                      isAnimationActive={true} animationDuration={400} />
                  </LineChart>
                </div>
              </div>
            )}
          </div>
          {ctxBwHistory.length > 0 && (
            <Link
              href="/share?type=stats&metric=bodyweight"
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl"
              style={{
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.13)',
                color: 'rgba(255,255,255,0.60)',
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
      background: 'linear-gradient(135deg, rgba(237, 116, 47,0.05), rgba(255,255,255,0.01) 40%, rgba(237, 116, 47,0.03))',
      border: '1px solid rgba(237, 116, 47,0.38)',
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
      background: '#171717',
      border: '1px solid rgba(237, 116, 47,0.38)',
      borderRadius: 18,
    }}>
      <p className="text-sm font-bold" style={{ color: '#555' }}>{t(locale, 'analytics.noGroupData')}</p>
    </div>
  )
}

function LoadingChart() {
  return (
    <div className="h-[380px] flex items-center justify-center">
      <p className="text-xs font-black tracking-widest" style={{ color: '#444' }}>LOADING...</p>
    </div>
  )
}

function ChartEmpty() {
  const { locale } = useLocale()
  return (
    <div className="h-[380px] flex items-center justify-center flex-col gap-2">
      <p className="text-sm font-bold" style={{ color: '#555' }}>{t(locale, 'analytics.noDataYet')}</p>
      <p className="text-xs font-bold" style={{ color: '#333' }}>{t(locale, 'analytics.chartNoData')}</p>
    </div>
  )
}
