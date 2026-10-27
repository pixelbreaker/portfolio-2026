import { useEffect, useMemo, useState } from 'react'

import './SplashIntro.css'

import logoA from './logo-a.svg?raw'
import logoB from './logo-b.svg?raw'
import logoE from './logo-e.svg?raw'
import logoI from './logo-i.svg?raw'
import logoK from './logo-k.svg?raw'
import logoL from './logo-l.svg?raw'
import logoP from './logo-p.svg?raw'
import logoR from './logo-r.svg?raw'
import logoX from './logo-x.svg?raw'

export const SESSION_KEY = 'portfolio-splash-seen'

// Runs in the document head, before the first body paint, settling the
// once-per-session decision while nothing is on screen yet. The overlay
// markup itself is server-rendered on every page (this is what keeps a first
// visit from flashing the page underneath), so the script either stamps the
// flag and marks data-splash='show', or — when the flag already exists —
// marks data-splash='seen', a CSS rule that hides the overlay before the
// body ever paints, so no animation and no overlay show for repeat visits.
// Mirrors the head-side theme script in ../use-theme.
export const splashInitializationScript = `(() => {
  let seen = false;
  try {
    seen = sessionStorage.getItem('${SESSION_KEY}') !== null;
    if (!seen) sessionStorage.setItem('${SESSION_KEY}', '1');
  } catch {
    // Storage unavailable (private mode): still show once per load.
  }
  document.documentElement.dataset.splash = seen ? 'seen' : 'show';
})();`

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

// The overlay is server-rendered, so per-letter inline styles ship in the
// HTML and must match the client pass exactly — Math.random() would
// desynchronize the two and force React to discard/re-render every letter,
// seeking the running animations mid-flight. A coprime stride staggers the
// letters deterministically; each keeps its rhythm through the outro.
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

export function SplashIntro() {
  // SSR and client renders are identical (deterministic timings, always
  // present markup); visibility itself is CSS-driven via the head script's
  // marker, so the 'seen' case costs nothing and never animates. Only the
  // phase chain is React's job, and it runs only when this document was
  // marked 'show'.
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

  useEffect(() => {
    if (document.documentElement.dataset.splash !== 'show') return
    // The intro runs from first paint (marker is set pre-paint), so the
    // chain starts here; OUTRO_DELAY is derived from the stop's timings, so
    // the caret has blinked for exactly BLINK_PERIOD * BLINK_CYCLES first.
    const timers = [
      window.setTimeout(() => setPhase('outro'), OUTRO_DELAY),
      window.setTimeout(() => setPhase('fade'), OUTRO_DELAY + OUTRO_DURATION),
      window.setTimeout(
        () => setDismissed(true),
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
