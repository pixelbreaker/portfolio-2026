import { useEffect, useRef } from 'react'

import './Lasso.css'

export function Lasso() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (
      !el ||
      !window.matchMedia('(hover: hover) and (pointer: fine)').matches
    ) {
      return
    }

    let frame = 0
    let x = 0
    let y = 0

    const apply = () => {
      frame = 0
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }

    const onMove = (event: PointerEvent) => {
      x = event.clientX
      y = event.clientY
      if (!frame) frame = requestAnimationFrame(apply)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [])

  return <div className="lasso" ref={ref} />
}
