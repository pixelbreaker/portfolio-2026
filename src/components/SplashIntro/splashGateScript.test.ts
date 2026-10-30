import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import styles from '../../styles.css?raw'

import {
  SESSION_KEY,
  VEIL_RETIRE_MS,
  splashGateScript,
} from './splashGateScript'

// The script ships as a string for the document <head>; the tests run it the
// way the browser does, against the real jsdom document.
const runGateScript = () => new Function(splashGateScript)()

beforeEach(() => {
  sessionStorage.clear()
  delete document.documentElement.dataset.splashAt
  delete document.documentElement.dataset.splash
})

afterEach(() => {
  vi.restoreAllMocks()
  delete document.documentElement.dataset.splash
  delete document.documentElement.dataset.splashAt
})

function stubMatchMedia(reduce: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: query === '(prefers-reduced-motion: reduce)' && reduce,
        media: query,
      }) as unknown as MediaQueryList,
  )
}

describe('splash gate head script', () => {
  it('shows the splash and stamps the flag on a fresh session', () => {
    stubMatchMedia(false)

    runGateScript()

    expect(document.documentElement.dataset.splash).toBe('show')
    expect(sessionStorage.getItem(SESSION_KEY)).toBe('1')
    // The overlay reads this stamp as the veil's clock start, so a late
    // arrival can be measured against the CSS retire delay.
    const stamp = Number(document.documentElement.dataset.splashAt)
    expect(stamp).toBeGreaterThan(0)
    expect(stamp).toBeLessThanOrEqual(Date.now())
  })

  it('marks the document seen on a repeat visit and leaves the flag alone', () => {
    stubMatchMedia(false)
    runGateScript()

    runGateScript()

    expect(document.documentElement.dataset.splash).toBe('seen')
  })

  it('marks the document seen under reduced motion, flag stamped', () => {
    // The flag is stamped so the intro stays skipped for the session, and
    // 'seen' retires the CSS veil without React.
    stubMatchMedia(true)

    runGateScript()

    expect(document.documentElement.dataset.splash).toBe('seen')
    expect(sessionStorage.getItem(SESSION_KEY)).toBe('1')
  })

  it('shows once per load when storage is denied, without throwing', () => {
    stubMatchMedia(false)
    const denied = () => {
      throw new Error('storage is disabled')
    }
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(denied)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(denied)

    expect(() => runGateScript()).not.toThrow()

    expect(document.documentElement.dataset.splash).toBe('show')
  })

  it('shows when matchMedia is unavailable, treating it as full motion', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(() => {
      throw new Error('no media queries')
    })

    runGateScript()

    expect(document.documentElement.dataset.splash).toBe('show')
  })

  it('keeps the CSS veil retire delay matching the constant the overlay reads', () => {
    // src/styles.css is the side that can drift: the overlay compares
    // Date.now() - splashAt against VEIL_RETIRE_MS, and the veil's animation
    // has to retire on that same schedule. Read as raw text so the test
    // needs no node built-ins.
    const veil = styles.match(
      /:root\[data-splash='show'\]::after\s*\{[^}]*animation: splash-veil-retire (\d+)ms (\d+)ms/,
    )

    expect(veil?.[2]).toBe(String(VEIL_RETIRE_MS))
  })
})
