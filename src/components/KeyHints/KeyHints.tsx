import { useEffect } from 'react'

import { assignKeys, lettersOf, type KeyAssignment } from './assignKeys'
import './KeyHints.css'

const SELECTOR = 'a, button'
const HINT_CLASS = 'key-hint'
const EXCLUDE_SELECTOR = '[data-keyhints-exclude]'
const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable]'
// Coalescing window for DOM mutations: one pass per frame of churn.
const COALESCE = 16

type Segment = { node: Text; start: number }
type Candidate = {
  el: HTMLElement
  label: string
  letters: string
  at: number[]
}
type Split = { node: Text; original: string; created: (Element | Text)[] }

// The visible label: text nodes only, decorations (aria-hidden icons, the
// logo, the gallery counter) skipped. Hint spans are walked through, so their
// characters keep their index and the label reads the same split or whole.
function labelSegments(el: HTMLElement): {
  label: string
  segments: Segment[]
} {
  let label = ''
  const segments: Segment[] = []
  const walk = (parent: Node) => {
    for (const child of parent.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child as Text
        segments.push({ node: text, start: label.length })
        label += text.data
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if ((child as Element).hasAttribute('aria-hidden')) continue
        walk(child)
      }
    }
  }
  walk(el)
  return { label, segments }
}

const everyOurs = (nodes: NodeList, ours: WeakSet<Node>) => {
  for (const node of nodes) {
    if (!ours.has(node)) return false
  }
  return true
}

export function KeyHints() {
  useEffect(() => {
    const ids = new WeakMap<Element, number>()
    const sticky = new Map<number, KeyAssignment>()
    const visible = new WeakMap<Element, boolean>()
    const observed = new WeakSet<Element>()
    const splits = new Map<Text, Split>()
    const keys = new Map<string, HTMLElement>()
    // Every node this feature made: hint spans, the single-character text they
    // hold, and the text remainder each split produced. A mutation record
    // whose nodes are all ours is an echo.
    const ours = new WeakSet<Node>()
    // Text nodes this feature split, kept for their lifetime: restore rewrites
    // their data, and that record must read as an echo whenever it lands.
    const touched = new WeakSet<Text>()
    let nextId = 0

    const idOf = (el: Element) => {
      let id = ids.get(el)
      if (id === undefined) {
        id = nextId
        nextId += 1
        ids.set(el, id)
      }
      return id
    }

    // Keyables of the current page state: links and buttons with visible
    // text. An icon-only control has no text node, so it never appears. A
    // modal dialog makes the rest of the document inert, so when one is open
    // it is the scope; the visibility filter drops hidden elements.
    const collect = (): Candidate[] => {
      const dialogs =
        document.querySelectorAll<HTMLDialogElement>('dialog[open]')
      const scope = dialogs[dialogs.length - 1] ?? document.body
      const out: Candidate[] = []
      for (const el of scope.querySelectorAll<HTMLElement>(SELECTOR)) {
        if (el.closest(EXCLUDE_SELECTOR) || el.closest('[aria-hidden="true"]')) {
          continue
        }
        // React streams out-of-order boundaries into hidden body containers;
        // splitting their text breaks hydration. checkVisibility sees through
        // a display:none ancestor, computed style of the element cannot.
        if (el.closest('[hidden]')) continue
        if ((el as HTMLButtonElement).disabled) continue
        const style = window.getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden') continue
        if (
          typeof el.checkVisibility === 'function' &&
          !el.checkVisibility({ opacityProperty: false, visibilityProperty: true })
        ) {
          continue
        }
        const { label } = labelSegments(el)
        const letters = lettersOf(label)
        if (!letters) continue
        // at[i] is the label index of letters[i].
        const at: number[] = []
        for (let i = 0; i < label.length; i += 1) {
          if (lettersOf(label[i])) at.push(i)
        }
        out.push({ el, label, letters, at })
      }
      return out
    }

    // Wrap label index `labelAt` in a hint span. splitText keeps the head in
    // the node and returns the tail; splitText(1) on the tail leaves the
    // single character in the tail and returns the remainder. Segments
    // re-walked after a split find later characters in the remainder, so one
    // text node can carry several hints.
    const underline = (
      candidate: Candidate,
      labelAt: number,
    ): HTMLSpanElement | null => {
      const { label, segments } = labelSegments(candidate.el)
      // The label shifted under the candidate: the next recompute re-derives
      // it, so this pass leaves the element unkeyed.
      if (label !== candidate.label) return null
      const segment = segments.find(
        (s) => labelAt >= s.start && labelAt < s.start + s.node.data.length,
      )
      if (!segment) return null
      const node = segment.node
      // A hint span's own text: never split a hint.
      if (node.parentElement?.closest(`.${HINT_CLASS}`)) return null
      let record = splits.get(node)
      if (!record) {
        record = { node, original: node.data, created: [] }
        splits.set(node, record)
      }
      const tail = node.splitText(labelAt - segment.start)
      const rest = tail.splitText(1)
      const span = document.createElement('span')
      span.className = HINT_CLASS
      span.appendChild(tail)
      rest.before(span)
      ours.add(span)
      ours.add(tail)
      touched.add(node)
      ours.add(rest)
      // restore removes the span and the remainder, then puts the node's full
      // text back, so no character is duplicated.
      record.created.push(span, tail, rest)
      return span
    }

    // Put every touched text node back exactly as it was.
    const restore = () => {
      for (const record of splits.values()) {
        record.node.data = record.original
        for (const created of record.created) created.remove()
      }
      splits.clear()
      keys.clear()
    }

    const recompute = () => {
      const candidates = collect().filter(
        (candidate) => visible.get(candidate.el) !== false,
      )
      const live = new Set(candidates.map((candidate) => idOf(candidate.el)))
      for (const id of [...sticky.keys()]) {
        if (!live.has(id)) sticky.delete(id)
      }
      const assigned = assignKeys(
        candidates.map((candidate) => ({
          id: idOf(candidate.el),
          letters: candidate.letters,
        })),
        sticky,
      )
      for (const [id, found] of assigned) sticky.set(id, found)

      restore()
      for (const candidate of candidates) {
        const found = assigned.get(idOf(candidate.el))
        if (!found) continue
        const span = underline(candidate, candidate.at[found.at])
        if (span) keys.set(found.letter, candidate.el)
      }

      // Observe each element once: re-observing is a spec no-op, so the
      // observer's initial delivery settles after a single recompute.
      for (const candidate of candidates) {
        if (io && !observed.has(candidate.el)) {
          observed.add(candidate.el)
          io.observe(candidate.el)
        }
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        (target instanceof Element && target.closest(EDITABLE_SELECTOR))
      ) {
        return
      }
      // Shift+letter is the same key, so a capital reaches a lowercase label.
      // Single printable characters only: Tab, arrows and F-keys pass through.
      if (event.key.length !== 1) return
      const letter = lettersOf(event.key)
      if (!letter) return
      // A navigation may have landed in the same frame as this press: the
      // coalesced recompute is due, so settle it before reading the keys.
      if (timer !== null) {
        window.clearTimeout(timer)
        timer = null
        recompute()
      }
      const el = keys.get(letter)
      if (!el) return
      event.preventDefault()
      // Focus first: the site's :focus-visible ring marks where tabbing
      // resumes, and click() runs React handlers and Link navigation.
      el.focus()
      el.click()
    }

    // The visible-viewport rule: a horizontally scrolled strip keys the frames
    // on screen. No IntersectionObserver (jsdom, old browsers): all visible.
    const io =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver((entries) => {
            for (const entry of entries) {
              visible.set(entry.target, entry.isIntersecting)
            }
            recompute()
          })
        : null

    let timer: number | null = null
    const schedule = () => {
      if (timer !== null) return
      timer = window.setTimeout(() => {
        timer = null
        recompute()
      }, COALESCE)
    }

    const observer = new MutationObserver((records) => {
      // Our own writes echo back: a childList record whose added and removed
      // nodes are all ours, and a characterData record on a node this feature
      // split. Attribute records are never ours. Ignoring an echo keeps the
      // observer loop closed.
      const echo = records.every((record) => {
        if (record.type === 'attributes') return false
        if (record.type === 'characterData') {
          return touched.has(record.target as Text)
        }
        return (
          everyOurs(record.addedNodes, ours) && everyOurs(record.removedNodes, ours)
        )
      })
      if (!echo) schedule()
    })
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
      attributeFilter: [
        'open',
        'class',
        'style',
        'href',
        'disabled',
        'hidden',
        'aria-hidden',
      ],
    })
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('resize', schedule)
    // A content page hydrates its body in a later commit. Splitting text in
    // the mount effect mismatches the trees; a task later React owns it.
    schedule()

    return () => {
      if (timer !== null) window.clearTimeout(timer)
      observer.disconnect()
      io?.disconnect()
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('resize', schedule)
      restore()
    }
  }, [])

  return null
}
