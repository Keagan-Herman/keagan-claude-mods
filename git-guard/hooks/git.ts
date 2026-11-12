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

// A comma-separated setting as one pattern, in any language. Matched anywhere in the text, so
// languages written without spaces work too. Null when the setting is empty.
export const wordsOf = (list: unknown, flags = 'iu'): RegExp | null => {
  const words = String(list ?? '')
    .split(',')
    .map(w => w.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .filter(Boolean)

  return words.length > 0 ? new RegExp(words.join('|'), flags) : null
}

const NEGATED = /\b(?:don.?t|do not|never|not|no|without)\s+(?:\w+\s+)?(?:push|sync)\w*/gi

// Did the person ask for a push? Only the head of the prompt counts (a paste
// below it may say anything), and a compaction summary never asks.
// Words from settings, added to the English ones: `push` counts as a request, `no` cancels one.
export type PushWords = { push?: RegExp | null; no?: RegExp | null }

export const wantsPush = (text: string, x: PushWords = {}): boolean => {
  if (text.startsWith('This session is being continued')) {
    return false
  }

  const head = text.slice(0, 400).replace(NEGATED, '').replace(x.no ?? /(?!)/g, '')

  return /\bpush(?:ed|ing)?\b/i.test(head) || (x.push?.test(head) ?? false)
}

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

// Reads `gh auth status --json hosts`: the logins on github.com, in gh's own order
// unless the accountOrder setting names some first (lower case, in that order).
export const parseAccounts = (json: string, order: string[] = []): GitGuardAccount[] => {
  try {
    const hosts = JSON.parse(json).hosts['github.com'] as {
      login: string
      active: boolean
    }[]
    const rank = (login: string) => {
      const i = order.indexOf(login.toLowerCase())

      return i < 0 ? order.length : i
    }

    return hosts.map(h => ({ login: h.login, isActive: h.active })).sort((a, b) => rank(a.login) - rank(b.login))
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

// A round badge with the account's initial, its colour fixed by the login so each account looks the same every time.
const HUES = ['#7DD3FC', '#C4B5FD', '#6EE7A8', '#FDBA74', '#F9A8D4', '#FDE047']

export const hueOf = (login: string): string =>
  HUES[[...login].reduce((n, c) => n + c.charCodeAt(0), 0) % HUES.length] ?? HUES[0]!

export const badge = (login: string, isActive: boolean): string => {
  const hue = hueOf(login)
  const letter = (login.match(/[a-z0-9]/i)?.[0] ?? '?').toUpperCase()

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">` +
    `<circle cx="14" cy="14" r="13" fill="${hue}" opacity="${isActive ? 1 : 0.35}"/>` +
    (isActive ? `<circle cx="14" cy="14" r="13" fill="none" stroke="#fff" stroke-width="1.5"/>` : '') +
    `<text x="14" y="19" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="14" font-weight="700" fill="#111">${letter}</text>` +
    `</svg>`
  )
}
