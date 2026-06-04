'use client'

import { useLocale } from '@/lib/useLocale'
import { SUPPORT_EMAIL } from '@/constants/legal'
import LegalPageLayout, { LegalSection, LegalList, LegalContact } from '@/components/legal/LegalPageLayout'

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.60)' }}>
    {children}
  </p>
)

export default function TermsPageContent() {
  const { locale } = useLocale()

  if (locale === 'en') {
    return (
      <LegalPageLayout title="Terms of Use" updatedDate="Last updated: June 1, 2026">

        <P>These Terms of Use (&quot;Terms&quot;) govern your use of REPRA (&quot;the App&quot;). By using the App, you agree to these Terms.</P>

        <LegalSection title="1. About the App">
          <P>REPRA is a fitness tracking app for logging strength training, tracking progress, viewing stats, and sharing results. The App is not intended for medical, diagnostic, or health advisory purposes.</P>
        </LegalSection>

        <LegalSection title="2. Account Registration">
          <P>Some features require creating an account. You must provide accurate and up-to-date information. Do not register with false or impersonated information.</P>
        </LegalSection>

        <LegalSection title="3. Account Management">
          <P>You are responsible for maintaining the confidentiality of your login credentials. Actions taken through your account are considered your own.</P>
        </LegalSection>

        <LegalSection title="4. Training Data & Body Information">
          <P>You enter workout logs, body weight, and photos at your own discretion. The App does not guarantee the accuracy or completeness of entered information.</P>
        </LegalSection>

        <LegalSection title="5. Health & Safety">
          <P>Training carries risks of injury. Train safely based on your own condition and experience. Stop immediately if you feel pain or discomfort and consult a medical professional. REPRA is not liable for training outcomes, injuries, or accidents to the extent permitted by law.</P>
        </LegalSection>

        <LegalSection title="6. Prohibited Conduct">
          <P>You must not:</P>
          <LegalList items={[
            'Violate any laws or public order',
            'Impersonate others',
            'Post others\' personal information or photos without consent',
            'Harass, threaten, or defame others',
            'Post discriminatory, violent, sexual, or illegal content',
            'Promote self-harm, dangerous acts, or illegal activity',
            'Place excessive load on the App\'s servers or systems',
            'Attempt unauthorized access, reverse engineering, or scraping',
            'Interfere with the App\'s operation',
          ]} />
        </LegalSection>

        <LegalSection title="7. Intellectual Property">
          <P>All design, code, features, text, images, logos, and trademarks of the App belong to REPRA or their respective rights holders. You may not reproduce, redistribute, or modify them beyond personal use.</P>
        </LegalSection>

        <LegalSection title="8. User Content">
          <P>You retain ownership of content you log (workouts, photos, profile). You grant REPRA a limited license to use this content solely to provide, display, store, and improve the App.</P>
        </LegalSection>

        <LegalSection title="9. Paid Features and Subscriptions">
          <P>REPRA may offer paid features or subscriptions in the future.</P>
          <P>At this time, all current features are available for free unless otherwise stated.</P>
          <P>If REPRA Pro is introduced, we currently plan to offer a 30-day free trial.</P>
          <P>Before any purchase, the price, billing period, renewal terms, cancellation method, and free trial details will be clearly displayed.</P>
        </LegalSection>

        <LegalSection title="10. Refunds & Cancellation">
          <P>Refunds, cancellations, and renewal stops for paid plans purchased through the App Store are handled according to Apple&apos;s policies. REPRA cannot directly process refunds.</P>
        </LegalSection>

        <LegalSection title="11. Account Deletion">
          <P>You can delete your account from Settings within the App. After deletion, your data will be deleted or anonymized within a reasonable time, except where required by law or for fraud prevention.</P>
        </LegalSection>

        <LegalSection title="12. Service Changes">
          <P>REPRA may change, suspend, or discontinue features or the entire App at any time. We may notify you of significant changes via the App or email.</P>
        </LegalSection>

        <LegalSection title="13. Disclaimer">
          <P>The App is provided &quot;as is.&quot; REPRA makes no warranties regarding accuracy, availability, or fitness for a particular purpose. REPRA is not liable for damages arising from your use of the App to the extent permitted by law.</P>
        </LegalSection>

        <LegalSection title="14. Changes to Terms">
          <P>REPRA may update these Terms. You will be notified of significant changes via in-app notice or other appropriate means.</P>
        </LegalSection>

        <LegalSection title="15. Governing Law">
          <P>These Terms are governed by the laws of Japan. Any disputes shall be subject to the exclusive jurisdiction of the court with jurisdiction over REPRA&apos;s location.</P>
        </LegalSection>

        <LegalSection title="16. Contact">
          <LegalContact operator="REPRA Support" email={SUPPORT_EMAIL} />
        </LegalSection>

      </LegalPageLayout>
    )
  }

  // Japanese version
  return (
    <LegalPageLayout title="利用規約" updatedDate="最終更新日：2026年6月1日">

      <P>本利用規約（以下「本規約」といいます）は、REPRA（以下「本アプリ」といいます）の利用条件を定めるものです。</P>
      <P>ユーザーは、本アプリを利用することにより、本規約に同意したものとみなされます。</P>

      <LegalSection title="1. 本アプリの内容">
        <P>本アプリは、筋力トレーニングの記録、進捗管理、カレンダー表示、統計表示、身体写真の記録、トレーニング結果の共有等を目的としたフィットネス記録アプリです。</P>
        <P>本アプリは、医療、診断、治療、健康指導、栄養指導を目的とするものではありません。</P>
      </LegalSection>

      <LegalSection title="2. アカウント登録">
        <P>ユーザーは、本アプリの一部機能を利用するために、アカウントを作成する必要があります。</P>
        <P>ユーザーは、登録時に正確かつ最新の情報を提供するものとします。</P>
        <P>虚偽、不正確、または第三者になりすました情報を登録してはなりません。</P>
      </LegalSection>

      <LegalSection title="3. アカウント管理">
        <P>ユーザーは、自己の責任においてログイン情報を管理するものとします。</P>
        <P>ユーザーのアカウントを利用して行われた行為は、当該ユーザー本人による行為とみなされます。ただし、本アプリの責めに帰すべき事由がある場合を除きます。</P>
      </LegalSection>

      <LegalSection title="4. トレーニング記録と身体情報">
        <P>ユーザーは、自身の判断と責任において、トレーニング記録、体重、身体写真等を登録するものとします。</P>
        <P>本アプリは、入力された情報の正確性、完全性、最新性を保証しません。</P>
      </LegalSection>

      <LegalSection title="5. 健康上の注意">
        <P>トレーニングには怪我、体調不良、健康被害のリスクがあります。</P>
        <P>ユーザーは、自身の体調、経験、能力に応じて安全にトレーニングを行ってください。</P>
        <P>痛み、違和感、体調不良がある場合は、直ちに運動を中止し、医師または専門家に相談してください。</P>
        <P>本アプリは、ユーザーのトレーニング結果、健康状態、怪我、事故について、法令で認められる範囲において責任を負いません。</P>
      </LegalSection>

      <LegalSection title="6. 禁止事項">
        <P>ユーザーは、本アプリの利用にあたり、以下の行為をしてはなりません。</P>
        <LegalList items={[
          '法令または公序良俗に反する行為',
          '他者になりすます行為',
          '他者の個人情報、写真、トレーニング記録を無断で投稿・利用する行為',
          '他者を誹謗中傷、脅迫、嫌がらせする行為',
          '差別的、暴力的、性的、違法、または不適切な内容を投稿する行為',
          '自傷行為、危険行為、薬物乱用、違法行為を助長する行為',
          '本アプリのサーバー、ネットワーク、システムに過度な負荷をかける行為',
          '不正アクセス、リバースエンジニアリング、改ざん、スクレイピング',
          '本アプリの運営を妨害する行為',
          'その他、運営者が不適切と判断する行為',
        ]} />
      </LegalSection>

      <LegalSection title="7. 知的財産権">
        <P>本アプリに関するデザイン、ロゴ、プログラム、機能、文章、画像、商標、その他一切の知的財産権は、運営者または正当な権利者に帰属します。</P>
        <P>ユーザーは、本アプリを利用する範囲を超えて、無断で複製、転載、改変、販売、配布してはなりません。</P>
      </LegalSection>

      <LegalSection title="8. ユーザーコンテンツ">
        <P>ユーザーが本アプリに登録したトレーニング記録、写真、プロフィール情報等の権利は、原則としてユーザーに帰属します。</P>
        <P>ただし、ユーザーは、本アプリの提供、表示、保存、バックアップ、共有機能、品質改善に必要な範囲で、運営者が当該コンテンツを利用することを許諾するものとします。</P>
      </LegalSection>

      <LegalSection title="9. 有料機能およびサブスクリプション">
        <P>REPRAは将来的に有料機能またはサブスクリプションを提供する場合があります。</P>
        <P>現時点では、別途明記されていない限り、現在の機能は無料で利用できます。</P>
        <P>REPRA Proを導入する場合、30日間無料トライアルの提供を予定しています。</P>
        <P>購入前には、価格、請求期間、更新条件、キャンセル方法、無料トライアルの詳細を明確に表示します。</P>
        <P>App Storeを通じたアプリ内課金については、Appleの規約および決済条件が適用されます。</P>
      </LegalSection>

      <LegalSection title="10. 返金・解約">
        <P>App Storeを通じて購入された有料プランの返金、解約、更新停止については、Appleの定める方法に従うものとします。</P>
        <P>本アプリ側で直接返金処理を行えない場合があります。</P>
      </LegalSection>

      <LegalSection title="11. アカウント削除">
        <P>ユーザーは、アプリ内の「アカウント削除」機能からアカウント削除を申請できます。</P>
        <P>アカウント削除後、ユーザーに紐づくデータは、法令上または不正利用防止のために保存が必要な情報を除き、合理的な期間内に削除または匿名化されます。</P>
      </LegalSection>

      <LegalSection title="12. サービスの変更・停止">
        <P>運営者は、必要に応じて、本アプリの内容、機能、仕様、料金、提供方法を変更、追加、停止、終了することがあります。</P>
      </LegalSection>

      <LegalSection title="13. 免責事項">
        <P>本アプリは、現状有姿で提供されます。運営者は、本アプリについて、正確性、完全性、有用性、継続性を保証しません。</P>
        <P>本アプリの利用により生じた損害について、運営者は、法令で認められる範囲において責任を負いません。</P>
      </LegalSection>

      <LegalSection title="14. 規約の変更">
        <P>運営者は、必要に応じて本規約を変更することがあります。重要な変更がある場合は、アプリ内表示またはその他適切な方法により通知します。</P>
      </LegalSection>

      <LegalSection title="15. 準拠法・管轄">
        <P>本規約は、日本法に準拠します。本アプリに関して紛争が生じた場合、運営者所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。</P>
      </LegalSection>

      <LegalSection title="16. お問い合わせ">
        <LegalContact operator="REPRA運営者" email={SUPPORT_EMAIL} />
      </LegalSection>

    </LegalPageLayout>
  )
}
