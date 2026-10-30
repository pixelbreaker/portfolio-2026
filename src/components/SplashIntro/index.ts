// Client-only pair: the head script marks the document, the gate mounts the
// overlay behind the CSS veil. SplashIntro.tsx stays out of this barrel — it
// is the dynamic-import chunk, and re-exporting it would pull the glyphs into
// the root chunk.
export { SplashIntroGate } from './SplashIntroGate'
export { splashGateScript } from './splashGateScript'
