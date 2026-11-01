// Key assignment: the leftmost letter of a label no earlier label claimed. A
// shared letter serves its first claimant, so an element past the 26 letters
// of the alphabet gets no hint at all (never a 2-key sequence).
export type KeyAssignment = { letter: string; at: number }
export type Assignable = { id: number; letters: string }

// Keys are a-z only, so `/ " ? ~ '` keep their browser behaviour.
export function lettersOf(label: string): string {
  return label
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
}

/**
 * `letters` is the label's key alphabet as one string in label order; `at`
 * indexes it, so a hint lands on that character. `sticky` carries prior
 * assignments for elements that survive a recompute.
 */
export function assignKeys(
  candidates: Assignable[],
  sticky: Map<number, KeyAssignment> = new Map(),
): Map<number, KeyAssignment> {
  const out = new Map<number, KeyAssignment>()
  const taken = new Set<string>()

  for (const { id, letters } of candidates) {
    const kept = sticky.get(id)
    // An element that keeps its label keeps its key, so nav letters are
    // identical on every route.
    if (kept && !taken.has(kept.letter) && letters[kept.at] === kept.letter) {
      out.set(id, kept)
      taken.add(kept.letter)
      continue
    }
    for (let at = 0; at < letters.length; at += 1) {
      if (taken.has(letters[at])) continue
      out.set(id, { letter: letters[at], at })
      taken.add(letters[at])
      break
    }
  }

  return out
}
