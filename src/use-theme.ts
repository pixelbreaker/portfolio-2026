import { useEffect, useSyncExternalStore } from 'react'

export type ThemeMode = 'light' | 'dark' | 'auto'
type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'portfolio-theme'

// Runs in the document head, before React or the first body paint. A missing
// stored value means auto mode: follow the system setting.
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

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

// The stored preference, not the effective theme: 'auto' means "follow the
// system", which is also the no-preference state.
function readThemeMode(): ThemeMode {
  let storedTheme
  try {
    storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  } catch {
    // Match the document-head fallback when browser storage is unavailable.
  }
  if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme
  return 'auto'
}

function subscribeToTheme(onChange: () => void) {
  window.addEventListener('storage', onChange)
  window.addEventListener('portfolio-theme-change', onChange)

  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener('portfolio-theme-change', onChange)
  }
}

export function useTheme() {
  // A neutral hydration snapshot must not overwrite the pre-paint theme.
  const mode = useSyncExternalStore<ThemeMode | null>(
    subscribeToTheme,
    readThemeMode,
    () => null,
  )

  useEffect(() => {
    if (mode === null) return
    const apply = () => {
      const theme = mode === 'auto' ? systemTheme() : mode
      document.documentElement.dataset.theme = theme
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', theme === 'dark' ? '#171717' : '#f7f7f5')
    }
    apply()
    if (mode !== 'auto') return
    // Auto mode re-applies when the OS flips while the mode itself is stable.
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
    darkQuery.addEventListener('change', apply)
    return () => darkQuery.removeEventListener('change', apply)
  }, [mode])

  function cycleMode() {
    const nextMode: ThemeMode =
      mode === 'light' ? 'dark' : mode === 'dark' ? 'auto' : 'light'
    window.localStorage.setItem(THEME_STORAGE_KEY, nextMode)
    window.dispatchEvent(new Event('portfolio-theme-change'))
  }

  return { mode, cycleMode }
}
