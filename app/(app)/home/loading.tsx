export default function HomeLoading() {
  return (
    <div className="min-h-screen pb-nav" style={{ background: '#050505' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-14 pb-2">
        <div className="h-4 w-20 rounded-full" style={{ background: '#1a1a1a' }} />
        <div className="h-3 w-16 rounded-full" style={{ background: '#151515' }} />
      </div>

      {/* Greeting */}
      <div className="px-4 pt-4 pb-6">
        <div className="h-3 w-24 rounded-full mb-3" style={{ background: '#151515' }} />
        <div className="h-8 w-48 rounded-lg mb-1" style={{ background: '#1a1a1a' }} />
        <div className="h-8 w-32 rounded-lg mb-3" style={{ background: '#1a1a1a' }} />
        <div className="h-4 w-28 rounded-full" style={{ background: '#141414' }} />
      </div>

      {/* Share CTA card */}
      <div className="px-4 mb-5">
        <div className="rounded-2xl h-24" style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.06)' }} />
      </div>

      {/* Calendar */}
      <div className="px-4 mb-5">
        <div className="rounded-2xl h-64" style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.06)' }} />
      </div>

      {/* Weekly Effort */}
      <div className="px-4 mb-4">
        <div className="h-3 w-28 rounded-full mb-3" style={{ background: '#141414' }} />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl h-20" style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.06)' }} />
          ))}
        </div>
      </div>

      {/* Strength Club */}
      <div className="px-4 mb-4">
        <div className="rounded-xl h-20" style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.06)' }} />
      </div>

      {/* Body Weight */}
      <div className="px-4 mb-4">
        <div className="rounded-xl h-16" style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.06)' }} />
      </div>
    </div>
  )
}
