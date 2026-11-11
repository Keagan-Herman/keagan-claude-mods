import { expect, test } from 'claude-code/testing'

test('the GitHub panel shows the push lock, and the band has no account picker', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })

  const pane = await $.ui.mount({
    plugin: 'git-guard',
    component: 'Pane',
    requestId: 'github',
    surface: 'vscode',
    props: { title: 'GitHub', isFocused: false, bodyColumns: 40, placement: 'dock', scroll: { offset: 0, bodyRows: 20 }, view: {} },
  })
  expect(await pane.find({ type: 'Text', text: /ACCOUNTS/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /LOCKED/ })).toBeDefined()
  await pane.unmount()

  const band = await $.ui.mount({
    plugin: 'git-guard',
    component: 'AbovePrompt',
    requestId: 'band',
    surface: 'vscode',
    props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 4, bodyColumns: 80, scroll: { offset: 0, bodyRows: 20 }, view: {} },
  })
  expect(await band.find({ type: 'Select' })).toBeUndefined()
  await band.unmount()
})
