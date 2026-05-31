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

export async function resetPassword(email: string) {
  const supabase = await createClient()

  // Derive origin from request headers so this works in both dev and prod
  // without relying on NEXT_PUBLIC_SITE_URL being set.
  // Supabase Dashboard → Authentication → URL Configuration must allow:
  //   http://localhost:3000/**
  //   https://<your-vercel-domain>.vercel.app/**
  //   https://<custom-domain>/** (once a custom domain is added)
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'
  const origin = `${proto}://${host}`
  const redirectTo = `${origin}/login`

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

  if (error) {
    console.error('Password reset error:', {
      message: error.message,
      status:  (error as { status?: number }).status,
      name:    error.name,
      code:    (error as { code?: string }).code,
      redirectTo,
    })
    const devMessage = process.env.NODE_ENV !== 'production' ? error.message : undefined
    return { error: 'Could not send reset email. Please try again.', devMessage }
  }

  return { success: true }
}
