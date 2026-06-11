export default function ShareStatsLoading() {
  return (
    <div className="min-h-screen pb-nav" style={{ background: 'var(--app-bg)' }}>

      {/* Header */}
      <div className="px-4 pt-12 pb-6">
        <div className="h-5 w-5 rounded-full mb-6" style={{ background: 'var(--skeleton-bg)' }} />
        <div className="h-6 w-48 rounded-full mb-2" style={{ background: 'var(--skeleton-bg)' }} />
        <div className="h-4 w-56 rounded-full" style={{ background: 'var(--skeleton-bg)' }} />
      </div>

      {/* Metric cards */}
      <div className="px-4 flex flex-col gap-3 mb-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-2xl" style={{ background: 'var(--skeleton-card-bg)', border: '1px solid var(--skeleton-border)' }} />
        ))}
      </div>

    </div>
  )
}
