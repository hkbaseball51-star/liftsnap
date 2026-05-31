'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useLocale } from '@/lib/useLocale'
import { t } from '@/lib/i18n'

type Props = {
  defaultSeconds?: number
  onStart: (seconds: number) => void
  onClose: () => void
}

const PRESETS = [60, 90, 120, 180, 300]

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function RestTimerSheet({ defaultSeconds = 120, onStart, onClose }: Props) {
  const { locale } = useLocale()
  const [selected, setSelected] = useState(defaultSeconds)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}>
      <div
        className="w-full rounded-t-3xl p-6"
        style={{
          background: '#171717',
          border: '1px solid #1e1e1e',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
        }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <span className="text-[10px] font-black tracking-widest" style={{ color: '#555' }}>
            {t(locale, 'record.restTimer')}
          </span>
          <button onClick={onClose}><X size={20} style={{ color: '#555' }} /></button>
        </div>

        <div className="flex gap-2 mb-6">
          {PRESETS.map(s => (
            <button key={s}
              className="flex-1 py-3 rounded-xl text-xs font-black tracking-wider"
              style={{
                background: selected === s ? '#ED742F' : '#222222',
                color: selected === s ? '#fff' : '#555',
                border: selected === s ? 'none' : '1px solid #1e1e1e',
              }}
              onClick={() => setSelected(s)}>
              {fmt(s)}
            </button>
          ))}
        </div>

        <button
          className="w-full py-4 rounded-2xl text-sm font-black tracking-widest text-white"
          style={{ background: '#ED742F', boxShadow: '0 4px 20px rgba(237, 116, 47,0.3)' }}
          onClick={() => { onStart(selected); onClose() }}>
          {t(locale, 'record.restStart')}
        </button>
      </div>
    </div>
  )
}
