'use client'

import { useLocale } from '@/lib/useLocale'
import LegalPageLayout, { LegalSection, LegalList } from '@/components/legal/LegalPageLayout'

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
    {children}
  </p>
)

export default function DisclaimerPageContent() {
  const { locale } = useLocale()

  if (locale === 'en') {
    return (
      <LegalPageLayout title="Fitness Disclaimer" updatedDate="Last updated: June 1, 2026">

        <P>REPRA is a fitness tracking application designed to help you log workouts and monitor your progress. Please read the following notices carefully before using the App.</P>

        <LegalSection title="1. Not Medical Advice">
          <P>The information provided by REPRA, including exercise logs, estimated 1RM calculations, volume tracking, and body weight records, is for informational and self-tracking purposes only.</P>
          <P>Nothing in this App constitutes medical advice, diagnosis, treatment, or professional health guidance. REPRA is not a healthcare provider.</P>
        </LegalSection>

        <LegalSection title="2. Consult a Professional">
          <P>Before beginning any new exercise program, consult a qualified physician, healthcare provider, or certified fitness professional — especially if you:</P>
          <LegalList items={[
            'Have or suspect any medical condition (heart disease, diabetes, joint problems, etc.)',
            'Are pregnant or postpartum',
            'Have not exercised for an extended period',
            'Are taking prescription medication',
            'Have experienced chest pain, dizziness, or shortness of breath during exercise',
          ]} />
          <P>If you experience pain, discomfort, dizziness, or any unusual symptoms during exercise, stop immediately and seek medical attention.</P>
        </LegalSection>

        <LegalSection title="3. Training Risks">
          <P>Strength training and physical exercise carry inherent risks including, but not limited to, muscle soreness, strains, sprains, fractures, and cardiovascular events. You assume all responsibility for your own safety and the safety of others around you when training.</P>
          <P>Always use proper form, appropriate weights, and adequate rest. Train within your current fitness level and increase intensity gradually.</P>
        </LegalSection>

        <LegalSection title="4. Estimated 1RM">
          <P>The estimated one-rep max (1RM) values shown in the App are calculated using the Epley formula and are approximations only. Actual maximum lifts may differ significantly. Never attempt a true one-rep max without a spotter and proper preparation.</P>
        </LegalSection>

        <LegalSection title="5. Body Weight & Nutrition">
          <P>Body weight data recorded in the App is used solely for personal tracking. REPRA does not provide nutrition advice, calorie targets, or dietary recommendations. For guidance on body composition changes, consult a registered dietitian or sports nutritionist.</P>
        </LegalSection>

        <LegalSection title="6. No Guarantee of Results">
          <P>REPRA does not guarantee specific fitness outcomes, performance improvements, or body composition changes from using the App. Results vary based on individual factors including genetics, diet, rest, consistency, and health status.</P>
        </LegalSection>

        <LegalSection title="7. Limitation of Liability">
          <P>To the fullest extent permitted by applicable law, REPRA and its operators are not liable for any injury, health complication, loss, or damage — whether direct, indirect, incidental, or consequential — arising from your use of this App or reliance on information provided within it.</P>
        </LegalSection>

      </LegalPageLayout>
    )
  }

  // Japanese version
  return (
    <LegalPageLayout title="フィットネス免責事項" updatedDate="最終更新日：2026年6月1日">

      <P>REPRAは、ワークアウトの記録と進捗管理をサポートするフィットネス追跡アプリです。本アプリをご利用になる前に、以下の注意事項をよくお読みください。</P>

      <LegalSection title="1. 医療アドバイスではありません">
        <P>REPRAが提供するトレーニング記録、推定1RM計算、ボリューム追跡、体重記録などの情報は、自己記録・参考情報としての提供に限られます。</P>
        <P>本アプリ内のいかなる情報も、医療上のアドバイス、診断、治療、または専門的な健康指導を構成するものではありません。REPRAは医療機関ではありません。</P>
      </LegalSection>

      <LegalSection title="2. 専門家への相談">
        <P>新しいトレーニングプログラムを開始する前に、医師・医療従事者・認定フィットネス専門家に相談してください。特に以下に該当する方は必ず相談してください。</P>
        <LegalList items={[
          '心臓病、糖尿病、関節疾患など、現在または疑いのある疾患がある方',
          '妊娠中または産後の方',
          '長期間運動をしていなかった方',
          '処方薬を服用中の方',
          '運動中に胸痛、めまい、息切れを経験したことがある方',
        ]} />
        <P>運動中に痛み・不快感・めまい・異常な症状を感じた場合は、直ちに運動を中止し、医療機関を受診してください。</P>
      </LegalSection>

      <LegalSection title="3. トレーニングのリスク">
        <P>筋力トレーニングや運動には、筋肉痛・捻挫・骨折・心血管系のリスクなど、様々な固有のリスクが伴います。トレーニング中の自身および周囲の安全は、ユーザー自身が責任を持って確保してください。</P>
        <P>常に正しいフォームを使用し、適切な重量と十分な休息を確保してください。現在の体力レベルに合わせたトレーニングを行い、強度は段階的に上げてください。</P>
      </LegalSection>

      <LegalSection title="4. 推定1RMについて">
        <P>本アプリで表示される推定1RM（最大挙上重量）は、Epley式を使用した概算値です。実際の最大挙上重量とは大きく異なる場合があります。スポッターなしで実際のMAX重量に挑戦することは絶対に避けてください。</P>
      </LegalSection>

      <LegalSection title="5. 体重・栄養について">
        <P>本アプリに記録する体重データは、個人的なトラッキングのみを目的としています。REPRAは栄養アドバイス、カロリー目標、食事推奨を提供しません。体組成の変化についてのアドバイスは、管理栄養士またはスポーツ栄養士にご相談ください。</P>
      </LegalSection>

      <LegalSection title="6. 結果の保証なし">
        <P>REPRAは、本アプリの使用によって特定のフィットネス目標、パフォーマンス向上、または体組成の変化を保証しません。結果は、遺伝・食事・休養・継続性・健康状態など、個人差により異なります。</P>
      </LegalSection>

      <LegalSection title="7. 責任の制限">
        <P>適用される法律の範囲で、REPRA及びその運営者は、本アプリの使用または掲載情報への依拠から生じた怪我、健康上の問題、損失または損害（直接・間接・付随・結果的損害を含む）について、責任を負いません。</P>
      </LegalSection>

    </LegalPageLayout>
  )
}
