export function getJstDateString(date = new Date()): string {
  return new Date(date.getTime() + 9 * 3600 * 1000).toISOString().split('T')[0]
}
