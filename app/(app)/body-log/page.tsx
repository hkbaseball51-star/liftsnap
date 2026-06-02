import { createClient } from '@/lib/supabase/server'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAllBodyLogEntries } from '@/actions/bodyLog'
import { resolveServerLocale, type Locale } from '@/lib/i18n'
import BodyLogHighlights from '@/components/body-log/BodyLogHighlights'
import FeatureTracker from '@/components/common/FeatureTracker'

export default async function BodyLogPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; photoId?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [cookieStore, headerStore, params] = await Promise.all([
    cookies(),
    headers(),
    searchParams,
  ])

  const [profileRes, entries] = await Promise.all([
    supabase.from('profiles').select('language').eq('id', user.id).single(),
    getAllBodyLogEntries(),
  ])

  const cookieLang = cookieStore.get('liftsnap_lang')?.value
  const locale: Locale = resolveServerLocale(
    cookieLang,
    (profileRes.data as { language: string | null } | null)?.language,
    headerStore.get('accept-language') ?? '',
  )

  // Generate signed URLs server-side (batch — one API call for all photos)
  const signedUrls: Record<string, string> = {}
  if (entries.length > 0) {
    const { data: batchData } = await supabase.storage
      .from('workout-photos')
      .createSignedUrls(entries.map(e => e.imagePath), 3600)
    if (batchData) {
      for (const item of batchData) {
        if (item.signedUrl && !item.error) {
          const entry = entries.find(e => e.imagePath === item.path)
          if (entry) signedUrls[entry.date] = item.signedUrl
        }
      }
    }
  }

  // Determine initial index
  let initialIndex = 0
  if (params.start) {
    const idx = entries.findIndex(e => e.date <= params.start!)
    if (idx !== -1) initialIndex = idx
  }

  return (
    <>
      <FeatureTracker feature="proof" />
      <BodyLogHighlights
        entries={entries}
        signedUrls={signedUrls}
        initialIndex={initialIndex}
        locale={locale}
        todayStr={new Date().toLocaleDateString('sv')}
      />
    </>
  )
}
