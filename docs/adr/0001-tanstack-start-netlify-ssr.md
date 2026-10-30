# Use TanStack Start with Netlify server-side deployment

The portfolio uses TanStack Start for its React application and Netlify's TanStack Start adapter for deployment. This preserves server-rendered document requests and future server routes/functions; a static SPA rewrite would be simpler but would give up those capabilities, so the application publishes client assets while routing runtime requests through Netlify serverless functions.

## Addendum: the PIXELBREAKER splash is client-rendered

The splash overlay was originally server-rendered into every document, with a head script deciding one-per-session visibility pre-paint. It is now client-rendered and code-split, and the served document carries only the head script's `data-splash` marker. Server rendering stays the deployment model; this one decoration opts out of it.

The reason is the overlay's own payload: nine glyph SVGs, the choreography constants, and the splash stylesheet. Server-rendering it ships that markup in every page, on every visit, for an animation that runs at most once per session. Splitting it out moves it into a chunk that only the first visit of a session loads.

That leaves the page uncovered from first paint until the chunk lands, which is the part the deployment model cannot solve: the client entry is an async module script, so anything React mounts is network-bounded, and TanStack Start offers no option to make it blocking. The page is therefore covered by CSS alone — `:root[data-splash='show']::after` in `src/styles.css`, in the stylesheet that is already render-blocking, so the veil needs no markup and no JS. The overlay flips the marker to `live` in the commit that paints it, so veil-down and overlay-up are one paint.

Consequences worth naming:

- No scripting means no marker, so no splash: the page paints plain. Content never depends on a node the script injects.
- The veil retires on a 4.5s CSS animation, sized above the 4.4s the intro holds, so it cannot fire mid-intro. It exists for the pathological case where the overlay chunk never arrives — a stale deploy hash, a rejected import. A decoration must never leave the site covered, so the veil is guaranteed to lift on its own.
- The head script also stamps `data-splash-at`, the veil's clock start. CSS retires the veil on its own schedule and cannot write a marker, so the overlay compares that stamp against `VEIL_RETIRE_MS` (`splashGateScript.ts`) to tell a late arrival from an on-time one; a chunk that lands after the window tears itself down instead of covering the site. `splashGateScript.test.ts` pins the constant to the delay in `src/styles.css`, and `VEIL_RETIRE_MS` must stay above the intro's 4.4s.
- The gate resolves a failed chunk import to a component that renders nothing. An uncaught `lazy()` rejection unmounts the hydrated tree, so offline, a flaky CDN, or a tab that outlived a deploy would blank the page; the cost is limited to a missing intro.
- The splash is modal: the veil and overlay sit at `--z-splash` (2), above the site's chrome (gallery arrows and pointer-snare dots, both `z-index: 1`), and both take pointer events with the default cursor, so the page underneath cannot be clicked through the cover. Each carries its own CSS retire — the veil at 4.5s in the render-blocking sheet, the overlay at 6s in its own chunk — so a covered page always uncovers without JS, and the snare's cursor-hide scoping releases on the marker. A modal `<dialog>` is in the top layer, above the splash, outside this stack.
- Reduced motion marks the document `seen` in the head script, stamping the session flag: the intro is skipped for the session, the veil retires without React, and `SplashIntro.css` keeps a belt rule.
- The chunk split is invisible in the bundle, so a static import of the component would silently undo it. `eslint.config.ts` forbids importing `SplashIntro.tsx`/`SplashIntro.css` outside the gate.
