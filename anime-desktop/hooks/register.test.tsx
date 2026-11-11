import { expect, test } from 'claude-code/testing'

const BASE = { plugin: 'anime-desktop', surface: 'desktop' } as const

// The Backdrop site is not mountable by this CLI's test kit (2.1.314 predates it), so the
// scenes are covered as pure functions in anime.test.ts instead.
test('the desktop draws the band and the dojo; other surfaces are left alone', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })

  const band = await $.ui.mount({
    ...BASE,
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
  })
  expect(await band.find({ type: 'Text', text: /Power level/ })).toBeDefined()
  await band.unmount()

  const dojo = await $.ui.mount({
    ...BASE,
    component: 'Pane',
    requestId: 'dojo',
    props: {
      title: 'DOJO',
      isFocused: false,
      bodyColumns: 40,
      placement: 'dock',
      scroll: { offset: 0, bodyRows: 20 },
      view: {},
    },
  })
  expect(await dojo.find({ type: 'Text', text: /DOJO/ })).toBeDefined()
  await dojo.unmount()

  const row = await $.ui.mount({
    plugin: 'anime-desktop',
    surface: 'terminal',
    component: 'ToolUse',
    requestId: 't1',
    props: {
      tool_use_id: 't1',
      tool: 'Bash',
      input: {},
      isRunning: false,
      isErrored: false,
      isInterrupted: false,
    },
  })
  expect(await row.find({ type: 'Text', text: /◆/ })).toBeUndefined()
  await row.unmount()
})
