import type { GitGuardAccount, GitGuardGit } from '../types'

// Pure helpers, kept apart from the engine so git.test.ts needs nothing else.

const OPTIONS = String.raw`(?:\s+(?:-C|-c|--git-dir|--work-tree|--namespace)\s+\S+|\s+--?\S+)*`

// True when some command in the line is `git [options] <verb>`. Quoted text is
// blanked first, so `git commit -m "push fix"` is not a push.
export const gitVerb = (command: string, verb: string): boolean => {
  const bare = command.replace(/"[^"]*"|'[^']*'/g, '""')
  const re = new RegExp(String.raw`^\s*git${OPTIONS}\s+${verb}\b`)

  return bare.split(/[;&|\n]+/).some(part => re.test(part))
}

const NEGATED = /\b(?:don.?t|do not|never|not|no|without)\s+(?:\w+\s+)?(?:push|sync)\w*/gi

// Did the person ask for a push? Only the head of the prompt counts (a paste
// below it may say anything), and a compaction summary never asks.
export const wantsPush = (text: string): boolean =>
  !text.startsWith('This session is being continued') &&
  /\bpush(?:ed|ing)?\b/i.test(text.slice(0, 400).replace(NEGATED, ''))

export const parseStatus = (
  out: string,
): Omit<GitGuardGit, 'root'> => {
  let branch = '(detached)'
  let ahead = 0
  let behind = 0
  let hasUpstream = false
  let dirty = 0

  for (const line of out.split('\n')) {
    if (line.startsWith('# branch.head ')) {
      branch = line.slice(14).trim()
    } else if (line.startsWith('# branch.ab ')) {
      const m = /\+(\d+) -(\d+)/.exec(line)
      if (m) {
        hasUpstream = true
        ahead = Number(m[1])
        behind = Number(m[2])
      }
    } else if (line.trim() !== '' && !line.startsWith('#')) {
      dirty += 1
    }
  }

  return { branch, ahead, behind, hasUpstream, dirty }
}

// Reads `gh auth status --json hosts`: the logins on github.com, in gh's own order.
export const parseAccounts = (json: string): GitGuardAccount[] => {
  try {
    const hosts = JSON.parse(json).hosts['github.com'] as {
      login: string
      active: boolean
    }[]
    return hosts.map(h => ({ login: h.login, isActive: h.active }))
  } catch {
    return []
  }
}

export const statusText = (
  g: GitGuardGit,
  active: string | undefined,
  isPushOk: boolean,
): string =>
  [
    g.branch,
    `${g.dirty} uncommitted`,
    g.hasUpstream ? `${g.ahead} unpushed` : 'no upstream',
    isPushOk ? 'push ON' : 'push off',
    active ?? 'no gh account',
  ].join(' · ')
