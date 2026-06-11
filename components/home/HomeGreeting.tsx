'use client'

import { useEffect, useState } from 'react'

// ── Time period ───────────────────────────────────────────────────────────────

type Period = 'morning' | 'afternoon' | 'evening' | 'night'

function getTimePeriod(hour: number): Period {
  if (hour >= 5  && hour < 11) return 'morning'
  if (hour >= 11 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'                // 21:00–4:59
}

// ── Greeting candidates (small line) ─────────────────────────────────────────

const GREETINGS: Record<Period, string[]> = {
  morning:   ['GOOD MORNING', 'MORNING, ATHLETE', 'READY TO TRAIN?', 'NEW DAY. NEW REPS.'],
  afternoon: ['GOOD AFTERNOON', 'KEEP IT MOVING', 'STILL IN THE GAME', 'TIME TO LOG IT'],
  evening:   ['GOOD EVENING', 'EVENING GRIND', 'FINISH STRONG', 'ONE MORE SESSION?'],
  night:     ['GOOD NIGHT', 'NIGHT SESSION', 'LATE NIGHT GRIND', 'STILL AWAKE?', "DON'T SKIP THE LOG"],
}

// ── Headline candidates (big line) ────────────────────────────────────────────

const HEADLINES: Record<Period, string[]> = {
  morning:   [
    'Ready for today?',
    'New day. New proof.',
    "Let's start strong.",
    'What are we training today?',
    'Your future self is watching.',
  ],
  afternoon: [
    'Keep the momentum.',
    'Still time to train.',
    "Let's make it count.",
    'Every rep counts.',
    'Back to work.',
  ],
  evening:   [
    'Finish strong.',
    'One more session?',
    'End the day with proof.',
    'Time to prove it.',
    'Show up. Log it.',
  ],
  night:     [
    'Late session?',
    'Still grinding?',
    "Don't skip the log.",
    'Quiet work counts too.',
    'Small reps. Big proof.',
  ],
}

// ── Stable daily selection ────────────────────────────────────────────────────
// Uses a deterministic hash of the date — no localStorage, no flicker.
// Same date → same greeting. Day changes → new greeting.

function hashStr(s: string): number {
  let h = 0
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0
  return Math.abs(h)
}

function pickStable<T>(options: T[], seed: string): T {
  return options[hashStr(seed) % options.length]
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  displayName: string | null
}

export default function HomeGreeting({ displayName }: Props) {
  // Safe placeholder values prevent hydration mismatch.
  // The real, time-based content is set after mount.
  const [greeting, setGreeting] = useState<string>('REPRA')
  const [headline, setHeadline] = useState<string>('Welcome back.')

  useEffect(() => {
    const hour   = new Date().getHours()
    const period = getTimePeriod(hour)
    const key    = todayKey()

    setGreeting(pickStable(GREETINGS[period], `g-${key}`))
    setHeadline(pickStable(HEADLINES[period], `h-${key}`))
  }, [])

  return (
    <>
      {/* Small greeting — time-based, letter-spaced */}
      <p style={{
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.1em',
        color: 'var(--text-muted)',
        marginBottom: 8,
      }}>
        {greeting}
      </p>

      {/* Headline — full width, no flex split */}
      <p style={{
        fontSize: 30,
        fontWeight: 600,
        color: 'var(--text-primary)',
        letterSpacing: '-0.02em',
        lineHeight: 1.15,
      }}>
        {headline}
      </p>
      {displayName && (
        <p style={{
          fontSize: 30,
          fontWeight: 600,
          color: '#ED742F',
          letterSpacing: '-0.02em',
          lineHeight: 1.15,
        }}>
          {displayName}.
        </p>
      )}
    </>
  )
}
