// Client-only gate: PointerSnare.tsx stays out of this barrel — it is the
// dynamic-import chunk, and re-exporting it would pull the animation and
// its CSS into the root chunk.
export { PointerSnareGate } from './PointerSnareGate'
