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
  // The carousel's in-flow height, for the anchor while the dialog is in the
  // top layer; 0 means the carousel is in flow.
  const [standby, setStandby] = useState(0)
  // Live index, readable from effects that run a frame after the state.
  const indexRef = useRef(0)
  // The photo a scripted move has aimed the track at, and is waiting for it to
  // reach; null while the visitor drives the track.
  const targetRef = useRef<number | null>(null)
  // While a top-layer move is placing the track, the track is the Gallery's:
  // its echoes land at widths the index was not meant for, and the align loop
  // lands the index itself on release.
  const aligning = useRef(false)

  // The photo under the track's start edge. A scripted move takes one echo:
  // its own stop. The photos it passes on the way, and the top layer's reset
  // on the way in and out, are not the visitor's photo; swipes are the
  // track's to report.
  const measure = useCallback(() => {
    // The align loop owns the track and lands the index on release.
    if (aligning.current) return
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
    // scrollend is the arrival the Gallery aims at: it lands the counter where
    // the animation ended. Without it, the scripted writes clear the aim.
    const settles = 'onscrollend' in window
    if (settles)
      scroller.addEventListener('scrollend', onScroll, { passive: true })
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      if (settles) scroller.removeEventListener('scrollend', onScroll)
    }
  }, [measure])

  // The top layer restyles the track: entering resets the scroller, leaving
  // relayouts viewport-wide slides to content-wide ones, and scroll-snap
  // carries the viewer's offset to the nearest slide. So the viewer's photo
  // has to be written back at the page's new width, and the browser's echoes
  // land at widths the index was not meant for: the loop owns the track, aims
  // at the live target (armed before the top layer moved anything), writes the
  // offset at every width it finds, and releases only when the width matches
  // the frame before and the track sits on the aimed offset. The index lands
  // on the target at release.
  const alignTrack = useCallback(() => {
    aligning.current = true
    let frame = 0
    let budget = 30
    let prevWidth = 0
    const step = () => {
      const scroller = track.current
      if (!scroller) {
        aligning.current = false
        return
      }
      const aim = targetRef.current ?? indexRef.current
      const width = scroller.clientWidth
      const aimed = aim * width
      // A new width is the relayout landing: nothing measured on it is settled.
      const relaidOut = width !== prevWidth
      prevWidth = width
      const settled = !relaidOut && Math.abs(scroller.scrollLeft - aimed) <= 1
      if (settled || budget-- <= 0) {
        indexRef.current = aim
        setIndex(aim)
        setAtEnd(scroller.scrollLeft >= scroller.scrollWidth - width - 1)
        aligning.current = false
        targetRef.current = null
        return
      }
      scroller.scrollLeft = aimed
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(frame)
      aligning.current = false
    }
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
    // or out of the top layer: on mount a frame would gate swipes for a frame.
    const moved = prevViewer.current !== viewer
    prevViewer.current = viewer
    if (moved) return alignTrack()
  }, [viewer, alignTrack])

  const openViewer = useCallback((photo: number) => {
    // The click is the last moment the carousel has an in-flow box to measure
    // for the anchor. The anchor is rendered in the same commit as showModal(),
    // so the document never shrinks and the visitor's scroll position survives.
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
      // Aimed at a photo, not a delta: a second press replaces the animation
      // mid-flight, so an absolute offset lands on the slide, and the counter
      // lands on it at once.
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
      // Escape closes natively, inside the key press; the relayout leaves the
      // viewer's offset mid-slide and scroll-snap carries it to the next photo
      // before the close event lands. The key press is the last moment the
      // index is the viewer's photo: arm the aim with it, and let Escape go.
      if (event.key === 'Escape') {
        if (viewer) targetRef.current = indexRef.current
        return
      }
      if (event.key === 'ArrowRight' && !atEnd) {
        event.preventDefault()
        scrollBySlide(1)
      } else if (event.key === 'ArrowLeft' && index > 0) {
        event.preventDefault()
        scrollBySlide(-1)
      }
    },
    [atEnd, index, scrollBySlide, viewer],
  )

  if (photos.length === 0) return null

  const single = photos.length === 1

  return (
    <>
      <dialog
        ref={dialog}
        className="gallery"
        aria-label={label}
        // One element, two states: it names itself for the state it is in.
        role={viewer ? 'dialog' : 'region'}
        aria-roledescription={viewer ? 'photo viewer' : 'carousel'}
        // The viewer's zoom-out cursor needs the dialog itself to be
        // snare-worthy. Never data-snare-group: it wins the closest() search
        // and the slides inside would stop snaring on their own.
        // data-snare={viewer ? '' : null}
        tabIndex={-1}
        onClose={() => {
          // Keep an aim armed by Escape's key press; the close event lands
          // after the relayout echoes. A click arms from the photo at hand.
          if (viewer && targetRef.current === null) {
            targetRef.current = indexRef.current
          }
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
        <div className="gallery-frame" data-snare-group>
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
                // A dialog button defaults to submit, and submitting closes
                // the viewer.
                type="button"
                // data-snare
                // Roving: one tab stop, on the slide the counter names.
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
                    // The first slide is the page's LCP candidate.
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

      {/* The anchor is the carousel's standing room in the flow: the dialog in
       the top layer has no box there, and a page scrolled to the bottom would
       clamp to the collapsed document. The carousel's margins travel with it. */}
      <div
        className="gallery-anchor"
        style={standby ? { display: 'block', height: standby } : undefined}
        aria-hidden="true"
      />
    </>
  )
}
