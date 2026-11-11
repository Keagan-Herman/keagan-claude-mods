export type CyberHud = {
  branch: string
  dirty: number
  turns: number
  lastMs: number
  lastOut: number
}

declare module 'claude-code' {
  interface PluginState {
    'cyberpunk-vscode': { isOn: boolean; hud: CyberHud | null }
  }
}
