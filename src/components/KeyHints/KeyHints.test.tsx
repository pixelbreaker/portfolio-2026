import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { KeyHints } from './KeyHints'

// Mutations coalesce on a 16ms timer; a longer real tick lands the recompute.
const settled = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 40))
  })

const hints = (root: Element) =>
  [...root.querySelectorAll('.key-hint')].map((el) => el.textContent)

describe('KeyHints', () => {
  afterEach(cleanup)

  it('underlines the leftmost free letter of every labelled link', async () => {
    const { container } = render(
      <>
        <KeyHints />
        <nav>
          <a href="#/done">Done</a>
          <a href="#/seen">Seen</a>
        </nav>
      </>,
    )
    await settled()

    expect(hints(container)).toEqual(['D', 'S'])
    expect(container.querySelectorAll('a')[0].textContent).toBe('Done')
  })

  it('serves a shared letter to the first link and takes the next for the second', async () => {
    const { container } = render(
      <>
        <KeyHints />
        <a href="#/home">home</a>
        <a href="#/how">how</a>
      </>,
    )
    await settled()

    expect(hints(container)).toEqual(['h', 'o'])
  })

  it('focuses and clicks the element on its key, and swallows the key press', async () => {
    const clicks: string[] = []
    const { container } = render(
      <>
        <KeyHints />
        <a
          href="#/seen"
          onClick={() => {
            clicks.push('seen')
          }}
        >
          Seen
        </a>
        <a
          href="#/about"
          onClick={() => {
            clicks.push('about')
          }}
        >
          About
        </a>
      </>,
    )
    await settled()

    const event = new KeyboardEvent('keydown', {
      key: 's',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(event)

    expect(clicks).toEqual(['seen'])
    expect(document.activeElement).toBe(container.querySelectorAll('a')[0])
    expect(event.defaultPrevented).toBe(true)
  })

  it('fires a lowercase key on a capital press', async () => {
    const clicks: string[] = []
    render(
      <KeyHints />,
    )
    const link = document.createElement('a')
    link.href = '#/seen'
    link.textContent = 'Seen'
    link.addEventListener('click', () => clicks.push('seen'))
    document.body.append(link)
    await settled()

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'S', bubbles: true, cancelable: true }),
    )

    expect(clicks).toEqual(['seen'])
    link.remove()
  })

  it('leaves keys alone while an editable field has focus', async () => {
    const clicks: string[] = []
    const link = document.createElement('a')
    link.href = '#/seen'
    link.textContent = 'Seen'
    link.addEventListener('click', () => clicks.push('seen'))
    const input = document.createElement('input')
    document.body.append(link, input)
    render(<KeyHints />)
    await settled()

    input.focus()
    fireEvent.keyDown(input, { key: 's', bubbles: true, cancelable: true })
    expect(clicks).toEqual([])

    input.blur()
    const event = new KeyboardEvent('keydown', {
      key: 's',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(event)
    expect(clicks).toEqual(['seen'])

    link.remove()
    input.remove()
  })

  it('keys links that arrive after mount, and keeps survivors on their letter', async () => {
    const { container } = render(
      <>
        <KeyHints />
        <nav>
          <a href="#/done">Done</a>
        </nav>
      </>,
    )
    await settled()
    expect(hints(container)).toEqual(['D'])

    const added = document.createElement('a')
    added.href = '#/done-two'
    added.textContent = 'Done two'
    container.querySelector('nav')?.append(added)
    await settled()

    expect(hints(container)).toEqual(['D', 'o'])
  })

  it('skips icon-only controls, which carry no visible text', async () => {
    const { container } = render(
      <>
        <KeyHints />
        <button type="button" aria-label="Next photo">
          <span aria-hidden="true">arrow_right</span>
        </button>
      </>,
    )
    await settled()

    expect(container.querySelectorAll('.key-hint')).toHaveLength(0)
  })

  it('skips the excluded subtree', async () => {
    const { container } = render(
      <>
        <KeyHints />
        <div data-keyhints-exclude>
          <a href="#/devtools">Devtools</a>
        </div>
      </>,
    )
    await settled()

    expect(container.querySelectorAll('.key-hint')).toHaveLength(0)
  })

  // React streams out-of-order Suspense boundaries into a hidden div appended
  // to the body. Splitting their text before hydration mismatched the trees
  // and the whole page was re-rendered client-side.
  it('skips links inside a hidden container', async () => {
    render(<KeyHints />)
    const boundary = document.createElement('div')
    boundary.hidden = true
    boundary.innerHTML = '<a href="#/streamed">Streamed</a>'
    const live = document.createElement('a')
    live.href = '#/live'
    live.textContent = 'Live'
    document.body.append(boundary, live)
    await settled()

    expect(boundary.innerHTML).toBe('<a href="#/streamed">Streamed</a>')
    expect(hints(document.body)).toEqual(['L'])
    boundary.remove()
    live.remove()
  })

  it('restores every label exactly on unmount', async () => {
    const { container, unmount } = render(
      <>
        <KeyHints />
        <nav>
          <a href="#/home">home</a>
          <a href="#/how">how</a>
          <a href="#/house">house</a>
        </nav>
      </>,
    )
    await settled()
    expect(hints(container)).toEqual(['h', 'o', 'u'])
    const links = [...container.querySelectorAll('a')]
    const originals = links.map((link) => link.firstChild)

    unmount()

    expect(container.querySelectorAll('.key-hint')).toHaveLength(0)
    expect(links.map((link) => link.textContent)).toEqual([
      'home',
      'how',
      'house',
    ])
    expect(links.map((link) => link.firstChild)).toEqual(originals)
  })
})
