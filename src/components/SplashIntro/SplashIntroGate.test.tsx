import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import SplashIntro, { OVERLAY_RETIRE_MS } from './SplashIntro'
import { SplashIntroGate } from './SplashIntroGate'
import overlayStyles from './SplashIntro.css?raw'

// React retries a suspended render via the scheduler's MessageChannel, which
// fake timers starve — the chunk needs real time. The overlay's 4.4s chain
// is never fast-forwarded here.
const flushChunk = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300))
  })

const flushTask = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })

beforeEach(() => {
  sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  delete document.documentElement.dataset.splash
  delete document.documentElement.dataset.splashAt
})

describe('SplashIntroGate', () => {
  it('renders nothing when the document is marked seen', async () => {
    document.documentElement.dataset.splash = 'seen'

    const { container } = render(<SplashIntroGate />)
    await flushChunk()

    expect(container.querySelector('.splash-intro')).toBeNull()
    expect(document.documentElement.dataset.splash).toBe('seen')
  })

  it('mounts the overlay on a fresh session and retires the veil marker', async () => {
    document.documentElement.dataset.splash = 'show'
    document.documentElement.dataset.splashAt = String(Date.now())

    const { container } = render(<SplashIntroGate />)
    await flushChunk()

    // The overlay's layout effect flips 'show' to 'live': veil down,
    // overlay up, in the pass that paints it.
    expect(container.querySelector('.splash-intro')).not.toBeNull()
    expect(document.documentElement.dataset.splash).toBe('live')
  })

  it('keeps the running overlay mounted through a parent re-render', async () => {
    // The overlay claims the marker as it paints; a 'show'-only gate would
    // unmount it mid-animation on re-render.
    document.documentElement.dataset.splash = 'show'
    document.documentElement.dataset.splashAt = String(Date.now())

    const { container, rerender } = render(<SplashIntroGate />)
    await flushChunk()
    expect(document.documentElement.dataset.splash).toBe('live')
    expect(container.querySelectorAll('.splash-intro-letter')).toHaveLength(12)

    rerender(<SplashIntroGate />)

    expect(container.querySelector('.splash-intro')).not.toBeNull()
    expect(container.querySelectorAll('.splash-intro-letter')).toHaveLength(12)
  })

  it('suppresses the overlay that lands after the veil retired', async () => {
    // The veil retires on its CSS clock without touching the marker; a chunk
    // landing after the window tears itself down and unmarks.
    document.documentElement.dataset.splash = 'show'
    document.documentElement.dataset.splashAt = String(Date.now() - 4600)

    const { container } = render(<SplashIntro />)
    await flushTask()

    expect(container.querySelector('.splash-intro')).toBeNull()
    expect(document.documentElement.dataset.splash).toBeUndefined()
  })

  it('paints the overlay that lands inside the veil window', async () => {
    document.documentElement.dataset.splash = 'show'
    document.documentElement.dataset.splashAt = String(Date.now() - 1000)

    const { container } = render(<SplashIntro />)

    expect(container.querySelectorAll('.splash-intro-letter')).toHaveLength(12)
    expect(document.documentElement.dataset.splash).toBe('live')
  })

  it('pins the overlay watchdog delay to OVERLAY_RETIRE_MS', () => {
    // The overlay is modal: a mid-run JS death must not strand the page
    // covered. The CSS delay is the side that drifts.
    const delay = overlayStyles.match(
      /animation: splash-overlay-retire (\d+)ms (\d+)ms/,
    )?.[2]
    expect(delay).toBe(String(OVERLAY_RETIRE_MS))
  })
})
