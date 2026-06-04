// MVP: No login required — redirects to record.
// TODO_SYNC: Restore auth UI when account features are added.
import { redirect } from 'next/navigation'
export default function LoginPage() { redirect('/record') }
