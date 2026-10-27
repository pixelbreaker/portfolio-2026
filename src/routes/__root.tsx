import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import { PointerSnare } from '../components/PointerSnare'
import {
  SplashIntro,
  splashInitializationScript,
} from '../components/SplashIntro'
import { themeInitializationScript, useTheme } from '../use-theme'
import stylesHref from '../styles.css?url'

// Material Symbols ligature names; the head link subsets the font to these.
const THEME_ICONS = {
  light: 'contrast',
  dark: 'contrast_inverse',
  auto: 'contrast_auto',
} as const

const THEME_LABELS = {
  light: 'Light theme active, switch to dark theme',
  dark: 'Dark theme active, follow the system theme',
  auto: 'Following the system theme, switch to light theme',
} as const

function ThemeToggle() {
  // During SSR the stored preference is unknown; 'auto' is the no-preference
  // state a first-time visitor gets, and the pre-paint script resolves the
  // real theme from the system setting.
  const { mode, cycleMode } = useTheme()
  const shown = mode ?? 'auto'

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={cycleMode}
      aria-label={THEME_LABELS[shown]}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {THEME_ICONS[shown]}
      </span>
    </button>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <nav className="site-nav" aria-label="Main navigation" data-snare-group>
          <Link className="site-brand" to="/">
            Portfolio
          </Link>
          <Link to="/about" activeProps={{ 'aria-current': 'page' }}>
            About
          </Link>
          <Link
            to="/projects"
            activeOptions={{ exact: false }}
            activeProps={{ 'aria-current': 'page' }}
          >
            Projects
          </Link>
        </nav>
        <ThemeToggle />
      </header>
      {children}
      <SplashIntro />
      <PointerSnare />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </div>
  )
}

function RootComponent() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{ __html: themeInitializationScript }}
        />
        <script
          dangerouslySetInnerHTML={{ __html: splashInitializationScript }}
        />
      </head>
      <body>
        <Shell>
          <main className="page-main" id="main-content">
            <Outlet />
          </main>
        </Shell>
        <Scripts />
      </body>
    </html>
  )
}

function NotFoundComponent() {
  return (
    <section className="empty-state" aria-labelledby="not-found-title">
      <p className="eyebrow">404</p>
      <h1 id="not-found-title">Page not found</h1>
      <Link className="text-link" to="/">
        Back to home
      </Link>
    </section>
  )
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      { name: 'theme-color', content: '#f7f7f5' },
      { title: 'Portfolio' },
    ],
    links: [
      // Served verbatim from public/favicon.ico (copied from the old
      // PIXELBREAKER Gatsby site's static/ dir).
      {
        rel: 'icon',
        href: '/favicon.ico',
        sizes: '16x16',
        type: 'image/x-icon',
      },
      // Preconnects first in the array. React's hoisting sorts these plain
      // links below the precedence-tagged stylesheets anyway, but they still
      // parse before the css2 responses reveal the gstatic TTF URLs, which
      // is the connection worth warming early.
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      { rel: 'stylesheet', href: stylesHref },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap',
      },
      {
        rel: 'stylesheet',
        // Subset to only the three theme-toggle glyphs; the full
        // variable font is ~1MB. display=block, not swap: a ligature name
        // in a fallback font paints the raw words 'contrast_auto', and
        // swap guarantees that flash. The ~2KB subset's block period is
        // short enough to be invisible.
        href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&icon_names=contrast,contrast_auto,contrast_inverse&display=block',
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
})
