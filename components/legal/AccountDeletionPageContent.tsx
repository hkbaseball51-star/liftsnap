'use client'

import { useLocale } from '@/lib/useLocale'
import { SUPPORT_EMAIL } from '@/constants/legal'
import LegalPageLayout, { LegalSection, LegalList, LegalContact } from '@/components/legal/LegalPageLayout'

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.60)' }}>
    {children}
  </p>
)

export default function AccountDeletionPageContent() {
  const { locale } = useLocale()
  const isJa = locale === 'ja'

  if (isJa) {
    return (
      <LegalPageLayout title="アカウント削除" updatedDate="最終更新日：2026年6月1日">
        <LegalSection title="アカウントの削除方法">
          <P>REPRAのアカウントはいつでも削除できます。以下の手順でお手続きください。</P>
          <LegalList items={[
            'アプリを開き、下部ナビゲーションの「プロフィール」タブをタップ',
            '画面右上の「設定」アイコンをタップ',
            'ページ下部の「アカウント削除」をタップ',
            '削除対象データの確認画面で内容を確認',
            '「DELETE」と入力して削除を実行',
          ]} />
          <P>上記の手順でお手続きができない場合は、下記のサポートメールアドレスまでご連絡ください。</P>
        </LegalSection>

        <LegalSection title="削除されるデータ">
          <P>アカウントを削除すると、以下のデータが削除または匿名化されます。</P>
          <LegalList items={[
            'プロフィール情報（表示名・メールアドレス）',
            'トレーニング記録・セット・種目データ',
            '体重・身体データ',
            '身体写真',
            'その他アカウントに紐づく全データ',
          ]} />
          <P>削除処理は合理的な期間内に完了します。ただし、法令上の義務または不正利用防止のために保存が必要な情報は、定められた期間保持される場合があります。</P>
        </LegalSection>

        <LegalSection title="削除後の注意事項">
          <LegalList items={[
            '削除したアカウントは復元できません',
            '同じメールアドレスで再登録することは可能です',
            '削除後はアプリへのログインができなくなります',
          ]} />
        </LegalSection>

        <LegalSection title="メールによる削除申請">
          <P>アプリからの操作が難しい場合は、以下の情報を添えてサポートメールまでご連絡ください。</P>
          <LegalList items={[
            '件名：アカウント削除申請',
            '登録メールアドレス',
            '削除理由（任意）',
          ]} />
          <LegalContact operator="REPRA運営者" email={SUPPORT_EMAIL} />
        </LegalSection>
      </LegalPageLayout>
    )
  }

  return (
    <LegalPageLayout title="Account Deletion" updatedDate="Last updated: June 1, 2026">
      <LegalSection title="How to Delete Your Account">
        <P>You can delete your REPRA account at any time by following these steps:</P>
        <LegalList items={[
          'Open the app and tap the "Profile" tab in the bottom navigation',
          'Tap the "Settings" icon in the top right',
          'Scroll to the bottom and tap "Delete Account"',
          'Review the list of data that will be deleted',
          'Type "DELETE" to confirm and execute the deletion',
        ]} />
        <P>If you cannot complete the steps above, please contact us by email at the address below.</P>
      </LegalSection>

      <LegalSection title="Data That Will Be Deleted">
        <P>When you delete your account, the following data will be deleted or anonymized:</P>
        <LegalList items={[
          'Profile information (display name, email address)',
          'Workout sessions, sets, and exercise data',
          'Body weight and body measurement data',
          'Workout and body photos',
          'All other data associated with your account',
        ]} />
        <P>Deletion is completed within a reasonable period. However, data required by law or for fraud prevention may be retained for a defined period.</P>
      </LegalSection>

      <LegalSection title="Important Notes">
        <LegalList items={[
          'Deleted accounts cannot be restored',
          'You may re-register using the same email address',
          'You will no longer be able to log in after deletion',
        ]} />
      </LegalSection>

      <LegalSection title="Request Deletion by Email">
        <P>If you cannot delete your account from within the app, please contact us with the following information:</P>
        <LegalList items={[
          'Subject: Account Deletion Request',
          'Your registered email address',
          'Reason for deletion (optional)',
        ]} />
        <LegalContact operator="REPRA Support" email={SUPPORT_EMAIL} />
      </LegalSection>
    </LegalPageLayout>
  )
}
