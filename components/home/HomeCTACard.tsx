'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Camera, Share2, TrendingUp, Maximize2,
  Dumbbell, CalendarDays,
} from 'lucide-react'
import type { Locale } from '@/lib/i18n'

/* ── Types ──────────────────────────────────────────────────────── */

type CTAIcon = 'plus' | 'camera' | 'share' | 'trending' | 'maximize'
             | 'dumbbell' | 'calendar'

/**
 * orange-solid : strongest orange (P1 record — solid icon bg)
 * orange-muted : action-orange but softer (P2 photo, P3 story, P6 legs)
 * white        : feature-discovery / neutral (P4-P5, P7, fallback)
 */
type Accent = 'orange-solid' | 'orange-muted' | 'white'

type CTAItem = {
  sub:    string
  title:  string
  desc:   string
  href:   string
  icon:   CTAIcon
  accent: Accent
}

export type HomeCTACardProps = {
  todayStr:            string
  hasTodayWorkout:     boolean
  hasTodayPhoto:       boolean
  workoutCount:        number
  /** null = no leg session in available data (either new user OR 90 + days ago) */
  daysSinceLastLegDay: number | null
  profileComplete:     boolean
  storyHref:           string
  locale:              Locale
}

/* ── Static helpers (props-only, no localStorage) ─────────────── */

function p1(locale: Locale, todayStr: string): CTAItem {
  return locale === 'ja' ? {
    sub: 'まだ記録がありません', title: '今日のワークアウトを記録',
    desc: 'まずは1種目だけでもOK。今日の努力を残しましょう。',
    href: `/record?date=${todayStr}`, icon: 'plus', accent: 'orange-solid',
  } : {
    sub: 'NO SESSION YET', title: "Log Today's Workout",
    desc: 'Even one set counts. Start your log.',
    href: `/record?date=${todayStr}`, icon: 'plus', accent: 'orange-solid',
  }
}

function p2(locale: Locale, todayStr: string): CTAItem {
  return locale === 'ja' ? {
    sub: '記録済み', title: '今日の記録を確認',
    desc: '内容を見返して、Storyにできます。',
    href: `/record?date=${todayStr}`, icon: 'dumbbell', accent: 'orange-muted',
  } : {
    sub: 'WORKOUT LOGGED', title: "View Today's Session",
    desc: 'Review your session and create a Story from there.',
    href: `/record?date=${todayStr}`, icon: 'dumbbell', accent: 'orange-muted',
  }
}

/* ── Dynamic helpers (localStorage-dependent) ─────────────────── */

function fallbacks(locale: Locale, todayStr: string, storyHref: string): CTAItem[] {
  return locale === 'ja' ? [
    { sub: 'PROGRESS',  title: 'Progressで伸びを確認',  desc: '記録したデータから、成長の流れを見てみましょう。', href: '/analytics', icon: 'trending',  accent: 'white' },
    { sub: 'CALENDAR',  title: 'カレンダーで継続を見る', desc: '継続した日が、ひと目で分かります。',              href: '/home',      icon: 'calendar',  accent: 'white' },
    { sub: 'NEXT SET',  title: '次回の重量を確認',       desc: '前回の記録をもとに、次のセットを決めましょう。',   href: '/record',    icon: 'dumbbell',  accent: 'white' },
    { sub: 'STORY',     title: 'Storyを作成',           desc: '今日のワークアウトをシェアできます。',            href: storyHref,    icon: 'share',     accent: 'white' },
  ] : [
    { sub: 'PROGRESS',  title: 'Review Your Progress',  desc: "See how far you've come with your data.",   href: '/analytics', icon: 'trending',  accent: 'white' },
    { sub: 'CALENDAR',  title: 'Review Your Calendar',  desc: 'See your consistency at a glance.',         href: '/home',      icon: 'calendar',  accent: 'white' },
    { sub: 'NEXT SET',  title: 'Plan Your Next Session',desc: 'Use past data to set your next weights.',   href: '/record',    icon: 'dumbbell',  accent: 'white' },
    { sub: 'STORY',     title: 'Create a Workout Story',desc: "Turn today's session into a story card.",   href: storyHref,    icon: 'share',     accent: 'white' },
  ]
}

function hashStr(s: string): number {
  let h = 0
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0
  return Math.abs(h)
}

type Seen = { story: boolean; progress: boolean; fullscreen: boolean }

function computeDynamic(props: HomeCTACardProps, seen: Seen, fallback: CTAItem): CTAItem {
  const { workoutCount, daysSinceLastLegDay, profileComplete, locale, storyHref } = props
  const ja = locale === 'ja'

  // P3: Introduce Story feature
  if (!seen.story) return ja ? {
    sub: '今日の記録を共有', title: 'Workout Storyを作成',
    desc: '今日のトレーニングをInstagram Story風に保存できます。',
    href: storyHref, icon: 'share', accent: 'orange-muted',
  } : {
    sub: "TODAY'S WORKOUT", title: 'Create a Workout Story',
    desc: 'Save your training as an Instagram Story.',
    href: storyHref, icon: 'share', accent: 'orange-muted',
  }

  // P4: Introduce Progress after 3+ workouts
  if (workoutCount >= 3 && !seen.progress) return ja ? {
    sub: '伸びを確認できます', title: 'Progressで成長を分析',
    desc: '1RM、ボリューム、体重の変化をグラフで確認できます。',
    href: '/analytics', icon: 'trending', accent: 'white',
  } : {
    sub: 'SEE YOUR GAINS', title: 'Analyze Your Progress',
    desc: '1RM, volume, and weight changes — all in one view.',
    href: '/analytics', icon: 'trending', accent: 'white',
  }

  // P5: Introduce Fullscreen Chart after Progress is seen
  if (seen.progress && !seen.fullscreen) return ja ? {
    sub: '細かく分析できます', title: '全画面グラフで記録を見る',
    desc: '1年分のデータも、横スクロールで細かく確認できます。',
    href: '/analytics/chart?metric=max1rm', icon: 'maximize', accent: 'white',
  } : {
    sub: 'DEEP ANALYSIS', title: 'Full-Screen Chart Mode',
    desc: 'Scroll through a year of data in detail.',
    href: '/analytics/chart?metric=max1rm', icon: 'maximize', accent: 'white',
  }

  // P6: Chicken Leg reminder (14+ days without leg training)
  if (workoutCount >= 3 && (daysSinceLastLegDay === null || daysSinceLastLegDay >= 14)) return ja ? {
    sub: 'Leg day is waiting', title: '脚トレ、そろそろです',
    desc: '長く脚トレをしていないと、Chicken Legステータスが進化します。',
    href: '/record?bodyPart=legs', icon: 'dumbbell', accent: 'orange-muted',
  } : {
    sub: 'LEG DAY IS WAITING', title: "It's Been a While Since Leg Day",
    desc: 'Chicken Leg status is evolving. Time to train.',
    href: '/record?bodyPart=legs', icon: 'dumbbell', accent: 'orange-muted',
  }

  return fallback
}

/* ── Icon box ────────────────────────────────────────────────── */

function IconBox({ icon, accent }: { icon: CTAIcon; accent: Accent }) {
  const solid  = accent === 'orange-solid'
  const muted  = accent === 'orange-muted'
  const color  = solid ? '#fff' : muted ? '#ED742F' : 'rgba(255,255,255,0.52)'
  const box    = solid
    ? { background: '#ED742F', boxShadow: '0 4px 18px rgba(237,116,47,0.42)' } as React.CSSProperties
    : muted
      ? { background: 'rgba(237,116,47,0.14)', border: '1px solid rgba(237,116,47,0.30)' } as React.CSSProperties
      : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' } as React.CSSProperties

  return (
    <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={box}>
      {icon === 'plus'     && <Plus         size={solid ? 22 : 20} style={{ color }} />}
      {icon === 'camera'   && <Camera       size={20} style={{ color }} />}
      {icon === 'share'    && <Share2       size={20} style={{ color }} />}
      {icon === 'trending' && <TrendingUp   size={20} style={{ color }} />}
      {icon === 'maximize' && <Maximize2    size={20} style={{ color }} />}
      {icon === 'dumbbell' && <Dumbbell     size={20} style={{ color }} />}
      {icon === 'calendar' && <CalendarDays size={20} style={{ color }} />}
    </div>
  )
}

/* ── Card ────────────────────────────────────────────────────── */

function CTACard({ cta }: { cta: CTAItem }) {
  const router = useRouter()
  const [pressed, setPressed] = useState(false)
  const navigatingRef = useRef(false)
  const isOrange = cta.accent !== 'white'

  function handleClick() {
    if (navigatingRef.current) return
    navigatingRef.current = true
    router.push(cta.href)
    setTimeout(() => { navigatingRef.current = false }, 1200)
  }

  return (
    <button
      className="w-full text-left"
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={handleClick}
      style={{
        display: 'block',
        transform: pressed ? 'scale(0.98)' : 'scale(1)',
        transition: 'transform 120ms ease-out',
      }}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: isOrange ? '#1C1C1C' : '#181818',
          border: isOrange
            ? '1px solid rgba(237,116,47,0.28)'
            : '1px solid rgba(255,255,255,0.09)',
          boxShadow: pressed && isOrange
            ? '0 0 28px rgba(237,116,47,0.28), 0 0 8px rgba(237,116,47,0.14)'
            : 'none',
          transition: 'box-shadow 120ms ease-out',
        }}>
        {/* Top accent line */}
        <div style={{
          height: cta.accent === 'orange-solid' ? 2 : 1,
          background: isOrange
            ? 'linear-gradient(90deg, #ED742F 0%, rgba(237,116,47,0.18) 60%, transparent 100%)'
            : 'linear-gradient(90deg, rgba(255,255,255,0.13) 0%, transparent 55%)',
        }} />

        <div className="px-5 py-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 5,
              color: isOrange ? 'rgba(237,116,47,0.82)' : 'rgba(255,255,255,0.40)',
            }}>
              {cta.sub}
            </p>
            <p style={{
              fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em',
              lineHeight: 1.25, marginBottom: 5, color: '#fff',
            }}>
              {cta.title}
            </p>
            <p style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.46)' }}>
              {cta.desc}
            </p>
          </div>
          <IconBox icon={cta.icon} accent={cta.accent} />
        </div>
      </div>
    </button>
  )
}

/* ── Main component ──────────────────────────────────────────── */

export default function HomeCTACard(props: HomeCTACardProps) {
  const { todayStr, hasTodayWorkout, locale } = props

  // Always show P1 (no workout) or P2 (has workout) — both go to Record screen
  const cta: CTAItem = hasTodayWorkout
    ? p2(locale, todayStr)
    : p1(locale, todayStr)

  return <CTACard cta={cta} />
}
