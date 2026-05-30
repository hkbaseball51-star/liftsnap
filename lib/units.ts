export type WeightUnit = 'kg' | 'lbs'

export const KG_TO_LB = 2.20462

export function toDisplayWeight(kg: number, unit: WeightUnit): number {
  if (unit === 'lbs') return Math.round(kg * KG_TO_LB * 10) / 10
  return kg
}

export function fromDisplayWeight(display: number, unit: WeightUnit): number {
  if (unit === 'lbs') return Math.round(display / KG_TO_LB * 100) / 100
  return display
}

export function formatVolumeWithUnit(kg: number, unit: WeightUnit): string {
  if (unit === 'lbs') {
    const lbs = Math.round(kg * KG_TO_LB)
    if (lbs >= 10000) return `${(lbs / 1000).toFixed(1)}k lbs`
    return `${lbs.toLocaleString()} lbs`
  }
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`
  return `${kg.toLocaleString()}kg`
}

export function weightUnitLabel(unit: WeightUnit): string {
  return unit === 'lbs' ? 'lbs' : 'kg'
}
