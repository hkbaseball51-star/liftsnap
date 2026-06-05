'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, X, Plus, EyeOff, Trash2 } from 'lucide-react'
import { localCreateCustomExercise, localDeleteCustomExercise, localGetCustomExercises } from '@/lib/localDB'
import { useAppData } from '@/contexts/AppDataContext'
import { DEFAULT_EXERCISES } from '@/lib/defaultExercises'
import { useLocale } from '@/lib/useLocale'
import { t } from '@/lib/i18n'
import { JA_TO_EN, getDisplayName } from '@/lib/exerciseNames'

const HIDDEN_KEY = 'liftsnap_hidden_exercises'

function getStoredHidden(): string[] {
  try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]') } catch { return [] }
}
function saveHidden(ids: string[]) {
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(ids))
}

type Exercise = {
  id: string
  name: string
  muscle_group: string
  equipment: string | null
  is_custom: boolean
}

type Props = {
  onSelect: (exercise: Exercise) => void
  onClose: () => void
  initialGroup?: MuscleGroup
  onGroupChange?: (group: MuscleGroup) => void
}

const MUSCLE_GROUPS = ['ALL', 'CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'FOREARMS', 'QUADS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'ABS'] as const
export type MuscleGroup = typeof MUSCLE_GROUPS[number]

// ── Search helpers ────────────────────────────────────────────

function normalizeSearchText(s: string): string {
  return s.toLowerCase().trim().normalize('NFKC')
}

const MUSCLE_GROUP_KEYWORDS: Record<string, string[]> = {
  CHEST:      ['chest', '胸', '胸筋', '大胸筋', 'チェスト', 'pec', 'pecs', 'bench', 'push', 'fly', 'flye'],
  BACK:       ['back', '背中', '背筋', '広背筋', 'バック', 'lats', 'lat', 'traps', 'trap', 'row', 'pull', 'pulling', 'rowing'],
  SHOULDERS:  ['shoulders', 'shoulder', '肩', '三角筋', 'ショルダー', 'delts', 'delt', 'press', 'overhead', 'ohp', 'raise'],
  BICEPS:     ['biceps', 'bicep', '二頭筋', '二頭', '上腕二頭筋', 'arms', 'arm', '腕', '上腕', 'アーム', 'curl', 'カール', 'hammer'],
  TRICEPS:    ['triceps', 'tricep', '三頭筋', '三頭', '上腕三頭筋', 'arms', 'arm', '腕', '上腕', 'アーム', 'extension', 'pushdown', 'push', 'dip', 'skull'],
  FOREARMS:   ['forearms', 'forearm', '前腕', '腕', 'arms', 'arm', 'wrist', 'grip', '手首'],
  QUADS:      ['quads', 'quad', 'quadriceps', '前もも', '大腿四頭筋', 'legs', 'leg', '脚', '足', '下半身', '太もも', 'レッグ', 'squat', 'スクワット', 'lower', 'lower body'],
  HAMSTRINGS: ['hamstrings', 'hamstring', 'もも裏', 'ハムストリング', 'legs', 'leg', '脚', '足', '下半身', '太もも', 'レッグ', 'deadlift', 'デッドリフト', 'lower', 'lower body'],
  GLUTES:     ['glutes', 'glute', 'お尻', '尻', '臀部', '殿筋', '大臀筋', 'legs', 'leg', '脚', '足', '下半身', 'レッグ', 'hip', 'ヒップ', 'butt', 'lower', 'lower body'],
  CALVES:     ['calves', 'calf', 'ふくらはぎ', '下腿', '腓腹筋', 'legs', 'leg', '脚', '足', '下半身', 'レッグ', 'raise', 'lower', 'lower body'],
  ABS:        ['abs', 'ab', 'core', '腹筋', '腹', '体幹', 'コア', 'crunch', 'クランチ', 'plank', 'プランク', 'rollout'],
}

function getMuscleGroupKeywords(group: string): string[] {
  return MUSCLE_GROUP_KEYWORDS[group.toUpperCase()] ?? []
}

// Score 0 = exclude; higher = better match
function scoreExercise(e: Exercise, q: string): number {
  const nameJa = normalizeSearchText(e.name)
  const nameEnRaw = JA_TO_EN[e.name]
  const nameEn = nameEnRaw ? normalizeSearchText(nameEnRaw) : null
  const muscle  = normalizeSearchText(e.muscle_group)

  // ── Exact name match ──────────────────────────────────────
  if (nameJa === q || nameEn === q) return 100

  let score = 0

  // ── Name starts with / includes ───────────────────────────
  if (nameJa.startsWith(q) || nameEn?.startsWith(q))        score = Math.max(score, 90)
  if (nameJa.includes(q))                                    score = Math.max(score, 80)
  if (nameEn?.includes(q))                                   score = Math.max(score, 80)

  // Early return: strong name match beats all category signals
  if (score >= 80) return score

  // ── Muscle group direct ───────────────────────────────────
  if (muscle === q)                                           score = Math.max(score, 70)
  else if (muscle.includes(q) || q.includes(muscle))         score = Math.max(score, 65)

  // ── Keyword matching ──────────────────────────────────────
  for (const kw of getMuscleGroupKeywords(e.muscle_group)) {
    const k = normalizeSearchText(kw)
    if (!k) continue
    if (k === q)                                              { score = Math.max(score, 60); break }
    if (k.startsWith(q) || q.startsWith(k))                  score = Math.max(score, 45)
    else if ((k.length >= 2 && q.includes(k)) ||
             (q.length >= 2 && k.includes(q)))               score = Math.max(score, 30)
  }

  return score
}

// ─────────────────────────────────────────────────────────────

export default function ExercisePicker({ onSelect, onClose, initialGroup, onGroupChange }: Props) {
  const { locale } = useLocale()
  const { exercises: appExercises } = useAppData()

  // Build usage counts from AppDataProvider (exercises[].logCount).
  // Keyed by exact exercise name to match DEFAULT_EXERCISES + custom exercise names.
  const usageCounts = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    for (const ex of appExercises) {
      if (ex.logCount > 0) map[ex.name] = ex.logCount
    }
    return map
  }, [appExercises])

  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [hiddenIds, setHiddenIds] = useState<string[]>([])

  const [query, setQuery] = useState('')
  const [activeGroup, setActiveGroup] = useState<MuscleGroup>(initialGroup ?? 'ALL')

  const handleGroupChange = useCallback((g: MuscleGroup) => {
    setActiveGroup(g)
    onGroupChange?.(g)
  }, [onGroupChange])
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGroup, setNewGroup] = useState<MuscleGroup>('CHEST')

  const groupLabel = (g: MuscleGroup) => t(locale, `record.category.${g.toLowerCase()}`)
  const [creating, setCreating] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [showHiddenModal, setShowHiddenModal] = useState(false)
  const [confirmHideId, setConfirmHideId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }, [])

  useEffect(() => {
    const customs = localGetCustomExercises()
    setExercises([...DEFAULT_EXERCISES, ...customs])
    setLoading(false)
    setHiddenIds(getStoredHidden())
  }, [])

  const hideExercise = (id: string) => {
    const updated = [...hiddenIds, id]
    setHiddenIds(updated)
    saveHidden(updated)
  }

  const restoreExercise = (id: string) => {
    const updated = hiddenIds.filter(h => h !== id)
    setHiddenIds(updated)
    saveHidden(updated)
  }

  const handleDelete = (id: string) => {
    localDeleteCustomExercise(id)
    setExercises(prev => prev.filter(e => e.id !== id))
    setConfirmDeleteId(null)
  }

  const handleCreate = () => {
    if (!newName.trim()) return
    const created = localCreateCustomExercise(newName.trim(), newGroup)
    setExercises(prev => [...prev, created])
    onSelect(created)
  }

  const normalizedQuery = useMemo(() => normalizeSearchText(query), [query])

  const filtered = useMemo(() => {
    const base = exercises.filter(e => {
      if (hiddenIds.includes(e.id)) return false
      if (activeGroup !== 'ALL' && e.muscle_group.toUpperCase() !== activeGroup) return false
      return true
    })
    if (!normalizedQuery) {
      // Sort by usage count desc; stable sort keeps original order for tied/zero counts
      return [...base].sort((a, b) =>
        (usageCounts[b.name] ?? 0) - (usageCounts[a.name] ?? 0)
      )
    }
    return base
      .map(e => ({ e, score: scoreExercise(e, normalizedQuery) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) =>
        b.score !== a.score
          ? b.score - a.score
          : (usageCounts[b.e.name] ?? 0) - (usageCounts[a.e.name] ?? 0)
      )
      .map(({ e }) => e)
  }, [exercises, hiddenIds, usageCounts, normalizedQuery, activeGroup])

  const hiddenExercises = useMemo(() => {
    return exercises.filter(e => hiddenIds.includes(e.id))
  }, [exercises, hiddenIds])

  const renderRow = (e: Exercise, keyPrefix = '') => (
    <div key={keyPrefix + e.id}
      className="flex items-center py-3.5"
      style={{ borderBottom: '1px solid #111' }}>
      <button
        className="flex-1 min-w-0 text-left active:opacity-70 transition-opacity pr-2"
        onClick={() => onSelect(e)}>
        <p className="text-sm font-black text-white line-clamp-2" style={{ lineHeight: 1.35 }}>{getDisplayName(e.name, locale)}</p>
        <p className="text-[10px] font-bold mt-0.5 tracking-wider" style={{ color: '#555' }}>
          {e.muscle_group}
          {e.is_custom ? ' · CUSTOM' : ''}
          {usageCounts[e.name] ? ` · ${usageCounts[e.name]}×` : ''}
        </p>
      </button>
      <div className="flex items-center gap-2 shrink-0">
        {e.is_custom ? (
          <button
            className="w-8 h-8 flex items-center justify-center active:opacity-60"
            onClick={() => setConfirmDeleteId(e.id)}>
            <Trash2 size={14} style={{ color: '#333' }} />
          </button>
        ) : (
          <button
            className="w-8 h-8 flex items-center justify-center active:opacity-60"
            onClick={() => setConfirmHideId(e.id)}>
            <EyeOff size={14} style={{ color: '#333' }} />
          </button>
        )}
        <button
          className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'rgba(237, 116, 47,0.1)', border: '1px solid rgba(237, 116, 47,0.2)' }}
          onClick={() => onSelect(e)}>
          <Plus size={14} style={{ color: '#ED742F' }} />
        </button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-3">
        <button onClick={onClose}><X size={22} style={{ color: '#555' }} /></button>
        <span className="text-base font-black text-white tracking-widest">{t(locale, 'record.selectExercise')}</span>
      </div>

      {/* Search */}
      <div className="px-4 mb-3">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: '#171717', border: '1px solid #1e1e1e' }}>
          <Search size={16} style={{ color: '#444' }} />
          <input
            type="text"
            placeholder={t(locale, 'record.searchExercises')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')}>
              <X size={14} style={{ color: '#444' }} />
            </button>
          )}
        </div>
      </div>

      {/* Muscle group filter */}
      <div className="flex gap-2.5 px-4 pb-2 pt-1 overflow-x-auto no-scrollbar">
        {MUSCLE_GROUPS.map(g => (
          <button key={g}
            className="shrink-0 px-4 rounded-full text-sm font-bold flex items-center active:opacity-70 transition-opacity"
            style={{
              minHeight: 44,
              background: activeGroup === g ? '#ED742F' : '#1c1c1c',
              color: activeGroup === g ? '#fff' : 'rgba(255,255,255,0.62)',
              border: activeGroup === g ? 'none' : '1px solid rgba(255,255,255,0.10)',
              boxShadow: activeGroup === g ? '0 2px 8px rgba(237,116,47,0.22)' : 'none',
            }}
            onClick={() => handleGroupChange(g)}>
            {groupLabel(g)}
          </button>
        ))}
      </div>

      {/* Supplement text (ja only) + Hidden button */}
      <div className="px-4 pb-3 flex items-center justify-between" style={{ minHeight: 28 }}>
        {locale === 'ja' ? (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.68)', flex: 1, marginRight: 8 }}>
            {activeGroup === 'ALL'
              ? t(locale, 'record.filterByBodyPart')
              : t(locale, `record.categoryDescription.${activeGroup.toLowerCase()}`)}
          </p>
        ) : (
          <div className="flex-1" />
        )}
        <button
          className="active:opacity-70 shrink-0"
          style={{ fontSize: 12, fontWeight: 700, color: '#ED742F' }}
          onClick={() => setShowHiddenModal(true)}>
          {t(locale, 'record.hiddenBtn')}
        </button>
      </div>

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto px-4">
        {loading ? (
          <div className="py-12 text-center">
            <p className="text-sm font-bold" style={{ color: '#444' }}>Loading...</p>
          </div>
        ) : (
          <>
            {filtered.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-bold" style={{ color: '#444' }}>
                  {t(locale, 'record.noExercisesFound')}
                </p>
              </div>
            ) : (
              filtered.map(e => renderRow(e))
            )}

            {/* Add Custom Exercise */}
            {!showCreate ? (
              <button
                className="w-full py-4 flex items-center gap-3 active:opacity-70"
                onClick={() => setShowCreate(true)}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: '#171717', border: '1px solid #1e1e1e' }}>
                  <Plus size={14} style={{ color: '#ED742F' }} />
                </div>
                <span className="text-sm font-black tracking-wide" style={{ color: '#ED742F' }}>
                  {t(locale, 'record.addCustomExerciseBtn')}
                </span>
              </button>
            ) : (
              <div className="py-4 space-y-3">
                <p className="text-[10px] font-black tracking-widest" style={{ color: '#444' }}>CUSTOM EXERCISE</p>
                <input
                  type="text"
                  placeholder="Exercise name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl text-sm text-white outline-none"
                  style={{ background: '#171717', border: '1px solid #1e1e1e' }}
                  autoFocus
                />
                <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                  {MUSCLE_GROUPS.slice(1).map(g => (
                    <button key={g}
                      className="shrink-0 px-4 rounded-full text-sm font-bold flex items-center active:opacity-70 transition-opacity"
                      style={{
                        minHeight: 44,
                        background: newGroup === g ? '#ED742F' : '#1c1c1c',
                        color: newGroup === g ? '#fff' : 'rgba(255,255,255,0.62)',
                        border: newGroup === g ? 'none' : '1px solid rgba(255,255,255,0.10)',
                        boxShadow: newGroup === g ? '0 2px 8px rgba(237,116,47,0.22)' : 'none',
                      }}
                      onClick={() => setNewGroup(g)}>
                      {groupLabel(g)}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 py-3 rounded-xl text-sm font-black"
                    style={{ background: '#171717', color: '#555', border: '1px solid #1e1e1e' }}
                    onClick={() => setShowCreate(false)}>
                    CANCEL
                  </button>
                  <button className="flex-1 py-3 rounded-xl text-sm font-black text-white"
                    style={{ background: creating || !newName.trim() ? '#222' : '#ED742F' }}
                    disabled={creating || !newName.trim()}
                    onClick={handleCreate}>
                    {creating ? 'SAVING...' : 'ADD'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ height: 40 }} />
          </>
        )}
      </div>

      {/* Hidden exercises modal */}
      {showHiddenModal && (
        <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: '#0a0a0a' }}>
          <div className="flex items-center gap-3 px-4 pt-14 pb-3">
            <button onClick={() => setShowHiddenModal(false)}>
              <X size={22} style={{ color: '#555' }} />
            </button>
            <span className="text-base font-black text-white tracking-widest">
              {t(locale, 'record.hiddenTitle').toUpperCase()}
            </span>
          </div>
          <div className="px-4 pb-4">
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.56)' }}>
              {t(locale, 'record.hiddenDesc')}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-4">
            {hiddenExercises.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-bold" style={{ color: '#444' }}>
                  {t(locale, 'record.hiddenEmpty')}
                </p>
              </div>
            ) : (
              hiddenExercises.map(e => (
                <div key={'hidden-' + e.id}
                  className="flex items-center py-3.5"
                  style={{ borderBottom: '1px solid #111' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black truncate text-white">{getDisplayName(e.name, locale)}</p>
                    <p className="text-[10px] font-bold mt-0.5 tracking-wider" style={{ color: '#555' }}>
                      {e.muscle_group}
                    </p>
                  </div>
                  <button
                    className="px-3 py-1.5 rounded-full active:opacity-60 shrink-0"
                    style={{ background: 'rgba(237, 116, 47,0.1)', border: '1px solid rgba(237, 116, 47,0.2)' }}
                    onClick={() => {
                      restoreExercise(e.id)
                      showToast(t(locale, 'record.hiddenRestoredToast'))
                    }}>
                    <span className="text-[11px] font-black" style={{ color: '#ED742F' }}>
                      {t(locale, 'record.hiddenRestore')}
                    </span>
                  </button>
                </div>
              ))
            )}
            <div style={{ height: 40 }} />
          </div>
        </div>
      )}

      {/* Hide confirmation */}
      {confirmHideId && (
        <div
          className="fixed inset-0 z-[70] flex items-end"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setConfirmHideId(null)}>
          <div
            className="w-full p-5 rounded-t-3xl"
            style={{ background: '#171717' }}
            onClick={e => e.stopPropagation()}>
            <p className="text-base font-black text-white text-center mb-1">
              {t(locale, 'record.hideConfirmTitle')}
            </p>
            <p className="text-sm text-center mb-6" style={{ color: '#555' }}>
              {t(locale, 'record.hideConfirmBody')}
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 py-4 rounded-2xl text-sm font-black"
                style={{ background: '#222222', color: '#666' }}
                onClick={() => setConfirmHideId(null)}>
                {t(locale, 'record.hideConfirmCancel')}
              </button>
              <button
                className="flex-1 py-4 rounded-2xl text-sm font-black text-white"
                style={{ background: '#333' }}
                onClick={() => {
                  hideExercise(confirmHideId)
                  setConfirmHideId(null)
                }}>
                {t(locale, 'record.hideConfirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-[60] flex items-end"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setConfirmDeleteId(null)}>
          <div
            className="w-full p-5 rounded-t-3xl"
            style={{ background: '#171717' }}
            onClick={e => e.stopPropagation()}>
            <p className="text-base font-black text-white text-center mb-1">Delete Exercise?</p>
            <p className="text-sm text-center mb-6" style={{ color: '#555' }}>
              Removed from your list. Past workout data is kept.
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 py-4 rounded-2xl text-sm font-black"
                style={{ background: '#222222', color: '#666' }}
                onClick={() => setConfirmDeleteId(null)}>
                CANCEL
              </button>
              <button
                className="flex-1 py-4 rounded-2xl text-sm font-black text-white"
                style={{ background: deleting ? '#333' : '#dc2626' }}
                disabled={deleting}
                onClick={() => handleDelete(confirmDeleteId)}>
                {deleting ? 'DELETING...' : 'DELETE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed left-4 right-4 z-[80] px-4 py-3 rounded-2xl text-center"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 24px)', background: '#222222', border: '1px solid #2a2a2a' }}>
          <p className="text-sm font-bold text-white">{toast}</p>
        </div>
      )}
    </div>
  )
}
