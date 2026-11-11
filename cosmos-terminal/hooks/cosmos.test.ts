import { expect, test } from 'claude-code/testing'

import { COLS, ROWS, frame, pastWord, rowMark, spaceWord, toBase64 } from './cosmos'

test('the scene is valid Raster cells and it moves', () => {
  const a = frame(0)
  // 3 u32 words of 4 bytes per cell, base64 of that many bytes.
  expect(a.length).toBe(Math.ceil((COLS * ROWS * 12) / 3) * 4)
  expect(a).toBe(frame(0))
  expect(frame(1.3)).not.toBe(a)
  expect(a.startsWith('gCUAAA')).toBe(true) // first cell's code point, 0x2580 little-endian
})

test('base64 is standard and padded', () => {
  expect(toBase64(new Uint8Array([102, 111, 111, 98, 97]))).toBe('Zm9vYmE=')
  expect(toBase64(new Uint8Array([102, 111]))).toBe('Zm8=')
})

test('words and tool marks', () => {
  expect(spaceWord('tool-use', 'Sauteing')).toBe(spaceWord('tool-use', 'Sauteing'))
  expect(pastWord('Baked').endsWith('ed')).toBe(true)
  expect(rowMark('Bash', { isRunning: false, isErrored: false }).glyph).toBe('●')
  expect(rowMark('Bash', { isRunning: false, isErrored: false }).color).not.toBe(
    rowMark('Read', { isRunning: false, isErrored: false }).color,
  )
  expect(rowMark('Bash', { isRunning: false, isErrored: true }).glyph).toBe('☄')
})
