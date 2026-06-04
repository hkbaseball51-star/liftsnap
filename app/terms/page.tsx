import type { Metadata } from 'next'
import TermsPageContent from '@/components/legal/TermsPageContent'

export const metadata: Metadata = {
  title: 'Terms of Use | REPRA',
  description: 'Terms and conditions for using the REPRA app.',
}

export default function TermsPage() {
  return <TermsPageContent />
}
