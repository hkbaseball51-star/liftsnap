/**
 * Crop an image to 9:16 Story format.
 * offsetX/offsetY are the pan values in UI frame pixels.
 * cropScale is the zoom multiplier (1.0 = minimum to cover the frame).
 * frameW/frameH are the displayed crop frame dimensions in CSS pixels.
 * Outputs a JPEG blob at targetW × targetH (default 1080 × 1920).
 */
export async function cropTo916(
  file: File,
  offsetX: number,
  offsetY: number,
  cropScale: number,
  frameW: number,
  frameH: number,
  targetW = 1080,
  targetH = 1920,
): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      try {
        const canvas = document.createElement('canvas')
        canvas.width  = targetW
        canvas.height = targetH
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas context unavailable')); return }

        // frame → canvas scale ratio (same in both axes since frame and output are both 9:16)
        const r = targetW / frameW

        // minimum scale so image covers the frame in UI pixels
        const uiBase = Math.max(frameW / img.naturalWidth, frameH / img.naturalHeight)
        const uiDisp = uiBase * cropScale

        // image position and size in UI frame pixels
        const uiW = img.naturalWidth  * uiDisp
        const uiH = img.naturalHeight * uiDisp
        const imgX = (frameW - uiW) / 2 + offsetX
        const imgY = (frameH - uiH) / 2 + offsetY

        // draw clipped to canvas bounds
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, 0, targetW, targetH)
        ctx.clip()
        ctx.drawImage(img, imgX * r, imgY * r, uiW * r, uiH * r)
        ctx.restore()

        canvas.toBlob(
          blob => blob
            ? resolve({ blob, width: targetW, height: targetH })
            : reject(new Error('Canvas toBlob failed')),
          'image/jpeg',
          0.80,
        )
      } catch (e) {
        reject(e)
      }
    }

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })
}

type ImageOutput = { blob: Blob; mime: string; ext: string }

async function toBlobPreferWebP(canvas: HTMLCanvasElement, quality: number): Promise<ImageOutput> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob && blob.type === 'image/webp') {
        resolve({ blob, mime: 'image/webp', ext: 'webp' })
      } else {
        // WebP not supported — fall back to JPEG
        canvas.toBlob(jpeg => {
          if (jpeg) resolve({ blob: jpeg, mime: 'image/jpeg', ext: 'jpg' })
          else reject(new Error('Canvas toBlob failed'))
        }, 'image/jpeg', quality)
      }
    }, 'image/webp', quality)
  })
}

export type CropPair = {
  full: ImageOutput   // 1080 × 1920, quality 0.80
  thumb: ImageOutput  // 400  × 711,  quality 0.72
  width: number       // 1080
  height: number      // 1920
}

/**
 * Crop and produce both a full-size (1080×1920) and thumbnail (400×711) image
 * from the same source file in a single pass.  WebP preferred, JPEG fallback.
 */
export async function cropTo916AndThumb(
  file: File,
  offsetX: number,
  offsetY: number,
  cropScale: number,
  frameW: number,
  frameH: number,
): Promise<CropPair> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = async () => {
      URL.revokeObjectURL(url)
      try {
        const fullW = 1080, fullH = 1920
        const thumbW = 400,  thumbH = 711

        const uiBase = Math.max(frameW / img.naturalWidth, frameH / img.naturalHeight)
        const uiDisp = uiBase * cropScale
        const uiW    = img.naturalWidth  * uiDisp
        const uiH    = img.naturalHeight * uiDisp
        const imgX   = (frameW - uiW) / 2 + offsetX
        const imgY   = (frameH - uiH) / 2 + offsetY

        function draw(targetW: number, targetH: number): HTMLCanvasElement {
          const canvas = document.createElement('canvas')
          canvas.width  = targetW
          canvas.height = targetH
          const ctx = canvas.getContext('2d')!
          const r = targetW / frameW
          ctx.save()
          ctx.beginPath()
          ctx.rect(0, 0, targetW, targetH)
          ctx.clip()
          ctx.drawImage(img, imgX * r, imgY * r, uiW * r, uiH * r)
          ctx.restore()
          return canvas
        }

        const [full, thumb] = await Promise.all([
          toBlobPreferWebP(draw(fullW, fullH), 0.80),
          toBlobPreferWebP(draw(thumbW, thumbH), 0.72),
        ])

        resolve({ full, thumb, width: fullW, height: fullH })
      } catch (e) {
        reject(e)
      }
    }

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })
}

/**
 * Compress an image File using Canvas.
 * Scales down so the long edge is at most maxLongEdge pixels.
 * Returns a JPEG Blob at the specified quality.
 */
export async function compressImage(
  file: File,
  maxLongEdge = 1440,
  quality = 0.85,
): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const sw = img.naturalWidth
      const sh = img.naturalHeight
      let w = sw
      let h = sh

      if (Math.max(sw, sh) > maxLongEdge) {
        if (sw >= sh) {
          w = maxLongEdge
          h = Math.round(sh * (maxLongEdge / sw))
        } else {
          h = maxLongEdge
          w = Math.round(sw * (maxLongEdge / sh))
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context unavailable'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)

      canvas.toBlob(
        blob => {
          if (blob) {
            resolve({ blob, width: w, height: h })
          } else {
            reject(new Error('Canvas toBlob failed'))
          }
        },
        'image/jpeg',
        quality,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Image load failed'))
    }

    img.src = objectUrl
  })
}
