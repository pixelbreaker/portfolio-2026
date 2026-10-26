# Portfolio 2026

TanStack Start portfolio built with React, file-based routing, and server-side rendering.

## Requirements

- Node.js 22 (`nvm use` selects the version in `.nvmrc`)
- pnpm 11.22.0, pinned in `package.json`

## Commands

```sh
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
pnpm preview
```

Routes live in `src/routes`. TanStack Start uses the router factory in `src/router.tsx` and the document shell in `src/routes/__root.tsx`; its built-in client and server entrypoints handle hydration and SSR. The route tree is generated during development and validation commands and is intentionally not committed.

Global styles and tokens live in `src/styles.css`. The root route declares the Inter Google Fonts link and runs a small theme script before the first body paint. A saved `portfolio-theme` preference takes precedence over the system setting. React keeps a neutral initial snapshot during hydration so it does not overwrite that pre-paint choice. CSS `color-scheme` and `light-dark()` also follow the system theme when JavaScript is disabled.

## Tests

```sh
pnpm test
```

Vitest runs in jsdom with Testing Library. Two suites cover the content paths: `src/markdown.test.tsx` asserts the markdown renderer's GFM markup and that raw HTML is not rendered, and `src/tests/project-pages.test.tsx` resolves each example project (markdown and component) through the real route tree and renders the same server-rendered HTML string production serves, including the 404 for unknown slugs. Tests live outside `src/routes` so the route generator ignores them.

## Pages and content

The main navigation links to `/about` and `/projects`. Projects have a listing and an individual page at `/projects/:slug`. To publish a project, add an entry with a unique slug, title, and summary to the `projects` array in `src/work.ts`, and give it a body in one of two forms:

- **Markdown**: write `src/content/<slug>.md`, import it in `src/work.ts` with `?raw`, and set `body` to `{ kind: 'markdown', source }`. It renders with GFM extensions (tables, task lists, strikethrough, autolinks); raw HTML in the markdown is not rendered.
- **React component**: add `src/content/<slug>.tsx` with a default-exported component and set `body` to `{ kind: 'component', component }`. The page shell still renders the title and summary; the component owns everything below and can use any React feature for custom layouts or experiments.

The listing and detail route use the same entry; an unknown slug returns a 404. The initial examples document this portfolio and its server-rendering decision, one in each body form.

## Commit messages

The `prepare` script installs the Husky `commit-msg` hook. After installing dependencies on a fresh clone, run `pnpm prepare` if your installer skips lifecycle scripts. Commitlint enforces Conventional Commits using `@commitlint/config-conventional`:

```text
feat: add project cards
fix(theme): prevent a light-theme flash
feat!: change the routing contract
```

Use `type(optional-scope): description`, with `!` before the colon for breaking changes. Allowed types are `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, and `test`. Merge messages and version-only messages are not exempt; write a conventional message for those commits too.

To check a message manually, run `printf 'feat: add project cards\n' | pnpm commitlint`. Local hooks can be bypassed with `--no-verify`; this is not server-side or CI enforcement.

## Deployment

The [Netlify TanStack Start adapter](https://docs.netlify.com/build/frameworks/framework-setup-guides/tanstack-start/) generates the server function and routing configuration. `netlify.toml` builds with `pnpm build` and publishes `dist/client`. Do not restore the old `/* → /index.html` SPA rewrite: requests must reach Start for SSR and HTTP 404 responses.

Connect the Git repository to a Netlify project to deploy. No site credentials or deployment are included here. Local development uses the adapter's Netlify emulation; Edge Functions emulation is disabled because this app uses Node-based serverless functions, not the separate Deno edge runtime.
