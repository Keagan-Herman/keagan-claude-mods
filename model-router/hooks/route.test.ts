import { expect, test } from 'claude-code/testing'

import { fromLabel, judge, tierOf, wordsOf } from './route'

test('words from settings are added to the built-in lists, in any language', () => {
  const x = { heavy: wordsOf('investigar, 设计'), light: wordsOf('buscar'), risky: wordsOf('produccion') }

  expect(wordsOf('')).toBeNull()
  expect(wordsOf(' , ')).toBeNull()
  expect(judge('hay que investigar el fallo', undefined, x).tier).toBe('opus')
  expect(judge('重新设计登录页', undefined, x).tier).toBe('opus')
  expect(judge('buscar el archivo', undefined, x).tier).toBe('haiku')
  expect(judge('buscar la config de produccion', undefined, x).tier).toBe('sonnet')
  expect(judge('buscar el archivo').sure).toBe(false)
  expect(wordsOf('a.b')?.test('axb')).toBe(false)
})

test('light, ordinary and heavy work land on the model the table says', () => {
  expect(judge('find where the login form is defined').tier).toBe('haiku')
  expect(judge('list the files in src/lib').tier).toBe('haiku')
  expect(judge('add a test for the parser').tier).toBe('sonnet')
  expect(judge('why does checkout fail on mobile').tier).toBe('opus')
  expect(judge('refactor the data layer across the codebase').tier).toBe('opus')
  expect(judge('apply the migration and check the schema').tier).toBe('opus')
})

test('heavy beats light, and risky or long work is never Haiku', () => {
  expect(judge('find why this breaks').tier).toBe('opus')
  expect(judge('show the supabase tables').tier).toBe('sonnet')
  expect(judge(`find ${'x '.repeat(700)}`).tier).toBe('sonnet')
})

test('agent types settle it, and an unclear request is flagged unsure', () => {
  expect(judge('look at the build', 'Explore').tier).toBe('haiku')
  expect(judge('look at the build', 'Plan').tier).toBe('opus')
  expect(judge('hmm').sure).toBe(false)
  expect(judge('hmm').tier).toBe('sonnet')
})

test('model names and classifier labels map to tiers', () => {
  expect(tierOf('claude-opus-5-5')).toBe('opus')
  expect(tierOf('sonnet[1m]')).toBe('sonnet')
  expect(tierOf('claude-haiku-5-5')).toBe('haiku')
  expect(tierOf('something-else')).toBeUndefined()
  expect(fromLabel('light')).toBe('haiku')
  expect(fromLabel('heavy')).toBe('opus')
  expect(fromLabel(undefined)).toBe('sonnet')
})
