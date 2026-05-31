export default function AnalyticsLoading() {
  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div className="px-4 pt-14 pb-4">
        <div className="h-6 w-24 rounded-full" style={{ background: '#222222' }} />
      </div>

      {/* Exercise selector skeleton */}
      <div className="px-4 mb-4">
        <div className="h-12 rounded-xl" style={{ background: '#171717', border: '1px solid #1e1e1e' }} />
      </div>

      {/* Chart area */}
      <div className="px-4 mb-4">
        <div className="rounded-2xl h-48" style={{ background: '#171717', border: '1px solid #1e1e1e' }} />
      </div>

      {/* Stats grid */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-2xl h-24" style={{ background: '#171717', border: '1px solid #1e1e1e' }} />
          ))}
        </div>
      </div>

      {/* Body weight chart */}
      <div className="px-4 mb-4">
        <div className="rounded-2xl h-40" style={{ background: '#171717', border: '1px solid #1e1e1e' }} />
      </div>
    </div>
  )
}
