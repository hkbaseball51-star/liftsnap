'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useLocale } from '@/lib/useLocale'
import { t } from '@/lib/i18n'

const MAX_NOTE = 500

type Props = {
  value: string
  onSave: (note: string) => void
  onClose: () => void
}

export default function NoteInputSheet({ value, onSave, onClose }: Props) {
  const { locale } = useLocale()
  const [text, setText] = useState(value)
  const tooLong = text.length > MAX_NOTE

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}>
      <div
        className="w-full rounded-t-3xl flex flex-col"
        style={{
          background: '#171717',
          border: '1px solid #1e1e1e',
          maxHeight: 'calc(100dvh - 4rem)',
        }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <span className="text-sm font-black text-white tracking-widest">
            {t(locale, 'record.note').toUpperCase()}
          </span>
          <button onClick={onClose}><X size={20} style={{ color: '#555' }} /></button>
        </div>

        {/* Textarea */}
        <div className="flex-1 overflow-y-auto px-5 pb-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={t(locale, 'record.notePlaceholder')}
            autoFocus
            className="w-full bg-transparent outline-none resize-none"
            style={{
              minHeight: 120,
              fontSize: 14,
              lineHeight: 1.65,
              color: '#fff',
              caretColor: '#ED742F',
            }}
          />
          <div className="flex justify-end mt-1">
            <span style={{ fontSize: 11, color: tooLong ? '#ef4444' : '#444' }}>
              {text.length}/{MAX_NOTE}
            </span>
          </div>
          {tooLong && (
            <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>
              {t(locale, 'record.noteTooLong')}
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 pt-3 shrink-0"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}>
          <div className="flex gap-3">
            <button
              className="flex-1 py-3.5 rounded-2xl text-sm font-black"
              style={{ background: '#222222', color: '#666', border: '1px solid #222' }}
              onClick={onClose}>
              {t(locale, 'record.noteCancel')}
            </button>
            <button
              className="flex-1 py-3.5 rounded-2xl text-sm font-black text-white"
              style={{
                background: tooLong ? '#333' : '#ED742F',
                boxShadow: tooLong ? 'none' : '0 4px 20px rgba(237, 116, 47,0.3)',
              }}
              disabled={tooLong}
              onClick={() => { onSave(text.trim()); onClose() }}>
              {t(locale, 'record.saveNote')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
