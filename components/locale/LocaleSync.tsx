'use client'

import { useEffect } from 'react'
import { resolveLocale, type LangPref } from '@/lib/i18n'
import { saveLanguage, getUserLanguage } from '@/actions/settings'

const STORAGE_KEY = 'liftsnap_lang'

export default function LocaleSync() {
  useEffect(() => {
    // Always sync from DB — restores the user's language preference after
    // re-login and handles cross-device / cross-user scenarios.
    getUserLanguage()
      .then(pref => {
        if (pref) {
          // DB has a value for this user — update localStorage + cookie
          const resolved = resolveLocale(pref as LangPref)
          localStorage.setItem(STORAGE_KEY, pref)
          saveLanguage(pref, resolved).catch(() => {})
        } else {
          // No signed-in user or no DB preference — sync existing
          // localStorage to cookie so server rendering stays consistent
          const stored = localStorage.getItem(STORAGE_KEY)
          if (stored) {
            const resolved = resolveLocale(stored as LangPref)
            saveLanguage(stored, resolved).catch(() => {})
          }
        }
      })
      .catch(() => {})
  }, [])

  return null
}
