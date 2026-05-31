'use client'

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { X, Camera, ImageIcon, RotateCcw, Trash2, AlertTriangle, ZoomIn, Images } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  getWorkoutPhotoPath,
  getWorkoutPhotoSignedUrl,
  saveWorkoutPhotoRecord,
  deleteWorkoutPhoto,
} from '@/actions/workoutPhoto'
import { cropTo916 } from '@/lib/imageUtils'
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
  | {
      type: 'crop'
      file: File
      objectUrl: string
      imgW: number
      imgH: number
      offsetX: number
      offsetY: number
      cropScale: number
    }
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

  const cameraInputRef  = useRef<HTMLInputElement>(null)
  const libraryInputRef = useRef<HTMLInputElement>(null)
  const cropFrameRef    = useRef<HTMLDivElement>(null)

  // Crop frame exact dimensions (always 9:16) computed after mount/resize
  const [cropFrameSize, setCropFrameSize] = useState({ w: 240, h: 427 })

  // Drag refs for crop UI
  const cropDragging  = useRef(false)
  const cropDragStart = useRef({ px: 0, py: 0, ox: 0, oy: 0 })

  const canEdit = isToday(sessionDate, todayStr)

  // Measure crop frame dimensions when entering crop state
  useLayoutEffect(() => {
    if (state.type !== 'crop') return
    const containerW = Math.min(window.innerWidth - 40, 390)
    const maxH       = window.innerHeight - 280 // header + buttons + safe area
    const naturalH   = containerW * 16 / 9
    const frameH     = Math.max(200, Math.min(naturalH, maxH))
    const frameW     = Math.round(frameH * 9 / 16)
    setCropFrameSize({ w: frameW, h: Math.round(frameH) })
  }, [state.type])

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

  // Revoke object URLs when leaving crop state
  useEffect(() => {
    return () => {
      if (state.type === 'crop') URL.revokeObjectURL(state.objectUrl)
    }
  }, [state])

  const handleFileSelected = useCallback(async (file: File) => {
    const objectUrl = URL.createObjectURL(file)
    try {
      const { naturalWidth, naturalHeight } = await new Promise<{ naturalWidth: number; naturalHeight: number }>((resolve, reject) => {
        const img = new Image()
        img.onload  = () => resolve({ naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight })
        img.onerror = reject
        img.src = objectUrl
      })
      setState({ type: 'crop', file, objectUrl, imgW: naturalWidth, imgH: naturalHeight, offsetX: 0, offsetY: 0, cropScale: 1.0 })
    } catch {
      URL.revokeObjectURL(objectUrl)
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

  // ── Crop drag handlers ─────────────────────────────
  const clampCropOffset = useCallback((
    dx: number, dy: number,
    baseOx: number, baseOy: number,
    imgW: number, imgH: number,
    cScale: number,
    fW: number, fH: number,
  ): { x: number; y: number } => {
    const uiBase = Math.max(fW / imgW, fH / imgH)
    const uiDisp = uiBase * cScale
    const dispW  = imgW * uiDisp
    const dispH  = imgH * uiDisp
    const maxX   = Math.max(0, (dispW - fW) / 2)
    const maxY   = Math.max(0, (dispH - fH) / 2)
    return {
      x: Math.max(-maxX, Math.min(maxX, baseOx + dx)),
      y: Math.max(-maxY, Math.min(maxY, baseOy + dy)),
    }
  }, [])

  const handleCropPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (state.type !== 'crop') return
    cropDragging.current = true
    cropDragStart.current = { px: e.clientX, py: e.clientY, ox: state.offsetX, oy: state.offsetY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handleCropPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cropDragging.current) return
    const dx = e.clientX - cropDragStart.current.px
    const dy = e.clientY - cropDragStart.current.py
    const fW = cropFrameSize.w
    const fH = cropFrameSize.h
    setState(prev => {
      if (prev.type !== 'crop') return prev
      const { x, y } = clampCropOffset(dx, dy, cropDragStart.current.ox, cropDragStart.current.oy, prev.imgW, prev.imgH, prev.cropScale, fW, fH)
      return { ...prev, offsetX: x, offsetY: y }
    })
  }

  const handleCropPointerUp = () => { cropDragging.current = false }

  const handleCropScaleChange = (newScale: number) => {
    const fW = cropFrameSize.w
    const fH = cropFrameSize.h
    setState(prev => {
      if (prev.type !== 'crop') return prev
      const { x, y } = clampCropOffset(0, 0, prev.offsetX, prev.offsetY, prev.imgW, prev.imgH, newScale, fW, fH)
      return { ...prev, cropScale: newScale, offsetX: x, offsetY: y }
    })
  }

  // ── Crop save ──────────────────────────────────────
  const handleCropSave = async () => {
    if (state.type !== 'crop') return
    const fW = cropFrameSize.w
    const fH = cropFrameSize.h
    const { file, offsetX, offsetY, cropScale } = state

    setState({ type: 'uploading' })
    try {
      const { blob, width: w, height: h } = await cropTo916(file, offsetX, offsetY, cropScale, fW, fH)
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

      if (autoCloseOnSave) { onClose(); return }

      const signedUrl = await getWorkoutPhotoSignedUrl(imagePath)
      setState(signedUrl
        ? { type: 'view', signedUrl, imagePath }
        : { type: 'error', message: t(locale, 'photo.photoLoadError') }
      )
    } catch {
      setState({ type: 'error', message: t(locale, 'photo.photoSaveError') })
    }
  }

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

  const busy = state.type === 'uploading'
  const isCrop = state.type === 'crop'

  // Compute image display position inside the crop frame
  let cropImgStyle: React.CSSProperties = {}
  if (state.type === 'crop') {
    const { imgW, imgH, offsetX, offsetY, cropScale } = state
    const fW = cropFrameSize.w
    const fH = cropFrameSize.h
    const uiBase = Math.max(fW / imgW, fH / imgH)
    const uiDisp = uiBase * cropScale
    const dispW  = imgW * uiDisp
    const dispH  = imgH * uiDisp
    const imgX   = (fW - dispW) / 2 + offsetX
    const imgY   = (fH - dispH) / 2 + offsetY
    cropImgStyle = { position: 'absolute', left: imgX, top: imgY, width: dispW, height: dispH }
  }

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
          // Full height when in crop state so 9:16 frame fits
          maxHeight: isCrop ? '100dvh' : 'calc(100dvh - 80px)',
          paddingBottom: 'calc(100px + env(safe-area-inset-bottom))',
        }}
        onClick={e => e.stopPropagation()}>

        {/* Hidden file inputs */}
        <input ref={cameraInputRef}  type="file" accept="image/*" capture="environment" className="sr-only" onChange={handleInputChange} />
        <input ref={libraryInputRef} type="file" accept="image/*"                       className="sr-only" onChange={handleInputChange} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <span className="text-[10px] font-black tracking-widest" style={{ color: '#555' }}>
            {isCrop
              ? t(locale, 'photo.adjustStorySize').toUpperCase()
              : t(locale, 'photo.workoutPhoto').toUpperCase()}
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

        {/* ── 9:16 Crop UI ── */}
        {state.type === 'crop' && (
          <div className="px-5 pb-6">
            <p className="text-xs text-center mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {t(locale, 'photo.dragToAdjust')}
            </p>

            {/* 9:16 crop frame */}
            <div
              ref={cropFrameRef}
              style={{
                width:    cropFrameSize.w,
                height:   cropFrameSize.h,
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 16,
                background: '#000',
                margin: '0 auto',
                // Grid guide lines (subtle)
                boxShadow: '0 0 0 1.5px rgba(255,255,255,0.18)',
              }}
              onPointerDown={handleCropPointerDown}
              onPointerMove={handleCropPointerMove}
              onPointerUp={handleCropPointerUp}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.objectUrl}
                alt="Crop preview"
                draggable={false}
                style={{
                  ...cropImgStyle,
                  touchAction: 'none',
                  userSelect:  'none',
                  pointerEvents: 'none',
                }}
              />

              {/* Rule-of-thirds guide */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.12)' }} />
                <div style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.12)' }} />
                <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.12)' }} />
                <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.12)' }} />
              </div>

              {/* Story size badge */}
              <div style={{ position: 'absolute', bottom: 8, right: 8, pointerEvents: 'none' }}>
                <span style={{
                  fontSize: 9, fontWeight: 900, letterSpacing: '0.08em',
                  padding: '2px 6px', borderRadius: 6,
                  background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.55)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}>9:16</span>
              </div>
            </div>

            {/* Zoom slider */}
            <div className="mt-4 mb-4 px-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <ZoomIn size={12} style={{ color: '#555' }} />
                  <p className="text-[10px] font-bold" style={{ color: '#555', letterSpacing: '0.06em' }}>
                    {t(locale, 'photo.cropZoom')}
                  </p>
                </div>
                <p className="text-[10px] font-mono" style={{ color: '#555' }}>
                  {Math.round(state.cropScale * 100)}%
                </p>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={state.cropScale}
                onChange={e => handleCropScaleChange(parseFloat(e.target.value))}
                className="w-full"
                style={{ accentColor: '#ff6b00' }}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                className="flex-1 py-4 rounded-2xl text-sm font-black"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.62)' }}
                onClick={() => setState({ type: 'select' })}>
                {t(locale, 'photo.cropRetake')}
              </button>
              <button
                className="flex-1 py-4 rounded-2xl text-sm font-black text-white"
                style={{ background: '#ff6b00', boxShadow: '0 4px 20px rgba(255,107,0,0.3)' }}
                onClick={handleCropSave}>
                {t(locale, 'photo.cropSave')}
              </button>
            </div>
            <button
              className="w-full py-3 mt-2 text-sm font-bold"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              onClick={onClose}>
              {t(locale, 'photo.cropCancel')}
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
            <Link
              href={`/body-log?start=${sessionDate}`}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl mb-1 active:opacity-70 transition-opacity"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              onClick={onClose}>
              <Images size={14} style={{ color: 'rgba(255,255,255,0.45)' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>
                {t(locale, 'bodyLog.viewInBodyLog')}
              </span>
            </Link>
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
