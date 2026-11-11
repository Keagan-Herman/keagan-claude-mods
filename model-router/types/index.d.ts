export type RouterAdvice = { tier: 'haiku' | 'sonnet' | 'opus'; reason: string }

declare module 'claude-code' {
  interface PluginState {
    'model-router': {
      // The verdict on the last prompt you sent, or null before the first one.
      advice: RouterAdvice | null
      // The model the main loop was on when that prompt was sent.
      current: string
    }
  }
}
