import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveServerLocale, type Locale } from '@/lib/i18n'
import { getBodyTimelinePhotos } from '@/actions/bodyTimeline'
import BodyTimeline from '@/components/body-timeline/BodyTimeline'

export default async function BodyTimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/home')

  const [cookieStore, headerStore, params, profileRes, photos] = await Promise.all([
    cookies(),
    headers(),
    searchParams,
    supabase.from('profiles').select('language').eq('id', user.id).single(),
    getBodyTimelinePhotos(),
  ])

  const cookieLang = cookieStore.get('liftsnap_lang')?.value
  const locale: Locale = resolveServerLocale(
    cookieLang,
    (profileRes.data as { language: string | null } | null)?.language,
    headerStore.get('accept-language') ?? '',
  )

  let initialIndex = 0
  if (params.date && photos.length > 0) {
    const idx = photos.findIndex(p => p.date === params.date)
    if (idx !== -1) initialIndex = idx
  }

  return <BodyTimeline photos={photos} initialIndex={initialIndex} locale={locale} />
}
