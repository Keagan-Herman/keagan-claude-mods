// The agent pets. All original, drawn in plain width-1 characters so they look the same in any
// font. Kept apart from the engine so pets.test.ts needs nothing else.

export type Pet = { name: string; color: string; work: string[]; sleep: string[] }

export const PETS: Pet[] = [
  { name: 'crab', color: '#FF7F50', work: ['\\(oo)/', '|(oo)|', '\\(oo)/', '_(oo)_'], sleep: ['\\(--)/', '\\(--)/z'] },
  { name: 'owl', color: '#E0A030', work: ['{o,o}', '{O,O}', '{o,o}', '{-,-}'], sleep: ['{-,-}z', '{-,-}Z'] },
  { name: 'cat', color: '#FF8FB8', work: ['=^.^=', '=^o^=', '=^.^=', '=^-^='], sleep: ['=-.-=z', '=-.-=Z'] },
  { name: 'frog', color: '#5BD38A', work: ['(o.o)', '(o_o)', '(^.^)', '(o.o)'], sleep: ['(-.-)z', '(-_-)z'] },
  { name: 'octopus', color: '#B07CFF', work: ['(oo)~', '(oo)-', '(oo)~', '(OO)-'], sleep: ['(--)~z', '(--)-z'] },
  { name: 'penguin', color: '#6FD6F0', work: ['<(o)>', '<(O)>', '<(o)>', '<(-)>'], sleep: ['<(-)>z', '<(-)>Z'] },
  { name: 'fox', color: '#FF8C42', work: ['/o.o\\', '/O.O\\', '/o.o\\', '/-.-\\'], sleep: ['/-.-\\z', '/-.-\\Z'] },
]

const WIDTH = 10 // the sprite, plus room to walk
const ROOM = 3

// One tick is about half a second. A working pet blinks and walks back and forth;
// a sleeping one breathes slowly in place.
export const petFrame = (pet: Pet, isAsleep: boolean, tick: number): string => {
  if (isAsleep) {
    return (pet.sleep[Math.floor(tick / 3) % pet.sleep.length] ?? '').padEnd(WIDTH)
  }

  const step = Math.floor(tick / 2) % (ROOM * 2)
  const offset = step <= ROOM ? step : ROOM * 2 - step

  return `${' '.repeat(offset)}${pet.work[tick % pet.work.length] ?? ''}`.padEnd(WIDTH)
}

// Gives each agent a pet it keeps for as long as it exists, never one a live agent already has
// (until there are more agents than pets). Agents that are gone lose theirs.
export const assignPets = (
  liveIds: string[],
  known: Record<string, number>,
  allIds: string[] = liveIds,
): Record<string, number> => {
  const next: Record<string, number> = {}

  for (const id of allIds) {
    const pet = known[id]

    if (pet !== undefined) {
      next[id] = pet
    }
  }

  for (const id of liveIds) {
    if (next[id] === undefined) {
      const taken = new Set(liveIds.map(other => next[other]).filter((p): p is number => p !== undefined))
      const free = PETS.findIndex((_, i) => !taken.has(i))

      next[id] = free === -1 ? Object.keys(next).length % PETS.length : free
    }
  }

  return next
}
