export default function ShareLoading() {
  return (
    <div className="min-h-screen pb-nav" style={{ background: '#080808' }}>

      {/* Header */}
      <div className="px-4 pt-12 pb-8">
        <div className="h-2.5 w-10 rounded-full mb-3" style={{ background: '#1a1a1a' }} />
        <div className="h-7 w-44 rounded-full mb-2" style={{ background: '#1a1a1a' }} />
        <div className="h-4 w-52 rounded-full" style={{ background: '#161616' }} />
      </div>

      {/* Entry cards */}
      <div className="px-4 flex flex-col gap-3">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="h-16 rounded-2xl"
            style={{ background: '#141414', border: '1px solid #1a1a1a' }}
          />
        ))}
      </div>

    </div>
  )
}
