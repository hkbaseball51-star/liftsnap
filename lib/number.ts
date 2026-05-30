export function normalizeNumericInput(input: string): string {
  return input
    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[．｡]/g, '.')
    .replace(/[－―]/g, '-')
    .replace(/[，,]/g, '')
    .replace(/\s/g, '')
    .replace(/[ｋkKＫ][ｇgGＧ]/gi, '')
    .replace(/[^\d.\-]/g, '')
    .replace(/^(-?)(\d*\.?\d*).*$/, '$1$2') // keep only first decimal
}

export function parseFlexibleNumber(input: string): number | null {
  const normalized = normalizeNumericInput(input)
  if (!normalized) return null
  const n = parseFloat(normalized)
  return isFinite(n) ? n : null
}
