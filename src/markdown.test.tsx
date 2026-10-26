import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Markdown } from './markdown'

describe('Markdown', () => {
  it('renders CommonMark structure as HTML', () => {
    render(<Markdown source={'## Heading\n\nA [link](https://example.com).'} />)

    expect(
      screen.getByRole('heading', { level: 2, name: 'Heading' }),
    ).toBeTruthy()
    const link = screen.getByRole('link', { name: 'link' })
    expect(link.getAttribute('href')).toBe('https://example.com')
  })

  it('renders GitHub Flavored Markdown tables', () => {
    render(
      <Markdown
        source={'| Body kind | Best for |\n| --- | --- |\n| Markdown | Prose |'}
      />,
    )

    const table = screen.getByRole('table')
    expect(screen.getByRole('columnheader', { name: 'Body kind' })).toBeTruthy()
    expect(table.textContent).toContain('Markdown')
  })

  it('does not render raw HTML from markdown', () => {
    const { container } = render(
      <Markdown source={'<img src="x" onerror="alert(1)">'} />,
    )

    expect(container.querySelector('img')).toBeNull()
  })
})
