# TanStack Start on Netlify

**Finding (current documentation): Yes.** Netlify documents TanStack Start as fully supported, including SSR, server routes, server functions, and middleware; these are deployed to Netlify serverless functions. Netlify also explicitly says TanStack Start for Solid.js is fully supported. TanStack lists Netlify as an official hosting partner and provides a dedicated deployment path. ([Netlify: TanStack Start on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/tanstack-start/), [TanStack: Hosting](https://tanstack.com/start/latest/docs/framework/react/guide/hosting))

## Required setup for current releases

For current TanStack Start/Vite projects, the documented integration is the Netlify Vite plugin:

```sh
npm install -D @netlify/vite-plugin-tanstack-start
```

Add it alongside the TanStack Start Vite plugin (React example):

```ts
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import netlify from '@netlify/vite-plugin-tanstack-start'

export default defineConfig({
  plugins: [tanstackStart(), netlify()],
})
```

Configure the Netlify build as:

```toml
[build]
  command = "vite build"
  publish = "dist/client"
```

The same settings can be entered in Netlify’s dashboard. TanStack’s hosting guide says the plugin configures the build for Netlify and supports local emulation of Netlify’s production platform. ([Netlify setup guide](https://docs.netlify.com/build/frameworks/framework-setup-guides/tanstack-start/), [TanStack hosting guide](https://tanstack.com/start/latest/docs/framework/react/guide/hosting))

Netlify’s guide requires **Netlify CLI 17.31 or newer** when deploying with Netlify CLI and this plugin. TanStack’s guide shows `npx netlify deploy`; a new project is prompted for initialization and receives automatic build settings. ([Netlify setup guide](https://docs.netlify.com/build/frameworks/framework-setup-guides/tanstack-start/), [TanStack hosting guide](https://tanstack.com/start/latest/docs/framework/react/guide/hosting))

## Version caveat

The setup above is for current releases. Netlify documents older configurations separately:

- TanStack Start **1.121.0–1.131.x**: use `tanstackStart({ target: 'netlify' })`, publish `dist`, rather than using the Netlify plugin/publishing `dist/client`.
- Versions **before 1.121.0**: use `app.config.ts` with `server.preset: 'netlify'`, build with `vinxi build`, and publish `dist`.

These are legacy instructions; do not combine them with the current plugin configuration. ([Netlify setup guide](https://docs.netlify.com/build/frameworks/framework-setup-guides/tanstack-start/))

## Runtime and operational constraints

The adapter-generated server code runs as Netlify Functions. Netlify’s current function defaults/limits are: 1024 MB memory, 60-second synchronous execution, 6 MB buffered request/response payload, and 20 MB streamed response payload. Netlify says the functions runtime follows the Node.js version used for the build when that version is a valid supported AWS Lambda Node.js runtime; otherwise it falls back to Node.js 24. These are platform limits, not TanStack-specific guarantees. ([Netlify function configuration](https://docs.netlify.com/build/functions/configuration/))

If using Netlify Edge Functions instead of the default serverless-function path, Netlify documents materially different limits: 20 MB compressed code, 512 MB total memory, 50 ms CPU time per request, and a 40-second response-header timeout. The TanStack/Netlify setup guide describes serverless functions, so Edge Functions should not be assumed without a separately documented configuration. ([Netlify Edge Functions limits](https://docs.netlify.com/build/edge-functions/limits/))

## Static export versus SSR/server deployment

These are different deployment shapes:

- **SSR/server deployment (the normal Netlify integration):** `vite build` plus `@netlify/vite-plugin-tanstack-start`; publish `dist/client`. Dynamic document requests and Start server features are handled through generated Netlify serverless functions. SSR, server routes, server functions, and middleware therefore remain available. ([Netlify setup guide](https://docs.netlify.com/build/frameworks/framework-setup-guides/tanstack-start/))
- **Static prerendering:** TanStack Start can generate HTML at build time with the `prerender` option. Static pages can then be served without generating HTML per request; routes with parameters are not automatically discovered unless explicitly configured/linked. This is a static-output choice, not a replacement for runtime SSR. ([TanStack static prerendering](https://tanstack.com/start/latest/docs/framework/react/guide/static-prerendering))
- **SPA/static shell:** TanStack Start’s SPA mode generates a `/_shell.html` shell and is deployable on a CDN. TanStack explicitly notes that this improves deployment simplicity/cost but loses server-rendered initial content and is less SEO-friendly. On Netlify, the documented catch-all rewrite is `/* /_shell.html 200`; server-function and server-route paths must be allow-listed before that catch-all if they are still used. ([TanStack SPA mode](https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode))

Thus Netlify supports both a full server-backed Start deployment and static output, but static export/SPA mode intentionally gives up (or separately routes around) the normal SSR request path. The last sentence is a direct implication of the cited deployment modes, not a claim that Netlify automatically converts an SSR app into a static site.
