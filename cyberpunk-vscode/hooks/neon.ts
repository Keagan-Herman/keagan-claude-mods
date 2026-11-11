// Palette and wording, kept apart from the engine so neon.test.ts needs nothing else.
// Original styling in a neon-HUD mood; no artwork, logos or text from any game.

export const YELLOW = '#FCEE0A'
export const CYAN = '#00F0FF'
export const MAGENTA = '#FF2A6D'
export const DIM = '#6B6B7B'
const INK = '#0A0A0F'

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

// The tag in front of a tool row: tool name in yellow, cyan while running, ERR in magenta.
export const tagOf = (tool: string, { isRunning, isErrored }: RowState): { text: string; color: string } => {
  const name = tool.replace(/^mcp__/, '').replace(/__.*/, '').toUpperCase().slice(0, 6)

  return isErrored
    ? { text: '▌ERR ', color: MAGENTA }
    : { text: `▌${isRunning ? '...' : name} `, color: isRunning ? CYAN : YELLOW }
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
