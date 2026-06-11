'use client'

import { useLocale } from '@/lib/useLocale'
import { SUPPORT_EMAIL } from '@/constants/legal'
import LegalPageLayout, { LegalSection, LegalContact } from '@/components/legal/LegalPageLayout'

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
    {children}
  </p>
)

export default function AccountDeletionPageContent() {
  const { locale } = useLocale()
  const isJa = locale === 'ja'

  if (isJa) {
    return (
      <LegalPageLayout title="アカウント削除" updatedDate="最終更新日：2026年6月4日">

        <LegalSection title="現在のMVPについて">
          <P>現在のMVPでは、REPRAはログインなしで利用できます。</P>
          <P>そのため、通常のアカウント削除操作は必要ありません。</P>
          <P>
            トレーニング記録・体重記録・アプリ設定は端末内に保存されています。
            これらのデータは、アプリをアンインストールすることで端末から削除されます。
          </P>
        </LegalSection>

        <LegalSection title="将来的なアカウント機能について">
          <P>
            将来的にアカウント機能を提供する場合、アプリ内またはサポート経由でアカウント削除方法を案内します。
          </P>
        </LegalSection>

        <LegalSection title="お問い合わせ">
          <P>ご不明な点はサポートまでご連絡ください。</P>
          <LegalContact operator="REPRA運営者" email={SUPPORT_EMAIL} />
        </LegalSection>

      </LegalPageLayout>
    )
  }

  return (
    <LegalPageLayout title="Account Deletion" updatedDate="Last updated: June 4, 2026">

      <LegalSection title="About the Current MVP">
        <P>In the current MVP, REPRA can be used without creating an account.</P>
        <P>Therefore, account deletion is generally not required at this stage.</P>
        <P>
          Workout records, body weight data, and app settings are stored locally on your device.
          This data is removed when you uninstall the App.
        </P>
      </LegalSection>

      <LegalSection title="Future Account Features">
        <P>
          If account features are introduced in the future, account deletion options will be
          provided in-app or through support.
        </P>
      </LegalSection>

      <LegalSection title="Contact">
        <P>If you have any questions, please reach out to us:</P>
        <LegalContact operator="REPRA Support" email={SUPPORT_EMAIL} />
      </LegalSection>

    </LegalPageLayout>
  )
}
