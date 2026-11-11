// Pure helpers, kept apart from the engine so pin.test.ts needs nothing else.

const WRITE_TOOLS = new Set([
  'apply_migration',
  'deploy_edge_function',
  'create_edge_function_secret',
  'create_branch',
  'delete_branch',
  'merge_branch',
  'rebase_branch',
  'reset_branch',
  'pause_project',
  'restore_project',
])

// ponytail: a keyword scan, not a SQL parser. A false "write" only matters on the wrong project.
const SQL_WRITE =
  /\b(?:insert|update|delete|drop|alter|create|truncate|grant|revoke|comment\s+on)\b/i

// Supabase project refs are 20 lowercase letters.
export const isRef = (s: string): boolean => /^[a-z]{20}$/.test(s)

export const pinKey = (root: string, branch: string): string => `${root}::${branch}`

export const short = (ref: string): string => `${ref.slice(0, 6)}...`

// Does this Supabase MCP call change a project?
export const isDbWrite = (tool: string, query: unknown): boolean => {
  const name = tool.slice(tool.lastIndexOf('__') + 2)

  return WRITE_TOOLS.has(name) || (name === 'execute_sql' && SQL_WRITE.test(String(query ?? '')))
}

// apply-migration.mjs prints "applied 0108_x" or "already applied: 0108".
export const parseApplied = (output: string): string | undefined =>
  /(?:already applied:?|applied)\s+(\d{4}(?:_\S+)?)/.exec(output)?.[1]

export const bandText = (
  pin: { ref: string; label: string; branch: string } | null,
  last: string | null,
  touched: string | null,
): string =>
  pin
    ? `DB ${pin.label || 'pinned'} (${short(pin.ref)}) on ${pin.branch}${last ? `, last applied ${last}` : ''}`
    : `DB unpinned, last wrote to ${short(touched ?? '')}. /dbpin <ref> locks this branch`
