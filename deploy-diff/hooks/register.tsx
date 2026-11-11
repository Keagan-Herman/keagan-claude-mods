import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { advise, parseChanges } from './deploy'

const cards = atom({ plugin: 'deploy-diff', key: 'cards' } as const, {})

const isCommit = (command: string): boolean =>
  /(?:^|[;&|\n]\s*)git(?:\s+-\S+(?:\s+\S+)?)*\s+commit\b/.test(command.replace(/"[^"]*"|'[^']*'/g, '""'))

const exists = async ($: EngineInterface, path: string) =>
  $.fs.stat(path).then(
    () => true,
    () => false,
  )

const card = async ($: EngineInterface): Promise<string[]> => {
  try {
    const shown = await $.process.run(['git', 'show', '--name-status', '--pretty=format:', 'HEAD'], {
      timeoutMs: 10000,
    })

    if (shown.exitCode !== 0) {
      return []
    }

    const [firebase, supabase] = await Promise.all([exists($, 'firebase.json'), exists($, 'supabase')])

    return advise(parseChanges(shown.stdout), { firebase, supabase })
  } catch {
    return []
  }
}

export const register: Register = on => {
  on('tool.call', { tool: ['Bash', 'PowerShell'] }, async ($, e, next) => {
    const ran = await next(e)

    if (isCommit(e.command) && ran.deny === undefined && ran.isError !== true) {
      const lines = await card($)

      if (lines.length > 0) {
        // The newest 30 commits keep their card; older rows go back to plain.
        await update($, cards, all => ({
          ...Object.fromEntries(Object.entries(all).slice(-29)),
          [e.tool_use_id]: lines,
        }))
      }
    }

    return ran
  })

  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const lines = (await read($, cards))[e.requestId]

    if (!lines || e.props.isRunning || e.props.isErrored || e.props.isExpanded) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {await next(e)}
        <Box flexDirection="column" borderStyle="round" paddingX={1}>
          <Text bold>Needs deploying after this commit</Text>
          <Text>{lines.join('\n')}</Text>
        </Box>
      </Box>
    )
  })
}
