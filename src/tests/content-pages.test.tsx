import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router'
import { renderToStaticMarkup } from 'react-dom/server'
import { within } from '@testing-library/dom'
import { afterEach, describe, expect, it } from 'vitest'

import { routeTree } from '../routeTree.gen'

// Production serves these pages as server-rendered HTML documents, so the
// tests go through the same path: resolve the route, then render the router
// to a string. The root route returns a full <html> document, which cannot
// client-render into a jsdom div.
let container: HTMLElement | undefined

afterEach(() => {
  container?.remove()
  container = undefined
})

async function renderContentPage(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  await router.load()
  const html = renderToStaticMarkup(<RouterProvider router={router} />)

  // Accessible-name computation resolves referenced ids through the owner
  // document, so the rendered markup must be attached before getByRole runs.
  container = document.createElement('div')
  container.innerHTML = html
  document.body.append(container)
  return within(container)
}
describe('content pages', () => {
  it('renders a markdown page with frontmatter title, summary, and body', async () => {
    const page = await renderContentPage('/done/portfolio-2026')

    expect(
      page.getByRole('heading', { level: 1, name: 'Portfolio 2026' }),
    ).toBeTruthy()
    expect(
      page.getByRole('heading', { level: 2, name: 'What it is' }),
    ).toBeTruthy()
    expect(
      page.getByText(/server-rendered portfolio built with TanStack Start/),
    ).toBeTruthy()
    // The frontmatter block itself must not leak into the rendered body.
    expect(page.queryByText(/^title: Portfolio 2026$/)).toBeNull()
    // GFM table from src/content/done/portfolio-2026.md must reach the DOM.
    expect(page.getByRole('table')).toBeTruthy()
  })

  it('renders a component page from its named metadata exports', async () => {
    const page = await renderContentPage('/done/server-rendered-portfolio')

    expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Choosing server rendering for the portfolio',
      }),
    ).toBeTruthy()
    // The component body renders its own decision table below the shell.
    expect(page.getByRole('columnheader', { name: 'We keep' })).toBeTruthy()
  })

  it('serves any content sub-folder as its own URL section', async () => {
    const page = await renderContentPage('/thought/how-content-routing-works')

    expect(
      page.getByRole('heading', {
        level: 1,
        name: 'How content routing works',
      }),
    ).toBeTruthy()
    // The page shell links back to its section listing.
    expect(page.getByRole('link', { name: '← Thought' })).toBeTruthy()
  })

  it('lists a section at /<section>', async () => {
    const page = await renderContentPage('/done')

    expect(page.getByRole('heading', { level: 1, name: 'Done' })).toBeTruthy()
    expect(page.getByRole('link', { name: 'Portfolio 2026' })).toBeTruthy()
    expect(
      page.getByRole('link', {
        name: 'Choosing server rendering for the portfolio',
      }),
    ).toBeTruthy()

    // The header nav comes from the content folders, not a hand-written list:
    // every section with pages appears.
    const nav = within(
      page.getByRole('navigation', { name: 'Main navigation' }),
    )
    expect(nav.getByRole('link', { name: 'Done' })).toBeTruthy()
    expect(nav.getByRole('link', { name: 'Seen' })).toBeTruthy()
    expect(nav.getByRole('link', { name: 'Thought' })).toBeTruthy()
  })

  it('lists the gallery page in the seen section without rendering it', async () => {
    // The card listing only; the gallery body needs the imagetools plugin,
    // which the test pipeline deliberately does not run.
    const page = await renderContentPage('/seen')

    expect(page.getByRole('heading', { level: 1, name: 'Seen' })).toBeTruthy()
    expect(page.getByRole('link', { name: 'Canada, 2026' })).toBeTruthy()
  })

  it('shows the not-found page for an unknown path', async () => {
    const page = await renderContentPage('/done/does-not-exist')

    expect(
      page.getByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeTruthy()
  })

  it('shows the not-found page for an empty section', async () => {
    const page = await renderContentPage('/no-such-section')

    expect(
      page.getByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeTruthy()
  })
})
