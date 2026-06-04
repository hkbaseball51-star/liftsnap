'use client'

import { useState, useEffect } from 'react'
import type { WeightUnit } from '@/lib/units'

const STORAGE_KEY = 'repra_weight_unit'

export function useWeightUnit() {
  const [unit, setUnitState] = useState<WeightUnit>('kg')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as WeightUnit | null
    if (stored === 'kg' || stored === 'lbs') {
      setUnitState(stored)
    }
    setMounted(true)
  }, [])

  const setUnit = (u: WeightUnit) => {
    setUnitState(u)
    localStorage.setItem(STORAGE_KEY, u)
  }

  return { unit: mounted ? unit : 'kg' as WeightUnit, setUnit, mounted }
}
