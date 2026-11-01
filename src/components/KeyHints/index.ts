// Client-only gate: KeyHints.tsx stays out of this barrel, as it is the
// dynamic-import chunk, and re-exporting it would pull the mutation machinery
// and its CSS into the root chunk.
export { KeyHintsGate } from './KeyHintsGate'
