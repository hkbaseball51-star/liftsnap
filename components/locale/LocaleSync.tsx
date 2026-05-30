'use client'

import { useEffect } from 'react'
import { resolveLocale, type LangPref } from '@/lib/i18n'
import { saveLanguage, getUserLanguage } from '@/actions/settings'

const STORAGE_KEY = 'liftsnap_lang'
const COOKIE_KEY  = 'liftsnap_lang'

export default function LocaleSync() {
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)

    if (stored) {
      const resolved = resolveLocale(stored as LangPref)
      const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${COOKIE_KEY}=`))
        ?.split('=')[1]

      // Cookie should hold the resolved locale, not raw pref
      if (cookieValue !== resolved) {
        saveLanguage(stored, resolved).catch(() => {})
      }
    } else {
      getUserLanguage()
        .then(pref => {
          if (pref) {
            localStorage.setItem(STORAGE_KEY, pref)
            saveLanguage(pref, resolveLocale(pref as LangPref)).catch(() => {})
          }
        })
        .catch(() => {})
    }
  }, [])

  return null
}
