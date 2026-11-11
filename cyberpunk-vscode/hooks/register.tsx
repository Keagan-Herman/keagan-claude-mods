import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { CYAN, DIM, MAGENTA, YELLOW, fmtMs, fmtTokens, isFlavourWord, netWord, stripes, tagOf } from './neon'

const isOn = atom({ plugin: 'cyberpunk-vscode', key: 'isOn' } as const, true)
const hud = atom({ plugin: 'cyberpunk-vscode', key: 'hud' } as const, null)

const git = async ($: EngineInterface, argv: string[]) => {
  try {
    const out = await $.process.run(['git', ...argv], { timeoutMs: 10000 })

    return out.exitCode === 0 ? out.stdout.trim() : undefined
  } catch {
    return undefined
  }
}

// Refreshes the readout; a finished turn also adds to the turn count.
const refresh = async ($: EngineInterface, turn?: { ms: number; out: number }) => {
  const branch = (await git($, ['branch', '--show-current'])) || '(no repo)'
  const dirty = ((await git($, ['status', '--porcelain'])) ?? '').split('\n').filter(Boolean).length

  await update($, hud, h => ({
    branch,
    dirty,
    turns: (h?.turns ?? 0) + (turn ? 1 : 0),
    lastMs: turn?.ms ?? h?.lastMs ?? 0,
    lastOut: turn?.out ?? h?.lastOut ?? 0,
  }))
}

// Only the VS Code extension is restyled here; every other surface passes straight through.
export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const saved = await $.store.get('isOn')
    await update($, isOn, () => saved !== false)
    await $.command.register({
      name: 'netrun',
      description: 'Open the Night City HUD panel (shows whether this surface can dock one)',
    })
    await refresh($)

    return next(e)
  })

  on('command.run', { command: 'netrun' }, async $ => {
    const opened = await $.ui.open({ id: 'night-city', title: 'NIGHT CITY' })

    return {
      text: opened.isPlaced
        ? 'HUD panel opened.'
        : 'This surface cannot dock the panel. The band above the prompt shows the same readout.',
    }
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      await refresh($, { ms: e.durationMs, out: e.usage?.output_tokens ?? 0 })
    }

    return next(e)
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (e.surface !== 'vscode' || !isFlavourWord(e.props.word) || !(await read($, isOn))) {
      return next(e)
    }

    return next({ ...e, props: { ...e.props, word: netWord(e.props.mode, e.props.word), suffix: ' //' } })
  })

  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    if (e.surface !== 'vscode' || e.props.isExpanded || !(await read($, isOn))) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const tag = tagOf(e.props.tool, e.props)

    return (
      <Box>
        <Text color={tag.color} bold>
          {tag.text}
        </Text>
        {await next(e)}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.surface !== 'vscode' || e.props.hasSurvey) {
      return next(e)
    }

    const { Box, Button, Svg, Text } = $.ui.resolve(e)
    const lit = await read($, isOn)
    const now = await read($, hud)
    const flip = () => update($, isOn, () => !lit).then(() => $.store.set('isOn', !lit))

    return (
      <Box>
        <Svg source={stripes(36, 14)} alt="hazard stripes" />
        <Text color={lit ? CYAN : DIM} bold>{lit ? ' NET//ONLINE ' : ' NET//OFFLINE '}</Text>
        {lit && now ? <Text color={DIM}>{`${now.branch} | ${now.dirty} dirty | `}</Text> : <Text> </Text>}
        <Button key="net" label={lit ? 'Disengage' : 'Engage'} onPress={flip} />
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: 'night-city' }, async ($, e, next) => {
    if (e.surface !== 'vscode') {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const now = await read($, hud)
    const row = (label: string, value: string, color = YELLOW) => (
      <Box>
        <Text color={color}>{label.padEnd(8)}</Text>
        <Text>{value}</Text>
      </Box>
    )

    return (
      <Box flexDirection="column" paddingX={1}>
        <Text color={CYAN} bold>NIGHT CITY // HUD</Text>
        <Text color={DIM}>{'-'.repeat(Math.min(e.props.bodyColumns, 28))}</Text>
        {row('BRANCH', now?.branch ?? '-')}
        {row('DIRTY', String(now?.dirty ?? 0), (now?.dirty ?? 0) > 0 ? MAGENTA : YELLOW)}
        {row('TURNS', String(now?.turns ?? 0))}
        {row('LAST', now && now.turns > 0 ? `${fmtMs(now.lastMs)} / ${fmtTokens(now.lastOut)} out` : '-')}
      </Box>
    )
  })
}
