import { expect, test } from 'claude-code/testing'

import { fmtPower, powerNote, rankOf, rowMark } from './power'
import { MAX_IMAGE_BYTES, SCENES, sceneSvg, toDataUri } from './scenes'

test('every scene is a safe SVG under the desktop cap, and the same each time', () => {
  for (const scene of SCENES) {
    const svg = sceneSvg(scene)
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.includes('<script')).toBe(false)
    expect(svg.length).toBeLessThan(131072)
    expect(sceneSvg(scene)).toBe(svg)
  }
  expect(sceneSvg('nonsense')).toBe(sceneSvg('burst'))
})

test('your own image is used only when it fits inside the SVG cap', () => {
  const small = 'A'.repeat(1000)
  const big = 'A'.repeat(Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 8)
  expect('uri' in toDataUri(small, 'wall.WEBP')).toBe(true)
  expect('error' in toDataUri(big, 'wall.jpg')).toBe(true)
  expect('error' in toDataUri(small, 'wall.gif')).toBe(true)

  const uri = toDataUri(small, 'wall.png')
  const svg = sceneSvg('burst', 'uri' in uri ? uri.uri : null)
  expect(svg.includes('data:image/png;base64')).toBe(true)
  expect(svg.length).toBeLessThan(131072)
})

test('power level, rank and tool marks', () => {
  expect(fmtPower(12480)).toBe('12,480')
  expect(powerNote(9001)).toBe(' (over 9000)')
  expect(powerNote(100)).toBe('')
  expect(rankOf(0)).toBe('Rookie')
  expect(rankOf(20)).toBe('Ace')
  expect(rowMark({ isRunning: false, isErrored: true }).glyph).toBe('✖')
})
