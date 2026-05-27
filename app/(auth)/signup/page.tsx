'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signup } from '@/actions/auth'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await signup(new FormData(e.currentTarget))
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black tracking-widest text-white">LIFTSNAP</h1>
        <p className="text-sm mt-2" style={{ color: '#888' }}>アカウントを作成する</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs mb-1.5 block" style={{ color: '#888' }}>表示名</label>
          <input
            name="display_name"
            type="text"
            required
            placeholder="例）Kenichi"
            className="w-full h-12 rounded-xl px-4 text-white text-sm outline-none"
            style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
          />
        </div>
        <div>
          <label className="text-xs mb-1.5 block" style={{ color: '#888' }}>メールアドレス</label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full h-12 rounded-xl px-4 text-white text-sm outline-none"
            style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
          />
        </div>
        <div>
          <label className="text-xs mb-1.5 block" style={{ color: '#888' }}>パスワード（8文字以上）</label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full h-12 rounded-xl px-4 text-white text-sm outline-none"
            style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
          />
        </div>

        {error && (
          <p className="text-sm text-center" style={{ color: '#ef4444' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="h-12 rounded-xl font-bold text-sm mt-2 text-white"
          style={{ background: loading ? '#555' : '#ff6b00' }}
        >
          {loading ? '登録中...' : 'アカウントを作成'}
        </button>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: '#888' }}>
        すでにアカウントをお持ちの方は{' '}
        <Link href="/login" className="font-bold" style={{ color: '#ff6b00' }}>
          ログイン
        </Link>
      </p>
    </div>
  )
}
