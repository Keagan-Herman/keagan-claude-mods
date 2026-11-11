export type DashAgent = {
  id: string
  type: string
  description: string
  status: string
  name?: string
}

export type DashActivity = { tool: string; detail: string; at: number }

export type DashContext = { tokens: number; window: number; percent: number }

export type DashLimit = { kind: string; percentUsed: number; resetsAt?: string }

export type DashTurn = { ms: number; out: number; hit: number }

export type DashStats = {
  startedAt: number
  turns: number
  tools: number
  errors: number
  top: Record<string, number>
}

declare module 'claude-code' {
  interface PluginState {
    dashboard: {
      isOpen: boolean
      agents: DashAgent[]
      // When each agent's first turn started, by agent id.
      starts: Record<string, number>
      // The latest tool each loop ran, by agent id; the main loop is "main".
      activity: Record<string, DashActivity>
      context: DashContext | null
      limits: DashLimit[]
      cost: number | null
      turn: DashTurn | null
      stats: DashStats
      git: { branch: string; dirty: number } | null
    }
  }
}
