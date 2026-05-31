'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function SplashScreen() {
  const [visible, setVisible] = useState(false)
  const [fading, setFading]   = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('repra_splash_seen')) return

    sessionStorage.setItem('repra_splash_seen', 'true')
    setVisible(true)

    // Show for 1.2 s, then fade out over 400 ms
    const fadeTimer = setTimeout(() => setFading(true), 1200)
    const hideTimer = setTimeout(() => setVisible(false), 1600)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#000',
        opacity: fading ? 0 : 1,
        transition: 'opacity 400ms ease',
        pointerEvents: fading ? 'none' : 'auto',
      }}>
      <Image
        src="/brand/splash-screen.png"
        alt="REPRA"
        fill
        priority
        style={{ objectFit: 'cover' }}
      />
    </div>
  )
}
