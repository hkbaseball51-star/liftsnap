'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Check } from 'lucide-react'
import { completeOnboarding } from '@/actions/onboarding'
import { parseFlexibleNumber } from '@/lib/number'
import { useLocale } from '@/lib/useLocale'
import { t, type Locale } from '@/lib/i18n'

type WeightUnit = 'kg' | 'lbs'
type Goal = 'muscle_gain' | 'fat_loss' | 'strength' | 'endurance' | 'general'
type Experience = 'beginner' | 'intermediate' | 'advanced'
type AcquisitionSource =
  | 'tiktok' | 'instagram' | 'youtube' | 'app_store' | 'google_search'
  | 'friend_or_family' | 'chatgpt_ai_search' | 'influencer' | 'other'

type StepId =
  | 'units' | 'goal' | 'experience' | 'frequency' | 'bodyweight'
  | 'profile' | 'email_opt_in' | 'acquisition_source' | 'complete'

const STEPS: StepId[] = [
  'units', 'goal', 'experience', 'frequency', 'bodyweight',
  'profile', 'email_opt_in', 'acquisition_source', 'complete',
]

const DATA_STEPS = STEPS.length - 1 // 8 data collection steps

const GOALS: { value: Goal; label: string; sub: string }[] = [
  { value: 'muscle_gain', label: 'Muscle Gain', sub: 'Build size & mass' },
  { value: 'fat_loss', label: 'Fat Loss', sub: 'Cut & get lean' },
  { value: 'strength', label: 'Strength', sub: 'Lift heavier' },
  { value: 'endurance', label: 'Endurance', sub: 'Go longer & harder' },
  { value: 'general', label: 'General Fitness', sub: 'Stay healthy & active' },
]

const EXPERIENCES: { value: Experience; label: string; sub: string }[] = [
  { value: 'beginner', label: 'Beginner', sub: 'Less than 1 year' },
  { value: 'intermediate', label: 'Intermediate', sub: '1 – 3 years' },
  { value: 'advanced', label: 'Advanced', sub: '3+ years' },
]

const FREQUENCIES = [
  { value: 2, label: '1–2×', sub: 'per week' },
  { value: 3, label: '3×', sub: 'per week' },
  { value: 4, label: '4×', sub: 'per week' },
  { value: 5, label: '5×+', sub: 'per week' },
]

const ACQUISITION_SOURCES: { value: AcquisitionSource; label: string }[] = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'app_store', label: 'App Store' },
  { value: 'google_search', label: 'Google Search' },
  { value: 'friend_or_family', label: 'Friend or Family' },
  { value: 'chatgpt_ai_search', label: 'ChatGPT / AI Search' },
  { value: 'influencer', label: 'Influencer' },
  { value: 'other', label: 'Other' },
]

export default function OnboardingFlow({ initialDisplayName }: { initialDisplayName: string }) {
  const router = useRouter()
  const { locale } = useLocale()
  const [stepIndex, setStepIndex] = useState(0)
  const [saving, setSaving] = useState(false)

  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg')
  const [goal, setGoal] = useState<Goal | null>(null)
  const [experience, setExperience] = useState<Experience | null>(null)
  const [frequency, setFrequency] = useState<number | null>(null)
  const [bwInput, setBwInput] = useState('')
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [emailOptIn, setEmailOptIn] = useState<boolean | null>(null)
  const [acquisitionSource, setAcquisitionSource] = useState<AcquisitionSource | null>(null)

  const currentStep = STEPS[stepIndex]
  const goNext = () => setStepIndex(i => Math.min(i + 1, STEPS.length - 1))
  const goBack = () => setStepIndex(i => Math.max(i - 1, 0))

  const bwParsed = bwInput !== '' ? parseFlexibleNumber(bwInput) : null
  const bwValid = bwParsed !== null && bwParsed >= 20 && bwParsed <= 300

  const canProceed = (() => {
    if (currentStep === 'units') return true
    if (currentStep === 'goal') return goal !== null
    if (currentStep === 'experience') return experience !== null
    if (currentStep === 'frequency') return frequency !== null
    if (currentStep === 'bodyweight') return bwInput === '' || bwValid
    if (currentStep === 'profile') return true
    if (currentStep === 'acquisition_source') return true
    return false
  })()

  const buttonLabel = (() => {
    if (currentStep === 'bodyweight' && bwInput === '') return t(locale, 'onboarding.skipBtn')
    if (currentStep === 'acquisition_source' && acquisitionSource === null) return t(locale, 'onboarding.skipBtn')
    return t(locale, 'onboarding.continueBtn')
  })()

  const handleEmailOptIn = (value: boolean) => {
    setEmailOptIn(value)
    goNext()
  }

  const handleComplete = async () => {
    if (saving) return
    setSaving(true)
    try {
      await completeOnboarding({
        weightUnit,
        goal: goal!,
        experience: experience!,
        workoutFrequency: frequency!,
        bodyWeight: bwValid ? bwParsed : null,
        displayName: displayName.trim(),
        emailOptIn: emailOptIn ?? false,
        acquisitionSource: acquisitionSource,
      })
      router.replace('/home')
    } catch {
      setSaving(false)
    }
  }

  if (currentStep === 'complete') {
    return (
      <CompleteStep
        locale={locale}
        displayName={displayName.trim()}
        saving={saving}
        onStart={handleComplete}
      />
    )
  }

  const progressPct = (stepIndex / DATA_STEPS) * 100

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080808' }}>
      {/* Progress bar */}
      <div style={{ height: 2, background: '#111', position: 'relative' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%',
          width: `${progressPct}%`,
          background: '#BF5C24',
          transition: 'width 300ms ease',
        }} />
      </div>

      {/* Header */}
      <div className="flex items-center px-5 pt-12 pb-4">
        {stepIndex > 0 ? (
          <button onClick={goBack} style={{ color: 'rgba(255,255,255,0.4)', padding: '4px 0' }}>
            <ChevronLeft size={22} />
          </button>
        ) : (
          <div style={{ width: 22 }} />
        )}
        <div className="flex-1 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/repra-wordmark-header.png" alt="REPRA" style={{ height: 20, width: 'auto', objectFit: 'contain', opacity: 0.45 }} />
        </div>
        <div style={{ width: 22 }} />
      </div>

      {/* Step content */}
      <div className="flex-1 px-6 pt-6 pb-10 flex flex-col">
        {currentStep === 'units' && <UnitsStep locale={locale} weightUnit={weightUnit} setWeightUnit={setWeightUnit} />}
        {currentStep === 'goal' && <GoalStep locale={locale} goal={goal} setGoal={setGoal} />}
        {currentStep === 'experience' && <ExperienceStep locale={locale} experience={experience} setExperience={setExperience} />}
        {currentStep === 'frequency' && <FrequencyStep locale={locale} frequency={frequency} setFrequency={setFrequency} />}
        {currentStep === 'bodyweight' && <BodyWeightStep locale={locale} bwInput={bwInput} setBwInput={setBwInput} bwValid={bwValid} />}
        {currentStep === 'profile' && <ProfileStep locale={locale} displayName={displayName} setDisplayName={setDisplayName} />}
        {currentStep === 'email_opt_in' && <EmailOptInStep locale={locale} onSelect={handleEmailOptIn} />}
        {currentStep === 'acquisition_source' && (
          <AcquisitionSourceStep locale={locale} source={acquisitionSource} setSource={setAcquisitionSource} />
        )}

        <div style={{ flex: 1 }} />

        {/* email_opt_in uses its own inline action buttons — no Continue shown */}
        {currentStep !== 'email_opt_in' && (
          <button
            disabled={!canProceed}
            onClick={goNext}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 16,
              background: canProceed ? '#BF5C24' : '#1a1a1a',
              color: canProceed ? '#fff' : 'rgba(255,255,255,0.2)',
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: '0.08em',
              border: 'none',
              transition: 'background 150ms, color 150ms',
              boxShadow: canProceed ? '0 4px 20px rgba(255,107,0,0.3)' : 'none',
            }}>
            {buttonLabel}
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Shared primitives ── */

function StepHeader({ label, title, sub }: { label: string; title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#BF5C24', marginBottom: 10 }}>
        {label}
      </p>
      <p style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: sub ? 8 : 0 }}>
        {title}
      </p>
      {sub && (
        <p style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.38)' }}>
          {sub}
        </p>
      )}
    </div>
  )
}

function OptionButton<T>({
  value, selected, label, sub, onSelect,
}: {
  value: T; selected: boolean; label: string; sub?: string; onSelect: (v: T) => void
}) {
  return (
    <button
      onClick={() => onSelect(value)}
      style={{
        width: '100%',
        padding: '14px 16px',
        borderRadius: 14,
        background: selected ? 'rgba(255,107,0,0.12)' : '#111',
        border: `1px solid ${selected ? '#BF5C24' : 'rgba(255,255,255,0.07)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        transition: 'background 150ms, border-color 150ms',
      }}>
      <div style={{ textAlign: 'left' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: selected ? '#fff' : 'rgba(255,255,255,0.7)' }}>
          {label}
        </p>
        {sub && (
          <p style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.32)', marginTop: 2 }}>
            {sub}
          </p>
        )}
      </div>
      {selected && (
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          background: '#BF5C24',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Check size={13} color="#fff" strokeWidth={3} />
        </div>
      )}
    </button>
  )
}

/* ── Step components ── */

function UnitsStep({ locale, weightUnit, setWeightUnit }: { locale: Locale; weightUnit: WeightUnit; setWeightUnit: (v: WeightUnit) => void }) {
  return (
    <>
      <StepHeader label="STEP 1 OF 8" title={t(locale, 'onboarding.units.title')} />
      <div style={{ display: 'flex', gap: 10 }}>
        {(['kg', 'lbs'] as WeightUnit[]).map(u => (
          <button
            key={u}
            onClick={() => setWeightUnit(u)}
            style={{
              flex: 1, padding: '22px 0', borderRadius: 16,
              background: weightUnit === u ? 'rgba(255,107,0,0.12)' : '#111',
              border: `1px solid ${weightUnit === u ? '#BF5C24' : 'rgba(255,255,255,0.07)'}`,
              transition: 'background 150ms, border-color 150ms',
            }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: weightUnit === u ? '#fff' : 'rgba(255,255,255,0.4)' }}>
              {u}
            </p>
            <p style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
              {u === 'kg' ? 'Kilograms' : 'Pounds'}
            </p>
          </button>
        ))}
      </div>
    </>
  )
}

function GoalStep({ locale, goal, setGoal }: { locale: Locale; goal: Goal | null; setGoal: (v: Goal) => void }) {
  const goals: { value: Goal; label: string; sub: string }[] = [
    { value: 'muscle_gain', label: t(locale, 'onboarding.goal.muscle_gain'),   sub: t(locale, 'onboarding.goal.muscle_gainSub') },
    { value: 'fat_loss',    label: t(locale, 'onboarding.goal.fat_loss'),      sub: t(locale, 'onboarding.goal.fat_lossSub') },
    { value: 'strength',    label: t(locale, 'onboarding.goal.strength'),      sub: t(locale, 'onboarding.goal.strengthSub') },
    { value: 'endurance',   label: t(locale, 'onboarding.goal.endurance'),     sub: t(locale, 'onboarding.goal.enduranceSub') },
    { value: 'general',     label: t(locale, 'onboarding.goal.general'),       sub: t(locale, 'onboarding.goal.generalSub') },
  ]
  return (
    <>
      <StepHeader label="STEP 2 OF 8" title={t(locale, 'onboarding.goal.title')} sub={t(locale, 'onboarding.goal.sub')} />
      {goals.map(g => (
        <OptionButton key={g.value} value={g.value} selected={goal === g.value} label={g.label} sub={g.sub} onSelect={setGoal} />
      ))}
    </>
  )
}

function ExperienceStep({ locale, experience, setExperience }: { locale: Locale; experience: Experience | null; setExperience: (v: Experience) => void }) {
  const experiences: { value: Experience; label: string; sub: string }[] = [
    { value: 'beginner',     label: t(locale, 'onboarding.experience.beginner'),     sub: t(locale, 'onboarding.experience.beginnerSub') },
    { value: 'intermediate', label: t(locale, 'onboarding.experience.intermediate'), sub: t(locale, 'onboarding.experience.intermediateSub') },
    { value: 'advanced',     label: t(locale, 'onboarding.experience.advanced'),     sub: t(locale, 'onboarding.experience.advancedSub') },
  ]
  return (
    <>
      <StepHeader label="STEP 3 OF 8" title={t(locale, 'onboarding.experience.title')} />
      {experiences.map(e => (
        <OptionButton key={e.value} value={e.value} selected={experience === e.value} label={e.label} sub={e.sub} onSelect={setExperience} />
      ))}
    </>
  )
}

function FrequencyStep({ locale, frequency, setFrequency }: { locale: Locale; frequency: number | null; setFrequency: (v: number) => void }) {
  const perWeek = t(locale, 'onboarding.frequency.perWeek')
  return (
    <>
      <StepHeader label="STEP 4 OF 8" title={t(locale, 'onboarding.frequency.title')} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {FREQUENCIES.map(f => (
          <button
            key={f.value}
            onClick={() => setFrequency(f.value)}
            style={{
              padding: '20px 0',
              borderRadius: 14,
              background: frequency === f.value ? 'rgba(255,107,0,0.12)' : '#111',
              border: `1px solid ${frequency === f.value ? '#BF5C24' : 'rgba(255,255,255,0.07)'}`,
              transition: 'background 150ms, border-color 150ms',
            }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: frequency === f.value ? '#fff' : 'rgba(255,255,255,0.5)' }}>
              {f.label}
            </p>
            <p style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
              {perWeek}
            </p>
          </button>
        ))}
      </div>
    </>
  )
}

function BodyWeightStep({ locale, bwInput, setBwInput, bwValid }: { locale: Locale; bwInput: string; setBwInput: (v: string) => void; bwValid: boolean }) {
  return (
    <>
      <StepHeader label="STEP 5 OF 8" title={t(locale, 'onboarding.bodyweight.title')} sub={t(locale, 'onboarding.bodyweight.sub')} />
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <input
          type="text"
          inputMode="decimal"
          value={bwInput}
          onChange={e => setBwInput(e.target.value)}
          placeholder="e.g. 75"
          style={{
            width: '100%',
            background: '#111',
            border: `1px solid ${bwInput !== '' && !bwValid ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 14,
            padding: '18px 52px 18px 18px',
            fontSize: 28,
            fontWeight: 800,
            color: '#fff',
            outline: 'none',
            caretColor: '#BF5C24',
          }}
        />
        <span style={{
          position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)',
          fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.3)',
        }}>
          kg
        </span>
      </div>
      {bwInput !== '' && !bwValid && (
        <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{t(locale, 'onboarding.bodyweight.error')}</p>
      )}
    </>
  )
}

function ProfileStep({ locale, displayName, setDisplayName }: { locale: Locale; displayName: string; setDisplayName: (v: string) => void }) {
  return (
    <>
      <StepHeader label="STEP 6 OF 8" title={t(locale, 'onboarding.profile.title')} sub={t(locale, 'onboarding.profile.sub')} />
      <input
        type="text"
        value={displayName}
        onChange={e => setDisplayName(e.target.value)}
        placeholder={t(locale, 'onboarding.profile.placeholder')}
        maxLength={40}
        style={{
          width: '100%',
          background: '#111',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 14,
          padding: '18px',
          fontSize: 20,
          fontWeight: 700,
          color: '#fff',
          outline: 'none',
          caretColor: '#BF5C24',
        }}
      />
    </>
  )
}

function EmailOptInStep({ locale, onSelect }: { locale: Locale; onSelect: (value: boolean) => void }) {
  const bullets = [
    t(locale, 'onboarding.emailOptIn.bullet1'),
    t(locale, 'onboarding.emailOptIn.bullet2'),
    t(locale, 'onboarding.emailOptIn.bullet3'),
    t(locale, 'onboarding.emailOptIn.bullet4'),
  ]

  return (
    <>
      <StepHeader
        label="STEP 7 OF 8"
        title={t(locale, 'onboarding.emailOptIn.title')}
        sub={t(locale, 'onboarding.emailOptIn.sub')}
      />

      <div style={{
        background: '#111',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 14,
        padding: '16px 18px',
        marginBottom: 28,
      }}>
        {bullets.map(b => (
          <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              background: 'rgba(255,107,0,0.15)',
              border: '1px solid rgba(255,107,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Check size={10} color="#BF5C24" strokeWidth={3} />
            </div>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.65)' }}>{b}</p>
          </div>
        ))}
      </div>

      <button
        onClick={() => onSelect(true)}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: 16,
          background: '#BF5C24',
          color: '#fff',
          fontSize: 15,
          fontWeight: 800,
          letterSpacing: '0.06em',
          border: 'none',
          marginBottom: 10,
          boxShadow: '0 4px 20px rgba(255,107,0,0.3)',
        }}>
        {t(locale, 'onboarding.emailOptIn.sure')}
      </button>

      <button
        onClick={() => onSelect(false)}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: 16,
          background: 'transparent',
          color: 'rgba(255,255,255,0.3)',
          fontSize: 14,
          fontWeight: 500,
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
        {t(locale, 'onboarding.emailOptIn.noThanks')}
      </button>
    </>
  )
}

function AcquisitionSourceStep({
  locale, source, setSource,
}: {
  locale: Locale
  source: AcquisitionSource | null
  setSource: (v: AcquisitionSource) => void
}) {
  return (
    <>
      <StepHeader label="STEP 8 OF 8" title={t(locale, 'onboarding.acquisitionSource.title')} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {ACQUISITION_SOURCES.map(s => (
          <button
            key={s.value}
            onClick={() => setSource(s.value)}
            style={{
              padding: '14px 10px',
              borderRadius: 13,
              background: source === s.value ? 'rgba(255,107,0,0.12)' : '#111',
              border: `1px solid ${source === s.value ? '#BF5C24' : 'rgba(255,255,255,0.07)'}`,
              transition: 'background 150ms, border-color 150ms',
              position: 'relative',
            }}>
            <p style={{
              fontSize: 13, fontWeight: 700,
              color: source === s.value ? '#fff' : 'rgba(255,255,255,0.6)',
            }}>
              {s.label}
            </p>
            {source === s.value && (
              <div style={{
                position: 'absolute', top: 6, right: 6,
                width: 14, height: 14, borderRadius: '50%',
                background: '#BF5C24',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Check size={9} color="#fff" strokeWidth={3} />
              </div>
            )}
          </button>
        ))}
      </div>
    </>
  )
}

function CompleteStep({
  locale, displayName, saving, onStart,
}: {
  locale: Locale; displayName: string; saving: boolean; onStart: () => void
}) {
  const titleKey = displayName ? 'onboarding.complete.titleWithName' : 'onboarding.complete.titleNoName'
  const titleRaw = t(locale, titleKey)
  const title = titleRaw.replace('{name}', displayName)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#050505' }}>
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(255,107,0,0.15)',
          border: '1px solid rgba(255,107,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
        }}>
          <Check size={32} color="#BF5C24" strokeWidth={2.5} />
        </div>

        <p style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 10 }}>
          {title}
        </p>
        <p style={{ fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,0.38)', marginBottom: 48 }}>
          {t(locale, 'onboarding.complete.sub')}
        </p>

        <button
          onClick={onStart}
          disabled={saving}
          style={{
            width: '100%',
            padding: '18px',
            borderRadius: 16,
            background: saving ? '#1a1a1a' : '#BF5C24',
            color: saving ? 'rgba(255,255,255,0.3)' : '#fff',
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: '0.08em',
            border: 'none',
            boxShadow: saving ? 'none' : '0 4px 24px rgba(255,107,0,0.35)',
            transition: 'background 150ms',
          }}>
          {saving ? t(locale, 'onboarding.complete.saving') : t(locale, 'onboarding.complete.cta')}
        </button>
      </div>
    </div>
  )
}
