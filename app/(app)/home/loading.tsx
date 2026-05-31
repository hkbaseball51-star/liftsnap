// Suspense fallback while the Home server component fetches data.
// SplashScreen in (app)/layout.tsx already covers everything with z-99999,
// so this just needs to hold the page black until hydration completes.
export default function HomeLoading() {
  return <div className="fixed inset-0 bg-black" />
}
