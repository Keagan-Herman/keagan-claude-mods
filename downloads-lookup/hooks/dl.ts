// Pure helpers, kept apart from the engine so dl.test.ts needs nothing else.

export type Entry = { name: string; kind: 'file' | 'dir' | 'other'; size: number; mtimeMs: number }

const STOP = new Set(
  'the and for you our my in is it to of on at an do we me or so up if no as by be are was can get got one new old all any now out see use via how why who what when where with from that this then than them they have has had look looks check again folder folders file files download downloads doc docs document find there here put add make read open into also just like want need please remind yourself called name named some more other which would could should will'.split(
    ' ',
  ),
)

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '')

export const asksForDownloads = (text: string): boolean => /\bdownloads?\b/i.test(text)

// ponytail: a name-overlap score, not a search index. Words of the prompt's head
// that sit inside a file's name; best score first, newest first among equals.
export const pickDownloads = (text: string, entries: Entry[], limit = 5): Entry[] => {
  const words = [
    ...new Set(
      text
        .slice(0, 300)
        .toLowerCase()
        .split(/[^a-z0-9]+/)
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
