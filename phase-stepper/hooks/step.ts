// Pure helper, kept apart from the engine so step.test.ts needs nothing else.

const MARK = /\b((?:[A-Z]\d+\s+)?(?:phase|batch|workstream|ws|stage|step|week))\s*(\d+)\b/gi
const DONE = /\b(?:done|complete[d]?|finished|committed|applied|passes|passed|shipped|built)\b/i
const LAST = /\b(?:all (?:phases|batches|workstreams|stages)|final (?:phase|batch|stage)|last (?:phase|batch|stage))\b/i

// ponytail: a keyword read of the answer's tail, not a plan parser. It only
// proposes text the person can ignore; the cost of a miss is an empty box.
export const nextPrompt = (answer: string, isDirty: boolean): string | undefined => {
  const tail = answer.slice(-1500)

  if (LAST.test(tail)) {
    return undefined
  }

  let found: { label: string; n: number } | undefined

  for (const sentence of tail.split(/[.!?\n]+\s*/)) {
    // Within a sentence the first mark is the one done ("Batch 4 is done and batch 5 is next").
    const first = DONE.test(sentence) ? [...sentence.matchAll(MARK)][0] : undefined
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
