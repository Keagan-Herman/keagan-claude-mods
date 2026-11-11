// Whether the space look is on; kept across sessions in $.store too.
export type CosmosLook = boolean

declare module 'claude-code' {
  interface PluginState {
    'cosmos-terminal': { isOn: CosmosLook }
  }
}
