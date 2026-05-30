'use client'

import Link from 'next/link'
import { ChevronLeft, Check } from 'lucide-react'
import { useLocale } from '@/lib/useLocale'
import { t, type LangPref } from '@/lib/i18n'

const OPTIONS: { value: LangPref; label: string; sub: string }[] = [
  { value: 'auto', label: 'Auto',     sub: 'Matches your device language' },
  { value: 'en',   label: 'English',  sub: 'English' },
  { value: 'ja',   label: '日本語',   sub: 'Japanese' },
]

export default function LanguagePage() {
  const { langPref, setLangPref, locale } = useLocale()

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-6">
        <Link href="/profile/settings" className="p-1 -ml-1 active:opacity-70">
          <ChevronLeft size={22} style={{ color: 'rgba(255,255,255,0.55)' }} />
        </Link>
        <h1 className="text-base font-black tracking-widest" style={{ color: '#f5f5f5' }}>
          {t(locale, 'settings.language').toUpperCase()}
        </h1>
      </div>

      <div className="mx-4">
        <div style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 20, overflow: 'hidden' }}>
          {OPTIONS.map((opt, i) => {
            const selected = langPref === opt.value
            const isLast = i === OPTIONS.length - 1
            return (
              <button
                key={opt.value}
                className="w-full flex items-center gap-3 px-4 py-4 text-left active:opacity-70 transition-opacity"
                style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.07)' }}
                onClick={() => setLangPref(opt.value)}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: selected ? '#fff' : 'rgba(255,255,255,0.65)' }}>
                    {opt.label}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                    {opt.value === 'auto' ? t(locale, 'settings.languageAutoSub') : opt.sub}
                  </p>
                </div>
                {selected && (
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: '#ff6b00',
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

        <p className="text-[10px] mt-3 px-1" style={{ color: 'rgba(255,255,255,0.32)', lineHeight: 1.5 }}>
          {locale === 'ja'
            ? '「自動」を選ぶと、デバイスの言語設定（日本語）に合わせて表示されます。'
            : 'Auto detects your device language and adjusts display accordingly.'}
        </p>
      </div>
    </div>
  )
}
