import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'dashboard',
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

test('closed it is one line and a button; pressing it opens the dashboard, on the terminal and the extension', async ($, on) => {
  mock.clock(on)
  mock.store(on)

  for (const surface of ['terminal', 'vscode'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /DASHBOARD/ })).toBeUndefined()

    await ui.press({ key: 'dash' })
    expect(await ui.find({ type: 'Text', text: /DASHBOARD/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /AGENTS/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /CONTEXT/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /WORK/ })).toBeDefined()

    await ui.press({ key: 'dash' })
    expect(await ui.find({ type: 'Text', text: /DASHBOARD/ })).toBeUndefined()
    await ui.unmount()
  }
})

test('a short window falls back to the one-line summary, and other surfaces are left alone', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })

  const short = await $.ui.mount({ ...BAND, props: { ...BAND.props, maxRows: 2 }, surface: 'terminal' })
  await short.press({ key: 'dash' })
  expect(await short.find({ type: 'Text', text: /DASHBOARD/ })).toBeUndefined()
  await short.unmount()

  const desktop = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await desktop.find({ key: 'dash' })).toBeUndefined()
  await desktop.unmount()
})
