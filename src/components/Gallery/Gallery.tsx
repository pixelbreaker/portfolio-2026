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
  const dialog = useRef<HTMLDialogElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  // Nothing is measurable before layout; the first measure corrects this.
  const [atEnd, setAtEnd] = useState(false)
  const [viewer, setViewer] = useState(false)
  // The carousel's box in the flow, kept for the anchor to stand in with while
  // the dialog is in the top layer; 0 means the carousel is in flow.
  const [standby, setStandby] = useState(0)
  // The index as it is right now, readable from an effect that runs a frame
  // after the state was set.
  const indexRef = useRef(0)
  // The photo a scripted move has aimed the track at, and is waiting for it to
  // reach; null while the visitor drives the track.
  const targetRef = useRef<number | null>(null)

  // The photo under the track's start edge. A scripted move has one echo worth
  // taking: its own stop. On the way there the track passes every photo in
  // between, and the top layer resets the scroller on the way in and out; none
  // of that is the visitor's photo, so it never overwrites the aim. Swipes,
  // which the Gallery does not script, are the track's to report.
  const measure = useCallback(() => {
    const scroller = track.current
    if (!scroller) return
    const width = scroller.clientWidth || 1
    const photo = Math.min(
      photos.length - 1,
      Math.round(scroller.scrollLeft / width),
    )
    if (targetRef.current !== null && photo !== targetRef.current) return
    targetRef.current = null
    indexRef.current = photo
    setIndex(photo)
    setAtEnd(scroller.scrollLeft >= scroller.scrollWidth - width - 1)
  }, [photos.length])

  useEffect(() => {
    measure()
    const scroller = track.current
    if (!scroller) return
    const onScroll = () => measure()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    // A settled track is the arrival the Gallery aims at, so scrollend is
    // worth taking as well: it lands the counter where the animation ended.
    // Where the browser has no scrollend, the scripted writes clear the aim
    // themselves.
    const settles = 'onscrollend' in window
    if (settles)
      scroller.addEventListener('scrollend', onScroll, { passive: true })
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      if (settles) scroller.removeEventListener('scrollend', onScroll)
    }
  }, [measure])

  // Entering the top layer restyles the track and resets its scroll position:
  // slides become viewport-wide, so the index is written back at the new slide
  // width, a frame later, once the top-layer layout has settled. The same
  // applies on the way out, leaving the page carousel on the photo you ended on.
  const alignTrack = useCallback(() => {
    targetRef.current = indexRef.current
    const frame = requestAnimationFrame(() => {
      const scroller = track.current
      if (!scroller) return
      scroller.scrollLeft = indexRef.current * scroller.clientWidth
      // The write ends the move: the track is where the visitor left it, and
      // from here the track is the visitor's to report again.
      targetRef.current = null
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  const prevViewer = useRef(viewer)
  useEffect(() => {
    const el = dialog.current
    if (!el) return
    // React's `open` prop cannot reach the top layer, only showModal() can, so
    // state drives the dialog imperatively; Escape closes natively, and the
    // close event is how the real state comes back.
    if (viewer) {
      if (!el.open) el.showModal()
    } else if (el.open) {
      el.close()
    }
    // The write-back undoes the top layer's reset, so it belongs to a move in
    // or out of the top layer and to nothing else: on mount the track has
    // never been reset, and a frame there would gate the visitor's swipes for
    // a whole frame.
    const moved = prevViewer.current !== viewer
    prevViewer.current = viewer
    if (moved) return alignTrack()
  }, [viewer, alignTrack])

  const openViewer = useCallback((photo: number) => {
    // The click is the last moment the carousel has a box in the flow, so it is
    // the last moment its height can be measured for the anchor to stand in.
    // Rendered in the same commit as showModal(), one frame: the document grows
    // by the anchor as the dialog leaves the flow, so the page's scroll position
    // is never clamped by a shorter document, and the visitor stays put.
    if (dialog.current) setStandby(dialog.current.offsetHeight)
    targetRef.current = photo
    indexRef.current = photo
    setIndex(photo)
    setViewer(true)
  }, [])

  const scrollToPhoto = useCallback(
    (photo: number) => {
      const scroller = track.current
      if (!scroller) return
      // A move is aimed at a photo, not at a delta: the smooth scroll passes
      // every photo in between, and a second press replaces the animation
      // mid-flight, so a delta would land between slides. An absolute offset
      // lands on the slide, and the counter lands on it at once.
      const target = Math.min(photos.length - 1, Math.max(0, photo))
      targetRef.current = target
      indexRef.current = target
      setIndex(target)
      setAtEnd(target === photos.length - 1)
      // The global reduced-motion rule only catches CSS smooth scrolling.
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)')
        .matches
      scroller.scrollTo({
        left: target * scroller.clientWidth,
        behavior: smooth ? 'smooth' : 'auto',
      })
    },
    [photos.length],
  )

  const scrollBySlide = useCallback(
    (direction: 1 | -1) => scrollToPhoto(indexRef.current + direction),
    [scrollToPhoto],
  )

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Escape belongs to the dialog; it closes the viewer on its own.
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
    <>
      <dialog
        ref={dialog}
        className="gallery"
        aria-label={label}
        // The same element is the carousel in flow and the modal the visitor is
        // dropped into, so it names itself for the state it is in.
        role={viewer ? 'dialog' : 'region'}
        aria-roledescription={viewer ? 'photo viewer' : 'carousel'}
        // PointerSnare hides the native cursor everywhere except over a
        // snare-worthy element, so the viewer's zoom-out cursor needs the dialog
        // itself to qualify. Never data-snare-group: it wins the closest()
        // search and the slides inside it would stop snaring on their own.
        data-snare={viewer ? '' : null}
        tabIndex={-1}
        onClose={() => {
          setViewer(false)
          setStandby(0)
        }}
        // Anywhere in the viewer closes it; the arrows stop the click from
        // reaching here.
        onClick={() => {
          if (viewer) setViewer(false)
        }}
        onKeyDown={onKeyDown}
      >
        <div className="gallery-frame">
          <div
            ref={track}
            className="gallery-track"
            role="group"
            aria-roledescription="carousel"
          >
            {photos.map((photo, i) => (
              <button
                className="gallery-slide"
                key={photo.id}
                // A button in a dialog is a submit button by default, and
                // submitting closes the dialog: navigation would close the
                // viewer.
                type="button"
                data-snare
                // Roving: the carousel is one tab stop, on the slide you are on,
                // plus the two arrows.
                tabIndex={i === index ? 0 : -1}
                onClick={() => {
                  if (viewer) setViewer(false)
                  else openViewer(i)
                }}
              >
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
              </button>
            ))}
          </div>
          {!single && (
            <>
              <button
                className="gallery-button gallery-button--prev"
                type="button"
                aria-label="Previous photo"
                disabled={index === 0}
                onClick={(event) => {
                  event.stopPropagation()
                  scrollBySlide(-1)
                }}
              >
                <MaterialIcon name="arrow_left" />
              </button>
              <button
                className="gallery-button gallery-button--next"
                type="button"
                aria-label="Next photo"
                disabled={atEnd}
                onClick={(event) => {
                  event.stopPropagation()
                  scrollBySlide(1)
                }}
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
      </dialog>

      {/* The anchor is the carousel's standing room in the flow: a dialog in
       the top layer has no box there, so a page scrolled to the bottom would
       clamp to the collapsed document. React grows the document by the anchor
       in the same commit that calls showModal(), so the page's scroll position
       is never out of range. The carousel's block margins travel with it. */}
      <div
        className="gallery-anchor"
        style={standby ? { display: 'block', height: standby } : undefined}
        aria-hidden="true"
      />
    </>
  )
}
