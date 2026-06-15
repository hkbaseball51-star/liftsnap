'use client'

import { useLocale } from '@/lib/useLocale'
import { SUPPORT_EMAIL } from '@/constants/legal'
import LegalPageLayout, {
  LegalSection,
  LegalSubSection,
  LegalList,
  LegalContact,
} from '@/components/legal/LegalPageLayout'

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
    {children}
  </p>
)

export default function PrivacyPageContent() {
  const { locale } = useLocale()

  if (locale === 'en') {
    return (
      <LegalPageLayout title="Privacy Policy" updatedDate="Last updated: June 4, 2026">

        <P>
          REPRA (&quot;the App&quot;) respects your privacy. This Privacy Policy explains how we
          handle information in connection with your use of the App.
        </P>

        <LegalSection title="1. No Account Required">
          <P>
            In the current version, REPRA can be used without creating an account or signing in.
            Features including Record, Calendar, Stats, and Share are available to all users
            without registration.
          </P>
        </LegalSection>

        <LegalSection title="2. Information Collected and Stored">
          <P>The App may collect or store the following types of information:</P>

          <LegalSubSection title="Workout records (stored on your device)">
            <LegalList items={[
              'Training dates, exercise names, and muscle group categories',
              'Weight, reps, and set counts',
              'Training volume and estimated 1RM',
              'Custom exercise settings',
              'Session notes',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="Body weight records (stored on your device)">
            <LegalList items={[
              'Recorded weight values and dates',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="App settings (stored on your device)">
            <LegalList items={[
              'Language preference',
              'Unit preference (kg / lb)',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="Story card preferences (stored on your device)">
            <LegalList items={[
              'Design preferences for Share cards',
            ]} />
          </LegalSubSection>

          <LegalSubSection title="Support inquiries">
            <LegalList items={[
              'If you contact support, we handle the information you provide in your message',
            ]} />
          </LegalSubSection>
        </LegalSection>

        <LegalSection title="3. How Your Data Is Stored">
          <P>
            In the current version, all workout records, body weight records, app settings, and
            preferences are stored locally on your device. This data is not transmitted to our
            servers.
          </P>
          <P>
            Your data remains on your device unless you explicitly share it (for example, via the
            Share card feature).
          </P>
        </LegalSection>

        <LegalSection title="4. Future Features">
          <P>
            We may introduce account features and cloud sync in a future update. If that happens,
            we will update this Privacy Policy and notify users in advance before any data leaves
            your device.
          </P>
        </LegalSection>

        <LegalSection title="5. Payments (Future)">
          <P>
            REPRA Pro is planned for a future release. No paid features are available at this time
            and no payment processing takes place.
          </P>
          <P>
            When paid features are introduced, payments will be processed through the Apple App
            Store or other payment providers. REPRA will not store your full payment card
            information.
          </P>
        </LegalSection>

        <LegalSection title="6. Health Notice">
          <P>
            REPRA is a fitness tracking app. It is not intended to provide medical advice,
            diagnosis, treatment, or professional health guidance. For any health concerns, please
            consult a qualified professional.
          </P>
        </LegalSection>

        <LegalSection title="7. Children">
          <P>
            REPRA is not intended for use by children under 13. We do not knowingly collect
            information from children under 13.
          </P>
        </LegalSection>

        <LegalSection title="8. Changes to This Policy">
          <P>
            We may update this Privacy Policy as features evolve. Significant changes will be
            communicated via in-app notices or other appropriate means.
          </P>
        </LegalSection>

        <LegalSection title="9. Contact">
          <P>For privacy questions or data inquiries, please contact us:</P>
          <LegalContact operator="REPRA Support" email={SUPPORT_EMAIL} />
        </LegalSection>

      </LegalPageLayout>
    )
  }

  // Japanese
  return (
    <LegalPageLayout title="プライバシーポリシー" updatedDate="最終更新日：2026年6月4日">

      <P>
        REPRA（以下「本アプリ」）は、ユーザーのプライバシーを尊重します。
        本プライバシーポリシーは、本アプリにおける情報の取り扱いについて説明するものです。
      </P>

      <LegalSection title="1. ログイン不要">
        <P>
          現在のバージョンでは、REPRAはアカウント作成やログインなしで利用できます。
          Record・Calendar・Stats・Shareを含むすべての機能を、登録不要でご利用いただけます。
        </P>
      </LegalSection>

      <LegalSection title="2. 収集・保存される情報">
        <P>本アプリでは、以下の情報を収集または保存する場合があります。</P>

        <LegalSubSection title="トレーニング記録（端末内に保存）">
          <LegalList items={[
            'トレーニング日・種目名・部位カテゴリ',
            '重量・回数・セット数',
            'トレーニングボリューム・推定1RM',
            'カスタム種目の設定',
            'セッションのメモ',
          ]} />
        </LegalSubSection>

        <LegalSubSection title="体重記録（端末内に保存）">
          <LegalList items={[
            '記録した体重の数値と日付',
          ]} />
        </LegalSubSection>

        <LegalSubSection title="アプリ設定（端末内に保存）">
          <LegalList items={[
            '言語設定',
            '単位設定（kg / lb）',
          ]} />
        </LegalSubSection>

        <LegalSubSection title="ストーリーカード設定（端末内に保存）">
          <LegalList items={[
            'Shareカードのデザイン設定',
          ]} />
        </LegalSubSection>

        <LegalSubSection title="サポートへのお問い合わせ">
          <LegalList items={[
            'サポートにご連絡いただいた場合、メッセージに含まれる情報を取り扱います',
          ]} />
        </LegalSubSection>
      </LegalSection>

      <LegalSection title="3. データの保存場所">
        <P>
          現在のバージョンでは、上記のトレーニング記録・体重記録・アプリ設定・カード設定は、
          すべてお使いの端末内（ローカルストレージ）に保存されます。
          これらのデータがサーバーに送信されることはありません。
        </P>
        <P>
          ユーザーが明示的に共有操作（Shareカード機能など）を行わない限り、
          データは端末内に保持されます。
        </P>
      </LegalSection>

      <LegalSection title="4. 将来的な機能について">
        <P>
          今後のアップデートで、アカウント機能やクラウド同期を導入する場合があります。
          その際は本ポリシーを更新し、データが端末外に送信される前に事前にお知らせします。
        </P>
      </LegalSection>

      <LegalSection title="5. 決済について（将来予定）">
        <P>
          REPRA Proは将来的に導入予定です。現時点では有料機能は提供しておらず、
          課金処理は行われません。
        </P>
        <P>
          有料機能を導入する場合、決済はApple App Storeまたはその他の決済事業者を通じて
          処理されます。REPRAは完全な支払いカード情報を保存しません。
        </P>
      </LegalSection>

      <LegalSection title="6. 健康・医療に関する注意">
        <P>
          本アプリはフィットネス記録アプリです。医療上のアドバイス、診断、治療、
          専門的な健康指導を提供するものではありません。
          健康上の不安がある場合は、医師または専門家にご相談ください。
        </P>
      </LegalSection>

      <LegalSection title="7. 未成年者の利用">
        <P>
          本アプリは13歳未満の方の利用を想定していません。
          13歳未満の方の個人情報を意図的に収集することはありません。
        </P>
      </LegalSection>

      <LegalSection title="8. プライバシーポリシーの変更">
        <P>
          機能追加等に応じて本ポリシーを変更することがあります。
          重要な変更がある場合は、アプリ内表示またはその他の方法でお知らせします。
        </P>
      </LegalSection>

      <LegalSection title="9. お問い合わせ">
        <P>プライバシーに関するご質問、データに関するお問い合わせは下記までご連絡ください。</P>
        <LegalContact operator="REPRA運営者" email={SUPPORT_EMAIL} />
      </LegalSection>

    </LegalPageLayout>
  )
}
