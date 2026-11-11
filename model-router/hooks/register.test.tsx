import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'model-router',
  component: 'AbovePrompt',
  requestId: 'band',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 20,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

// The fields every spawn carries that these tests do not care about.
const SPAWN = {
  tool_use_id: 'toolu_1',
  provider: { plugin: 'engine', tier: 'core' },
  parentModel: 'claude-opus-5-5',
  background: false,
  fork: false,
} as const

const PROMPT = { wait: false, origin: { kind: 'composer' } } as const

test('a subagent is given a model by its task, and a model already named is kept', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  on('ui.toast', () => ({ value: undefined }))
  on('agent.spawn', (_$, e) => ({ model: e.model ?? 'inherit', agentId: 'a1' }))

  const light = await $.agent.spawn({ ...SPAWN, subagentType: 'Explore', description: 'find the auth code', prompt: 'find where login lives' })
  expect(light.model).toBe('haiku')

  const heavy = await $.agent.spawn({ ...SPAWN, subagentType: 'general-purpose', description: 'debug', prompt: 'why does the payment webhook fail' })
  expect(heavy.model).toBe('opus')

  const named = await $.agent.spawn({ ...SPAWN, subagentType: 'Explore', description: 'x', prompt: 'find y', model: 'sonnet' })
  expect(named.model).toBe('sonnet')
})

test('the band speaks only when the last prompt does not fit the model, on each surface', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  on('ui.toast', () => ({ value: undefined }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })

  const before = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await before.find({ type: 'Text', text: /Last prompt/ })).toBeUndefined()
  await before.unmount()

  await $.prompt.submit({ ...PROMPT, text: 'find where the login form is defined' })

  for (const surface of ['terminal', 'vscode', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /looked light/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /\/model haiku/ })).toBeDefined()
    await ui.unmount()
  }

  await $.prompt.submit({ ...PROMPT, text: 'why does checkout fail on mobile' })

  const fits = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await fits.find({ type: 'Text', text: /Last prompt/ })).toBeUndefined()
  await fits.unmount()
})

test('an agent on Haiku whose tools failed counts one miss however many turns it runs, and two move the type up', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  on('ui.toast', () => ({ value: undefined }))
  let n = 0
  on('agent.spawn', (_$, e) => ({ model: e.model ?? 'inherit', agentId: `a${++n}` }))
  on('tool.call', () => ({ isError: true, result: 'boom' }))
  on('turn.complete', () => ({ text: '' }))

  const failOnce = async (id: string) => {
    await $.tool.call({ tool: 'Grep', input: { pattern: 'x' }, agentId: id } as never)
    await $.turn.complete({ agentId: id } as never)
    await $.turn.complete({ agentId: id } as never)
  }
  const spawn = () => $.agent.spawn({ ...SPAWN, subagentType: 'Explore', description: 'find x', prompt: 'find x' })

  expect((await spawn()).model).toBe('haiku')
  await failOnce('a1')
  expect((await spawn()).model).toBe('haiku')
  await failOnce('a2')
  expect((await spawn()).model).toBe('sonnet')
})
