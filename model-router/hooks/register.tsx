import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { MISS_LIMIT, fromLabel, judge, tierOf, wordsOf } from './route'
import type { Extra, Tier } from './route'

const advice = atom({ plugin: 'model-router', key: 'advice' } as const, null)
const current = atom({ plugin: 'model-router', key: 'current' } as const, '')

const SURFACES = new Set(['terminal', 'vscode', 'desktop'])
const NAMES: Record<Tier, string> = { haiku: 'Haiku', sonnet: 'Sonnet', opus: 'Opus' }
const KEEP = 40

type Entry = { kind: 'agent' | 'prompt'; tier: Tier; what: string; reason: string }

const getLog = async ($: EngineInterface) => ((await $.store.get('log')) as Entry[] | undefined) ?? []

const getMisses = async ($: EngineInterface) => ((await $.store.get('misses')) as Record<string, number> | undefined) ?? {}

const note = async ($: EngineInterface, entry: Entry) => {
  await $.store.set('log', [...(await getLog($)), entry].slice(-KEEP))
}

// Rules cost nothing. Only a verdict the rules could not give goes to one small Haiku call.
export const register: Register = (on, options) => {
  // Words from settings, added to the built-in English lists (any language).
  const extra: Extra = {
    heavy: wordsOf(options.heavyWords),
    light: wordsOf(options.lightWords),
    medium: wordsOf(options.mediumWords),
    risky: wordsOf(options.riskyWords),
  }

  // agent id -> what it was routed to, and how many of its tool calls failed. Lost on reload, which only forgets one run.
  // ponytail: an agent that never fails stays in `routed` for the session; fine at a few dozen agents, drop on agent end if that grows.
  const routed = new Map<string, { type: string; tier: Tier }>()
  const failures = new Map<string, number>()

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'route', description: 'Show which model the last subagents and prompts were matched to' })

    return next(e)
  })

  on('command.run', { command: 'route' }, async $ => {
    const log = await getLog($)

    if (log.length === 0) {
      return { text: 'Nothing routed yet.' }
    }

    return {
      text: log
        .slice(-15)
        .map(l => `${l.kind === 'agent' ? 'agent ' : 'prompt'}  ${NAMES[l.tier].padEnd(6)} ${l.what.slice(0, 40)}  (${l.reason})`)
        .join('\n'),
    }
  })

  // Subagents: pick the model and say so. A model already named, a fork or a teammate is left alone.
  on('agent.spawn', async ($, e, next) => {
    if (e.model !== undefined || e.fork || e.isTeammate || e.workflow) {
      return next(e)
    }

    const text = `${e.description}\n${e.prompt}`
    const v = judge(text, e.subagentType, extra)
    let tier = v.tier
    let reason = v.reason

    if (!v.sure) {
      try {
        tier = fromLabel(await $.model.classify(text.slice(0, 1500), ['light', 'medium', 'heavy'], { model: 'haiku' }))
        reason = 'asked Haiku'
      } catch {
        // No answer: stay on Sonnet.
      }
    }

    if (tier === 'haiku' && ((await getMisses($))[e.subagentType] ?? 0) >= MISS_LIMIT) {
      tier = 'sonnet'
      reason = `${e.subagentType} failed on Haiku before`
    }

    $.ui.toast(`${e.subagentType}: ${NAMES[tier]} (${reason})`)
    await note($, { kind: 'agent', tier, what: e.description, reason })

    const ran = await next({ ...e, model: tier })

    if (ran.deny === undefined && ran.agentId) {
      routed.set(ran.agentId, { type: e.subagentType, tier })
    }

    return ran
  }).catch(($, e, next) => next(e))

  // A routed agent whose tool calls failed counts as a miss for its type, but only when it was on Haiku.
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)

    if (e.agentId && (ran.deny !== undefined || ran.isError === true)) {
      failures.set(e.agentId, (failures.get(e.agentId) ?? 0) + 1)
    }

    return ran
  }).catch(($, e, next) => next(e))

  // Each agent is counted at most once: its entries are dropped after its first turn ends with failures.
  on('turn.complete', async ($, e, next) => {
    const r = e.agentId ? routed.get(e.agentId) : undefined

    if (e.agentId && r && (failures.get(e.agentId) ?? 0) > 0) {
      routed.delete(e.agentId)
      failures.delete(e.agentId)

      if (r.tier === 'haiku') {
        const misses = await getMisses($)

        await $.store.set('misses', { ...misses, [r.type]: (misses[r.type] ?? 0) + 1 })
      }
    }

    return next(e)
  })

  // Your own prompts: a verdict on the one you just sent, shown above the prompt. It cannot change the model.
  on('prompt.submit', async ($, e, next) => {
    if (!e.command && !e.isMeta && e.text.trim().length > 0) {
      const v = judge(e.text, undefined, extra)

      await update($, advice, () => (v.sure ? { tier: v.tier, reason: v.reason } : null))
      const model = await $.session.model()

      await update($, current, () => model)

      if (v.sure) {
        await note($, { kind: 'prompt', tier: v.tier, what: e.text.replace(/\s+/g, ' '), reason: v.reason })
      }
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (!SURFACES.has(e.surface) || e.props.hasSurvey) {
      return next(e)
    }

    const a = await read($, advice)
    const now = tierOf(await read($, current))

    // Quiet when the model already fits, or when the verdict was unclear.
    if (!a || now === undefined || now === a.tier) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const below = await next(e)
    const heavier = a.tier === 'opus' || (a.tier === 'sonnet' && now === 'haiku')
    const kind = a.tier === 'haiku' ? 'light' : a.tier === 'opus' ? 'heavy' : 'ordinary'

    return (
      <Box flexDirection="column">
        <Box>
          <Text color={heavier ? '#ff9f43' : '#2ecc71'}>{`Last prompt looked ${kind} (${a.reason}): ${heavier ? 'it wants' : 'it is fine on'} ${NAMES[a.tier]}. `}</Text>
          <Text dimColor>{`You are on ${NAMES[now]}. Switch with /model ${a.tier}.`}</Text>
        </Box>
        {below}
      </Box>
    )
  })
}
