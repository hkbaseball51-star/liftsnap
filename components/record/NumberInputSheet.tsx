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
  label, value, unit, step: _step, quickSteps, isInteger = false, onConfirm, onClose,
}: Props) {
  const [current, setCurrent] = useState(value ?? 0)
  const [inputVal, setInputVal] = useState(String(value ?? 0))

  useEffect(() => {
    const n = value ?? 0
    setCurrent(n)
    setInputVal(String(n))
  }, [value])

  const adjust = (delta: number) => {
    const raw = Math.max(0, Math.round((current + delta) * 100) / 100)
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
    <div
      className="fixed inset-0 z-[60] flex items-end"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}>

      {/* Sheet — max-height constrains to viewport, flex-col keeps footer pinned */}
      <div
        className="w-full rounded-t-3xl flex flex-col"
        style={{
          background: '#111',
          border: '1px solid #1e1e1e',
          maxHeight: 'calc(100dvh - 4rem)',
        }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-3 shrink-0">
          <span className="text-[10px] font-black tracking-widest" style={{ color: '#555' }}>{label}</span>
          <button onClick={onClose}><X size={20} style={{ color: '#555' }} /></button>
        </div>

        {/* Body — scrolls if content overflows on very small screens */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">

          {/* Large number input */}
          <div className="flex items-baseline justify-center gap-2 mb-6 mt-2">
            <input
              type="text"
              inputMode={isInteger ? 'numeric' : 'decimal'}
              pattern={isInteger ? '[0-9０-９]*' : '[0-9０-９]*[.]?[0-9０-９]*'}
              value={inputVal}
              onChange={e => handleInput(e.target.value)}
              className="bg-transparent text-center font-black text-white outline-none w-40"
              style={{
                fontSize: 'clamp(48px, 14vw, 72px)',
                fontFamily: 'var(--font-mono)',
                caretColor: '#ff6b00',
              }}
            />
            <span className="text-xl font-black" style={{ color: '#444', fontFamily: 'var(--font-mono)' }}>
              {unit}
            </span>
          </div>

          {/* Quick adjust buttons — 3-col grid for 6 items, 4-col for 4 items */}
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${quickSteps.length === 6 ? 3 : quickSteps.length}, 1fr)` }}>
            {quickSteps.map(s => (
              <button
                key={s}
                className="py-3 rounded-2xl font-black"
                style={{
                  fontSize: quickSteps.length === 6 ? 13 : 14,
                  background: '#1a1a1a',
                  color: s > 0 ? '#ff6b00' : '#555',
                  border: '1px solid #222',
                  minHeight: 44,
                }}
                onClick={() => adjust(s)}>
                {s > 0 ? `+${s}` : s}
              </button>
            ))}
          </div>

        </div>

        {/* Footer — always visible, respects safe-area-inset-bottom */}
        <div
          className="px-6 pt-3 shrink-0"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}>
          <button
            className="w-full py-4 rounded-2xl text-base font-black text-white tracking-widest"
            style={{ background: '#ff6b00', boxShadow: '0 4px 20px rgba(255,107,0,0.3)' }}
            onClick={() => { onConfirm(confirmValue); onClose() }}>
            SET
          </button>
        </div>

      </div>
    </div>
  )
}
