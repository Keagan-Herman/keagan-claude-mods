import { expect, test } from 'claude-code/testing'

import { PETS, assignPets, petFrame } from './pets'

test('every frame has the same width, working and asleep move, and sleeping stays put', () => {
  for (const pet of PETS) {
    const widths = new Set<number>()

    for (let tick = 0; tick < 40; tick += 1) {
      widths.add(petFrame(pet, false, tick).length)
      widths.add(petFrame(pet, true, tick).length)
    }

    expect([...widths]).toEqual([10])
    // A frame fits its box even at the far end of the walk.
    expect(petFrame(pet, false, 6).trim().length).toBeLessThanOrEqual(7)
  }

  const crab = PETS[0]!
  expect(new Set(Array.from({ length: 12 }, (_, t) => petFrame(crab, false, t))).size).toBeGreaterThan(4)
  expect(petFrame(crab, true, 0)).not.toBe(petFrame(crab, true, 3))
  expect(petFrame(crab, true, 0).startsWith('\\')).toBe(true)
})

test('each live agent gets its own pet and keeps it', () => {
  const first = assignPets(['a', 'b', 'c'], {})
  expect(new Set(Object.values(first)).size).toBe(3)

  // b finishes and d arrives: a and c keep theirs, d takes a free one.
  const second = assignPets(['a', 'c', 'd'], first, ['a', 'c', 'd'])
  expect(second.a).toBe(first.a)
  expect(second.c).toBe(first.c)
  expect(second.b).toBeUndefined()
  expect(new Set(Object.values(second)).size).toBe(3)

  // More agents than pets: nobody crashes and every agent has one.
  const many = assignPets(Array.from({ length: 10 }, (_, i) => `x${i}`), {})
  expect(Object.keys(many).length).toBe(10)
})
