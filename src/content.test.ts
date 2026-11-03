import { describe, expect, it } from 'vitest'

import {
  getContentPage,
  publishedDate,
  publishedLabel,
  sectionPages,
} from './content'

describe('published dates', () => {
  it('normalizes a hand-written date to the padded key the listing sorts by', () => {
    // The day is not required to be zero-padded in source: `2026-11-1` is the
    // obvious way to write a date, and it has to order as the first of November.
    expect(publishedDate('2026-11-1')).toBe('2026-11-01')
    expect(publishedDate('2026-11-01')).toBe('2026-11-01')
    expect(publishedDate('2026-1-9')).toBe('2026-01-09')
  })

  it('treats a missing or impossible date as no date at all', () => {
    expect(publishedDate(undefined)).toBeNull()
    expect(publishedDate('')).toBeNull()
    // A typo must not become a real day: 13 is not a month, 45 is not a day,
    // and February has fewer than 30.
    expect(publishedDate('2026-13-45')).toBeNull()
    expect(publishedDate('2026-02-30')).toBeNull()
    expect(publishedDate('11-01-2026')).toBeNull()
    expect(publishedDate('soon')).toBeNull()
  })

  it('reads a month and year from an ISO date, never a locale', () => {
    expect(publishedLabel('2026-11-02')).toBe('November 2026')
    // The ends of the year: an off-by-one on the month index shows up here.
    expect(publishedLabel('2026-01-31')).toBe('January 2026')
    expect(publishedLabel('2026-12-01')).toBe('December 2026')
  })

  it("lists a dated page ahead of the section's undated pages", () => {
    // src/content/done/rapha.tsx declares `published`, the other two do not:
    // the dated page leads, and the undated pair keeps file-name order.
    expect(sectionPages('done').map((page) => page.slug)).toEqual([
      'rapha',
      'portfolio-2026',
      'server-rendered-portfolio',
    ])
    expect(getContentPage('done/rapha')?.published).toBe('2026-11-01')
    expect(
      sectionPages('done')
        .filter((page) => page.slug !== 'rapha')
        .every((page) => page.published === null),
    ).toBe(true)
    expect(getContentPage('seen/canada-2026')?.published).toBeNull()
  })
})
