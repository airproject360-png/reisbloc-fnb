/**
 * Servicio de optimización de imágenes para el Menú Interactivo de LOCALITO.
 * Comprime y redimensiona fotos a formato WebP/JPEG ligero (<80 KB) usando HTML5 Canvas
 * para no consumir almacenamiento en BD ni ancho de banda.
 */

export interface ImageOptimizationOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  mimeType?: string
}

export async function optimizeImageFile(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<{ dataUrl: string; sizeKb: number }> {
  const {
    maxWidth = 800,
    maxHeight = 600,
    quality = 0.82,
    mimeType = 'image/webp'
  } = options

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        // Mantener proporción de aspecto
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height)
          height = maxHeight
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('No se pudo obtener el contexto 2D del canvas'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // Intentar compresión en WebP, fallback a JPEG
        let compressedDataUrl = canvas.toDataURL(mimeType, quality)
        if (!compressedDataUrl.startsWith(`data:${mimeType}`)) {
          compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
        }

        const sizeKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024)
        resolve({ dataUrl: compressedDataUrl, sizeKb })
      }
      img.onerror = () => reject(new Error('Error al procesar la imagen'))
      img.src = event.target?.result as string
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsDataURL(file)
  })
}
