export default function ShareStatsLoading() {
  return (
    <div className="min-h-screen pb-nav" style={{ background: '#080808' }}>

      {/* Header */}
      <div className="px-4 pt-12 pb-6">
        <div className="h-5 w-5 rounded-full mb-6" style={{ background: '#1a1a1a' }} />
        <div className="h-6 w-48 rounded-full mb-2" style={{ background: '#1a1a1a' }} />
        <div className="h-4 w-56 rounded-full" style={{ background: '#161616' }} />
      </div>

      {/* Metric cards */}
      <div className="px-4 flex flex-col gap-3 mb-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-2xl" style={{ background: '#141414', border: '1px solid #1a1a1a' }} />
        ))}
      </div>

    </div>
  )
}
