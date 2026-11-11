// The card lines for a commit, by the tool_use_id of the commit's row.
export type DeployDiffCards = Record<string, string[]>

declare module 'claude-code' {
  interface PluginState {
    'deploy-diff': { cards: DeployDiffCards }
  }
}
