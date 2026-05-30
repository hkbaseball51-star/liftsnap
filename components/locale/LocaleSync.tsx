'use client'

import { useEffect } from 'react'
import { saveLanguage, getUserLanguage } from '@/actions/settings'

const STORAGE_KEY = 'liftsnap_lang'
const COOKIE_KEY  = 'liftsnap_lang'

export default function LocaleSync() {
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)

    if (stored) {
      // Ensure the server-side cookie matches localStorage.
      // Only call saveLanguage if the cookie isn't already set to avoid unnecessary writes.
      const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${COOKIE_KEY}=`))
        ?.split('=')[1]

      if (cookieValue !== stored) {
        saveLanguage(stored).catch(() => {})
      }
    } else {
      // No localStorage value — pull from DB and hydrate both localStorage and cookie
      getUserLanguage()
        .then(pref => {
          if (pref) {
            localStorage.setItem(STORAGE_KEY, pref)
            saveLanguage(pref).catch(() => {})
          }
        })
        .catch(() => {})
    }
  }, [])

  return null
}
