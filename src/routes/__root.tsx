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

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const nextTheme = theme === 'light' ? 'dark' : 'light'

  return (
    <button className="theme-toggle" type="button" onClick={toggleTheme}>
      Switch to {nextTheme} mode
    </button>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="site-brand" to="/">
          Portfolio
        </Link>
        <nav className="site-nav" aria-label="Main navigation">
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
      { rel: 'stylesheet', href: stylesHref },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap',
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
})
