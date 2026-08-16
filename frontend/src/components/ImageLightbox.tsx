import { useEffect } from 'react'
import { AuthedImage } from './AuthedImage'

/**
 * Full-size view of an image, opened by clicking its thumbnail. Closes on
 * Escape, clicking the backdrop, or the close button.
 */
export function ImageLightbox({
  kind,
  imageId,
  alt,
  onClose,
}: {
  kind: 'journal' | 'order'
  imageId: number
  alt: string
  onClose: () => void
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 p-6"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-6 top-6 text-3xl font-light text-white/80 hover:text-white"
      >
        ×
      </button>
      <div onClick={(e) => e.stopPropagation()}>
        <AuthedImage
          kind={kind}
          imageId={imageId}
          alt={alt}
          className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
        />
      </div>
    </div>
  )
}
