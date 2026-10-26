import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  head: () => ({ meta: [{ title: 'About | Portfolio' }] }),
  component: AboutPage,
})

function AboutPage() {
  return (
    <article className="content-page">
      <p className="eyebrow">About</p>
      <h1>About this portfolio</h1>
      <p className="page-intro">
        A place for the work and the thinking behind it. Browse projects to see
        what was built and how.
      </p>
      <div className="page-actions">
        <Link className="text-link" to="/projects">
          Explore projects
        </Link>
      </div>
    </article>
  )
}
