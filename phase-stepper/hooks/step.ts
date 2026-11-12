// Pure helper, kept apart from the engine so step.test.ts needs nothing else.

const MARK_WORDS = 'phase|batch|workstream|ws|stage|step|week'

// A stage word from settings joins the list; the lookbehind (not \b) lets it sit in any script.
const markOf = (stage?: string) =>
  new RegExp(String.raw`(?<![\p{L}\p{N}])((?:[A-Z]\d+\s+)?(?:${MARK_WORDS}${stage ? '|' + stage : ''}))\s*(\d+)\b`, 'giu')
const DONE = /\b(?:done|complete[d]?|finished|committed|applied|passes|passed|shipped|built)\b/i
const LAST = /\b(?:all (?:phases|batches|workstreams|stages)|final (?:phase|batch|stage)|last (?:phase|batch|stage))\b/i

// A comma-separated setting as one pattern, in any language. Matched anywhere in the text, so
// languages written without spaces work too. Null when the setting is empty.
export const wordsOf = (list: unknown, flags = 'iu'): RegExp | null => {
  const words = String(list ?? '')
    .split(',')
    .map(w => w.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .filter(Boolean)

  return words.length > 0 ? new RegExp(words.join('|'), flags) : null
}

// Words from settings, added to the English ones: `done` marks a finished sentence, `stage` names a phase.
export type Words = { done?: RegExp | null; stage?: string }

// ponytail: a keyword read of the answer's tail, not a plan parser. It only
// proposes text the person can ignore; the cost of a miss is an empty box.
export const nextPrompt = (answer: string, isDirty: boolean, x: Words = {}): string | undefined => {
  const tail = answer.slice(-1500)
  const MARK = markOf(x.stage)

  if (LAST.test(tail)) {
    return undefined
  }

  let found: { label: string; n: number } | undefined

  for (const sentence of tail.split(/[.!?。！？\n]+\s*/)) {
    // Within a sentence the first mark is the one done ("Batch 4 is done and batch 5 is next").
    const first = DONE.test(sentence) || x.done?.test(sentence) ? [...sentence.matchAll(MARK)][0] : undefined
    const n = Number(first?.[2])

    if (first && (!found || n > found.n)) {
      found = { label: (first[1] ?? '').replace(/\s+/g, ' '), n }
    }
  }

  if (!found) {
    return /\bnext step\b/i.test(tail) ? 'next step' : undefined
  }

  const go = `${found.label} ${found.n + 1}`

  return isDirty
    ? `Commit ${found.label} ${found.n} locally (don't push), then start ${go}`
    : `Start ${go}`
}
