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

  // 4:1 banner cards (aspect > 3.2) need different treatment:
  //   1. clip-path: inset() causes mis-clipped corners on the extreme aspect ratio.
  //   2. Higher minimum pixelRatio improves rendering quality at small CSS pixel heights.
  const isFourByOne = W / H > 3.2

  // Per-aspect-ratio output targets for sharp saves.
  // 1:1 → 1440px (Instagram), 16:9 → 1920px (HD/YouTube), others → 1080px.
  const isSquare   = !isFourByOne && W > 0 && Math.abs(W - H) / Math.max(W, H) < 0.05
  const isSixteen9 = !isFourByOne && !isSquare && W > 0 && H > 0 && Math.abs(W / H - 16 / 9) < 0.12
  const targetPx   = isSquare ? 1440 : isSixteen9 ? 1920 : 1080
  const pixelRatio = isFourByOne
    ? Math.min(3, Math.max(2.5, 1080   / W))
    : Math.min(5, Math.max(2,   targetPx / W))

  const opts = {
    width:  W,
    height: H,
    style:  { width: `${W}px`, height: `${H}px` },
    pixelRatio,
    cacheBust: true,
    skipFonts: true,   // system-ui only — no custom font embedding needed
    // Explicit 'transparent' (not undefined) prevents html-to-image from inheriting a
    // white background from the cloned document's body, which causes white corners and
    // makes transparent cards appear opaque. The string 'transparent' is truthy so the
    // library applies it to both the clone's backgroundColor and the canvas fill.
    backgroundColor: 'transparent' as const,
  }

  // Read border-radius BEFORE any style mutations.
  // Inline style is set by React (e.g. borderRadius:24 → "24px"); fall back to computed.
  const borderRadius = el.style.borderRadius || getComputedStyle(el).borderRadius
  // Apply clip-path: inset() to enforce corner clipping in WebKit's SVG/canvas renderer.
  // overflow:hidden + border-radius alone is NOT consistently respected by WebKit's
  // ForeignObject renderer — background gradients and graph layers paint as rectangles
  // and bleed outside the rounded corners in the saved PNG.
  // EXCEPTION: 4:1 cards skip clip-path because the extreme aspect ratio causes WebKit's
  // inset() radius computation to produce white corners or mis-clipped edges.  Their
  // border-radius + overflow:hidden is sufficient since the gradient surface is simple.
  const hasRadius = !isFourByOne && Boolean(borderRadius && borderRadius !== '0px' && borderRadius !== '0')
  const prevClipPath = el.style.clipPath

  // Saved values — restored in finally regardless of outcome.
  const prevBg            = el.style.background
  const prevBgColor       = el.style.backgroundColor
  const prevBgImg         = el.style.backgroundImage
  const prevBodyBg        = document.body.style.background
  const prevBodyBgColor   = document.body.style.backgroundColor
  const prevHtmlBg        = document.documentElement.style.background
  const prevHtmlBgColor   = document.documentElement.style.backgroundColor

  // iOS WebKit's SVG ForeignObject renderer applies the live document's body/html
  // background to the HTML context inside the foreignObject.  For transparent cards
  // this makes the card opaque; for glass cards this collapses the alpha layers in
  // the glass gradient, turning semi-transparent tints into fully opaque colors.
  // Clearing body/html unconditionally fixes both modes — glass gradient stays in
  // background-image (untouched) and its alpha values render correctly against
  // transparent.  All values are restored in the finally block.
  document.body.style.background            = 'transparent'
  document.body.style.backgroundColor       = 'transparent'
  document.documentElement.style.background       = 'transparent'
  document.documentElement.style.backgroundColor  = 'transparent'

  // Per-descendant backgroundImage records — populated only when clearBackground=true.
  // iOS Safari may not propagate an inherited backgroundImage:'none' through the
  // foreignObject serialization tree, so glass gradient layers on inner components
  // bleed into the transparent PNG even when the root element is cleared.
  type ChildBgRecord = { el: HTMLElement; bgImg: string }
  let childBgRecords: ChildBgRecord[] = []

  if (clearBackground) {
    // Transparent card mode: clear the element's own background.
    el.style.background            = 'transparent'
    el.style.backgroundColor       = 'transparent'
    el.style.backgroundImage       = 'none'

    // Also clear inline backgroundImage on every descendant that has one set.
    // We only touch inline styles (not computed) so purely CSS-class-driven backgrounds
    // (chart fills, SVG strokes, text colors) are untouched.
    el.querySelectorAll<HTMLElement>('*').forEach(child => {
      const inlineBgImg = child.style.backgroundImage
      if (inlineBgImg && inlineBgImg !== '' && inlineBgImg !== 'none') {
        childBgRecords.push({ el: child, bgImg: inlineBgImg })
        child.style.backgroundImage = 'none'
      }
    })
  }
  if (hasRadius) {
    el.style.clipPath = `inset(0 round ${borderRadius})`
  }
  // Always wait one frame — document body/html styles were just mutated.
  await new Promise(r => requestAnimationFrame(r))

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
    // Always restore — even on error — so the page theme is never left broken.
    document.body.style.background                   = prevBodyBg
    document.body.style.backgroundColor              = prevBodyBgColor
    document.documentElement.style.background        = prevHtmlBg
    document.documentElement.style.backgroundColor   = prevHtmlBgColor
    if (clearBackground) {
      el.style.background                              = prevBg
      el.style.backgroundColor                         = prevBgColor
      el.style.backgroundImage                         = prevBgImg
      childBgRecords.forEach(({ el: child, bgImg }) => {
        child.style.backgroundImage = bgImg
      })
    }
    if (hasRadius) el.style.clipPath = prevClipPath
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
