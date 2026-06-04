// Pro feature definitions for REPRA.
// All features are currently free. This file exists to make future Pro gating easy.

// TODO_PRO: When introducing paid plans, change CURRENT_FREE_ACCESS values to false
// and implement canUseFeature() against the user's subscription status.

export const PRO_FEATURES = {
  unlimitedExerciseCardSave: 'unlimitedExerciseCardSave',
  bulkExerciseCardSave:      'bulkExerciseCardSave',
  removeWatermark:           'removeWatermark',
  fullHistoryGraphShare:     'fullHistoryGraphShare',
  longRangeStats:            'longRangeStats',
  proStoryTemplates:         'proStoryTemplates',
  premiumDesignPresets:      'premiumDesignPresets',
  advancedAnalytics:         'advancedAnalytics',
} as const

export type ProFeatureKey = keyof typeof PRO_FEATURES

// Currently all features are free. Flip individual keys to false when gating.
export const CURRENT_FREE_ACCESS: Record<ProFeatureKey, boolean> = {
  unlimitedExerciseCardSave: true,
  bulkExerciseCardSave:      true,
  removeWatermark:           true,
  fullHistoryGraphShare:     true,
  longRangeStats:            true,
  proStoryTemplates:         true,
  premiumDesignPresets:      true,
  advancedAnalytics:         true,
}

export type SubscriptionStatus = 'free' | 'pro' | 'expired' | 'unknown'

export type ProEntitlements = {
  unlimitedExerciseCardSave: boolean
  bulkExerciseCardSave:      boolean
  removeWatermark:           boolean
  fullHistoryGraphShare:     boolean
  longRangeStats:            boolean
  proStoryTemplates:         boolean
  premiumDesignPresets:      boolean
  advancedAnalytics:         boolean
}

// Returns true if the feature is available for the given user.
// Currently always returns true (all features are free).
// TODO_PRO: Replace with subscription-aware logic when Pro launches:
//   return user?.isPro || CURRENT_FREE_ACCESS[featureKey]
export function canUseFeature(
  featureKey: ProFeatureKey,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _user?: { isPro?: boolean } | null,
): boolean {
  // All features are free during the pre-Pro period.
  return true
}

// Human-readable descriptions for each Pro feature (used in UI copy).
export const PRO_FEATURE_LABELS = {
  en: {
    unlimitedExerciseCardSave: 'Unlimited exercise card saving',
    bulkExerciseCardSave:      'Bulk save all exercise cards',
    removeWatermark:           'Remove REPRA watermark',
    fullHistoryGraphShare:     'Full-history graph sharing',
    longRangeStats:            '1-year & all-time stats',
    proStoryTemplates:         'Premium story templates',
    premiumDesignPresets:      'Premium design presets',
    advancedAnalytics:         'Advanced analytics',
  },
  ja: {
    unlimitedExerciseCardSave: '種目別カードを無制限に保存',
    bulkExerciseCardSave:      '全種目カードを一括保存',
    removeWatermark:           '透かし削除',
    fullHistoryGraphShare:     '全期間グラフSharing',
    longRangeStats:            '1年・全期間の統計',
    proStoryTemplates:         'プレミアムStoryテンプレート',
    premiumDesignPresets:      'プレミアムデザインプリセット',
    advancedAnalytics:         '高度な分析機能',
  },
} as const
