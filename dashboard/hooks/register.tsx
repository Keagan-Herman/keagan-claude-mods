import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { CYAN, LABELS, RED, YELLOW, agentRows, bar, meter, describeCall, fmtDuration, fmtTokens, hitRate, levelColor, resetsIn, topTools } from './dash'
import { PETS, assignPets, petFrame } from './pets'

const isOpen = atom({ plugin: 'dashboard', key: 'isOpen' } as const, false)
const agents = atom({ plugin: 'dashboard', key: 'agents' } as const, [])
const starts = atom({ plugin: 'dashboard', key: 'starts' } as const, {})
const activity = atom({ plugin: 'dashboard', key: 'activity' } as const, {})
const context = atom({ plugin: 'dashboard', key: 'context' } as const, null)
const limits = atom({ plugin: 'dashboard', key: 'limits' } as const, [])
const cost = atom({ plugin: 'dashboard', key: 'cost' } as const, null)
const turn = atom({ plugin: 'dashboard', key: 'turn' } as const, null)
const stats = atom({ plugin: 'dashboard', key: 'stats' } as const, { startedAt: 0, turns: 0, tools: 0, errors: 0, top: {} })
const git = atom({ plugin: 'dashboard', key: 'git' } as const, null)
const pets = atom({ plugin: 'dashboard', key: 'pets' } as const, {})
const tick = atom({ plugin: 'dashboard', key: 'tick' } as const, 0)

const SURFACES = new Set(['terminal', 'vscode'])
const TICK_MS = 500
const REFRESH_EVERY = 4 // ticks between agent list refreshes: about 2 seconds
const WORKING = new Set(['running', 'waiting', 'pending'])

const refreshAgents = async ($: EngineInterface) => {
  try {
    const list = await $.agent.list()

    await update($, agents, () =>
      list.map(a => ({ id: a.id, type: a.type, description: a.description, status: a.status, ...(a.name ? { name: a.name } : {}) })),
    )
    // A new agent takes a pet no working agent has; it keeps it until the agent is gone.
    await update($, pets, known =>
      assignPets(
        list.filter(a => WORKING.has(a.status)).map(a => a.id),
        known,
        list.map(a => a.id),
      ),
    )
  } catch {
    // No agent list on this build: the section just stays empty.
  }
}

const refreshGit = async ($: EngineInterface) => {
  try {
    const branch = await $.process.run(['git', 'branch', '--show-current'], { timeoutMs: 10000 })
    const dirty = await $.process.run(['git', 'status', '--porcelain'], { timeoutMs: 10000 })

    await update($, git, () =>
      branch.exitCode === 0
        ? { branch: branch.stdout.trim() || '(detached)', dirty: dirty.stdout.split('\n').filter(Boolean).length }
        : null,
    )
  } catch {
    await update($, git, () => null)
  }
}

// Everything here is read from events and local calls the engine already makes: no model call, no tokens.
export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const saved = await $.store.get('isOpen')
    await update($, isOpen, () => saved === true)
    const now = await $.clock.now()
    await update($, stats, s => ({ ...s, startedAt: now }))
    await $.command.register({ name: 'dash', description: 'Show or hide the dashboard above the prompt' })
    await refreshGit($)

    // While the dashboard is open: a tick every half second animates the pets, and every
    // fourth one refreshes the agent list. The tick is state only the dashboard reads, so
    // each one redraws the dashboard and nothing else. Closed, or with nobody working, it idles.
    let beats = 0

    $.clock.every(TICK_MS, async () => {
      if (!(await read($, isOpen))) {
        return
      }

      beats += 1

      if (beats % REFRESH_EVERY === 0) {
        await refreshAgents($)
      }

      if ((await read($, agents)).some(a => WORKING.has(a.status))) {
        await update($, tick, t => t + 1)
      }
    })

    return next(e)
  })

  on('command.run', { command: 'dash' }, async $ => {
    const open = !(await read($, isOpen))
    await update($, isOpen, () => open)
    await $.store.set('isOpen', open)

    if (open) {
      await refreshAgents($)
    }

    return { text: open ? 'Dashboard open.' : 'Dashboard closed.' }
  })

  // The context window, the rate-limit windows and the session cost, as the engine measures them.
  on('session.measure', async ($, e, next) => {
    const result = await next(e)

    await update($, context, () =>
      e.context.tokens === undefined
        ? null
        : { tokens: e.context.tokens, window: e.context.window, percent: e.context.percent ?? 0 },
    )
    await update($, limits, () =>
      e.rateLimits.map(l => ({ kind: l.kind, percentUsed: l.percentUsed, ...(l.resetsAt ? { resetsAt: l.resetsAt } : {}) })),
    )
    await update($, cost, () => e.cost?.usd ?? null)

    return result
  })

  // When an agent's first turn starts, so its elapsed time has a beginning.
  on('turn.start', async ($, e, next) => {
    if (e.agentId) {
      const id = e.agentId
      const now = await $.clock.now()

      await update($, starts, s => (s[id] ? s : { ...s, [id]: now }))
      await refreshAgents($)
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      await update($, turn, () => ({
        ms: e.durationMs,
        out: e.usage?.output_tokens ?? 0,
        hit: e.usage ? hitRate(e.usage) : 0,
      }))
      await update($, stats, s => ({ ...s, turns: s.turns + 1 }))
      await refreshGit($)
    }

    await refreshAgents($)

    return next(e)
  })

  // Which loop ran which tool, and how it went. Every tool call passes through here, so it stays small.
  on('tool.call', async ($, e, next) => {
    const now = await $.clock.now()
    const id = e.agentId ?? 'main'
    const what = describeCall(e.tool, e as unknown as Record<string, unknown>)

    await update($, activity, a => ({ ...a, [id]: { ...what, at: now } }))

    const ran = await next(e)

    await update($, stats, s => ({
      ...s,
      tools: s.tools + 1,
      errors: s.errors + (ran.deny !== undefined || ran.isError === true ? 1 : 0),
      top: { ...s.top, [what.tool]: (s.top[what.tool] ?? 0) + 1 },
    }))

    return ran
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (!SURFACES.has(e.surface) || e.props.hasSurvey) {
      return next(e)
    }

    const els = $.ui.resolve(e)
    const { Box, Button, Text } = els
    const Svg = 'Svg' in els ? els.Svg : undefined
    const chip = (text: string, color = '#E2E8F0', bg = '#1E293B') => (
      <Text color={color} backgroundColor={bg}>{` ${text} `}</Text>
    )
    const gauge = (percent: number) =>
      Svg ? <Svg source={meter(percent)} alt={`${Math.round(percent)}%`} /> : <Text color={levelColor(percent)}>{bar(percent)}</Text>
    // Keep whatever other mods draw here (git-guard's band, say) and add the dashboard above it.
    const below = await next(e)
    const open = await read($, isOpen)
    const flip = async () => {
      await update($, isOpen, () => !open)
      await $.store.set('isOpen', !open)

      if (!open) {
        await refreshAgents($)
      }
    }
    const toggle = <Button key="dash" label={open ? 'Hide dashboard' : 'Dashboard'} onPress={flip} />

    const now = await $.clock.now()
    const ctx = await read($, context)
    const lims = await read($, limits)
    const list = await read($, agents)
    const working = agentRows(list, await read($, starts), await read($, activity), now)

    // Closed, or too short a window: one line of the numbers that matter.
    const needed = 9 + Math.max(1, working.rows.length)

    if (!open || e.props.maxRows < needed) {
      const bits = [
        ctx ? `ctx ${Math.round(ctx.percent)}%` : '',
        ...lims.map(l => `${LABELS[l.kind] ?? l.kind} ${Math.round(l.percentUsed)}%`),
        working.rows.length > 0 ? `${working.rows.length} agent${working.rows.length === 1 ? '' : 's'}` : '',
      ].filter(Boolean)

      return (
        <Box flexDirection="column">
          <Box>
            {bits.map(b => [chip(b), <Text> </Text>])}
            {toggle}
          </Box>
          {below}
        </Box>
      )
    }

    const s = await read($, stats)
    const beat = await read($, tick)
    const petOf = await read($, pets)
    const last = await read($, turn)
    const where = await read($, git)
    const total = await read($, cost)
    const main = (await read($, activity)).main
    // The frame takes the colour of whichever gauge is fullest.
    const worst = Math.max(ctx?.percent ?? 0, ...lims.map(l => l.percentUsed))
    const row = (label: string, ...parts: JSX.Element[]) => (
      <Box>
        <Text color="#64748B" bold>{label.padEnd(9)}</Text>
        {parts}
      </Box>
    )

    return (
      <Box flexDirection="column">
      <Box flexDirection="column" borderStyle="round" borderColor={levelColor(worst)} paddingX={1}>
        <Box>
          <Text bold color={CYAN}>{'◆ DASHBOARD  '}</Text>
          {chip(`up ${fmtDuration(now - s.startedAt)}`)}
          <Text> </Text>
          {chip(`${s.turns} turns`)}
          <Text> </Text>
          {chip(`${s.tools} tools`)}
          <Text> </Text>
          {s.errors > 0 ? chip(`${s.errors} errors`, '#111', RED) : chip('0 errors')}
          <Text>{'  '}</Text>
          {toggle}
        </Box>
        <Text> </Text>

        {row(
          'AGENTS',
          <Text>{working.rows.length === 0 ? 'none running' : `${working.rows.length} working`}</Text>,
          <Text dimColor>{working.more > 0 ? `  +${working.more} more` : ''}</Text>,
          <Text dimColor>{working.finished > 0 ? `  ${working.finished} finished` : ''}</Text>,
        )}
        {working.rows.map(r => {
          const pet = PETS[petOf[r.id] ?? 0] ?? PETS[0]!

          return (
            <Box>
              <Text color={pet.color}>{petFrame(pet, r.isAsleep, beat)}</Text>
              <Text color={pet.color} bold>{r.label.padEnd(15)}</Text>
              <Text>{`${r.task} `}</Text>
              <Text dimColor>{`> ${r.doing} (${r.elapsed})`}</Text>
            </Box>
          )
        })}
        {main && now - main.at < 120_000
          ? row('MAIN', <Text>{`${main.tool}${main.detail ? ` ${main.detail}` : ''}`}</Text>, <Text dimColor>{`  ${fmtDuration(now - main.at)} ago`}</Text>)
          : null}

        {ctx
          ? row(
              'CONTEXT',
              gauge(ctx.percent),
              <Text>{` ${Math.round(ctx.percent)}%  ${fmtTokens(ctx.tokens)} of ${fmtTokens(ctx.window)}`}</Text>,
            )
          : row('CONTEXT', <Text dimColor>not measured yet</Text>)}
        {lims.length > 0
          ? lims.map(l =>
              row(
                (LABELS[l.kind] ?? l.kind).toUpperCase(),
                gauge(l.percentUsed),
                <Text>{` ${Math.round(l.percentUsed)}%`}</Text>,
                <Text dimColor>{resetsIn(l.resetsAt, now) ? `  resets in ${resetsIn(l.resetsAt, now)}` : ''}</Text>,
              ),
            )
          : null}
        {row(
          'TURN',
          <Text>{last ? `${fmtDuration(last.ms)} | ${fmtTokens(last.out)} out | cache ${last.hit}%` : 'none yet'}</Text>,
          <Text dimColor>{total === null ? '' : `  session $${total.toFixed(2)}`}</Text>,
        )}
        {row(
          'WORK',
          <Text>{where ? `${where.branch} | ${where.dirty} uncommitted` : 'no repository'}</Text>,
          <Text dimColor>{topTools(s.top) ? `  top tools: ${topTools(s.top)}` : ''}</Text>,
        )}
      </Box>
      {below}
      </Box>
    )
  })
}
