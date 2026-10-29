---
title: How content routing works
summary: A second-section example proving any src/content folder becomes a route section.
---

The splat route in `src/routes/$.tsx` resolves every URL against
`src/content/`: the first folder is the section, the second is the page.

| URL           | File                                       |
| ------------- | ------------------------------------------ |
| `/projects/x` | `src/content/projects/x.md`                |
| `/writing/x`  | `src/content/writing/x.md`                 |
| `/writing`    | lists everything in `src/content/writing/` |

A section with pages exists as a URL automatically; a section with none
404s. Static routes like `/about` still win over the splat.
