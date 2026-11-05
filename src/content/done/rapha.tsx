// A component content page mixing prose and a Gallery: the Markdown component
// renders the prose, so the .tsx page reads like the .md pages around it.
import { Gallery } from '../../components/Gallery'
import {
  galleryPhotos,
  type PictureRendition,
} from '../../components/Gallery/photos'
import { Markdown } from '../../markdown'

import alt from './rapha/alt.json'

export const published = '2026-11-01'

// The screenshots are 1280 wide, so the rendition widths stop there;
// `withoutEnlargement` keeps sharp from inventing pixels, and png is the last
// format, so it becomes the <img> fallback.
const renditions = import.meta.glob<PictureRendition>('./rapha/*.png', {
  eager: true,
  import: 'default',
  query: '?format=avif;webp;png&w=640;960;1280&withoutEnlargement&as=picture',
})

export const title = 'Rapha.cc website'
export const summary =
  'Full site migration from monolith to composable commerce.'

export default function Rapha() {
  return (
    <>
      <Markdown
        source={`
Full site migration from Java monolith to composable commerce full TypeScript stack. Lead the project right from switching to a central monorepo setup with NX through to reimplementation of existing functionality with multiple third party SaaS systems.
`}
      />
      <Gallery
        label="Screenshots from the Rapha.cc migration"
        photos={galleryPhotos(renditions, alt)}
        aspect="5 / 4"
      />
      <Markdown
        source={`
## The Process


`}
      />
    </>
  )
}
