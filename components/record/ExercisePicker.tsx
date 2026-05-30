'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, X, Plus, EyeOff, Trash2 } from 'lucide-react'
import { createCustomExercise, getExerciseUsageCounts, deleteCustomExercise } from '@/actions/workout'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from '@/lib/useLocale'
import { t } from '@/lib/i18n'

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
}

const MUSCLE_GROUPS = ['ALL', 'CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'FOREARMS', 'QUADS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'ABS'] as const
type MuscleGroup = typeof MUSCLE_GROUPS[number]

// ── Search helpers ────────────────────────────────────────────

function normalizeSearchText(s: string): string {
  return s.toLowerCase().trim().normalize('NFKC')
}

const MUSCLE_GROUP_KEYWORDS: Record<string, string[]> = {
  CHEST: ['chest', '胸', '胸筋', '大胸筋', 'チェスト', 'pec', 'pecs', 'bench'],
  BACK: ['back', '背中', '背筋', '広背筋', 'バック', 'lats', 'lat', 'traps', 'trap', 'row', 'pull'],
  SHOULDERS: ['shoulders', 'shoulder', '肩', '三角筋', 'ショルダー', 'delts', 'delt', 'press', 'overhead'],
  BICEPS: ['biceps', 'bicep', '二頭筋', '二頭', '上腕二頭筋', 'arms', 'arm', '腕', '上腕', 'アーム', 'curl', 'カール'],
  TRICEPS: ['triceps', 'tricep', '三頭筋', '三頭', '上腕三頭筋', 'arms', 'arm', '腕', '上腕', 'アーム', 'extension'],
  FOREARMS: ['forearms', 'forearm', '前腕', '腕', 'arms', 'arm', 'wrist', 'grip', '手首'],
  QUADS: ['quads', 'quad', 'quadriceps', '前もも', '大腿四頭筋', 'legs', 'leg', '脚', '足', '下半身', '太もも', 'レッグ', 'squat', 'スクワット'],
  HAMSTRINGS: ['hamstrings', 'hamstring', 'もも裏', 'ハムストリング', 'legs', 'leg', '脚', '足', '下半身', '太もも', 'レッグ', 'deadlift', 'デッドリフト'],
  GLUTES: ['glutes', 'glute', 'お尻', '尻', '臀部', '殿筋', '大臀筋', 'legs', 'leg', '脚', '足', '下半身', 'レッグ', 'hip', 'ヒップ'],
  CALVES: ['calves', 'calf', 'ふくらはぎ', '下腿', '腓腹筋', 'legs', 'leg', '脚', '足', '下半身', 'レッグ', 'raise'],
  ABS: ['abs', 'ab', 'core', '腹筋', '腹', '体幹', 'コア', 'crunch', 'クランチ', 'plank', 'プランク'],
}

function getMuscleGroupKeywords(group: string): string[] {
  return MUSCLE_GROUP_KEYWORDS[group.toUpperCase()] ?? []
}

function getExerciseSearchTexts(e: Exercise): string[] {
  const base = [e.name, e.muscle_group, ...getMuscleGroupKeywords(e.muscle_group)]
  return base.map(normalizeSearchText).filter(s => s.length > 0)
}

function exerciseMatchesQuery(e: Exercise, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true
  const searchTexts = getExerciseSearchTexts(e)
  return searchTexts.some(text =>
    text.includes(normalizedQuery) ||
    (text.length >= 2 && normalizedQuery.includes(text))
  )
}

// ─────────────────────────────────────────────────────────────

export default function ExercisePicker({ onSelect, onClose }: Props) {
  const { locale } = useLocale()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({})
  const [hiddenIds, setHiddenIds] = useState<string[]>([])

  const [query, setQuery] = useState('')
  const [activeGroup, setActiveGroup] = useState<MuscleGroup>('ALL')
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
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      supabase
        .from('exercises')
        .select('id, name, muscle_group, equipment, is_custom')
        .or(user ? `user_id.is.null,user_id.eq.${user.id}` : 'user_id.is.null')
        .order('name')
        .then(({ data }) => {
          setExercises(data ?? [])
          setLoading(false)
        })
    })
    getExerciseUsageCounts().then(setUsageCounts)
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

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      await deleteCustomExercise(id)
      setExercises(prev => prev.filter(e => e.id !== id))
      setConfirmDeleteId(null)
    } finally {
      setDeleting(false)
    }
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const created = await createCustomExercise(newName.trim(), newGroup)
      setExercises(prev => [...prev, created])
      onSelect(created)
    } finally {
      setCreating(false)
    }
  }

  const normalizedQuery = useMemo(() => normalizeSearchText(query), [query])

  const frequentlyUsed = useMemo(() => {
    if (!Object.keys(usageCounts).length) return []
    return exercises
      .filter(e => {
        if (hiddenIds.includes(e.id)) return false
        if (activeGroup !== 'ALL' && e.muscle_group !== activeGroup) return false
        return (usageCounts[e.name] ?? 0) > 0
      })
      .sort((a, b) => (usageCounts[b.name] ?? 0) - (usageCounts[a.name] ?? 0))
      .slice(0, 5)
  }, [exercises, usageCounts, hiddenIds, activeGroup])

  const showFrequent = !query && frequentlyUsed.length > 0
  const freqIdSet = useMemo(() => new Set(showFrequent ? frequentlyUsed.map(e => e.id) : []), [showFrequent, frequentlyUsed])

  const filtered = useMemo(() => {
    return exercises.filter(e => {
      if (hiddenIds.includes(e.id)) return false
      if (freqIdSet.has(e.id)) return false
      if (activeGroup !== 'ALL' && e.muscle_group !== activeGroup) return false
      return exerciseMatchesQuery(e, normalizedQuery)
    })
  }, [exercises, hiddenIds, freqIdSet, normalizedQuery, activeGroup])

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
        <p className="text-sm font-black text-white line-clamp-2" style={{ lineHeight: 1.35 }}>{e.name}</p>
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
          style={{ background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.2)' }}
          onClick={() => onSelect(e)}>
          <Plus size={14} style={{ color: '#ff6b00' }} />
        </button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-3">
        <button onClick={onClose}><X size={22} style={{ color: '#555' }} /></button>
        <span className="text-base font-black text-white tracking-widest">SELECT EXERCISE</span>
      </div>

      {/* Search */}
      <div className="px-4 mb-3">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: '#111', border: '1px solid #1e1e1e' }}>
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
      <div className="flex gap-2 px-4 pb-2 overflow-x-auto no-scrollbar">
        {MUSCLE_GROUPS.map(g => (
          <button key={g}
            className="shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider"
            style={{
              background: activeGroup === g ? '#ff6b00' : '#111',
              color: activeGroup === g ? '#fff' : '#555',
              border: activeGroup === g ? 'none' : '1px solid #1e1e1e',
            }}
            onClick={() => setActiveGroup(g)}>
            {groupLabel(g)}
          </button>
        ))}
      </div>

      {/* Supplement text (ja only) + Hidden button */}
      <div className="px-4 pb-3 flex items-center justify-between" style={{ minHeight: 28 }}>
        {locale === 'ja' ? (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.50)', flex: 1, marginRight: 8 }}>
            {activeGroup === 'ALL'
              ? t(locale, 'record.filterByBodyPart')
              : t(locale, `record.categoryDescription.${activeGroup.toLowerCase()}`)}
          </p>
        ) : (
          <div className="flex-1" />
        )}
        <button
          className="active:opacity-70 shrink-0"
          style={{ fontSize: 12, fontWeight: 700, color: '#ff6b00' }}
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
            {/* Frequently Used */}
            {showFrequent && (
              <>
                <p className="text-[10px] font-black tracking-widest mt-1 mb-1" style={{ color: '#444' }}>
                  FREQUENTLY USED
                </p>
                {frequentlyUsed.map(e => renderRow(e, 'freq-'))}
                <div style={{ height: 14 }} />
                <p className="text-[10px] font-black tracking-widest mb-1" style={{ color: '#333' }}>
                  ALL EXERCISES
                </p>
              </>
            )}

            {/* Main list */}
            {filtered.length === 0 && !showFrequent ? (
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
                  style={{ background: '#111', border: '1px solid #1e1e1e' }}>
                  <Plus size={14} style={{ color: '#ff6b00' }} />
                </div>
                <span className="text-sm font-black tracking-wide" style={{ color: '#ff6b00' }}>
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
                  style={{ background: '#111', border: '1px solid #1e1e1e' }}
                  autoFocus
                />
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {MUSCLE_GROUPS.slice(1).map(g => (
                    <button key={g}
                      className="shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider"
                      style={{
                        background: newGroup === g ? '#ff6b00' : '#111',
                        color: newGroup === g ? '#fff' : '#555',
                        border: newGroup === g ? 'none' : '1px solid #1e1e1e',
                      }}
                      onClick={() => setNewGroup(g)}>
                      {groupLabel(g)}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 py-3 rounded-xl text-sm font-black"
                    style={{ background: '#111', color: '#555', border: '1px solid #1e1e1e' }}
                    onClick={() => setShowCreate(false)}>
                    CANCEL
                  </button>
                  <button className="flex-1 py-3 rounded-xl text-sm font-black text-white"
                    style={{ background: creating || !newName.trim() ? '#222' : '#ff6b00' }}
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
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
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
                    <p className="text-sm font-black truncate text-white">{e.name}</p>
                    <p className="text-[10px] font-bold mt-0.5 tracking-wider" style={{ color: '#555' }}>
                      {e.muscle_group}
                    </p>
                  </div>
                  <button
                    className="px-3 py-1.5 rounded-full active:opacity-60 shrink-0"
                    style={{ background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.2)' }}
                    onClick={() => {
                      restoreExercise(e.id)
                      showToast(t(locale, 'record.hiddenRestoredToast'))
                    }}>
                    <span className="text-[11px] font-black" style={{ color: '#ff6b00' }}>
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
            style={{ background: '#111' }}
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
                style={{ background: '#1a1a1a', color: '#666' }}
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
            style={{ background: '#111' }}
            onClick={e => e.stopPropagation()}>
            <p className="text-base font-black text-white text-center mb-1">Delete Exercise?</p>
            <p className="text-sm text-center mb-6" style={{ color: '#555' }}>
              Removed from your list. Past workout data is kept.
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 py-4 rounded-2xl text-sm font-black"
                style={{ background: '#1a1a1a', color: '#666' }}
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
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 24px)', background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
          <p className="text-sm font-bold text-white">{toast}</p>
        </div>
      )}
    </div>
  )
}
