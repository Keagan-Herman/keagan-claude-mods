export type GitGuardGit = {
  root: string
  branch: string
  dirty: number
  ahead: number
  behind: number
  hasUpstream: boolean
}

export type GitGuardAccount = { login: string; isActive: boolean }

declare module 'claude-code' {
  interface PluginState {
    'git-guard': {
      git: GitGuardGit | null
      accounts: GitGuardAccount[]
      isPushOk: boolean
    }
  }
}
