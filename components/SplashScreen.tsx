'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

const MIN_VISIBLE_MS = 1200
const FADE_OUT_MS    = 600
const STORAGE_KEY    = 'repra_splash_shown'

export default function SplashScreen({ ready = true }: { ready?: boolean }) {
  const [visible,       setVisible]       = useState(false)
  const [fadingOut,     setFadingOut]     = useState(false)
  const [minTimePassed, setMinTimePassed] = useState(false)
  const hasStarted = useRef(false)

  // Effect 1: sessionStorage gate + min-visible timer
  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    if (sessionStorage.getItem(STORAGE_KEY) === 'true') return

    sessionStorage.setItem(STORAGE_KEY, 'true')
    setVisible(true)

    const timer = setTimeout(() => setMinTimePassed(true), MIN_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [])

  // Effect 2: fade when both conditions met
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
