'use client'

import { useState } from 'react'
import { useLocale } from '@/lib/useLocale'
import { t } from '@/lib/i18n'

type Props = {
  benchPR:    number | null
  squatPR:    number | null
  deadliftPR: number | null
}

export default function PersonalBests({ benchPR, squatPR, deadliftPR }: Props) {
  const { locale } = useLocale()
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const items = [
    { label: 'Bench',    pr: benchPR    },
    { label: 'Squat',    pr: squatPR    },
    { label: 'Deadlift', pr: deadliftPR },
  ] as const

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {items.map(({ label, pr }) => (
          <button
            key={label}
            className="rounded-2xl p-4 flex flex-col items-center active:opacity-70 transition-opacity"
            style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)' }}
            onClick={() => showToast(t(locale, 'profile.personalBestAutoMessage'))}>
            <p className="text-[10px] font-bold mb-3" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {label}
            </p>
            {pr != null ? (
              <>
                <p className="text-xl font-black leading-none" style={{ color: '#ff6b00', fontFamily: 'var(--font-mono)' }}>
                  {pr}
                </p>
                <p className="text-[9px] font-bold mt-1" style={{ color: 'rgba(255,255,255,0.28)' }}>kg</p>
              </>
            ) : (
              <p className="text-[11px] font-bold leading-none mt-1" style={{ color: 'rgba(255,255,255,0.28)' }}>
                {t(locale, 'profile.personalBestAuto')}
              </p>
            )}
          </button>
        ))}
      </div>

      {toast && (
        <div
          className="fixed left-4 right-4 z-[80] px-4 py-3 rounded-2xl text-center"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 80px)', background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
          <p className="text-sm font-bold text-white">{toast}</p>
        </div>
      )}
    </>
  )
}
