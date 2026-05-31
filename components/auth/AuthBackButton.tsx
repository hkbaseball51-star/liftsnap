'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

type Props = {
  fallback?: string
}

export default function AuthBackButton({ fallback = '/profile/settings' }: Props) {
  const router = useRouter()

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallback)
    }
  }

  return (
    <button
      onClick={handleBack}
      aria-label="Go back"
      className="active:opacity-50 transition-opacity"
      style={{
        position: 'fixed',
        top:      'calc(env(safe-area-inset-top, 0px) + 16px)',
        left:     20,
        zIndex:   10,
        padding:  8,
        lineHeight: 0,
      }}>
      <ChevronLeft size={24} style={{ color: 'rgba(255,255,255,0.65)' }} />
    </button>
  )
}
