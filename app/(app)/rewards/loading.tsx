export default function RewardsLoading() {
  return (
    <div className="min-h-screen pb-nav" style={{ background: 'var(--app-bg)' }}>
      {/* Header */}
      <div className="px-4 pt-14 pb-4">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-4 h-4 rounded-sm" style={{ background: 'var(--skeleton-bg)' }} />
          <div className="h-5 w-28 rounded-full" style={{ background: 'var(--skeleton-bg)' }} />
        </div>
        <div className="h-3 w-36 rounded-full mt-1" style={{ background: 'var(--skeleton-bg)' }} />
      </div>

      {/* Next Reward skeleton */}
      <div className="px-4 mb-4">
        <div className="rounded-3xl p-5" style={{ background: 'var(--skeleton-card-bg)', border: '1px solid rgba(237,116,47,0.25)' }}>
          <div className="h-2 w-20 rounded-full mb-4" style={{ background: 'var(--skeleton-bg)' }} />
          <div className="h-6 w-40 rounded-lg mb-3" style={{ background: 'var(--skeleton-bg)' }} />
          <div className="h-3 w-24 rounded-full mb-2" style={{ background: 'var(--skeleton-bg)' }} />
          <div className="h-3 w-52 rounded-full mb-5" style={{ background: 'var(--skeleton-bg)' }} />
          <div className="h-1.5 rounded-full mb-5" style={{ background: 'var(--skeleton-border)' }} />
          <div className="h-9 w-28 rounded-full" style={{ background: 'var(--skeleton-bg)' }} />
        </div>
      </div>

      {/* Summary row skeleton */}
      <div className="px-4 mb-6 grid grid-cols-3 gap-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl h-20" style={{ background: 'var(--skeleton-card-bg)', border: '1px solid var(--skeleton-border)' }} />
        ))}
      </div>

      {/* Section skeleton */}
      <div className="px-4 mb-6">
        <div className="h-2.5 w-40 rounded-full mb-2" style={{ background: 'var(--skeleton-bg)' }} />
        <div className="h-3 w-56 rounded-full mb-3" style={{ background: 'var(--skeleton-bg)' }} />
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--skeleton-card-bg)', border: '1px solid var(--skeleton-border)' }}>
          {[1, 2, 3].map((i, idx, arr) => (
            <div key={i} className="px-4 py-4" style={{ borderBottom: idx < arr.length - 1 ? '1px solid var(--card-divider)' : 'none' }}>
              <div className="h-3.5 w-28 rounded-full mb-2" style={{ background: 'var(--skeleton-bg)' }} />
              <div className="h-2.5 w-40 rounded-full" style={{ background: 'var(--skeleton-bg)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
