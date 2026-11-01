import { describe, expect, it } from 'vitest'

import { assignKeys, lettersOf, type Assignable } from './assignKeys'

const candidates = (...labels: string[]): Assignable[] =>
  labels.map((label, id) => ({ id, letters: lettersOf(label) }))

const keysOf = (labels: string[]): (string | null)[] => {
  const assigned = assignKeys(candidates(...labels))
  return labels.map((_, id) => assigned.get(id)?.letter ?? null)
}

describe('lettersOf', () => {
  it('folds the label to lowercase a-z letters', () => {
    expect(lettersOf('About')).toBe('about')
  })

  it('drops spaces, digits and punctuation', () => {
    expect(lettersOf('/Done 2026!')).toBe('done')
  })

  it('folds accents to their letter', () => {
    expect(lettersOf('Éclair')).toBe('eclair')
  })
})

describe('assignKeys', () => {
  it('gives each label its leftmost letter', () => {
    expect(keysOf(['About', 'Seen', 'Thought'])).toEqual(['a', 's', 't'])
  })

  it('serves a shared letter to its first claimant', () => {
    expect(keysOf(['home', 'how', 'house'])).toEqual(['h', 'o', 'u'])
  })

  it('skips a letter an earlier label took', () => {
    expect(keysOf(['Done', 'Docs'])).toEqual(['d', 'o'])
  })

  it('leaves an element unkeyed when all its letters are taken', () => {
    const alphabet = Array.from({ length: 26 }, (_, i) =>
      String.fromCharCode(97 + i),
    )
    expect(keysOf([...alphabet, 'aa'])).toEqual([...alphabet, null])
  })

  it('keeps a surviving element on its letter', () => {
    const first = assignKeys(candidates('Done', 'Docs'))
    expect([...first.values()]).toEqual([
      { letter: 'd', at: 0 },
      { letter: 'o', at: 1 },
    ])
    const next = assignKeys(
      [
        { id: 0, letters: 'done' },
        { id: 1, letters: 'docs' },
        { id: 2, letters: 'done' },
      ],
      first,
    )
    expect([...next.values()]).toEqual([
      { letter: 'd', at: 0 },
      { letter: 'o', at: 1 },
      { letter: 'n', at: 2 },
    ])
  })

  it('reassigns when a surviving element changed its label', () => {
    const sticky = new Map([[0, { letter: 'd', at: 0 }]])
    expect([...assignKeys([{ id: 0, letters: 'seen' }], sticky).values()]).toEqual(
      [{ letter: 's', at: 0 }],
    )
  })
})
