'use client'

import { useState, useEffect } from 'react'
import { resolveLocale, type Locale, type LangPref } from '@/lib/i18n'
import { saveLanguage, getUserLanguage } from '@/actions/settings'

const STORAGE_KEY = 'liftsnap_lang'

export function useLocale() {
  const [langPref, setLangPrefState] = useState<LangPref>('auto')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Use localStorage for instant initial render
    const stored = localStorage.getItem(STORAGE_KEY) as LangPref | null
    setLangPrefState(stored ?? 'auto')
    setMounted(true)

    // Always sync from DB — restores correct language after re-login
    // and handles cross-device / cross-user scenarios
    getUserLanguage()
      .then(lang => {
        if (lang) {
          const pref: LangPref =
            lang === 'en' || lang === 'ja' || lang === 'auto' ? lang : 'auto'
          setLangPrefState(pref)
          localStorage.setItem(STORAGE_KEY, pref)
        }
      })
      .catch(() => {})
  }, [])

  const locale: Locale = mounted ? resolveLocale(langPref) : 'en'

  const setLangPref = async (pref: LangPref) => {
    setLangPrefState(pref)
    localStorage.setItem(STORAGE_KEY, pref)
    await saveLanguage(pref, resolveLocale(pref)).catch(() => {})
  }

  return { locale, langPref, setLangPref, mounted }
}
