/**
 * ensureProfile — always reads from Supabase, never localStorage.
 *
 * If a profile row does not yet exist for the given user (e.g. the user was
 * created via the Supabase dashboard or a seed script that bypassed the DB
 * trigger), this function creates a minimal profile and returns it.
 *
 * Usage (server components / server actions):
 *   const profile = await ensureProfile(supabase, user)
 */

import type { User } from '@supabase/supabase-js'

export type ProfileData = {
  id: string
  display_name: string | null
  username: string | null
  avatar_url: string | null
  weight_unit: 'kg' | 'lbs' | null
  language: 'auto' | 'en' | 'ja' | null
  plan: 'free' | 'pro' | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function ensureProfile(supabase: any, user: User): Promise<ProfileData | null> {
  // Fetch existing profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, display_name, username, avatar_url, weight_unit, language, plan')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('[profile] failed to fetch profile', error)
    return null
  }

  if (profile) return profile as ProfileData

  // Profile missing — auto-create from auth metadata
  console.warn('[profile] profile missing for user', user.id, '— creating fallback')

  const emailPrefix = user.email?.split('@')[0] ?? null
  const displayName =
    (user.user_metadata?.display_name as string | undefined)?.trim() ||
    emailPrefix ||
    null
  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ?? null

  const { data: created, error: createErr } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      display_name: displayName,
      avatar_url: avatarUrl,
    })
    .select('id, display_name, username, avatar_url, weight_unit, language, plan')
    .single()

  if (createErr) {
    console.error('[profile] failed to create profile', createErr)
    return null
  }

  return created as ProfileData
}

/**
 * Resolve the best display name for a user, in priority order:
 * 1. profiles.display_name
 * 2. auth.user_metadata.display_name
 * 3. email prefix (text before @)
 * 4. 'User'
 */
export function resolveDisplayName(
  profile: ProfileData | null,
  user: User
): string {
  const candidates = [
    profile?.display_name?.trim(),
    (user.user_metadata?.display_name as string | undefined)?.trim(),
    user.email?.split('@')[0],
  ]
  return candidates.find(Boolean) || 'User'
}
