export type RankName = 'ROOKIE' | 'GRINDER' | 'BEAST' | 'ELITE' | 'LEGEND'

export type Rank = {
  name: RankName
  emoji: string
  color: string
  threshold: number
  description: string
  unlockText: string
}

export type RankInfo = {
  current: Rank
  next: Rank | null
  progress: number   // 0–1
  remaining: number  // kg to next rank
}

export const RANKS: Rank[] = [
  { name: 'ROOKIE',  threshold: 0,           emoji: '🌱', color: '#7ED957', description: 'Just getting started',  unlockText: 'Basic profile badge'        },
  { name: 'GRINDER', threshold: 5_000,       emoji: '💪', color: '#F59E0B', description: 'Building consistency',  unlockText: 'Rank badge on share cards'  },
  { name: 'BEAST',   threshold: 50_000,      emoji: '🔥', color: '#FF6A00', description: 'Serious lifter',        unlockText: 'Beast share frame'          },
  { name: 'ELITE',   threshold: 250_000,     emoji: '⚡', color: '#A855F7', description: 'Advanced athlete',      unlockText: 'Elite profile accent'       },
  { name: 'LEGEND',  threshold: 1_000_000,   emoji: '👑', color: '#FACC15', description: 'Lifting legend',        unlockText: 'Legend share card style'    },
]

export function getRankInfo(vol: number): RankInfo {
  let i = 0
  for (let j = RANKS.length - 1; j >= 0; j--) {
    if (vol >= RANKS[j].threshold) { i = j; break }
  }
  const current = RANKS[i]
  const next = RANKS[i + 1] ?? null
  return {
    current,
    next,
    progress: next ? Math.min((vol - current.threshold) / (next.threshold - current.threshold), 1) : 1,
    remaining: next ? Math.max(next.threshold - vol, 0) : 0,
  }
}

export function fmtComma(kg: number): string {
  const n = Math.round(kg)
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  return n.toLocaleString('en-US')
}
