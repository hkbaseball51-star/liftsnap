'use client'

import { useState, useEffect } from 'react'
import { resolveLocale, type Locale, type LangPref } from '@/lib/i18n'
import { saveLanguage } from '@/actions/settings'

const STORAGE_KEY = 'liftsnap_lang'

export function useLocale() {
  const [langPref, setLangPrefState] = useState<LangPref>('auto')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as LangPref | null
    setLangPrefState(stored ?? 'auto')
    setMounted(true)
  }, [])

  const locale: Locale = mounted ? resolveLocale(langPref) : 'en'

  const setLangPref = async (pref: LangPref) => {
    setLangPrefState(pref)
    localStorage.setItem(STORAGE_KEY, pref)
    await saveLanguage(pref).catch(() => {})
  }

  return { locale, langPref, setLangPref, mounted }
}
