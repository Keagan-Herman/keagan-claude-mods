// Original backdrop scenes as SVG. Nothing here is taken from any series or artist.
// The desktop caps an SVG at 131072 characters; every scene here is far under that.

export const MAX_IMAGE_BYTES = 95_000
export const SCENES = ['burst', 'aura', 'stadium'] as const
export type Scene = (typeof SCENES)[number]

const W = 1600
const H = 900
const OPEN = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">`
const SHADE = `<rect width="${W}" height="${H}" fill="#05060D" opacity="0.30"/>`

// Same seed, same picture, so a redraw never changes the scene.
const rng = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647

  return seed / 2147483647
}

const at = (cx: number, cy: number, angle: number, radius: number): string =>
  `${(cx + Math.cos(angle) * radius).toFixed(0)},${(cy + Math.sin(angle) * radius).toFixed(0)}`

const burst = (): string => {
  const next = rng(7)
  const [cx, cy] = [1120, 430]
  let rays = ''

  for (let i = 0; i < 110; i += 1) {
    const angle = (i / 110) * Math.PI * 2 + next() * 0.03
    const spread = 0.004 + next() * 0.012
    const inner = 150 + next() * 160

    rays += `<polygon points="${at(cx, cy, angle, inner)} ${at(cx, cy, angle - spread, 1900)} ${at(cx, cy, angle + spread, 1900)}" fill="#FFE9B0" opacity="${(0.05 + next() * 0.11).toFixed(2)}"/>`
  }

  return (
    `${OPEN}<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0B1030"/><stop offset="1" stop-color="#241238"/></linearGradient>` +
    `<radialGradient id="glow"><stop offset="0" stop-color="#FFD166" stop-opacity="0.95"/><stop offset="0.35" stop-color="#FF9F1C" stop-opacity="0.45"/><stop offset="1" stop-color="#FF9F1C" stop-opacity="0"/></radialGradient></defs>` +
    `<rect width="${W}" height="${H}" fill="url(#bg)"/>${rays}<circle cx="${cx}" cy="${cy}" r="320" fill="url(#glow)"/>${SHADE}</svg>`
  )
}

const aura = (): string => {
  const next = rng(11)
  let wisps = ''

  for (let i = 0; i < 46; i += 1) {
    const x = 120 + next() * 1360
    const height = 220 + next() * 520

    wisps += `<rect x="${x.toFixed(0)}" y="${(H - height).toFixed(0)}" width="${(2 + next() * 5).toFixed(1)}" height="${height.toFixed(0)}" fill="url(#rise)" opacity="${(0.25 + next() * 0.5).toFixed(2)}"/>`
  }

  return (
    `${OPEN}<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03100E"/><stop offset="1" stop-color="#063037"/></linearGradient>` +
    `<linearGradient id="rise" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#6CFFC0" stop-opacity="0.9"/><stop offset="1" stop-color="#6CFFC0" stop-opacity="0"/></linearGradient>` +
    `<filter id="soft"><feGaussianBlur stdDeviation="46"/></filter></defs>` +
    `<rect width="${W}" height="${H}" fill="url(#bg)"/>` +
    `<g filter="url(#soft)"><ellipse cx="800" cy="900" rx="620" ry="300" fill="#35E0A1" opacity="0.55"/><ellipse cx="520" cy="760" rx="300" ry="360" fill="#2BA8C9" opacity="0.35"/><ellipse cx="1150" cy="700" rx="260" ry="320" fill="#6CFFC0" opacity="0.28"/></g>` +
    `${wisps}${SHADE}</svg>`
  )
}

const stadium = (): string => {
  const next = rng(23)
  let streaks = ''

  for (let i = 0; i < 26; i += 1) {
    const y = 40 + next() * 520
    const x = next() * 1200

    streaks += `<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x + 180 + next() * 320).toFixed(0)}" y2="${(y - 60 - next() * 80).toFixed(0)}" stroke="#FFFFFF" stroke-width="${(1 + next() * 2).toFixed(1)}" opacity="${(0.06 + next() * 0.12).toFixed(2)}"/>`
  }

  const beam = (x: number) => `<polygon points="${x},0 ${x + 70},0 ${x + 360},640 ${x - 240},640" fill="url(#beam)"/>`

  return (
    `${OPEN}<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E1030"/><stop offset="0.6" stop-color="#3A1C5A"/><stop offset="1" stop-color="#FF7E5F"/></linearGradient>` +
    `<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.34"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient></defs>` +
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>${beam(180)}${beam(520)}${beam(980)}${beam(1330)}${streaks}` +
    `<polygon points="0,640 ${W},640 ${W},${H} 0,${H}" fill="#10162B"/>` +
    `<g stroke="#FFFFFF" stroke-width="3" fill="none" opacity="0.28"><line x1="0" y1="700" x2="${W}" y2="700"/><line x1="800" y1="640" x2="800" y2="${H}"/><line x1="300" y1="640" x2="-200" y2="${H}"/><line x1="1300" y1="640" x2="1800" y2="${H}"/><ellipse cx="800" cy="770" rx="170" ry="48"/></g>` +
    `${SHADE}</svg>`
  )
}

export type ImageResult = { uri: string } | { error: string }

const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

// The image rides inside the SVG, so it must stay under the cap: about 95 KB of picture.
export const toDataUri = (base64: string, fileName: string): ImageResult => {
  const mime = MIME[(fileName.split('.').pop() ?? '').toLowerCase()]
  const bytes = Math.floor((base64.length * 3) / 4)

  if (!mime) {
    return { error: 'use a .jpg, .png or .webp file' }
  }

  return bytes > MAX_IMAGE_BYTES
    ? { error: `the image is ${Math.round(bytes / 1000)} KB, the limit is ${Math.round(MAX_IMAGE_BYTES / 1000)} KB` }
    : { uri: `data:${mime};base64,${base64}` }
}

export const sceneSvg = (scene: string, imageUri?: string | null): string => {
  if (imageUri) {
    return `${OPEN}<image href="${imageUri}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/><rect width="${W}" height="${H}" fill="#05060D" opacity="0.35"/></svg>`
  }

  return scene === 'aura' ? aura() : scene === 'stadium' ? stadium() : burst()
}
