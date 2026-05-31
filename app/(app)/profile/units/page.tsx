'use client'

import Link from 'next/link'
import { ChevronLeft, Check } from 'lucide-react'
import { useLocale } from '@/lib/useLocale'
import { useWeightUnit } from '@/lib/useWeightUnit'
import { t } from '@/lib/i18n'
import type { WeightUnit } from '@/lib/units'

const OPTIONS: { value: WeightUnit; labelKey: string; subKey: string }[] = [
  { value: 'kg',  labelKey: 'settings.kilograms', subKey: 'settings.kilogramsSub' },
  { value: 'lbs', labelKey: 'settings.pounds',    subKey: 'settings.poundsSub'    },
]

export default function UnitsPage() {
  const { locale } = useLocale()
  const { unit, setUnit } = useWeightUnit()

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-6">
        <Link href="/profile/settings" className="p-1 -ml-1 active:opacity-70">
          <ChevronLeft size={22} style={{ color: 'rgba(255,255,255,0.72)' }} />
        </Link>
        <h1 className="text-base font-black tracking-widest" style={{ color: '#f5f5f5' }}>
          {t(locale, 'settings.units').toUpperCase()}
        </h1>
      </div>

      <div className="mx-4">
        <div style={{ background: '#1D1D1D', border: '1px solid rgba(255,255,255,0.17)', borderRadius: 20, overflow: 'hidden' }}>
          {OPTIONS.map((opt, i) => {
            const selected = unit === opt.value
            const isLast = i === OPTIONS.length - 1
            return (
              <button
                key={opt.value}
                className="w-full flex items-center gap-3 px-4 py-4 text-left active:opacity-70 transition-opacity"
                style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.07)' }}
                onClick={() => setUnit(opt.value)}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: selected ? '#fff' : 'rgba(255,255,255,0.65)' }}>
                    {t(locale, opt.labelKey)}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.58)' }}>
                    {t(locale, opt.subKey)}
                  </p>
                </div>
                {selected && (
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: '#ED742F',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Check size={13} color="#fff" strokeWidth={3} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
