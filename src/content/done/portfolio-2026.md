---
title: Portfolio 2026
summary: A server-rendered portfolio built with TanStack Start and React.
---

This portfolio brings projects together in a single place, with a page for each
piece of work.

## What it is

A curated presentation of professional work. Each Project has its own page at
`/projects/<slug>`, written either as markdown or as a React component when the
layout needs something bespoke.

## How it works

TanStack Start handles file-based routing and server-rendered document
requests, deployed to Netlify through its TanStack Start adapter. The site
includes a theme preference that follows the system setting unless a visitor
chooses otherwise.

Content lives in `src/content/`; the folder name becomes the URL section and
the file name becomes the slug.

- Markdown bodies are written in `src/content/<section>/<slug>.md` and
  support [GFM](https://github.github.com/gfm/) tables, task lists, and
  fenced code blocks
- Component bodies are plain React and can do anything React can do

| Body kind | File                               | Best for                    |
| --------- | ---------------------------------- | --------------------------- |
| Markdown  | `src/content/<section>/<slug>.md`  | Prose, long-form writeups   |
| Component | `src/content/<section>/<slug>.tsx` | Custom layouts, experiments |
