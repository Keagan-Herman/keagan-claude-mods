// Pure helpers, kept apart from the engine so dl.test.ts needs nothing else.

export type Entry = { name: string; kind: 'file' | 'dir' | 'other'; size: number; mtimeMs: number }

const STOP = new Set(
  'the and for you our my in is it to of on at an do we me or so up if no as by be are was can get got one new old all any now out see use via how why who what when where with from that this then than them they have has had look looks check again folder folders file files download downloads doc docs document find there here put add make read open into also just like want need please remind yourself called name named some more other which would could should will'.split(
    ' ',
  ),
)

// A comma-separated setting as one pattern, in any language. Matched anywhere in the text, so
// languages written without spaces work too. Null when the setting is empty.
export const wordsOf = (list: unknown, flags = 'iu'): RegExp | null => {
  const words = String(list ?? '')
    .split(',')
    .map(w => w.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .filter(Boolean)

  return words.length > 0 ? new RegExp(words.join('|'), flags) : null
}

// Letters and digits of any script, so names in Greek, Cyrillic or Chinese match too.
const norm = (s: string): string => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

// Where Downloads is: the folder setting (a leading ~ means home), else XDG_DOWNLOAD_DIR, else ~/Downloads.
export const downloadsDir = (folder: string, xdg: string | undefined, home: string): string => {
  const sep = home.includes('/') ? '/' : String.fromCharCode(92)
  const set = folder.trim()

  if (set) {
    return set === '~' || set.startsWith('~/') || set.startsWith('~' + sep) ? home + set.slice(1) : set
  }

  return xdg?.trim() || `${home}${sep}Downloads`
}

export const asksForDownloads = (text: string, extra?: RegExp | null): boolean =>
  /\bdownloads?\b/i.test(text) || (extra?.test(text) ?? false)

// ponytail: a name-overlap score, not a search index. Words of the prompt's head
// that sit inside a file's name; best score first, newest first among equals.
export const pickDownloads = (text: string, entries: Entry[], limit = 5): Entry[] => {
  const words = [
    ...new Set(
      text
        .slice(0, 300)
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter(w => w.length >= 2 && !STOP.has(w)),
    ),
  ]

  return entries
    .filter(e => e.kind !== 'other')
    .map(e => ({ e, score: words.filter(w => norm(e.name).includes(w)).length }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || b.e.mtimeMs - a.e.mtimeMs)
    .slice(0, limit)
    .map(x => x.e)
}
