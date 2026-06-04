'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, Mail } from 'lucide-react'
import { SUPPORT_EMAIL } from '@/constants/legal'

const MAILTO = `mailto:${SUPPORT_EMAIL}?subject=REPRA%20Support`

export default function ContactPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen pb-32" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-6">
        <button
          onClick={() => router.back()}
          aria-label="戻る"
          className="p-1 -ml-1 active:opacity-70">
          <ChevronLeft size={22} style={{ color: 'rgba(255,255,255,0.72)' }} />
        </button>
        <h1 className="text-base font-black tracking-widest" style={{ color: '#f5f5f5' }}>
          お問い合わせ
        </h1>
      </div>

      {/* Content */}
      <div className="px-5 max-w-lg mx-auto">

        {/* Body */}
        <p className="text-sm leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.58)' }}>
          ご不明点、不具合、アカウント削除、データ削除、プライバシーに関するお問い合わせは、以下のメールアドレスまでご連絡ください。
        </p>

        {/* Email card */}
        <div
          className="rounded-2xl p-5 mb-8"
          style={{
            background: '#1D1D1D',
            border: '1px solid rgba(255,255,255,0.12)',
          }}>
          <p className="text-[10px] font-black tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.42)' }}>
            メールアドレス
          </p>
          <a
            href={MAILTO}
            className="text-sm font-bold break-all"
            style={{ color: '#ED742F' }}>
            {SUPPORT_EMAIL}
          </a>
        </div>

        {/* Send button */}
        <a
          href={MAILTO}
          className="flex items-center justify-center gap-2 w-full h-12 rounded-xl font-black text-sm text-white tracking-widest active:opacity-80"
          style={{ background: '#ED742F' }}>
          <Mail size={15} />
          メールを送る
        </a>

      </div>
    </div>
  )
}
