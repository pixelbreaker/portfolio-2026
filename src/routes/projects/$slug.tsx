import { createFileRoute, Link, notFound } from '@tanstack/react-router'

import { Markdown } from '../../markdown'
import { getProject } from '../../work'

export const Route = createFileRoute('/projects/$slug')({
  loader: ({ params }) => {
    // Only serializable fields cross the loader boundary; the component body
    // is resolved from the registry by the page component instead.
    const project = getProject(params.slug)
    if (!project) throw notFound()
    return { slug: project.slug, title: project.title }
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.title ?? 'Project'} | Portfolio` }],
  }),
  component: ProjectPage,
})

function ProjectPage() {
  const { slug } = Route.useParams()
  const { title } = Route.useLoaderData()
  const project = getProject(slug)
  if (!project) return null

  return (
    <article className="content-page">
      <p className="back-link">
        <Link to="/projects">← All projects</Link>
      </p>
      <p className="eyebrow">Project</p>
      <h1>{title}</h1>
      <p className="page-intro">{project.summary}</p>
      {project.body.kind === 'markdown' ? (
        <Markdown source={project.body.source} />
      ) : (
        <project.body.component />
      )}
    </article>
  )
}
