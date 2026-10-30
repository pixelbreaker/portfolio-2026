import { useLayoutEffect, useMemo, useState } from 'react'

import './SplashIntro.css'
import { VEIL_RETIRE_MS } from './splashGateScript'

import logoA from './logo-a.svg?raw'
import logoB from './logo-b.svg?raw'
import logoE from './logo-e.svg?raw'
import logoI from './logo-i.svg?raw'
import logoK from './logo-k.svg?raw'
import logoL from './logo-l.svg?raw'
import logoP from './logo-p.svg?raw'
import logoR from './logo-r.svg?raw'
import logoX from './logo-x.svg?raw'

const GLYPHS = {
  p: logoP,
  i: logoI,
  x: logoX,
  e: logoE,
  l: logoL,
  b: logoB,
  r: logoR,
  a: logoA,
  k: logoK,
} as const

interface Letter {
  char: keyof typeof GLYPHS
  enter: 'intro-top' | 'intro-bottom'
  exit: 'outro-top' | 'outro-bottom'
}

// PIXEL drops in from above, BREAKER from below (with a green full stop
// after the final R); on exit each half slides back out the way it came.
const PIXEL: Letter[] = (['p', 'i', 'x', 'e', 'l'] as const).map((char) => ({
  char,
  enter: 'intro-top',
  exit: 'outro-top',
}))

const BREAKER: Letter[] = (['b', 'r', 'e', 'a', 'k', 'e', 'r'] as const).map(
  (char) => ({
    char,
    enter: 'intro-bottom',
    exit: 'outro-bottom',
  }),
)

// The square full stop belongs to the row it trails, so it follows that
// row's entrance/exit direction.
const ROWS: { letters: Letter[]; stop: boolean }[] = [
  { letters: PIXEL, stop: false },
  { letters: BREAKER, stop: true },
]

const OUTRO_DURATION = 1000
const FADE_DURATION = 300

type Phase = 'intro' | 'outro' | 'fade'

// Deterministic, not Math.random(): stagger and duration are settled once at
// module evaluation, and the outro swaps animation names on the same inline
// styles, so a letter keeps its rhythm on the way out.
const MAX_STAGGER = 400
const STAGGER_STRIDE = 137
const BASE_DURATION = 520
const MAX_EXTRA_DURATION = 240
const DURATION_STRIDE = 61

// Every letter slot in row order, with the stagger delay/duration it
// enters (and exits) with.
const LETTER_TIMINGS = ROWS.flatMap((row) => row.letters).map((_, index) => ({
  delay: (index * STAGGER_STRIDE) % MAX_STAGGER,
  duration: BASE_DURATION + ((index * DURATION_STRIDE) % MAX_EXTRA_DURATION),
}))

// The full stop is the last thing in: it starts dropping the instant every
// letter has come to rest (worst-case delay + duration), then blinks as a
// caret for BLINK_PERIOD * BLINK_CYCLES, and only then does the outro
// start. Its timings ship as custom properties so the CSS can stack its
// two animations — drop-in, then blink — each with its own delay.
const STOP_ENTER_DELAY = Math.max(
  ...LETTER_TIMINGS.map(({ delay, duration }) => delay + duration),
)
const STOP_ENTER_DURATION = 420
const BLINK_PERIOD = 1000
const BLINK_CYCLES = 3
const OUTRO_DELAY =
  STOP_ENTER_DELAY + STOP_ENTER_DURATION + BLINK_PERIOD * BLINK_CYCLES

const STOP_STYLE = {
  '--stop-enter-delay': `${STOP_ENTER_DELAY}ms`,
  '--stop-enter-duration': `${STOP_ENTER_DURATION}ms`,
  '--stop-blink-delay': `${STOP_ENTER_DELAY + STOP_ENTER_DURATION}ms`,
  '--stop-blink-period': `${BLINK_PERIOD}ms`,
  '--stop-blink-cycles': `${BLINK_CYCLES}`,
} as React.CSSProperties

// The overlay's CSS watchdog in SplashIntro.css; above the 5733ms JS
// dismissal, so it never fires normally. Its delay is pinned to this.
export const OVERLAY_RETIRE_MS = 6000
export default function SplashIntro() {
  const [phase, setPhase] = useState<Phase>('intro')
  const [dismissed, setDismissed] = useState(false)

  const rows = useMemo(() => {
    let slot = 0
    return ROWS.map((row) => ({
      letters: row.letters.map((letter) => {
        const { delay, duration } = LETTER_TIMINGS[slot++]
        return {
          letter,
          style: {
            animationDelay: `${delay}ms`,
            animationDuration: `${duration}ms`,
          },
        }
      }),
      stop: row.stop ? STOP_STYLE : null,
    }))
  }, [])

  useLayoutEffect(() => {
    const root = document.documentElement
    // Late arrival: the veil's stamped clock passed VEIL_RETIRE_MS, so the
    // base CSS keeps this unpainted; unmark and go away on the next task.
    const veilStart = Number(root.dataset.splashAt)
    if (
      root.dataset.splash === 'seen' ||
      (Number.isFinite(veilStart) && Date.now() - veilStart >= VEIL_RETIRE_MS)
    ) {
      const unmount = window.setTimeout(() => {
        delete root.dataset.splash
        setDismissed(true)
      }, 0)
      return () => window.clearTimeout(unmount)
    }
    // 'live' retires the veil and paints the overlay pre-paint. An already
    // 'live' marker is our own claim (StrictMode re-invoke): restart, don't tear down.
    root.dataset.splash = 'live'
    const timers = [
      window.setTimeout(() => setPhase('outro'), OUTRO_DELAY),
      window.setTimeout(() => setPhase('fade'), OUTRO_DELAY + OUTRO_DURATION),
      window.setTimeout(
        () => setDismissed(true),
        OUTRO_DELAY + OUTRO_DURATION + FADE_DURATION,
      ),
      // Dismissal is final: clear the marker so the snare scoping releases.
      window.setTimeout(
        () => delete root.dataset.splash,
        OUTRO_DELAY + OUTRO_DURATION + FADE_DURATION,
      ),
    ]
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [])

  if (dismissed) return null

  return (
    <div
      className={`splash-intro${phase === 'fade' ? ' splash-intro--fade' : ''}`}
      aria-hidden="true"
    >
      <div className="splash-intro-logo">
        {rows.map((row, rowIndex) => (
          <div className="splash-intro-row" key={rowIndex}>
            {row.letters.map(({ letter, style }, index) => (
              <span
                key={index}
                className={`splash-intro-letter ${
                  phase === 'intro' ? letter.enter : letter.exit
                }`}
                style={style}
                dangerouslySetInnerHTML={{ __html: GLYPHS[letter.char] }}
              />
            ))}
            {row.stop && (
              <span
                className={`splash-intro-stop ${
                  phase === 'intro'
                    ? 'splash-intro-stop--enter'
                    : 'splash-intro-stop--exit'
                }`}
                style={row.stop}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
