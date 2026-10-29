import { Gallery } from '../../components/Gallery'
import {
  galleryPhotos,
  type PictureRendition,
} from '../../components/Gallery/photos'

import alt from './canada-2026/alt.json'

// Five renditions in three formats per photo; the widths must match the
// Gallery's sizes attribute, and the last format becomes the <img> fallback.
const renditions = import.meta.glob<PictureRendition>(
  './canada-2026/*.{jpeg,jpg}',
  {
    eager: true,
    import: 'default',
    query: '?format=avif;webp;jpg&w=640;960;1280;1600;2400&as=picture',
  },
)

export const title = 'Canada, 2026'
export const summary =
  'Mountain lakes, forest roads and meadow wildlife from a 2026 trip through Canada.'

export default function Canada2026() {
  return (
    <Gallery
      label="Photographs from Canada, 2026"
      photos={galleryPhotos(renditions, alt)}
    />
  )
}
