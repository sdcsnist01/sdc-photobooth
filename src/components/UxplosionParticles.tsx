import { useEffect, useRef } from 'react'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  size: number
  shape: 'tri' | 'dot'
  op: number
  color: string
  rot: number
  rotSpeed: number
  layer: number
  fast: boolean
  tw: number
  // cursor-repulsion offset, eased toward/away from a target each frame
  pushX: number
  pushY: number
}

const WARM = ['#FF2F7D', '#FF2F7D', '#FF5368', '#FF6FA8', '#FF8A45', '#8C5CF6']

type Spark = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  shape: 'tri' | 'dot'
  color: string
  rot: number
  rotSpeed: number
  life: number
  maxLife: number
  wobble: number
  wobbleSpeed: number
}

function drawShard(
  ctx: CanvasRenderingContext2D,
  p: { x: number; y: number; rot: number; size: number; color: string; opacity: number },
) {
  ctx.save()
  ctx.globalAlpha = p.opacity
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rot)
  ctx.fillStyle = p.color
  ctx.beginPath()
  ctx.moveTo(0, -p.size)
  ctx.lineTo(p.size * 0.87, p.size * 0.5)
  ctx.lineTo(-p.size * 0.87, p.size * 0.5)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/**
 * Full-bleed ambient canvas background: pink/orange/purple dots and shards
 * drifting upward with a slow diagonal glow wave. Particles are pushed away
 * from the cursor, and moving the cursor spawns a light trail of sparks.
 */
export default function UxplosionParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let width = 0
    let height = 0
    let particles: Particle[] = []
    let raf = 0
    let lastT = 0

    const mouse = { x: -9999, y: -9999 }
    const rnd = (a: number, b: number) => a + Math.random() * (b - a)

    const sparks: Spark[] = []
    const spawnSparks = () => {
      const count = 2 + ((Math.random() * 2) | 0)
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        const burst = rnd(4, 22)
        sparks.push({
          x: mouse.x + rnd(-4, 4),
          y: mouse.y + rnd(-4, 4),
          vx: Math.cos(angle) * burst,
          vy: Math.sin(angle) * burst - rnd(18, 34),
          size: rnd(2, 5),
          shape: Math.random() < 0.4 ? 'tri' : 'dot',
          color: WARM[(Math.random() * WARM.length) | 0]!,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: rnd(-2, 2),
          life: 0,
          maxLife: rnd(700, 1300),
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: rnd(2, 4),
        })
      }
      if (sparks.length > 320) sparks.splice(0, sparks.length - 320)
    }

    const build = () => {
      width = window.innerWidth
      height = window.innerHeight
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.max(1, width * dpr)
      canvas.height = Math.max(1, height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const small = width < 760
      const n = small ? 60 : 140
      particles = []
      for (let i = 0; i < n; i++) {
        const layer = Math.random() < 0.5 ? 0 : Math.random() < 0.65 ? 1 : 2
        const fast = Math.random() < 0.14
        particles.push({
          x: Math.random() * width,
          y: Math.random() * (height + 160) - 80,
          vx: rnd(-5, 5) * (0.4 + layer * 0.4),
          vy: (fast ? rnd(48, 88) : rnd(12, 34)) * (0.45 + layer * 0.38),
          r: [0.6, 1.0, 1.5][layer]! * rnd(0.8, 1.4),
          size: [1.8, 2.8, 4.4][layer]! * rnd(0.8, 1.25),
          shape: layer === 2 ? 'tri' : Math.random() < 0.3 ? 'tri' : 'dot',
          op: [0.17, 0.3, 0.5][layer]! * rnd(0.85, 1.2),
          color: WARM[(Math.random() * WARM.length) | 0]!,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: rnd(-0.4, 0.4),
          layer,
          fast,
          tw: Math.random() * 100,
          pushX: 0,
          pushY: 0,
        })
      }
    }

    const draw = (t: number, dt: number) => {
      ctx.clearRect(0, 0, width, height)

      const wy = ((t / 15000) % 1.35) * height - 0.18 * height
      const wave = ctx.createLinearGradient(0, wy - 150, 0, wy + 150)
      wave.addColorStop(0, 'rgba(255,47,125,0)')
      wave.addColorStop(0.45, 'rgba(255,83,104,0.095)')
      wave.addColorStop(0.6, 'rgba(255,138,69,0.070)')
      wave.addColorStop(1, 'rgba(255,138,69,0)')
      ctx.fillStyle = wave
      ctx.fillRect(0, 0, width, height)

      const R = 150 // cursor influence radius, px
      particles.forEach((p) => {
        p.x += p.vx * dt
        p.y -= p.vy * dt
        const yy = (((p.y % (height + 160)) + height + 160) % (height + 160)) - 80
        const xx = ((p.x % width) + width) % width

        // Cursor repulsion: smooth distance falloff, stronger for nearer layers,
        // easing back to normal drift once out of range.
        const dx = xx - mouse.x
        const dy = yy - mouse.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < R && dist > 0.01) {
          const depth = 0.5 + p.layer * 0.35
          const f = (1 - dist / R) * 26 * depth
          p.pushX += ((dx / dist) * f - p.pushX) * Math.min(1, dt * 4)
          p.pushY += ((dy / dist) * f - p.pushY) * Math.min(1, dt * 4)
        } else if (p.pushX !== 0 || p.pushY !== 0) {
          p.pushX += -p.pushX * Math.min(1, dt * 1.4)
          p.pushY += -p.pushY * Math.min(1, dt * 1.4)
        }

        const rx = xx + p.pushX
        const ry = yy + p.pushY
        const op = p.op * (0.8 + 0.2 * Math.sin(t / 1800 + p.tw))

        if (p.fast) {
          ctx.save()
          ctx.globalAlpha = op * 0.7
          ctx.strokeStyle = p.color
          ctx.lineWidth = Math.max(0.6, p.r * 0.8)
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(rx, ry)
          ctx.lineTo(rx - p.vx * 0.28, ry - p.vy * 0.28)
          ctx.stroke()
          ctx.restore()
        }

        if (p.shape === 'tri') {
          drawShard(ctx, {
            x: rx,
            y: ry,
            rot: p.rot + t * p.rotSpeed * 0.0002,
            size: p.size,
            color: p.color,
            opacity: op,
          })
        } else {
          ctx.globalAlpha = op
          ctx.fillStyle = p.color
          ctx.beginPath()
          ctx.arc(rx, ry, p.r, 0, Math.PI * 2)
          ctx.fill()
        }
      })
      ctx.globalAlpha = 1

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]!
        s.life += dt * 1000
        if (s.life >= s.maxLife) {
          sparks.splice(i, 1)
          continue
        }
        s.wobble += s.wobbleSpeed * dt
        s.vy += -14 * dt
        s.x += (s.vx + Math.sin(s.wobble) * 8) * dt
        s.y += s.vy * dt
        s.rot += s.rotSpeed * dt
        const k = s.life / s.maxLife
        const fadeIn = Math.min(1, s.life / 120)
        const op = fadeIn * (1 - k) * 0.75
        const size = s.size * (0.7 + k * 0.5)
        if (s.shape === 'tri') {
          drawShard(ctx, { x: s.x, y: s.y, rot: s.rot, size, color: s.color, opacity: op })
        } else {
          ctx.save()
          ctx.globalAlpha = op
          ctx.fillStyle = s.color
          ctx.beginPath()
          ctx.arc(s.x, s.y, size, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
      }
    }

    const tick = (t: number) => {
      const dt = lastT ? Math.min(0.1, (t - lastT) / 1000) : 0
      lastT = t
      draw(t, dt)
      raf = requestAnimationFrame(tick)
    }

    const onResize = () => build()
    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      spawnSparks()
    }
    const onMouseLeave = () => {
      mouse.x = -9999
      mouse.y = -9999
    }

    build()
    window.addEventListener('resize', onResize)
    if (!reduced) {
      window.addEventListener('mousemove', onMouseMove, { passive: true })
      document.documentElement.addEventListener('mouseleave', onMouseLeave)
    }

    if (reduced) {
      draw(0, 0)
    } else {
      raf = requestAnimationFrame(tick)
    }

    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMouseMove)
      document.documentElement.removeEventListener('mouseleave', onMouseLeave)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={{ width: '100%', height: '100%' }}
    />
  )
}
