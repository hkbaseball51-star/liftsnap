'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { t, type Locale } from '@/lib/i18n'
import { MUSCLE_COLORS } from './TrainingCalendar'
import { ChevronRight } from 'lucide-react'

type RecentPhoto = {
  date: string
  imagePath: string
  muscleGroup: string
}

type Props = {
  recentPhotos: RecentPhoto[]
  locale: Locale
}

function normalizeForDisplay(group: string): string {
  const g = group.toLowerCase().trim()
  if (g === 'chest' || g === 'chest & triceps') return 'chest'
  if (['back', 'back & biceps', 'lats', 'traps', 'rear delts'].includes(g)) return 'back'
  if (['legs', 'quads', 'hamstrings', 'glutes', 'calves', 'lower body'].includes(g)) return 'legs'
  if (['shoulders', 'delts'].includes(g)) return 'shoulders'
  if (['arms', 'biceps', 'triceps', 'forearms'].includes(g)) return 'arms'
  return 'full body'
}

export default function HomeBodyLogSection({ recentPhotos, locale }: Props) {
  const router = useRouter()
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    if (recentPhotos.length === 0) return
    let cancelled = false
    const supabase = createClient()
    Promise.allSettled(
      recentPhotos.map(({ date, imagePath }) =>
        supabase.storage
          .from('workout-photos')
          .createSignedUrl(imagePath, 3600)
          .then(({ data }) => ({ date, url: data?.signedUrl ?? null }))
      )
    ).then(results => {
      if (cancelled) return
      const urls: Record<string, string> = {}
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.url) urls[r.value.date] = r.value.url
      }
      setSignedUrls(urls)
    })
    return () => { cancelled = true }
  }, [recentPhotos])

  if (recentPhotos.length === 0) return null

  return (
    <div className="mb-5">
      {/* Section header */}
      <div className="flex items-center justify-between px-4 mb-2">
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.54)' }}>
          {t(locale, 'bodyLog.sectionTitle')}
        </p>
        <button
          className="flex items-center gap-0.5 active:opacity-70"
          style={{ color: 'rgba(255,255,255,0.54)', fontSize: 10, fontWeight: 600, letterSpacing: '0.04em' }}
          onClick={() => router.push('/body-log')}
        >
          {locale === 'ja' ? 'すべて見る' : 'See all'}
          <ChevronRight size={12} />
        </button>
      </div>

      {/* Horizontal scroll */}
      <div
        className="flex gap-2 overflow-x-auto"
        style={{
          paddingLeft: 16,
          paddingRight: 16,
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {recentPhotos.map((photo) => {
          const url = signedUrls[photo.date] ?? null
          const muscleKey = normalizeForDisplay(photo.muscleGroup)
          const color = MUSCLE_COLORS[muscleKey] ?? '#ec4899'
          const [, m, d] = photo.date.split('-').map(Number)

          return (
            <button
              key={photo.date}
              className="flex-shrink-0 active:opacity-80 transition-opacity"
              style={{
                width: 72, height: 96,
                borderRadius: 12,
                position: 'relative',
                overflow: 'hidden',
                background: url ? '#000' : `${color}22`,
                border: `1.5px solid ${color}55`,
                boxShadow: `0 2px 12px ${color}22`,
              }}
              onClick={() => router.push(`/body-log?start=${photo.date}`)}
            >
              {url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    objectFit: 'cover',
                    pointerEvents: 'none',
                  }}
                />
              )}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.65) 100%)',
                pointerEvents: 'none',
              }} />
              {/* Date label */}
              <div style={{ position: 'absolute', bottom: 5, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
                <p style={{ fontSize: 11, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{d}</p>
                <p style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.04em' }}>
                  {['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][m - 1]}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
