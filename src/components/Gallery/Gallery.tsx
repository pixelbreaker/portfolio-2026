import { useCallback, useEffect, useRef, useState } from 'react'

import { MaterialIcon } from '../MaterialIcon'
import './Gallery.css'
import type { GalleryPhoto } from './photos'

// Must match the CSS box (full-bleed to --content-width, else 100vw) or the
// browser picks the wrong rendition.
const SIZES = '(min-width: 72rem) 72rem, 100vw'

export function Gallery({
  photos,
  label,
}: {
  photos: GalleryPhoto[]
  label: string
}) {
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  // Nothing is measurable before layout; the first measure corrects this.
  const [atEnd, setAtEnd] = useState(false)

  // The slide under the start edge.
  const measure = useCallback(() => {
    const scroller = track.current
    if (!scroller) return
    const width = scroller.clientWidth || 1
    setIndex(
      Math.min(photos.length - 1, Math.round(scroller.scrollLeft / width)),
    )
    setAtEnd(scroller.scrollLeft >= scroller.scrollWidth - width - 1)
  }, [photos.length])

  useEffect(() => {
    measure()
    const scroller = track.current
    if (!scroller) return
    const onScroll = () => measure()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [measure])

  const scrollBySlide = useCallback((direction: 1 | -1) => {
    const scroller = track.current
    if (!scroller) return
    // The global reduced-motion rule only catches CSS smooth scrolling.
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)')
      .matches
    scroller.scrollBy({
      left: direction * scroller.clientWidth,
      behavior: smooth ? 'smooth' : 'auto',
    })
  }, [])

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'ArrowRight' && !atEnd) {
        event.preventDefault()
        scrollBySlide(1)
      } else if (event.key === 'ArrowLeft' && index > 0) {
        event.preventDefault()
        scrollBySlide(-1)
      }
    },
    [atEnd, index, scrollBySlide],
  )

  if (photos.length === 0) return null

  const single = photos.length === 1

  return (
    <div
      className="gallery"
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
    >
      <div className="gallery-frame">
        <div
          ref={track}
          className="gallery-track"
          tabIndex={single ? undefined : 0}
          onKeyDown={onKeyDown}
        >
          {photos.map((photo, i) => (
            <div className="gallery-slide" key={photo.id}>
              <picture>
                {Object.entries(photo.sources).map(([format, srcset]) => (
                  <source
                    key={format}
                    type={`image/${format}`}
                    srcSet={srcset}
                    sizes={SIZES}
                  />
                ))}
                <img
                  src={photo.img.src}
                  width={photo.img.w}
                  height={photo.img.h}
                  alt={photo.alt}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  // The first slide is this page's LCP candidate; the rest
                  // wait their turn.
                  fetchPriority={i === 0 ? 'high' : 'auto'}
                  decoding={i === 0 ? 'auto' : 'async'}
                />
              </picture>
            </div>
          ))}
        </div>
        {!single && (
          <>
            <button
              className="gallery-button gallery-button--prev"
              type="button"
              aria-label="Previous photo"
              disabled={index === 0}
              onClick={() => scrollBySlide(-1)}
            >
              <MaterialIcon name="arrow_left" />
            </button>
            <button
              className="gallery-button gallery-button--next"
              type="button"
              aria-label="Next photo"
              disabled={atEnd}
              onClick={() => scrollBySlide(1)}
            >
              <MaterialIcon name="arrow_right" />
            </button>
          </>
        )}
      </div>
      {!single && (
        <p className="gallery-counter" aria-live="polite">
          {index + 1} / {photos.length}
        </p>
      )}
    </div>
  )
}
