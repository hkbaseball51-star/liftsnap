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
      {/* Logo */}
      <div className="mb-3 flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/repra-wordmark-header.png"
          alt="REPRA"
          style={{ height: 40, width: 'auto', display: 'block', objectFit: 'contain' }}
        />
        <p style={{ fontSize: 12, fontWeight: 500, color: '#B8B8B8', marginTop: 10, letterSpacing: '0.02em' }}>
          Every rep becomes proof.
        </p>
      </div>
      <p className="text-center text-sm mb-6 font-bold" style={{ color: '#555', marginTop: 20 }}>Create your account</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-[10px] font-black tracking-widest mb-2 block" style={{ color: '#555' }}>
            DISPLAY NAME
          </label>
          <input
            name="display_name"
            type="text"
            required
            placeholder="e.g. Kenichi"
            className="w-full h-12 rounded-xl px-4 text-white text-sm outline-none placeholder:text-[#333]"
            style={{ background: '#111', border: '1px solid #1e1e1e' }}
          />
        </div>
        <div>
          <label className="text-[10px] font-black tracking-widest mb-2 block" style={{ color: '#555' }}>
            EMAIL
          </label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full h-12 rounded-xl px-4 text-white text-sm outline-none"
            style={{ background: '#111', border: '1px solid #1e1e1e' }}
          />
        </div>
        <div>
          <label className="text-[10px] font-black tracking-widest mb-2 block" style={{ color: '#555' }}>
            PASSWORD <span style={{ color: '#333' }}>(8+ characters)</span>
          </label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full h-12 rounded-xl px-4 text-white text-sm outline-none"
            style={{ background: '#111', border: '1px solid #1e1e1e' }}
          />
        </div>

        {error && (
          <p className="text-sm text-center font-bold" style={{ color: '#ef4444' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="h-12 rounded-xl font-black text-sm mt-2 text-white tracking-widest"
          style={{ background: loading ? '#333' : '#BF5C24' }}
        >
          {loading ? 'CREATING...' : 'CREATE ACCOUNT'}
        </button>
      </form>

      <p className="text-center text-sm mt-6 font-bold" style={{ color: '#555' }}>
        Already have an account?{' '}
        <Link href="/login" className="font-black" style={{ color: '#BF5C24' }}>
          Sign in
        </Link>
      </p>
    </div>
  )
}
