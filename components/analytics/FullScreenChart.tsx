'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import { useWeightUnit } from '@/lib/useWeightUnit'
import { toDisplayWeight, weightUnitLabel } from '@/lib/units'
import { type Period, getStartDate, aggregateBodyWeight, aggregateVolume, aggregate1RM } from '@/lib/chartAggregation'
import {
  smartYAxis, yAxisTicks, computeChartWidth, buildXAxisConfig, formatTooltipDate,
} from '@/lib/chartUtils'

type WeightPoint = { date: string; label: string; weight: number }
type RMPoint     = { date: string; label: string; est1rm: number }
type VolPoint    = { date: string; label: string; volume: number }
type Metric = 'max1rm' | 'daily-volume' | 'body-weight'

function rangeToperiod(r: string): Period {
  return ({ '30d':'30D','90d':'90D','6m':'6M','1y':'1Y','all':'All' } as Record<string,Period>)[r.toLowerCase()] ?? '90D'
}

function fsPointW(period: Period, type: 'rm' | 'bw' | 'bar'): number {
  const pw: Record<string, Record<Period, number>> = {
    rm:  { '30D':20,'90D':16,'6M':14,'1Y':12,'All':10 },
    bw:  { '30D':16,'90D':12,'6M':10,'1Y': 8,'All': 7 },
    bar: { '30D': 9,'90D': 8,'6M': 7,'1Y': 6,'All': 5 },
  }
  return pw[type][period]
}

type Props = {
  metric: string
  range: string
  exercise: string
  initialRmData:  RMPoint[]
  initialVolData: VolPoint[]
  initialBwData:  WeightPoint[]
}

export default function FullScreenChart({
  metric: metricRaw, range, exercise,
  initialRmData, initialVolData, initialBwData,
}: Props) {
  const router    = useRouter()
  const { unit }  = useWeightUnit()
  const unitLabel = weightUnitLabel(unit)

  const metric: Metric =
    metricRaw === 'max1rm' || metricRaw === 'daily-volume' || metricRaw === 'body-weight'
      ? metricRaw : 'max1rm'
  const period = rangeToperiod(range)

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [screenW, setScreenW] = useState(390)
  const [screenH, setScreenH] = useState(844)
  const [chartContainerH, setChartContainerH] = useState(0)
  const scrollRef        = useRef<HTMLDivElement>(null)
  const chartContainerRef = useRef<HTMLDivElement>(null)

  const isLandscape = screenW > screenH

  useEffect(() => {
    const upd = () => { setScreenW(window.innerWidth); setScreenH(window.innerHeight) }
    upd()
    window.addEventListener('resize', upd)
    return () => window.removeEventListener('resize', upd)
  }, [])

  // Measure the chart container so the Recharts SVG height can match exactly.
  useEffect(() => {
    if (!chartContainerRef.current) return
    const obs = new ResizeObserver(entries => {
      setChartContainerH(entries[0].contentRect.height)
    })
    obs.observe(chartContainerRef.current)
    return () => obs.disconnect()
  }, [])

  // Lock body/main scroll to ensure iOS Safari position:fixed covers viewport correctly.
  useEffect(() => {
    const body = document.body
    const main = document.querySelector('main') as HTMLElement | null
    const prevBodyOverflow = body.style.overflow
    const prevMainOverflow = main?.style.overflowY ?? ''
    body.style.overflow = 'hidden'
    if (main) main.style.overflowY = 'hidden'
    return () => {
      body.style.overflow = prevBodyOverflow
      if (main) main.style.overflowY = prevMainOverflow
    }
  }, [])

  // Scroll to the latest (rightmost) data after dimension changes.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
  }, [screenW])

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push('/analytics')
  }

  // ── Data ──────────────────────────────────────────────────────

  // Memoize display data — stable reference prevents Recharts from re-animating
  // when selectedIdx changes (detail tap).
  const rmDisplay = useMemo(() =>
    aggregate1RM(initialRmData).map(p => ({ ...p, est1rm: Math.round(toDisplayWeight(p.est1rm, unit)) })),
    [initialRmData, unit]
  )
  const volDisplay = useMemo(() =>
    aggregateVolume(initialVolData).map(p => ({ ...p, volume: Math.round(toDisplayWeight(p.volume, unit)) })),
    [initialVolData, unit]
  )
  const bwDisplay = useMemo(() => {
    const start    = getStartDate(period)
    const filtered = start ? initialBwData.filter(p => p.date >= start) : initialBwData
    return aggregateBodyWeight(filtered).map(p => ({ ...p, weight: Math.round(toDisplayWeight(p.weight, unit) * 10) / 10 }))
  }, [initialBwData, period, unit])

  const activeData =
    metric === 'max1rm' ? rmDisplay :
    metric === 'daily-volume' ? volDisplay : bwDisplay

  // ── Dimensions ───────────────────────────────────────────────

  // Portrait: chart fills flex:1 container; measure actual height with ResizeObserver.
  // Landscape: chart fills the right panel.
  const chartAreaW = isLandscape ? Math.round(screenW * 0.63) - 16 : screenW - 20
  const portraitChartH = chartContainerH > 0
    ? Math.max(380, chartContainerH - 20)
    : Math.max(380, screenH - 220)
  const chartH = isLandscape ? Math.max(260, screenH - 54) : portraitChartH

  const rmChartW  = computeChartWidth(rmDisplay.length,  chartAreaW, fsPointW(period, 'rm'))
  const volChartW = computeChartWidth(volDisplay.length, chartAreaW, fsPointW(period, 'bar'))
  const bwChartW  = computeChartWidth(bwDisplay.length,  chartAreaW, fsPointW(period, 'bw'))

  const pxPerLabel = isLandscape ? 70 : 84
  const rmXAxis  = buildXAxisConfig(rmDisplay,  rmChartW,  period, pxPerLabel)
  const volXAxis = buildXAxisConfig(volDisplay, volChartW, period, pxPerLabel)
  const bwXAxis  = buildXAxisConfig(bwDisplay,  bwChartW,  period, pxPerLabel)

  const rmAxis  = smartYAxis(rmDisplay.map(p => p.est1rm), 'rm')
  const rmTicks = yAxisTicks(rmAxis.yMin, rmAxis.yMax, rmAxis.step)
  const volAxis  = smartYAxis(volDisplay.map(p => p.volume), 'volume')
  const volTicks = yAxisTicks(0, volAxis.yMax, volAxis.step)
  const bwAxis  = smartYAxis(bwDisplay.map(p => p.weight), 'bw')
  const bwTicks = yAxisTicks(bwAxis.yMin, bwAxis.yMax, bwAxis.step)

  // ── KPIs ──────────────────────────────────────────────────────

  type KpiItem = { label: string; value: string; unit: string; accent?: boolean }

  const rmKpis: KpiItem[] = rmDisplay.length === 0 ? [] : (() => {
    const last   = rmDisplay[rmDisplay.length - 1].est1rm
    const first  = rmDisplay[0].est1rm
    const best   = Math.max(...rmDisplay.map(p => p.est1rm))
    const growth = last - first
    return [
      { label: 'CURRENT',  value: `${last}`,    unit: unitLabel },
      { label: 'GROWTH',   value: growth >= 0 ? `+${growth}` : `${growth}`, unit: unitLabel, accent: growth > 0 },
      { label: 'BEST',     value: `${best}`,    unit: unitLabel },
      { label: 'SESSIONS', value: `${rmDisplay.length}`, unit: '' },
    ]
  })()

  const volKpis: KpiItem[] = volDisplay.length === 0 ? [] : (() => {
    const total = volDisplay.reduce((s, p) => s + p.volume, 0)
    const avg   = Math.round(total / volDisplay.length)
    const best  = Math.max(...volDisplay.map(p => p.volume))
    const fmt   = (v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v}`
    return [
      { label: 'TOTAL',       value: fmt(total), unit: unitLabel },
      { label: 'AVG/SESSION', value: fmt(avg),   unit: unitLabel },
      { label: 'BEST DAY',    value: fmt(best),  unit: unitLabel },
      { label: 'SESSIONS',    value: `${volDisplay.length}`, unit: '' },
    ]
  })()

  const bwKpis: KpiItem[] = bwDisplay.length === 0 ? [] : (() => {
    const last   = bwDisplay[bwDisplay.length - 1].weight
    const change = bwDisplay.length >= 2
      ? Math.round((last - bwDisplay[0].weight) * 10) / 10 : 0
    const high = Math.max(...bwDisplay.map(p => p.weight))
    const low  = Math.min(...bwDisplay.map(p => p.weight))
    return [
      { label: 'CURRENT', value: `${last}`,   unit: unitLabel },
      { label: 'CHANGE',  value: change > 0 ? `+${change}` : `${change}`, unit: unitLabel, accent: change < 0 },
      { label: 'HIGH',    value: `${high}`,   unit: unitLabel },
      { label: 'LOW',     value: `${low}`,    unit: unitLabel },
    ]
  })()

  const kpis = metric === 'max1rm' ? rmKpis : metric === 'daily-volume' ? volKpis : bwKpis

  // ── Click handler ─────────────────────────────────────────────

  const handleClick = (data: any) => {
    if (!data?.activePayload?.[0]) return
    const pt = data.activePayload[0].payload as { date: string }
    const idx = activeData.findIndex(d => d.date === pt.date)
    if (idx !== -1) setSelectedIdx(idx)
  }

  // ── Dots ──────────────────────────────────────────────────────

  const rmDot = (props: any) => {
    const { cx, cy, index } = props
    const isSel  = index === selectedIdx
    const isLast = index === rmDisplay.length - 1
    if (isSel || isLast) {
      const r = isSel ? 6 : 5
      return (
        <g key={`rmd${index}`}>
          {!isSel && <circle cx={cx} cy={cy} r={r + 4} fill="#ED742F" fillOpacity={0.1} />}
          <circle cx={cx} cy={cy} r={r} fill="#ED742F"
            stroke={isSel ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)'}
            strokeWidth={isSel ? 2 : 1.5} />
        </g>
      )
    }
    return <circle key={`rmd${index}`} cx={cx} cy={cy} r={2} fill="#ED742F" fillOpacity={0.55} />
  }

  const bwDot = (props: any) => {
    const { cx, cy, index } = props
    const isSel  = index === selectedIdx
    const isLast = index === bwDisplay.length - 1
    if (isSel || isLast) {
      const r = isSel ? 5 : 4
      return (
        <g key={`bwd${index}`}>
          {!isSel && <circle cx={cx} cy={cy} r={r + 3} fill="#94A3B8" fillOpacity={0.12} />}
          <circle cx={cx} cy={cy} r={r} fill="#94A3B8"
            stroke={isSel ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.75)'}
            strokeWidth={isSel ? 2 : 1.5} />
        </g>
      )
    }
    return <circle key={`bwd${index}`} cx={cx} cy={cy} r={1} fill="#94A3B8" fillOpacity={0.45} />
  }

  // ── Tooltips ──────────────────────────────────────────────────

  const rmTooltip = (tp: any) => {
    const { active, payload } = tp
    if (!active || !payload?.length) return null
    const pt  = payload[0].payload as RMPoint
    const idx = rmDisplay.findIndex(d => d.date === pt.date)
    const sinceFirst = idx > 0 ? pt.est1rm - rmDisplay[0].est1rm : null
    const fromPrev   = idx > 0 ? pt.est1rm - rmDisplay[idx-1].est1rm : null
    return (
      <div style={{ background: '#0d0d0d', border: '1px solid rgba(237,116,47,0.35)', borderRadius: 10, padding: '9px 13px', pointerEvents: 'none', minWidth: 140 }}>
        <p style={{ color: '#484848', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>{formatTooltipDate(pt.date)}</p>
        <div>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9 }}>EST. 1RM  </span>
          <span style={{ color: '#ED742F', fontSize: 14, fontWeight: 900 }}>{pt.est1rm}</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9 }}> {unitLabel}</span>
        </div>
        {sinceFirst !== null && (
          <p style={{ color: sinceFirst >= 0 ? '#ED742F' : '#888', fontSize: 10, marginTop: 3 }}>
            {sinceFirst >= 0 ? '+' : ''}{sinceFirst} {unitLabel}
            <span style={{ color: 'rgba(255,255,255,0.25)', marginLeft: 4 }}>since first</span>
          </p>
        )}
        {fromPrev !== null && (
          <p style={{ color: fromPrev > 0 ? '#ED742F' : fromPrev < 0 ? '#888' : 'rgba(255,255,255,0.16)', fontSize: 10, marginTop: 2 }}>
            {fromPrev !== 0 ? (fromPrev > 0 ? '+' : '') + fromPrev : '±0'} {unitLabel}
            <span style={{ color: 'rgba(255,255,255,0.25)', marginLeft: 4 }}>from prev</span>
          </p>
        )}
      </div>
    )
  }

  const bwTooltip = (tp: any) => {
    const { active, payload } = tp
    if (!active || !payload?.length) return null
    const pt  = payload[0].payload as WeightPoint
    const idx = bwDisplay.findIndex(d => d.date === pt.date)
    const sinceFirst = idx > 0 ? Math.round((pt.weight - bwDisplay[0].weight) * 10) / 10 : null
    return (
      <div style={{ background: '#0d0d0d', border: '1px solid rgba(148,163,184,0.3)', borderRadius: 10, padding: '9px 13px', pointerEvents: 'none', minWidth: 140 }}>
        <p style={{ color: '#484848', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>{formatTooltipDate(pt.date)}</p>
        <div>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9 }}>BODY WEIGHT  </span>
          <span style={{ color: '#94A3B8', fontSize: 14, fontWeight: 900 }}>{pt.weight}</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9 }}> {unitLabel}</span>
        </div>
        {sinceFirst !== null && (
          <p style={{ color: sinceFirst <= 0 ? '#4ade80' : '#ef4444', fontSize: 10, marginTop: 3 }}>
            {sinceFirst > 0 ? '+' : ''}{sinceFirst.toFixed(1)} {unitLabel}
            <span style={{ color: 'rgba(255,255,255,0.25)', marginLeft: 4 }}>since first</span>
          </p>
        )}
      </div>
    )
  }

  const volTooltip = (tp: any) => {
    const { active, payload } = tp
    if (!active || !payload?.length) return null
    const pt  = payload[0].payload as VolPoint
    const vol = pt.volume
    return (
      <div style={{ background: '#0d0d0d', border: '1px solid rgba(237,116,47,0.28)', borderRadius: 10, padding: '9px 13px', pointerEvents: 'none', minWidth: 140 }}>
        <p style={{ color: '#484848', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>{formatTooltipDate(pt.date)}</p>
        <div>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9 }}>VOLUME  </span>
          <span style={{ color: 'rgba(237,116,47,0.9)', fontSize: 14, fontWeight: 900 }}>
            {vol >= 1000 ? `${(vol/1000).toFixed(1)}k` : vol.toLocaleString()}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9 }}> {unitLabel}</span>
        </div>
      </div>
    )
  }

  // ── Full detail panel (landscape left column) ─────────────────

  const renderDetail = () => {
    if (selectedIdx === null) {
      return (
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>
          Tap a point to see details
        </p>
      )
    }

    if (metric === 'max1rm') {
      const pt         = rmDisplay[selectedIdx]
      const sinceFirst = selectedIdx > 0 ? pt.est1rm - rmDisplay[0].est1rm : null
      const fromPrev   = selectedIdx > 0 ? pt.est1rm - rmDisplay[selectedIdx-1].est1rm : null
      return (
        <div>
          <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>
            {formatTooltipDate(pt.date)}
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
            <span style={{ color: '#ED742F', fontSize: 24, fontWeight: 900, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>{pt.est1rm}</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{unitLabel}</span>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, letterSpacing: '0.05em' }}>EST. 1RM</span>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {sinceFirst !== null && (
              <div>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, letterSpacing: '0.06em', marginBottom: 1 }}>SINCE FIRST</p>
                <p style={{ color: sinceFirst >= 0 ? '#ED742F' : '#888', fontSize: 13, fontWeight: 700 }}>
                  {sinceFirst >= 0 ? '+' : ''}{sinceFirst} {unitLabel}
                </p>
              </div>
            )}
            {fromPrev !== null && (
              <div>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, letterSpacing: '0.06em', marginBottom: 1 }}>FROM PREV</p>
                <p style={{ color: fromPrev > 0 ? '#ED742F' : fromPrev < 0 ? '#888' : 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: 700 }}>
                  {fromPrev > 0 ? '+' : ''}{fromPrev} {unitLabel}
                </p>
              </div>
            )}
          </div>
        </div>
      )
    }

    if (metric === 'daily-volume') {
      const pt  = volDisplay[selectedIdx]
      const vol = pt.volume
      return (
        <div>
          <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>
            {formatTooltipDate(pt.date)}
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ color: 'rgba(237,116,47,0.9)', fontSize: 24, fontWeight: 900, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
              {vol >= 1000 ? `${(vol/1000).toFixed(1)}k` : vol.toLocaleString()}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{unitLabel}</span>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, letterSpacing: '0.05em' }}>VOLUME</span>
          </div>
        </div>
      )
    }

    const pt         = bwDisplay[selectedIdx]
    const sinceFirst = selectedIdx > 0 ? Math.round((pt.weight - bwDisplay[0].weight) * 10) / 10 : null
    const fromPrev   = selectedIdx > 0 ? Math.round((pt.weight - bwDisplay[selectedIdx-1].weight) * 10) / 10 : null
    return (
      <div>
        <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>
          {formatTooltipDate(pt.date)}
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
          <span style={{ color: '#94A3B8', fontSize: 24, fontWeight: 900, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>{pt.weight}</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{unitLabel}</span>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, letterSpacing: '0.05em' }}>BODY WEIGHT</span>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {sinceFirst !== null && (
            <div>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, letterSpacing: '0.06em', marginBottom: 1 }}>SINCE FIRST</p>
              <p style={{ color: sinceFirst <= 0 ? '#4ade80' : '#ef4444', fontSize: 13, fontWeight: 700 }}>
                {sinceFirst > 0 ? '+' : ''}{sinceFirst.toFixed(1)} {unitLabel}
              </p>
            </div>
          )}
          {fromPrev !== null && (
            <div>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, letterSpacing: '0.06em', marginBottom: 1 }}>FROM PREV</p>
              <p style={{ color: fromPrev < 0 ? '#4ade80' : fromPrev > 0 ? '#ef4444' : 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: 700 }}>
                {fromPrev > 0 ? '+' : ''}{fromPrev.toFixed(1)} {unitLabel}
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Inline detail for portrait bottom bar ─────────────────────

  const renderDetailInline = (): React.ReactNode => {
    if (selectedIdx === null) return null

    if (metric === 'max1rm') {
      const pt         = rmDisplay[selectedIdx]
      const sinceFirst = selectedIdx > 0 ? pt.est1rm - rmDisplay[0].est1rm : null
      const fromPrev   = selectedIdx > 0 ? pt.est1rm - rmDisplay[selectedIdx - 1].est1rm : null
      return (
        <>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{formatTooltipDate(pt.date)}</span>
          <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11 }}> · </span>
          <span style={{ color: '#ED742F', fontSize: 13, fontWeight: 800 }}>{pt.est1rm}{unitLabel}</span>
          {sinceFirst !== null && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11 }}> · </span>
              <span style={{ color: sinceFirst >= 0 ? '#ED742F' : '#888', fontSize: 11 }}>
                {sinceFirst >= 0 ? '+' : ''}{sinceFirst}{unitLabel} since first
              </span>
            </>
          )}
          {fromPrev !== null && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11 }}> · </span>
              <span style={{ color: fromPrev > 0 ? '#ED742F' : fromPrev < 0 ? '#888' : 'rgba(255,255,255,0.22)', fontSize: 11 }}>
                {fromPrev > 0 ? '+' : ''}{fromPrev}{unitLabel} from prev
              </span>
            </>
          )}
        </>
      )
    }

    if (metric === 'daily-volume') {
      const pt  = volDisplay[selectedIdx]
      const vol = pt.volume
      return (
        <>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{formatTooltipDate(pt.date)}</span>
          <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11 }}> · </span>
          <span style={{ color: 'rgba(237,116,47,0.9)', fontSize: 13, fontWeight: 800 }}>
            {vol >= 1000 ? `${(vol/1000).toFixed(1)}k` : vol.toLocaleString()}{unitLabel}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11 }}> volume</span>
        </>
      )
    }

    const pt         = bwDisplay[selectedIdx]
    const sinceFirst = selectedIdx > 0 ? Math.round((pt.weight - bwDisplay[0].weight) * 10) / 10 : null
    return (
      <>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{formatTooltipDate(pt.date)}</span>
        <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11 }}> · </span>
        <span style={{ color: '#94A3B8', fontSize: 13, fontWeight: 800 }}>{pt.weight}{unitLabel}</span>
        {sinceFirst !== null && (
          <>
            <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11 }}> · </span>
            <span style={{ color: sinceFirst <= 0 ? '#4ade80' : '#ef4444', fontSize: 11 }}>
              {sinceFirst > 0 ? '+' : ''}{sinceFirst.toFixed(1)}{unitLabel} since first
            </span>
          </>
        )}
      </>
    )
  }

  // ── Chart content ─────────────────────────────────────────────

  const hasData =
    (metric === 'max1rm'        && rmDisplay.length  > 0) ||
    (metric === 'daily-volume'  && volDisplay.length > 0) ||
    (metric === 'body-weight'   && bwDisplay.length  >= 2)

  const chartContent = () => {
    if (!hasData) {
      return (
        <div style={{ height: chartH, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#333', fontSize: 12, fontWeight: 700 }}>No data for this period</p>
        </div>
      )
    }

    if (metric === 'max1rm') {
      const w = rmChartW
      return (
        <div style={{ position: 'relative' }}>
          {w > chartAreaW && (
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 20, zIndex: 1, pointerEvents: 'none',
              background: 'linear-gradient(to right, rgba(8,8,8,0.92), transparent)' }} />
          )}
          <div ref={scrollRef} className="overflow-x-auto overscroll-x-contain no-scrollbar"
            style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
            <LineChart width={w} height={chartH} data={rmDisplay}
              margin={{ top: 12, right: 20, bottom: 5, left: 4 }} onClick={handleClick}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.055)" vertical={false} />
              <XAxis dataKey="date" ticks={rmXAxis.ticks} tickFormatter={rmXAxis.formatter}
                tick={{ fill: '#3a3a3a', fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#3a3a3a', fontSize: 9 }} tickLine={false} axisLine={false}
                width={38} domain={[rmAxis.yMin, rmAxis.yMax]} ticks={rmTicks} />
              <Tooltip content={rmTooltip} cursor={{ stroke: 'rgba(255,255,255,0.07)' }} />
              <Line type="linear" dataKey="est1rm" stroke="#ED742F" strokeWidth={1.5}
                dot={rmDot as any}
                activeDot={{ r: 5, fill: '#ED742F', stroke: 'rgba(255,255,255,0.75)', strokeWidth: 1.5 }}
                isAnimationActive={false} />
            </LineChart>
          </div>
        </div>
      )
    }

    if (metric === 'daily-volume') {
      const w = volChartW
      return (
        <div style={{ position: 'relative' }}>
          {w > chartAreaW && (
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 20, zIndex: 1, pointerEvents: 'none',
              background: 'linear-gradient(to right, rgba(8,8,8,0.92), transparent)' }} />
          )}
          <div ref={scrollRef} className="overflow-x-auto overscroll-x-contain no-scrollbar"
            style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
            <BarChart width={w} height={chartH} data={volDisplay}
              margin={{ top: 12, right: 20, bottom: 5, left: 4 }} onClick={handleClick}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.055)" vertical={false} />
              <XAxis dataKey="date" ticks={volXAxis.ticks} tickFormatter={volXAxis.formatter}
                tick={{ fill: '#3a3a3a', fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#3a3a3a', fontSize: 9 }} tickLine={false} axisLine={false}
                width={44} domain={[0, volAxis.yMax]} ticks={volTicks}
                tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
              <Tooltip content={volTooltip} cursor={{ stroke: 'rgba(255,255,255,0.05)', fill: 'rgba(255,255,255,0.02)' }} />
              <Bar dataKey="volume" fill="rgba(237,116,47,0.62)" radius={[2,2,0,0]} maxBarSize={14} isAnimationActive={false} />
            </BarChart>
          </div>
        </div>
      )
    }

    const w = bwChartW
    return (
      <div style={{ position: 'relative' }}>
        {w > chartAreaW && (
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 20, zIndex: 1, pointerEvents: 'none',
            background: 'linear-gradient(to right, rgba(8,8,8,0.92), transparent)' }} />
        )}
        <div ref={scrollRef} className="overflow-x-auto overscroll-x-contain no-scrollbar"
          style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          <LineChart width={w} height={chartH} data={bwDisplay}
            margin={{ top: 12, right: 20, bottom: 5, left: 4 }} onClick={handleClick}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.055)" vertical={false} />
            <XAxis dataKey="date" ticks={bwXAxis.ticks} tickFormatter={bwXAxis.formatter}
              tick={{ fill: '#3a3a3a', fontSize: 9 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#3a3a3a', fontSize: 9 }} tickLine={false} axisLine={false}
              width={38} domain={[bwAxis.yMin, bwAxis.yMax]} ticks={bwTicks} />
            <Tooltip content={bwTooltip} cursor={{ stroke: 'rgba(255,255,255,0.07)' }} />
            <ReferenceLine y={bwDisplay[0]?.weight} stroke="rgba(255,255,255,0.07)" strokeDasharray="4 4" />
            <Line type="linear" dataKey="weight" stroke="#94A3B8" strokeWidth={1.5}
              dot={bwDot as any}
              activeDot={{ r: 5, fill: '#94A3B8', stroke: 'rgba(255,255,255,0.7)', strokeWidth: 1.5 }}
              isAnimationActive={false} />
          </LineChart>
        </div>
      </div>
    )
  }

  // ── Header strings ────────────────────────────────────────────

  const metricLabel = metric === 'max1rm' ? 'MAX 1RM' : metric === 'daily-volume' ? 'DAILY VOLUME' : 'BODY WEIGHT'
  const rangeLabel  = ({ '30D':'30D','90D':'90D','6M':'6M','1Y':'1Y','All':'ALL' } as Record<Period,string>)[period]
  const titleMain   = exercise || metricLabel
  const titleSub    = exercise ? `${metricLabel} · ${rangeLabel}` : rangeLabel

  // ── Sub-components ────────────────────────────────────────────

  const Header = () => (
    <div style={{
      flexShrink: 0,
      background: 'rgba(8,8,8,0.97)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      paddingTop: 'env(safe-area-inset-top, 0px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: isLandscape ? '6px 16px' : '8px 16px' }}>
        <button onClick={goBack} aria-label="Back"
          style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'rgba(255,255,255,0.65)', padding: '4px 4px 4px 0', flexShrink: 0 }}>
          <ChevronLeft size={20} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Back</span>
        </button>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <p style={{ color: '#f5f5f5', fontSize: isLandscape ? 12 : 14, fontWeight: 900, letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {titleMain}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: 700, letterSpacing: '0.07em' }}>
            {titleSub}
          </p>
        </div>
      </div>
    </div>
  )

  // Compact KPI row for portrait — supplementary info, not the focus.
  const KpiRow = () => (
    <div className="no-scrollbar" style={{ flexShrink: 0, overflowX: 'auto', padding: '6px 10px 4px' }}>
      <div style={{ display: 'flex', gap: 5, minWidth: 'max-content' }}>
        {kpis.map((kpi, i) => (
          <div key={i} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '5px 10px', minWidth: 58 }}>
            <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 1 }}>{kpi.label}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
              <span style={{ color: kpi.accent ? '#ED742F' : '#f0f0f0', fontSize: 17, fontWeight: 900, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
                {kpi.value}
              </span>
              {kpi.unit && <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 8 }}>{kpi.unit}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // Thin bottom bar: hint text when nothing selected, inline detail when a point is tapped.
  const DetailBar = () => (
    <div style={{
      flexShrink: 0,
      minHeight: 48,
      display: 'flex',
      alignItems: 'center',
      padding: '8px 14px',
      paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + 8px)`,
      background: 'rgba(255,255,255,0.02)',
      borderTop: '1px solid rgba(255,255,255,0.05)',
    }}>
      {selectedIdx === null ? (
        <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: 12 }}>Tap any point for details</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
          {renderDetailInline()}
        </div>
      )}
    </div>
  )

  const DetailPanel = ({ style }: { style?: React.CSSProperties }) => (
    <div style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 14px', ...style }}>
      {renderDetail()}
    </div>
  )

  // ── Portrait ──────────────────────────────────────────────────

  if (!isLandscape) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: '#080808', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header />
        <KpiRow />
        {/* Chart container — plain div, not an inline component, so it never remounts */}
        <div ref={chartContainerRef} style={{ flex: 1, overflow: 'hidden', padding: '6px 8px 0' }}>
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '8px 2px 4px', overflow: 'hidden', height: '100%' }}>
            {chartContent()}
          </div>
        </div>
        <DetailBar />
      </div>
    )
  }

  // ── Landscape ─────────────────────────────────────────────────

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: '#080808', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left panel: KPI + detail */}
        <div style={{ width: '36%', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {kpis.map((kpi, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 2px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 9, fontWeight: 700, letterSpacing: '0.07em' }}>{kpi.label}</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                  <span style={{ color: kpi.accent ? '#ED742F' : '#f0f0f0', fontSize: 16, fontWeight: 900, fontFamily: 'var(--font-mono)' }}>{kpi.value}</span>
                  {kpi.unit && <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 9 }}>{kpi.unit}</span>}
                </div>
              </div>
            ))}
          </div>
          <DetailPanel style={{ flex: 1 }} />
        </div>
        {/* Right panel — plain div, not an inline component, so it never remounts */}
        <div style={{ flex: 1, padding: '8px', overflow: 'hidden' }}>
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '8px 2px 4px', overflow: 'hidden', height: '100%' }}>
            {chartContent()}
          </div>
        </div>
      </div>
    </div>
  )
}
