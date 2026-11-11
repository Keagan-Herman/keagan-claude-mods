import { expect, mock, test } from 'claude-code/testing'

const ROW = {
  plugin: 'cosmos-terminal',
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
  plugin: 'cosmos-terminal',
  component: 'AbovePrompt',
  requestId: 'band',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 8,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

test('the terminal gets planets and the sky strip, other surfaces are left alone', async ($, on) => {
  // The strip reads the time, which the test supplies.
  mock.clock(on)

  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine row</Text>
  })

  const row = await $.ui.mount({ ...ROW, surface: 'terminal' })
  expect(await row.find({ type: 'Text', text: /●/ })).toBeDefined()
  expect(await row.find({ type: 'Text', text: /engine row/ })).toBeDefined()
  await row.unmount()

  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await band.find({ type: 'Raster' })).toBeDefined()
  expect(await band.find({ type: 'Text', text: /cosmos/ })).toBeDefined()
  await band.unmount()

  // A short window drops the strip but keeps the toggle.
  const short = await $.ui.mount({ ...BAND, props: { ...BAND.props, maxRows: 2 }, surface: 'terminal' })
  expect(await short.find({ type: 'Raster' })).toBeUndefined()
  expect(await short.find({ type: 'Text', text: /cosmos/ })).toBeDefined()
  await short.unmount()

  const desktop = await $.ui.mount({ ...ROW, surface: 'desktop' })
  expect(await desktop.find({ type: 'Text', text: /●/ })).toBeUndefined()
  await desktop.unmount()
})
