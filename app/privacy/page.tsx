import type { Metadata } from 'next'
import PrivacyPageContent from '@/components/legal/PrivacyPageContent'

export const metadata: Metadata = {
  title: 'Privacy Policy | REPRA',
  description: 'Privacy policy for the REPRA fitness tracking app.',
}

export default function PrivacyPage() {
  return <PrivacyPageContent />
}
