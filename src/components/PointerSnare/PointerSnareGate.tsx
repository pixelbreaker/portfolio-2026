import { lazy, Suspense, useSyncExternalStore, type ComponentType } from 'react'

// Client-only, lazy: no snare markup on the server, and the animation and
// its CSS stay out of the root chunk for pointer-less devices. A failed
// chunk renders null — an uncaught lazy() rejection unmounts the tree.
// Explicit ComponentType: the null fallback returns null, not the snare's
// Element, and inference locks T to the then-branch of the chain.
const PointerSnare = lazy<ComponentType>(() =>
  import('./PointerSnare')
    .then((m) => ({ default: m.PointerSnare }))
    .catch(() => ({ default: () => null })),
)

const POINTER_QUERY = '(hover: hover) and (pointer: fine)'

// Hybrids (touchscreen laptop, tablet + Bluetooth mouse) can gain or lose a
// fine pointer mid-session, so the gate subscribes: the snare's effect
// cleanup strips the root classes on unmount, making that loss clean.
function subscribeToPointer(onChange: () => void) {
  const pointer = window.matchMedia(POINTER_QUERY)
  pointer.addEventListener('change', onChange)
  return () => pointer.removeEventListener('change', onChange)
}

export function PointerSnareGate() {
  // Server snapshot: never render. The snare is a pointer affordance; on a
  // coarse device there is no pointer to snare.
  const finePointer = useSyncExternalStore(
    subscribeToPointer,
    () => window.matchMedia(POINTER_QUERY).matches,
    () => false,
  )

  if (!finePointer) return null

  // The chunk lands after hydration; nothing is on screen to veil it, so
  // the fallback is nothing to paint.
  return (
    <Suspense fallback={null}>
      <PointerSnare />
    </Suspense>
  )
}
