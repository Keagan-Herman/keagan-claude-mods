import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { COLS, ROWS, frame, pastWord, rowMark, spaceWord } from './cosmos'

const isOn = atom({ plugin: 'cosmos-terminal', key: 'isOn' } as const, true)

const FRAME_MS = 100

// Only the terminal is restyled here; every other surface passes straight through.
export const register: Register = on => {
  // Where the strip was last drawn; the timer repaints exactly that Raster.
  // Lost on a reload, and set again by the next draw.
  let band: { requestId: string; columns: number } | undefined

  on('session.start', async ($, e, next) => {
    const saved = await $.store.get('isOn')
    await update($, isOn, () => saved !== false)

    // ~10 frames a second, repainted in place: no redraw of the screen, just the cells.
    $.clock.every(FRAME_MS, async () => {
      if (band && (await read($, isOn))) {
        await $.ui
          .blit({ requestId: band.requestId, key: 'sky', cells: frame((await $.clock.now()) / 1000, band.columns) })
          .catch(() => undefined)
      }
    })

    return next(e)
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (e.surface !== 'terminal' || !(await read($, isOn))) {
      return next(e)
    }

    return next({
      ...e,
      props: { ...e.props, word: spaceWord(e.props.mode, e.props.word), suffix: ' …' },
    })
  })

  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => {
    if (e.surface !== 'terminal' || !(await read($, isOn))) {
      return next(e)
    }

    return next({ ...e, props: { ...e.props, word: pastWord(e.props.word) } })
  })

  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    if (e.surface !== 'terminal' || e.props.isExpanded || !(await read($, isOn))) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const mark = rowMark(e.props.tool, e.props)

    return (
      <Box>
        <Text color={mark.color}>{mark.glyph} </Text>
        {await next(e)}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.surface !== 'terminal' || e.props.hasSurvey) {
      return next(e)
    }

    const { Box, Button, Raster, Text } = $.ui.resolve(e)
    const lit = await read($, isOn)
    const flip = () => update($, isOn, () => !lit).then(() => $.store.set('isOn', !lit))
    const toggle = <Button key="cosmos" label={lit ? 'Lights off' : 'Lights on'} onPress={flip} />

    // The strip needs ROWS rows plus the label row; on a short or narrow window it gives way.
    if (!lit || e.props.maxRows < ROWS + 2) {
      band = undefined

      return (
        <Box>
          <Text dimColor>{lit ? '✶ cosmos ' : '◌ cosmos asleep '}</Text>
          {toggle}
        </Box>
      )
    }

    const columns = Math.max(8, Math.min(COLS, e.props.bodyColumns))
    band = { requestId: e.requestId, columns }

    return (
      <Box flexDirection="column">
        <Raster key="sky" columns={columns} rows={ROWS} cells={frame((await $.clock.now()) / 1000, columns)} />
        <Box>
          <Text dimColor>{'✶ cosmos '}</Text>
          {toggle}
        </Box>
      </Box>
    )
  })
}
