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

Static assets served verbatim live in `public/`; the root route declares its favicon there (`public/favicon.ico`, carried over from the old Gatsby site).

Global styles and tokens live in `src/styles.css`. The root route declares the Google Fonts links: Inter (400/600) sets headings, nav, and chrome, while Source Serif 4 (variable `opsz`, weights 400 and 700, behind the `--font-body` token) sets running copy — `.page-intro`, `.work-card p`, and prose paragraphs, lists, quotes, and table cells; code stays Inter. The Material Symbols Outlined link subsets via `icon_names` to the three theme-toggle glyphs. The root route also runs a small theme script before the first body paint. The theme toggle cycles system-following (`auto`, the default with no stored `portfolio-theme` value), forced light, and forced dark, showing the `contrast_auto`, `contrast`, and `contrast_inverse` ligature icons. A saved `portfolio-theme` preference takes precedence over the system setting; React keeps a neutral initial snapshot during hydration so it does not overwrite that pre-paint choice. CSS `color-scheme` and `light-dark()` also follow the system theme when JavaScript is disabled.

## Tests

```sh
pnpm test
```

Vitest runs in jsdom with Testing Library. Two suites cover the content paths: `src/markdown.test.tsx` asserts the markdown renderer's GFM markup and that raw HTML is not rendered, and `src/tests/content-pages.test.tsx` resolves the example content pages (markdown, component, a second-section page, and a section listing) through the real route tree and renders the same server-rendered HTML string production serves, including the 404 for unknown paths. Tests live outside `src/routes` so the route generator ignores them.

## Pages and content

The header's top-left brand is the PIXELBREAKER wordmark from the old Gatsby site (`src/components/HeaderLogo/logo.svg`, imported with `?raw`), painting via `fill="currentColor"` — off-white `--color-text` on dark, dark grey on light. The top-level `to="/"` Link is the only accessibility name for it, so the inline SVG is `aria-hidden`. On wide viewports the main navigation sits to the right, directly left of the theme toggle; on narrow ones it wraps to a second row. The nav is static `/about` plus one link per content section (`contentSections()` in `src/content.ts`): every folder under `src/content/` with pages gets an entry labelled by its prettified name, in alphabetical order, pointing at `/<section>`. A folder with no files contributes nothing.

Content pages are declared by the file system: a file at `src/content/<section>/<slug>.md` (or `.tsx`) is served at `/<section>/<slug>`, and `/<section>` lists every page in that section in slug order. The splat route `src/routes/$.tsx` resolves all of this — adding a sub-folder like `src/content/talks/` creates `/talks` with no code change. Static routes (`/`, `/about`) outrank the splat; unknown paths 404. Links to content go through `to="/$" params={{ _splat: 'projects/slug' }}` because the splat param is typed `_splat`. Two body forms:

- **Markdown**: write `src/content/<section>/<slug>.md` with a leading frontmatter block (`title:`, `summary:`); a missing `title` falls back to the prettified slug. It renders with GFM extensions (tables, task lists, strikethrough, autolinks); raw HTML in the markdown is not rendered.
- **React component**: add `src/content/<section>/<slug>.tsx` exporting `title`, `summary`, and a default-exported component. The page shell renders the title and summary; the component owns everything below and can use any React feature for custom layouts or experiments.

The listing and detail paths read the same entry from the glob registry in `src/content.ts`. The initial examples are two projects (one per body form) and one `writing` page that documents this routing scheme.

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
