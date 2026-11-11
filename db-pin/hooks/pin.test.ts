import { expect, test } from 'claude-code/testing'

import { isDbWrite, isRef, parseApplied, pinKey } from './pin'

test('writes are told from reads', () => {
  const sql = 'mcp__claude_ai_Supabase__execute_sql'
  expect(isDbWrite(sql, 'select count(*) from checks')).toBe(false)
  expect(isDbWrite(sql, 'delete from checks where id = 1')).toBe(true)
  expect(isDbWrite('mcp__claude_ai_Supabase__apply_migration', '')).toBe(true)
  expect(isDbWrite('mcp__claude_ai_Supabase__list_tables', '')).toBe(false)
})

test('refs, keys and migration output', () => {
  expect(isRef('abcdefghijklmnopqrst')).toBe(true)
  expect(isRef('not-a-ref')).toBe(false)
  expect(pinKey('C:/r', 'main')).toBe('C:/r::main')
  expect(parseApplied('applied 0108_add_x')).toBe('0108_add_x')
  expect(parseApplied('already applied: 0108')).toBe('0108')
  expect(parseApplied('FAIL file: boom')).toBe(undefined)
})
