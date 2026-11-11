import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { GOLD, ORANGE, SKY, fmtPower, powerNote, rankOf, rowMark } from './power'
import { SCENES, sceneSvg, toDataUri } from './scenes'

const isOn = atom({ plugin: 'anime-desktop', key: 'isOn' } as const, true)
const power = atom({ plugin: 'anime-desktop', key: 'power' } as const, 0)
const turns = atom({ plugin: 'anime-desktop', key: 'turns' } as const, 0)
const lastMs = atom({ plugin: 'anime-desktop', key: 'lastMs' } as const, 0)
const image = atom({ plugin: 'anime-desktop', key: 'image' } as const, null)

// Frosted panels over the backdrop; dark so text stays readable. An engine older than the
// theme API has no $.theme, so a failure here must never take the rest of the mod down.
const setBackdrop = async ($: EngineInterface): Promise<boolean> => {
  try {
    const done = await $.theme.set({
      backdrop: { id: 'anime', glass: { blur: 18, tint: '#0B0D1A', opacity: 0.6 }, colorScheme: 'dark' },
    })

    return done.isDrawn
  } catch {
    return false
  }
}

// Only the desktop app is restyled here; every other surface passes straight through.
export const register: Register = (on, options) => {
  const sceneName = SCENES.find(s => s === String(options.scene)) ?? 'burst'

  on('session.start', async ($, e, next) => {
    const saved = await $.store.get('isOn')
    await update($, isOn, () => saved !== false)

    const path = String(options.backdropImage ?? '').trim()

    if (path) {
      try {
        const file = await $.fs.read(path, { as: 'bytes' })
        const made = toDataUri(file.base64, path)

        if ('uri' in made) {
          await update($, image, () => made.uri)
        } else {
          $.ui.toast(`anime-desktop: backdrop image skipped, ${made.error}. Using the ${sceneName} scene.`)
        }
      } catch {
        $.ui.toast('anime-desktop: could not read the backdrop image, using the built-in scene.')
      }
    }

    await $.command.register({ name: 'anime', description: 'Turn the anime backdrop on or off' })
    await $.command.register({ name: 'dojo', description: 'Open the power-level panel' })

    if (saved !== false && !(await setBackdrop($))) {
      $.ui.toast('anime-desktop: the backdrop is not available here (the desktop app draws it, and needs a recent version).')
    }

    return next(e)
  })

  on('command.run', { command: 'anime' }, async $ => {
    const now = !(await read($, isOn))
    await update($, isOn, () => now)
    await $.store.set('isOn', now)

    let isDrawn = true

    if (now) {
      isDrawn = await setBackdrop($)
    } else {
      await $.theme.clear().catch(() => undefined)
    }

    return {
      text: now
        ? isDrawn
          ? 'Anime backdrop on.'
          : 'The backdrop is not available on this surface or version, but the rest of the look is on.'
        : 'Anime backdrop off.',
    }
  })

  on('command.run', { command: 'dojo' }, async $ => {
    const opened = await $.ui.open({ id: 'dojo', title: 'DOJO' })

    return { text: opened.isPlaced ? 'Dojo panel opened.' : 'This surface cannot dock the panel. The band above the prompt shows the same numbers.' }
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      await update($, power, n => n + (e.usage?.output_tokens ?? 0))
      await update($, turns, n => n + 1)
      await update($, lastMs, () => e.durationMs)
    }

    return next(e)
  })

  // The backdrop scene: built in, or the person's own image when one fit.
  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.surface !== 'desktop' || e.props.plugin !== $.plugin.name) {
      return next(e)
    }

    const { Box, Svg } = $.ui.resolve(e)

    return (
      <Box>
        <Svg source={sceneSvg(sceneName, await read($, image))} alt="Anime-style backdrop" />
      </Box>
    )
  })

  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    if (e.surface !== 'desktop' || e.props.isExpanded || !(await read($, isOn))) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const mark = rowMark(e.props)

    return (
      <Box>
        <Text color={mark.color}>{mark.glyph} </Text>
        {await next(e)}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.surface !== 'desktop' || e.props.hasSurvey || !(await read($, isOn))) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const level = await read($, power)
    const count = await read($, turns)

    return (
      <Box>
        <Text color={GOLD} bold>{'★ '}</Text>
        <Text color={ORANGE}>{`Power level ${fmtPower(level)}${powerNote(level)}`}</Text>
        <Text color={SKY}>{`  |  Turn ${count}  |  ${rankOf(count)}`}</Text>
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: 'dojo' }, async ($, e, next) => {
    if (e.surface !== 'desktop') {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const level = await read($, power)
    const count = await read($, turns)
    const ms = await read($, lastMs)

    return (
      <Box flexDirection="column" paddingX={1}>
        <Text color={GOLD} bold>DOJO</Text>
        <Text color={ORANGE}>{`Power level  ${fmtPower(level)}${powerNote(level)}`}</Text>
        <Text color={SKY}>{`Rank         ${rankOf(count)}`}</Text>
        <Text>{`Turns        ${count}`}</Text>
        <Text>{`Last turn    ${count > 0 ? `${Math.round(ms / 1000)}s` : '-'}`}</Text>
        <Text dimColor>{`Scene        ${sceneName}`}</Text>
      </Box>
    )
  })
}
