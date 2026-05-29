'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  streak: number
  thisWeekDone: boolean
}

export default function StreakBadge({ streak, thisWeekDone }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)

  const label =
    streak === 0 ? 'START' : `${streak}W`

  const message =
    streak === 0
      ? 'Log one workout this week to start your streak.'
      : !thisWeekDone
      ? 'Log this week to keep your streak alive.'
      : streak === 1
      ? 'You logged a workout this week. Keep it going next week.'
      : `You've trained for ${streak} weeks in a row.`

  const toggle = () => setOpen(v => !v)

  /* close on outside tap / click */
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  /* close on Escape */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  /* auto-close after 3 s */
  useEffect(() => {
    if (!open) return
    timerRef.current = setTimeout(() => setOpen(false), 3000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [open])

  return (
    <div ref={containerRef} className="relative flex-shrink-0" style={{ marginTop: 4 }}>

      {/* Badge button */}
      <button
        onClick={toggle}
        aria-label={message}
        aria-expanded={open}
        className="flex items-center gap-1 active:opacity-60 transition-opacity"
        style={{
          background: open ? 'rgba(255,106,0,0.18)' : 'rgba(255,106,0,0.12)',
          border: `1px solid ${open ? 'rgba(255,106,0,0.40)' : 'rgba(255,106,0,0.25)'}`,
          borderRadius: 999,
          paddingInline: 10,
          paddingBlock: 5,
          transition: 'background 150ms, border-color 150ms',
        }}>
        <span style={{ fontSize: 12, lineHeight: 1 }}>🔥</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#ff6b00', letterSpacing: '0.02em' }}>
          {label}
        </span>
      </button>

      {/* Popover */}
      {open && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 'max-content',
            maxWidth: 260,
            background: '#1c1c1c',
            border: '1px solid rgba(255,255,255,0.12)',
            borderLeft: '2px solid rgba(255,107,0,0.55)',
            borderRadius: 14,
            padding: '10px 14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.40)',
            zIndex: 50,
            animation: 'streak-popover-in 180ms ease forwards',
          }}>
          <p style={{
            fontSize: 13,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.82)',
            lineHeight: 1.5,
            margin: 0,
            whiteSpace: 'normal',
          }}>
            {message}
          </p>
        </div>
      )}

    </div>
  )
}
