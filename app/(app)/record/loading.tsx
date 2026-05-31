export default function RecordLoading() {
  return (
    <div className="min-h-screen" style={{ background: '#080808' }}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between px-4 pt-14 pb-2">
        <div className="h-4 w-24 rounded-full" style={{ background: '#222222' }} />
        <div className="h-4 w-16 rounded-full" style={{ background: '#222222' }} />
      </div>

      {/* Title skeleton */}
      <div className="px-4 pt-2 pb-4">
        <div className="h-7 w-48 rounded-full" style={{ background: '#222222' }} />
      </div>

      {/* Stats bar skeleton */}
      <div className="flex gap-4 px-4 pb-4">
        {[80, 60, 70].map((w, i) => (
          <div key={i} className="h-10 rounded-xl flex-1" style={{ background: '#222222' }} />
        ))}
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-16 h-16 rounded-full" style={{ background: '#222222' }} />
        <div className="h-4 w-40 rounded-full" style={{ background: '#222222' }} />
        <div className="h-3 w-28 rounded-full" style={{ background: '#222222' }} />
      </div>

      {/* Bottom button skeleton */}
      <div className="fixed bottom-0 left-0 right-0 p-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
        <div className="h-14 rounded-2xl w-full" style={{ background: '#222222' }} />
      </div>
    </div>
  )
}
