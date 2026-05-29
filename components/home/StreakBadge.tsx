'use client'

type Props = {
  streak: number
  thisWeekDone: boolean
}

export default function StreakBadge({ streak, thisWeekDone }: Props) {
  const label = streak === 0 ? 'START' : `${streak}W`

  const message =
    streak === 0
      ? 'Log one workout this week to start your streak.'
      : !thisWeekDone
      ? `Log this week to keep your ${streak}-week streak alive.`
      : `You have trained for ${streak} week${streak === 1 ? '' : 's'} in a row.`

  return (
    <button
      onClick={() => alert(message)}
      aria-label={message}
      className="flex items-center gap-1 active:opacity-60 transition-opacity flex-shrink-0 mt-1"
      style={{
        background: 'rgba(255,106,0,0.12)',
        border: '1px solid rgba(255,106,0,0.25)',
        borderRadius: 999,
        paddingInline: 10,
        paddingBlock: 5,
      }}>
      <span style={{ fontSize: 12, lineHeight: 1 }}>🔥</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#ff6b00', letterSpacing: '0.02em' }}>
        {label}
      </span>
    </button>
  )
}
