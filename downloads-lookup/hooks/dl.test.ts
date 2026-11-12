import { expect, test } from 'claude-code/testing'

import { asksForDownloads, downloadsDir, pickDownloads, wordsOf } from './dl'
import type { Entry } from './dl'

const file = (name: string, mtimeMs: number): Entry => ({ name, kind: 'file', size: 1, mtimeMs })

test('the files that match the prompt come back, best first', () => {
  const entries = [
    file('holiday.png', 9),
    file('Q3_Report.pdf', 1),
    file('Q3_Report (1).pdf', 2),
    { name: 'Q3_Guides', kind: 'dir' as const, size: 0, mtimeMs: 0 },
  ]
  const text = 'look at Q3_Report in my downloads folder again to remind yourself'

  expect(asksForDownloads(text)).toBe(true)
  expect(pickDownloads(text, entries).map(e => e.name)).toEqual([
    'Q3_Report (1).pdf',
    'Q3_Report.pdf',
    'Q3_Guides',
  ])
})

test('no match attaches nothing, and other prompts are left alone', () => {
  expect(pickDownloads('it is in my downloads', [file('holiday.png', 1)])).toEqual([])
  expect(asksForDownloads('fix the login page')).toBe(false)
})

test('settings: a Downloads folder, extra trigger words, and names in any script', () => {
  expect(downloadsDir('', undefined, '/home/a')).toBe('/home/a/Downloads')
  expect(downloadsDir('', '/mnt/dl', '/home/a')).toBe('/mnt/dl')
  expect(downloadsDir('~/Telechargements', '/mnt/dl', '/home/a')).toBe('/home/a/Telechargements')
  expect(downloadsDir('D:/Stuff', undefined, '/home/a')).toBe('D:/Stuff')
  expect(asksForDownloads('mira en descargas', wordsOf('descargas'))).toBe(true)
  expect(asksForDownloads('mira en descargas')).toBe(false)
})
