'use client'

import { useState, useTransition } from 'react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import { getMaxPRData, saveBodyWeight } from '@/actions/analytics'
import { formatVolume } from '@/lib/utils'

type VolumePoint = { week: string; label: string; volume: number }
type WeightPoint = { date: string; label: string; weight: number }
type PRPoint = { date: string; label: string; maxWeight: number }
type Exercise = { name: string; muscle_group: string }

type Props = {
  volumeData: VolumePoint[]
  bodyWeightData: WeightPoint[]
  exercises: Exercise[]
}

const TABS = ['MAX PR', 'VOLUME', 'BODY WEIGHT'] as const
type Tab = typeof TABS[number]

const tooltipStyle = {
  contentStyle: { background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, color: '#fff' },
  labelStyle: { color: '#555', fontSize: 10 },
  itemStyle: { color: '#ff6b00', fontWeight: 'bold' },
  cursor: { stroke: '#222' },
}

export default function AnalyticsDashboard({ volumeData, bodyWeightData, exercises }: Props) {
  const [tab, setTab] = useState<Tab>('MAX PR')
  const [selectedExercise, setSelectedExercise] = useState(exercises[0]?.name ?? '')
  const [prData, setPrData] = useState<PRPoint[]>([])
  const [prLoading, startPrTransition] = useTransition()

  const [bwInput, setBwInput] = useState('')
  const [bwSaving, startBwTransition] = useTransition()
  const [bwData, setBwData] = useState(bodyWeightData)

  const selectExercise = (name: string) => {
    setSelectedExercise(name)
    startPrTransition(async () => {
      const data = await getMaxPRData(name)
      setPrData(data)
    })
  }

  const handleTabChange = (t: Tab) => {
    setTab(t)
    if (t === 'MAX PR' && selectedExercise && prData.length === 0) {
      selectExercise(selectedExercise)
    }
  }

  const saveBW = () => {
    const v = parseFloat(bwInput)
    if (isNaN(v) || v <= 0) return
    startBwTransition(async () => {
      await saveBodyWeight(v)
      const today = new Date()
      const label = `${today.getMonth() + 1}/${today.getDate()}`
      const date = today.toISOString().split('T')[0]
      setBwData(prev => {
        const filtered = prev.filter(p => p.date !== date)
        return [...filtered, { date, label, weight: v }].sort((a, b) => a.date.localeCompare(b.date))
      })
      setBwInput('')
    })
  }

  const currentPR = prData.length > 0 ? Math.max(...prData.map(p => p.maxWeight)) : null
  const latestWeight = bwData.length > 0 ? bwData[bwData.length - 1].weight : null
  const thisWeekVol = volumeData[volumeData.length - 1]?.volume ?? 0
  const lastWeekVol = volumeData[volumeData.length - 2]?.volume ?? 0
  const volDiff = lastWeekVol > 0 ? Math.round(((thisWeekVol - lastWeekVol) / lastWeekVol) * 100) : null

  return (
    <div className="min-h-screen px-4 pt-14 pb-nav" style={{ background: '#0a0a0a' }}>
      <h1 className="text-xl font-black tracking-widest text-white mb-5">ANALYTICS</h1>

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 p-1 rounded-2xl" style={{ background: '#111' }}>
        {TABS.map(t => (
          <button key={t}
            className="flex-1 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all"
            style={{
              background: tab === t ? '#ff6b00' : 'transparent',
              color: tab === t ? '#fff' : '#444',
            }}
            onClick={() => handleTabChange(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* MAX PR Tab */}
      {tab === 'MAX PR' && (
        <div>
          {exercises.length === 0 ? (
            <EmptyState text="Log workouts to see your PR chart" />
          ) : (
            <>
              <div className="mb-4 overflow-x-auto no-scrollbar">
                <div className="flex gap-2 pb-1">
                  {exercises.map(e => (
                    <button key={e.name}
                      className="shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider"
                      style={{
                        background: selectedExercise === e.name ? '#ff6b00' : '#111',
                        color: selectedExercise === e.name ? '#fff' : '#555',
                        border: selectedExercise === e.name ? 'none' : '1px solid #1e1e1e',
                      }}
                      onClick={() => selectExercise(e.name)}>
                      {e.name}
                    </button>
                  ))}
                </div>
              </div>

              {currentPR !== null && (
                <div className="rounded-2xl p-4 mb-4 flex items-center justify-between"
                  style={{ background: '#111', border: '1px solid #1e1e1e' }}>
                  <div>
                    <p className="text-[9px] font-black tracking-widest mb-1" style={{ color: '#444' }}>ALL-TIME BEST</p>
                    <p className="text-2xl font-black text-white" style={{ fontFamily: 'var(--font-mono)' }}>
                      {currentPR}<span className="text-sm font-bold ml-1" style={{ color: '#555' }}>kg</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black tracking-widest mb-1" style={{ color: '#444' }}>SESSIONS</p>
                    <p className="text-2xl font-black text-white" style={{ fontFamily: 'var(--font-mono)' }}>
                      {prData.length}
                    </p>
                  </div>
                </div>
              )}

              <div className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
                <p className="text-[9px] font-black tracking-widest mb-4" style={{ color: '#444' }}>WEIGHT PROGRESSION</p>
                {prLoading ? (
                  <div className="h-48 flex items-center justify-center">
                    <p className="text-xs font-black tracking-widest" style={{ color: '#444' }}>LOADING...</p>
                  </div>
                ) : prData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center">
                    <p className="text-xs font-bold" style={{ color: '#444' }}>No data yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={prData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                      <XAxis dataKey="label" tick={{ fill: '#444', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#444', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} kg`, 'Max Weight']} />
                      <Line type="monotone" dataKey="maxWeight" stroke="#ff6b00" strokeWidth={2.5}
                        dot={{ fill: '#ff6b00', r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: '#ff6b00' }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* VOLUME Tab */}
      {tab === 'VOLUME' && (
        <div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
              <p className="text-[9px] font-black tracking-widest mb-1.5" style={{ color: '#444' }}>THIS WEEK</p>
              <p className="text-xl font-black text-white" style={{ fontFamily: 'var(--font-mono)' }}>
                {formatVolume(thisWeekVol)}
              </p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
              <p className="text-[9px] font-black tracking-widest mb-1.5" style={{ color: '#444' }}>VS LAST WEEK</p>
              {volDiff !== null ? (
                <p className="text-xl font-black" style={{ color: volDiff >= 0 ? '#22c55e' : '#ef4444', fontFamily: 'var(--font-mono)' }}>
                  {volDiff >= 0 ? '+' : ''}{volDiff}%
                </p>
              ) : (
                <p className="text-xl font-black" style={{ color: '#333', fontFamily: 'var(--font-mono)' }}>—</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
            <p className="text-[9px] font-black tracking-widest mb-4" style={{ color: '#444' }}>WEEKLY VOLUME (12 WEEKS)</p>
            {volumeData.every(d => d.volume === 0) ? (
              <div className="h-48 flex items-center justify-center">
                <p className="text-xs font-bold" style={{ color: '#444' }}>Log workouts to see your chart</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={volumeData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#444', fontSize: 9 }} tickLine={false} axisLine={false} interval={2} />
                  <YAxis tick={{ fill: '#444', fontSize: 10 }} tickLine={false} axisLine={false}
                    tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [formatVolume(v), 'Volume']} />
                  <Bar dataKey="volume" fill="#ff6b00" radius={[4, 4, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* BODY WEIGHT Tab */}
      {tab === 'BODY WEIGHT' && (
        <div>
          {/* Input */}
          <div className="rounded-2xl p-4 mb-4 flex items-center gap-3"
            style={{ background: '#111', border: '1px solid #1e1e1e' }}>
            <div className="flex-1">
              <p className="text-[9px] font-black tracking-widest mb-1.5" style={{ color: '#444' }}>TODAY'S WEIGHT</p>
              <div className="flex items-baseline gap-1.5">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder={latestWeight ? String(latestWeight) : '70.0'}
                  value={bwInput}
                  onChange={e => setBwInput(e.target.value)}
                  className="w-20 bg-transparent text-white text-xl font-black outline-none"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
                <span className="text-sm font-bold" style={{ color: '#555' }}>kg</span>
              </div>
            </div>
            <button
              className="px-5 py-3 rounded-xl text-xs font-black tracking-widest"
              style={{ background: bwInput ? '#ff6b00' : '#1a1a1a', color: '#fff' }}
              disabled={!bwInput || bwSaving}
              onClick={saveBW}>
              {bwSaving ? '...' : 'LOG'}
            </button>
          </div>

          {latestWeight && (
            <div className="rounded-2xl p-4 mb-4 flex items-center justify-between"
              style={{ background: '#111', border: '1px solid #1e1e1e' }}>
              <div>
                <p className="text-[9px] font-black tracking-widest mb-1" style={{ color: '#444' }}>LATEST</p>
                <p className="text-2xl font-black text-white" style={{ fontFamily: 'var(--font-mono)' }}>
                  {latestWeight}<span className="text-sm font-bold ml-1" style={{ color: '#555' }}>kg</span>
                </p>
              </div>
              {bwData.length >= 2 && (() => {
                const diff = bwData[bwData.length - 1].weight - bwData[0].weight
                return (
                  <div className="text-right">
                    <p className="text-[9px] font-black tracking-widest mb-1" style={{ color: '#444' }}>CHANGE</p>
                    <p className="text-xl font-black" style={{ color: diff <= 0 ? '#22c55e' : '#ef4444', fontFamily: 'var(--font-mono)' }}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                    </p>
                  </div>
                )
              })()}
            </div>
          )}

          <div className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
            <p className="text-[9px] font-black tracking-widest mb-4" style={{ color: '#444' }}>BODY WEIGHT (90 DAYS)</p>
            {bwData.length < 2 ? (
              <div className="h-48 flex items-center justify-center">
                <p className="text-xs font-bold" style={{ color: '#444' }}>Log 2+ days to see your chart</p>
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
                  <Line type="monotone" dataKey="weight" stroke="#7c3aed" strokeWidth={2.5}
                    dot={{ fill: '#7c3aed', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#7c3aed' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl p-8 text-center" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
      <p className="text-3xl mb-3">📊</p>
      <p className="text-sm font-bold" style={{ color: '#444' }}>{text}</p>
    </div>
  )
}
