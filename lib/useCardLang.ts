'use client'

import { useState } from 'react'

const STORAGE_KEY = 'repra_card_lang'
export type CardLang = 'en' | 'ja'

export function useCardLang(defaultLocale: string): [CardLang, (l: CardLang) => void] {
  const [lang, setLangState] = useState<CardLang>(() => {
    if (typeof window === 'undefined') return defaultLocale === 'ja' ? 'ja' : 'en'
    const stored = localStorage.getItem(STORAGE_KEY) as CardLang | null
    return stored ?? (defaultLocale === 'ja' ? 'ja' : 'en')
  })

  const setLang = (l: CardLang) => {
    setLangState(l)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, l)
  }

  return [lang, setLang]
}
