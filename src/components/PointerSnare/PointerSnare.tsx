import { useEffect, useRef } from 'react'

import './PointerSnare.css'

const SNARE_SELECTOR = 'a, button, [data-snare], [data-snare-group]'
const SNARE_GROUP_SELECTOR = '[data-snare-group]'
const POINTER_QUERY = '(hover: hover) and (pointer: fine)'
const FREE_HALF = 16 // half the free ring size; matches CSS .pointer-snare
const SNARE_PAD = 8 // 0.5rem clearance around a snared element
const MIN_SPAN = 4
const TICK_HALF = 1.5 // half the tick length; matches CSS .pointer-snare-tick
const PRESS_OUT = 3 // extra reach while a mouse button is held

const LEAD_RATE = 0.8
const LEAD_FRICTION = 0.2
const TRAIL_RATE = 0.03
const TRAIL_FRICTION = 0.6

// Snared edges don't chase the pointer: they ease onto the padded
// element box, so they get their own slower, weighted tuning.
const SNARE_RATE = 0.06
const SNARE_FRICTION = 0.6

// Each edge's rate/friction are themselves eased, so reversing direction
// (which swaps an edge between leading and trailing) never snaps it.
const RATE_RATE = 0.03
const RATE_FRICTION = 0.6
const PRECISION = 0.05

interface Edge {
  current: number
  end: number
  speed: number
  rate: number
  rateSpeed: number
  friction: number
  targetRate: number
  targetFriction: number
}

function makeEdge(): Edge {
  return {
    current: 0,
    end: 0,
    speed: 0,
    rate: TRAIL_RATE,
    rateSpeed: 0,
    friction: TRAIL_FRICTION,
    targetRate: TRAIL_RATE,
    targetFriction: TRAIL_FRICTION,
  }
}

function step(edge: Edge): boolean {
  const rateAccel = (edge.targetRate - edge.rate) * RATE_RATE
  edge.rateSpeed = edge.rateSpeed * RATE_FRICTION + rateAccel
  edge.rate += edge.rateSpeed
  edge.friction += (edge.targetFriction - edge.friction) * RATE_RATE

  const accel = (edge.end - edge.current) * edge.rate
  edge.speed = edge.speed * edge.friction + accel
  edge.current += edge.speed

  const settled =
    Math.abs(edge.speed) < PRECISION &&
    Math.abs(edge.end - edge.current) < PRECISION &&
    Math.abs(edge.targetRate - edge.rate) < 0.01
  if (settled) {
    edge.current = edge.end
    edge.speed = 0
    edge.rate = edge.targetRate
    edge.rateSpeed = 0
    edge.friction = edge.targetFriction
  }
  return !settled
}

export function PointerSnare() {
  const ref = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)
  const sidesTickRef = useRef<HTMLDivElement>(null)
  const endsTickRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    const dot = dotRef.current
    const sidesTick = sidesTickRef.current
    const endsTick = endsTickRef.current
    if (
      !el ||
      !dot ||
      !sidesTick ||
      !endsTick ||
      !window.matchMedia(POINTER_QUERY).matches
    ) {
      return
    }
    const root = document.documentElement

    // The ring is four independent friction edges; the span derives from
    // opposing pairs, so it stretches along the direction of travel.
    const left = makeEdge()
    const right = makeEdge()
    const top = makeEdge()
    const bottom = makeEdge()
    const edges = [left, right, top, bottom]

    let frame = 0
    let x = window.innerWidth / 2
    let y = window.innerHeight / 2
    let target: Element | null = null
    let pressed = false
    let targetRadius = ''

    // Ticks sit where the pointer's axes cross the border. They read the
    // raw cursor, not the eased edges, so they never lag behind it; they
    // are clamped to the border segment so they stay on the ring.
    const paintTicks = () => {
      const l = left.current
      const r = Math.max(right.current, l + MIN_SPAN)
      const t = top.current
      const b = Math.max(bottom.current, t + MIN_SPAN)
      const cx = Math.min(Math.max(x, l), r - 1)
      const cy = Math.min(Math.max(y, t), b - 1)
      // Each element spans the whole ring; its side borders paint the
      // tick marks, so sizing it right is all the positioning needs.
      sidesTick.style.width = `${r - l}px`
      sidesTick.style.transform = `translate3d(${l}px, ${cy - TICK_HALF}px, 0)`
      endsTick.style.height = `${b - t}px`
      endsTick.style.transform = `translate3d(${cx - TICK_HALF}px, ${t}px, 0)`
    }

    const paint = () => {
      const w = Math.max(right.current - left.current, MIN_SPAN)
      const h = Math.max(bottom.current - top.current, MIN_SPAN)
      el.style.width = `${w}px`
      el.style.height = `${h}px`
      el.style.transform = `translate3d(${left.current}px, ${top.current}px, 0)`
      paintTicks()
    }

    const setPointerEnds = () => {
      const reach = FREE_HALF + (pressed ? PRESS_OUT : 0)
      if (pressed) {
        for (const edge of edges) {
          edge.targetRate = SNARE_RATE
          edge.rate = SNARE_RATE
          edge.targetFriction = SNARE_FRICTION
          edge.friction = SNARE_FRICTION
        }
      }
      left.end = x - reach
      right.end = x + reach
      top.end = y - reach
      bottom.end = y + reach
    }

    // Snared corners stay concentric with the element: the arc grows with
    // the reach, so a press pushes them out instead of squaring them off.
    const setRingRadius = () => {
      el.style.borderRadius = targetRadius
        ? `calc(${targetRadius} + ${SNARE_PAD + (pressed ? PRESS_OUT : 0)}px)`
        : ''
    }

    // Refreshed every frame while snared so scrolling drags the ring.
    const setSnareEnds = () => {
      if (!target?.isConnected) {
        target = null
        return false
      }
      const rect = target.getBoundingClientRect()
      const reach = SNARE_PAD + (pressed ? PRESS_OUT : 0)

      left.end = rect.left - reach
      right.end = rect.right + reach
      top.end = rect.top - reach
      bottom.end = rect.bottom + reach
      return true
    }

    // Leading edges chase hard, trailing edges lag; each edge's tuning
    // is itself eased so a direction swap is a force ramp, not a snap.
    const setLeadStates = (dx: number, dy: number) => {
      if (target || pressed) {
        for (const edge of edges) {
          edge.targetRate = SNARE_RATE
          edge.rate = SNARE_RATE
          edge.targetFriction = SNARE_FRICTION
          edge.friction = SNARE_FRICTION
        }
        return
      }
      left.targetRate = dx < 0 ? LEAD_RATE : TRAIL_RATE
      left.targetFriction = dx < 0 ? LEAD_FRICTION : TRAIL_FRICTION
      right.targetRate = dx > 0 ? LEAD_RATE : TRAIL_RATE
      right.targetFriction = dx > 0 ? LEAD_FRICTION : TRAIL_FRICTION
      top.targetRate = dy < 0 ? LEAD_RATE : TRAIL_RATE
      top.targetFriction = dy < 0 ? LEAD_FRICTION : TRAIL_FRICTION
      bottom.targetRate = dy > 0 ? LEAD_RATE : TRAIL_RATE
      bottom.targetFriction = dy > 0 ? LEAD_FRICTION : TRAIL_FRICTION
    }

    const animate = () => {
      frame = 0
      if (target && !setSnareEnds()) {
        el.classList.remove('pointer-snare--snared')
        targetRadius = ''
        setRingRadius()
        setPointerEnds()
      }
      let moving = false
      for (const edge of edges) {
        moving = step(edge) || moving
      }
      paint()
      if (moving || target) frame = requestAnimationFrame(animate)
    }

    const onMove = (event: PointerEvent) => {
      // The ring/ticks start transparent; this class fades them in over
      // 300ms. add() is idempotent so it only fires on the first move.
      root.classList.add('pointer-snare-on')
      const dx = event.clientX - x
      const dy = event.clientY - y
      x = event.clientX
      y = event.clientY

      // A snare group is one snare for its whole cluster: even when the
      // pointer sits on an eligible child, the ring wraps the group.
      const hit =
        event.target instanceof Element
          ? (event.target.closest(SNARE_GROUP_SELECTOR) ??
            event.target.closest(SNARE_SELECTOR))
          : null
      if (hit !== target) {
        target = hit
        el.classList.toggle('pointer-snare--snared', Boolean(hit))
        targetRadius = hit ? getComputedStyle(hit).borderRadius : ''
        setRingRadius()
        if (target) setSnareEnds()
      }
      if (!target) setPointerEnds()
      setLeadStates(dx, dy)

      // Dot replaces the native cursor only outside interactive
      // elements; over a link/button the real pointer cursor returns.
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`

      // Ticks also paint here: when the ring is settled no frame runs,
      // and they must still track the cursor exactly.
      paintTicks()
      const dotVisible = !hit
      dot.classList.toggle('pointer-snare-dot--visible', dotVisible)
      root.classList.toggle('pointer-snare-cursor-none', dotVisible)

      if (!frame) frame = requestAnimationFrame(animate)
    }

    setPointerEnds()
    for (const edge of edges) edge.current = edge.end
    paint()

    window.addEventListener('pointermove', onMove, { passive: true })

    // Pressing pushes all four edges 5px outward; releasing lets the same
    // springs pull them back, so no separate easing is needed. Cancel
    // counts as release so a lost pointer never leaves the ring stretched.
    const setPressed = (down: boolean) => {
      if (pressed === down) return
      pressed = down
      if (target) setSnareEnds()
      else setPointerEnds()
      setRingRadius()
      if (!frame) frame = requestAnimationFrame(animate)
    }
    const onDown = () => setPressed(true)
    const onUp = () => setPressed(false)
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    window.addEventListener('pointercancel', onUp, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      cancelAnimationFrame(frame)
      root.classList.remove('pointer-snare-cursor-none')
      root.classList.remove('pointer-snare-on')
    }
  }, [])

  return (
    <>
      <div className="pointer-snare" ref={ref} />
      <div aria-hidden="true" className="pointer-snare-dot" ref={dotRef} />
      <div
        aria-hidden="true"
        className="pointer-snare-tick pointer-snare-tick--sides"
        ref={sidesTickRef}
      />
      <div
        aria-hidden="true"
        className="pointer-snare-tick pointer-snare-tick--ends"
        ref={endsTickRef}
      />
    </>
  )
}
