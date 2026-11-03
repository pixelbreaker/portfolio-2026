import { imagetools } from 'vite-imagetools'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Kept separate from vite.config.ts: tests need the React transform, ?raw
// imports and the image pipeline, not the TanStack Start/Netlify plugins.
export default defineConfig({
  plugins: [imagetools(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    // Process CSS so `?url` imports (stylesHref in __root.tsx) resolve to a
    // real URL; without this they return "", and React rejects empty href on
    // the hoisted stylesheet link TanStack Start renders.
    css: true,
  },
})
