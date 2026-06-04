import { createClient } from '@/lib/supabase/server'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAllBodyLogPhotos } from '@/actions/bodyLog'
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
  if (!user) redirect('/home')

  const [cookieStore, headerStore, params] = await Promise.all([
    cookies(),
    headers(),
    searchParams,
  ])

  const [profileRes, entries] = await Promise.all([
    supabase.from('profiles').select('language').eq('id', user.id).single(),
    getAllBodyLogPhotos(),  // photo metadata only — workout detail fetched lazily per entry
  ])

  const cookieLang = cookieStore.get('liftsnap_lang')?.value
  const locale: Locale = resolveServerLocale(
    cookieLang,
    (profileRes.data as { language: string | null } | null)?.language,
    headerStore.get('accept-language') ?? '',
  )

  // Display in ascending order (oldest → newest) for timeline/progress viewing
  const orderedEntries = [...entries].reverse()

  // Full-size signed URLs for all entries (used when showing current photo in Highlight viewer)
  const signedUrls: Record<string, string> = {}
  if (orderedEntries.length > 0) {
    const { data: fullBatch } = await supabase.storage
      .from('workout-photos')
      .createSignedUrls(orderedEntries.map(e => e.imagePath), 3600)
    if (fullBatch) {
      for (const item of fullBatch) {
        if (item.signedUrl && !item.error) {
          const entry = orderedEntries.find(e => e.imagePath === item.path)
          if (entry) signedUrls[entry.date] = item.signedUrl
        }
      }
    }
  }

  // Thumbnail signed URLs — only for entries that have a thumbnail_path
  // For entries without thumbnail, fall back to full URL (legacy photos)
  const thumbnailUrls: Record<string, string> = {}
  const thumbEntries = orderedEntries.filter(e => e.thumbnailPath)
  if (thumbEntries.length > 0) {
    const { data: thumbBatch } = await supabase.storage
      .from('workout-photos')
      .createSignedUrls(thumbEntries.map(e => e.thumbnailPath!), 3600)
    if (thumbBatch) {
      for (const item of thumbBatch) {
        if (item.signedUrl && !item.error) {
          const entry = thumbEntries.find(e => e.thumbnailPath === item.path)
          if (entry) thumbnailUrls[entry.date] = item.signedUrl
        }
      }
    }
  }
  // Fallback: use full URL for entries without thumbnail
  for (const e of orderedEntries) {
    if (!thumbnailUrls[e.date] && signedUrls[e.date]) {
      thumbnailUrls[e.date] = signedUrls[e.date]
    }
  }

  // Default: open at most recent photo (last in ascending array)
  let initialIndex = orderedEntries.length > 0 ? orderedEntries.length - 1 : 0
  if (params.start) {
    const exact = orderedEntries.findIndex(e => e.date === params.start)
    if (exact !== -1) {
      initialIndex = exact
    } else {
      // Nearest photo at or after the requested date
      const nearest = orderedEntries.findIndex(e => e.date >= params.start!)
      if (nearest !== -1) initialIndex = nearest
    }
  }

  return (
    <>
      <FeatureTracker feature="proof" />
      <BodyLogHighlights
        entries={orderedEntries}
        signedUrls={signedUrls}
        thumbnailUrls={thumbnailUrls}
        initialIndex={initialIndex}
        locale={locale}
        todayStr={new Date().toLocaleDateString('sv')}
      />
    </>
  )
}
