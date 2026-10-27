import { createFileRoute, Link, notFound } from '@tanstack/react-router'

import {
  getContentPage,
  sectionLabel,
  sectionPages,
  trimSlashes,
} from '../content'
import { Markdown } from '../markdown'

// One route serves every content page declared in src/content/<section>/
// <slug>.md (or .tsx): /<section>/<slug> renders the page, /<section> renders
// the section listing, anything else is a 404. Static routes (/about, the
// home index) outrank the splat, so they keep their paths.
export const Route = createFileRoute('/$')({
  loader: ({ params }) => {
    // Only serializable fields cross the loader boundary; the body is
    // resolved from the content registry by the page component instead.
    // The router names the splat param `_splat` in this version.
    const path = trimSlashes(params._splat ?? '')
    const page = getContentPage(path)
    if (page) {
      return {
        kind: 'page' as const,
        section: page.section,
        slug: page.slug,
        title: page.title,
      }
    }
    if (!path.includes('/') && sectionPages(path).length > 0) {
      return { kind: 'section' as const, section: path }
    }
    throw notFound()
  },
  head: ({ loaderData }) => {
    const title =
      loaderData?.kind === 'page'
        ? `${loaderData.title} | Portfolio`
        : `${sectionLabel(loaderData?.section ?? '')} | Portfolio`
    return { meta: [{ title }] }
  },
  component: ContentRoute,
})

function ContentRoute() {
  const data = Route.useLoaderData()
  if (data.kind === 'section') return <SectionPage section={data.section} />
  return <ContentPage section={data.section} slug={data.slug} />
}

function ContentPage({ section, slug }: { section: string; slug: string }) {
  const page = getContentPage(`${section}/${slug}`)
  if (!page) return null

  return (
    <article className="content-page">
      <p className="back-link">
        <Link to="/$" params={{ _splat: section }}>
          &larr; {sectionLabel(section)}
        </Link>
      </p>
      <p className="eyebrow">{sectionLabel(page.section)}</p>
      <h1>{page.title}</h1>
      {page.summary && <p className="page-intro">{page.summary}</p>}
      {page.body.kind === 'markdown' ? (
        <Markdown source={page.body.source} />
      ) : (
        <page.body.component />
      )}
    </article>
  )
}

function SectionPage({ section }: { section: string }) {
  const label = sectionLabel(section)
  return (
    <section className="content-page" aria-labelledby="section-title">
      <p className="eyebrow">Portfolio</p>
      <h1 id="section-title">{label}</h1>
      <p className="page-intro">
        Everything published in the {label.toLowerCase()} section.
      </p>
      <ul className="work-list">
        {sectionPages(section).map((page) => (
          <li className="work-card" key={page.slug}>
            <h2>
              <Link to="/$" params={{ _splat: `${page.section}/${page.slug}` }}>
                {page.title}
              </Link>
            </h2>
            <p>{page.summary}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
