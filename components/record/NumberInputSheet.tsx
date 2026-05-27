'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

type Props = {
  label: string
  value: number | null
  unit: string
  step: number
  quickSteps: number[]
  onConfirm: (value: number) => void
  onClose: () => void
}

export default function NumberInputSheet({ label, value, unit, step, quickSteps, onConfirm, onClose }: Props) {
  const [current, setCurrent] = useState(value ?? 0)
  const [inputVal, setInputVal] = useState(String(value ?? 0))

  useEffect(() => {
    setCurrent(value ?? 0)
    setInputVal(String(value ?? 0))
  }, [value])

  const adjust = (delta: number) => {
    const next = Math.max(0, Math.round((current + delta) * 10) / 10)
    setCurrent(next)
    setInputVal(String(next))
  }

  const handleInput = (v: string) => {
    setInputVal(v)
    const n = parseFloat(v)
    if (!isNaN(n) && n >= 0) setCurrent(n)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}>
      <div className="w-full rounded-t-3xl p-6 pb-10" style={{ background: '#1a1a1a' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-bold" style={{ color: '#888' }}>{label}</span>
          <button onClick={onClose}><X size={20} style={{ color: '#888' }} /></button>
        </div>

        {/* Large number display */}
        <div className="flex items-baseline justify-center gap-2 mb-6">
          <input
            type="number"
            inputMode="decimal"
            value={inputVal}
            onChange={e => handleInput(e.target.value)}
            className="bg-transparent text-center text-6xl font-black text-white outline-none w-40"
            style={{ caretColor: '#ff6b00' }}
          />
          <span className="text-xl font-bold" style={{ color: '#888' }}>{unit}</span>
        </div>

        {/* Quick adjust */}
        <div className="flex gap-2 mb-6">
          {quickSteps.map(s => (
            <button key={s}
              className="flex-1 py-3 rounded-2xl text-sm font-bold"
              style={{ background: '#242424', color: s > 0 ? '#ff6b00' : '#888' }}
              onClick={() => adjust(s)}>
              {s > 0 ? `+${s}` : s}
            </button>
          ))}
        </div>

        {/* Confirm */}
        <button
          className="w-full py-4 rounded-2xl text-base font-black text-white"
          style={{ background: '#ff6b00' }}
          onClick={() => { onConfirm(current); onClose() }}>
          確定
        </button>
      </div>
    </div>
  )
}
