import { createFileRoute, Link } from '@tanstack/react-router'

import { caseStudies } from '../../work'

export const Route = createFileRoute('/case-studies/')({
  head: () => ({ meta: [{ title: 'Case Studies | Portfolio' }] }),
  component: CaseStudiesPage,
})

function CaseStudiesPage() {
  return (
    <section className="content-page" aria-labelledby="case-studies-title">
      <p className="eyebrow">The thinking behind the work</p>
      <h1 id="case-studies-title">Case studies</h1>
      <p className="page-intro">
        A closer look at the decisions and tradeoffs behind selected work.
      </p>
      <ul className="work-list">
        {caseStudies.map((study) => (
          <li className="work-card" key={study.slug}>
            <h2>
              <Link to="/case-studies/$slug" params={{ slug: study.slug }}>
                {study.title}
              </Link>
            </h2>
            <p>{study.summary}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
