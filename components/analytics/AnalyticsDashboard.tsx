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

const TABS = ['MAX PR', 'ボリューム', '体重'] as const
type Tab = typeof TABS[number]

const tooltipStyle = {
  contentStyle: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, color: '#fff' },
  labelStyle: { color: '#888', fontSize: 11 },
  itemStyle: { color: '#ff6b00', fontWeight: 'bold' },
  cursor: { stroke: '#333' },
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
      <div className="flex gap-1 mb-5 p-1 rounded-2xl" style={{ background: '#1a1a1a' }}>
        {TABS.map(t => (
          <button key={t}
            className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all"
            style={{
              background: tab === t ? '#ff6b00' : 'transparent',
              color: tab === t ? '#fff' : '#555',
            }}
            onClick={() => handleTabChange(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* MAX PR Tab */}
      {tab === 'MAX PR' && (
        <div>
          {/* Exercise selector */}
          {exercises.length === 0 ? (
            <EmptyState text="記録を始めるとPRグラフが表示されます" />
          ) : (
            <>
              <div className="mb-4 overflow-x-auto">
                <div className="flex gap-2 pb-1">
                  {exercises.map(e => (
                    <button key={e.name}
                      className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold"
                      style={{
                        background: selectedExercise === e.name ? '#ff6b00' : '#1a1a1a',
                        color: selectedExercise === e.name ? '#fff' : '#888',
                        border: '1px solid #2a2a2a',
                      }}
                      onClick={() => selectExercise(e.name)}>
                      {e.name}
                    </button>
                  ))}
                </div>
              </div>

              {currentPR !== null && (
                <div className="rounded-2xl p-4 mb-4 flex items-center justify-between"
                  style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: '#888' }}>自己ベスト</p>
                    <p className="text-2xl font-black text-white">{currentPR} <span className="text-sm font-bold" style={{ color: '#888' }}>kg</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs mb-0.5" style={{ color: '#888' }}>記録回数</p>
                    <p className="text-2xl font-black text-white">{prData.length} <span className="text-sm font-bold" style={{ color: '#888' }}>回</span></p>
                  </div>
                </div>
              )}

              <div className="rounded-2xl p-4" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
                <p className="text-xs font-bold mb-4" style={{ color: '#888' }}>最大重量の推移</p>
                {prLoading ? (
                  <div className="h-48 flex items-center justify-center">
                    <p className="text-sm" style={{ color: '#555' }}>読み込み中...</p>
                  </div>
                ) : prData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center">
                    <p className="text-sm" style={{ color: '#555' }}>データなし</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={prData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                      <XAxis dataKey="label" tick={{ fill: '#555', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#555', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} kg`, '最大重量']} />
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

      {/* Volume Tab */}
      {tab === 'ボリューム' && (
        <div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-2xl p-4" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
              <p className="text-xs mb-1" style={{ color: '#888' }}>今週</p>
              <p className="text-xl font-black text-white">{formatVolume(thisWeekVol)}</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
              <p className="text-xs mb-1" style={{ color: '#888' }}>先週比</p>
              {volDiff !== null ? (
                <p className="text-xl font-black" style={{ color: volDiff >= 0 ? '#22c55e' : '#ef4444' }}>
                  {volDiff >= 0 ? '+' : ''}{volDiff}%
                </p>
              ) : (
                <p className="text-xl font-black" style={{ color: '#555' }}>—</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <p className="text-xs font-bold mb-4" style={{ color: '#888' }}>週次ボリューム (12週)</p>
            {volumeData.every(d => d.volume === 0) ? (
              <div className="h-48 flex items-center justify-center">
                <p className="text-sm" style={{ color: '#555' }}>記録を始めるとグラフが表示されます</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={volumeData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#555', fontSize: 9 }} tickLine={false} axisLine={false}
                    interval={2} />
                  <YAxis tick={{ fill: '#555', fontSize: 10 }} tickLine={false} axisLine={false}
                    tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [formatVolume(v), 'ボリューム']} />
                  <Bar dataKey="volume" fill="#ff6b00" radius={[4, 4, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Body Weight Tab */}
      {tab === '体重' && (
        <div>
          {/* Quick input */}
          <div className="rounded-2xl p-4 mb-4 flex items-center gap-3"
            style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <div className="flex-1">
              <p className="text-xs mb-1.5" style={{ color: '#888' }}>今日の体重</p>
              <div className="flex items-baseline gap-1.5">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder={latestWeight ? String(latestWeight) : '70.0'}
                  value={bwInput}
                  onChange={e => setBwInput(e.target.value)}
                  className="w-20 bg-transparent text-white text-xl font-black outline-none placeholder:text-gray-700"
                />
                <span className="text-sm" style={{ color: '#555' }}>kg</span>
              </div>
            </div>
            <button
              className="px-5 py-3 rounded-xl text-sm font-black"
              style={{ background: bwInput ? '#ff6b00' : '#2a2a2a', color: '#fff' }}
              disabled={!bwInput || bwSaving}
              onClick={saveBW}>
              {bwSaving ? '保存中' : '記録'}
            </button>
          </div>

          {latestWeight && (
            <div className="rounded-2xl p-4 mb-4 flex items-center justify-between"
              style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
              <div>
                <p className="text-xs mb-0.5" style={{ color: '#888' }}>最新</p>
                <p className="text-2xl font-black text-white">{latestWeight} <span className="text-sm font-bold" style={{ color: '#888' }}>kg</span></p>
              </div>
              {bwData.length >= 2 && (() => {
                const diff = bwData[bwData.length - 1].weight - bwData[0].weight
                return (
                  <div className="text-right">
                    <p className="text-xs mb-0.5" style={{ color: '#888' }}>期間変化</p>
                    <p className="text-xl font-black" style={{ color: diff <= 0 ? '#22c55e' : '#ef4444' }}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                    </p>
                  </div>
                )
              })()}
            </div>
          )}

          <div className="rounded-2xl p-4" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <p className="text-xs font-bold mb-4" style={{ color: '#888' }}>体重の推移 (90日)</p>
            {bwData.length < 2 ? (
              <div className="h-48 flex items-center justify-center">
                <p className="text-sm" style={{ color: '#555' }}>2日分以上記録するとグラフが表示されます</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={bwData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="label" tick={{ fill: '#555', fontSize: 10 }} tickLine={false} axisLine={false}
                    interval={Math.floor(bwData.length / 6)} />
                  <YAxis tick={{ fill: '#555', fontSize: 10 }} tickLine={false} axisLine={false}
                    domain={['auto', 'auto']} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} kg`, '体重']} />
                  <ReferenceLine y={bwData[0]?.weight} stroke="#333" strokeDasharray="4 4" />
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
    <div className="rounded-2xl p-8 text-center" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
      <p className="text-3xl mb-3">📊</p>
      <p className="text-sm" style={{ color: '#555' }}>{text}</p>
    </div>
  )
}
