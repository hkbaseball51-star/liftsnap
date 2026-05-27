'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

type Props = {
  defaultSeconds?: number
  onClose: () => void
}

export default function RestTimerSheet({ defaultSeconds = 90, onClose }: Props) {
  const [total, setTotal] = useState(defaultSeconds)
  const [remaining, setRemaining] = useState(defaultSeconds)
  const [running, setRunning] = useState(true)

  useEffect(() => {
    if (!running) return
    if (remaining <= 0) {
      setRunning(false)
      return
    }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [running, remaining])

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const progress = remaining / total

  const presets = [60, 90, 120, 180]

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}>
      <div className="w-full rounded-t-3xl p-6 pb-10" style={{ background: '#1a1a1a' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold" style={{ color: '#888' }}>レスト タイマー</span>
          <button onClick={onClose}><X size={20} style={{ color: '#888' }} /></button>
        </div>

        {/* Circle progress */}
        <div className="flex justify-center mb-4">
          <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 144 144">
              <circle cx="72" cy="72" r="60" fill="none" stroke="#2a2a2a" strokeWidth="8" />
              <circle cx="72" cy="72" r="60" fill="none" stroke={remaining > 0 ? '#ff6b00' : '#22c55e'}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 60}`}
                strokeDashoffset={`${2 * Math.PI * 60 * (1 - progress)}`}
                style={{ transition: 'stroke-dashoffset 1s linear' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {remaining > 0 ? (
                <span className="text-4xl font-black text-white">
                  {minutes}:{String(seconds).padStart(2, '0')}
                </span>
              ) : (
                <span className="text-2xl font-black" style={{ color: '#22c55e' }}>完了！</span>
              )}
            </div>
          </div>
        </div>

        {/* Presets */}
        <div className="flex gap-2 mb-4">
          {presets.map(s => (
            <button key={s}
              className="flex-1 py-2 rounded-xl text-xs font-bold"
              style={{ background: total === s ? '#ff6b00' : '#242424', color: total === s ? '#fff' : '#888' }}
              onClick={() => { setTotal(s); setRemaining(s); setRunning(true) }}>
              {s < 60 ? `${s}s` : `${s / 60}分`}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button className="flex-1 py-3 rounded-2xl text-sm font-bold"
            style={{ background: '#242424', color: '#888' }}
            onClick={() => { setRunning(r => !r) }}>
            {running ? '一時停止' : '再開'}
          </button>
          <button className="flex-1 py-3 rounded-2xl text-sm font-bold text-white"
            style={{ background: '#ff6b00' }}
            onClick={onClose}>
            スキップ
          </button>
        </div>
      </div>
    </div>
  )
}
