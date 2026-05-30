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
    if (remaining <= 0) { setRunning(false); return }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [running, remaining])

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const progress = remaining / total

  const presets = [60, 90, 120, 180]

  return (
    <div className="fixed inset-0 z-[60] flex items-end" style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}>
      <div className="w-full rounded-t-3xl p-6 pb-10" style={{ background: '#111', border: '1px solid #1e1e1e' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <span className="text-[10px] font-black tracking-widest" style={{ color: '#555' }}>REST TIMER</span>
          <button onClick={onClose}><X size={20} style={{ color: '#555' }} /></button>
        </div>

        {/* Ring */}
        <div className="flex justify-center mb-5">
          <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 144 144">
              <circle cx="72" cy="72" r="60" fill="none" stroke="#1a1a1a" strokeWidth="8" />
              <circle cx="72" cy="72" r="60" fill="none"
                stroke={remaining > 0 ? '#ff6b00' : '#22c55e'}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 60}`}
                strokeDashoffset={`${2 * Math.PI * 60 * (1 - progress)}`}
                style={{ transition: 'stroke-dashoffset 1s linear' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {remaining > 0 ? (
                <span className="text-4xl font-black text-white"
                  style={{ fontFamily: 'var(--font-mono)' }}>
                  {minutes}:{String(seconds).padStart(2, '0')}
                </span>
              ) : (
                <span className="text-xl font-black tracking-widest" style={{ color: '#22c55e' }}>DONE!</span>
              )}
            </div>
          </div>
        </div>

        {/* Presets */}
        <div className="flex gap-2 mb-5">
          {presets.map(s => (
            <button key={s}
              className="flex-1 py-2.5 rounded-xl text-xs font-black tracking-wider"
              style={{
                background: total === s ? '#ff6b00' : '#1a1a1a',
                color: total === s ? '#fff' : '#555',
                border: total === s ? 'none' : '1px solid #1e1e1e',
              }}
              onClick={() => { setTotal(s); setRemaining(s); setRunning(true) }}>
              {s < 60 ? `${s}s` : `${s / 60}min`}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button className="flex-1 py-3.5 rounded-2xl text-sm font-black tracking-widest"
            style={{ background: '#1a1a1a', color: '#666', border: '1px solid #1e1e1e' }}
            onClick={() => setRunning(r => !r)}>
            {running ? 'PAUSE' : 'RESUME'}
          </button>
          <button className="flex-1 py-3.5 rounded-2xl text-sm font-black text-white tracking-widest"
            style={{ background: '#ff6b00' }}
            onClick={onClose}>
            SKIP
          </button>
        </div>
      </div>
    </div>
  )
}
