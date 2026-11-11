import type { Register } from 'claude-code'

import { nextPrompt } from './step'

export const register: Register = on => {
  // Lost on a reload, which only costs the suggestion of the turn in flight.
  let pending: string | undefined

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)

    if (e.agentId === undefined && e.reason === 'answer') {
      let isDirty = false

      try {
        const status = await $.process.run(['git', 'status', '--porcelain'], { timeoutMs: 10000 })
        isDirty = status.exitCode === 0 && status.stdout.trim() !== ''
      } catch {
        // Not a repository: suggest without the commit step.
      }

      pending = nextPrompt(e.answer, isDirty)

      if (pending) {
        await $.prompt.suggest({ text: pending })
      }
    }

    return result
  })

  // The engine proposes its own next prompt after a turn; ours wins when there is one.
  on('prompt.suggest', ($, e, next) =>
    next(pending && e.origin.kind === 'suggestion' ? { ...e, text: pending } : e),
  )

  on('prompt.submit', ($, e, next) => {
    pending = undefined

    return next(e)
  })
}
