import { lazy, Suspense, useSyncExternalStore, type ComponentType } from 'react'

// Client-only, lazy, like PointerSnareGate: no hint markup on the server, and
// a coarse device never gets a keyboard hint it cannot press. A failed chunk
// renders null.
const KeyHints = lazy<ComponentType>(() =>
  import('./KeyHints')
    .then((m) => ({ default: m.KeyHints }))
    .catch(() => ({ default: () => null })),
)

const POINTER_QUERY = '(hover: hover) and (pointer: fine)'

function subscribeToPointer(onChange: () => void) {
  const pointer = window.matchMedia(POINTER_QUERY)
  pointer.addEventListener('change', onChange)
  return () => pointer.removeEventListener('change', onChange)
}

export function KeyHintsGate() {
  const finePointer = useSyncExternalStore(
    subscribeToPointer,
    () => window.matchMedia(POINTER_QUERY).matches,
    () => false,
  )

  if (!finePointer) return null

  return (
    <Suspense fallback={null}>
      <KeyHints />
    </Suspense>
  )
}
