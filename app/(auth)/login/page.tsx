'use client'

import { useState } from 'react'
import Link from 'next/link'
import { login } from '@/actions/auth'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await login(new FormData(e.currentTarget))
    if (result?.error) {
      setError('Incorrect email or password')
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black tracking-widest text-white">LIFTSNAP</h1>
        <p className="text-sm mt-2 font-bold" style={{ color: '#555' }}>Log your lifts. Share your story.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            PASSWORD
          </label>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
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
          style={{ background: loading ? '#333' : '#ff6b00' }}
        >
          {loading ? 'SIGNING IN...' : 'SIGN IN'}
        </button>
      </form>

      <p className="text-center text-sm mt-6 font-bold" style={{ color: '#555' }}>
        Don't have an account?{' '}
        <Link href="/signup" className="font-black" style={{ color: '#ff6b00' }}>
          Sign up
        </Link>
      </p>
    </div>
  )
}
