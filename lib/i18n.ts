export type Locale = 'en' | 'ja'
export type LangPref = 'auto' | 'en' | 'ja'

export function resolveLocale(pref: LangPref): Locale {
  if (pref === 'en') return 'en'
  if (pref === 'ja') return 'ja'
  if (typeof navigator !== 'undefined' && navigator.language.startsWith('ja')) return 'ja'
  return 'en'
}

const translations = {
  en: {
    settings: {
      language: 'Language',
      languageSub: 'Auto / English / 日本語',
      languageAuto: 'Auto',
      languageAutoSub: 'Matches your device language',
      languageEn: 'English',
      languageJa: '日本語',
    },
    analytics: {
      weightLogged: 'Weight logged',
      weightError: 'Could not save weight',
      bodyWeight: 'BODY WEIGHT',
      todayLogged: 'Logged today',
      save: 'Save',
    },
    rewards: {
      rewardsDescription: 'Unlock analytics and themes as you train.',
      keepGoing: 'Keep training to unlock more.',
    },
    onboarding: {
      units: {
        title: 'Which unit do you train in?',
      },
      goal: {
        title: "What's your main goal?",
        sub: "We'll tailor the experience for you.",
        muscle_gain: 'Muscle Gain',
        muscle_gainSub: 'Build size & mass',
        fat_loss: 'Fat Loss',
        fat_lossSub: 'Cut & get lean',
        strength: 'Strength',
        strengthSub: 'Lift heavier',
        endurance: 'Endurance',
        enduranceSub: 'Go longer & harder',
        general: 'General Fitness',
        generalSub: 'Stay healthy & active',
      },
      experience: {
        title: 'Training experience?',
        beginner: 'Beginner',
        beginnerSub: 'Less than 1 year',
        intermediate: 'Intermediate',
        intermediateSub: '1 – 3 years',
        advanced: 'Advanced',
        advancedSub: '3+ years',
      },
      frequency: {
        title: 'How often do you train?',
        perWeek: 'per week',
      },
      bodyweight: {
        title: 'Current body weight?',
        sub: 'Used to track your progress over time. Optional.',
        error: 'Please enter a value between 20 and 300 kg',
      },
      profile: {
        title: 'What should we call you?',
        sub: 'This shows on your profile. You can change it later.',
        placeholder: 'Your name',
      },
      emailOptIn: {
        title: 'Can we send you updates?',
        sub: 'No spam. Only useful training tips and product updates.',
        bullet1: 'Training tips',
        bullet2: 'New feature announcements',
        bullet3: 'Progress reminders',
        bullet4: 'You can unsubscribe anytime',
        sure: 'Sure',
        noThanks: 'No, thanks',
      },
      acquisitionSource: {
        title: 'How did you hear about LIFTSNAP?',
      },
      complete: {
        titleWithName: "Let's lift, {name}.",
        titleNoName: "You're ready to lift.",
        sub: 'LIFTSNAP is set up and ready to track your progress.',
        cta: 'START TRAINING →',
        saving: 'SAVING...',
      },
      continueBtn: 'CONTINUE →',
      skipBtn: 'SKIP →',
    },
  },

  ja: {
    settings: {
      language: '言語',
      languageSub: '自動 / English / 日本語',
      languageAuto: '自動',
      languageAutoSub: 'デバイスの言語設定に合わせる',
      languageEn: 'English',
      languageJa: '日本語',
    },
    analytics: {
      weightLogged: '体重を記録しました',
      weightError: '体重の保存に失敗しました',
      bodyWeight: '体重',
      todayLogged: '今日記録済み',
      save: '保存',
    },
    rewards: {
      rewardsDescription: 'トレーニングを重ねると、分析機能やテーマが解放されます。',
      keepGoing: 'トレーニングを続けてさらに解放しよう。',
    },
    onboarding: {
      units: {
        title: 'どちらの単位でトレーニングしますか？',
      },
      goal: {
        title: 'トレーニングの目的を教えてください',
        sub: 'あなたに合った体験をお届けします。',
        muscle_gain: '筋肉増量',
        muscle_gainSub: 'サイズとボリュームを増やす',
        fat_loss: '体脂肪減少',
        fat_lossSub: '絞ってシャープに',
        strength: '筋力強化',
        strengthSub: 'より重いウェイトを持ち上げる',
        endurance: '持久力向上',
        enduranceSub: '長く、激しく',
        general: '健康維持',
        generalSub: '健康で活動的に',
      },
      experience: {
        title: 'トレーニング歴は？',
        beginner: '初心者',
        beginnerSub: '1年未満',
        intermediate: '中級者',
        intermediateSub: '1〜3年',
        advanced: '上級者',
        advancedSub: '3年以上',
      },
      frequency: {
        title: '週に何回トレーニングしますか？',
        perWeek: '回/週',
      },
      bodyweight: {
        title: '現在の体重は？',
        sub: '体重の変化を記録するために使用します（任意）。',
        error: '20〜300の間で入力してください',
      },
      profile: {
        title: '表示名を教えてください',
        sub: 'プロフィールに表示されます。後で変更できます。',
        placeholder: '名前',
      },
      emailOptIn: {
        title: 'お知らせを受け取りますか？',
        sub: 'スパムなし。トレーニングのヒントと製品のお知らせのみです。',
        bullet1: 'トレーニングのヒント',
        bullet2: '新機能のお知らせ',
        bullet3: '進捗のリマインダー',
        bullet4: 'いつでも配信停止できます',
        sure: 'もちろん',
        noThanks: 'いいえ、結構です',
      },
      acquisitionSource: {
        title: 'LIFTSNAPをどこで知りましたか？',
      },
      complete: {
        titleWithName: '{name}、さあ始めましょう。',
        titleNoName: '準備完了です。',
        sub: 'LIFTSNAPの設定が完了しました。さあトレーニングを記録しましょう。',
        cta: 'トレーニングを始める →',
        saving: '保存中...',
      },
      continueBtn: '次へ →',
      skipBtn: 'スキップ →',
    },
  },
} as const

type DeepValue<T, Path extends string> =
  Path extends `${infer K}.${infer Rest}`
    ? K extends keyof T ? DeepValue<T[K], Rest> : never
    : Path extends keyof T ? T[Path] : never

export function t(locale: Locale, key: string): string {
  const parts = key.split('.')
  const walk = (obj: unknown): unknown => {
    let cur = obj
    for (const part of parts) {
      if (cur == null || typeof cur !== 'object') return undefined
      cur = (cur as Record<string, unknown>)[part]
    }
    return cur
  }
  const result = walk(translations[locale])
  if (typeof result === 'string') return result
  const fallback = walk(translations.en)
  return typeof fallback === 'string' ? fallback : key
}
