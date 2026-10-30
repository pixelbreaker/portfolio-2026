export const SESSION_KEY = 'portfolio-splash-seen'

// The veil-retire deadline in src/styles.css: the overlay reads it to spot a
// late arrival. splashGateScript.test.ts pins styles.css to this number.
export const VEIL_RETIRE_MS = 4500

// Marks the document in <head> pre-paint: 'show' keeps the CSS veil up until
// the overlay claims 'live'; 'seen' shows nothing. data-splash-at starts the
// veil's clock. No script = no marker = plain page.
export const splashGateScript = `(() => {
  let reduce = false;
  try {
    reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    // No media queries: treat as full motion.
  }
  let seen = false;
  try {
    seen = sessionStorage.getItem('${SESSION_KEY}') !== null;
    if (!seen) sessionStorage.setItem('${SESSION_KEY}', '1');
  } catch {
    // Storage unavailable (private mode): still show once per load.
  }
  document.documentElement.dataset.splashAt = String(Date.now());
  document.documentElement.dataset.splash = seen || reduce ? 'seen' : 'show';
})();`
