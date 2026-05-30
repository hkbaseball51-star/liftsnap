'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { parseFlexibleNumber } from '@/lib/number'

type Props = {
  label: string
  value: number | null
  unit: string
  step: number
  quickSteps: number[]
  isInteger?: boolean
  onConfirm: (value: number) => void
  onClose: () => void
}

export default function NumberInputSheet({
  label, value, unit, step, quickSteps, isInteger = false, onConfirm, onClose,
}: Props) {
  const [current, setCurrent] = useState(value ?? 0)
  const [inputVal, setInputVal] = useState(String(value ?? 0))

  useEffect(() => {
    const n = value ?? 0
    setCurrent(n)
    setInputVal(String(n))
  }, [value])

  const adjust = (delta: number) => {
    const raw = Math.max(0, Math.round((current + delta) * 10) / 10)
    const next = isInteger ? Math.floor(raw) : raw
    setCurrent(next)
    setInputVal(String(next))
  }

  const handleInput = (v: string) => {
    setInputVal(v)
    const n = parseFlexibleNumber(v)
    if (n !== null && n >= 0) {
      setCurrent(isInteger ? Math.floor(n) : n)
    }
  }

  const confirmValue = isInteger ? Math.floor(current) : current

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}>
      <div className="w-full rounded-t-3xl p-6 pb-10" style={{ background: '#111', border: '1px solid #1e1e1e' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-6">
          <span className="text-[10px] font-black tracking-widest" style={{ color: '#555' }}>{label}</span>
          <button onClick={onClose}><X size={20} style={{ color: '#555' }} /></button>
        </div>

        {/* Large number input — user taps here to type */}
        <div className="flex items-baseline justify-center gap-2 mb-6">
          <input
            type="text"
            inputMode={isInteger ? 'numeric' : 'decimal'}
            pattern={isInteger ? '[0-9０-９]*' : '[0-9０-９]*[.]?[0-9０-９]*'}
            value={inputVal}
            onChange={e => handleInput(e.target.value)}
            className="bg-transparent text-center text-6xl font-black text-white outline-none w-40"
            style={{ fontFamily: 'var(--font-mono)', caretColor: '#ff6b00' }}
          />
          <span className="text-xl font-black" style={{ color: '#444', fontFamily: 'var(--font-mono)' }}>{unit}</span>
        </div>

        {/* Quick adjust */}
        <div className="flex gap-2 mb-5">
          {quickSteps.map(s => (
            <button key={s}
              className="flex-1 py-3 rounded-2xl text-sm font-black"
              style={{
                background: '#1a1a1a',
                color: s > 0 ? '#ff6b00' : '#555',
                border: '1px solid #222',
              }}
              onClick={() => adjust(s)}>
              {s > 0 ? `+${s}` : s}
            </button>
          ))}
        </div>

        {/* Confirm */}
        <button
          className="w-full py-4 rounded-2xl text-base font-black text-white tracking-widest"
          style={{ background: '#ff6b00', boxShadow: '0 4px 20px rgba(255,107,0,0.3)' }}
          onClick={() => { onConfirm(confirmValue); onClose() }}>
          SET
        </button>
      </div>
    </div>
  )
}
