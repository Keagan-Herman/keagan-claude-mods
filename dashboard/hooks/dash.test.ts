import { expect, test } from 'claude-code/testing'

import { agentRows, bar, describeCall, fmtDuration, fmtTokens, hitRate, resetsIn, topTools } from './dash'

test('numbers read well', () => {
  expect(bar(50, 10)).toBe('\u2588\u2588\u2588\u2588\u2588\u2591\u2591\u2591\u2591\u2591')
  expect(bar(150, 4)).toBe('\u2588\u2588\u2588\u2588')
  expect(fmtDuration(65_000)).toBe('1m 5s')
  expect(fmtDuration(3_720_000)).toBe('1h 2m')
  expect(fmtTokens(1234)).toBe('1.2K')
  expect(fmtTokens(250_000)).toBe('250K')
  expect(hitRate({ input_tokens: 10, cache_read_input_tokens: 90, cache_creation_input_tokens: 0 })).toBe(90)
  expect(hitRate({ input_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 })).toBe(0)
  expect(resetsIn(new Date(10_000 + 130 * 60_000).toISOString(), 10_000)).toBe('2h 10m')
  expect(resetsIn(undefined, 0)).toBe('')
  expect(topTools({ Bash: 5, Read: 9, Edit: 2, Grep: 1 })).toBe('Read 9, Bash 5, Edit 2')
})

test('a tool call becomes a few words', () => {
  expect(describeCall('Bash', { command: 'npm   test\n-- --watch' }).detail).toBe('npm test -- --watch')
  expect(describeCall('Edit', { file_path: 'C:\\app\\src\\page.tsx' })).toEqual({ tool: 'Edit', detail: 'page.tsx' })
  expect(describeCall('mcp__claude_ai_Supabase__execute_sql', {}).tool).toBe('execute_sql')
  expect(describeCall('Grep', { pattern: 'x'.repeat(80) }).detail.length).toBe(38)
})

test('only working agents show, oldest first, with what they last did', () => {
  const agents = [
    { id: 'b', type: 'Explore', description: 'map the auth code', status: 'running' },
    { id: 'a', type: 'general-purpose', description: 'write tests', status: 'waiting', name: 'tester' },
    { id: 'c', type: 'Plan', description: 'old job', status: 'completed' },
  ]
  const out = agentRows(agents, { a: 1000, b: 5000 }, { b: { tool: 'Grep', detail: 'useAuth', at: 6000 } }, 66_000)

  expect(out.rows.map(r => r.label)).toEqual(['tester', 'Explore'])
  expect(out.rows[0]?.doing).toBe('waiting')
  expect(out.rows[0]?.isAsleep).toBe(true)
  expect(out.rows[1]?.isAsleep).toBe(false)
  expect(out.rows[1]?.id).toBe('b')
  expect(out.rows[1]?.doing).toBe('Grep useAuth')
  expect(out.rows[1]?.elapsed).toBe('1m 1s')
  expect(out.finished).toBe(1)
})
