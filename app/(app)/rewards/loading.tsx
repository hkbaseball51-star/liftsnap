export default function RewardsLoading() {
  return (
    <div className="min-h-screen pb-nav" style={{ background: '#050505' }}>
      {/* Header */}
      <div className="px-4 pt-14 pb-4">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-4 h-4 rounded-sm" style={{ background: '#1e1e1e' }} />
          <div className="h-5 w-28 rounded-full" style={{ background: '#1a1a1a' }} />
        </div>
        <div className="h-3 w-36 rounded-full mt-1" style={{ background: '#151515' }} />
      </div>

      {/* Next Reward skeleton */}
      <div className="px-4 mb-4">
        <div className="rounded-3xl p-5" style={{ background: '#161616', border: '1px solid rgba(255,106,0,0.12)' }}>
          <div className="h-2 w-20 rounded-full mb-4" style={{ background: '#252525' }} />
          <div className="h-6 w-40 rounded-lg mb-3" style={{ background: '#1e1e1e' }} />
          <div className="h-3 w-24 rounded-full mb-2" style={{ background: '#1a1a1a' }} />
          <div className="h-3 w-52 rounded-full mb-5" style={{ background: '#191919' }} />
          <div className="h-1.5 rounded-full mb-5" style={{ background: '#1e1e1e' }} />
          <div className="h-9 w-28 rounded-full" style={{ background: '#1e1e1e' }} />
        </div>
      </div>

      {/* Summary row skeleton */}
      <div className="px-4 mb-6 grid grid-cols-3 gap-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl h-20" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)' }} />
        ))}
      </div>

      {/* Section skeleton */}
      <div className="px-4 mb-6">
        <div className="h-2.5 w-40 rounded-full mb-2" style={{ background: '#1a1a1a' }} />
        <div className="h-3 w-56 rounded-full mb-3" style={{ background: '#151515' }} />
        <div className="rounded-2xl overflow-hidden" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
          {[1, 2, 3].map((i, idx, arr) => (
            <div key={i} className="px-4 py-4" style={{ borderBottom: idx < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div className="h-3.5 w-28 rounded-full mb-2" style={{ background: '#1e1e1e' }} />
              <div className="h-2.5 w-40 rounded-full" style={{ background: '#191919' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
