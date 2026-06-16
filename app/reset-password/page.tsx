// Account auth features not yet active — redirect to home.
// TODO_SYNC: Restore full reset-password UI when account features are added.
import { redirect } from 'next/navigation'
export default function ResetPasswordPage() { redirect('/home') }
