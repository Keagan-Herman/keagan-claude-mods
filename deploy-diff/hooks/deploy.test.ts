import { expect, test } from 'claude-code/testing'

import { advise, parseChanges } from './deploy'

const firebase = { firebase: true, supabase: false }

test('a commit is read into deploy advice', () => {
  const changes = parseChanges(
    'M\tfunctions/src/orders.ts\nM\tfirestore.rules\nA\tscripts/backfill.ts\nR100\told.ts\tnew.ts\n',
  )
  expect(changes[3]).toEqual({ status: 'R', path: 'new.ts' })
  expect(advise(changes, firebase)).toEqual([
    'firebase deploy --only functions,firestore:rules',
    'New script, run by hand: scripts/backfill.ts',
  ])
})

test('migrations are listed only for a Supabase repo, and nothing means no card', () => {
  const changes = parseChanges('A\tsupabase/migrations/0108_x.sql\nM\tsrc/app/page.tsx\n')
  expect(advise(changes, { firebase: false, supabase: true })).toEqual([
    'Apply by hand (a deploy will not): 0108_x.sql',
  ])
  expect(advise(changes, firebase)).toEqual([])
})
