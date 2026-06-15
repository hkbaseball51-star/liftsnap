'use client'

import { useLocale } from '@/lib/useLocale'
import { SUPPORT_EMAIL } from '@/constants/legal'
import LegalPageLayout, { LegalSection, LegalContact } from '@/components/legal/LegalPageLayout'

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
    {children}
  </p>
)

const Highlight = ({ children }: { children: React.ReactNode }) => (
  <strong style={{ color: 'var(--text-primary)' }}>{children}</strong>
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
          <P><Highlight>Q. データはどのように管理されますか？</Highlight></P>
          <P>現在のバージョンでは、トレーニング記録・体重記録・アプリ設定はすべてお使いの端末内に保存されます。サーバーへのデータ送信は行われません。詳しくは<a href="/privacy" style={{ color: '#ED742F', textDecoration: 'underline' }}>プライバシーポリシー</a>をご覧ください。</P>

          <P><Highlight>Q. 記録したデータを削除したい</Highlight></P>
          <P>現在のバージョンではアカウントは必要ありません。設定画面の「すべてのデータを削除」からデータを削除できます。アプリをアンインストールしても削除されます。</P>

          <P><Highlight>Q. アプリが正常に動作しない</Highlight></P>
          <P>アプリを再起動するか、最新バージョンへのアップデートをお試しください。解決しない場合はメールにてご連絡ください。</P>

          <P><Highlight>Q. REPRA Proはいつ使えますか？</Highlight></P>
          <P>REPRA ProはComing Soon（近日公開予定）です。現時点ではすべての機能を無料でご利用いただけます。</P>
        </LegalSection>

        <LegalSection title="関連ページ">
          <P>
            <a href="/privacy" style={{ color: '#ED742F', textDecoration: 'underline' }}>プライバシーポリシー</a>
            {' ／ '}
            <a href="/terms" style={{ color: '#ED742F', textDecoration: 'underline' }}>利用規約</a>
            {' ／ '}
            <a href="/disclaimer" style={{ color: '#ED742F', textDecoration: 'underline' }}>フィットネス免責事項</a>
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
        <P><Highlight>Q. How is my data managed?</Highlight></P>
        <P>In the current version, all workout records, body weight data, and app settings are stored locally on your device. No data is sent to our servers. See our <a href="/privacy" style={{ color: '#ED742F', textDecoration: 'underline' }}>Privacy Policy</a> for details.</P>

        <P><Highlight>Q. I want to delete my recorded data.</Highlight></P>
        <P>In the current version, no account is required. You can delete your data from Settings → Reset All Data, or by uninstalling the App.</P>

        <P><Highlight>Q. The app is not working correctly.</Highlight></P>
        <P>Try restarting the app or updating to the latest version. If the issue persists, contact us by email.</P>

        <P><Highlight>Q. When will REPRA Pro be available?</Highlight></P>
        <P>REPRA Pro is coming soon. All current features are available for free in the meantime.</P>
      </LegalSection>

      <LegalSection title="Related Pages">
        <P>
          <a href="/privacy" style={{ color: '#ED742F', textDecoration: 'underline' }}>Privacy Policy</a>
          {' · '}
          <a href="/terms" style={{ color: '#ED742F', textDecoration: 'underline' }}>Terms of Use</a>
          {' · '}
          <a href="/disclaimer" style={{ color: '#ED742F', textDecoration: 'underline' }}>Fitness Disclaimer</a>
        </P>
      </LegalSection>
    </LegalPageLayout>
  )
}
