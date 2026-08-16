import { useEffect, useState } from 'react'
import { apiClient } from '../api/client'

/**
 * The raw image endpoints (/api/journal-images/:id/raw, /api/order-images/:id/raw)
 * require a Bearer token, like every other API route. A plain <img src="..."> can't
 * attach an Authorization header, so it would just get a 401 and show a broken image.
 * This fetches the image through the authenticated axios client as a blob and renders
 * it via an object URL instead.
 */
export function AuthedImage({
  kind,
  imageId,
  alt,
  className,
  onClick,
}: {
  kind: 'journal' | 'order'
  imageId: number
  alt: string
  className?: string
  onClick?: () => void
}) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    setSrc(null)
    setFailed(false)

    apiClient
      .get(`/api/${kind}-images/${imageId}/raw`, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(res.data as Blob)
        setSrc(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [kind, imageId])

  // Loading/failed placeholders have no intrinsic size (unlike a loaded <img>),
  // so give them a sane minimum in case the caller's className doesn't set one
  // (e.g. the lightbox, which only constrains max size).
  const placeholderClassName = `${className ?? ''} min-h-24 min-w-24`

  if (failed) {
    return (
      <div className={`${placeholderClassName} flex items-center justify-center bg-slate-100 text-xs text-slate-400`}>
        Failed to load
      </div>
    )
  }

  if (!src) {
    return <div className={`${placeholderClassName} animate-pulse bg-slate-100`} />
  }

  return (
    <img
      src={src}
      alt={alt}
      onClick={onClick}
      className={onClick ? `${className ?? ''} cursor-zoom-in` : className}
    />
  )
}
