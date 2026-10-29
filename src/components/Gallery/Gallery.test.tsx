import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

// jsdom lays everything out at zero, which would leave the Gallery with no
// scroll extent to measure and both buttons disabled. These shims give the
// scroller real geometry to work against and record its scrollBy calls.
beforeEach(() => {
  slides = 0
  scrollLeft = 0
  scrolls = []
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
    scrollBy: {
      configurable: true,
      writable: true,
      value(options: { left: number; behavior: ScrollBehavior }) {
        scrolls.push(options)
        scrollLeft = Math.max(
          0,
          Math.min((slides - 1) * slideWidth, scrollLeft + options.left),
        )
        this.dispatchEvent(new Event('scroll'))
      },
    },
  })
})

afterEach(() => {
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

  it('scrolls exactly one slide per press, from buttons and arrow keys', () => {
    const { container } = renderGallery(photos)
    const track = trackOf(container)

    fireEvent.click(next())
    expect(scrolls.at(-1)).toEqual({ left: slideWidth, behavior: 'smooth' })

    fireEvent.keyDown(track, { key: 'ArrowRight' })
    expect(scrolls.at(-1)).toEqual({ left: slideWidth, behavior: 'smooth' })

    fireEvent.keyDown(track, { key: 'ArrowLeft' })
    expect(scrolls.at(-1)).toEqual({ left: -slideWidth, behavior: 'smooth' })
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

  it('hides the buttons and counter for a single photo', () => {
    const { container } = renderGallery([photos[0]])

    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(container.querySelector('.gallery-counter')).toBeNull()
    expect(trackOf(container).tabIndex).toBe(-1)
    expect(container.querySelectorAll('img')).toHaveLength(1)
  })

  it('renders nothing when no photo survives pairing with alt.json', () => {
    const { container } = renderGallery([])

    expect(container.firstChild).toBeNull()
  })

  it('labels the gallery with the given name', () => {
    const { container } = renderGallery(photos, 'Album')

    const gallery = container.querySelector<HTMLElement>('.gallery')
    expect(gallery?.getAttribute('aria-label')).toBe('Album')
  })
})
