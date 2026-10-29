import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import netlify from '@netlify/vite-plugin-tanstack-start'
import react from '@vitejs/plugin-react'
import { imagetools } from 'vite-imagetools'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    // Claims image requests with a transform query and builds the renditions
    // itself; ships with enforce: 'pre', so order here does not matter.
    imagetools(),
    tanstackStart(),
    netlify({ dev: { edgeFunctions: { enabled: false } } }),
    react(),
  ],
})
