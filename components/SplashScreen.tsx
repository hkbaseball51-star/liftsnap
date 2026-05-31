'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

const MIN_VISIBLE_MS = 1500
const FADE_OUT_MS    = 700
const STORAGE_KEY    = 'repra_splash_shown'

export default function SplashScreen({ ready = true }: { ready?: boolean }) {
  // true → SSR renders splash immediately, preventing any content flash on first load.
  // On within-session BottomNav navigation the layout never remounts, so this
  // component's state persists as false (post-fade) — no re-show ever occurs.
  const [visible,       setVisible]       = useState(true)
  const [fadingOut,     setFadingOut]     = useState(false)
  const [minTimePassed, setMinTimePassed] = useState(false)
  const hasStarted = useRef(false)

  // Effect 1: sessionStorage gate + min-visible timer
  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    const alreadyShown = sessionStorage.getItem(STORAGE_KEY) === 'true'

    if (alreadyShown) {
      // Same-session reload (hard refresh) — hide immediately, no animation
      setVisible(false)
      return
    }

    // First load of this tab/session — mark shown and start minimum-visible timer
    sessionStorage.setItem(STORAGE_KEY, 'true')
    const timer = setTimeout(() => setMinTimePassed(true), MIN_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [])

  // Effect 2: trigger fade once both conditions are met
  useEffect(() => {
    if (!visible || !minTimePassed || !ready) return

    setFadingOut(true)
    const timer = setTimeout(() => setVisible(false), FADE_OUT_MS)
    return () => clearTimeout(timer)
  }, [visible, minTimePassed, ready])

  if (!visible) return null

  return (
    <div
      style={{
        position:      'fixed',
        inset:          0,
        zIndex:         99999,
        background:    '#000',
        opacity:        fadingOut ? 0 : 1,
        transition:    `opacity ${FADE_OUT_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        pointerEvents:  fadingOut ? 'none' : 'auto',
      }}>
      <Image
        src="/brand/splash-screen.png"
        alt="REPRA"
        fill
        priority
        sizes="100vw"
        style={{
          objectFit:  'cover',
          transform:   fadingOut ? 'scale(1.015)' : 'scale(1)',
          transition: `transform ${FADE_OUT_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        }}
      />
    </div>
  )
}
