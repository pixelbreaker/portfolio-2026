import { createFileRoute, Link, notFound } from '@tanstack/react-router'

import { projects } from '../../work'

export const Route = createFileRoute('/projects/$slug')({
  loader: ({ params }) => {
    const project = projects.find((entry) => entry.slug === params.slug)
    if (!project) throw notFound()
    return project
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.title ?? 'Project'} | Portfolio` }],
  }),
  component: ProjectPage,
})

function ProjectPage() {
  const project = Route.useLoaderData()

  return (
    <article className="content-page">
      <p className="back-link">
        <Link to="/projects">← All projects</Link>
      </p>
      <p className="eyebrow">Project</p>
      <h1>{project.title}</h1>
      <p className="page-intro">{project.summary}</p>
      {project.sections.map((section) => (
        <section className="work-section" key={section.heading}>
          <h2>{section.heading}</h2>
          <p>{section.body}</p>
        </section>
      ))}
    </article>
  )
}
