// Pages glob their own image folders (import.meta.glob needs a literal
// pattern), and this pairs the renditions with alt.json. alt.json decides
// which photos appear and in what order; a photo missing from either side
// is warned about and left out.

/** The default export of an image imported through imagetools' `as=picture`. */
export type PictureRendition = {
  /** srcset per format, keyed by mime subtype in preference order. */
  sources: Record<string, string>
  /** Fallback in the last-listed format, at the largest width. */
  img: { src: string; w: number; h: number }
}

export type GalleryPhoto = {
  /** Stable React key: the photo's name in alt.json. */
  id: string
  alt: string
  sources: Record<string, string>
  img: { src: string; w: number; h: number }
}

/**
 * Pairs `renditions` with `alts`, in alt.json key order. File names match
 * case-insensitively.
 */
export function galleryPhotos(
  renditions: Record<string, PictureRendition>,
  alts: Record<string, string>,
): GalleryPhoto[] {
  // alt.json name (lower-cased) -> glob key.
  const files = new Map<string, string>()
  for (const key of Object.keys(renditions)) {
    const file = key.slice(key.lastIndexOf('/') + 1)
    files.set(file.toLowerCase(), key)
  }

  const photos: GalleryPhoto[] = []
  const shown = new Set<string>()

  for (const [name, alt] of Object.entries(alts)) {
    const key = files.get(name.toLowerCase())
    if (!key) {
      console.warn(`gallery: ${name} is in alt.json but not in the folder`)
      continue
    }
    shown.add(key)
    const rendition = renditions[key]
    photos.push({
      id: name,
      alt,
      sources: rendition.sources,
      img: rendition.img,
    })
  }

  for (const [name, key] of files) {
    if (!shown.has(key)) {
      console.warn(`gallery: ${name} has no alt.json entry, so it is not shown`)
    }
  }

  return photos
}
