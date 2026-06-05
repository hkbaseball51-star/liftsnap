'use client'

import { useState, useEffect } from 'react'
export { DEMO_KEY, REPRA_DEMO_USER_ID } from '@/lib/demoConstants'
import { DEMO_KEY, REPRA_DEMO_USER_ID } from '@/lib/demoConstants'

export function useDemoMode() {
  const [demoUserId, setDemoUserIdState] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setDemoUserIdState(localStorage.getItem(DEMO_KEY))
    setMounted(true)
  }, [])

  const enableDemo = (id = REPRA_DEMO_USER_ID) => {
    localStorage.setItem(DEMO_KEY, id)
    setDemoUserIdState(id)
  }

  const disableDemo = () => {
    localStorage.removeItem(DEMO_KEY)
    setDemoUserIdState(null)
  }

  return {
    demoUserId: mounted ? demoUserId : null,
    isDemo: mounted && demoUserId !== null,
    enableDemo,
    disableDemo,
    mounted,
  }
}
