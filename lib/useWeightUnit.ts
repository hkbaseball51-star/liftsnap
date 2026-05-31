'use client'

import { useState, useEffect } from 'react'
import type { WeightUnit } from '@/lib/units'
import { saveWeightUnit, getUserWeightUnit } from '@/actions/settings'

const STORAGE_KEY = 'liftsnap_unit'

export function useWeightUnit() {
  const [unit, setUnitState] = useState<WeightUnit>('kg')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Use localStorage for instant initial render (avoids layout shift)
    const stored = localStorage.getItem(STORAGE_KEY) as WeightUnit | null
    if (stored === 'kg' || stored === 'lbs') {
      setUnitState(stored)
    }

    // Always sync from DB — restores correct unit after re-login
    // and handles cross-device / cross-user scenarios
    getUserWeightUnit()
      .then(u => {
        setUnitState(u)
        localStorage.setItem(STORAGE_KEY, u)
        setMounted(true)
      })
      .catch(() => setMounted(true))
  }, [])

  const setUnit = async (u: WeightUnit) => {
    setUnitState(u)
    localStorage.setItem(STORAGE_KEY, u)
    await saveWeightUnit(u).catch(() => {})
  }

  return { unit: mounted ? unit : 'kg' as WeightUnit, setUnit, mounted }
}
