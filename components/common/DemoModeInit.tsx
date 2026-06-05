'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { DEMO_KEY, REPRA_DEMO_USER_ID } from '@/lib/useDemoMode'

export default function DemoModeInit() {
  const params = useSearchParams()

  useEffect(() => {
    const demoUserId = params.get('demoUserId')
    if (demoUserId === REPRA_DEMO_USER_ID) {
      localStorage.setItem(DEMO_KEY, demoUserId)
    }
  }, [params])

  return null
}
