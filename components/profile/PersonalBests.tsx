'use client'

import { useLocale } from '@/lib/useLocale'
import { useWeightUnit } from '@/lib/useWeightUnit'
import { toDisplayWeight, weightUnitLabel } from '@/lib/units'
import type { PBEntry } from '@/actions/personalBests'

type Props = {
  bench:    PBEntry | null
  squat:    PBEntry | null
  deadlift: PBEntry | null
}

export default function PersonalBests({ bench, squat, deadlift }: Props) {
  const { locale } = useLocale()
  const { unit } = useWeightUnit()

  const noRecord = locale === 'ja' ? '未記録' : 'No record'

  const items: { label: string; entry: PBEntry | null }[] = [
    { label: 'Bench',    entry: bench    },
    { label: 'Squat',    entry: squat    },
    { label: 'Deadlift', entry: deadlift },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(({ label, entry }) => (
        <div
          key={label}
          className="rounded-2xl px-3 py-4 flex flex-col items-center"
          style={{ background: '#222222', border: '1px solid rgba(255,255,255,0.19)' }}
        >
          <p className="text-[10px] font-bold mb-2.5" style={{ color: 'rgba(255,255,255,0.68)' }}>
            {label}
          </p>

          {entry ? (
            <>
              <p
                className="font-black leading-none"
                style={{ fontSize: 26, color: '#fff', fontFamily: 'var(--font-mono)' }}
              >
                {toDisplayWeight(entry.est1rm, unit)}
              </p>
              <p className="text-[9px] font-bold mt-0.5" style={{ color: 'rgba(255,255,255,0.60)' }}>
                {weightUnitLabel(unit)}
              </p>
              <p className="text-[10px] mt-2 leading-none" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {toDisplayWeight(entry.weight, unit)} × {entry.reps}
              </p>
            </>
          ) : (
            <p className="text-[11px] font-bold mt-1 text-center leading-tight"
              style={{ color: 'rgba(255,255,255,0.52)' }}>
              {noRecord}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
