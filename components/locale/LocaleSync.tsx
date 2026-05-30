'use client'

import { useEffect } from 'react'
import { getUserLanguage } from '@/actions/settings'

const STORAGE_KEY = 'liftsnap_lang'

export default function LocaleSync() {
  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY)
    if (!cached) {
      getUserLanguage()
        .then(pref => { if (pref) localStorage.setItem(STORAGE_KEY, pref) })
        .catch(() => {})
    }
  }, [])
  return null
}
