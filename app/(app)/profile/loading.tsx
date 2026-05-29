export default function ProfileLoading() {
  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-14 pb-4">
        <div className="h-6 w-20 rounded-full" style={{ background: '#1a1a1a' }} />
        <div className="w-9 h-9 rounded-xl" style={{ background: '#111' }} />
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center py-6 gap-3">
        <div className="w-20 h-20 rounded-full" style={{ background: '#1a1a1a' }} />
        <div className="h-5 w-28 rounded-full" style={{ background: '#1a1a1a' }} />
        <div className="h-3 w-36 rounded-full" style={{ background: '#141414' }} />
      </div>

      {/* Rank card */}
      <div className="mx-4 rounded-2xl h-28 mb-4" style={{ background: '#111', border: '1px solid #1e1e1e' }} />

      {/* Stats grid */}
      <div className="mx-4 grid grid-cols-3 gap-2 mb-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl h-20" style={{ background: '#111', border: '1px solid #1e1e1e' }} />
        ))}
      </div>

      {/* Menu */}
      <div className="mx-4 rounded-2xl h-56 mb-4" style={{ background: '#111', border: '1px solid #1e1e1e' }} />
    </div>
  )
}
