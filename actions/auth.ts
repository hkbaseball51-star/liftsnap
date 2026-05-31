'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  redirect('/home')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const displayName = formData.get('display_name') as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  })
  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  redirect('/onboarding')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// ── Password reset ───────────────────────────────────────────────────────────
//
// Required env var (set in Vercel project settings for production):
//   NEXT_PUBLIC_SITE_URL=https://liftsnap.vercel.app
//
// Supabase Dashboard → Authentication → URL Configuration:
//   Site URL:
//     https://liftsnap.vercel.app
//   Redirect URLs (add all that apply):
//     https://liftsnap.vercel.app/**
//     https://liftsnap.vercel.app/reset-password
//     http://localhost:3000/**
//     http://localhost:3000/reset-password
//
// SMTP: Supabase free-tier SMTP has low rate limits. Use Custom SMTP in production.
//   Recommended providers: Resend, SendGrid, Postmark
//   Dashboard → Project Settings → Authentication → SMTP Settings

export type ResetErrorCode = 'rate_limit' | 'redirect_error' | 'generic'

export async function resetPassword(email: string): Promise<
  | { success: true }
  | { errorCode: ResetErrorCode; devMessage?: string }
> {
  const supabase = await createClient()

  // NEXT_PUBLIC_SITE_URL takes priority (set this in Vercel for prod).
  // Falls back to request host so dev/preview envs work without extra config.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  let origin: string
  if (siteUrl) {
    origin = siteUrl.replace(/\/$/, '')
  } else {
    const headersList = await headers()
    const host = headersList.get('host') ?? 'localhost:3000'
    const proto = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'
    origin = `${proto}://${host}`
  }
  const redirectTo = `${origin}/reset-password`

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

  if (error) {
    console.error('Password reset error:', {
      message:    error.message,
      status:     (error as { status?: number }).status,
      name:       error.name,
      code:       (error as { code?: string }).code,
      redirectTo,
    })

    const msg        = error.message.toLowerCase()
    const devMessage = process.env.NODE_ENV !== 'production' ? error.message : undefined

    if (msg.includes('rate limit') || msg.includes('email rate') || msg.includes('too many')) {
      return { errorCode: 'rate_limit', devMessage }
    }
    if (msg.includes('redirect') || msg.includes('not allowed') || msg.includes('invalid url')) {
      return { errorCode: 'redirect_error', devMessage }
    }
    return { errorCode: 'generic', devMessage }
  }

  return { success: true }
}
