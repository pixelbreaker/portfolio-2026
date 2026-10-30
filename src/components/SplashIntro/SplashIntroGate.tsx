import { lazy, Suspense, useSyncExternalStore } from 'react'

// Client-only, lazy: no splash markup on the server, glyphs stay out of the
// root chunk. A failed chunk renders null — an uncaught lazy() rejection
// unmounts the hydrated tree.
const SplashIntro = lazy(() =>
  import('./SplashIntro').catch(() => ({ default: () => null })),
)

export function SplashIntroGate() {
  // The marker is written twice at most; no subscription needed. 'live'
  // counts as mounted so a re-render cannot tear the animation mid-flight.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => {
      const marker = document.documentElement.dataset.splash
      return marker === 'show' || marker === 'live' ? 'mounted' : null
    },
    () => null,
  )

  if (mounted !== 'mounted') return null

  // The veil covers the dynamic import, so the fallback is nothing to paint.
  return (
    <Suspense fallback={null}>
      <SplashIntro />
    </Suspense>
  )
}
