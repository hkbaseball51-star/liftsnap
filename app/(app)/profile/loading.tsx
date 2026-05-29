export default function ProfileLoading() {
  const card = { background: '#151515', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20 }
  const shimmer = { background: '#1a1a1a' }
  const shimmerDim = { background: '#141414' }

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-14 pb-4">
        <div className="h-6 w-20 rounded-full" style={shimmer} />
        <div className="w-9 h-9 rounded-xl" style={{ background: '#111' }} />
      </div>

      {/* Profile Hero */}
      <div className="flex flex-col items-center px-4 pt-2 pb-6 gap-2">
        <div className="w-20 h-20 rounded-full mb-1" style={shimmer} />
        <div className="h-5 w-32 rounded-full" style={shimmer} />
        <div className="h-3 w-20 rounded-full" style={shimmerDim} />
        <div className="h-3 w-44 rounded-full mt-1" style={shimmerDim} />
        <div className="h-6 w-28 rounded-full mt-2" style={{ background: '#111' }} />
      </div>

      {/* Quick Stats */}
      <div className="mx-4 grid grid-cols-3 gap-2 mb-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl p-3.5 flex flex-col items-center gap-1.5" style={card}>
            <div className="h-6 w-10 rounded-full" style={shimmer} />
            <div className="h-2 w-12 rounded-full" style={shimmerDim} />
          </div>
        ))}
      </div>

      {/* Personal Bests */}
      <div className="mx-4 mb-4">
        <div className="h-3 w-24 rounded-full mb-2 ml-1" style={shimmerDim} />
        <div className="rounded-2xl overflow-hidden" style={card}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3.5"
              style={{ borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div className="h-3.5 w-24 rounded-full" style={shimmer} />
              <div className="h-3.5 w-10 rounded-full" style={shimmerDim} />
            </div>
          ))}
        </div>
      </div>

      {/* Current Rank */}
      <div className="mx-4 mb-4">
        <div className="h-3 w-24 rounded-full mb-2 ml-1" style={shimmerDim} />
        <div className="rounded-2xl p-4" style={card}>
          <div className="flex justify-between mb-3">
            <div className="h-7 w-28 rounded-full" style={shimmer} />
            <div className="h-5 w-16 rounded-full" style={shimmerDim} />
          </div>
          <div className="h-1.5 rounded-full mb-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full w-3/5 rounded-full" style={{ background: '#2a2a2a' }} />
          </div>
          <div className="h-2.5 w-32 rounded-full" style={shimmerDim} />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mx-4 mb-4">
        <div className="h-3 w-28 rounded-full mb-2 ml-1" style={shimmerDim} />
        <div className="rounded-2xl overflow-hidden" style={card}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3.5"
              style={{ borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div className="space-y-1.5">
                <div className="h-3.5 w-36 rounded-full" style={shimmer} />
                <div className="h-2.5 w-24 rounded-full" style={shimmerDim} />
              </div>
              <div className="h-3 w-3 rounded-full" style={shimmerDim} />
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="mx-4 mb-4">
        <div className="h-3 w-28 rounded-full mb-2 ml-1" style={shimmerDim} />
        <div className="rounded-2xl overflow-hidden" style={card}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-4"
              style={{ borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div className="w-4 h-4 rounded-full" style={shimmerDim} />
              <div className="h-3.5 w-28 rounded-full" style={shimmer} />
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
