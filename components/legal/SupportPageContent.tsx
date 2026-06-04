'use client'

import { useLocale } from '@/lib/useLocale'
import { SUPPORT_EMAIL } from '@/constants/legal'
import LegalPageLayout, { LegalSection, LegalContact } from '@/components/legal/LegalPageLayout'

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.60)' }}>
    {children}
  </p>
)

const Highlight = ({ children }: { children: React.ReactNode }) => (
  <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{children}</strong>
)

export default function SupportPageContent() {
  const { locale } = useLocale()
  const isJa = locale === 'ja'

  if (isJa) {
    return (
      <LegalPageLayout title="サポート" updatedDate="">
        <LegalSection title="お問い合わせ">
          <P>REPRAに関するご質問・ご要望・不具合報告は、下記メールアドレスまでお送りください。</P>
          <P>通常2〜3営業日以内にご返信いたします。</P>
          <LegalContact operator="REPRA運営者" email={SUPPORT_EMAIL} />
        </LegalSection>

        <LegalSection title="よくある質問">
          <P><Highlight>Q. パスワードを忘れました</Highlight></P>
          <P>ログイン画面の「パスワードを忘れた方」から、メールアドレスを入力してリセットリンクをお受け取りください。</P>

          <P><Highlight>Q. アカウントを削除したい</Highlight></P>
          <P>アプリ内「プロフィール → 設定 → アカウント削除」から手続きできます。詳しくは<a href="/account-deletion" style={{ color: '#ED742F', textDecoration: 'underline' }}>アカウント削除ページ</a>をご覧ください。</P>

          <P><Highlight>Q. データはどのように管理されますか？</Highlight></P>
          <P>詳しくは<a href="/privacy" style={{ color: '#ED742F', textDecoration: 'underline' }}>プライバシーポリシー</a>をご覧ください。</P>

          <P><Highlight>Q. アプリが正常に動作しない</Highlight></P>
          <P>アプリを再起動するか、最新バージョンへのアップデートをお試しください。解決しない場合はメールにてご連絡ください。</P>
        </LegalSection>

        <LegalSection title="関連ページ">
          <P>
            <a href="/privacy" style={{ color: '#ED742F', textDecoration: 'underline' }}>プライバシーポリシー</a>
            {' ／ '}
            <a href="/terms" style={{ color: '#ED742F', textDecoration: 'underline' }}>利用規約</a>
            {' ／ '}
            <a href="/account-deletion" style={{ color: '#ED742F', textDecoration: 'underline' }}>アカウント削除</a>
          </P>
        </LegalSection>
      </LegalPageLayout>
    )
  }

  return (
    <LegalPageLayout title="Support" updatedDate="">
      <LegalSection title="Contact Us">
        <P>For questions, feedback, or bug reports, please email us at the address below.</P>
        <P>We typically respond within 2–3 business days.</P>
        <LegalContact operator="REPRA Support" email={SUPPORT_EMAIL} />
      </LegalSection>

      <LegalSection title="FAQ">
        <P><Highlight>Q. I forgot my password.</Highlight></P>
        <P>On the login screen, tap &quot;FORGOT PASSWORD?&quot; and enter your email to receive a reset link.</P>

        <P><Highlight>Q. I want to delete my account.</Highlight></P>
        <P>Go to Profile → Settings → Delete Account in the app. For details, see our <a href="/account-deletion" style={{ color: '#ED742F', textDecoration: 'underline' }}>Account Deletion page</a>.</P>

        <P><Highlight>Q. How is my data managed?</Highlight></P>
        <P>Please see our <a href="/privacy" style={{ color: '#ED742F', textDecoration: 'underline' }}>Privacy Policy</a> for details.</P>

        <P><Highlight>Q. The app is not working correctly.</Highlight></P>
        <P>Try restarting the app or updating to the latest version. If the issue persists, contact us by email.</P>
      </LegalSection>

      <LegalSection title="Related Pages">
        <P>
          <a href="/privacy" style={{ color: '#ED742F', textDecoration: 'underline' }}>Privacy Policy</a>
          {' · '}
          <a href="/terms" style={{ color: '#ED742F', textDecoration: 'underline' }}>Terms of Use</a>
          {' · '}
          <a href="/account-deletion" style={{ color: '#ED742F', textDecoration: 'underline' }}>Account Deletion</a>
        </P>
      </LegalSection>
    </LegalPageLayout>
  )
}
