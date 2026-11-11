import { expect, test } from 'claude-code/testing'

const ROW = {
  plugin: 'cyberpunk-vscode',
  component: 'ToolUse',
  requestId: 'toolu_1',
  props: {
    tool_use_id: 'toolu_1',
    tool: 'Bash',
    input: { command: 'ls' },
    isRunning: false,
    isErrored: false,
    isInterrupted: false,
  },
} as const

const BAND = {
  plugin: 'cyberpunk-vscode',
  component: 'AbovePrompt',
  requestId: 'band',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 4,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

test('the extension gets the tag and the band, other surfaces are left alone', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })

  const row = await $.ui.mount({ ...ROW, surface: 'vscode' })
  expect(await row.find({ type: 'Text', text: /BASH/ })).toBeDefined()
  await row.unmount()

  const band = await $.ui.mount({ ...BAND, surface: 'vscode' })
  expect(await band.find({ type: 'Text', text: /NET\/\/ONLINE/ })).toBeDefined()
  await band.unmount()

  const terminal = await $.ui.mount({ ...ROW, surface: 'terminal' })
  expect(await terminal.find({ type: 'Text', text: /BASH/ })).toBeUndefined()
  await terminal.unmount()
})

test('the HUD panel draws on the extension', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })

  const pane = await $.ui.mount({
    plugin: 'cyberpunk-vscode',
    component: 'Pane',
    requestId: 'night-city',
    surface: 'vscode',
    props: {
      title: 'NIGHT CITY',
      isFocused: false,
      bodyColumns: 40,
      placement: 'dock',
      scroll: { offset: 0, bodyRows: 20 },
      view: {},
    },
  })
  expect(await pane.find({ type: 'Text', text: /NIGHT CITY \/\/ HUD/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /BRANCH/ })).toBeDefined()
  await pane.unmount()
})
