'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { localGetSessionForDate } from '@/lib/localDB'
import RecordNavigator from '@/components/record/RecordNavigator'

function getTodayJST() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0]
}

function RecordInner() {
  const searchParams = useSearchParams()
  const date = searchParams.get('date') ?? getTodayJST()
  const from = searchParams.get('from') ?? undefined
  const sessionData = localGetSessionForDate(date)
  return <RecordNavigator initialDate={date} initialSession={sessionData} from={from} />
}

export default function RecordPage() {
  return (
    <Suspense>
      <RecordInner />
    </Suspense>
  )
}
