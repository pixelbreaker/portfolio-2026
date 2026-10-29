import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest'

import { galleryPhotos, type PictureRendition } from './photos'

const picture = (marker: string): PictureRendition => ({
  sources: { avif: `${marker}-avif 640w`, jpeg: `${marker}.jpg 640w` },
  img: { src: `${marker}.jpg`, w: 640, h: 427 },
})

let warn: MockInstance

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('galleryPhotos', () => {
  it('orders photos by alt.json key order, not folder order', () => {
    const photos = galleryPhotos(
      {
        './lake.jpeg': picture('lake'),
        './moose.jpeg': picture('moose'),
        './road.jpeg': picture('road'),
      },
      {
        'moose.jpeg': 'Two moose in a meadow',
        'lake.jpeg': 'Turquoise lake',
        'road.jpeg': 'Gravel road',
      },
    )

    expect(photos.map((photo) => photo.id)).toEqual([
      'moose.jpeg',
      'lake.jpeg',
      'road.jpeg',
    ])
    expect(photos[0].alt).toBe('Two moose in a meadow')
    expect(photos[0].img.src).toBe('moose.jpg')
    expect(photos[0].sources.avif).toBe('moose-avif 640w')
    expect(warn).not.toHaveBeenCalled()
  })

  it('matches folder names case-insensitively', () => {
    const photos = galleryPhotos(
      { './DSC00709.JPEG': picture('dsc') },
      { 'dsc00709.jpeg': 'Lake' },
    )

    expect(photos).toHaveLength(1)
    expect(photos[0].id).toBe('dsc00709.jpeg')
    expect(photos[0].img.src).toBe('dsc.jpg')
    expect(warn).not.toHaveBeenCalled()
  })

  it('drops an alt.json entry with no file and warns', () => {
    const photos = galleryPhotos(
      { './lake.jpeg': picture('lake') },
      {
        'lake.jpeg': 'Turquoise lake',
        'gone.jpeg': 'Photo that was deleted',
      },
    )

    expect(photos.map((photo) => photo.id)).toEqual(['lake.jpeg'])
    expect(warn.mock.calls.map(([message]) => message)).toEqual([
      expect.stringContaining('gone.jpeg'),
    ])
  })

  it('drops a file with no alt.json entry and warns', () => {
    const photos = galleryPhotos(
      { './lake.jpeg': picture('lake'), './blunder.jpeg': picture('blunder') },
      { 'lake.jpeg': 'Turquoise lake' },
    )

    expect(photos.map((photo) => photo.id)).toEqual(['lake.jpeg'])
    expect(warn.mock.calls.map(([message]) => message)).toEqual([
      expect.stringContaining('blunder.jpeg'),
    ])
  })

  it('returns nothing when the folder and alt.json are both empty', () => {
    expect(galleryPhotos({}, {})).toEqual([])
    expect(warn).not.toHaveBeenCalled()
  })
})
