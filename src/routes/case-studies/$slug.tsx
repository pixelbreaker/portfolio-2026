import { createFileRoute, Link, notFound } from '@tanstack/react-router'

import { caseStudies } from '../../work'

export const Route = createFileRoute('/case-studies/$slug')({
  loader: ({ params }) => {
    const study = caseStudies.find((entry) => entry.slug === params.slug)
    if (!study) throw notFound()
    return study
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.title ?? 'Case Study'} | Portfolio` }],
  }),
  component: CaseStudyPage,
})

function CaseStudyPage() {
  const study = Route.useLoaderData()

  return (
    <article className="content-page">
      <p className="back-link">
        <Link to="/case-studies">← All case studies</Link>
      </p>
      <p className="eyebrow">Case study</p>
      <h1>{study.title}</h1>
      <p className="page-intro">{study.summary}</p>
      {study.sections.map((section) => (
        <section className="work-section" key={section.heading}>
          <h2>{section.heading}</h2>
          <p>{section.body}</p>
        </section>
      ))}
    </article>
  )
}
