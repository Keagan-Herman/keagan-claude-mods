import type { Register } from 'claude-code'

import { asksForDownloads, downloadsDir, pickDownloads, wordsOf } from './dl'

export const register: Register = (on, options) => {
  const trigger = wordsOf(options.triggerWords)

  on('prompt.submit', async ($, e, next) => {
    if (e.isMeta || e.command || !asksForDownloads(e.text, trigger)) {
      return next(e)
    }

    const home = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME'))

    if (!home) {
      return next(e)
    }

    const sep = home.includes('\\') ? '\\' : '/'
    const dir = downloadsDir(String(options.folder ?? ''), await $.env.get('XDG_DOWNLOAD_DIR'), home)
    const entries = await $.fs.list(dir).catch(() => null)

    if (!entries) {
      $.ui.toast(`Downloads: no folder at ${dir}. Set the folder option to where yours is.`)

      return next(e)
    }

    const hits = pickDownloads(e.text, entries)

    if (hits.length === 0) {
      $.ui.toast('Downloads: no file name matched this prompt')

      return next(e)
    }

    $.ui.toast(`Downloads: attached ${hits.length} (${hits.map(h => h.name).join(', ')})`)

    const lines = hits.map(h => {
      const day = h.mtimeMs > 0 ? `, modified ${new Date(h.mtimeMs).toISOString().slice(0, 10)}` : ''

      return `- ${dir}${sep}${h.name}${h.kind === 'dir' ? ' (folder)' : ''}${day}`
    })

    return next({
      ...e,
      context: [...(e.context ?? []), `Downloads items whose names match this prompt (paths only, not read):\n${lines.join('\n')}`],
    })
  }).catch(($, e, next) => next(e))
}
