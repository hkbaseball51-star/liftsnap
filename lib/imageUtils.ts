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
