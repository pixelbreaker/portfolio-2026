import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Gallery } from './Gallery'
import type { GalleryPhoto } from './photos'

const photo = (id: string, alt: string): GalleryPhoto => ({
  id,
  alt,
  sources: {
    avif: `/img/${id}-640.avif 640w, /img/${id}-1280.avif 1280w`,
    webp: `/img/${id}-640.webp 640w, /img/${id}-1280.webp 1280w`,
    jpeg: `/img/${id}-640.jpg 640w, /img/${id}-1280.jpg 1280w`,
  },
  img: { src: `/img/${id}-1280.jpg`, w: 1280, h: 853 },
})

const photos = [
  photo('lake', 'Turquoise mountain lake'),
  photo('moose', 'Two moose in a meadow'),
  photo('peaks', 'Peaks above a forested valley'),
]

const slideWidth = 1000
let slides = 0
let scrollLeft = 0
// Every scripted scroll the Gallery asks for, in order.
let scrolls: { left: number; behavior: ScrollBehavior }[]

const computed = window.getComputedStyle.bind(window)

// jsdom lays out at zero, leaving no scroll extent and both buttons disabled.
// These shims give the scroller real geometry and record its scripted scrolls.
beforeEach(() => {
  slides = 0
  scrollLeft = 0
  scrolls = []
  Object.defineProperties(HTMLElement.prototype, {
    // The anchor measures the carousel's box.
    offsetHeight: { configurable: true, get: () => 768 },
  })
  Object.defineProperties(Element.prototype, {
    clientWidth: { configurable: true, get: () => slideWidth },
    scrollWidth: { configurable: true, get: () => slides * slideWidth },
    scrollLeft: {
      configurable: true,
      get: () => scrollLeft,
      set: (value: number) => {
        scrollLeft = value
      },
    },
    // jsdom ships no element scrolling. The scripted move steps through the
    // photos, as a smooth scroll does, so the echoes on the way arrive.
    scrollTo: {
      configurable: true,
      writable: true,
      value(options: { left: number; behavior: ScrollBehavior }) {
        scrolls.push(options)
        const to = Math.max(
          0,
          Math.min((slides - 1) * slideWidth, options.left),
        )
        const step = slideWidth / 2
        while (scrollLeft !== to) {
          scrollLeft =
            to > scrollLeft
              ? Math.min(to, scrollLeft + step)
              : Math.max(to, scrollLeft - step)
          this.dispatchEvent(new Event('scroll'))
        }
      },
    },
  })
})

// jsdom has no <dialog> show/close plumbing and hides a closed one. Shim both:
// `open`, the bubbling close event and the accessibility tree behave like a
// browser's, and the author sheet's paint for a closed carousel is honoured.
beforeEach(() => {
  vi.spyOn(window, 'getComputedStyle').mockImplementation(
    (element: Element, pseudo?: string | null) =>
      element instanceof HTMLDialogElement && !element.open && !pseudo
        ? ({ display: 'block', visibility: 'visible' } as CSSStyleDeclaration)
        : computed(element, pseudo),
  )
  Object.defineProperties(window.HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value: function showModal(this: HTMLDialogElement) {
        this.open = true
      },
    },
    close: {
      configurable: true,
      value: function close(this: HTMLDialogElement) {
        if (!this.open) return
        this.open = false
        // The real close event bubbles, which is how React's listener sees it.
        this.dispatchEvent(new Event('close', { bubbles: true }))
      },
    },
  })
})

// Installed per test, taken off again, leaving the prototype as shipped.
const dialogShimKeys = ['showModal', 'close'] as const

afterEach(() => {
  vi.restoreAllMocks()
  for (const key of dialogShimKeys) {
    Reflect.deleteProperty(window.HTMLDialogElement.prototype, key)
  }
  cleanup()
})

function renderGallery(list: GalleryPhoto[], label = 'Album') {
  slides = list.length
  return render(<Gallery photos={list} label={label} />)
}

function trackOf(container: HTMLElement) {
  const track = container.querySelector<HTMLElement>('.gallery-track')
  if (!track) throw new Error('gallery track missing')
  return track
}

const prev = () =>
  screen.getByRole('button', { name: 'Previous photo' }) as HTMLButtonElement
const next = () =>
  screen.getByRole('button', { name: 'Next photo' }) as HTMLButtonElement

function galleryOf(container: HTMLElement) {
  const gallery = container.querySelector<HTMLDialogElement>('.gallery')
  if (!gallery) throw new Error('gallery dialog missing')
  return gallery
}

// The counter follows the track, so a test on a slide puts the scroller there.
function scrollToSlide(container: HTMLElement, photo: number) {
  scrollLeft = photo * slideWidth
  fireEvent.scroll(trackOf(container))
}

function slideButtons(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLButtonElement>('.gallery-slide')]
}

describe('Gallery', () => {
  it('renders one picture per photo with avif and webp before the fallback', () => {
    const { container } = renderGallery(photos, 'Photographs from Canada, 2026')

    const pictures = container.querySelectorAll('picture')
    expect(pictures).toHaveLength(3)

    const sources = pictures[0].querySelectorAll('source')
    expect(sources).toHaveLength(3)
    expect([...sources].map((s) => s.getAttribute('type'))).toEqual([
      'image/avif',
      'image/webp',
      'image/jpeg',
    ])
    expect(sources[0].getAttribute('srcset')).toContain('/img/lake-1280.avif')
    // sizes has to agree with the CSS box or the browser mispicks a rendition.
    expect(sources[0].getAttribute('sizes')).toBe(
      '(min-width: 72rem) 72rem, 100vw',
    )

    const img = pictures[0].querySelector('img')
    expect(img?.getAttribute('src')).toBe('/img/lake-1280.jpg')
    expect(img?.getAttribute('alt')).toBe('Turquoise mountain lake')
    // Intrinsic dimensions reserve the slide box, so nothing jumps on decode.
    expect(img?.getAttribute('width')).toBe('1280')
    expect(img?.getAttribute('height')).toBe('853')
  })

  it('loads only the first slide eagerly, at high priority', () => {
    const { container } = renderGallery(photos)

    const imgs = [...container.querySelectorAll('img')]
    expect(imgs[0].getAttribute('loading')).toBe('eager')
    expect(imgs[0].getAttribute('fetchpriority')).toBe('high')
    expect(imgs.slice(1).map((el) => el.getAttribute('loading'))).toEqual([
      'lazy',
      'lazy',
    ])
    expect(imgs.slice(1).map((el) => el.getAttribute('fetchpriority'))).toEqual(
      ['auto', 'auto'],
    )
  })

  it('makes only the slide under the counter a tab stop', () => {
    const { container } = renderGallery(photos)

    expect(slideButtons(container).map((b) => b.tabIndex)).toEqual([0, -1, -1])
  })

  it('opens the viewer on the clicked photo, leaving one tab stop', () => {
    const { container } = renderGallery(photos)
    const gallery = galleryOf(container)
    scrollToSlide(container, 1)

    fireEvent.click(slideButtons(container)[1])

    expect(gallery.open).toBe(true)
    // The viewer opens on the clicked slide: no scroll to be at home.
    expect(screen.getByText('2 / 3')).toBeTruthy()
    expect(slideButtons(container).map((b) => b.tabIndex)).toEqual([-1, 0, -1])
    // The viewer's zoom-out cursor makes dialog and slide snare-worthy.
    expect(gallery.hasAttribute('data-snare')).toBe(true)
    expect(slideButtons(container)[1].hasAttribute('data-snare')).toBe(true)
  })

  it('stands in for the carousel in the flow while the viewer is open', () => {
    const { container } = renderGallery(photos)
    const anchor = container.querySelector<HTMLElement>('.gallery-anchor')
    if (!anchor) throw new Error('gallery anchor missing')
    // The carousel has its own box in the flow, so the anchor takes none.
    expect(anchor.style.display).toBe('')

    fireEvent.click(slideButtons(container)[1])

    // Top layer has no box in the flow: the anchor takes the measured height,
    // so the document never shrinks and the scroll position is never clamped.
    expect(anchor.style.display).toBe('block')
    expect(anchor.style.height).toBe('768px')

    fireEvent.click(slideButtons(container)[1])

    expect(anchor.style.display).toBe('')
  })

  it('closes when the photo is clicked again, and when the letterbox is', () => {
    const { container } = renderGallery(photos)
    const gallery = galleryOf(container)

    fireEvent.click(slideButtons(container)[1])
    fireEvent.click(slideButtons(container)[1])
    expect(gallery.open).toBe(false)

    fireEvent.click(slideButtons(container)[0])
    fireEvent.click(gallery)
    expect(gallery.open).toBe(false)
  })

  it('closes on the close event, which is how Escape reaches the Gallery', () => {
    const { container } = renderGallery(photos)
    const gallery = galleryOf(container)

    fireEvent.click(slideButtons(container)[1])
    expect(gallery.open).toBe(true)

    // Escape is the dialog's; the Gallery only hears the close event, outside
    // React's hands, so its state needs a flush.
    act(() => gallery.close())
    expect(gallery.open).toBe(false)
    // Viewer-only attributes gone: a closed carousel is not snare-worthy.
    expect(gallery.hasAttribute('data-snare')).toBe(false)
    expect(gallery.getAttribute('aria-roledescription')).toBe('carousel')
  })

  it('walks the counter forward and disables each button at its end', () => {
    renderGallery(photos)

    expect(prev().disabled).toBe(true)
    expect(next().disabled).toBe(false)
    expect(screen.getByText('1 / 3')).toBeTruthy()

    fireEvent.click(next())
    expect(prev().disabled).toBe(false)
    expect(screen.getByText('2 / 3')).toBeTruthy()

    fireEvent.click(next())
    expect(screen.getByText('3 / 3')).toBeTruthy()
    expect(next().disabled).toBe(true)

    // Clicking a button that is disabled cannot walk past the last photo.
    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }))
    expect(screen.getByText('3 / 3')).toBeTruthy()
    expect(scrolls).toHaveLength(2)
  })

  it('navigates from the arrows inside the viewer without closing it', () => {
    const { container } = renderGallery(photos)
    const gallery = galleryOf(container)
    scrollToSlide(container, 1)

    fireEvent.click(slideButtons(container)[1])
    fireEvent.click(next())

    expect(gallery.open).toBe(true)
    // Aimed at a slide, not a delta: the offset lands there from wherever.
    expect(scrolls).toEqual([{ left: 2 * slideWidth, behavior: 'smooth' }])
    expect(screen.getByText('3 / 3')).toBeTruthy()
  })

  it('walks the viewer with the arrow keys and leaves it on Escape', () => {
    const { container } = renderGallery(photos)
    const gallery = galleryOf(container)
    scrollToSlide(container, 1)

    fireEvent.click(slideButtons(container)[1])
    // In the viewer the handler is on the dialog: focus lives inside it.
    fireEvent.keyDown(gallery, { key: 'ArrowRight' })
    expect(gallery.open).toBe(true)
    expect(scrolls).toEqual([{ left: 2 * slideWidth, behavior: 'smooth' }])
    expect(screen.getByText('3 / 3')).toBeTruthy()

    fireEvent.keyDown(gallery, { key: 'Escape' })
    // The dialog closes itself; the Gallery only reacts to the close event.
    act(() => gallery.close())
    expect(gallery.open).toBe(false)
  })

  it('lands on the photo the viewer ended on, Escape closed mid-move', () => {
    // The index lands in a frame; capture the frames to run on demand.
    const frames: FrameRequestCallback[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.push(cb as FrameRequestCallback)
      return frames.length
    })
    const { container } = renderGallery(photos)
    const gallery = galleryOf(container)
    scrollToSlide(container, 1)

    fireEvent.click(slideButtons(container)[1])
    fireEvent.click(next())
    // The counter follows the aim, not the flight: photo 3 mid-scroll.
    expect(screen.getByText('3 / 3')).toBeTruthy()

    // Escape mid-move: leaving the top layer resets the scroller, and that
    // echo is not the visitor's photo.
    act(() => gallery.close())
    scrollLeft = 0
    fireEvent.scroll(trackOf(container))
    expect(screen.getByText('3 / 3')).toBeTruthy()

    // The frame writes the index back at the carousel's slide width.
    frames.splice(0, frames.length).forEach((cb) => act(() => cb(0)))
    expect(scrollLeft).toBe(2 * slideWidth)
    expect(screen.getByText('3 / 3')).toBeTruthy()
  })

  it('lands on the photo the viewer ended on, Escape closed with the track snapped', () => {
    // Escape reaches the dialog as a key press, before the native close.
    // Leaving the top layer relayouts viewport-wide slides to content-wide
    // ones, and scroll-snap carries the viewer's offset to the nearest slide:
    // at a 1512px viewport and 1152px content width, 3024px becomes 2.625
    // slides, so the snap's echo reports the photo after the visitor's. Four
    // photos give the snap an echo to report.
    const four = [...photos, photo('fall', 'Fall colours over a valley')]
    const frames: FrameRequestCallback[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.push(cb as FrameRequestCallback)
      return frames.length
    })
    const { container } = renderGallery(four)
    const gallery = galleryOf(container)
    scrollToSlide(container, 1)

    fireEvent.click(slideButtons(container)[1])
    fireEvent.keyDown(gallery, { key: 'ArrowRight' })
    expect(screen.getByText('3 / 4')).toBeTruthy()

    // Escape's key press arms the aim. The native close lands after the
    // relayout's snap echo.
    scrollLeft = 3 * slideWidth
    fireEvent.scroll(trackOf(container))
    expect(screen.getByText('3 / 4')).toBeTruthy()
    act(() => gallery.close())

    frames.splice(0, frames.length).forEach((cb) => act(() => cb(0)))
    expect(scrollLeft).toBe(2 * slideWidth)
    expect(screen.getByText('3 / 4')).toBeTruthy()
  })

  it('scrolls exactly one slide per press, from buttons and arrow keys', () => {
    const { container } = renderGallery(photos)
    const track = trackOf(container)

    fireEvent.click(next())
    expect(scrolls.at(-1)).toEqual({ left: slideWidth, behavior: 'smooth' })

    fireEvent.keyDown(track, { key: 'ArrowRight' })
    expect(scrolls.at(-1)).toEqual({ left: 2 * slideWidth, behavior: 'smooth' })

    fireEvent.keyDown(track, { key: 'ArrowLeft' })
    expect(scrolls.at(-1)).toEqual({ left: slideWidth, behavior: 'smooth' })
    expect(screen.getByText('2 / 3')).toBeTruthy()
  })

  it('ignores the arrow key that points past the end of the track', () => {
    const { container } = renderGallery(photos)
    const track = trackOf(container)

    scrollLeft = 2 * slideWidth
    fireEvent.scroll(track)
    expect(screen.getByText('3 / 3')).toBeTruthy()

    fireEvent.keyDown(track, { key: 'ArrowRight' })
    expect(scrolls).toHaveLength(0)
  })

  it('scrolls instantly when reduced motion is requested', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query.includes('reduced-motion'),
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => false,
        }) as unknown as MediaQueryList,
    )
    renderGallery(photos)

    fireEvent.click(next())
    expect(scrolls.at(-1)).toEqual({ left: slideWidth, behavior: 'auto' })
  })

  it('hides the arrows and counter for a single photo, which still opens', () => {
    const { container } = renderGallery([photos[0]])
    const gallery = galleryOf(container)

    expect(screen.queryByRole('button', { name: 'Next photo' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Previous photo' })).toBeNull()
    expect(container.querySelector('.gallery-counter')).toBeNull()
    expect(container.querySelectorAll('img')).toHaveLength(1)

    fireEvent.click(slideButtons(container)[0])
    expect(gallery.open).toBe(true)
  })

  it('renders nothing when no photo survives pairing with alt.json', () => {
    const { container } = renderGallery([])

    expect(container.firstChild).toBeNull()
  })

  it('names the carousel and the viewer with the given name', () => {
    const { container } = renderGallery(photos, 'Album')
    const gallery = galleryOf(container)

    expect(gallery.getAttribute('aria-label')).toBe('Album')
    expect(gallery.getAttribute('aria-roledescription')).toBe('carousel')

    fireEvent.click(slideButtons(container)[0])
    // The same element is the viewer now: a screen reader is told so.
    expect(gallery.getAttribute('role')).toBe('dialog')
    expect(gallery.getAttribute('aria-roledescription')).toBe('photo viewer')
  })
})
