export type WorkEntry = {
  slug: string
  title: string
  summary: string
  sections: { heading: string; body: string }[]
}

// Add entries here to publish new projects and case studies at their slug URLs.
export const projects: WorkEntry[] = [
  {
    slug: 'portfolio-2026',
    title: 'Portfolio 2026',
    summary: 'A server-rendered portfolio built with TanStack Start and React.',
    sections: [
      {
        heading: 'What it is',
        body: 'This portfolio brings projects and case studies together in a single place, with a page for each piece of work.',
      },
      {
        heading: 'How it works',
        body: 'TanStack Start handles file-based routing and server-rendered requests. The site includes a theme preference that follows the system setting unless a visitor chooses otherwise.',
      },
    ],
  },
]

export const caseStudies: WorkEntry[] = [
  {
    slug: 'server-rendered-portfolio',
    title: 'Choosing server rendering for the portfolio',
    summary:
      'Why this portfolio uses TanStack Start and the Netlify server adapter instead of a static SPA rewrite.',
    sections: [
      {
        heading: 'The decision',
        body: 'The portfolio serves document requests through TanStack Start. Netlify publishes the client assets while routing runtime requests through its server function.',
      },
      {
        heading: 'The tradeoff',
        body: 'A static single-page app rewrite would be simpler, but it would give up server-rendered document requests and the option to add server routes later. The server adapter preserves both.',
      },
    ],
  },
]
