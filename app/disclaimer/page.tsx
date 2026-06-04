import type { Metadata } from 'next'
import DisclaimerPageContent from '@/components/legal/DisclaimerPageContent'

export const metadata: Metadata = {
  title: 'Fitness Disclaimer | REPRA',
  description: 'Health and safety notices for using the REPRA fitness tracking app.',
}

export default function DisclaimerPage() {
  return <DisclaimerPageContent />
}
