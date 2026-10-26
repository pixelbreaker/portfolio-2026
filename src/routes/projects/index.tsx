import { createFileRoute, Link } from '@tanstack/react-router'

import { projects } from '../../work'

export const Route = createFileRoute('/projects/')({
  head: () => ({ meta: [{ title: 'Projects | Portfolio' }] }),
  component: ProjectsPage,
})

function ProjectsPage() {
  return (
    <section className="content-page" aria-labelledby="projects-title">
      <p className="eyebrow">Selected work</p>
      <h1 id="projects-title">Projects</h1>
      <p className="page-intro">
        A collection of work, each with its own story.
      </p>
      <ul className="work-list">
        {projects.map((project) => (
          <li className="work-card" key={project.slug}>
            <h2>
              <Link to="/projects/$slug" params={{ slug: project.slug }}>
                {project.title}
              </Link>
            </h2>
            <p>{project.summary}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
