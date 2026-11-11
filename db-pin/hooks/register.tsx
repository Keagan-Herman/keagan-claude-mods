import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { bandText, isDbWrite, isRef, parseApplied, pinKey } from './pin'

const pinAtom = atom({ plugin: 'db-pin', key: 'pin' } as const, null)
const lastAtom = atom({ plugin: 'db-pin', key: 'last' } as const, null)
const touchedAtom = atom({ plugin: 'db-pin', key: 'touched' } as const, null)

type Pins = Record<string, { ref: string; label: string }>

const git = async ($: EngineInterface, argv: string[]) => {
  try {
    const out = await $.process.run(['git', ...argv], { timeoutMs: 10000 })

    return out.exitCode === 0 ? out.stdout.trim() : undefined
  } catch {
    return undefined
  }
}

const where = async ($: EngineInterface) => {
  const root = await git($, ['rev-parse', '--show-toplevel'])
  const branch = await git($, ['branch', '--show-current'])

  return root && branch ? { root, branch } : undefined
}

const pins = async ($: EngineInterface) => ((await $.store.get('pins')) ?? {}) as Pins
const applied = async ($: EngineInterface) =>
  ((await $.store.get('lastApplied')) ?? {}) as Record<string, string>

// Re-reads the pin for the repo and branch the session is in now.
const load = async ($: EngineInterface) => {
  const at = await where($)
  const pin = at ? (await pins($))[pinKey(at.root, at.branch)] : undefined

  const last = pin ? ((await applied($))[pin.ref] ?? null) : null

  await update($, pinAtom, () => (at && pin ? { ...pin, branch: at.branch } : null))
  await update($, lastAtom, () => last)
}

const noteApplied = async ($: EngineInterface, ref: string, what: string) => {
  await $.store.set('lastApplied', { ...(await applied($)), [ref]: what })
  await update($, lastAtom, () => what)
}

const toldAbout = new Set<string>()

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'dbpin',
      description: 'Pin this repo and branch to one Supabase project',
      argumentHint: '[project-ref] [label] | off',
    })
    await load($)

    return next(e)
  })

  on('command.run', { command: 'dbpin' }, async ($, e) => {
    const at = await where($)

    if (!at) {
      return { text: 'db-pin: not inside a git repository.' }
    }

    const key = pinKey(at.root, at.branch)
    const [ref, ...label] = e.args.trim().split(/\s+/)
    const all = await pins($)

    if (ref === 'off') {
      delete all[key]
      await $.store.set('pins', all)
      await load($)

      return { text: `db-pin: ${at.branch} is no longer pinned.` }
    }

    if (!ref) {
      const pin = all[key]

      return {
        text: pin
          ? `db-pin: ${at.branch} is pinned to ${pin.ref} ${pin.label}`.trim()
          : `db-pin: ${at.branch} has no pin. Use /dbpin <project-ref> [label].`,
      }
    }

    if (!isRef(ref)) {
      return { text: 'db-pin: a project ref is 20 lowercase letters.' }
    }

    await $.store.set('pins', { ...all, [key]: { ref, label: label.join(' ') } })
    await load($)

    return { text: `db-pin: ${at.branch} is pinned to ${ref}. Writes to any other project are blocked.` }
  })

  // Supabase MCP writes: the project they name must be the pinned one.
  on(
    'tool.call',
    { tool: /^mcp__.*upabase.*__(?:apply_migration|execute_sql|deploy_edge_function|create_edge_function_secret|create_branch|delete_branch|merge_branch|rebase_branch|reset_branch|pause_project|restore_project)$/ },
    async ($, e, next) => {
      const target = String((e as Record<string, unknown>).project_id ?? '')

      if (!target || !isDbWrite(e.tool, (e as Record<string, unknown>).query)) {
        return next(e)
      }

      const pin = await read($, pinAtom)

      if (pin && pin.ref !== target) {
        return {
          deny: `db-pin: ${e.tool} targets ${target}, but ${pin.branch} is pinned to ${pin.ref}${pin.label ? ` (${pin.label})` : ''}. Stop and ask the user. They can re-pin with /dbpin.`,
        }
      }

      if (!pin && !toldAbout.has(target)) {
        toldAbout.add(target)
        $.ui.toast(`db-pin: no pin on this branch, writing to ${target}. /dbpin ${target} to lock it.`)
      }

      const ran = await next(e)

      if (ran.deny === undefined && ran.isError !== true) {
        await update($, touchedAtom, () => target)
        const name = String((e as Record<string, unknown>).name ?? '')

        if (name && e.tool.endsWith('apply_migration')) {
          await noteApplied($, target, name)
        }
      }

      return ran
    },
  ).catch(($, e, next) =>
    next.called
      ? next(e)
      : { deny: 'db-pin: its check failed, so the database call was blocked.' },
  )

  // Migrations run by script: the script guards its own target, this records the result.
  on('tool.call', { tool: ['Bash', 'PowerShell'] }, async ($, e, next) => {
    const ran = await next(e)

    if (/apply-migration/.test(e.command) && ran.deny === undefined) {
      const version = parseApplied(ran.text ?? '')
      const pin = await read($, pinAtom)

      if (version) {
        await noteApplied($, pin?.ref ?? 'unknown', version)
      }
    }

    if (/\bgit\s+(?:checkout|switch)\b/.test(e.command)) {
      await load($)
    }

    return ran
  })

  on('turn.complete', async ($, e, next) => {
    await load($)

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const pin = await read($, pinAtom)
    const touched = await read($, touchedAtom)

    if (e.props.hasSurvey || (pin === null && touched === null)) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box>
        <Text dimColor>{bandText(pin, await read($, lastAtom), touched)}</Text>
      </Box>
    )
  })
}
