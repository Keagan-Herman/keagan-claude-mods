export type DbPinPin = { ref: string; label: string; branch: string }

declare module 'claude-code' {
  interface PluginState {
    'db-pin': {
      pin: DbPinPin | null
      // The last migration applied to the pinned project (or the last project written to).
      last: string | null
      touched: string | null
    }
  }
}
