import { expect, test } from 'claude-code/testing'

import { asksForDownloads, pickDownloads } from './dl'
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
