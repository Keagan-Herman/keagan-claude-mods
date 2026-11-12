export type Tier = 'haiku' | 'sonnet' | 'opus'

export type Verdict = { tier: Tier; reason: string; sure: boolean }

// Heavy work: unknown causes, design, many files, anything costly to get wrong.
const HEAVY =
  /\b(why|root cause|investigate|debug\w*|design|architect\w*|plan|refactor\w*|rewrite|trade-?offs?|migrat\w*|security|vulnerab\w*|auth\w*|payments?|stripe|across the (code ?base|repo)|all (the )?files|every file|race condition|deadlock)\b/i

// Touching a database, a deploy or a push: never below Sonnet.
const RISKY = /\b(supabase|firebase|database|sql|deploy\w*|push|production|rls|schema)\b/i

// Light work: finding, listing, reading, tiny edits.
const LIGHT =
  /\b(find|list|grep|search|locate|count|show|read|summari[sz]e|status|log|rename|typo|format|where is|which file|what does|what is|look up|lookup)\b/i

// Ordinary building work.
const MEDIUM = /\b(add|fix|implement|build|create|update|change|write|test|review|docs?|readme|commit|style|improve)\b/i

const LONG = 1200

// A type that has gone wrong on Haiku this many times stops being sent there.
export const MISS_LIMIT = 2

// The model name as /model shows it ("claude-opus-5-5", "opus", "sonnet[1m]") to its tier, if any.
export const tierOf = (model: string): Tier | undefined => {
  const m = model.toLowerCase()

  return m.includes('haiku') ? 'haiku' : m.includes('sonnet') ? 'sonnet' : m.includes('opus') ? 'opus' : undefined
}

// A comma-separated setting as one pattern, in any language. Matched anywhere in the text, so
// languages written without spaces work too. Null when the setting is empty.
export const wordsOf = (list: unknown): RegExp | null => {
  const words = String(list ?? '')
    .split(',')
    .map(w => w.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .filter(Boolean)

  return words.length > 0 ? new RegExp(words.join('|'), 'iu') : null
}

// Words added in settings, beside the built-in English lists.
export type Extra = { heavy?: RegExp | null; light?: RegExp | null; medium?: RegExp | null; risky?: RegExp | null }

const hit = (re: RegExp, extra: RegExp | null | undefined, text: string) =>
  (re.exec(text) ?? extra?.exec(text))?.[0].toLowerCase()

// Rules only, so no tokens. `sure` is false when no rule had a view; the caller may then ask a model.
export const judge = (text: string, subagentType?: string, x: Extra = {}): Verdict => {
  let v: Verdict
  const heavy = hit(HEAVY, x.heavy, text)
  const light = hit(LIGHT, x.light, text)
  const medium = hit(MEDIUM, x.medium, text)

  if (subagentType === 'Plan') {
    v = { tier: 'opus', reason: 'planning agent', sure: true }
  } else if (subagentType === 'Explore') {
    v = { tier: 'haiku', reason: 'search agent', sure: true }
  } else if (heavy) {
    v = { tier: 'opus', reason: `heavy work: ${heavy}`, sure: true }
  } else if (light && !medium) {
    v = { tier: 'haiku', reason: `light work: ${light}`, sure: true }
  } else if (medium || light) {
    v = { tier: 'sonnet', reason: 'ordinary work', sure: true }
  } else {
    v = { tier: 'sonnet', reason: 'no clear signal', sure: false }
  }

  // Never cheap for a long task, or one that touches a database, a deploy or a push.
  if (v.tier === 'haiku' && text.length >= LONG) {
    v = { tier: 'sonnet', reason: 'long task', sure: true }
  }

  if (v.tier === 'haiku' && hit(RISKY, x.risky, text)) {
    v = { tier: 'sonnet', reason: 'touches a database, deploy or push', sure: true }
  }

  return v
}

// What a small model said (light, medium, heavy) as a tier; anything else is Sonnet.
export const fromLabel = (label: string | undefined): Tier =>
  label === 'light' ? 'haiku' : label === 'heavy' ? 'opus' : 'sonnet'
