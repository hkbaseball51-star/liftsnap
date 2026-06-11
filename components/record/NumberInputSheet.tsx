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

  // Dynamic font-size and input width to prevent number + unit overflow
  const numLen = inputVal.length
  const dispFontSize =
    numLen <= 3 ? 72 :
    numLen === 4 ? 64 :
    numLen === 5 ? 54 :
    numLen === 6 ? 46 :
    numLen === 7 ? 40 :
    34
  // 0.65× font-size ≈ monospace char width at font-weight 900; +20px safety buffer
  const dispInputWidth = Math.max(80, numLen * Math.ceil(dispFontSize * 0.65) + 20)

  // kg layout: 8 steps (3 rows), lbs layout: 10 steps (4 rows)
  const isWeightLayout = quickSteps.length === 8
  const isLbWeightLayout = quickSteps.length === 10

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end"
      style={{ background: 'var(--overlay-bg)' }}
      onClick={onClose}>

      {/* Sheet — max-height constrains to viewport, flex-col keeps footer pinned */}
      <div
        className="w-full rounded-t-3xl flex flex-col"
        style={{
          background: 'var(--card-bg-primary)',
          border: '1px solid var(--card-border-primary)',
          maxHeight: 'calc(100dvh - 4rem)',
        }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-3 shrink-0">
          <span className="text-[10px] font-black tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</span>
          <button onClick={onClose}><X size={20} style={{ color: 'var(--text-muted)' }} /></button>
        </div>

        {/* Body — scrolls if content overflows on very small screens */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">

          {/* Large number input */}
          <div className="flex items-baseline justify-center gap-2 mb-5 mt-2">
            <input
              type="text"
              inputMode={isInteger ? 'numeric' : 'decimal'}
              pattern={isInteger ? '[0-9０-９]*' : '[0-9０-９]*[.]?[0-9０-９]*'}
              value={inputVal}
              onChange={e => handleInput(e.target.value)}
              className="bg-transparent text-center font-black outline-none"
              style={{
                fontSize: dispFontSize,
                width: dispInputWidth,
                fontFamily: 'var(--font-mono)',
                caretColor: '#ED742F',
                color: 'var(--text-primary)',
              }}
            />
            <span className="text-xl font-black" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {unit}
            </span>
          </div>

          {/* Quick adjust buttons */}
          {isWeightLayout ? (
            // kg weight: 3 rows — row1: ±1.25/±2.5 (4-col), row2: ±5, row3: ±10 (2-col each)
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-4 gap-2">
                {quickSteps.slice(0, 4).map(s => (
                  <button
                    key={s}
                    className="rounded-xl font-black"
                    style={{
                      fontSize: 13,
                      background: 'var(--surface-chip)',
                      color: s > 0 ? '#ED742F' : 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      minHeight: 42,
                    }}
                    onClick={() => adjust(s)}>
                    {s > 0 ? `+${s}` : s}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {quickSteps.slice(4, 6).map(s => (
                  <button
                    key={s}
                    className="rounded-2xl font-black"
                    style={{
                      fontSize: 15,
                      background: 'var(--surface-chip)',
                      color: s > 0 ? '#ED742F' : 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      minHeight: 46,
                    }}
                    onClick={() => adjust(s)}>
                    {s > 0 ? `+${s}` : s}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {quickSteps.slice(6, 8).map(s => (
                  <button
                    key={s}
                    className="rounded-2xl font-black"
                    style={{
                      fontSize: 15,
                      background: 'var(--surface-chip)',
                      color: s > 0 ? '#ED742F' : 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      minHeight: 46,
                    }}
                    onClick={() => adjust(s)}>
                    {s > 0 ? `+${s}` : s}
                  </button>
                ))}
              </div>
            </div>
          ) : isLbWeightLayout ? (
            // lbs weight: 4 rows — row1: ±2.5/±5 (4-col), row2: ±10, row3: ±25, row4: ±45 (2-col each)
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-4 gap-2">
                {quickSteps.slice(0, 4).map(s => (
                  <button
                    key={s}
                    className="rounded-xl font-black"
                    style={{
                      fontSize: 13,
                      background: 'var(--surface-chip)',
                      color: s > 0 ? '#ED742F' : 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      minHeight: 42,
                    }}
                    onClick={() => adjust(s)}>
                    {s > 0 ? `+${s}` : s}
                  </button>
                ))}
              </div>
              {([quickSteps.slice(4, 6), quickSteps.slice(6, 8), quickSteps.slice(8, 10)] as number[][]).map((row, i) => (
                <div key={i} className="grid grid-cols-2 gap-3">
                  {row.map(s => (
                    <button
                      key={s}
                      className="rounded-2xl font-black"
                      style={{
                        fontSize: 15,
                        background: 'var(--surface-chip)',
                        color: s > 0 ? '#ED742F' : 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                        minHeight: 46,
                      }}
                      onClick={() => adjust(s)}>
                      {s > 0 ? `+${s}` : s}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            // Reps: single row
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${quickSteps.length}, 1fr)` }}>
              {quickSteps.map(s => (
                <button
                  key={s}
                  className="py-3 rounded-2xl font-black"
                  style={{
                    fontSize: 14,
                    background: 'var(--surface-chip)',
                    color: s > 0 ? '#ED742F' : 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                    minHeight: 44,
                  }}
                  onClick={() => adjust(s)}>
                  {s > 0 ? `+${s}` : s}
                </button>
              ))}
            </div>
          )}

        </div>

        {/* Footer — always visible, respects safe-area-inset-bottom */}
        <div
          className="px-6 pt-3 shrink-0"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}>
          <button
            className="w-full py-4 rounded-2xl text-base font-black text-white tracking-widest"
            style={{ background: '#ED742F', boxShadow: '0 4px 20px rgba(237, 116, 47,0.3)' }}
            onClick={() => { onConfirm(confirmValue); onClose() }}>
            SET
          </button>
        </div>

      </div>
    </div>
  )
}
