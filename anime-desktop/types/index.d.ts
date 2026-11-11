declare module 'claude-code' {
  interface PluginState {
    'anime-desktop': {
      isOn: boolean
      // Output tokens this session, shown as the power level.
      power: number
      turns: number
      lastMs: number
      // The data URI of the person's own backdrop image, when one was set and small enough.
      image: string | null
    }
  }
}

export type AnimeScene = 'burst' | 'aura' | 'stadium'
