import type { ComponentType } from 'react'

// Content pages are declared by the file system, not a registry: a file at
// src/content/<section>/<slug>.md (or .tsx) is served at /<section>/<slug>.
// The folder names the section, the file name names the slug.
export type ContentPage = {
  section: string
  slug: string
  title: string
  summary: string
  // ISO `YYYY-MM-DD` from frontmatter or a named export; null when absent or
  // malformed, which puts the page after every dated one in a listing.
  published: string | null
  body: ContentBody
}

// A page body is either markdown prose or a React component for custom
// layouts and experiments. Component bodies render inside the same page shell
// (title, summary, container width) and never travel through loader data.
export type ContentBody =
  | { kind: 'markdown'; source: string }
  | { kind: 'component'; component: ComponentType }

// A .tsx content module declares its metadata beside the component:
// `export const title`, `export const summary`, `export default Component`,
// and optionally `export const published = 'YYYY-MM-DD'` for listing order.
export type ContentModule = {
  default: ComponentType
  title: string
  summary: string
  published?: string
}

// Both globs are eager and static: every page ships in the bundle, and adding
// a file under src/content/ needs no code change. Markdown arrives as raw
// text; its leading frontmatter block becomes metadata, the rest is the body.
const sources = import.meta.glob<string>('./content/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
})
const modules = import.meta.glob<ContentModule>('./content/**/*.{tsx,jsx}', {
  eager: true,
})

const pages = new Map<string, ContentPage>()
for (const [path, source] of Object.entries(sources)) {
  const id = pageIdFromPath(path)
  if (id) pages.set(id, pageFromMarkdown(id, source))
}
for (const [path, module] of Object.entries(modules)) {
  const id = pageIdFromPath(path)
  if (id) pages.set(id, pageFromModule(id, module))
}

// Sections with at least one page, in alphabetical order — the nav lists
// these; a folder with no files contributes nothing.
export function contentSections(): string[] {
  return [...new Set([...pages.values()].map((page) => page.section))].sort()
}

// `path` is the splat param, e.g. 'projects/portfolio-2026'.
export function getContentPage(path: string): ContentPage | undefined {
  return pages.get(trimSlashes(path))
}

// A listing is newest first; undated pages come last, slug order within each
// group. The date is ISO, so a string compare is the ordering: no Date
// parsing, and the served text never depends on the server's locale.
function orderSectionPages(pages: ContentPage[]): ContentPage[] {
  return [...pages].sort((a, b) => {
    if (a.published !== b.published) {
      if (a.published === null) return 1
      if (b.published === null) return -1
      return b.published.localeCompare(a.published)
    }
    return a.slug.localeCompare(b.slug)
  })
}

// Section listings order by publication, newest first.
export function sectionPages(section: string): ContentPage[] {
  return orderSectionPages(
    [...pages.values()].filter((page) => page.section === section),
  )
}

// 'design-notes' reads as 'Design notes' in headings and titles.
export function sectionLabel(section: string): string {
  return prettify(section)
}

// `2026-11-02` reads as `November 2026`. Fixed month names: the server's text
// must not depend on its locale, and the client has to hydrate the same words.
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function publishedLabel(published: string): string {
  const [year, month] = published.split('-').map(Number)
  return `${MONTHS[month - 1]} ${year}`
}

// '<section>/<slug>'; index files would collide with a section listing.
function pageIdFromPath(path: string): string | undefined {
  const match = /^\.\/content\/([^/]+)\/([^/]+)\.(?:md|tsx|jsx)$/.exec(path)
  if (!match || match[2] === 'index') return undefined
  return `${match[1]}/${match[2]}`
}

function pageFromMarkdown(id: string, source: string): ContentPage {
  const [section, slug] = splitId(id)
  const { data, body } = parseFrontmatter(source)
  return {
    section,
    slug,
    title: data.title ?? prettify(slug),
    summary: data.summary ?? '',
    // Only a real ISO date orders a listing; anything else is no date.
    published: publishedDate(data.published),
    body: { kind: 'markdown', source: body },
  }
}

function pageFromModule(id: string, module: ContentModule): ContentPage {
  const [section, slug] = splitId(id)
  return {
    section,
    slug,
    title: module.title,
    summary: module.summary,
    published: publishedDate(module.published),
    body: { kind: 'component', component: module.default },
  }
}

// `2026-11-02` is a listing key, not just text: string comparison orders it,
// so the value is stored zero-padded (`2026-11-1` becomes `2026-11-01`) and
// `2026-13-45` is no date at all — a typo sorts the page undated, never as a
// real day. No Date parsing happens at request time.
export function publishedDate(value: string | undefined): string | null {
  const parts = /^\d{4}-\d{1,2}-\d{1,2}$/.exec(value ?? '')
  if (!parts) return null
  const [year, month, day] = parts[0].split('-').map(Number)
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate()
  if (month < 1 || month > 12 || day < 1 || day > days) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${parts[0].slice(0, 4)}-${pad(month)}-${pad(day)}`
}

function splitId(id: string): [string, string] {
  const at = id.indexOf('/')
  return [id.slice(0, at), id.slice(at + 1)]
}

// Minimal frontmatter: a leading `---` block of `key: value` lines, which is
// all title/summary need. Quote a value that begins with markdown syntax.
export function parseFrontmatter(source: string): {
  data: Record<string, string>
  body: string
} {
  const match = /^---\r?\n([\s\S]*?)\r?\n---+\r?\n?/.exec(source)
  if (!match) return { data: {}, body: source }
  const data: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line)
    if (pair) data[pair[1]] = pair[2].trim()
  }
  return { data, body: source.slice(match[0].length) }
}

function prettify(value: string): string {
  return value.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

export function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, '')
}
