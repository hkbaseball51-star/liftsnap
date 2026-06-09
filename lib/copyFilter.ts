// Shared filter logic for the "copy previous workout by type" feature.
// Used in both localDB (client) and demo server actions.

export type CopyFilterType =
  | 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'abs'
  | 'push' | 'pull' | 'all'

export function matchesCopyFilter(muscleGroup: string, filterType: CopyFilterType): boolean {
  if (filterType === 'all') return true
  const mg = (muscleGroup ?? '').toLowerCase()
  switch (filterType) {
    case 'chest':
      return mg.includes('chest') || mg.includes('胸')
    case 'back':
      return mg.includes('back') || mg.includes('背中') || mg.includes('lat') || mg.includes('trap') || mg.includes('rhomboid')
    case 'legs':
      return mg.includes('leg') || mg.includes('脚') || mg.includes('足') || mg.includes('glute') || mg.includes('hamstring') || mg.includes('quad') || mg.includes('calf') || mg.includes('calve')
    case 'shoulders':
      return mg.includes('shoulder') || mg.includes('delt') || mg.includes('肩')
    case 'arms':
      return mg.includes('arm') || mg.includes('bicep') || mg.includes('tricep') || mg.includes('forearm') || mg.includes('腕') || mg.includes('二頭') || mg.includes('三頭')
    case 'abs':
      return mg.includes('abs') || mg.includes('core') || mg.includes('abdominal') || mg.includes('腹筋')
    case 'push':
      return mg.includes('chest') || mg.includes('shoulder') || mg.includes('delt') || mg.includes('tricep') || mg.includes('胸') || mg.includes('肩') || mg.includes('三頭')
    case 'pull':
      return mg.includes('back') || mg.includes('bicep') || mg.includes('lat') || mg.includes('trap') || mg.includes('背中') || mg.includes('二頭')
  }
}
