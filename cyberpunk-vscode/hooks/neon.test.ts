import { expect, test } from 'claude-code/testing'

import { fmtMs, fmtTokens, isFlavourWord, netWord, stripes, tagOf } from './neon'

test('words, tags and numbers', () => {
  expect(netWord('tool-use', 'Sauteing')).toBe(netWord('tool-use', 'Sauteing'))
  expect(isFlavourWord('Sauteing')).toBe(true)
  expect(isFlavourWord('Creating notes.md')).toBe(false)
  expect(tagOf('Bash', { isRunning: false, isErrored: false }).text).toBe('▌BASH ')
  expect(tagOf('mcp__claude_ai_Supabase__execute_sql', { isRunning: false, isErrored: false }).text).toBe('▌CLAUDE ')
  expect(tagOf('Bash', { isRunning: false, isErrored: true }).text).toBe('▌ERR ')
  expect(fmtMs(65000)).toBe('1m 5s')
  expect(fmtTokens(1234)).toBe('1.2K')
})

test('the stripe block is a safe, small SVG', () => {
  const svg = stripes(36, 14)
  expect(svg.startsWith('<svg')).toBe(true)
  expect(svg.includes('<script')).toBe(false)
  expect(svg.length).toBeLessThan(2000)
})
