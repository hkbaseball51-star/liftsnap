/**
 * Shared image capture + share utilities for all Story card exports.
 *
 * Design rules:
 *  - Always try Web Share API first (opens iOS share sheet)
 *  - Fall back to anchor-download only when Web Share is unsupported
 *  - Never open the PNG in a new tab / browser preview
 *  - Capture VISIBLE elements — off-screen elements break html-to-image's
 *    style computation and produce blank/transparent PNGs.
 */

// ── Capture ──────────────────────────────────────────────────────────────

type CaptureOptions = {
  /**
   * Strip the element's inline background before capture.
   * Use when the preview shows a checker pattern via `background` CSS
   * and you want a transparent PNG without the checker.
   */
  clearBackground?: boolean
}

/**
 * Capture a visible on-screen element as a PNG blob.
 *
 * The element must be rendered and visible in the viewport.
 * Calling this on hidden/off-screen nodes will produce blank images.
 *
 * Uses a warm-up toPng call before the real capture to ensure SVG and
 * image resources are fully loaded (required by html-to-image on first call).
 */
export async function captureElement(
  el: HTMLDivElement,
  { clearBackground = false }: CaptureOptions = {},
): Promise<Blob> {
  const { toPng } = await import('html-to-image')

  await document.fonts.ready
  // Two animation frames guarantee the element is fully painted
  await new Promise(r => requestAnimationFrame(r))
  await new Promise(r => requestAnimationFrame(r))
  await new Promise(r => setTimeout(r, 120))

  const W = el.offsetWidth
  const H = el.offsetHeight

  if (process.env.NODE_ENV !== 'production') {
    /* eslint-disable no-console */
    console.log('[captureElement]', {
      children:   el.children.length,
      innerText:  el.innerText?.trim().slice(0, 80),
      size:       `${W}×${H}`,
      clearBackground,
    })
    /* eslint-enable no-console */
  }

  if (W === 0 || H === 0) {
    throw new Error(`Export element has zero dimensions: ${W}×${H}`)
  }

  // Scale so the longer dimension reaches ~1080px; cap at 3× for mobile RAM
  const pixelRatio = Math.min(3, Math.max(1, Math.round(1080 / Math.max(W, H, 1))))

  const opts = {
    width:  W,
    height: H,
    style:  { width: `${W}px`, height: `${H}px` },
    pixelRatio,
    cacheBust: true,
    skipFonts: true,   // system-ui only — no custom font embedding needed
    // Dark canvas background for glass/solid cards: composites semi-transparent backgrounds
    // correctly and eliminates white corners outside the card's border-radius.
    // Omit for transparent cards so PNG alpha is preserved.
    backgroundColor: clearBackground ? undefined : '#0a0a0a',
  }

  const prevBg = el.style.background
  if (clearBackground) {
    // Remove checker pattern so the PNG alpha channel is truly transparent
    el.style.background = 'transparent'
    await new Promise(r => requestAnimationFrame(r))
  }

  try {
    // Warm-up: loads SVG/image resources; result is discarded
    await toPng(el, opts)
    await new Promise(r => setTimeout(r, 60))
    // Real capture
    const dataUrl = await toPng(el, opts)
    const blob    = await fetch(dataUrl).then(r => r.blob())

    if (process.env.NODE_ENV !== 'production') {
      /* eslint-disable no-console */
      console.log('[captureElement] blob:', blob.size, 'bytes, type:', blob.type)
      /* eslint-enable no-console */
    }

    if (blob.size < 2000) {
      throw new Error(`Captured image appears empty (${blob.size} bytes)`)
    }
    return blob
  } finally {
    if (clearBackground) el.style.background = prevBg
  }
}

// ── Share / Download ──────────────────────────────────────────────────────

type ShareOptions = {
  blob:      Blob
  filename:  string
  title?:    string
  text?:     string
}

/**
 * Share an image via the Web Share API when available, otherwise trigger
 * an anchor-tag download. Never opens the image in a new browser tab.
 *
 * Returns 'shared' if the OS share sheet was opened, 'downloaded' if the
 * anchor fallback was used (desktop / non-iOS browsers).
 */
export async function shareOrDownloadImage({
  blob,
  filename,
  title = 'REPRA',
  text,
}: ShareOptions): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/png' })

  if (navigator.canShare?.({ files: [file] })) {
    const shareData: ShareData = { files: [file], title }
    if (text) shareData.text = text
    await navigator.share(shareData)
    return 'shared'
  }

  // Anchor download — works on desktop and Android.
  // On iOS Safari without Web Share support this may open a file preview,
  // but that case is extremely rare since iOS 15+ supports Web Share API.
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Delay revoke so the browser has time to start the download
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
