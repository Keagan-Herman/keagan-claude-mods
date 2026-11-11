import { expect, test } from 'claude-code/testing'

import { nextPrompt } from './step'

test('the next prompt follows the phase that finished', () => {
  expect(nextPrompt('Batch 4 is done and batch 5 is next.', false)).toBe('Start Batch 5')
  expect(nextPrompt('M0 Phase 5 committed. Next: M0 Phase 6.', false)).toBe('Start M0 Phase 6')
  expect(nextPrompt('Batch 3 done. Batch 4 done.', true)).toBe(
    "Commit Batch 4 locally (don't push), then start Batch 5",
  )
})

test('no phase means no phase suggestion', () => {
  expect(nextPrompt('All phases are done.', false)).toBe(undefined)
  expect(nextPrompt('Fixed it. The next step is the dropdowns.', false)).toBe('next step')
  expect(nextPrompt('Hello there.', false)).toBe(undefined)
})
