// Palette and the power-level wording. Generic shonen flavour; no names or text from any series.

export const ORANGE = '#FF9F1C'
export const SKY = '#4CC9F0'
export const RED = '#FF4D6D'
export const GOLD = '#FFD166'

export const fmtPower = (n: number): string => n.toLocaleString('en-US')

export const rankOf = (turns: number): string =>
  turns < 5 ? 'Rookie' : turns < 15 ? 'Regular' : turns < 40 ? 'Ace' : 'Legend'

// A nod to the "over nine thousand" joke once the session has written that much.
export const powerNote = (power: number): string => (power > 9000 ? ' (over 9000)' : '')

export type RowState = { isRunning: boolean; isErrored: boolean }

export const rowMark = ({ isRunning, isErrored }: RowState): { glyph: string; color: string } =>
  isErrored
    ? { glyph: '✖', color: RED }
    : isRunning
      ? { glyph: '◇', color: SKY }
      : { glyph: '◆', color: ORANGE }
