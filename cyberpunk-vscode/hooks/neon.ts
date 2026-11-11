// Palette and wording, kept apart from the engine so neon.test.ts needs nothing else.
// Original styling in a neon-HUD mood; no artwork, logos or text from any game.

export const YELLOW = '#FCEE0A'
export const CYAN = '#00F0FF'
export const MAGENTA = '#FF2A6D'
export const DIM = '#6B6B7B'
export const INK = '#0A0A0F'

export type Mode = 'requesting' | 'responding' | 'thinking' | 'tool-input' | 'tool-use'

const WORDS: Record<Mode, string[]> = {
  thinking: ['Jacking in', 'Decrypting', 'Syncing'],
  requesting: ['Pinging the grid', 'Dialing in'],
  'tool-use': ['Breaching', 'Slicing', 'Running the daemon'],
  'tool-input': ['Compiling', 'Patching'],
  responding: ['Transmitting', 'Uploading'],
}

const seedOf = (s: string): number => [...s].reduce((n, c) => n + c.charCodeAt(0), 0)

export const netWord = (mode: Mode, seed: string): string => {
  const list = WORDS[mode]

  return list[seedOf(seed) % list.length] ?? 'Jacking in'
}

// ponytail: the editor's spinner word is sometimes a step ("Creating notes.md"), so only a
// plain "-ing" flavour word is swapped and anything else is left as the engine wrote it.
export const isFlavourWord = (word: string): boolean => /^[A-Za-z]+ing$/.test(word)

export type RowState = { isRunning: boolean; isErrored: boolean }

// The chip in front of a tool row: tool name on yellow, LIVE on cyan while running, ERR on magenta.
export const tagOf = (tool: string, { isRunning, isErrored }: RowState): { text: string; color: string } => {
  const name = tool.replace(/^mcp__/, '').replace(/__.*/, '').toUpperCase().slice(0, 6)

  return isErrored
    ? { text: ' ERR ', color: MAGENTA }
    : { text: ` ${isRunning ? 'LIVE' : name} `, color: isRunning ? CYAN : YELLOW }
}

// A small hazard-stripe block for the band: yellow diagonals on black.
export const stripes = (width: number, height: number): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
  `<defs><pattern id="s" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
  `<rect width="4" height="8" fill="${YELLOW}"/></pattern></defs>` +
  `<rect width="${width}" height="${height}" fill="${INK}"/><rect width="${width}" height="${height}" fill="url(#s)"/></svg>`

export const fmtMs = (ms: number): string =>
  ms < 60000 ? `${Math.round(ms / 1000)}s` : `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`

export const fmtTokens = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n))

const esc = (s: string): string => s.replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`)

// The band's banner: hazard stripes, scanlines, a glitching title and a pulsing light, with the
// readout on the right. The editor draws SVG as an image, where SMIL animation still runs.
export const banner = (lit: boolean, readout: string): string => {
  const W = 560
  const H = 40
  const title = lit ? 'NET//ONLINE' : 'NET//OFFLINE'
  const main = lit ? CYAN : DIM
  const glitch = (dx: string, color: string) =>
    lit
      ? `<text x="62" y="27" fill="${color}" opacity=".55">${title}<animate attributeName="x" values="62;${dx};62;62" keyTimes="0;.04;.08;1" dur="3.7s" repeatCount="indefinite"/></text>`
      : ''

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Consolas,Menlo,monospace" font-weight="700">` +
    `<defs>` +
    `<pattern id="hz" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="8" fill="${lit ? YELLOW : DIM}"/></pattern>` +
    `<pattern id="sl" width="4" height="3" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#fff" opacity=".05"/></pattern>` +
    `<linearGradient id="edge" x1="0" x2="1"><stop offset="0" stop-color="${MAGENTA}"/><stop offset=".5" stop-color="${main}"/><stop offset="1" stop-color="${MAGENTA}" stop-opacity="0"/></linearGradient>` +
    `</defs>` +
    `<path d="M0 0H${W}V${H - 10}L${W - 10} ${H}H0Z" fill="${INK}"/>` +
    `<rect width="40" height="${H}" fill="url(#hz)"/>` +
    `<rect width="${W}" height="${H}" fill="url(#sl)"/>` +
    `<rect y="${H - 2}" width="${W - 12}" height="2" fill="url(#edge)"/>` +
    `<rect x="40" width="3" height="${H}" fill="${MAGENTA}"/>` +
    `<g font-size="17" letter-spacing="2">` +
    glitch('64', MAGENTA) +
    glitch('60', YELLOW) +
    `<text x="62" y="27" fill="${main}">${title}</text>` +
    `</g>` +
    `<circle cx="${lit ? 214 : 224}" cy="21" r="4" fill="${lit ? CYAN : MAGENTA}">` +
    (lit ? `<animate attributeName="opacity" values="1;.2;1" dur="1.6s" repeatCount="indefinite"/>` : '') +
    `</circle>` +
    `<text x="${W - 18}" y="25" font-size="11" font-weight="400" fill="${lit ? YELLOW : DIM}" text-anchor="end" letter-spacing="1">${esc(readout)}</text>` +
    `</svg>`
  )
}
