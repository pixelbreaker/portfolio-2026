import { useEffect, useRef } from 'react'

import './PointerSnare.css'

const POINTER_QUERY = '(hover: hover) and (pointer: fine)'
const SNARE_SELECTOR = 'a, button'
const FREE_HALF = 16 // half the free ring size; matches CSS .pointer-snare
const SNARE_PAD = 8 // 0.5rem clearance around a snared element
const MIN_SPAN = 4
const TICK_HALF = 1.5 // half the tick length; matches CSS .pointer-snare-tick

const LEAD_RATE = 0.9
const LEAD_FRICTION = 0.2
const TRAIL_RATE = 0.03
const TRAIL_FRICTION = 0.6

// Snared edges don't chase the pointer: they ease onto the padded
// element box, so they get their own slower, weighted tuning.
const SNARE_RATE = 0.05
const SNARE_FRICTION = 0.6

// Each edge's rate/friction are themselves eased, so reversing direction
// (which swaps an edge between leading and trailing) never snaps it.
const RATE_RATE = 0.05
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
  const leftTickRef = useRef<HTMLDivElement>(null)
  const rightTickRef = useRef<HTMLDivElement>(null)
  const topTickRef = useRef<HTMLDivElement>(null)
  const bottomTickRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    const dot = dotRef.current
    const leftTick = leftTickRef.current
    const rightTick = rightTickRef.current
    const topTick = topTickRef.current
    const bottomTick = bottomTickRef.current
    if (
      !el ||
      !dot ||
      !leftTick ||
      !rightTick ||
      !topTick ||
      !bottomTick ||
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
      leftTick.style.transform = `translate3d(${l}px, ${cy - TICK_HALF}px, 0)`
      rightTick.style.transform = `translate3d(${r - 1}px, ${cy - TICK_HALF}px, 0)`
      topTick.style.transform = `translate3d(${cx - TICK_HALF}px, ${t}px, 0)`
      bottomTick.style.transform = `translate3d(${cx - TICK_HALF}px, ${b - 1}px, 0)`
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
      left.end = x - FREE_HALF
      right.end = x + FREE_HALF
      top.end = y - FREE_HALF
      bottom.end = y + FREE_HALF
    }

    // Refreshed every frame while snared so scrolling drags the ring.
    const setSnareEnds = () => {
      if (!target?.isConnected) {
        target = null
        return false
      }
      const rect = target.getBoundingClientRect()
      left.end = rect.left - SNARE_PAD
      right.end = rect.right + SNARE_PAD
      top.end = rect.top - SNARE_PAD
      bottom.end = rect.bottom + SNARE_PAD
      return true
    }

    // Leading edges chase hard, trailing edges lag; each edge's tuning
    // is itself eased so a direction swap is a force ramp, not a snap.
    const setLeadStates = (dx: number, dy: number) => {
      if (target) {
        for (const edge of edges) {
          edge.targetRate = SNARE_RATE
          edge.targetFriction = SNARE_FRICTION
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
        el.style.borderRadius = ''
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
      const dx = event.clientX - x
      const dy = event.clientY - y
      x = event.clientX
      y = event.clientY

      const hit =
        event.target instanceof Element
          ? event.target.closest(SNARE_SELECTOR)
          : null
      if (hit !== target) {
        target = hit
        el.classList.toggle('pointer-snare--snared', Boolean(hit))
        el.style.borderRadius = hit
          ? `calc(${getComputedStyle(hit).borderRadius} + 0.5rem)`
          : ''
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
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
      root.classList.remove('pointer-snare-cursor-none')
    }
  }, [])

  return (
    <>
      <div className="pointer-snare" ref={ref} />
      <div aria-hidden="true" className="pointer-snare-dot" ref={dotRef} />
      <div
        aria-hidden="true"
        className="pointer-snare-tick pointer-snare-tick--left"
        ref={leftTickRef}
      />
      <div
        aria-hidden="true"
        className="pointer-snare-tick pointer-snare-tick--right"
        ref={rightTickRef}
      />
      <div
        aria-hidden="true"
        className="pointer-snare-tick pointer-snare-tick--top"
        ref={topTickRef}
      />
      <div
        aria-hidden="true"
        className="pointer-snare-tick pointer-snare-tick--bottom"
        ref={bottomTickRef}
      />
    </>
  )
}
