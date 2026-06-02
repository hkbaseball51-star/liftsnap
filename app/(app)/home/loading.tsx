export default function HomeLoading() {
  return (
    <div className="min-h-screen pb-nav" style={{ background: '#080808' }}>

      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-12 pb-2">
        <div className="h-5 w-20 rounded" style={{ background: '#1a1a1a' }} />
        <div className="flex flex-col items-end gap-2 pt-1">
          <div className="h-3 w-16 rounded-full" style={{ background: '#1a1a1a' }} />
          <div className="h-3 w-12 rounded-full" style={{ background: '#161616' }} />
        </div>
      </div>

      {/* Greeting */}
      <div className="px-4 pt-4 pb-6">
        <div className="h-6 w-36 rounded-full mb-3" style={{ background: '#1a1a1a' }} />
        <div className="h-4 w-52 rounded-full" style={{ background: '#161616' }} />
      </div>

      {/* CTA card */}
      <div className="px-4 mb-5">
        <div className="h-20 rounded-2xl" style={{ background: '#141414', border: '1px solid #1e1e1e' }} />
      </div>

      {/* Calendar */}
      <div className="px-4 mb-5">
        <div className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid #1a1a1a' }}>
          {/* Month nav row */}
          <div className="flex justify-between items-center mb-4">
            <div className="h-4 w-24 rounded-full" style={{ background: '#1e1e1e' }} />
            <div className="flex gap-3">
              <div className="h-5 w-5 rounded-full" style={{ background: '#1e1e1e' }} />
              <div className="h-5 w-5 rounded-full" style={{ background: '#1e1e1e' }} />
            </div>
          </div>
          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-3 rounded-full mx-auto w-4" style={{ background: '#1a1a1a' }} />
            ))}
          </div>
          {/* Calendar cells — 5 rows */}
          {[...Array(5)].map((_, row) => (
            <div key={row} className="grid grid-cols-7 gap-1 mb-1">
              {[...Array(7)].map((_, col) => (
                <div key={col} className="h-9 rounded-xl" style={{ background: '#1a1a1a' }} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Weekly effort */}
      <div className="px-4 mb-4">
        <div className="h-3 w-28 rounded-full mb-3" style={{ background: '#1a1a1a' }} />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-xl" style={{ background: '#141414', border: '1px solid #1a1a1a' }} />
          ))}
        </div>
      </div>

      {/* Strength club */}
      <div className="px-4 mb-4">
        <div className="h-20 rounded-xl" style={{ background: '#141414', border: '1px solid #1a1a1a' }} />
      </div>

    </div>
  )
}
