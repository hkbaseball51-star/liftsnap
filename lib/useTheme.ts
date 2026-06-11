'use client'

import { useState, useLayoutEffect } from 'react'

export type Theme = 'dark' | 'light'
const STORAGE_KEY = 'repra_theme'

function resolveTheme(raw: string | null): Theme {
  return raw === 'light' ? 'light' : 'dark'
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark')

  // useLayoutEffect fires synchronously after DOM mutations and BEFORE the browser
  // paints — so reading data-theme (already set by the blocking inline script in
  // layout.tsx) here eliminates the dark→light flash entirely.
  useLayoutEffect(() => {
    const attr = document.documentElement.getAttribute('data-theme')
    const resolved = resolveTheme(attr)
    setThemeState(resolved)
    document.documentElement.style.colorScheme = resolved
  }, [])

  function setTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem(STORAGE_KEY, t)
    document.documentElement.setAttribute('data-theme', t)
    document.documentElement.style.colorScheme = t
  }

  return { theme, setTheme }
}
