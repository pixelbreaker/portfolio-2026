import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'

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

const SESSION_KEY = 'portfolio-splash-seen'

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

// PIXEL drops in from above, BREAKER from below; on exit each half slides
// back out the way it came.
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

const OUTRO_DELAY = 1500
const OUTRO_DURATION = 1000
const FADE_DURATION = 300

type Phase = 'intro' | 'outro' | 'fade'

// Randomized per letter, but generated once so intro and outro reuse the
// same rhythm instead of reshuffling mid-animation.
const MAX_STAGGER = 400
const MAX_DURATION = 800

function randomTiming(): React.CSSProperties {
  return {
    animationDelay: `${Math.floor(Math.random() * MAX_STAGGER)}ms`,
    animationDuration: `${300 + Math.floor(Math.random() * MAX_DURATION)}ms`,
  }
}

function noSubscription() {
  return () => {}
}

// The session flag is read (and stamped) exactly once; the cached snapshot
// keeps useSyncExternalStore stable across re-renders.
let splashSnapshot: boolean | null = null

function getSplashSnapshot(): boolean {
  if (splashSnapshot === null) {
    try {
      splashSnapshot = sessionStorage.getItem(SESSION_KEY) === null
      sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
      // Storage unavailable (private mode): still allow one splash per load.
      splashSnapshot = true
    }
  }
  return splashSnapshot
}

export function SplashIntro() {
  // SSR renders nothing; the client snapshot decides after hydration, so the
  // markup never mismatches. The stamp on first read keeps the splash to one
  // per session across reloads and in-app navigations.
  const visible = useSyncExternalStore(
    noSubscription,
    getSplashSnapshot,
    () => true,
  )
  const [phase, setPhase] = useState<Phase>('intro')
  const [dismissed, setDismissed] = useState(false)

  // One randomized delay/duration per letter for the whole splash, grouped
  // by row, so intro and outro reuse the same rhythm instead of reshuffling.
  const rows = useMemo(
    () =>
      [PIXEL, BREAKER].map((row) =>
        row.map((letter) => ({ letter, style: randomTiming() })),
      ),
    [],
  )

  useEffect(() => {
    if (!visible || dismissed) return
    const timers = [
      window.setTimeout(() => setPhase('outro'), OUTRO_DELAY),
      window.setTimeout(() => setPhase('fade'), OUTRO_DELAY + OUTRO_DURATION),
      window.setTimeout(
        () => setDismissed(true),
        OUTRO_DELAY + OUTRO_DURATION + FADE_DURATION,
      ),
    ]
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [visible, dismissed])

  if (!visible || dismissed) return null

  return (
    <div
      className={`splash-intro${phase === 'fade' ? ' splash-intro--fade' : ''}`}
      aria-hidden="true"
    >
      <div className="splash-intro-logo">
        {rows.map((row, rowIndex) => (
          <div className="splash-intro-row" key={rowIndex}>
            {row.map(({ letter, style }, index) => (
              <span
                key={index}
                className={`splash-intro-letter ${
                  phase === 'intro' ? letter.enter : letter.exit
                }`}
                style={style}
                dangerouslySetInnerHTML={{ __html: GLYPHS[letter.char] }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
