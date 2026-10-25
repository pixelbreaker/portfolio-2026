import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <section className="empty-state" aria-labelledby="home-title">
      <h1 id="home-title">Portfolio coming soon</h1>
    </section>
  )
}
