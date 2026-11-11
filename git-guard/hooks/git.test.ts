import { expect, test } from 'claude-code/testing'

import { gitVerb, parseAccounts, parseStatus, wantsPush } from './git'

test('only a real git push counts as a push', () => {
  expect(gitVerb('git push origin main', 'push')).toBe(true)
  expect(gitVerb('cd app && git -C "C:/my repo" push', 'push')).toBe(true)
  expect(gitVerb('git commit -m "push fix"', 'push')).toBe(false)
  expect(gitVerb('git log --grep push', 'push')).toBe(false)
  expect(gitVerb('git commit -m "x"; git commit --amend', 'push')).toBe(false)
})

test('the prompt asks for a push, or says not to', () => {
  expect(wantsPush('Apply it, then push changes.')).toBe(true)
  expect(wantsPush('Switch to alice and push again')).toBe(true)
  expect(wantsPush('commit batch 1 (dont push or sync) then start batch 2')).toBe(false)
  expect(wantsPush('commit but dont push')).toBe(false)
  expect(wantsPush('This session is being continued ... never push')).toBe(false)
  expect(wantsPush('Yes')).toBe(false)
})

test('status counts, and accounts keep gh order', () => {
  const out = '# branch.head feature/login\n# branch.ab +2 -0\n1 .M N... a\n? b\n'
  expect(parseStatus(out)).toEqual({
    branch: 'feature/login',
    ahead: 2,
    behind: 0,
    hasUpstream: true,
    dirty: 2,
  })

  const json = JSON.stringify({
    hosts: {
      'github.com': [
        { login: 'alice', active: true },
        { login: 'work-alice', active: false },
      ],
    },
  })
  expect(parseAccounts(json).map(a => a.login)).toEqual(['alice', 'work-alice'])
})
