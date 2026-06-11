'use client'

import { useState, useEffect } from 'react'

export type Theme = 'dark' | 'light'
const STORAGE_KEY = 'repra_theme'

function resolveTheme(raw: string | null): Theme {
  return raw === 'light' ? 'light' : 'dark'
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    const resolved = resolveTheme(saved)
    setThemeState(resolved)
    document.documentElement.setAttribute('data-theme', resolved)
  }, [])

  function setTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem(STORAGE_KEY, t)
    document.documentElement.setAttribute('data-theme', t)
  }

  return { theme, setTheme }
}
