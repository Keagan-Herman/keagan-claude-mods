// Pure helpers, kept apart from the engine so deploy.test.ts needs nothing else.

export type Change = { status: string; path: string }
export type Stack = { firebase: boolean; supabase: boolean }

// `git show --name-status --pretty=format: HEAD`: "M\tpath", "R100\told\tnew".
export const parseChanges = (out: string): Change[] =>
  out
    .split('\n')
    .filter(line => line.includes('\t'))
    .map(line => {
      const parts = line.split('\t')

      return { status: (parts[0] ?? '').slice(0, 1), path: parts.at(-1) ?? '' }
    })

const FIREBASE: [RegExp, string][] = [
  [/^functions\//, 'functions'],
  [/^firestore\.rules$/, 'firestore:rules'],
  [/^firestore\.indexes\.json$/, 'firestore:indexes'],
  [/^storage\.rules$/, 'storage'],
]

// ponytail: path rules for the stacks in use (Firebase, Supabase). A new stack is one more row.
export const advise = (changes: Change[], stack: Stack): string[] => {
  const lines: string[] = []
  const paths = changes.map(c => c.path)
  const added = (re: RegExp) => changes.filter(c => c.status === 'A' && re.test(c.path)).map(c => c.path)

  if (stack.firebase) {
    const targets = FIREBASE.filter(([re]) => paths.some(p => re.test(p))).map(([, t]) => t)

    if (targets.length > 0) {
      lines.push(`firebase deploy --only ${targets.join(',')}`)
    }

    if (paths.includes('apphosting.yaml')) {
      lines.push('apphosting.yaml changed: a push rebuilds; new env vars or secrets also need the console')
    }
  }

  if (stack.supabase) {
    const migrations = added(/^supabase\/migrations\/.+\.sql$/)

    if (migrations.length > 0) {
      lines.push(`Apply by hand (a deploy will not): ${migrations.map(m => m.split('/').pop()).join(', ')}`)
    }

    if (paths.some(p => p.startsWith('supabase/functions/'))) {
      lines.push('supabase functions deploy')
    }
  }

  for (const script of added(/^scripts\/[^/]+\.(?:ts|mjs|js|sql)$/)) {
    lines.push(`New script, run by hand: ${script}`)
  }

  return lines
}
