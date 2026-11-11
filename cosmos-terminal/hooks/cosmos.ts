// The space scene, the wording and the tool colours, kept apart from the engine so
// cosmos.test.ts needs nothing else. All original; nothing taken from any film or game.

export const COLS = 64
export const ROWS = 3 // terminal rows; each draws two pixels (an upper half block over a lower one)
const PX = ROWS * 2

type RGB = [number, number, number]

const BG: RGB = [5, 6, 15]
const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]

// Same seed, same sky, so the stars stay where they are between frames.
const rng = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647

  return seed / 2147483647
}

const STARS = (() => {
  const next = rng(5)

  return Array.from({ length: 24 }, () => ({
    x: Math.floor(next() * COLS),
    y: Math.floor(next() * PX),
    phase: next() * 6.28,
    speed: 0.8 + next() * 1.6,
  }))
})()

const SUN: [number, number] = [9, 2.5]
const BLACK_HOLE: [number, number] = [51, 2.5]
const PLANETS: { rx: number; ry: number; period: number; phase: number; color: RGB }[] = [
  { rx: 5, ry: 1.7, period: 6, phase: 0.5, color: [226, 123, 88] },
  { rx: 8, ry: 2.2, period: 11, phase: 2.4, color: [79, 163, 255] },
  { rx: 12, ry: 2.4, period: 19, phase: 4.1, color: [232, 210, 140] },
]

// One frame at time t (seconds): a flat list of PX * COLS pixels.
const pixels = (t: number): RGB[] => {
  const buf: RGB[] = Array.from({ length: PX * COLS }, (_, i) => mix(BG, [24, 10, 40], (i % COLS) / COLS / 4))
  const put = (x: number, y: number, color: RGB, alpha = 1) => {
    const [px, py] = [Math.round(x), Math.round(y)]

    if (px >= 0 && px < COLS && py >= 0 && py < PX) {
      buf[py * COLS + px] = mix(buf[py * COLS + px] ?? BG, color, alpha)
    }
  }

  for (const s of STARS) {
    put(s.x, s.y, [200, 220, 255], 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase)))
  }

  for (let dx = -2; dx <= 2; dx += 1) {
    for (let dy = -2; dy <= 2; dy += 1) {
      const d = Math.hypot(dx, dy * 1.2)

      if (d < 2.4) {
        put(SUN[0] + dx, SUN[1] + dy, d < 1.3 ? [255, 214, 90] : [255, 150, 40], d < 1.3 ? 1 : 0.35)
      }
    }
  }

  for (const p of PLANETS) {
    const a = (t * 2 * Math.PI) / p.period + p.phase

    put(SUN[0] + Math.cos(a) * p.rx, SUN[1] + Math.sin(a) * p.ry, p.color)
  }

  // The black hole: a dark core and an accretion disc that brightens as it turns.
  for (let x = -7; x <= 7; x += 1) {
    for (let y = 0; y < PX; y += 1) {
      const dx = x
      const dy = (y - BLACK_HOLE[1]) * 2.4
      const d = Math.hypot(dx, dy)

      if (d < 2) {
        put(BLACK_HOLE[0] + x, y, [0, 0, 0])
      } else if (d < 5.2) {
        const falloff = 1 - (d - 2) / 3.2
        const glow = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(Math.atan2(dy, dx) * 2 - t * 3))

        put(BLACK_HOLE[0] + x, y, mix([255, 120, 30], [255, 240, 200], falloff * glow), falloff * (0.45 + 0.55 * glow))
      }
    }
  }

  // A comet crosses now and then.
  const lap = (t % 12) / 12
  if (lap < 0.35) {
    const x = (lap / 0.35) * (COLS + 12) - 6

    for (let i = 0; i < 7; i += 1) {
      put(x - i, 0.5 + (x - i) * 0.025, [220, 240, 255], 1 - i / 7)
    }
  }

  return buf
}

const rgb = ([r, g, b]: RGB): number => (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export const toBase64 = (bytes: Uint8Array): string => {
  let out = ''

  for (let i = 0; i < bytes.length; i += 3) {
    const n = ((bytes[i] ?? 0) << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)

    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63]
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63] : '='
    out += i + 2 < bytes.length ? B64[n & 63] : '='
  }

  return out
}

// The Raster's cells for time t: upper half blocks, the top pixel as colour and the bottom as background.
export const frame = (t: number, columns = COLS): string => {
  const buf = pixels(t)
  const words = new Uint32Array(columns * ROWS * 3)

  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < columns; c += 1) {
      const i = (r * columns + c) * 3

      words[i] = 0x2580
      words[i + 1] = rgb(buf[r * 2 * COLS + c] ?? BG)
      words[i + 2] = rgb(buf[(r * 2 + 1) * COLS + c] ?? BG)
    }
  }

  return toBase64(new Uint8Array(words.buffer))
}

export type Mode = 'requesting' | 'responding' | 'thinking' | 'tool-input' | 'tool-use'

const WORDS: Record<Mode, string[]> = {
  thinking: ['Orbiting', 'Stargazing', 'Drifting'],
  requesting: ['Transmitting', 'Hailing'],
  'tool-use': ['Launching', 'Docking', 'Slingshotting'],
  'tool-input': ['Calibrating', 'Aligning'],
  responding: ['Broadcasting', 'Signalling'],
}

const PAST = ['Orbited', 'Charted', 'Observed', 'Computed', 'Drifted']

const seedOf = (s: string): number => [...s].reduce((n, c) => n + c.charCodeAt(0), 0)

export const spaceWord = (mode: Mode, seed: string): string => {
  const list = WORDS[mode]

  return list[seedOf(seed) % list.length] ?? 'Orbiting'
}

export const pastWord = (seed: string): string => PAST[seedOf(seed) % PAST.length] ?? 'Orbited'

const STAR = '#FFE9A8'
const PALE = '#B8D4FF'
const COMET = '#FF6B6B'
const PLANET_OF: Record<string, string> = {
  Bash: '#E27B58', // Mars
  Read: '#4FA3FF', // Earth
  Edit: '#7BE08A',
  Write: '#7BE08A',
  Grep: '#E8D28C', // Saturn
  Glob: '#E8D28C',
  Agent: '#D9A066', // Jupiter
  WebFetch: '#5B7CFA', // Neptune
  WebSearch: '#5B7CFA',
}

export type RowState = { isRunning: boolean; isErrored: boolean }

// The mark in front of a tool row: a planet coloured by the tool, a faint ring while it runs, a comet on an error.
export const rowMark = (tool: string, { isRunning, isErrored }: RowState): { glyph: string; color: string } =>
  isErrored
    ? { glyph: '☄', color: COMET }
    : isRunning
      ? { glyph: '◌', color: PALE }
      : { glyph: '●', color: PLANET_OF[tool] ?? (tool.startsWith('mcp__') ? '#38E0D0' : STAR) }
