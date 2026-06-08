'use client'

import { useState } from 'react'

const STORAGE_KEY = 'repra_exercise_name_lang'
export type ExerciseNameLang = 'en' | 'ja'

export function useExerciseNameLang(defaultLocale: string): [ExerciseNameLang, (l: ExerciseNameLang) => void] {
  const [lang, setLangState] = useState<ExerciseNameLang>(() => {
    if (typeof window === 'undefined') return defaultLocale === 'ja' ? 'ja' : 'en'
    const stored = localStorage.getItem(STORAGE_KEY) as ExerciseNameLang | null
    return stored ?? (defaultLocale === 'ja' ? 'ja' : 'en')
  })

  const setLang = (l: ExerciseNameLang) => {
    setLangState(l)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, l)
  }

  return [lang, setLang]
}
