import type { ComponentType } from 'react'

import portfolioMarkdown from './content/portfolio-2026.md?raw'
import ServerRenderedPortfolio from './content/server-rendered-portfolio'

export type Project = {
  slug: string
  title: string
  summary: string
  body: ProjectBody
}

// A project body is either markdown prose or a React component for custom
// layouts and experiments. Component bodies render with the same page shell
// (title, summary, container width) and never travel through loader data.
export type ProjectBody =
  | { kind: 'markdown'; source: string }
  | { kind: 'component'; component: ComponentType }

// Add an entry here to publish a project at /projects/<slug>. Put the markdown
// file or component in src/content/ and import it above.
export const projects: Project[] = [
  {
    slug: 'portfolio-2026',
    title: 'Portfolio 2026',
    summary: 'A server-rendered portfolio built with TanStack Start and React.',
    body: { kind: 'markdown', source: portfolioMarkdown },
  },
  {
    slug: 'server-rendered-portfolio',
    title: 'Choosing server rendering for the portfolio',
    summary:
      'Why this portfolio uses TanStack Start and the Netlify server adapter instead of a static SPA rewrite.',
    body: { kind: 'component', component: ServerRenderedPortfolio },
  },
]

export function getProject(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug)
}
