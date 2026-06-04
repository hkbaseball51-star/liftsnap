import type { Metadata } from 'next'
import AccountDeletionPageContent from '@/components/legal/AccountDeletionPageContent'

export const metadata: Metadata = {
  title: 'Account Deletion | REPRA',
  description: 'How to delete your REPRA account and manage your data.',
}

export default function AccountDeletionPage() {
  return <AccountDeletionPageContent />
}
