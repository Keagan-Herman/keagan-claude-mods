import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { gitVerb, parseAccounts, parseStatus, statusText, wantsPush } from './git'

const git = atom({ plugin: 'git-guard', key: 'git' } as const, null)
const accounts = atom({ plugin: 'git-guard', key: 'accounts' } as const, [])
const isPushOk = atom({ plugin: 'git-guard', key: 'isPushOk' } as const, false)

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

  await update($, accounts, () => (out ? parseAccounts(out.stdout) : []))
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

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await refreshAll($)

    return next(e)
  })

  // The prompt decides whether a push is allowed this turn.
  on('prompt.submit', async ($, e, next) => {
    if (!e.isMeta && !e.command) {
      await update($, isPushOk, () => wantsPush(e.text))
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

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const g = await read($, git)

    if (e.props.hasSurvey || g === null) {
      return next(e)
    }

    const list = await read($, accounts)
    const ok = await read($, isPushOk)
    const active = list.find(a => a.isActive)?.login
    const { Box, Button, Select } = $.ui.resolve(e)
    const toggle = (
      <Button
        key="push"
        label={ok ? 'Push allowed (this turn)' : 'Allow push'}
        onPress={() => update($, isPushOk, () => !ok).then(() => showStatus($))}
      />
    )

    return list.length === 0 ? (
      <Box>{toggle}</Box>
    ) : (
      <Box>
        <Select
          key="account"
          label="gh"
          options={list.map(a => ({ value: a.login }))}
          value={active}
          onSelect={login => void switchTo($, login)}
        />
        {toggle}
      </Box>
    )
  })
}
