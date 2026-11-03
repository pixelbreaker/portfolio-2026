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
Full site migration from monolith to composable commerce: the storefront's
core shopping pages were rebuilt on the new stack, each template cut over one
at a time.

Prose lives in the \`Markdown\` component, the photographs in the
\`Gallery\` between them, so a page can carry both without a second template.
`}
      />
      <Gallery
        label="Screenshots from the Rapha.cc migration"
        photos={galleryPhotos(renditions, alt)}
        aspect="5 / 4"
      />
      <Markdown
        source={`
## The screens

| Screen    | Path          | What the page carries                        |
| --------- | ------------- | -------------------------------------------- |
| Home      | \`01_home\`      | Campaign hero, product rows, category entries |
| Listing   | \`02_plp\`       | Category tabs, filters, sort, product grid   |
| Product   | \`03_pdp\`       | Image gallery, price, colour and size choices |
| Editorial | \`04_editorial\` | Article headline, standfirst, photographs    |

## Write the story here

The headings above are placeholders for the project write-up: the problem,
the approach, what shipped, and what it changed.
`}
      />
    </>
  )
}
