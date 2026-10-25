import { useEffect, useSyncExternalStore } from 'react'

type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'portfolio-theme'

// Runs in the document head, before React or the first body paint.
export const themeInitializationScript = `(() => {
  let theme;
  try {
    theme = localStorage.getItem('${THEME_STORAGE_KEY}');
  } catch {
    // System preference still works when browser storage is unavailable.
  }
  if (theme !== 'light' && theme !== 'dark') {
    theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.dataset.theme = theme;
})();`

function readTheme(): Theme {
  let storedTheme
  try {
    storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  } catch {
    // Match the document-head fallback when browser storage is unavailable.
  }
  if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function subscribeToTheme(onChange: () => void) {
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
  window.addEventListener('storage', onChange)
  window.addEventListener('portfolio-theme-change', onChange)
  systemTheme.addEventListener('change', onChange)

  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener('portfolio-theme-change', onChange)
    systemTheme.removeEventListener('change', onChange)
  }
}

export function useTheme() {
  // A neutral hydration snapshot must not overwrite the pre-paint theme.
  const theme = useSyncExternalStore<Theme | null>(
    subscribeToTheme,
    readTheme,
    () => null,
  )

  useEffect(() => {
    if (theme === null) return
    document.documentElement.dataset.theme = theme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#171717' : '#f7f7f5')
  }, [theme])

  function toggleTheme() {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    window.dispatchEvent(new Event('portfolio-theme-change'))
  }

  return { theme, toggleTheme }
}
