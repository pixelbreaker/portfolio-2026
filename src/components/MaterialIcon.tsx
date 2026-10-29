import './MaterialIcon.css'

// The glyph name's own text becomes the icon, so nothing may alter the
// letters. The font is subset in the root head, and an unlisted name paints
// its raw words — keep these names and `icon_names=` in __root.tsx in step.
export function MaterialIcon({ name }: { name: string }) {
  return (
    <span className="material-icon" aria-hidden="true">
      {name}
    </span>
  )
}
