'use client'

import { useEffect } from 'react'

/**
 * Invisible client component that records a localStorage flag
 * when the user visits a page for the first time.
 * Home screen CTA reads these flags to decide which feature to introduce next.
 */
export default function FeatureTracker({ feature }: { feature: string }) {
  useEffect(() => {
    try { localStorage.setItem(`repra_seen_${feature}`, 'true') } catch {}
  }, [feature])
  return null
}
