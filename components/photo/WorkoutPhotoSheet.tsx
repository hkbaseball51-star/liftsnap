'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Camera, ImageIcon, RotateCcw, Trash2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  getWorkoutPhotoPath,
  getWorkoutPhotoSignedUrl,
  saveWorkoutPhotoRecord,
  deleteWorkoutPhoto,
} from '@/actions/workoutPhoto'
import { compressImage } from '@/lib/imageUtils'
import { useLocale } from '@/lib/useLocale'
import { t } from '@/lib/i18n'

type Props = {
  sessionId: string
  sessionDate: string   // YYYY-MM-DD
  todayStr: string
  onClose: () => void
  onPhotoSaved?: (imagePath: string) => void
  onPhotoDeleted?: () => void
  autoCloseOnSave?: boolean
}

type SheetState =
  | { type: 'loading' }
  | { type: 'past_no_photo' }
  | { type: 'select' }
  | { type: 'preview'; file: File; objectUrl: string; width: number; height: number }
  | { type: 'uploading' }
  | { type: 'view'; signedUrl: string; imagePath: string }
  | { type: 'delete_confirm'; signedUrl: string; imagePath: string }
  | { type: 'error'; message: string }

const isToday = (date: string, today: string) => date === today

export default function WorkoutPhotoSheet({
  sessionId,
  sessionDate,
  todayStr,
  onClose,
  onPhotoSaved,
  onPhotoDeleted,
  autoCloseOnSave = false,
}: Props) {
  const { locale } = useLocale()
  const [state, setState] = useState<SheetState>({ type: 'loading' })

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const libraryInputRef = useRef<HTMLInputElement>(null)

  const canEdit = isToday(sessionDate, todayStr)

  // Load existing photo on mount
  useEffect(() => {
    let cancelled = false
    async function load() {
      const path = await getWorkoutPhotoPath(sessionId)
      if (cancelled) return

      if (path) {
        const url = await getWorkoutPhotoSignedUrl(path)
        if (cancelled) return
        if (url) {
          setState({ type: 'view', signedUrl: url, imagePath: path })
        } else {
          setState({ type: 'error', message: t(locale, 'photo.photoLoadError') })
        }
      } else {
        setState(canEdit ? { type: 'select' } : { type: 'past_no_photo' })
      }
    }
    load()
    return () => { cancelled = true }
  }, [sessionId, locale, canEdit])

  // Clean up object URLs when state changes away from preview
  useEffect(() => {
    return () => {
      if (state.type === 'preview') {
        URL.revokeObjectURL(state.objectUrl)
      }
    }
  }, [state])

  const handleFileSelected = useCallback(async (file: File) => {
    try {
      const { blob: _ignored, width, height } = await compressImage(file, 1440, 0.85)
      // Create preview from original file (better quality for display)
      const objectUrl = URL.createObjectURL(file)
      setState({ type: 'preview', file, objectUrl, width, height })
    } catch {
      setState({ type: 'error', message: t(locale, 'photo.photoLoadError') })
    }
  }, [locale])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFileSelected(file)
      e.target.value = ''
    },
    [handleFileSelected],
  )

  const handleSave = useCallback(async () => {
    if (state.type !== 'preview') return
    const { file } = state

    setState({ type: 'uploading' })
    try {
      const { blob, width: w, height: h } = await compressImage(file, 1440, 0.85)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')

      const imagePath = `${user.id}/${sessionId}/original.jpg`
      const { error: uploadError } = await supabase.storage
        .from('workout-photos')
        .upload(imagePath, blob, { contentType: 'image/jpeg', upsert: true })

      if (uploadError) throw uploadError

      await saveWorkoutPhotoRecord(sessionId, sessionDate, imagePath, w, h)

      onPhotoSaved?.(imagePath)

      if (autoCloseOnSave) {
        onClose()
        return
      }

      const signedUrl = await getWorkoutPhotoSignedUrl(imagePath)
      setState(signedUrl
        ? { type: 'view', signedUrl, imagePath }
        : { type: 'error', message: t(locale, 'photo.photoLoadError') }
      )
    } catch {
      setState({ type: 'error', message: t(locale, 'photo.photoSaveError') })
    }
  }, [state, sessionId, sessionDate, locale, onPhotoSaved, autoCloseOnSave, onClose])

  const handleDelete = useCallback(async () => {
    setState({ type: 'uploading' })
    try {
      await deleteWorkoutPhoto(sessionId)
      onPhotoDeleted?.()
      onClose()
    } catch {
      setState({ type: 'error', message: t(locale, 'photo.photoSaveError') })
    }
  }, [sessionId, locale, onPhotoDeleted, onClose])

  // Backdrop click to close (not during upload/delete)
  const busy = state.type === 'uploading'

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end"
      style={{ background: 'rgba(0,0,0,0.82)' }}
      onClick={() => !busy && onClose()}>
      <div
        className="w-full rounded-t-3xl overflow-y-auto"
        style={{
          background: '#111',
          border: '1px solid rgba(255,255,255,0.09)',
          borderBottom: 'none',
          maxHeight: 'calc(100dvh - 80px)',
          paddingBottom: 'calc(100px + env(safe-area-inset-bottom))',
        }}
        onClick={e => e.stopPropagation()}>

        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={handleInputChange}
        />
        <input
          ref={libraryInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleInputChange}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <span className="text-[10px] font-black tracking-widest" style={{ color: '#555' }}>
            {t(locale, 'photo.workoutPhoto').toUpperCase()}
          </span>
          <button onClick={onClose} disabled={busy}>
            <X size={20} style={{ color: '#555' }} />
          </button>
        </div>

        {/* ── Loading ── */}
        {state.type === 'loading' && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 animate-spin"
              style={{ borderColor: 'rgba(255,255,255,0.12)', borderTopColor: '#ff6b00' }} />
          </div>
        )}

        {/* ── Past date, no photo ── */}
        {state.type === 'past_no_photo' && (
          <div className="px-5 pb-6 text-center">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.38)' }}>
              {t(locale, 'photo.photoUnavailablePastDate')}
            </p>
          </div>
        )}

        {/* ── Error ── */}
        {state.type === 'error' && (
          <div className="px-5 pb-6">
            <div className="rounded-2xl p-4 mb-4"
              style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.16)' }}>
              <p className="text-sm text-center" style={{ color: '#f87171' }}>{state.message}</p>
            </div>
            <button
              className="w-full py-4 rounded-2xl text-sm font-black"
              style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.62)' }}
              onClick={onClose}>
              {t(locale, 'photo.cancel')}
            </button>
          </div>
        )}

        {/* ── Select: camera / library ── */}
        {state.type === 'select' && (
          <div className="px-5 pb-6 space-y-3">
            <p className="text-sm text-center mb-5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {locale === 'ja'
                ? '今日のトレーニングを写真で残しましょう。'
                : "Save today's workout with a photo."}
            </p>
            <button
              className="w-full flex items-center gap-3 py-4 px-5 rounded-2xl active:opacity-70 transition-opacity"
              style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={() => cameraInputRef.current?.click()}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.2)' }}>
                <Camera size={16} style={{ color: '#ff6b00' }} />
              </div>
              <span className="text-sm font-black" style={{ color: '#f5f5f5' }}>
                {t(locale, 'photo.takePhoto')}
              </span>
            </button>
            <button
              className="w-full flex items-center gap-3 py-4 px-5 rounded-2xl active:opacity-70 transition-opacity"
              style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={() => libraryInputRef.current?.click()}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
                <ImageIcon size={16} style={{ color: 'rgba(255,255,255,0.55)' }} />
              </div>
              <span className="text-sm font-black" style={{ color: '#f5f5f5' }}>
                {t(locale, 'photo.chooseFromLibrary')}
              </span>
            </button>
            <button
              className="w-full py-3 text-sm font-bold"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              onClick={onClose}>
              {t(locale, 'photo.cancel')}
            </button>
          </div>
        )}

        {/* ── Preview ── */}
        {state.type === 'preview' && (
          <div className="px-5 pb-6">
            {/* 9:16 preview */}
            <div className="relative w-full rounded-2xl overflow-hidden mb-5"
              style={{ aspectRatio: '9/16', maxHeight: 'min(60dvh, 480px)', background: '#000' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.objectUrl}
                alt="Preview"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0"
                style={{ background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.4))' }} />
            </div>
            <div className="flex gap-3">
              <button
                className="flex-1 py-4 rounded-2xl text-sm font-black"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.62)' }}
                onClick={() => setState({ type: 'select' })}>
                {t(locale, 'photo.retake')}
              </button>
              <button
                className="flex-1 py-4 rounded-2xl text-sm font-black text-white"
                style={{ background: '#ff6b00', boxShadow: '0 4px 20px rgba(255,107,0,0.3)' }}
                onClick={handleSave}>
                {t(locale, 'photo.savePhoto')}
              </button>
            </div>
            <button
              className="w-full py-3 mt-2 text-sm font-bold"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              onClick={onClose}>
              {t(locale, 'photo.cancel')}
            </button>
          </div>
        )}

        {/* ── Uploading ── */}
        {state.type === 'uploading' && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 rounded-full border-2 animate-spin"
              style={{ borderColor: 'rgba(255,255,255,0.12)', borderTopColor: '#ff6b00' }} />
            <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {t(locale, 'photo.uploading')}
            </p>
          </div>
        )}

        {/* ── View existing photo ── */}
        {state.type === 'view' && (
          <div className="px-5 pb-6">
            <div className="relative w-full rounded-2xl overflow-hidden mb-5"
              style={{ aspectRatio: '9/16', maxHeight: 'min(60dvh, 480px)', background: '#000' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.signedUrl}
                alt="Workout photo"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0"
                style={{ background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.4))' }} />
            </div>
            {canEdit && (
              <div className="flex gap-3 mb-2">
                <button
                  className="flex-1 py-4 rounded-2xl text-sm font-black"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.62)' }}
                  onClick={() => setState({ type: 'delete_confirm', signedUrl: state.signedUrl, imagePath: state.imagePath })}>
                  <div className="flex items-center justify-center gap-1.5">
                    <Trash2 size={14} />
                    {t(locale, 'photo.deletePhoto')}
                  </div>
                </button>
                <button
                  className="flex-1 py-4 rounded-2xl text-sm font-black"
                  style={{ background: '#ff6b00', color: '#fff', boxShadow: '0 4px 20px rgba(255,107,0,0.3)' }}
                  onClick={() => setState({ type: 'select' })}>
                  <div className="flex items-center justify-center gap-1.5">
                    <RotateCcw size={14} />
                    {t(locale, 'photo.changePhoto')}
                  </div>
                </button>
              </div>
            )}
            <button
              className="w-full py-3 text-sm font-bold"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              onClick={onClose}>
              {t(locale, 'photo.cancel')}
            </button>
          </div>
        )}

        {/* ── Delete confirm ── */}
        {state.type === 'delete_confirm' && (
          <div className="px-5 pb-6">
            <div className="flex justify-center mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertTriangle size={18} style={{ color: '#f87171' }} />
              </div>
            </div>
            <p className="text-base font-black text-center mb-2" style={{ color: '#f5f5f5' }}>
              {t(locale, 'photo.deletePhotoConfirmTitle')}
            </p>
            <p className="text-sm text-center mb-6" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {t(locale, 'photo.deletePhotoConfirmDescription')}
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 py-4 rounded-2xl text-sm font-black"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.62)' }}
                onClick={() => setState({ type: 'view', signedUrl: state.signedUrl, imagePath: state.imagePath })}>
                {t(locale, 'photo.cancel')}
              </button>
              <button
                className="flex-1 py-4 rounded-2xl text-sm font-black"
                style={{ background: '#dc2626', color: '#fff' }}
                onClick={handleDelete}>
                {t(locale, 'photo.deletePhotoBtn')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
