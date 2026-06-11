export default function AnalyticsLoading() {
  return (
    <div className="min-h-screen pb-nav" style={{ background: 'var(--app-bg)' }}>
      {/* Header */}
      <div className="px-4 pt-14 pb-4">
        <div className="h-6 w-24 rounded-full" style={{ background: 'var(--skeleton-bg)' }} />
      </div>

      {/* Exercise selector skeleton */}
      <div className="px-4 mb-4">
        <div className="h-12 rounded-xl" style={{ background: 'var(--skeleton-card-bg)', border: '1px solid var(--skeleton-border)' }} />
      </div>

      {/* Chart area */}
      <div className="px-4 mb-4">
        <div className="rounded-2xl h-48" style={{ background: 'var(--skeleton-card-bg)', border: '1px solid var(--skeleton-border)' }} />
      </div>

      {/* Stats grid */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-2xl h-24" style={{ background: 'var(--skeleton-card-bg)', border: '1px solid var(--skeleton-border)' }} />
          ))}
        </div>
      </div>

      {/* Body weight chart */}
      <div className="px-4 mb-4">
        <div className="rounded-2xl h-40" style={{ background: 'var(--skeleton-card-bg)', border: '1px solid var(--skeleton-border)' }} />
      </div>
    </div>
  )
}
