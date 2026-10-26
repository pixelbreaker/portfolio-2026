import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router'
import { renderToStaticMarkup } from 'react-dom/server'
import { within } from '@testing-library/dom'
import { describe, expect, it } from 'vitest'

import { routeTree } from '../routeTree.gen'

// Production serves these pages as server-rendered HTML documents, so the
// tests go through the same path: resolve the route, then render the router
// to a string. The root route returns a full <html> document, which cannot
// client-render into a jsdom div.
async function renderProjectPage(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  await router.load()
  const html = renderToStaticMarkup(<RouterProvider router={router} />)

  const container = document.createElement('div')
  container.innerHTML = html
  return within(container)
}

describe('project pages', () => {
  it('renders a markdown project with its title, summary, and markdown body', async () => {
    const page = await renderProjectPage('/projects/portfolio-2026')

    expect(
      page.getByRole('heading', { level: 1, name: 'Portfolio 2026' }),
    ).toBeTruthy()
    expect(
      page.getByRole('heading', { level: 2, name: 'What it is' }),
    ).toBeTruthy()
    expect(
      page.getByText(/server-rendered portfolio built with TanStack Start/),
    ).toBeTruthy()
    // GFM table from src/content/portfolio-2026.md must reach the DOM.
    expect(page.getByRole('table')).toBeTruthy()
  })

  it('renders a component project with its title and component layout', async () => {
    const page = await renderProjectPage('/projects/server-rendered-portfolio')

    expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Choosing server rendering for the portfolio',
      }),
    ).toBeTruthy()
    // The component body renders its own decision table below the shell.
    expect(page.getByRole('columnheader', { name: 'We keep' })).toBeTruthy()
  })

  it('shows the not-found page for an unknown project slug', async () => {
    const page = await renderProjectPage('/projects/does-not-exist')

    expect(
      page.getByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeTruthy()
  })
})
