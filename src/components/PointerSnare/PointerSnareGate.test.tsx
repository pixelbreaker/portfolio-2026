import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PointerSnareGate } from './PointerSnareGate'

// React retries a suspended render via the scheduler's MessageChannel, which
// fake timers starve — the chunk needs real time.
const flushChunk = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300))
  })

// The global stub ignores listeners, so the gate never re-evaluates under
// test; hybrids (touchscreen laptop + Bluetooth mouse) need live updates.
function stubPointerMedia(fine: boolean) {
  const listeners = new Set<() => void>()
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: fine,
        media: query,
        addEventListener: (_type: string, cb: () => void) => listeners.add(cb),
        removeEventListener: (_type: string, cb: () => void) =>
          listeners.delete(cb),
      }) as unknown as MediaQueryList,
  )
  return {
    setFine(next: boolean) {
      fine = next
      act(() => {
        for (const cb of [...listeners]) cb()
      })
    },
  }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  document.documentElement.classList.remove('pointer-snare-on')
  document.documentElement.classList.remove('pointer-snare-cursor-none')
})

describe('PointerSnareGate', () => {
  it('renders nothing on a coarse-pointer device', async () => {
    stubPointerMedia(false)

    const { container } = render(<PointerSnareGate />)
    await flushChunk()

    expect(container.querySelector('.pointer-snare')).toBeNull()
  })

  it('mounts the ring, dot and ticks on a fine-pointer device', async () => {
    stubPointerMedia(true)

    const { container } = render(<PointerSnareGate />)
    await flushChunk()

    expect(container.querySelector('.pointer-snare')).not.toBeNull()
    expect(container.querySelector('.pointer-snare-dot')).not.toBeNull()
    expect(
      container.querySelectorAll('.pointer-snare-tick--sides'),
    ).toHaveLength(1)
    expect(container.querySelectorAll('.pointer-snare-tick--ends')).toHaveLength(
      1,
    )
  })

  it('mounts and unmounts when a hybrid device gains then loses a mouse', async () => {
    const media = stubPointerMedia(false)

    const { container } = render(<PointerSnareGate />)
    await flushChunk()
    expect(container.querySelector('.pointer-snare')).toBeNull()

    media.setFine(true)
    await flushChunk()
    expect(container.querySelector('.pointer-snare')).not.toBeNull()

    media.setFine(false)
    expect(container.querySelector('.pointer-snare')).toBeNull()
  })
})
