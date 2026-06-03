'use client'

import { startTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AutoAuthClient() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        supabase.auth.signInAnonymously().then(() => {
          // startTransition keeps the UI interactive while the server re-renders
          // with the new anonymous session.  This only fires once for brand-new
          // users who have no session cookie yet.
          startTransition(() => { router.refresh() })
        })
      }
    })
  }, [router])

  return null
}
