import type { Metadata } from 'next'
import SupportPageContent from '@/components/legal/SupportPageContent'

export const metadata: Metadata = {
  title: 'Support | REPRA',
  description: 'REPRA support, FAQ, and contact information.',
}

export default function SupportPage() {
  return <SupportPageContent />
}
