import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { badge, gitVerb, hueOf, parseAccounts, parseStatus, statusText, wantsPush, wordsOf } from './git'
import type { PushWords } from './git'

// Set from the mod's settings when it loads.
let accountOrder: string[] = []
let pushWords: PushWords = {}

const git = atom({ plugin: 'git-guard', key: 'git' } as const, null)
const accounts = atom({ plugin: 'git-guard', key: 'accounts' } as const, [])
const isPushOk = atom({ plugin: 'git-guard', key: 'isPushOk' } as const, false)
// Whether the side panel is drawn; when it is not, the band keeps one button to open it.
const isDocked = atom({ plugin: 'git-guard', key: 'isDocked' } as const, false)

const GREEN = '#6EE7A8'
const RED = '#FF6B6B'
const PANE = 'github'

const openPane = async ($: EngineInterface) => {
  const opened = await $.ui.open({ id: PANE, title: 'GitHub' })

  await update($, isDocked, () => opened.isPlaced)

  return opened
}


const run = async ($: EngineInterface, argv: string[]) => {
  try {
    return await $.process.run(argv, { timeoutMs: 15000 })
  } catch {
    return undefined
  }
}

const refreshGit = async ($: EngineInterface) => {
  const status = await run($, ['git', 'status', '--porcelain=v2', '--branch'])
  const top = await run($, ['git', 'rev-parse', '--show-toplevel'])

  await update($, git, () =>
    status?.exitCode === 0 && top?.exitCode === 0
      ? { root: top.stdout.trim(), ...parseStatus(status.stdout) }
      : null,
  )
}

const refreshAccounts = async ($: EngineInterface) => {
  const out = await run($, ['gh', 'auth', 'status', '--json', 'hosts'])

  await update($, accounts, () => (out ? parseAccounts(out.stdout, accountOrder) : []))
}

const showStatus = async ($: EngineInterface) => {
  const g = await read($, git)
  const active = (await read($, accounts)).find(a => a.isActive)?.login

  $.ui.status(g ? statusText(g, active, await read($, isPushOk)) : undefined)
}

const refreshAll = async ($: EngineInterface) => {
  await Promise.all([refreshGit($), refreshAccounts($)])
  await showStatus($)
}

// Which account each repo pushes as: the last one picked in the dropdown there.
const repoAccounts = async ($: EngineInterface) =>
  ((await $.store.get('repoAccount')) ?? {}) as Record<string, string>

const switchTo = async ($: EngineInterface, login: string) => {
  const swapped = await run($, ['gh', 'auth', 'switch', '--hostname', 'github.com', '--user', login])

  if (swapped?.exitCode !== 0) {
    $.ui.toast(`git-guard: could not switch to ${login}`)

    return
  }

  await refreshGit($)
  const g = await read($, git)

  if (g) {
    await $.store.set('repoAccount', { ...(await repoAccounts($)), [g.root]: login })
  }

  await refreshAll($)
  $.ui.toast(`git-guard: now ${login}`)
}

export const register: Register = (on, options) => {
  accountOrder = String(options.accountOrder ?? '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
  pushWords = { push: wordsOf(options.pushWords), no: wordsOf(options.noPushWords, 'giu') }

  on('session.start', async ($, e, next) => {
    await refreshAll($)
    await $.command.register({ name: 'gh', description: 'Open the GitHub panel: switch account, allow a push' })
    await openPane($)

    return next(e)
  })

  on('command.run', { command: 'gh' }, async $ => {
    const opened = await openPane($)

    return { text: opened.isPlaced ? 'GitHub panel open.' : `The GitHub panel could not be placed: ${opened.reason}` }
  })

  on('ui.close', { id: PANE }, async ($, e, next) => {
    await update($, isDocked, () => false)

    return next(e)
  })

  // The prompt decides whether a push is allowed this turn.
  on('prompt.submit', async ($, e, next) => {
    if (!e.isMeta && !e.command) {
      await update($, isPushOk, () => wantsPush(e.text, pushWords))
      await showStatus($)
    }

    return next(e)
  }).catch(async ($, e, next) => {
    // Fail closed: a broken check must not leave an old "allow push" standing.
    await update($, isPushOk, () => false).catch(() => undefined)

    return next(e)
  })

  on('tool.call', { tool: ['Bash', 'PowerShell'] }, async ($, e, next) => {
    if (gitVerb(e.command, 'push')) {
      if (!(await read($, isPushOk))) {
        return {
          deny: 'git-guard: push blocked, this turn\'s prompt did not ask for one. Commit locally and tell the user; they can say "push" or press Allow push.',
        }
      }

      await refreshAccounts($)
      const g = await read($, git)
      const active = (await read($, accounts)).find(a => a.isActive)?.login
      const wanted = g ? (await repoAccounts($))[g.root] : undefined

      if (wanted && active && wanted.toLowerCase() !== active.toLowerCase()) {
        return {
          deny: `git-guard: active GitHub account is ${active} but this repo pushes as ${wanted}. Ask the user to pick ${wanted} in the git-guard dropdown.`,
        }
      }
    }

    const ran = await next(e)

    if (/\b(git|gh)\b/.test(e.command)) {
      await refreshAll($)
    }

    return ran
  }).catch(($, e, next) =>
    next.called || !gitVerb(e.command, 'push')
      ? next(e)
      : { deny: 'git-guard: its push check failed, so the push was blocked.' },
  )

  on('turn.complete', async ($, e, next) => {
    await refreshGit($)
    await showStatus($)

    return next(e)
  })

  // The model is never asked to add its own author line to commits or PRs.
  on('attribution.text', { kind: ['commit', 'pr'] }, () => ({ text: '' }))

  // The band keeps only a way back to the panel, and only while the panel is not drawn.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, git)) === null || (await read($, isDocked))) {
      return next(e)
    }

    const { Box, Button } = $.ui.resolve(e)
    const active = (await read($, accounts)).find(a => a.isActive)?.login

    return (
      <Box flexDirection="column">
        {await next(e)}
        <Box>
          <Button key="gh-open" label={`GitHub: ${active ?? 'no account'}`} onPress={() => openPane($).then(() => undefined)} />
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const els = $.ui.resolve(e)
    const { Box, Button, Text } = els
    const Svg = 'Svg' in els ? els.Svg : undefined
    const g = await read($, git)
    const list = await read($, accounts)
    const ok = await read($, isPushOk)

    return (
      <Box flexDirection="column" paddingX={1}>
        <Text bold>ACCOUNTS</Text>
        {list.length === 0 ? <Text dimColor>gh is not signed in</Text> : null}
        {list.map(a => (
          <Box borderStyle="round" borderColor={a.isActive ? hueOf(a.login) : 'gray'} paddingX={1}>
            {Svg ? <Svg source={badge(a.login, a.isActive)} alt={a.login} /> : <Text color={hueOf(a.login)}>{a.isActive ? '●' : '○'}</Text>}
            <Text bold={a.isActive} color={a.isActive ? hueOf(a.login) : undefined}>{` ${a.login}  `}</Text>
            {a.isActive ? (
              <Text color="#111" backgroundColor={hueOf(a.login)} bold>{' ACTIVE '}</Text>
            ) : (
              <Button key={`use-${a.login}`} label="Switch" onPress={() => switchTo($, a.login)} />
            )}
          </Box>
        ))}

        <Text> </Text>
        <Text bold>PUSH</Text>
        <Box borderStyle="round" borderColor={ok ? GREEN : RED} paddingX={1}>
          <Text color="#111" backgroundColor={ok ? GREEN : RED} bold>{ok ? ' ARMED ' : ' LOCKED '}</Text>
          <Text dimColor>{ok ? '  this turn may push  ' : '  pushes are blocked  '}</Text>
          <Button key="push" label={ok ? 'Lock' : 'Allow push'} onPress={() => update($, isPushOk, () => !ok).then(() => showStatus($))} />
        </Box>

        {g ? (
          <Box flexDirection="column">
            <Text> </Text>
            <Text bold>REPO</Text>
            <Text>{`⎇ ${g.branch}`}</Text>
            <Text color={g.dirty > 0 ? '#FFD166' : undefined} dimColor={g.dirty === 0}>{`${g.dirty} uncommitted`}</Text>
            <Text dimColor>{g.hasUpstream ? `${g.ahead} ahead, ${g.behind} behind` : 'no upstream'}</Text>
          </Box>
        ) : null}
      </Box>
    )
  })
}
