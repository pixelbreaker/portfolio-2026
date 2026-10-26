import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <section className="content-page home-page" aria-labelledby="home-title">
      <p className="eyebrow">Portfolio</p>
      <h1 id="home-title">Work, and the thinking behind it.</h1>
      <p className="page-intro">
        Explore projects, learn about the work, and find out more about this
        portfolio.
      </p>
      <div className="page-actions">
        <Link className="text-link" to="/projects">
          View projects
        </Link>
        <Link className="text-link" to="/about">
          About
        </Link>
      </div>
    </section>
  )
}
