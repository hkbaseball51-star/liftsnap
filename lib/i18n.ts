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
      accountEditSub: 'Name, bio, training style',
      privacySub: 'Profile visibility & data',
      notificationsSub: 'Push and in-app alerts',
      unitsSub: 'kg / lb toggle coming soon',
      themeSub: 'Custom color themes coming soon',
      helpSub: 'FAQ and contact',
      termsSub: 'Usage terms & conditions',
      privacyPolicySub: 'How we handle your data',
      deleteAccountSub: 'Permanently remove account & data',
      proActive: 'Your plan is active',
      upgradeTitle: 'Upgrade to Pro',
      upgradeSub: 'No watermark · Custom themes · Detailed analytics',
      manageSubscription: 'Manage Subscription',
      manageSubscriptionSub: 'Subscription management coming soon',
    },
    analytics: {
      weightLogged: 'Weight logged',
      weightError: 'Could not save weight',
      bodyWeight: 'BODY WEIGHT',
      todayLogged: 'Logged today',
      save: 'Save',
    },
    rewards: {
      trainMore: 'Train more. Unlock more.',
      allUnlocked: 'All rewards unlocked',
      allUnlockedSub: "You've unlocked everything available. More rewards coming soon.",
      sectionTraining: 'Log sessions to unlock analytics features',
      sectionExercise: 'Log 10 sessions per exercise to unlock graph sharing',
      sectionThemes: 'Export Story cards to unlock color themes',
      summaryAllUnlocked: 'All unlocked',
      summaryNext: 'Next:',
      logsPer: '10 logs each',
      locked: 'locked',
      graphAvailable: 'Graph Share available',
      moreLogsToUnlock: 'more logs to unlock',
      more: 'more',
      logWorkout: 'Log Workout',
      logExercise: 'Log',
      createStory: 'Create Story',
      sessionSingular: 'session',
      sessionPlural: 'sessions',
      logs: 'logs',
      exports: 'exports',
    },
    record: {
      buildEffort: "BUILD TODAY'S EFFORT",
      editSession: "EDIT TODAY'S SESSION",
      addExercise: 'Tap + Add Exercise to get started',
      unsavedChanges: 'Unsaved changes',
      saved: 'Saved',
      saving: 'Saving...',
      cancelTitle: 'LEAVE?',
      cancelSub: 'Your entries will not be saved',
      cancelSubEditing: 'Changes will not be saved',
      keepGoing: 'KEEP GOING',
      leave: 'LEAVE',
    },
    privacy: {
      privateOption: 'Private',
      privateSub: 'Only you can see your workouts',
      followersOption: 'Followers Only',
      followersSub: 'Coming after social profiles launch',
      publicOption: 'Public',
      publicSub: 'Public profiles are coming soon',
      visibilityNote: 'Your profile is private by default. Public sharing is planned for a future update.',
      analyticsSub: 'Help improve the app with usage data',
      crashSub: 'Automatically send crash logs',
      dataNote: 'These settings will be functional in a future update.',
    },
    notifications: {
      previewBanner: 'Notifications are shown as a preview. Push support is coming in a future update.',
      workoutRemindersSub: 'Push notification support coming soon',
      weeklySummarySub: 'Your training stats every Monday',
      prAlertsSub: 'When you set a new personal record',
      productUpdatesSub: 'New features and improvements',
      workoutStreakSub: 'Notify when your streak is at risk',
      footerNote: 'These options are shown as a preview only.',
      footerNote2: 'Actual push notifications will be available in a future update.',
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
      accountEditSub: '名前・経歴・トレーニングスタイル',
      privacySub: 'プロフィールの公開設定とデータ',
      notificationsSub: 'Push通知とアプリ内通知',
      unitsSub: 'kg / lb 切り替えは近日対応予定',
      themeSub: 'カスタムカラーテーマは近日公開予定',
      helpSub: 'よくある質問・お問い合わせ',
      termsSub: '利用規約',
      privacyPolicySub: '個人情報の取り扱いについて',
      deleteAccountSub: 'アカウントとデータを完全に削除',
      proActive: 'プランは有効です',
      upgradeTitle: 'Pro にアップグレード',
      upgradeSub: 'ウォーターマーク非表示 · カスタムテーマ · 詳細分析',
      manageSubscription: 'サブスクリプション管理',
      manageSubscriptionSub: 'サブスクリプション管理は近日対応予定',
    },
    analytics: {
      weightLogged: '体重を記録しました',
      weightError: '体重の保存に失敗しました',
      bodyWeight: '体重',
      todayLogged: '今日記録済み',
      save: '保存',
    },
    rewards: {
      trainMore: 'トレーニングを重ねて、さらに解放しよう。',
      allUnlocked: 'すべての報酬を解放しました',
      allUnlockedSub: 'すべての報酬を解放しました。近日さらに追加予定です。',
      sectionTraining: 'セッションを記録して分析機能を解放しよう',
      sectionExercise: '各エクササイズを10回記録してグラフ共有を解放しよう',
      sectionThemes: 'Story カードをエクスポートしてカラーテーマを解放しよう',
      summaryAllUnlocked: 'すべて解放済み',
      summaryNext: '次:',
      logsPer: '各10回',
      locked: '個ロック中',
      graphAvailable: 'グラフ共有が使えます',
      moreLogsToUnlock: '回で解放',
      more: 'あと',
      logWorkout: 'ワークアウトを記録',
      logExercise: 'を記録',
      createStory: 'Story を作成',
      sessionSingular: 'セッション',
      sessionPlural: 'セッション',
      logs: 'ログ',
      exports: 'エクスポート',
    },
    record: {
      buildEffort: '今日のトレーニングを記録しよう',
      editSession: '今日のセッションを編集',
      addExercise: '＋エクササイズを追加して始めよう',
      unsavedChanges: '未保存の変更があります',
      saved: '保存済み',
      saving: '保存中...',
      cancelTitle: '退出しますか？',
      cancelSub: '入力内容は保存されません',
      cancelSubEditing: '変更内容は保存されません',
      keepGoing: '続ける',
      leave: '退出',
    },
    privacy: {
      privateOption: 'プライベート',
      privateSub: 'トレーニングはあなただけに表示されます',
      followersOption: 'フォロワーのみ',
      followersSub: 'ソーシャルプロフィール機能のリリース後に対応予定',
      publicOption: '公開',
      publicSub: '公開プロフィールは近日公開予定',
      visibilityNote: 'プロフィールはデフォルトで非公開です。公開共有は今後のアップデートで予定しています。',
      analyticsSub: '使用データでアプリ改善に協力する',
      crashSub: 'クラッシュログを自動送信する',
      dataNote: 'これらの設定は今後のアップデートで有効になります。',
    },
    notifications: {
      previewBanner: '通知はプレビューとして表示されています。Push通知は今後のアップデートで対応予定です。',
      workoutRemindersSub: 'Push通知は近日対応予定です',
      weeklySummarySub: '毎週月曜日のトレーニング統計',
      prAlertsSub: '自己ベストを更新したとき',
      productUpdatesSub: '新機能とアップデートのお知らせ',
      workoutStreakSub: 'ストリークが途切れそうなときに通知',
      footerNote: 'これらのオプションはプレビューとして表示されています。',
      footerNote2: '実際のPush通知は今後のアップデートで利用可能になります。',
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
