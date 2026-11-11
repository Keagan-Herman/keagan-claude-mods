import type { DashActivity, DashAgent } from '../types'

// Pure helpers, kept apart from the engine so dash.test.ts needs nothing else.

export const GREEN = '#6EE7A8'
export const YELLOW = '#FFD166'
export const RED = '#FF6B6B'
export const CYAN = '#7DD3FC'

export const bar = (percent: number, width = 12): string => {
  const p = Math.max(0, Math.min(100, percent))
  const fill = Math.round((p / 100) * width)

  return '█'.repeat(fill) + '░'.repeat(width - fill)
}

export const levelColor = (percent: number): string => (percent < 60 ? GREEN : percent < 85 ? YELLOW : RED)

export const fmtDuration = (ms: number): string =>
  ms < 1000
    ? '0s'
    : ms < 60_000
      ? `${Math.floor(ms / 1000)}s`
      : ms < 3_600_000
        ? `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`
        : `${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m`

export const fmtTokens = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}K` : String(n)

// Share of a turn's input the prompt cache served.
export const hitRate = (u: {
  input_tokens: number
  cache_read_input_tokens: number
  cache_creation_input_tokens: number
}): number => {
  const total = u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens

  return total > 0 ? Math.round((100 * u.cache_read_input_tokens) / total) : 0
}

const clip = (text: string, max: number): string => (text.length > max ? `${text.slice(0, max - 1)}…` : text)
const str = (v: unknown): string => (typeof v === 'string' ? v : '')

// "Bash npm test", "Edit page.tsx", "Grep useState": what a tool call is doing, in a few words.
export const describeCall = (tool: string, input: Record<string, unknown>): { tool: string; detail: string } => {
  const name = tool.startsWith('mcp__') ? (tool.split('__').pop() ?? tool) : tool
  const file = str(input.file_path ?? input.notebook_path).split(/[\\/]/).pop() ?? ''
  const detail =
    tool === 'Bash' || tool === 'PowerShell'
      ? str(input.command).replace(/\s+/g, ' ')
      : file
        ? file
        : tool === 'Grep' || tool === 'Glob'
          ? str(input.pattern)
          : tool === 'WebFetch'
            ? str(input.url)
            : tool === 'WebSearch'
              ? str(input.query)
              : tool === 'Agent'
                ? str(input.description)
                : ''

  return { tool: name, detail: clip(detail.trim(), 38) }
}

const ACTIVE = new Set(['running', 'waiting', 'pending'])

export type AgentRow = { id: string; isAsleep: boolean; label: string; task: string; doing: string; elapsed: string }

// The agents still working, oldest first, with what each last did and for how long.
export const agentRows = (
  agents: DashAgent[],
  starts: Record<string, number>,
  activity: Record<string, DashActivity>,
  now: number,
): { rows: AgentRow[]; more: number; finished: number } => {
  const live = agents
    .filter(a => ACTIVE.has(a.status))
    .sort((a, b) => (starts[a.id] ?? now) - (starts[b.id] ?? now))
  const rows = live.slice(0, 5).map(a => {
    const last = activity[a.id]

    return {
      id: a.id,
      isAsleep: a.status !== 'running',
      label: clip(a.name ?? a.type, 14),
      task: clip(a.description, 30),
      doing: last ? `${last.tool}${last.detail ? ` ${last.detail}` : ''}` : a.status,
      elapsed: fmtDuration(now - (starts[a.id] ?? now)),
    }
  })

  return {
    rows,
    more: Math.max(0, live.length - rows.length),
    finished: agents.filter(a => !ACTIVE.has(a.status) && a.status !== 'idle').length,
  }
}

// "2h 10m" until a window resets, or "" when unknown or already past.
export const resetsIn = (iso: string | undefined, now: number): string => {
  const t = iso ? Date.parse(iso) : NaN

  return Number.isNaN(t) || t <= now ? '' : fmtDuration(t - now)
}

export const topTools = (counts: Record<string, number>, n = 3): string =>
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, count]) => `${name} ${count}`)
    .join(', ')

export const LABELS: Record<string, string> = { five_hour: '5h', seven_day: '7d', spend_limit: 'spend' }

// A rounded meter for surfaces that draw SVG: the track, the fill in its level colour, a soft glow.
export const meter = (percent: number, width = 140): string => {
  const p = Math.max(0, Math.min(100, percent))
  const fill = Math.max(p > 0 ? 6 : 0, Math.round((p / 100) * width))
  const color = levelColor(p)

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="10" viewBox="0 0 ${width} 10">` +
    `<rect y="2" width="${width}" height="6" rx="3" fill="#94A3B8" opacity=".18"/>` +
    `<rect y="1" width="${fill}" height="8" rx="4" fill="${color}" opacity=".25"/>` +
    `<rect y="2" width="${fill}" height="6" rx="3" fill="${color}"/>` +
    `</svg>`
  )
}
