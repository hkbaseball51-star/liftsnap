'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Mail } from 'lucide-react'
import { FAQ_CATEGORIES } from '@/data/faq'
import FaqAccordion from '@/components/support/FaqAccordion'
import { SUPPORT_EMAIL } from '@/constants/legal'

export default function FaqPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen pb-16" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-6">
        <button
          onClick={() => {
            if (typeof window !== 'undefined' && window.history.length > 1) router.back()
            else router.push('/profile/support')
          }}
          aria-label="戻る"
          className="p-1 -ml-1 active:opacity-70"
        >
          <ChevronLeft size={22} style={{ color: 'rgba(255,255,255,0.72)' }} />
        </button>
        <h1 className="text-base font-black tracking-widest" style={{ color: '#f5f5f5' }}>
          よくある質問
        </h1>
      </div>

      {/* Body */}
      <div className="px-4 max-w-lg mx-auto">

        <p className="text-sm leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.52)' }}>
          ご不明な点は以下からご確認ください。解決しない場合はサポートへお問い合わせください。
        </p>

        <FaqAccordion categories={FAQ_CATEGORIES} />

        {/* Contact link */}
        <div className="mt-10 mb-4 flex flex-col items-center gap-3">
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.38)' }}>
            問題が解決しない場合はこちら
          </p>
          <Link
            href="/profile/support/contact"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold active:opacity-70 transition-opacity"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.72)',
            }}
          >
            <Mail size={13} />
            サポートに連絡する
          </Link>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
            {SUPPORT_EMAIL}
          </p>
        </div>

      </div>
    </div>
  )
}
