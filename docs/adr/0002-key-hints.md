# Key Hints: single-letter activation, by splitting label text

Key Hints dress the site's links and buttons with a key: one underlined letter of a control's Label, pressed to focus and activate that control. Three decisions shape the feature, and each is hard to reverse from the outside: which elements are in scope, what a key is allowed to be, and how the letter gets into the label.

## Scope is the default Interactive Elements; snare markers do not widen it

The PointerSnare's set of Interactive Elements is widened by author markers: `data-snare` admits an element, `data-snare-group` binds a cluster into one. Key Hints ignore both markers and reach links and buttons only, and only those with a Label.

The markers exist to make decoration snare-worthy: the Viewer's dialog takes a zoom-out cursor, a Gallery slide is a button-sized target with no text of its own. A letter cannot activate those. A slide is one of eleven roving tab stops, so only the named frame is focusable, and the label the PointerSnare highlights is an icon, which carries no Label. Keying the dialog itself is worse: one letter would aim at a full-screen surface whose keys belong to the Gallery's own arrows and Escape.

Consequences worth naming:

- Two features read the same element set differently, and the difference is not visible in the markup. A control that answers to the pointer may answer to no key; `CONTEXT.md` keeps this out of the terms themselves by saying Key Hints reach the default Interactive Elements.
- Markers stay a PointerSnare-only vocabulary. Nothing in the key machinery reads them, so `KeyHints.tsx` never mentions `data-snare`, and the Gallery is free to add or drop them per view without touching key behaviour.

## Activation is a single letter, never a sequence

A Key Hint names one key that activates its element immediately, so a Key Claim needs a free letter. The pool is the 26 letters of `a-z` as they appear in a label, punctuation excluded, so a page with more labelled controls than letters runs out. We decided that an element past the last free letter carries no Key Hint at all, and that activation is never two keys in sequence.

A pair is provably unnecessary. A two-key sequence is wanted only when every letter of a label is already claimed, and the non-colliding rule forbids choosing a pair whose first letter is a live single key, so every candidate pair is shadowed by the single key that fires first. The busiest route today asks 20 elements to share 26 letters, and a route that outgrows the pool shows its extra controls unkeyed.

We considered, and deleted, a hint mode: a prefix that narrowed the candidates, a one-second idle timeout that reset it, and `--armed`/`--dim` classes to show which state the page was in. Two-key activation was the reason for all of it, and that reason does not exist.

Consequences worth naming:

- The pool is the 26 letters of `a-z`, reached by folding a label's accents and dropping everything else, so `É` answers to `e` and a label of digits and punctuation alone claims nothing. Punctuation is never a key, which is what keeps find-in-page and the quote keys with the browser.
- Overflow is silent. An unkeyed control carries no badge and no legend explains the shortfall.
- The absence of a mode is deliberate. A reader who reaches for "press `;` to reveal keys, then a letter" is rebuilding the branch we removed; the design is that a single key press acts, always armed.
- Keys are inert while the event target is an editable field. That is the whole disable mechanism: there is no user-facing switch and no persisted setting, so the visitor cannot turn Key Hints off.

## The letter is placed by splitting the label's text node, client-only

A Key Hint sits inside the label it names, so the letter is underlined as part of the word, and an activation reads as the word the visitor sees. We decided to wrap that letter by splitting the label's text node with DOM calls in one client effect, and to render no Key Hint markup at all on the server.

The alternatives were a React component every control would render, and an overlay badge positioned over the letter. The component convention is the one the site already uses, but it cannot reach a label written in markdown (`src/content/done/portfolio-2026.md` links the GFM docs) or a title declared in frontmatter: those are authored as prose, so a component convention would need every control in the tree changed and would still leave the markdown labels unkeyed. An overlay badge needs layout geometry, which is absent in tests and breaks the moment the label reflows. Splitting the text node covers every authored form with no change to any component.

Consequences worth naming:

- Hydration owns the same text. A content page hydrates its body in a second commit, so a split written in the mount effect mismatches the server tree and React re-renders the whole page client-side; the first pass is deferred one coalescer task, and `collect()` skips any element under a `[hidden]` ancestor, because React streams an out-of-order Suspense boundary into a hidden container appended to the body. A `display:none` ancestor is invisible to `getComputedStyle` of the element itself, so the structural check is load-bearing.
- The writes echo back to the observer that watches them. A batch is an echo when every record is `characterData` on a node this feature split, or `childList` whose added and removed nodes are all nodes this feature made; attribute records are never ours. A timing flag cannot express this: the observer callback arrives as a task, so a deferral that runs as a microtask clears the flag before the callback is delivered.
- Splitting is reversible by construction, and `KeyHints.test.tsx` pins that a label reads identically after Key Hints leave, down to the same text node object.
- The feature's payload is code-split, and the split is invisible in the bundle. `eslint.config.ts` forbids importing `KeyHints.tsx`/`KeyHints.css` outside the gate, the same guard the splash carries.
- Keys are silent to assistive technology: no `aria-keyshortcuts`, no live region. The split preserves the accessible name, so a screen reader reads the label exactly as it did before.
